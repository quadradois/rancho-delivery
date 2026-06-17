import { describe, it, expect, vi, beforeEach } from 'vitest';

const { lead } = vi.hoisted(() => ({
  lead: { create: vi.fn(), findMany: vi.fn() },
}));
vi.mock('../../config/database', () => ({ default: { lead } }));

import * as service from '../../services/lead.service';

describe('lead.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('criarLead grava com origem "site" e e-mail nulo quando ausente', async () => {
    lead.create.mockResolvedValue({ id: 'l1', criadoEm: new Date() });
    await service.criarLead({ nome: 'João', restaurante: 'Cantina', contato: '62999999999' });
    expect(lead.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ nome: 'João', restaurante: 'Cantina', contato: '62999999999', email: null, origem: 'site' }),
    }));
  });

  it('listarLeads retorna os mais recentes primeiro', async () => {
    lead.findMany.mockResolvedValue([{ id: 'l1' }]);
    const r = await service.listarLeads();
    expect(lead.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { criadoEm: 'desc' } }));
    expect(r).toHaveLength(1);
  });
});
