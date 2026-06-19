import prisma from '../config/database';
import { runWithTenant, runSemEscopo } from '../config/tenantContext';
import { logger } from '../config/logger';

/**
 * Executa `fn` uma vez por tenant ativo, cada execução fixada no contexto do seu
 * tenant. Usado por jobs/crons que não nascem de um request (não há Host pra
 * resolver o tenant): sem isto rodariam só no tenant padrão.
 *
 * A falha de um tenant é logada e não interrompe os demais.
 */
export async function paraCadaTenantAtivo(fn: () => Promise<void>): Promise<void> {
  const tenants = await runSemEscopo(() =>
    prisma.tenant.findMany({ where: { ativo: true }, select: { id: true } }),
  );
  for (const t of tenants) {
    try {
      await runWithTenant(t.id, fn);
    } catch (err) {
      logger.error('Job multi-tenant: falha ao processar tenant', { tenantId: t.id, err });
    }
  }
}
