import { Request, Response } from 'express';
import infinitePayService from '../services/infinitepay.service';
import pedidoService from '../services/pedido.service';
import evolutionService from '../services/evolution.service';
import { logger } from '../config/logger';

export class WebhookController {
  /**
   * POST /webhook/infinitepay
   * Recebe notificações de pagamento do InfinitePay
   */
  async infinitepay(req: Request, res: Response) {
    try {
      const body = req.body;

      logger.info('Webhook InfinitePay recebido:', {
        event: body?.event || body?.type,
        order_nsu: body?.order_nsu || body?.data?.order_nsu,
      });

      // Validar assinatura do webhook
      const token = (
        req.headers['x-infinitepay-signature'] ||
        req.headers['authorization'] ||
        req.headers['x-webhook-secret']
      ) as string;

      if (!infinitePayService.validarWebhook(token)) {
        logger.warn('Webhook InfinitePay rejeitado: token inválido');
        return res.status(401).json({
          success: false,
          error: { message: 'Token inválido', code: 'UNAUTHORIZED' },
        });
      }

      // Processar evento
      const { aprovado, order_nsu, evento } = infinitePayService.processarEvento(body);

      if (aprovado && order_nsu) {
        const pedidoAtual = await pedidoService.buscarPedidoPorId(order_nsu);

        // Idempotência: não reprocesse pedidos já confirmados
        if (pedidoAtual?.status === 'CONFIRMADO') {
          logger.info('Webhook InfinitePay ignorado por idempotência', {
            pedidoId: order_nsu,
            evento,
          });

          return res.status(200).json({
            success: true,
            message: 'Webhook já processado anteriormente',
          });
        }

        // order_nsu é o ID do pedido no nosso sistema
        await pedidoService.atualizarStatus(order_nsu, 'CONFIRMADO', order_nsu);

        logger.info('Pedido confirmado via webhook InfinitePay', {
          pedidoId: order_nsu,
          evento,
        });

        // Buscar pedido completo para notificação WhatsApp
        const pedidoCompleto = await pedidoService.buscarPedidoPorId(order_nsu);

        if (pedidoCompleto) {
          await evolutionService.notificarNovoPedido(pedidoCompleto);
        }
      } else {
        logger.info(`Evento InfinitePay ignorado: ${evento} — não é aprovação`);
      }

      // Sempre responder 200 para evitar reenvio
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
      });
    } catch (error: any) {
      logger.error('Erro ao processar webhook InfinitePay:', error);

      // Mesmo com erro, retornar 200 para não reenviar webhook
      return res.status(200).json({
        success: false,
        error: { message: 'Erro ao processar webhook' },
      });
    }
  }
}

export default new WebhookController();
