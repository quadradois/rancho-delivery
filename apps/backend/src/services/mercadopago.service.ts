import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';
import { getLojaConfig } from './lojaConfig.service';

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

interface CriarPagamentoPixInput {
  order_nsu: string;
  transaction_amount: number;
  description: string;
  webhook_url?: string;
  payer: {
    email: string;
    first_name?: string;
  };
  date_of_expiration?: string;
}

interface PagamentoPixResponse {
  id: string;
  status: string;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
}

interface PagamentoMercadoPago {
  id: string;
  status: string;
  external_reference?: string;
}

export class MercadoPagoService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'https://api.mercadopago.com',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async obterConfiguracao() {
    const loja = await getLojaConfig();

    return {
      ativo: loja?.mercadopagoAtivo ?? true,
      accessToken: loja?.mercadopagoAccessToken?.trim() || process.env.MERCADOPAGO_ACCESS_TOKEN || '',
      webhookSecret: loja?.mercadopagoWebhookSecret?.trim() || process.env.MERCADOPAGO_WEBHOOK_SECRET || '',
    };
  }

  reaisParaCentavos(valor: number): number {
    return Math.round(valor * 100);
  }

  async criarLinkPagamento(dados: CriarLinkInput): Promise<LinkPagamentoResponse> {
    const config = await this.obterConfiguracao();
    if (!config.ativo) {
      throw new Error('MERCADOPAGO_DESATIVADO');
    }

    if (!config.accessToken) {
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
      headers: { Authorization: `Bearer ${config.accessToken}` },
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

  async validarWebhook(token: string | string[] | undefined): Promise<boolean> {
    const config = await this.obterConfiguracao();
    const secret = config.webhookSecret;
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
    const config = await this.obterConfiguracao();
    if (!config.accessToken || !id) return null;

    try {
      const response = await this.api.get(`/v1/payments/${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${config.accessToken}` },
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

  async criarPagamentoPix(dados: CriarPagamentoPixInput): Promise<PagamentoPixResponse> {
    const config = await this.obterConfiguracao();
    if (!config.ativo) {
      throw new Error('MERCADOPAGO_DESATIVADO');
    }
    if (!config.accessToken) {
      throw new Error('MERCADOPAGO_ACCESS_TOKEN_NAO_CONFIGURADO');
    }

    const body: any = {
      transaction_amount: Number(dados.transaction_amount.toFixed(2)),
      description: dados.description,
      payment_method_id: 'pix',
      external_reference: dados.order_nsu,
      notification_url: dados.webhook_url,
      payer: {
        email: dados.payer.email,
        first_name: dados.payer.first_name,
      },
      date_of_expiration: dados.date_of_expiration,
    };

    const response = await this.api.post('/v1/payments', body, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'X-Idempotency-Key': `pix-${dados.order_nsu}`,
      },
    });

    return {
      id: String(response.data?.id || ''),
      status: String(response.data?.status || ''),
      qr_code: response.data?.point_of_interaction?.transaction_data?.qr_code || undefined,
      qr_code_base64: response.data?.point_of_interaction?.transaction_data?.qr_code_base64 || undefined,
      ticket_url: response.data?.point_of_interaction?.transaction_data?.ticket_url || undefined,
    };
  }
}

export default new MercadoPagoService();
