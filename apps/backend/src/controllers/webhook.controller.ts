import { Request, Response } from 'express';
import mercadoPagoService from '../services/mercadopago.service';
import pedidoService from '../services/pedido.service';
import evolutionService from '../services/evolution.service';
import { logger } from '../config/logger';
import realtimeService from '../services/realtime.service';
import clienteService from '../services/cliente.service';
import { processarRespostaWhatsApp } from '../services/conversacao.service';

export class WebhookController {
  /**
   * POST /webhook/mercadopago
   * Recebe notificações de pagamento do Mercado Pago
   */
  async mercadopago(req: Request, res: Response) {
    try {
      const body = req.body;

      logger.info('Webhook Mercado Pago recebido:', {
        event: body?.event || body?.type || body?.action,
        order_nsu: body?.external_reference || body?.data?.external_reference || body?.order_nsu || body?.data?.order_nsu,
      });

      // Validação opcional por secret estático
      const token = (
        req.headers['x-mercadopago-signature'] ||
        req.headers['x-webhook-secret'] ||
        req.headers['authorization']
      ) as string;

      if (!(await mercadoPagoService.validarWebhook(token))) {
        logger.warn('Webhook Mercado Pago rejeitado: token inválido', {
          hasXMercadoPagoSignature: Boolean(req.headers['x-mercadopago-signature']),
          hasXWebhookSecret: Boolean(req.headers['x-webhook-secret']),
          hasAuthorization: Boolean(req.headers['authorization']),
        });
        return res.status(401).json({
          success: false,
          error: { message: 'Token inválido', code: 'UNAUTHORIZED' },
        });
      }

      // Processar evento
      let { aprovado, order_nsu, evento } = mercadoPagoService.processarEvento(body);
      if ((!order_nsu || !aprovado) && body?.data?.id) {
        const pagamento = await mercadoPagoService.buscarPagamento(String(body.data.id));
        if (pagamento) {
          order_nsu = pagamento.external_reference || order_nsu;
          aprovado = pagamento.status === 'approved';
        }
      }

      if (aprovado && order_nsu) {
        const pedidoAtual = await pedidoService.buscarPedidoPorId(order_nsu);

        // Idempotência: não reprocesse pedidos já confirmados
        if (pedidoAtual?.status === 'CONFIRMADO') {
          logger.info('Webhook Mercado Pago ignorado por idempotência', {
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

        logger.info('Pedido confirmado via webhook Mercado Pago', {
          pedidoId: order_nsu,
          evento,
        });

        // Notificação para dono é opcional e desabilitada por padrão.
        // O cliente já é notificado no fluxo de mudança de status (CONFIRMADO e demais etapas).
        if (process.env.WHATSAPP_NOTIFICAR_DONO_NOVO_PEDIDO === 'true') {
          const pedidoCompleto = await pedidoService.buscarPedidoPorId(order_nsu);
          if (pedidoCompleto) {
            await evolutionService.notificarNovoPedido(pedidoCompleto);
          }
        }
      } else {
        logger.info(`Evento Mercado Pago ignorado: ${evento} — não é aprovação`);
      }

      // Sempre responder 200 para evitar reenvio
      return res.status(200).json({
        success: true,
        message: 'Webhook processado com sucesso',
      });
    } catch (error: any) {
      logger.error('Erro ao processar webhook Mercado Pago:', error);

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
        // Resposta da IA em background — não bloqueia o webhook
        setImmediate(() => {
          void processarRespostaWhatsApp(telefoneNormalizado, texto, String(telefone));
        });
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
