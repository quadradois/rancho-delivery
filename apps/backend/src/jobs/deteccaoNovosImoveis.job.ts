import cron from 'node-cron';
import { randomUUID } from 'crypto';
import prisma from '../config/database';
import mineracaoService from '../services/mineracao.service';
import { enfileirar } from '../services/mineracao.queue';
import { logger } from '../config/logger';

async function executarDeteccao() {
  logger.info('[Job] Iniciando detecção de novos imóveis...');

  const resultado = await prisma.imovelPrefeitura.aggregate({
    _max: { objectId: true },
  });
  const ultimoObjectId = resultado._max.objectId ?? 0;

  const sync = await mineracaoService.sincronizarImoveisPrefeitura({
    limite: 500,
    lote: 100,
    objectIdMinimo: ultimoObjectId,
  });

  if (sync.salvos === 0) {
    logger.info('[Job] Nenhum imóvel novo detectado esta semana.');
    return;
  }

  logger.info(`[Job] ${sync.salvos} novos imóveis detectados — enfileirando mineração`);

  const novosCondomínios = await prisma.imovelPrefeitura.findMany({
    where: { objectId: { gt: ultimoObjectId }, nmedificio: { not: null } },
    select: { nmedificio: true, nmbairro: true },
    distinct: ['nmedificio'],
    take: 50,
  });

  for (const imovel of novosCondomínios) {
    if (!imovel.nmedificio) continue;
    const runId = randomUUID();
    enfileirar(runId, () =>
      mineracaoService.executarMineracao(
        { modo: 'condominio', termo: imovel.nmedificio!, criadoPor: 'JOB_AUTOMATICO' },
        runId,
      ),
    );
    logger.info(`[Job] Mineração enfileirada: ${imovel.nmedificio}`);
  }
}

export function iniciarDeteccaoNovosImoveis() {
  // Toda segunda-feira às 03:00 BRT
  cron.schedule('0 6 * * 1', async () => {
    try {
      await executarDeteccao();
    } catch (error) {
      logger.error('[Job] Erro na detecção de novos imóveis:', error);
    }
  }, { timezone: 'America/Sao_Paulo' });

  logger.info('[Job] Detecção de novos imóveis agendada — toda segunda 03:00 BRT');
}
