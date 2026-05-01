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

export class InfinitePayService {
  private api: AxiosInstance;
  private handle: string;

  constructor() {
    this.handle = process.env.INFINITEPAY_HANDLE || 'orancho-comida';

    this.api = axios.create({
      baseURL: 'https://api.infinitepay.io/invoices/public/checkout',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    logger.info(`InfinitePayService inicializado — handle: ${this.handle}`);
  }

  /**
   * Cria link de pagamento no InfinitePay
   * Preços devem ser enviados em centavos (R$ 10,00 = 1000)
   */
  async criarLinkPagamento(dados: CriarLinkInput): Promise<LinkPagamentoResponse> {
    try {
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
    } catch (error: any) {
      logger.error('Erro ao criar link InfinitePay:', error.response?.data || error.message);
      throw new Error('Erro ao gerar link de pagamento');
    }
  }

  /**
   * Converte valor em reais para centavos
   */
  reaisParaCentavos(valor: number): number {
    return Math.round(valor * 100);
  }

  /**
   * Valida assinatura do webhook InfinitePay
   * A InfinitePay envia um header de autenticação configurável
   */
  validarWebhook(token: string | string[] | undefined): boolean {
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

    return segredosEsperados.includes(semBearer);
  }

  /**
   * Processa evento de webhook InfinitePay
   * Eventos possíveis: payment.approved, payment.refused, payment.cancelled
   */
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
