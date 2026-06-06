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
      const eventoProcessado = mercadoPagoService.processarEvento(body);
      let { aprovado, order_nsu } = eventoProcessado;
      const { evento } = eventoProcessado;
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
   * POST /webhook/whatsapp/:event  (Evolution webhookByEvents=true)
   */
  async whatsapp(req: Request, res: Response) {
    res.status(200).json({ success: true });

    try {
      const body = req.body || {};
      const data = body?.data || {};
      const info = data?.Info || {};                    // Evolution Go: data.Info
      const msg = data?.Message || data?.message || {};  // Go: data.Message | legado: data.message
      const event = (req.params as Record<string, string>).event || body?.event || '';

      // Remetente: Go usa data.Info.Sender ("55...:38@s.whatsapp.net");
      // legado usa data.key.remoteJid (+ remoteJidAlt para @lid privacy mode).
      const senderRaw =
        info?.Sender ||
        (String(data?.key?.remoteJid || '').includes('@lid') ? data?.key?.remoteJidAlt : '') ||
        data?.key?.remoteJid ||
        data?.from || body?.from || '';
      // Remove device-id (":38") e domínio ("@s.whatsapp.net")
      const senderPhonePart = String(senderRaw).split('@')[0].split(':')[0];

      const fromMe = info?.IsFromMe ?? data?.key?.fromMe ?? body?.key?.fromMe ?? false;
      const isGroup = info?.IsGroup ?? String(senderRaw).includes('@g.us');
      const jidEfetivo = senderRaw;

      logger.info(`Webhook WhatsApp recebido: event=${event || 'root'} fromMe=${fromMe} group=${isGroup} sender=${senderRaw} msgType=${Object.keys(msg).join(',')}`);

      // Conexão — notifica cockpit sobre mudança de estado
      const eventoConexao =
        ['Connected', 'Disconnected', 'Connection', 'connection-update', 'CONNECTION_UPDATE'].includes(event) ||
        body?.event === 'CONNECTION_UPDATE';
      if (eventoConexao) {
        const conectado =
          event === 'Connected' || data?.Connected === true || (data?.state || body?.state) === 'open';
        realtimeService.emit('whatsapp:status', { state: conectado ? 'open' : 'close', conectado });
        return;
      }

      if (fromMe) {
        logger.info('Webhook WhatsApp: ignorado (fromMe=true)');
        return;
      }
      if (isGroup) {
        logger.info('Webhook WhatsApp: ignorado (grupo)');
        return;
      }

      // Localização GPS compartilhada pelo cliente via WhatsApp
      const locationMsg = msg?.locationMessage;
      const localizacao = locationMsg
        ? { lat: Number(locationMsg.degreesLatitude), lng: Number(locationMsg.degreesLongitude) }
        : undefined;

      const texto =
        msg?.conversation ||
        msg?.extendedTextMessage?.text ||
        msg?.imageMessage?.caption ||
        body?.message ||
        (localizacao ? '' : '');

      let telefoneNormalizado = senderPhonePart.replace(/[^\d]/g, '');
      // Remove prefixo 55 (BR) — leads/clientes ficam sem ele no BD
      if (telefoneNormalizado.startsWith('55') && telefoneNormalizado.length >= 12) {
        telefoneNormalizado = telefoneNormalizado.slice(2);
      }
      // Normaliza formato antigo de 8 dígitos para novo de 9 dígitos adicionando 9 após DDD
      // Ex: 6293715693 (10 dig) → 62993715693 (11 dig)
      if (telefoneNormalizado.length === 10) {
        telefoneNormalizado = `${telefoneNormalizado.slice(0, 2)}9${telefoneNormalizado.slice(2)}`;
      }
      logger.info(`Webhook WhatsApp: telefone=${telefoneNormalizado} sender=${senderRaw} texto="${texto.slice(0, 50)}"`);
      if (!telefoneNormalizado || (!texto && !localizacao)) {
        logger.info('Webhook WhatsApp: descartado (telefone ou conteúdo vazios)');
        return;
      }

      const textoRegistro = texto || (localizacao ? `[Localização: ${localizacao.lat},${localizacao.lng}]` : '');
      await clienteService.registrarMensagemRecebida(telefoneNormalizado, textoRegistro);

      realtimeService.emit('mensagem:nova', {
        telefone: telefoneNormalizado,
        texto,
        origem: 'WHATSAPP',
      });
      realtimeService.emit('metricas:atualizadas', await pedidoService.obterMetricasAdmin());

      // IA responde em background — não bloqueia o webhook
      // Passa jidEfetivo como rawJid para que o filtro @g.us funcione corretamente
      setImmediate(() => {
        void processarRespostaWhatsApp(telefoneNormalizado, texto, String(jidEfetivo || senderPhonePart), localizacao);
      });
    } catch (error) {
      logger.error('Erro ao processar webhook WhatsApp:', error);
    }
  }
}

export default new WebhookController();
