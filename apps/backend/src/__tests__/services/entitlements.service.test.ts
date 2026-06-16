import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/tenantContext', () => ({ getTenantId: () => 'rancho' }));

import { obterModulosAtivos, temModulo } from '../../services/entitlements.service';
import prisma from '../../config/database';

const core = [{ chave: 'cardapio' }, { chave: 'pedidos' }];

describe('entitlements.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).modulo.findMany.mockResolvedValue(core);
  });

  it('sem assinatura → só os módulos core', async () => {
    (prisma as any).assinatura.findUnique.mockResolvedValue(null);
    const ativos = await obterModulosAtivos();
    expect([...ativos].sort()).toEqual(['cardapio', 'pedidos']);
  });

  it('ATIVA com plano + avulsos → core ∪ plano ∪ avulsos', async () => {
    (prisma as any).assinatura.findUnique.mockResolvedValue({
      estado: 'ATIVA',
      plano: { modulos: [{ modulo: { chave: 'aura-atendente', ativo: true } }] },
      addons: [{ modulo: { chave: 'aura-campanhas', ativo: true } }],
    });
    const ativos = await obterModulosAtivos();
    expect([...ativos].sort()).toEqual(['aura-atendente', 'aura-campanhas', 'cardapio', 'pedidos']);
  });

  it('CANCELADA → sem acesso (vazio)', async () => {
    (prisma as any).assinatura.findUnique.mockResolvedValue({ estado: 'CANCELADA', plano: null, addons: [] });
    const ativos = await obterModulosAtivos();
    expect(ativos.size).toBe(0);
  });

  it('ignora módulo inativo do plano', async () => {
    (prisma as any).assinatura.findUnique.mockResolvedValue({
      estado: 'ATIVA',
      plano: { modulos: [{ modulo: { chave: 'aura-atendente', ativo: false } }] },
      addons: [],
    });
    const ativos = await obterModulosAtivos();
    expect(ativos.has('aura-atendente')).toBe(false);
  });

  it('temModulo reflete os ativos', async () => {
    (prisma as any).assinatura.findUnique.mockResolvedValue(null);
    expect(await temModulo('cardapio')).toBe(true);
    expect(await temModulo('aura-atendente')).toBe(false);
  });
});
