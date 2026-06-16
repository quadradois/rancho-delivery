import { describe, it, expect, vi, beforeEach } from 'vitest';

const { tenant } = vi.hoisted(() => ({
  tenant: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('../../config/database', () => ({ default: { tenant } }));

import * as service from '../../services/superadmin.service';
import { RestauranteError } from '../../services/superadmin.service';

const baseTenant = {
  id: 'rancho', slug: 'rancho', nome: 'Rancho', dominio: null,
  logoUrl: null, tema: null, ativo: true, criadoEm: new Date('2026-01-01'),
};

describe('superadmin.service — CRUD de restaurantes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listarRestaurantes serializa tenant + assinatura/plano', async () => {
    tenant.findMany.mockResolvedValue([
      { ...baseTenant, assinatura: { estado: 'ATIVA', proximaCobranca: null, plano: { nome: 'Premium' } } },
    ]);
    const lista = await service.listarRestaurantes();
    expect(lista[0]).toMatchObject({ id: 'rancho', assinatura: { estado: 'ATIVA', plano: 'Premium' } });
  });

  it('criarRestaurante rejeita slug em uso (409)', async () => {
    tenant.findUnique.mockResolvedValueOnce(baseTenant); // slug existe
    await expect(service.criarRestaurante({ slug: 'rancho', nome: 'X' }))
      .rejects.toMatchObject({ code: 'SLUG_EM_USO' });
    expect(tenant.create).not.toHaveBeenCalled();
  });

  it('criarRestaurante rejeita domínio em uso', async () => {
    tenant.findUnique
      .mockResolvedValueOnce(null) // slug livre
      .mockResolvedValueOnce(baseTenant); // domínio existe
    await expect(service.criarRestaurante({ slug: 'novo', nome: 'X', dominio: 'novo.com' }))
      .rejects.toMatchObject({ code: 'DOMINIO_EM_USO' });
  });

  it('criarRestaurante cria quando slug/domínio livres', async () => {
    tenant.findUnique.mockResolvedValue(null);
    tenant.create.mockResolvedValue({ ...baseTenant, id: 'novo', slug: 'novo', nome: 'Novo', assinatura: null });
    const r = await service.criarRestaurante({ slug: 'novo', nome: 'Novo' });
    expect(tenant.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { slug: 'novo', nome: 'Novo', dominio: null },
    }));
    expect(r).toMatchObject({ slug: 'novo', assinatura: null });
  });

  it('obterRestaurante lança NAO_ENCONTRADO quando não existe', async () => {
    tenant.findUnique.mockResolvedValue(null);
    await expect(service.obterRestaurante('nao-existe'))
      .rejects.toBeInstanceOf(RestauranteError);
  });

  it('atualizarRestaurante suspende (ativo=false) um restaurante existente', async () => {
    tenant.findUnique.mockResolvedValue(baseTenant);
    tenant.update.mockResolvedValue({ ...baseTenant, ativo: false, assinatura: null });
    const r = await service.atualizarRestaurante('rancho', { ativo: false });
    expect(tenant.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'rancho' },
      data: expect.objectContaining({ ativo: false }),
    }));
    expect(r.ativo).toBe(false);
  });

  it('atualizarRestaurante lança NAO_ENCONTRADO quando id inexistente', async () => {
    tenant.findUnique.mockResolvedValue(null);
    await expect(service.atualizarRestaurante('x', { nome: 'Y' }))
      .rejects.toMatchObject({ code: 'NAO_ENCONTRADO' });
  });
});
