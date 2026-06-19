import mineracaoService from '../services/mineracao.service';
import { logger } from '../config/logger';
import { paraCadaTenantAtivo } from './forEachTenant';

const INTERVALO_MS = 60_000; // checa a cada 1 minuto

export function iniciarWorkerCampanhasAgendadas() {
  setInterval(async () => {
    try {
      await paraCadaTenantAtivo(async () => {
        const { disparadas } = await mineracaoService.processarCampanhasAgendadas();
        if (disparadas > 0) {
          logger.info(`campanhas.agendadas.tick disparadas=${disparadas}`);
        }
      });
    } catch (err) {
      logger.error('campanhas.agendadas.tick.erro', err);
    }
  }, INTERVALO_MS);
  logger.info(`Worker de campanhas agendadas iniciado (intervalo: ${INTERVALO_MS / 1000}s)`);
}
