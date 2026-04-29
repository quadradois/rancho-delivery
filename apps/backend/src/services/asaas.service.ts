import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface CriarCobrancaInput {
  customer: string; // ID do cliente no Asaas
  billingType: 'PIX' | 'CREDIT_CARD' | 'BOLETO';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description: string;
  externalReference?: string; // ID do pedido
}

interface CriarClienteAsaasInput {
  name: string;
  cpfCnpj?: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  postalCode?: string;
}

export class AsaasService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3',
      headers: {
        'Content-Type': 'application/json',
        'access_token': process.env.ASAAS_API_KEY,
      },
    });

    logger.info('AsaasService inicializado');
  }

  /**
   * Cria ou busca cliente no Asaas
   */
  async criarOuBuscarCliente(dados: CriarClienteAsaasInput): Promise<string> {
    try {
      // Buscar cliente por CPF/telefone
      if (dados.cpfCnpj) {
        const busca = await this.api.get('/customers', {
          params: { cpfCnpj: dados.cpfCnpj },
        });

        if (busca.data.data && busca.data.data.length > 0) {
          const clienteId = busca.data.data[0].id;
          logger.info(`Cliente Asaas encontrado: ${clienteId}`);
          return clienteId;
        }
      }

      // Criar novo cliente
      const response = await this.api.post('/customers', dados);
      const clienteId = response.data.id;

      logger.info(`Cliente Asaas criado: ${clienteId}`);
      return clienteId;
    } catch (error: any) {
      logger.error('Erro ao criar/buscar cliente no Asaas:', error.response?.data || error.message);
      throw new Error('Erro ao processar cliente no Asaas');
    }
  }

  /**
   * Cria cobrança no Asaas
   */
  async criarCobranca(dados: CriarCobrancaInput) {
    try {
      const response = await this.api.post('/payments', dados);

      logger.info(`Cobrança Asaas criada: ${response.data.id} - Valor: R$ ${dados.value}`);

      return {
        id: response.data.id,
        invoiceUrl: response.data.invoiceUrl,
        bankSlipUrl: response.data.bankSlipUrl,
        pixQrCode: response.data.pixQrCode,
        status: response.data.status,
      };
    } catch (error: any) {
      logger.error('Erro ao criar cobrança no Asaas:', error.response?.data || error.message);
      throw new Error('Erro ao criar cobrança');
    }
  }

  /**
   * Busca cobrança por ID
   */
  async buscarCobranca(id: string) {
    try {
      const response = await this.api.get(`/payments/${id}`);
      return response.data;
    } catch (error: any) {
      logger.error(`Erro ao buscar cobrança ${id}:`, error.response?.data || error.message);
      throw new Error('Erro ao buscar cobrança');
    }
  }

  /**
   * Valida webhook do Asaas
   */
  validarWebhook(token: string): boolean {
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    
    if (!webhookToken) {
      logger.warn('ASAAS_WEBHOOK_TOKEN não configurado');
      return true; // Em desenvolvimento, aceitar sem validação
    }

    return token === webhookToken;
  }

  /**
   * Processa evento de pagamento
   */
  async processarEventoPagamento(evento: any) {
    try {
      const { event, payment } = evento;

      logger.info(`Evento Asaas recebido: ${event} - Pagamento: ${payment.id}`);

      // Buscar detalhes completos do pagamento
      const pagamentoCompleto = await this.buscarCobranca(payment.id);

      return {
        evento: event,
        pagamentoId: payment.id,
        status: pagamentoCompleto.status,
        valor: pagamentoCompleto.value,
        pedidoId: pagamentoCompleto.externalReference,
        dataPagamento: pagamentoCompleto.paymentDate,
      };
    } catch (error) {
      logger.error('Erro ao processar evento de pagamento:', error);
      throw error;
    }
  }
}

export default new AsaasService();
