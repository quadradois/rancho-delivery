import { describe, it, expect, vi, beforeEach } from 'vitest';

const { tenant, assinatura, mpPost, mpGet } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  assinatura: { update: vi.fn(), findFirst: vi.fn() },
  mpPost: vi.fn(),
  mpGet: vi.fn(),
}));
vi.mock('../../config/database', () => ({ default: { tenant, assinatura } }));
vi.mock('axios', () => ({ default: { create: () => ({ post: mpPost, get: mpGet }) } }));

import * as service from '../../services/cobranca.service';
import { CobrancaError } from '../../services/cobranca.service';

describe('cobranca.service — assinatura Mercado Pago', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FOODFLOW_MP_ACCESS_TOKEN = 'TEST-token';
    process.env.FOODFLOW_ADMIN_URL = 'https://admin.foodflow.ia.br';
  });

  it('gerarLinkAssinatura cria preapproval com o preço do plano e guarda o provedorRef', async () => {
    tenant.findUnique.mockResolvedValue({
      id: 'rancho', nome: 'Rancho', assinatura: { plano: { nome: 'Premium', preco: '99.90', ciclo: 'MENSAL', diasTeste: 0 } },
    });
    mpPost.mockResolvedValue({ data: { id: 'PRE-1', init_point: 'https://mp/checkout/PRE-1' } });

    const r = await service.gerarLinkAssinatura('rancho', { email: 'dono@rancho.com' });

    expect(mpPost).toHaveBeenCalledWith('/preapproval', expect.objectContaining({
      external_reference: 'rancho',
      payer_email: 'dono@rancho.com',
      notification_url: 'https://admin.foodflow.ia.br/webhook/assinatura',
      auto_recurring: expect.objectContaining({ transaction_amount: 99.9, frequency: 1, frequency_type: 'months', currency_id: 'BRL' }),
    }));
    expect(assinatura.update).toHaveBeenCalledWith({ where: { tenantId: 'rancho' }, data: { provedorRef: 'PRE-1' } });
    expect(r).toEqual({ url: 'https://mp/checkout/PRE-1', preapprovalId: 'PRE-1' });
  });

  it('ciclo ANUAL vira frequency 12 e diasTeste vira free_trial em dias', async () => {
    tenant.findUnique.mockResolvedValue({
      id: 'r', nome: 'R', assinatura: { plano: { nome: 'Anual', preco: '990', ciclo: 'ANUAL', diasTeste: 15 } },
    });
    mpPost.mockResolvedValue({ data: { id: 'PRE-A', init_point: 'https://mp/A' } });
    await service.gerarLinkAssinatura('r');
    expect(mpPost).toHaveBeenCalledWith('/preapproval', expect.objectContaining({
      auto_recurring: expect.objectContaining({
        frequency: 12,
        frequency_type: 'months',
        free_trial: { frequency: 15, frequency_type: 'days' },
      }),
    }));
  });

  it('gerarLinkAssinatura usa sandbox_init_point quando init_point ausente', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'r', nome: 'R', assinatura: { plano: { nome: 'P', preco: '10' } } });
    mpPost.mockResolvedValue({ data: { id: 'PRE-2', sandbox_init_point: 'https://sandbox/PRE-2' } });
    const r = await service.gerarLinkAssinatura('r');
    expect(r.url).toBe('https://sandbox/PRE-2');
  });

  it('gerarLinkAssinatura lança SEM_PLANO quando não há plano atribuído', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'r', nome: 'R', assinatura: { plano: null } });
    await expect(service.gerarLinkAssinatura('r')).rejects.toMatchObject({ code: 'SEM_PLANO' });
    expect(mpPost).not.toHaveBeenCalled();
  });

  it('gerarLinkAssinatura lança RESTAURANTE_NAO_ENCONTRADO', async () => {
    tenant.findUnique.mockResolvedValue(null);
    await expect(service.gerarLinkAssinatura('x')).rejects.toBeInstanceOf(CobrancaError);
  });

  it('gerarLinkAssinatura lança SEM_TOKEN sem credencial', async () => {
    delete process.env.FOODFLOW_MP_ACCESS_TOKEN;
    tenant.findUnique.mockResolvedValue({ id: 'r', nome: 'R', assinatura: { plano: { nome: 'P', preco: '10' } } });
    await expect(service.gerarLinkAssinatura('r')).rejects.toMatchObject({ code: 'SEM_TOKEN' });
  });

  it('webhook subscription_preapproval authorized → ATIVA', async () => {
    mpGet.mockResolvedValue({ data: { status: 'authorized', external_reference: 'rancho', next_payment_date: '2026-07-01T00:00:00Z' } });
    assinatura.findFirst.mockResolvedValue({ id: 'a1' });

    await service.processarWebhookAssinatura({ type: 'subscription_preapproval', data: { id: 'PRE-1' } });

    expect(mpGet).toHaveBeenCalledWith('/preapproval/PRE-1');
    expect(assinatura.findFirst).toHaveBeenCalledWith({ where: { provedorRef: 'PRE-1' }, select: { id: true } });
    expect(assinatura.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'a1' },
      data: expect.objectContaining({ estado: 'ATIVA' }),
    }));
  });

  it('webhook subscription_preapproval cancelled → INADIMPLENTE', async () => {
    mpGet.mockResolvedValue({ data: { status: 'cancelled', external_reference: 'rancho' } });
    assinatura.findFirst.mockResolvedValue({ id: 'a1' });
    await service.processarWebhookAssinatura({ type: 'subscription_preapproval', data: { id: 'PRE-1' } });
    expect(assinatura.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estado: 'INADIMPLENTE' }) }));
  });

  it('webhook authorized_payment approved → ATIVA pelo preapproval_id', async () => {
    mpGet.mockResolvedValue({ data: { preapproval_id: 'PRE-9', status: 'approved' } });
    assinatura.findFirst.mockResolvedValue({ id: 'a9' });
    await service.processarWebhookAssinatura({ type: 'subscription_authorized_payment', data: { id: 'PAY-1' } });
    expect(mpGet).toHaveBeenCalledWith('/authorized_payments/PAY-1');
    expect(assinatura.findFirst).toHaveBeenCalledWith({ where: { provedorRef: 'PRE-9' }, select: { id: true } });
    expect(assinatura.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ estado: 'ATIVA' }) }));
  });

  it('webhook sem id é ignorado', async () => {
    await service.processarWebhookAssinatura({ type: 'subscription_preapproval', data: {} });
    expect(mpGet).not.toHaveBeenCalled();
  });
});
