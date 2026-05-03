import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface ItemMercadoPago {
  quantity: number;
  price: number; // em centavos
  description: string;
}

interface CriarLinkInput {
  itens: ItemMercadoPago[];
  order_nsu?: string;
  redirect_url?: string;
  webhook_url?: string;
  customer?: {
    name?: string;
    email?: string;
    phone_number?: string;
  };
}

interface LinkPagamentoResponse {
  id: string;
  url: string;
  order_nsu?: string;
}

interface PagamentoMercadoPago {
  id: string;
  status: string;
  external_reference?: string;
}

export class MercadoPagoService {
  private api: AxiosInstance;
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    this.api = axios.create({
      baseURL: 'https://api.mercadopago.com',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  reaisParaCentavos(valor: number): number {
    return Math.round(valor * 100);
  }

  async criarLinkPagamento(dados: CriarLinkInput): Promise<LinkPagamentoResponse> {
    if (!this.accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN_NAO_CONFIGURADO');
    }

    const body: any = {
      items: dados.itens.map((item) => ({
        title: item.description,
        quantity: item.quantity,
        unit_price: Number((item.price / 100).toFixed(2)),
        currency_id: 'BRL',
      })),
      external_reference: dados.order_nsu,
      notification_url: dados.webhook_url,
      back_urls: dados.redirect_url
        ? {
            success: dados.redirect_url,
            failure: dados.redirect_url,
            pending: dados.redirect_url,
          }
        : undefined,
      auto_return: 'approved',
      payer: dados.customer
        ? {
            name: dados.customer.name,
            email: dados.customer.email,
            phone: dados.customer.phone_number ? { number: dados.customer.phone_number } : undefined,
          }
        : undefined,
    };

    logger.info('Criando preferência Mercado Pago', {
      order_nsu: dados.order_nsu,
      total_itens: dados.itens.length,
    });

    const response = await this.api.post('/checkout/preferences', body, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    const initPoint = response.data?.init_point || response.data?.sandbox_init_point;
    if (!initPoint) {
      throw new Error('MERCADOPAGO_SEM_INIT_POINT');
    }

    return {
      id: response.data?.id || dados.order_nsu || '',
      url: initPoint,
      order_nsu: dados.order_nsu,
    };
  }

  validarWebhook(token: string | string[] | undefined): boolean {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) return true;
    if (!token) return false;
    const raw = Array.isArray(token) ? token[0] : token;
    const value = raw.replace(/^Bearer\s+/i, '').trim();
    return value === secret;
  }

  processarEvento(body: any): { evento: string; order_nsu: string; status: string; aprovado: boolean } {
    const evento = body?.action || body?.type || body?.event || '';
    const status = body?.status || body?.data?.status || '';
    const order_nsu = body?.external_reference || body?.data?.external_reference || body?.order_nsu || body?.data?.order_nsu || '';
    const aprovado = ['approved', 'APPROVED'].includes(status);

    logger.info(`Evento Mercado Pago: ${evento} | order_nsu: ${order_nsu} | aprovado: ${aprovado}`);
    return { evento, order_nsu, status, aprovado };
  }

  async buscarPagamento(id: string): Promise<PagamentoMercadoPago | null> {
    if (!this.accessToken || !id) return null;

    try {
      const response = await this.api.get(`/v1/payments/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      return {
        id: String(response.data?.id || id),
        status: String(response.data?.status || ''),
        external_reference: response.data?.external_reference || undefined,
      };
    } catch (error) {
      logger.warn('Falha ao consultar pagamento no Mercado Pago', {
        pagamentoId: id,
        erro: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}

export default new MercadoPagoService();
