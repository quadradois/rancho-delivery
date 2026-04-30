import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import webhookController from '../../controllers/webhook.controller';
import infinitePayService from '../../services/infinitepay.service';
import pedidoService from '../../services/pedido.service';
import evolutionService from '../../services/evolution.service';

vi.mock('../../services/infinitepay.service');
vi.mock('../../services/pedido.service');
vi.mock('../../services/evolution.service');

describe('WebhookController.infinitepay', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockRequest = { body: {}, headers: {} };
    mockResponse = { status: statusMock, json: jsonMock };
  });

  it('processa aprovação e notifica WhatsApp', async () => {
    mockRequest.body = { event: 'payment.approved', order_nsu: 'pedido-123' };
    mockRequest.headers = { 'x-infinitepay-signature': 'valid-token' };

    vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
    vi.mocked(infinitePayService.processarEvento).mockReturnValue({
      aprovado: true,
      order_nsu: 'pedido-123',
      status: 'APPROVED',
      evento: 'payment.approved',
    });

    vi.mocked(pedidoService.buscarPedidoPorId)
      .mockResolvedValueOnce({ id: 'pedido-123', status: 'PENDENTE' } as any)
      .mockResolvedValueOnce({ id: 'pedido-123', status: 'CONFIRMADO' } as any);

    vi.mocked(pedidoService.atualizarStatus).mockResolvedValue({} as any);
    vi.mocked(evolutionService.notificarNovoPedido).mockResolvedValue(true);

    await webhookController.infinitepay(mockRequest as Request, mockResponse as Response);

    expect(pedidoService.atualizarStatus).toHaveBeenCalledWith('pedido-123', 'CONFIRMADO', 'pedido-123');
    expect(evolutionService.notificarNovoPedido).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('retorna 401 quando token é inválido', async () => {
    mockRequest.body = { event: 'payment.approved', order_nsu: 'pedido-123' };
    mockRequest.headers = { 'x-infinitepay-signature': 'invalid-token' };

    vi.mocked(infinitePayService.validarWebhook).mockReturnValue(false);

    await webhookController.infinitepay(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      error: { message: 'Token inválido', code: 'UNAUTHORIZED' },
    });
  });

  it('ignora evento não aprovado', async () => {
    mockRequest.body = { event: 'payment.pending', order_nsu: 'pedido-123' };

    vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
    vi.mocked(infinitePayService.processarEvento).mockReturnValue({
      aprovado: false,
      order_nsu: 'pedido-123',
      status: 'PENDING',
      evento: 'payment.pending',
    });

    await webhookController.infinitepay(mockRequest as Request, mockResponse as Response);

    expect(pedidoService.atualizarStatus).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
  });

  it('é idempotente para pedido já confirmado', async () => {
    mockRequest.body = { event: 'payment.approved', order_nsu: 'pedido-123' };

    vi.mocked(infinitePayService.validarWebhook).mockReturnValue(true);
    vi.mocked(infinitePayService.processarEvento).mockReturnValue({
      aprovado: true,
      order_nsu: 'pedido-123',
      status: 'APPROVED',
      evento: 'payment.approved',
    });

    vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue({ id: 'pedido-123', status: 'CONFIRMADO' } as any);

    await webhookController.infinitepay(mockRequest as Request, mockResponse as Response);

    expect(pedidoService.atualizarStatus).not.toHaveBeenCalled();
    expect(evolutionService.notificarNovoPedido).not.toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: 'Webhook já processado anteriormente',
    });
  });
});
