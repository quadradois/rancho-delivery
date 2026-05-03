import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface ItemInfinitePay {
  quantity: number;
  price: number;       // em centavos
  description: string;
}

interface CriarLinkInput {
  itens: ItemInfinitePay[];
  order_nsu?: string;
  redirect_url?: string;
  webhook_url?: string;
  customer?: {
    name?: string;
    email?: string;
    phone_number?: string;
  };
  address?: {
    cep?: string;
    street?: string;
    neighborhood?: string;
    number?: string;
    complement?: string;
  };
}

interface LinkPagamentoResponse {
  id: string;
  url: string;
  order_nsu?: string;
}

// ─── Circuit Breaker ────────────────────────────────────────────────────────

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private falhas = 0;
  private sucessos = 0;
  private ultimaFalhaEm = 0;

  constructor(
    private readonly limiarFalhas: number = 3,
    private readonly timeoutMs: number = 30_000,
    private readonly limiarSucessos: number = 2,
  ) {}

  get aberto() { return this.state === 'OPEN'; }

  async executar<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const tempoDecorrido = Date.now() - this.ultimaFalhaEm;
      if (tempoDecorrido < this.timeoutMs) {
        throw new Error(`Circuit breaker ABERTO — aguarde ${Math.ceil((this.timeoutMs - tempoDecorrido) / 1000)}s`);
      }
      this.state = 'HALF_OPEN';
      logger.info('InfinitePay circuit breaker → HALF_OPEN (testando recuperação)');
    }

    try {
      const resultado = await fn();
      this.onSucesso();
      return resultado;
    } catch (err) {
      this.onFalha();
      throw err;
    }
  }

  private onSucesso() {
    if (this.state === 'HALF_OPEN') {
      this.sucessos++;
      if (this.sucessos >= this.limiarSucessos) {
        this.state = 'CLOSED';
        this.falhas = 0;
        this.sucessos = 0;
        logger.info('InfinitePay circuit breaker → CLOSED (serviço recuperado)');
      }
    } else {
      this.falhas = 0;
    }
  }

  private onFalha() {
    this.falhas++;
    this.ultimaFalhaEm = Date.now();
    if (this.state === 'HALF_OPEN' || this.falhas >= this.limiarFalhas) {
      this.state = 'OPEN';
      this.sucessos = 0;
      logger.warn(`InfinitePay circuit breaker → OPEN (${this.falhas} falhas consecutivas)`);
    }
  }
}

// ─── Retry com backoff exponencial ──────────────────────────────────────────

async function comRetry<T>(fn: () => Promise<T>, tentativas = 2, delayBaseMs = 1_000): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i <= tentativas; i++) {
    try {
      return await fn();
    } catch (err: any) {
      ultimoErro = err;
      // Não faz retry para erros 4xx (cliente) ou circuit breaker aberto
      const status = err?.response?.status;
      if ((status >= 400 && status < 500) || err?.message?.includes('circuit breaker')) {
        throw err;
      }
      if (i < tentativas) {
        const delay = delayBaseMs * 2 ** i;
        logger.warn(`InfinitePay: tentativa ${i + 1}/${tentativas} falhou — retry em ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw ultimoErro;
}

// ─── Service ────────────────────────────────────────────────────────────────

export class InfinitePayService {
  private api: AxiosInstance;
  private handle: string;
  private breaker = new CircuitBreaker(3, 30_000, 2);

  constructor() {
    this.handle = process.env.INFINITEPAY_HANDLE || 'orancho-comida';

    this.api = axios.create({
      baseURL: 'https://api.infinitepay.io/invoices/public/checkout',
      headers: { 'Content-Type': 'application/json' },
      timeout: 10_000,
    });

    logger.info(`InfinitePayService inicializado — handle: ${this.handle}`);
  }

  get circuitAberto() { return this.breaker.aberto; }

  async criarLinkPagamento(dados: CriarLinkInput): Promise<LinkPagamentoResponse> {
    return comRetry(() => this.breaker.executar(async () => {
      const payload = {
        handle: this.handle,
        items: dados.itens,
        ...(dados.order_nsu && { order_nsu: dados.order_nsu }),
        ...(dados.redirect_url && { redirect_url: dados.redirect_url }),
        ...(dados.webhook_url && { webhook_url: dados.webhook_url }),
        ...(dados.customer && { customer: dados.customer }),
        ...(dados.address && { address: dados.address }),
      };

      logger.info('Criando link InfinitePay:', {
        handle: this.handle,
        order_nsu: dados.order_nsu,
        redirect_url: dados.redirect_url,
        webhook_url: dados.webhook_url,
        total_itens: dados.itens.length,
        total_centavos: dados.itens.reduce((acc, i) => acc + i.price * i.quantity, 0),
      });

      const response = await this.api.post('/links', payload);
      const linkUrl = response.data?.url || response.data?.link || response.data?.checkout_url;

      if (!linkUrl) {
        logger.error('InfinitePay não retornou URL:', response.data);
        throw new Error('InfinitePay não retornou link de pagamento');
      }

      logger.info(`Link InfinitePay criado: ${linkUrl}`);

      return {
        id: response.data?.id || dados.order_nsu || '',
        url: linkUrl,
        order_nsu: dados.order_nsu,
      };
    }));
  }

  reaisParaCentavos(valor: number): number {
    return Math.round(valor * 100);
  }

  validarWebhook(token: string | string[] | undefined, rawBody?: Buffer): boolean {
    const webhookSecretRaw = process.env.INFINITEPAY_WEBHOOK_SECRET;

    if (!webhookSecretRaw) {
      logger.warn('INFINITEPAY_WEBHOOK_SECRET não configurado — aceitando webhook em dev');
      return true;
    }

    if (!token) return false;

    const bruto = Array.isArray(token) ? token[0] : token;
    const semBearer = bruto.replace(/^Bearer\s+/i, '').trim();
    const segredosEsperados = webhookSecretRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    // Validação HMAC (aceita sha256=..., v1=..., hex/base64/base64url)
    if (rawBody) {
      const crypto = require('crypto') as typeof import('crypto');
      const headerParts = semBearer
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

      const assinaturasCandidatas = new Set<string>();

      const pushCandidate = (value: string) => {
        const v = value.trim();
        if (!v) return;
        assinaturasCandidatas.add(v);
      };

      pushCandidate(semBearer);
      for (const part of headerParts) {
        const [k, v] = part.split('=');
        if (!v) continue;
        const key = k.trim().toLowerCase();
        const value = v.trim();
        if (['sha256', 'signature', 'sig', 'v1'].includes(key)) {
          pushCandidate(value);
        }
      }

      // Suporte ao padrão "sha256=<assinatura>"
      if (semBearer.toLowerCase().startsWith('sha256=')) {
        pushCandidate(semBearer.slice('sha256='.length));
      }

      const safeEqualString = (a: string, b: string) => {
        const aBuf = Buffer.from(a);
        const bBuf = Buffer.from(b);
        return aBuf.length === bBuf.length && crypto.timingSafeEqual(aBuf, bBuf);
      };

      for (const secret of segredosEsperados) {
        const digestHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        const digestBase64 = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
        const digestBase64Url = digestBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

        for (const assinatura of assinaturasCandidatas) {
          if (
            safeEqualString(assinatura.toLowerCase(), digestHex.toLowerCase()) ||
            safeEqualString(assinatura, digestBase64) ||
            safeEqualString(assinatura, digestBase64Url)
          ) {
            return true;
          }
        }
      }
    }

    // Validação por token simples (compatibilidade retroativa)
    return segredosEsperados.includes(semBearer);
  }

  processarEvento(body: any): {
    evento: string;
    order_nsu: string;
    status: string;
    aprovado: boolean;
  } {
    const evento = body?.event || body?.type || '';
    const order_nsu = body?.order_nsu || body?.data?.order_nsu || '';
    const status = body?.status || body?.data?.status || '';

    const aprovado = [
      'payment.approved',
      'PAYMENT_APPROVED',
      'approved',
    ].includes(evento) || [
      'approved',
      'APPROVED',
    ].includes(status);

    logger.info(`Evento InfinitePay: ${evento} | order_nsu: ${order_nsu} | aprovado: ${aprovado}`);

    return { evento, order_nsu, status, aprovado };
  }
}

export default new InfinitePayService();
