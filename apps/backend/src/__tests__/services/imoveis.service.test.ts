import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
import axios from 'axios';
import {
  buscarBairros,
  buscarDetalhe,
  buscarPorPrefixo,
  buscarPrefixosDaCidade,
  cidadesDisponiveis,
  wktParaLatLng,
} from '../../services/imoveis.service';

// Payload cru real do endpoint busca_imoveis_all (imóvel da Vila Rosa)
const RAW: Record<string, unknown> = {
  numero_cadastro___imobiliario: null,
  cpf_cnpj: '28149513191',
  nome___pessoa: 'LUIZ BERTO DO NASCIMENTO',
  tipo___pessoa: 1,
  endereco_completo: ' AV FRANCISCO DE MELO, APT301 BL-1     ',
  nome___bairro: 'VL ROSA',
  cep_inicial: null,
  complemento: 'APT301 BL-1    ',
  nome___logradouro: 'AV FRANCISCO DE MELO',
  area_construida_privativa___imobiliario: '96',
  area_terreno_privativa: 5517.26,
  tipo_edificacao: 2,
  nr_lote: '694',
  id_bairro: 587,
  id_quadra: 14660,
  id_setor: 253,
};

function mockAxios(detalhe: () => unknown) {
  vi.mocked(axios.get).mockImplementation(async (url: any) => {
    if (String(url).includes('/ouv/')) return { data: { authToken: 't', tnToken: 'x' } } as any;
    return { data: detalhe() } as any;
  });
}

describe('imoveis.service.buscarDetalhe', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mapeia todos os campos (ricos inclusos) e lê o CEP de cep_inicial', async () => {
    mockAxios(() => RAW);
    const d = await buscarDetalhe('goiania', 344193, '32404806940022');

    expect(d).not.toBeNull();
    expect(d!.cpfCnpj).toBe('28149513191');
    expect(d!.nomePessoa).toBe('LUIZ BERTO DO NASCIMENTO');
    expect(d!.tipoPessoa).toBe(1);
    expect(d!.bairro).toBe('VL ROSA');
    expect(d!.cep).toBeNull(); // cep_inicial é null → null (não lê o campo errado "cep")
    expect(d!.complemento).toBe('APT301 BL-1'); // trim
    expect(d!.logradouro).toBe('AV FRANCISCO DE MELO');
    expect(d!.areaConstruida).toBe(96); // string "96" → número
    expect(d!.areaTerreno).toBe(5517.26);
    expect(d!.tipoEdificacao).toBe(2);
    expect(d!.nrLote).toBe('694');
    expect(d!.idBairro).toBe(587);
    expect(d!.idQuadra).toBe(14660);
    expect(d!.idSetor).toBe(253);
    expect(d!.numeroCadastro).toBeNull();
    expect(d!.raw).toEqual(RAW);
  });

  it('coage números de forma defensiva (string vazia/lixo → null)', async () => {
    mockAxios(() => ({
      ...RAW,
      cep_inicial: 7400000,
      area_construida_privativa___imobiliario: '',
      area_terreno_privativa: 'abc',
    }));
    const d = await buscarDetalhe('goiania', 1, 'x');
    expect(d!.cep).toBe('07400000');
    expect(d!.areaConstruida).toBeNull();
    expect(d!.areaTerreno).toBeNull();
  });

  it('normaliza CEP zerado como null', async () => {
    mockAxios(() => ({ ...RAW, cep_inicial: '00000000' }));
    const d = await buscarDetalhe('goiania', 1, 'x');
    expect(d!.cep).toBeNull();
  });

  it('propaga erro de rede/5xx (lote será reprocessado depois)', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 't' } } as any;
      const e: any = new Error('boom'); e.response = { status: 502 }; throw e;
    });
    await expect(buscarDetalhe('goiania', 1, 'x')).rejects.toThrow();
  });

  it('retorna null em 4xx definitivo (lote sem ficha)', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 't' } } as any;
      const e: any = new Error('nf'); e.response = { status: 404 }; throw e;
    });
    expect(await buscarDetalhe('goiania', 1, 'x')).toBeNull();
  });
});

describe('imoveis.service — busca, bairros e setores', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calcula centroide WKT e rejeita geometrias inválidas', () => {
    expect(wktParaLatLng('POLYGON((-49.3 -16.7,-49.1 -16.7,-49.1 -16.5,-49.3 -16.5))')).toEqual({
      lng: -49.2,
      lat: -16.6,
    });
    expect(wktParaLatLng('POINT(-49 -16)')).toBeNull();
    expect(wktParaLatLng('POLYGON((x y))')).toBeNull();
  });

  it('busca por prefixo e anexa lat/lng quando há geom', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 'token' } } as any;
      return {
        data: [
          {
            inscricao_cartografica: 12345,
            id_lote: 10,
            id_imobiliario: 99,
            geom: 'POLYGON((-49 -16,-48 -16,-48 -15,-49 -15))',
          },
          { inscricao_cartografica: '67890', id_lote: 11, id_imobiliario: 100 },
        ],
      } as any;
    });

    const rows = await buscarPorPrefixo('goiania', '123');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ inscricao_cartografica: '12345', lat: -15.5, lng: -48.5 });
    expect(rows[1]).toMatchObject({ inscricao_cartografica: '67890', lat: null, lng: null });
  });

  it('retorna lista vazia quando busca por prefixo recebe payload não-array', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 'token' } } as any;
      return { data: { ok: true } } as any;
    });

    await expect(buscarPorPrefixo('goiania', '999')).resolves.toEqual([]);
  });

  it('lista cidades configuradas', () => {
    expect(cidadesDisponiveis()).toEqual(expect.arrayContaining(['goiania', 'aparecidadegoiania']));
  });

  it('busca setores no endpoint vivo, removendo vazios e duplicados', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 'token' } } as any;
      return { data: [{ codigo: '2' }, { setor: '1' }, { codigo: '2' }, { codigo: ' ' }] } as any;
    });

    await expect(buscarPrefixosDaCidade('aparecidadegoiania')).resolves.toEqual(['1', '2']);
  });

  it('usa fallback verificado para Goiânia quando endpoint de setores falha', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 'token' } } as any;
      throw new Error('timeout');
    });

    const setores = await buscarPrefixosDaCidade('goiania');

    expect(setores[0]).toBe('101');
    expect(setores).toContain('461');
  });

  it('usa fallback 00..99 para cidade sem lista verificada', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 'token' } } as any;
      return { data: [] } as any;
    });

    const setores = await buscarPrefixosDaCidade('cidade-nova');

    expect(setores).toHaveLength(100);
    expect(setores.slice(0, 3)).toEqual(['00', '01', '02']);
    expect(setores.at(-1)).toBe('99');
  });

  it('mapeia bairros, filtrando itens sem id e normalizando campos', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: any) => {
      if (String(url).includes('/ouv/')) return { data: { authToken: 'token' } } as any;
      return {
        data: [
          {
            id: 7,
            codigo: ' 007 ',
            nome: ' Centro ',
            nome_formatado: '',
            codigo_zona: 3,
            area_terreno: '123,4',
            area_urbanizavel: 'x',
            geom: ' MULTIPOLYGON(...) ',
          },
          { id: 'sem-id', nome: 'Ignorado' },
        ],
      } as any;
    });

    await expect(buscarBairros('goiania')).resolves.toEqual([
      {
        id: 7,
        codigo: '007',
        nome: 'Centro',
        nomeFormatado: null,
        codigoZona: 3,
        areaTerreno: 123.4,
        areaUrbanizavel: null,
        geom: 'MULTIPOLYGON(...)',
      },
    ]);
  });
});
