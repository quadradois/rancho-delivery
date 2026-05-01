import { Request, Response } from 'express';
import infinitePayService from '../services/infinitepay.service';
import pedidoService from '../services/pedido.service';
import evolutionService from '../services/evolution.service';
import { logger } from '../config/logger';
import realtimeService from '../services/realtime.service';
import clienteService from '../services/cliente.service';

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
        req.headers['x-infinitepay-webhook-signature'] ||
        req.headers['x-webhook-secret'] ||
        req.headers['x-webhook-token'] ||
        req.headers['x-signature'] ||
        req.headers['signature'] ||
        req.headers['authorization']
      ) as string;

      if (!infinitePayService.validarWebhook(token)) {
        logger.warn('Webhook InfinitePay rejeitado: token inválido', {
          hasXInfinitepaySignature: Boolean(req.headers['x-infinitepay-signature']),
          hasXInfinitepayWebhookSignature: Boolean(req.headers['x-infinitepay-webhook-signature']),
          hasXWebhookSecret: Boolean(req.headers['x-webhook-secret']),
          hasXWebhookToken: Boolean(req.headers['x-webhook-token']),
          hasXSignature: Boolean(req.headers['x-signature']),
          hasSignature: Boolean(req.headers['signature']),
          hasAuthorization: Boolean(req.headers['authorization']),
        });
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
        realtimeService.emit('pedido:novo', { id: order_nsu, status: 'CONFIRMADO' });
        realtimeService.emit('pedido:atualizado', { id: order_nsu, status: 'CONFIRMADO' });
        realtimeService.emit('metricas:atualizadas', await pedidoService.obterMetricasAdmin());

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

  /**
   * POST /webhook/whatsapp
   * Recebe eventos de mensagem WhatsApp para tempo real do cockpit
   */
  async whatsapp(req: Request, res: Response) {
    try {
      const body = req.body || {};
      const telefone =
        body?.data?.key?.remoteJid ||
        body?.data?.from ||
        body?.from ||
        '';
      const texto =
        body?.data?.message?.conversation ||
        body?.data?.message?.extendedTextMessage?.text ||
        body?.message ||
        '';

      const telefoneNormalizado = String(telefone).replace(/\D/g, '');
      if (telefoneNormalizado && texto) {
        await clienteService.registrarMensagemRecebida(telefoneNormalizado, texto);
      }

      realtimeService.emit('mensagem:nova', {
        telefone: telefoneNormalizado || telefone,
        texto,
        origem: 'WHATSAPP',
      });
      realtimeService.emit('metricas:atualizadas', await pedidoService.obterMetricasAdmin());

      return res.status(200).json({
        success: true,
        message: 'Webhook WhatsApp recebido',
      });
    } catch (error) {
      logger.error('Erro ao processar webhook WhatsApp:', error);
      return res.status(200).json({
        success: false,
        error: { message: 'Erro ao processar webhook WhatsApp' },
      });
    }
  }
}

export default new WebhookController();
