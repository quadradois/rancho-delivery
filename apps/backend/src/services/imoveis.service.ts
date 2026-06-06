import axios from 'axios';
import { logger } from '../config/logger';
import {
  FONTE_AUTH_URL as BASE_AUTH,
  FONTE_CADASTRO_URL as BASE_CADASTRO,
  FONTE_CIDADES as CIDADES,
} from '../config/fonteCadastro';

// Versão do esquema de enriquecimento. Registros com versão < atual são reprocessados.
//  0 = legado (pré-bairro)  |  2 = captura completa (bairro + complemento/logradouro/áreas/tipo/ids)
export const VERSAO_ENRIQUECIMENTO_ATUAL = 2;

// Token único da plataforma Imóveis (compartilhado entre cidades)
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

export interface ImovelRaw {
  inscricao_cartografica: string;
  id_lote: number;
  id_imobiliario: number;
  // geom em WKT POLYGON — presente no search, ausente no detalhe
  geom?: string;
}

export interface ImovelDetalhe {
  inscricaoCartografica: string;
  numeroCadastro: number | null;
  cpfCnpj: string | null;
  nomePessoa: string | null;
  tipoPessoa: number | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  // Campos ricos (antes descartados)
  complemento: string | null;
  logradouro: string | null;
  areaConstruida: number | null;
  areaTerreno: number | null;
  tipoEdificacao: number | null;
  nrLote: string | null;
  idBairro: number | null;
  idQuadra: number | null;
  idSetor: number | null;
  raw: unknown; // payload bruto do Detalhe (para reprocessamento futuro)
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

// A API às vezes manda número como string ("96") — converte defensivamente, descarta lixo
function paraNumero(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function limparTexto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

// Fase 1 — busca em massa por prefixo, retorna inscrição + id_lote + lat/lng (do WKT)
export async function buscarPorPrefixo(
  cidade: string,
  prefixo: string,
): Promise<Array<ImovelRaw & { lat: number | null; lng: number | null }>> {
  const token = await obterToken(cidade);
  const slug = CIDADES[cidade]?.slug ?? cidade;

  const resp = await axios.get(`${BASE_CADASTRO}/search/${slug}/imobiliario`, {
    params: { inscricao_cartografica: prefixo },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 45000,
  });

  const lista: ImovelRaw[] = Array.isArray(resp.data) ? resp.data : [];

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

// Fase 2 — enriquece um registro com CPF, nome, endereço e características (sem geom — já foi extraído)
// Importante p/ idempotência: erros de REDE/timeout/5xx/429 PROPAGAM (o lote será revisitado);
// só retorna null quando a resposta é válida mas sem ficha (200 vazio) ou 4xx definitivo.
export async function buscarDetalhe(
  cidade: string,
  idLote: number,
  inscricao: string,
): Promise<ImovelDetalhe | null> {
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
      bairro: d['nome___bairro'] ?? null,
      cep: formatarCep(d.cep_inicial), // a API expõe o CEP em cep_inicial (não em "cep")
      complemento: limparTexto(d.complemento),
      logradouro: limparTexto(d.nome___logradouro),
      areaConstruida: paraNumero(d.area_construida_privativa___imobiliario),
      areaTerreno: paraNumero(d.area_terreno_privativa),
      tipoEdificacao: Number.isInteger(d.tipo_edificacao) ? d.tipo_edificacao : null,
      nrLote: limparTexto(d.nr_lote),
      idBairro: Number.isInteger(d.id_bairro) ? d.id_bairro : null,
      idQuadra: Number.isInteger(d.id_quadra) ? d.id_quadra : null,
      idSetor: Number.isInteger(d.id_setor) ? d.id_setor : null,
      raw: d,
    };
  } catch (err: any) {
    const status = err?.response?.status;
    // 4xx definitivo (exceto 429) = lote sem ficha → null (não revisitar para sempre)
    if (status && status >= 400 && status < 500 && status !== 429) {
      logger.warn(`Imóveis detalhe lote ${idLote} (${inscricao}): HTTP ${status} sem ficha`);
      return null;
    }
    // rede/timeout/5xx/429 → propaga para o lote ser reprocessado depois
    throw err;
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

// Busca os setores cadastrais da cidade via API e retorna os códigos como prefixos de SEED.
// IMPORTANTE: o endpoint exige BARRA FINAL ('/setor/') — sem ela responde 301 e parece "vazio".
// Esse era o motivo da lista manual no passado. Ordem: endpoint vivo → lista verificada → 00..99.
export async function buscarPrefixosDaCidade(cidade: string): Promise<string[]> {
  try {
    const token = await obterToken(cidade);
    const slug = CIDADES[cidade]?.slug ?? cidade;
    const resp = await axios.get(`${BASE_CADASTRO}/${slug}/setor/`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });
    const lista: any[] = Array.isArray(resp.data) ? resp.data : [];
    // Aparecida usa campo 'codigo', Goiânia usa campo 'setor'
    const codigos = lista
      .map((s) => String(s.codigo ?? s.setor ?? '').trim())
      .filter((c) => c.length > 0);
    const unicos = [...new Set(codigos)].sort();
    if (unicos.length > 0) {
      logger.info(`Imóveis setores [${cidade}]: ${unicos.length} setores (endpoint /setor/ vivo)`);
      return unicos;
    }
  } catch (err: any) {
    logger.warn(`Imóveis setores [${cidade}] /setor/ erro: ${err.message} — caindo p/ fallback`);
  }

  // Fallback 1: lista verificada manualmente (Goiânia)
  if (SETORES_VERIFICADOS[cidade]) {
    logger.info(`Imóveis setores [${cidade}]: ${SETORES_VERIFICADOS[cidade].length} setores (lista verificada/fallback)`);
    return SETORES_VERIFICADOS[cidade];
  }

  // Fallback 2: raiz da árvore de prefixos (2 dígitos) — a varredura adaptativa desce a partir daqui
  logger.warn(`Imóveis setores [${cidade}]: usando varredura 00..99 (sem lista de setores)`);
  return Array.from({ length: 100 }, (_, i) => String(i).padStart(2, '0'));
}

export interface BairroRaw {
  id: number;
  codigo: string | null;
  nome: string | null;
  nomeFormatado: string | null;
  codigoZona: number | null;
  areaTerreno: number | null;
  areaUrbanizavel: number | null;
  geom: string | null;
}

// Dicionário de bairros (endpoint público /{cidade}/bairro/ — exige BARRA FINAL)
export async function buscarBairros(cidade: string): Promise<BairroRaw[]> {
  const token = await obterToken(cidade);
  const slug = CIDADES[cidade]?.slug ?? cidade;
  const resp = await axios.get(`${BASE_CADASTRO}/${slug}/bairro/`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30000,
  });
  const lista: any[] = Array.isArray(resp.data) ? resp.data : [];
  return lista
    .filter((b) => Number.isInteger(b.id))
    .map((b) => ({
      id: b.id,
      codigo: limparTexto(b.codigo),
      nome: limparTexto(b.nome),
      nomeFormatado: limparTexto(b.nome_formatado),
      codigoZona: Number.isInteger(b.codigo_zona) ? b.codigo_zona : null,
      areaTerreno: paraNumero(b.area_terreno),
      areaUrbanizavel: paraNumero(b.area_urbanizavel),
      geom: limparTexto(b.geom),
    }));
}

export default {
  obterToken,
  buscarPorPrefixo,
  buscarDetalhe,
  buscarBairros,
  buscarPrefixosDaCidade,
  cidadesDisponiveis,
  wktParaLatLng,
};
