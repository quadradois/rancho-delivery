import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { getTenantId } from '../config/tenantContext';

/**
 * Config da loja do TENANT ATUAL — substitui o antigo singleton
 * `findUnique({ where: { id: 'loja_principal' } })`. Resolve por tenantId
 * do contexto (AsyncLocalStorage).
 */
export function getLojaConfig() {
  return prisma.lojaConfiguracao.findFirst({ where: { tenantId: getTenantId() } });
}

/**
 * Upsert da config do tenant atual (1 config por tenant). Substitui
 * `upsert({ where: { id: 'loja_principal' }, ... })`. Faz find+update/create
 * (não depende de constraint unique, seguro na transição).
 */
export async function upsertLojaConfig(args: {
  create: Prisma.LojaConfiguracaoUncheckedCreateInput;
  update: Prisma.LojaConfiguracaoUncheckedUpdateInput;
}) {
  const tenantId = getTenantId();
  const existente = await prisma.lojaConfiguracao.findFirst({
    where: { tenantId },
    select: { id: true },
  });
  if (existente) {
    return prisma.lojaConfiguracao.update({ where: { id: existente.id }, data: args.update });
  }
  return prisma.lojaConfiguracao.create({ data: { ...args.create, tenantId } });
}
