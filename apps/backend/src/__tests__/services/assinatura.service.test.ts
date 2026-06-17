import { describe, it, expect, vi, beforeEach } from 'vitest';

const { tenant, plano, assinatura } = vi.hoisted(() => ({
  tenant: { findUnique: vi.fn() },
  plano: { findUnique: vi.fn() },
  assinatura: { findUnique: vi.fn(), upsert: vi.fn() },
}));
vi.mock('../../config/database', () => ({ default: { tenant, plano, assinatura } }));

import * as service from '../../services/assinatura.service';
import { AssinaturaError } from '../../services/assinatura.service';

describe('assinatura.service — estados da conta', () => {
  beforeEach(() => vi.clearAllMocks());

  it('obterAssinatura retorna null quando o restaurante não tem assinatura (tier grátis)', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'rancho' });
    assinatura.findUnique.mockResolvedValue(null);
    expect(await service.obterAssinatura('rancho')).toBeNull();
  });

  it('obterAssinatura serializa estado + plano', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'rancho' });
    assinatura.findUnique.mockResolvedValue({
      estado: 'ATIVA', planoId: 'p1', proximaCobranca: null, trialAte: null, atualizadoEm: new Date('2026-06-01'),
      plano: { id: 'p1', nome: 'Premium' },
    });
    const a = await service.obterAssinatura('rancho');
    expect(a).toMatchObject({ estado: 'ATIVA', plano: { id: 'p1', nome: 'Premium' } });
  });

  it('obterAssinatura lança RESTAURANTE_NAO_ENCONTRADO', async () => {
    tenant.findUnique.mockResolvedValue(null);
    await expect(service.obterAssinatura('nao')).rejects.toMatchObject({ code: 'RESTAURANTE_NAO_ENCONTRADO' });
  });

  it('definirAssinatura faz upsert com plano + estado', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'rancho' });
    plano.findUnique.mockResolvedValue({ id: 'p1' });
    assinatura.upsert.mockResolvedValue({
      estado: 'ATIVA', planoId: 'p1', proximaCobranca: null, trialAte: null, atualizadoEm: new Date(),
      plano: { id: 'p1', nome: 'Premium' },
    });
    await service.definirAssinatura('rancho', { estado: 'ATIVA' as never, planoId: 'p1' });
    expect(assinatura.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'rancho' },
      create: { tenantId: 'rancho', planoId: 'p1', estado: 'ATIVA' },
      update: { planoId: 'p1', estado: 'ATIVA' },
    }));
  });

  it('definirAssinatura aceita planoId null (rebaixa para grátis) sem validar plano', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'rancho' });
    assinatura.upsert.mockResolvedValue({
      estado: 'CANCELADA', planoId: null, proximaCobranca: null, trialAte: null, atualizadoEm: new Date(), plano: null,
    });
    const a = await service.definirAssinatura('rancho', { estado: 'CANCELADA' as never, planoId: null });
    expect(plano.findUnique).not.toHaveBeenCalled();
    expect(a).toMatchObject({ estado: 'CANCELADA', plano: null });
  });

  it('definirAssinatura lança PLANO_NAO_ENCONTRADO quando o plano não existe', async () => {
    tenant.findUnique.mockResolvedValue({ id: 'rancho' });
    plano.findUnique.mockResolvedValue(null);
    await expect(service.definirAssinatura('rancho', { estado: 'ATIVA' as never, planoId: 'fantasma' }))
      .rejects.toBeInstanceOf(AssinaturaError);
    expect(assinatura.upsert).not.toHaveBeenCalled();
  });

  it('definirAssinatura lança RESTAURANTE_NAO_ENCONTRADO antes de tudo', async () => {
    tenant.findUnique.mockResolvedValue(null);
    await expect(service.definirAssinatura('nao', { estado: 'ATIVA' as never, planoId: null }))
      .rejects.toMatchObject({ code: 'RESTAURANTE_NAO_ENCONTRADO' });
  });
});
