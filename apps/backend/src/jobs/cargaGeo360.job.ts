import prisma from '../config/database';
import { buscarPorPrefixo, buscarDetalhe, cidadesDisponiveis, buscarPrefixosDaCidade } from '../services/geo360.service';
import { logger } from '../config/logger';

const CONCORRENCIA_SEARCH = 1;   // prefixos em paralelo (resposta grande, manter 1)
const CONCORRENCIA_DETALHE = 15; // chamadas de detalhe em paralelo
const DELAY_SEARCH_MS = 300;     // pausa entre prefixos
const DELAY_DETALHE_MS = 80;     // pausa entre lotes de detalhe

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Salva registros com lat/lng + id_lote no banco (fase 1)
async function salvarFase1(
  cidade: string,
  itens: Array<{ inscricaoCartografica: string; idLote: number; lat: number | null; lng: number | null }>,
): Promise<void> {
  if (itens.length === 0) return;

  const LOTE = 200;
  for (let i = 0; i < itens.length; i += LOTE) {
    const fatia = itens.slice(i, i + LOTE);
    await (prisma as any).$transaction(
      fatia.map((item) =>
        (prisma as any).imovelGeo360.upsert({
          where: {
            cidade_inscricaoCartografica: {
              cidade,
              inscricaoCartografica: item.inscricaoCartografica,
            },
          },
          update: {
            idLote: item.idLote,
            latitude: item.lat,
            longitude: item.lng,
          },
          create: {
            cidade,
            inscricaoCartografica: item.inscricaoCartografica,
            idLote: item.idLote,
            latitude: item.lat,
            longitude: item.lng,
          },
        }),
      ),
    );
  }
}

// Enriquece um lote de registros com CPF, nome, endereço (fase 2)
async function enriquecerLote(
  cidade: string,
  lote: Array<{ inscricao: string; idLote: number }>,
): Promise<number> {
  const resultados = await Promise.all(
    lote.map(({ idLote, inscricao }) => buscarDetalhe(cidade, idLote, inscricao)),
  );

  const validos = resultados.filter(Boolean) as Awaited<ReturnType<typeof buscarDetalhe>>[];
  if (validos.length === 0) return 0;

  const LOTE = 100;
  for (let i = 0; i < validos.length; i += LOTE) {
    const fatia = validos.slice(i, i + LOTE);
    await (prisma as any).$transaction(
      fatia.map((d) =>
        (prisma as any).imovelGeo360.update({
          where: {
            cidade_inscricaoCartografica: {
              cidade,
              inscricaoCartografica: d!.inscricaoCartografica,
            },
          },
          data: {
            numeroCadastro: d!.numeroCadastro,
            cpfCnpj: d!.cpfCnpj,
            nomePessoa: d!.nomePessoa,
            tipoPessoa: d!.tipoPessoa,
            endereco: d!.endereco,
            bairro: d!.bairro,
            cep: d!.cep,
            sincronizadoEm: new Date(),
          },
        }),
      ),
    );
  }

  return validos.length;
}

export async function executarCargaGeo360(
  cidades?: string[],
  onProgresso?: (cidade: string, fase: 'search' | 'detalhe', processados: number, total: number) => void,
): Promise<Record<string, { fase1: number; fase2: number }>> {
  const listaCidades = cidades ?? cidadesDisponiveis();
  const resultado: Record<string, { fase1: number; fase2: number }> = {};

  for (const cidade of listaCidades) {
    logger.info(`Geo360 carga iniciada: '${cidade}'`);
    let totalFase1 = 0;

    const prefixos = await buscarPrefixosDaCidade(cidade);

    // ─── FASE 1: Scan de todos os prefixos, salva inscricao + id_lote + lat/lng ──
    logger.info(`Geo360 [${cidade}] Fase 1: scan de ${prefixos.length} prefixos`);

    for (let pi = 0; pi < prefixos.length; pi += CONCORRENCIA_SEARCH) {
      const lote = prefixos.slice(pi, pi + CONCORRENCIA_SEARCH);

      await Promise.all(
        lote.map(async (prefixo) => {
          try {
            const imoveis = await buscarPorPrefixo(cidade, prefixo);
            if (imoveis.length === 0) return;

            const paraFase1 = imoveis.map((im) => ({
              inscricaoCartografica: im.inscricao_cartografica,
              idLote: im.id_imobiliario,  // endpoint usa id_imobiliario, não id_lote
              lat: im.lat,
              lng: im.lng,
            }));

            await salvarFase1(cidade, paraFase1);
            totalFase1 += imoveis.length;

            onProgresso?.(cidade, 'search', totalFase1, -1);
            logger.info(`Geo360 [${cidade}] prefixo '${prefixo}': ${imoveis.length} imóveis (total: ${totalFase1})`);
          } catch (err: any) {
            const msg = err?.message || err?.response?.status || err?.code || JSON.stringify(err);
            logger.warn(`Geo360 [${cidade}] prefixo '${prefixo}' erro: ${msg} | stack: ${err?.stack?.split('\n')[0]}`);
          }
        }),
      );

      await sleep(DELAY_SEARCH_MS);
    }

    // Conta únicos salvos no banco
    const totalUnicos = await (prisma as any).imovelGeo360.count({ where: { cidade } });
    logger.info(`Geo360 [${cidade}] Fase 1 concluída: ${totalUnicos} registros únicos no banco`);

    // ─── FASE 2: Enriquecimento lendo do banco (sem duplicatas) ─────────────────
    const totalFase2 = await executarEnriquecimentoIncremental(cidade, undefined, (processados, total) => {
      onProgresso?.(cidade, 'detalhe', processados, total);
    });

    logger.info(`Geo360 [${cidade}] Fase 2 concluída: ${totalFase2} registros enriquecidos com CPF`);

    resultado[cidade] = { fase1: totalUnicos, fase2: totalFase2 };
  }

  return resultado;
}

// Enriquecimento incremental: lê do banco registros sem CPF e enriquece via id_lote
export async function executarEnriquecimentoIncremental(
  cidade: string,
  limite?: number,
  onProgresso?: (processados: number, total: number) => void,
): Promise<number> {
  const pendentes: Array<{ inscricaoCartografica: string; idLote: number }> =
    await (prisma as any).imovelGeo360.findMany({
      where: { cidade, cpfCnpj: null, idLote: { not: null } },
      select: { inscricaoCartografica: true, idLote: true },
      ...(limite ? { take: limite } : {}),
    });

  if (pendentes.length === 0) {
    logger.info(`Geo360 incremental [${cidade}]: nenhum registro pendente`);
    return 0;
  }

  logger.info(`Geo360 incremental [${cidade}]: ${pendentes.length} registros sem CPF`);

  let processados = 0;
  for (let i = 0; i < pendentes.length; i += CONCORRENCIA_DETALHE) {
    const lote = pendentes.slice(i, i + CONCORRENCIA_DETALHE);
    const salvos = await enriquecerLote(cidade, lote.map((p) => ({ inscricao: p.inscricaoCartografica, idLote: p.idLote })));
    processados += salvos;
    onProgresso?.(processados, pendentes.length);
    logger.info(`Geo360 incremental [${cidade}]: ${processados}/${pendentes.length}`);
    await sleep(DELAY_DETALHE_MS);
  }

  return processados;
}
