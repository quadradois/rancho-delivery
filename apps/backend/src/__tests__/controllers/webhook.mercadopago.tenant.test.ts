/**
 * F0.1 — Webhook MercadoPago resolve o tenant pelo próprio pedido e processa a
 * confirmação dentro do contexto desse tenant (não cai no tenant padrão).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import webhookController from '../../controllers/webhook.controller';
import mercadoPagoService from '../../services/mercadopago.service';
import pedidoService from '../../services/pedido.service';
import { getTenantId } from '../../config/tenantContext';

vi.mock('../../services/mercadopago.service');
vi.mock('../../services/pedido.service');
vi.mock('../../services/evolution.service');

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status, json } as any, json, status };
}

describe('WebhookController.mercadopago — tenant pelo pedido', () => {
  beforeEach(() => vi.clearAllMocks());

  it('processa a confirmação no contexto do tenant do pedido', async () => {
    vi.mocked(mercadoPagoService.validarWebhook).mockReturnValue(true);
    vi.mocked(mercadoPagoService.processarEvento).mockReturnValue({
      aprovado: true, order_nsu: 'pedido-1', status: 'APPROVED', evento: 'payment.approved',
    } as any);
    vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue({
      id: 'pedido-1', status: 'PENDENTE', tenantId: 'frandelicia-buriti',
    } as any);

    let tenantNoUpdate: string | undefined;
    vi.mocked(pedidoService.atualizarStatus).mockImplementation(async () => {
      tenantNoUpdate = getTenantId();
      return {} as any;
    });

    const { res, status } = makeRes();
    await webhookController.mercadopago({ body: { order_nsu: 'pedido-1' }, headers: {} } as Request, res as Response);

    expect(pedidoService.atualizarStatus).toHaveBeenCalledWith('pedido-1', 'CONFIRMADO', 'pedido-1');
    expect(tenantNoUpdate).toBe('frandelicia-buriti');
    expect(status).toHaveBeenCalledWith(200);
  });

  it('ignora (não atualiza) quando o pedido não tem tenant', async () => {
    vi.mocked(mercadoPagoService.validarWebhook).mockReturnValue(true);
    vi.mocked(mercadoPagoService.processarEvento).mockReturnValue({
      aprovado: true, order_nsu: 'pedido-2', status: 'APPROVED', evento: 'payment.approved',
    } as any);
    vi.mocked(pedidoService.buscarPedidoPorId).mockResolvedValue({
      id: 'pedido-2', status: 'PENDENTE', tenantId: null,
    } as any);

    const { res, status } = makeRes();
    await webhookController.mercadopago({ body: { order_nsu: 'pedido-2' }, headers: {} } as Request, res as Response);

    expect(pedidoService.atualizarStatus).not.toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(200);
  });
});
