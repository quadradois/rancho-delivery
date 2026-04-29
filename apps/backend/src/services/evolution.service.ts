import axios, { AxiosInstance } from 'axios';
import { logger } from '../config/logger';

interface EnviarMensagemInput {
  numero: string;
  mensagem: string;
}

export class EvolutionService {
  private api: AxiosInstance;
  private instanceName: string;

  constructor() {
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'sabor-express';
    
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
      const response = await this.api.get(
        `/instance/connectionState/${this.instanceName}`
      );

      const conectado = response.data?.state === 'open';
      
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

  /**
   * Formata mensagem de novo pedido
   */
  formatarMensagemPedido(pedido: any): string {
    const { id, cliente, itens, subtotal, taxaEntrega, total, observacao } = pedido;

    let mensagem = `🟢 *NOVO PEDIDO - Sabor Express*\n\n`;
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
}

export default new EvolutionService();
