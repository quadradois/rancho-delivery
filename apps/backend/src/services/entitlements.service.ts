import prisma from '../config/database';
import { getTenantId } from '../config/tenantContext';

/**
 * Entitlements — os módulos que a loja tem ATIVOS agora.
 *
 *   ativos = módulos `core` (base/freemium)
 *          ∪ módulos do plano da assinatura
 *          ∪ módulos avulsos (marketplace à la carte)
 *
 * Regras de estado da conta:
 * - CANCELADA → sem acesso (conjunto vazio).
 * - sem assinatura → só os módulos `core` (a loja grátis sempre funciona).
 * - TESTE/ATIVA/INADIMPLENTE → core ∪ plano ∪ avulsos (INADIMPLENTE = período
 *   de graça, ainda com o plano; o downgrade pro grátis é feito pela cobrança,
 *   trocando o plano da assinatura).
 *
 * Sempre ignora módulos inativos no catálogo.
 */
export async function obterModulosAtivos(tenantId: string = getTenantId()): Promise<Set<string>> {
  const ativos = new Set<string>();

  const assinatura = await prisma.assinatura.findUnique({
    where: { tenantId },
    include: {
      plano: { include: { modulos: { include: { modulo: true } } } },
      addons: { include: { modulo: true } },
    },
  });

  // Conta encerrada → sem acesso.
  if (assinatura?.estado === 'CANCELADA') return ativos;

  // Core: sempre disponível (base grátis do freemium).
  const core = await prisma.modulo.findMany({
    where: { core: true, ativo: true },
    select: { chave: true },
  });
  for (const m of core) ativos.add(m.chave);

  if (!assinatura) return ativos; // sem assinatura = só o core (grátis)

  for (const pm of assinatura.plano?.modulos ?? []) {
    if (pm.modulo.ativo) ativos.add(pm.modulo.chave);
  }
  for (const addon of assinatura.addons) {
    if (addon.modulo.ativo) ativos.add(addon.modulo.chave);
  }

  return ativos;
}

/** True se a loja (atual ou informada) tem o módulo `chave` ativo. */
export async function temModulo(chave: string, tenantId?: string): Promise<boolean> {
  const ativos = await obterModulosAtivos(tenantId ?? getTenantId());
  return ativos.has(chave);
}
