import prisma from '../config/database';
import { buscarPorPrefixo, buscarDetalhe, buscarBairros, cidadesDisponiveis, buscarPrefixosDaCidade, VERSAO_ENRIQUECIMENTO_ATUAL } from '../services/imoveis.service';
import { logger } from '../config/logger';

const CONCORRENCIA_DETALHE = 15; // chamadas de detalhe em paralelo
const DELAY_SEARCH_MS = 300;     // pausa entre prefixos
const DELAY_DETALHE_MS = 80;     // pausa entre lotes de detalhe
const PROFUNDIDADE_MAX_PREFIXO = 8; // limite de descida na árvore de prefixos (guarda anti-loop)

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
        (prisma as any).imovelRancho.upsert({
          where: {
            // Chave natural = id_imobiliario (id_lote). Em BC várias unidades compartilham
            // a mesma inscrição, então a inscrição não é única — cada id_imobiliario é 1 linha.
            cidade_idLote: { cidade, idLote: item.idLote },
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

// Enriquece um lote de registros com CPF, nome, endereço e características (fase 2)
// Usa allSettled: falha de REDE em um item não derruba o lote inteiro, e o item NÃO é marcado
// como enriquecido (volta ao pool no próximo ciclo). Itens sem ficha (null) são marcados como
// processados (versão atual) para não serem revisitados eternamente.
async function enriquecerLote(
  cidade: string,
  lote: Array<{ inscricao: string; idLote: number }>,
): Promise<number> {
  const settled = await Promise.allSettled(
    lote.map(({ idLote, inscricao }) => buscarDetalhe(cidade, idLote, inscricao)),
  );

  const updates: Array<{ idLote: number; data: Record<string, unknown> }> = [];
  let comDados = 0;

  settled.forEach((res, i) => {
    const idLote = lote[i].idLote;
    if (res.status === 'rejected') return; // erro de rede → não marca, revisita depois

    const d = res.value;
    if (d) {
      comDados++;
      updates.push({
        idLote,
        data: {
          numeroCadastro: d.numeroCadastro,
          cpfCnpj: d.cpfCnpj,
          nomePessoa: d.nomePessoa,
          tipoPessoa: d.tipoPessoa,
          endereco: d.endereco,
          bairro: d.bairro,
          cep: d.cep,
          complemento: d.complemento,
          logradouro: d.logradouro,
          areaConstruida: d.areaConstruida,
          areaTerreno: d.areaTerreno,
          tipoEdificacao: d.tipoEdificacao,
          nrLote: d.nrLote,
          idBairro: d.idBairro,
          idQuadra: d.idQuadra,
          idSetor: d.idSetor,
          raw: d.raw as any,
          detalheEm: new Date(),
          versaoEnriquecimento: VERSAO_ENRIQUECIMENTO_ATUAL,
          sincronizadoEm: new Date(),
        },
      });
    } else {
      // 200 vazio / 4xx definitivo: sem ficha — marca como processado p/ não revisitar sempre
      updates.push({
        idLote,
        data: { detalheEm: new Date(), versaoEnriquecimento: VERSAO_ENRIQUECIMENTO_ATUAL },
      });
    }
  });

  if (updates.length === 0) return 0;

  const LOTE = 100;
  for (let i = 0; i < updates.length; i += LOTE) {
    const fatia = updates.slice(i, i + LOTE);
    await (prisma as any).$transaction(
      fatia.map((u) =>
        (prisma as any).imovelRancho.update({
          where: {
            cidade_idLote: { cidade, idLote: u.idLote },
          },
          data: u.data,
        }),
      ),
    );
  }

  return comDados;
}

// Sincroniza o dicionário de bairros (referência + geometria) na tabela bairros_rancho
export async function sincronizarBairros(cidade: string): Promise<number> {
  const bairros = await buscarBairros(cidade);
  if (bairros.length === 0) {
    logger.warn(`Imóveis bairros [${cidade}]: nenhum bairro retornado`);
    return 0;
  }

  const LOTE = 200;
  for (let i = 0; i < bairros.length; i += LOTE) {
    const fatia = bairros.slice(i, i + LOTE);
    await (prisma as any).$transaction(
      fatia.map((b) =>
        (prisma as any).bairroRancho.upsert({
          where: { cidade_idBairro: { cidade, idBairro: b.id } },
          update: {
            codigo: b.codigo, nome: b.nome, nomeFormatado: b.nomeFormatado,
            codigoZona: b.codigoZona, areaTerreno: b.areaTerreno,
            areaUrbanizavel: b.areaUrbanizavel, geom: b.geom,
          },
          create: {
            cidade, idBairro: b.id, codigo: b.codigo, nome: b.nome,
            nomeFormatado: b.nomeFormatado, codigoZona: b.codigoZona,
            areaTerreno: b.areaTerreno, areaUrbanizavel: b.areaUrbanizavel, geom: b.geom,
          },
        }),
      ),
    );
  }

  logger.info(`Imóveis bairros [${cidade}]: ${bairros.length} bairros sincronizados`);
  return bairros.length;
}

export async function executarCargaImoveis(
  cidades?: string[],
  onProgresso?: (cidade: string, fase: 'search' | 'detalhe', processados: number, total: number) => void,
): Promise<Record<string, { fase1: number; fase2: number }>> {
  const listaCidades = cidades ?? cidadesDisponiveis();
  const resultado: Record<string, { fase1: number; fase2: number }> = {};

  for (const cidade of listaCidades) {
    logger.info(`Imóveis carga iniciada: '${cidade}'`);
    let totalFase1 = 0;

    // Atualiza o dicionário de bairros (referência) — não bloqueia a carga se falhar
    try {
      await sincronizarBairros(cidade);
    } catch (err: any) {
      logger.warn(`Imóveis bairros [${cidade}] falhou: ${err?.message} — seguindo carga`);
    }

    const seed = await buscarPrefixosDaCidade(cidade);

    // ─── FASE 1: varredura adaptativa em árvore de prefixos ──────────────────────
    // Começa pelos setores-seed; se um prefixo falhar (timeout/“amplo demais”), desce
    // em 10 filhos. Prefixos que falham até a profundidade máxima viram LACUNAS (logadas).
    logger.info(`Imóveis [${cidade}] Fase 1: varredura adaptativa a partir de ${seed.length} prefixos-seed`);

    const fila: string[] = [...seed];
    const lacunas: string[] = [];

    while (fila.length > 0) {
      const prefixo = fila.shift()!;
      try {
        const imoveis = await buscarPorPrefixo(cidade, prefixo);

        if (imoveis.length > 0) {
          const paraFase1 = imoveis.map((im) => ({
            inscricaoCartografica: im.inscricao_cartografica,
            idLote: im.id_imobiliario,  // endpoint usa id_imobiliario, não id_lote
            lat: im.lat,
            lng: im.lng,
          }));

          await salvarFase1(cidade, paraFase1);
          totalFase1 += imoveis.length;

          onProgresso?.(cidade, 'search', totalFase1, -1);
          logger.info(`Imóveis [${cidade}] prefixo '${prefixo}': ${imoveis.length} imóveis (total: ${totalFase1}, fila: ${fila.length})`);
        }
      } catch (err: any) {
        const msg = err?.message || err?.response?.status || err?.code || JSON.stringify(err);
        // “amplo demais” / timeout / erro → desce 1 nível (10 filhos), se ainda couber
        if (prefixo.length < PROFUNDIDADE_MAX_PREFIXO) {
          for (let d = 0; d < 10; d++) fila.push(prefixo + String(d));
          logger.warn(`Imóveis [${cidade}] prefixo '${prefixo}' falhou (${msg}) → descendo em 10 filhos`);
        } else {
          lacunas.push(prefixo);
          logger.error(`Imóveis [${cidade}] prefixo '${prefixo}' falhou no nível máximo (${msg}) — LACUNA`);
        }
      }

      await sleep(DELAY_SEARCH_MS);
    }

    // Conta únicos salvos no banco + relatório de completude
    const totalUnicos = await (prisma as any).imovelRancho.count({ where: { cidade } });
    if (lacunas.length > 0) {
      logger.error(`Imóveis [${cidade}] Fase 1 concluída com ${lacunas.length} LACUNAS (cobertura incompleta): ${lacunas.join(', ')}`);
    }
    logger.info(`Imóveis [${cidade}] Fase 1 concluída: ${totalUnicos} registros únicos no banco | lacunas: ${lacunas.length}`);

    // ─── FASE 2: Enriquecimento lendo do banco (sem duplicatas) ─────────────────
    const totalFase2 = await executarEnriquecimentoIncremental(cidade, undefined, (processados, total) => {
      onProgresso?.(cidade, 'detalhe', processados, total);
    });

    logger.info(`Imóveis [${cidade}] Fase 2 concluída: ${totalFase2} registros enriquecidos com CPF`);

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
  // Bug B corrigido: reprocessa por VERSÃO de enriquecimento (não só "sem CPF").
  // Assim os 761k que já tinham CPF mas não bairro (versão 0 = legado) são finalmente revisitados.
  const pendentes: Array<{ inscricaoCartografica: string; idLote: number }> =
    await (prisma as any).imovelRancho.findMany({
      where: {
        cidade,
        idLote: { not: null },
        versaoEnriquecimento: { lt: VERSAO_ENRIQUECIMENTO_ATUAL },
      },
      select: { inscricaoCartografica: true, idLote: true },
      ...(limite ? { take: limite } : {}),
    });

  if (pendentes.length === 0) {
    logger.info(`Imóveis incremental [${cidade}]: nenhum registro pendente`);
    return 0;
  }

  logger.info(`Imóveis incremental [${cidade}]: ${pendentes.length} registros a (re)enriquecer (versão < ${VERSAO_ENRIQUECIMENTO_ATUAL})`);

  let processados = 0;
  for (let i = 0; i < pendentes.length; i += CONCORRENCIA_DETALHE) {
    const lote = pendentes.slice(i, i + CONCORRENCIA_DETALHE);
    const salvos = await enriquecerLote(cidade, lote.map((p) => ({ inscricao: p.inscricaoCartografica, idLote: p.idLote })));
    processados += salvos;
    onProgresso?.(processados, pendentes.length);
    logger.info(`Imóveis incremental [${cidade}]: ${processados}/${pendentes.length}`);
    await sleep(DELAY_DETALHE_MS);
  }

  return processados;
}
