import { describe, it, expect, vi, beforeEach } from 'vitest';

const imoveisMocks = vi.hoisted(() => ({
  buscarBairros: vi.fn(),
  buscarDetalhe: vi.fn(),
  buscarPorPrefixo: vi.fn(),
  buscarPrefixosDaCidade: vi.fn(),
  cidadesDisponiveis: vi.fn(),
}));

vi.mock('../../services/imoveis.service', () => ({
  VERSAO_ENRIQUECIMENTO_ATUAL: 2,
  buscarBairros: imoveisMocks.buscarBairros,
  buscarDetalhe: imoveisMocks.buscarDetalhe,
  buscarPorPrefixo: imoveisMocks.buscarPorPrefixo,
  buscarPrefixosDaCidade: imoveisMocks.buscarPrefixosDaCidade,
  cidadesDisponiveis: imoveisMocks.cidadesDisponiveis,
}));

import {
  executarCargaImoveis,
  executarEnriquecimentoIncremental,
  sincronizarBairros,
} from '../../jobs/cargaImoveis.job';
import { VERSAO_ENRIQUECIMENTO_ATUAL } from '../../services/imoveis.service';
import prisma from '../../config/database';

describe('cargaImoveis — enriquecimento incremental (Bug B corrigido)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).$transaction.mockImplementation(async (ops: any) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops({ pedido: { create: vi.fn() } });
    });
  });

  it('seleciona por VERSÃO < atual (não apenas registros sem CPF)', async () => {
    (prisma as any).imovelRancho.findMany.mockResolvedValue([]);

    const n = await executarEnriquecimentoIncremental('goiania');

    expect(n).toBe(0);
    expect((prisma as any).imovelRancho.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          cidade: 'goiania',
          versaoEnriquecimento: { lt: VERSAO_ENRIQUECIMENTO_ATUAL },
        }),
      }),
    );
    // garante que NÃO usa mais o filtro antigo "cpfCnpj: null"
    const argWhere = (prisma as any).imovelRancho.findMany.mock.calls[0][0].where;
    expect(argWhere).not.toHaveProperty('cpfCnpj');
  });

  it('enriquece pendentes, marca 4xx como processado e deixa falha transitória para retry', async () => {
    (prisma as any).imovelRancho.findMany.mockResolvedValue([
      { inscricaoCartografica: 'A', idLote: 1 },
      { inscricaoCartografica: 'B', idLote: 2 },
      { inscricaoCartografica: 'C', idLote: 3 },
    ]);
    imoveisMocks.buscarDetalhe
      .mockResolvedValueOnce({
        numeroCadastro: 10,
        cpfCnpj: '123',
        nomePessoa: 'Ana',
        tipoPessoa: 1,
        endereco: 'Rua 1',
        bairro: 'Centro',
        cep: '74000000',
        complemento: null,
        logradouro: 'Rua 1',
        areaConstruida: 90,
        areaTerreno: 120,
        tipoEdificacao: 2,
        nrLote: '1',
        idBairro: 7,
        idQuadra: 8,
        idSetor: 9,
        raw: { ok: true },
      })
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('timeout'));
    const onProgresso = vi.fn();

    const total = await executarEnriquecimentoIncremental('goiania', 50, onProgresso);

    expect(total).toBe(1);
    expect((prisma as any).imovelRancho.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
    expect((prisma as any).imovelRancho.update).toHaveBeenCalledTimes(2);
    expect((prisma as any).imovelRancho.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { cidade_idLote: { cidade: 'goiania', idLote: 1 } },
        data: expect.objectContaining({
          cpfCnpj: '123',
          bairro: 'Centro',
          raw: { ok: true },
          versaoEnriquecimento: VERSAO_ENRIQUECIMENTO_ATUAL,
        }),
      }),
    );
    expect((prisma as any).imovelRancho.update).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { cidade_idLote: { cidade: 'goiania', idLote: 2 } },
        data: expect.objectContaining({ versaoEnriquecimento: VERSAO_ENRIQUECIMENTO_ATUAL }),
      }),
    );
    expect(onProgresso).toHaveBeenCalledWith(1, 3);
  });
});

describe('cargaImoveis — bairros e carga completa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma as any).$transaction.mockImplementation(async (ops: any) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops({ pedido: { create: vi.fn() } });
    });
  });

  it('sincroniza bairros por upsert e retorna zero quando a fonte vem vazia', async () => {
    imoveisMocks.buscarBairros.mockResolvedValueOnce([]);
    await expect(sincronizarBairros('goiania')).resolves.toBe(0);
    expect((prisma as any).bairroRancho.upsert).not.toHaveBeenCalled();

    imoveisMocks.buscarBairros.mockResolvedValueOnce([
      {
        id: 7,
        codigo: '007',
        nome: 'Centro',
        nomeFormatado: 'CENTRO',
        codigoZona: 1,
        areaTerreno: 100,
        areaUrbanizavel: 80,
        geom: 'geom',
      },
    ]);

    await expect(sincronizarBairros('goiania')).resolves.toBe(1);
    expect((prisma as any).bairroRancho.upsert).toHaveBeenCalledWith({
      where: { cidade_idBairro: { cidade: 'goiania', idBairro: 7 } },
      update: expect.objectContaining({ nome: 'Centro', geom: 'geom' }),
      create: expect.objectContaining({ cidade: 'goiania', idBairro: 7, codigo: '007' }),
    });
  });

  it('executa carga com bairros tolerante a falha, fase 1 por prefixo e fase 2 incremental', async () => {
    imoveisMocks.cidadesDisponiveis.mockReturnValue(['goiania']);
    imoveisMocks.buscarBairros.mockRejectedValue(new Error('bairro fora'));
    imoveisMocks.buscarPrefixosDaCidade.mockResolvedValue(['101']);
    imoveisMocks.buscarPorPrefixo.mockResolvedValue([
      {
        inscricao_cartografica: '1010001',
        id_lote: 1,
        id_imobiliario: 99,
        lat: -16.7,
        lng: -49.2,
      },
    ]);
    (prisma as any).imovelRancho.count.mockResolvedValue(1);
    (prisma as any).imovelRancho.findMany.mockResolvedValue([]);
    const onProgresso = vi.fn();

    await expect(executarCargaImoveis(undefined, onProgresso)).resolves.toEqual({
      goiania: { fase1: 1, fase2: 0 },
    });

    expect((prisma as any).imovelRancho.upsert).toHaveBeenCalledWith({
      where: { cidade_idLote: { cidade: 'goiania', idLote: 99 } },
      update: { idLote: 99, latitude: -16.7, longitude: -49.2 },
      create: {
        cidade: 'goiania',
        inscricaoCartografica: '1010001',
        idLote: 99,
        latitude: -16.7,
        longitude: -49.2,
      },
    });
    expect(onProgresso).toHaveBeenCalledWith('goiania', 'search', 1, -1);
  });
});
