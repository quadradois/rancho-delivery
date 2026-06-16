import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/tenantContext', () => ({
  getTenantId: () => 'rancho',
}));

import { obterMarcaPublica } from '../../services/tenant.service';
import prisma from '../../config/database';

describe('tenant.service — obterMarcaPublica (white-label)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('retorna a marca do tenant atual (resolvido por host)', async () => {
    (prisma as any).tenant.findUnique.mockResolvedValue({
      slug: 'rancho',
      nome: 'Rancho Comida Caseira',
      logoUrl: null,
      tema: { corPrimaria: '#0F172A' },
    });

    const marca = await obterMarcaPublica();

    expect((prisma as any).tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'rancho' },
      select: { slug: true, nome: true, logoUrl: true, tema: true },
    });
    expect(marca).toEqual({
      slug: 'rancho',
      nome: 'Rancho Comida Caseira',
      logoUrl: null,
      tema: { corPrimaria: '#0F172A' },
    });
  });

  it('retorna null quando o tenant não existe', async () => {
    (prisma as any).tenant.findUnique.mockResolvedValue(null);
    expect(await obterMarcaPublica()).toBeNull();
  });
});
