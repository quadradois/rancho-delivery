import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface EnviarMensagemInput {
  numero: string;
  mensagem: string;
}

interface EvolutionConnectionStateResponse {
  instance?: {
    instanceName?: string;
    state?: string;
  };
  state?: string;
}

export class EvolutionService {
  private api: AxiosInstance;
  private instanceName: string;

  constructor() {
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'rancho-delivery';
    
    this.api = axios.create({
      baseURL: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY || '',
      },
    });

    logger.info('EvolutionService inicializado');
  }

  /**
   * Envia mensagem de texto via WhatsApp
   */
  async enviarMensagem(dados: EnviarMensagemInput): Promise<boolean> {
    try {
      const { numero, mensagem } = dados;

      // Formatar número (remover caracteres especiais)
      const numeroFormatado = numero.replace(/\D/g, '');

      const payload = {
        number: numeroFormatado,
        text: mensagem,
      };

      const response = await this.api.post(
        `/message/sendText/${this.instanceName}`,
        payload
      );

      logger.info(`Mensagem WhatsApp enviada para ${numeroFormatado}`);
      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      logger.error('Erro ao enviar mensagem WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * Verifica status da conexão WhatsApp
   */
  async verificarConexao(): Promise<boolean> {
    try {
      const response = await this.api.get<EvolutionConnectionStateResponse>(
        `/instance/connectionState/${this.instanceName}`
      );
      const state = response.data?.instance?.state || response.data?.state || 'close';
      const conectado = state === 'open';
      
      if (conectado) {
        logger.info('WhatsApp conectado');
      } else {
        logger.warn('WhatsApp desconectado');
      }

      return conectado;
    } catch (error: any) {
      logger.error('Erro ao verificar conexão WhatsApp:', error.response?.data || error.message);
      return false;
    }
  }

  async obterStatusInstancia() {
    try {
      const response = await this.api.get<EvolutionConnectionStateResponse>(
        `/instance/connectionState/${this.instanceName}`
      );
      const state = response.data?.instance?.state || response.data?.state || 'close';
      return {
        instanceName: this.instanceName,
        conectado: state === 'open',
        state,
      };
    } catch (error: any) {
      logger.error('Erro ao obter status detalhado do WhatsApp:', error.response?.data || error.message);
      return {
        instanceName: this.instanceName,
        conectado: false,
        state: 'not_found',
      };
    }
  }

  async garantirInstanciaEObterQrCode() {
    const existente = await this.obterInstanciaPorNome(this.instanceName);
    if (!existente) {
      await this.api.post(
        '/instance/create',
        {
          instanceName: this.instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }
      );
      logger.info('Instância WhatsApp criada na Evolution', { instanceName: this.instanceName });
    }

    const status = await this.obterStatusInstancia();
    if (status.conectado) {
      return {
        instanceName: this.instanceName,
        state: status.state,
        conectado: true,
        qrCodeBase64: null as string | null,
      };
    }

    const qr = await this.obterQrCode();
    return {
      instanceName: this.instanceName,
      state: status.state,
      conectado: false,
      qrCodeBase64: qr,
    };
  }

  async obterQrCode(): Promise<string | null> {
    try {
      const response = await this.api.get(`/instance/connect/${this.instanceName}`);
      return response.data?.base64 || response.data?.qrcode?.base64 || null;
    } catch (error: any) {
      logger.error('Erro ao obter QR Code da instância WhatsApp:', error.response?.data || error.message);
      return null;
    }
  }

  private async obterInstanciaPorNome(instanceName: string) {
    try {
      const response = await this.api.get<any[]>('/instance/fetchInstances');
      const instancias = Array.isArray(response.data) ? response.data : [];
      return instancias.find((item) => item?.name === instanceName) || null;
    } catch (error: any) {
      logger.error('Erro ao listar instâncias da Evolution:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Formata mensagem de novo pedido
   */
  formatarMensagemPedido(pedido: any): string {
    const { id, cliente, itens, subtotal, taxaEntrega, total, observacao } = pedido;

    let mensagem = `🟢 *NOVO PEDIDO - Rancho*\n\n`;
    mensagem += `📋 *Pedido:* #${id.slice(-8)}\n\n`;
    
    mensagem += `👤 *Cliente:* ${cliente.nome}\n`;
    mensagem += `📱 *WhatsApp:* ${this.formatarTelefone(cliente.telefone)}\n`;
    mensagem += `📍 *Endereço:* ${cliente.endereco}\n`;
    mensagem += `🏘️ *Bairro:* ${cliente.bairro}\n`;
    mensagem += `💰 *Taxa de Entrega:* R$ ${Number(taxaEntrega).toFixed(2)}\n\n`;
    
    mensagem += `🍽️ *Itens do Pedido:*\n`;
    itens.forEach((item: any) => {
      mensagem += `\n• ${item.quantidade}x ${item.produto.nome}`;
      if (item.observacao) {
        mensagem += `\n  _Obs: ${item.observacao}_`;
      }
      mensagem += `\n  R$ ${Number(item.precoUnit).toFixed(2)} cada = R$ ${Number(item.subtotal).toFixed(2)}`;
    });

    mensagem += `\n\n💵 *Subtotal:* R$ ${Number(subtotal).toFixed(2)}`;
    mensagem += `\n🚚 *Taxa:* R$ ${Number(taxaEntrega).toFixed(2)}`;
    mensagem += `\n✅ *TOTAL:* R$ ${Number(total).toFixed(2)}`;

    if (observacao) {
      mensagem += `\n\n📝 *Observação:*\n${observacao}`;
    }

    mensagem += `\n\n💳 *Pagamento:* CONFIRMADO`;
    mensagem += `\n⏰ *Horário:* ${new Date().toLocaleString('pt-BR')}`;

    return mensagem;
  }

  /**
   * Formata telefone para exibição
   */
  private formatarTelefone(telefone: string): string {
    const limpo = telefone.replace(/\D/g, '');
    
    if (limpo.length === 13) {
      return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
    } else if (limpo.length === 11) {
      return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
    }
    
    return telefone;
  }

  /**
   * Notifica dono sobre novo pedido
   */
  async notificarNovoPedido(pedido: any): Promise<boolean> {
    try {
      const numeroDono = process.env.WHATSAPP_DONO;

      if (!numeroDono) {
        logger.warn('WHATSAPP_DONO não configurado - notificação não enviada');
        return false;
      }

      const mensagem = this.formatarMensagemPedido(pedido);

      const enviado = await this.enviarMensagem({
        numero: numeroDono,
        mensagem,
      });

      if (enviado) {
        logger.info(`Notificação de pedido ${pedido.id} enviada para o dono`);
      } else {
        logger.error(`Falha ao enviar notificação do pedido ${pedido.id}`);
      }

      return enviado;
    } catch (error) {
      logger.error('Erro ao notificar novo pedido:', error);
      return false;
    }
  }

  formatarMensagemStatusPedido(pedido: any, status: string, motivoCancelamento?: string): string | null {
    const nome = pedido?.cliente?.nome || 'cliente';

    if (status === 'CONFIRMADO') {
      return `Olá ${nome}! Seu pedido foi confirmado e já está sendo preparado.`;
    }

    if (status === 'SAIU_ENTREGA') {
      return 'Seu pedido saiu para entrega. Em breve chegará aí.';
    }

    if (status === 'ENTREGUE') {
      return 'Pedido entregue! Bom apetite! Qualquer dúvida estamos aqui.';
    }

    if (status === 'CANCELADO') {
      const base = `Infelizmente precisamos cancelar seu pedido${motivoCancelamento ? `: ${motivoCancelamento}` : '.'}`;
      return `${base} Se o pagamento já foi feito, nossa equipe vai tratar o estorno com você.`;
    }

    return null;
  }

  async notificarClienteStatusPedido(pedido: any, status: string, motivoCancelamento?: string): Promise<boolean> {
    try {
      const numero = pedido?.cliente?.telefone;
      if (!numero) {
        logger.warn('Cliente sem telefone para notificação de status', { pedidoId: pedido?.id, status });
        return false;
      }

      const mensagem = this.formatarMensagemStatusPedido(pedido, status, motivoCancelamento);
      if (!mensagem) return false;

      const enviado = await this.enviarMensagem({ numero, mensagem });
      if (enviado) {
        logger.info('Mensagem automática de status enviada ao cliente', {
          pedidoId: pedido?.id,
          status,
        });
      } else {
        logger.warn('Falha ao enviar mensagem automática de status ao cliente', {
          pedidoId: pedido?.id,
          status,
        });
      }

      return enviado;
    } catch (error) {
      logger.error('Erro ao notificar cliente por status do pedido:', error);
      return false;
    }
  }
}

export default new EvolutionService();
