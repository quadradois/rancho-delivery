import axios from 'axios';
import { logger } from '../config/logger';

const BASE_AUTH = 'https://plataforma.geo360.com.br';
const BASE_CADASTRO = 'https://cadastro.geo360.com.br';

const CIDADES: Record<string, { slug: string; email: string }> = {
  goiania: {
    slug: 'goiania',
    // Goiânia usa SSO próprio — usa token da plataforma via Aparecida como fallback
    email: 'leitor_aparecidadegoiania@vm2info.com',
  },
  aparecidadegoiania: {
    slug: 'aparecidadegoiania',
    email: 'leitor_aparecidadegoiania@vm2info.com',
  },
};

// Token único da plataforma Geo360 (compartilhado entre cidades)
let plataformaToken: { token: string; expiracao: number } | null = null;

async function obterToken(cidade: string): Promise<string> {
  if (plataformaToken && plataformaToken.expiracao > Date.now()) {
    return plataformaToken.token;
  }

  const cfg = CIDADES[cidade] ?? CIDADES['aparecidadegoiania'];

  const resp = await axios.get(`${BASE_AUTH}/ouv/`, {
    params: { q: cfg.email },
    headers: { 'no-token': 'true' },
    timeout: 10000,
  });

  const token: string = resp.data.authToken;
  // Token dura ~1h; renova a cada 50min
  plataformaToken = { token, expiracao: Date.now() + 50 * 60 * 1000 };
  return token;
}

export interface ImovelGeo360Raw {
  inscricao_cartografica: string;
  id_lote: number;
  id_imobiliario: number;
  // geom em WKT POLYGON — presente no search, ausente no detalhe
  geom?: string;
}

export interface ImovelGeo360Detalhe {
  inscricaoCartografica: string;
  numeroCadastro: number | null;
  cpfCnpj: string | null;
  nomePessoa: string | null;
  tipoPessoa: number | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
}

// Converte WKT POLYGON para centróide — APENAS para dados do search
export function wktParaLatLng(geom: string): { lat: number; lng: number } | null {
  if (!geom || !geom.startsWith('POLYGON')) return null;
  try {
    const coords = geom
      .replace(/POLYGON\s*\(\(/, '')
      .replace(/\)\).*/, '')
      .split(',')
      .map((p) => p.trim().split(/\s+/).map(Number))
      .filter((c) => c.length === 2 && !isNaN(c[0]) && !isNaN(c[1]));
    if (coords.length === 0) return null;
    const lng = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const lat = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return { lat, lng };
  } catch {
    return null;
  }
}

function formatarCep(cep: number | string | null): string | null {
  if (!cep) return null;
  const s = String(cep).replace(/\D/g, '').padStart(8, '0').slice(0, 8);
  return s === '00000000' ? null : s;
}

// Fase 1 — busca em massa por prefixo, retorna inscrição + id_lote + lat/lng (do WKT)
export async function buscarPorPrefixo(
  cidade: string,
  prefixo: string,
): Promise<Array<ImovelGeo360Raw & { lat: number | null; lng: number | null }>> {
  const token = await obterToken(cidade);
  const slug = CIDADES[cidade]?.slug ?? cidade;

  const resp = await axios.get(`${BASE_CADASTRO}/search/${slug}/imobiliario`, {
    params: { inscricao_cartografica: prefixo },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 45000,
  });

  const lista: ImovelGeo360Raw[] = Array.isArray(resp.data) ? resp.data : [];

  return lista.map((item) => {
    const coords = item.geom ? wktParaLatLng(item.geom) : null;
    return {
      ...item,
      inscricao_cartografica: String(item.inscricao_cartografica),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    };
  });
}

// Fase 2 — enriquece um registro com CPF, nome, endereço (sem geom — já foi extraído)
export async function buscarDetalhe(
  cidade: string,
  idLote: number,
  inscricao: string,
): Promise<ImovelGeo360Detalhe | null> {
  const token = await obterToken(cidade);
  const slug = CIDADES[cidade]?.slug ?? cidade;

  try {
    const resp = await axios.get(
      `${BASE_CADASTRO}/${slug}/lote/busca_imoveis_all/${idLote}/`,
      { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 },
    );

    const d = Array.isArray(resp.data) ? resp.data[0] : resp.data;
    if (!d || typeof d !== 'object') return null;

    return {
      inscricaoCartografica: inscricao,
      numeroCadastro: typeof d.numero_cadastro___imobiliario === 'number' ? d.numero_cadastro___imobiliario : null,
      cpfCnpj: d.cpf_cnpj ? String(d.cpf_cnpj) : null,
      nomePessoa: d.nome___pessoa ?? null,
      tipoPessoa: typeof d.tipo___pessoa === 'number' ? d.tipo___pessoa : null,
      endereco: d.endereco_completo ?? null,
      bairro: d.nome_bairro ?? d['nome___bairro'] ?? null,
      cep: formatarCep(d.cep),
    };
  } catch (err: any) {
    logger.warn(`Geo360 detalhe lote ${idLote} (${inscricao}): ${err.message}`);
    return null;
  }
}

export function cidadesDisponiveis(): string[] {
  return Object.keys(CIDADES);
}

// Lista verificada por varredura real (2026-05-15) — API de setor omite ~39 setores
const SETORES_VERIFICADOS: Record<string, string[]> = {
  goiania: [
    '101','102','103','104','105','106','107','108','109','110','111','112','113','114','115',
    '116','117','118','119','120','121','122','123','124','125','127','128','129','130','131',
    '132','133','135','136','137','138','139','140','141','142','143','144','201','202','203',
    '204','205','206','207','208','209','210','211','212','213','214','216','217','218','220',
    '221','222','223','224','225','229','232','234','235','236','237','238','242','243','244',
    '245','247','301','302','303','304','305','306','307','308','309','310','311','312','313',
    '314','315','316','317','318','319','320','321','322','323','324','325','326','327','328',
    '329','330','331','332','333','334','335','336','337','338','339','340','341','343','344',
    '345','346','347','348','349','350','351','353','354','356','357','358','359','360','361',
    '362','363','364','365','366','367','368','369','370','371','372','373','374','375','376',
    '377','378','379','380','381','382','383','401','402','403','404','405','406','407','408',
    '409','410','411','412','413','414','415','416','417','418','419','420','421','422','423',
    '424','425','426','427','429','430','431','432','433','435','436','437','439','440','442',
    '443','444','445','446','447','448','449','452','453','454','455','456','457','458','459',
    '460','461','462','463','464','465','466','467','468','469','470','471','472','473','474',
    '475','476',
  ],
};

// Busca os setores cadastrais da cidade via API e retorna os códigos como prefixos
export async function buscarPrefixosDaCidade(cidade: string): Promise<string[]> {
  // Usa lista verificada quando disponível (API de setor é incompleta para Goiânia)
  if (SETORES_VERIFICADOS[cidade]) {
    logger.info(`Geo360 setores [${cidade}]: ${SETORES_VERIFICADOS[cidade].length} setores (lista verificada)`);
    return SETORES_VERIFICADOS[cidade];
  }

  try {
    const token = await obterToken(cidade);
    const slug = CIDADES[cidade]?.slug ?? cidade;
    const resp = await axios.get(`${BASE_CADASTRO}/${slug}/setor`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    const lista: any[] = Array.isArray(resp.data) ? resp.data : [];
    // Aparecida usa campo 'codigo', Goiânia usa campo 'setor'
    const codigos = lista
      .map((s) => String(s.codigo ?? s.setor ?? '').trim())
      .filter((c) => c.length > 0);
    const unicos = [...new Set(codigos)].sort();
    logger.info(`Geo360 setores [${cidade}]: ${unicos.length} setores encontrados`);
    return unicos;
  } catch (err: any) {
    logger.warn(`Geo360 setores [${cidade}] erro: ${err.message} — usando fallback`);
    return ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  }
}

export default {
  obterToken,
  buscarPorPrefixo,
  buscarDetalhe,
  buscarPrefixosDaCidade,
  cidadesDisponiveis,
  wktParaLatLng,
};
