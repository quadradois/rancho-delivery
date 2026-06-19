/**
 * F0.1 — jobs/crons rodam uma vez por tenant ativo, cada execução no contexto
 * do seu tenant (em vez de cair no tenant padrão).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paraCadaTenantAtivo } from '../../jobs/forEachTenant';
import { getTenantId } from '../../config/tenantContext';
import prisma from '../../config/database';

const tenant = (prisma as any).tenant;

describe('paraCadaTenantAtivo', () => {
  beforeEach(() => vi.clearAllMocks());

  it('executa fn uma vez por tenant ativo, no contexto de cada um', async () => {
    tenant.findMany.mockResolvedValue([{ id: 'rancho' }, { id: 'frandelicia-buriti' }]);

    const vistos: string[] = [];
    await paraCadaTenantAtivo(async () => {
      vistos.push(getTenantId());
    });

    expect(tenant.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { ativo: true } }));
    expect(vistos).toEqual(['rancho', 'frandelicia-buriti']);
  });

  it('falha em um tenant não interrompe os demais', async () => {
    tenant.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

    const ok: string[] = [];
    await paraCadaTenantAtivo(async () => {
      const t = getTenantId();
      if (t === 'b') throw new Error('boom');
      ok.push(t);
    });

    expect(ok).toEqual(['a', 'c']);
  });
});
