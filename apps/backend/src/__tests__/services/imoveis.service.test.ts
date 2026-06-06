import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
import axios from 'axios';
import { buscarDetalhe } from '../../services/imoveis.service';

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
    mockAxios(() => ({ ...RAW, area_construida_privativa___imobiliario: '', area_terreno_privativa: 'abc' }));
    const d = await buscarDetalhe('goiania', 1, 'x');
    expect(d!.areaConstruida).toBeNull();
    expect(d!.areaTerreno).toBeNull();
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
