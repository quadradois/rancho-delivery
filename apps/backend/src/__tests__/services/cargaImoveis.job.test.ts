import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executarEnriquecimentoIncremental } from '../../jobs/cargaImoveis.job';
import { VERSAO_ENRIQUECIMENTO_ATUAL } from '../../services/imoveis.service';
import prisma from '../../config/database';

describe('cargaImoveis — enriquecimento incremental (Bug B corrigido)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('seleciona por VERSÃO < atual (não apenas registros sem CPF)', async () => {
    (prisma as any).imovelRancho.findMany.mockResolvedValue([]);

    const n = await executarEnriquecimentoIncremental('goiania');

    expect(n).toBe(0);
    expect((prisma as any).imovelRancho.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cidade: 'goiania',
          idLote: { not: null },
          versaoEnriquecimento: { lt: VERSAO_ENRIQUECIMENTO_ATUAL },
        }),
      }),
    );
    // garante que NÃO usa mais o filtro antigo "cpfCnpj: null"
    const argWhere = (prisma as any).imovelRancho.findMany.mock.calls[0][0].where;
    expect(argWhere).not.toHaveProperty('cpfCnpj');
  });
});
