import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import crypto from 'crypto';
import webhookRoutes from '../../routes/webhook.routes';
import pedidoService from '../../services/pedido.service';
import infinitePayService from '../../services/infinitepay.service';
import evolutionService from '../../services/evolution.service';
import realtimeService from '../../services/realtime.service';

vi.mock('../../services/pedido.service');
vi.mock('../../services/infinitepay.service');
vi.mock('../../services/evolution.service');
vi.mock('../../services/realtime.service', () => ({
  default: { emit: vi.fn() },
}));

const WEBHOOK_SECRET = 'test-webhook-secret-base64';

function buildApp(): Express {
  const app = express();
  app.use(
    express.json({
      verify: (req: any, _res, buf) => { req.rawBody = buf; },
    })
  );
  app.use('/webhook', webhookRoutes);
  return app;
}

function hmacSignature(body: object): string {
  const raw = JSON.stringify(body);
  const sig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex');
  return `sha256=${sig}`;
}

describe('Webhook InfinitePay — integração', () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.INFINITEPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    app = buildApp();
  });

  describe('Autenticação', () => {
    it('rejeita requisição sem token (401)', async () => {
      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(false);

      const res = await request(app)
        .post('/webhook/infinitepay')
        .send({ event: 'payment.approved' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejeita token inválido (401)', async () => {
      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(false);

      const res = await request(app)
        .post('/webhook/infinitepay')
        .set('x-infinitepay-signature', 'token-invalido')
        .send({ event: 'payment.approved' });

      expect(res.status).toBe(401);
    });

    it('aceita HMAC-SHA256 válido', async () => {
      const body = { event: 'payment.approved', order_nsu: 'pedido-abc', data: {} };
      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
      vi.mocked(infinitePayService.processarEvento).mockReturnValue({ aprovado: false, order_nsu: null, evento: 'outro' });

      const res = await request(app)
        .post('/webhook/infinitepay')
        .set('x-infinitepay-signature', hmacSignature(body))
        .send(body);

      expect(res.status).toBe(200);
      expect(infinitePayService.validarWebhook).toHaveBeenCalled();
    });
  });

  describe('Fluxo de aprovação de pagamento', () => {
    it('confirma pedido e emite eventos quando pagamento é aprovado', async () => {
      const pedidoId = 'pedido-xyz-123';
      const mockPedido = { id: pedidoId, status: 'AGUARDANDO_PAGAMENTO', cliente: { telefone: '5562999990000' } };

      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
      vi.mocked(infinitePayService.processarEvento).mockReturnValue({ aprovado: true, order_nsu: pedidoId, evento: 'payment.approved' });
      vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue(mockPedido as any);
      vi.mocked(pedidoService.atualizarStatus).mockResolvedValue(undefined as any);
      vi.mocked(pedidoService.obterMetricasAdmin).mockResolvedValue({} as any);
      vi.mocked(evolutionService.notificarNovoPedido).mockResolvedValue(true);

      const body = { event: 'payment.approved', order_nsu: pedidoId };
      const res = await request(app)
        .post('/webhook/infinitepay')
        .set('x-infinitepay-signature', 'valido')
        .send(body);

      expect(res.status).toBe(200);
      expect(pedidoService.atualizarStatus).toHaveBeenCalledWith(pedidoId, 'CONFIRMADO', pedidoId);
      expect(realtimeService.emit).toHaveBeenCalledWith('pedido:novo', { id: pedidoId, status: 'CONFIRMADO' });
      expect(realtimeService.emit).toHaveBeenCalledWith('pedido:atualizado', { id: pedidoId, status: 'CONFIRMADO' });
      expect(evolutionService.notificarNovoPedido).toHaveBeenCalledWith(mockPedido);
    });

    it('é idempotente — ignora pedido já CONFIRMADO', async () => {
      const pedidoId = 'pedido-ja-confirmado';
      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
      vi.mocked(infinitePayService.processarEvento).mockReturnValue({ aprovado: true, order_nsu: pedidoId, evento: 'payment.approved' });
      vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue({ id: pedidoId, status: 'CONFIRMADO' } as any);

      const res = await request(app)
        .post('/webhook/infinitepay')
        .set('x-infinitepay-signature', 'valido')
        .send({ event: 'payment.approved', order_nsu: pedidoId });

      expect(res.status).toBe(200);
      expect(pedidoService.atualizarStatus).not.toHaveBeenCalled();
      expect(res.body.message).toMatch(/já processado/i);
    });

    it('ignora eventos que não são aprovação de pagamento', async () => {
      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
      vi.mocked(infinitePayService.processarEvento).mockReturnValue({ aprovado: false, order_nsu: null, evento: 'payment.refunded' });

      const res = await request(app)
        .post('/webhook/infinitepay')
        .set('x-infinitepay-signature', 'valido')
        .send({ event: 'payment.refunded' });

      expect(res.status).toBe(200);
      expect(pedidoService.atualizarStatus).not.toHaveBeenCalled();
    });

    it('retorna 200 mesmo em caso de erro interno (evita reenvio)', async () => {
      vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
      vi.mocked(infinitePayService.processarEvento).mockReturnValue({ aprovado: true, order_nsu: 'ped-err', evento: 'payment.approved' });
      vi.mocked(pedidoService.buscarPedidoPorId).mockRejectedValue(new Error('DB down'));

      const res = await request(app)
        .post('/webhook/infinitepay')
        .set('x-infinitepay-signature', 'valido')
        .send({ event: 'payment.approved', order_nsu: 'ped-err' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Webhook WhatsApp', () => {
    it('processa mensagem recebida e emite evento realtime', async () => {
      const app2 = buildApp();
      const body = {
        data: {
          key: { remoteJid: '5562999990000@s.whatsapp.net' },
          message: { conversation: 'Olá, meu pedido chegou?' },
        },
      };

      vi.mocked(pedidoService.obterMetricasAdmin).mockResolvedValue({} as any);

      const clienteService = await import('../../services/cliente.service');
      vi.spyOn(clienteService.default, 'registrarMensagemRecebida').mockResolvedValue(undefined as any);

      const res = await request(app2)
        .post('/webhook/whatsapp')
        .send(body);

      expect(res.status).toBe(200);
      expect(realtimeService.emit).toHaveBeenCalledWith('mensagem:nova', expect.objectContaining({
        texto: 'Olá, meu pedido chegou?',
      }));
    });
  });
});
