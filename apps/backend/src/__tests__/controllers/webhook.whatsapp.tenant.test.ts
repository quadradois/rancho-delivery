/**
 * F0.1 — Webhook WhatsApp resolve o tenant pela instância Evolution (não cai
 * mais no tenant padrão implícito).
 *
 * Regras:
 *  - payload com instância conhecida → tenant da ConexaoWhatsApp correspondente.
 *  - instância ausente/desconhecida mas só existe UMA conexão → usa o tenant dela
 *    (fallback seguro que some quando entra a 2ª conexão).
 *  - instância desconhecida e várias conexões → não resolve (null) → descarta.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Request, Response } from 'express';
import webhookController, { resolverTenantWhatsApp } from '../../controllers/webhook.controller';
import prisma from '../../config/database';

vi.mock('../../services/mercadopago.service');
vi.mock('../../services/pedido.service', () => ({
  default: { obterMetricasAdmin: vi.fn().mockResolvedValue({}) },
}));
vi.mock('../../services/evolution.service');
vi.mock('../../services/realtime.service', () => ({
  default: { emit: vi.fn() },
}));
vi.mock('../../services/cliente.service', () => ({
  default: { registrarMensagemRecebida: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('../../services/conversacao.service', () => ({
  processarRespostaWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

import clienteService from '../../services/cliente.service';

const conexao = (prisma as any).conexaoWhatsApp;

describe('resolverTenantWhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    conexao.findFirst.mockResolvedValue(null);
    conexao.findMany.mockResolvedValue([{ tenantId: 'rancho' }]);
  });

  it('resolve o tenant pela instância do payload (body.instance → ConexaoWhatsApp.nome)', async () => {
    conexao.findFirst.mockResolvedValue({ tenantId: 'frandelicia-buriti' });

    const out = await resolverTenantWhatsApp({ instance: 'BuritiBot', data: {} });

    expect(conexao.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nome: 'BuritiBot' } }),
    );
    expect(out.tenantId).toBe('frandelicia-buriti');
    expect(out.viaFallback).toBe(false);
  });

  it('cai no fallback de conexão única quando a instância não casa', async () => {
    conexao.findFirst.mockResolvedValue(null);
    conexao.findMany.mockResolvedValue([{ tenantId: 'rancho' }]);

    const out = await resolverTenantWhatsApp({ instance: 'desconhecida' });

    expect(out.tenantId).toBe('rancho');
    expect(out.viaFallback).toBe(true);
  });

  it('não resolve (null) quando a instância é desconhecida e há várias conexões', async () => {
    conexao.findFirst.mockResolvedValue(null);
    conexao.findMany.mockResolvedValue([{ tenantId: 'rancho' }, { tenantId: 'frandelicia-buriti' }]);

    const out = await resolverTenantWhatsApp({ instance: 'desconhecida' });

    expect(out.tenantId).toBeNull();
  });
});

describe('WebhookController.whatsapp — descarte sem tenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    conexao.findFirst.mockResolvedValue(null);
    conexao.findMany.mockResolvedValue([{ tenantId: 'rancho' }, { tenantId: 'frandelicia-buriti' }]);
  });
  afterEach(() => vi.useRealTimers());

  it('descarta a mensagem (não registra) quando o tenant não resolve', async () => {
    const req = { body: { data: { key: { remoteJid: '5562993715693@s.whatsapp.net', fromMe: false }, message: { conversation: 'oi' } } }, params: {} } as any;
    const json = vi.fn();
    const res = { status: vi.fn().mockReturnValue({ json }), json } as any;

    await webhookController.whatsapp(req as Request, res as Response);
    await vi.runAllTimersAsync();

    expect(clienteService.registrarMensagemRecebida).not.toHaveBeenCalled();
  });
});
