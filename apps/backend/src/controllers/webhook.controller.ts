import { Request, Response } from 'express';
import asaasService from '../services/asaas.service';
import pedidoService from '../services/pedido.service';
import evolutionService from '../services/evolution.service';
import { logger } from '../config/logger';

export class WebhookController {
  /**
   * POST /webhook/asaas
   * Recebe notificações de pagamento do Asaas
   */
  async asaas(req: Request, res: Response) {
    try {
      const evento = req.body;

      logger.info('Webhook Asaas recebido:', {
        event: evento.event,
        paymentId: evento.payment?.id,
      });

      // Validar token do webhook (segurança)
      const token = req.headers['asaas-access-token'] as string;
      if (!asaasService.validarWebhook(token)) {
        logger.warn('Webhook Asaas rejeitado: token inválido');
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token inválido',
            code: 'UNAUTHORIZED',
          },
        });
      }

      // Processar evento
      const dadosPagamento = await asaasService.processarEventoPagamento(evento);

      // Atualizar pedido se pagamento foi confirmado
      if (evento.event === 'PAYMENT_CONFIRMED' || evento.event === 'PAYMENT_RECEIVED') {
        if (dadosPagamento.pedidoId) {
          await pedidoService.atualizarStatus(
            dadosPagamento.pedidoId,
            'CONFIRMADO',
            dadosPagamento.pagamentoId
          );

          logger.info(`Pedido ${dadosPagamento.pedidoId} confirmado via webhook Asaas`);

          // Buscar pedido completo para notificação
          const pedidoCompleto = await pedidoService.buscarPedidoPorId(dadosPagamento.pedidoId);

          if (pedidoCompleto) {
            // Enviar notificação WhatsApp para o dono
            await evolutionService.notificarNovoPedido(pedidoCompleto);
          }
        }
      }

      // Responder ao Asaas (importante para não reenviar webhook)
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
      });
    } catch (error: any) {
      logger.error('Erro ao processar webhook Asaas:', error);

      // Mesmo com erro, retornar 200 para não reenviar webhook
      return res.status(200).json({
        success: false,
        error: {
          message: 'Erro ao processar webhook',
        },
      });
    }
  }
}

export default new WebhookController();
