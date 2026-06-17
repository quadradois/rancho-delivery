import { EstadoConta } from '@prisma/client';
import prisma from '../config/database';

/**
 * Control plane do FoodFlow — estado da conta de um restaurante: atribuir plano
 * e mudar o EstadoConta (TESTE/ATIVA/INADIMPLENTE/CANCELADA). Roda sob
 * `runSemEscopo` (super-admin). A Assinatura é 1:1 com o tenant (upsert).
 *
 * Cobrança (provedorRef/proximaCobranca/trialAte) e addons avulsos ficam para
 * as fatias de Mercado Pago e marketplace.
 */

export class AssinaturaError extends Error {
  constructor(public code: 'RESTAURANTE_NAO_ENCONTRADO' | 'PLANO_NAO_ENCONTRADO', message: string) {
    super(message);
    this.name = 'AssinaturaError';
  }
}

type AssinaturaComPlano = {
  estado: EstadoConta; planoId: string | null;
  proximaCobranca: Date | null; trialAte: Date | null; atualizadoEm: Date;
  plano: { id: string; nome: string } | null;
};

function serializar(a: AssinaturaComPlano) {
  return {
    estado: a.estado,
    plano: a.plano ? { id: a.plano.id, nome: a.plano.nome } : null,
    proximaCobranca: a.proximaCobranca,
    trialAte: a.trialAte,
    atualizadoEm: a.atualizadoEm,
  };
}

export async function obterAssinatura(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw new AssinaturaError('RESTAURANTE_NAO_ENCONTRADO', 'Restaurante não encontrado');

  const assinatura = await prisma.assinatura.findUnique({
    where: { tenantId },
    include: { plano: { select: { id: true, nome: true } } },
  });
  // Sem assinatura = tier grátis (entitlements dá core-only).
  return assinatura ? serializar(assinatura) : null;
}

export async function definirAssinatura(
  tenantId: string,
  dados: { estado: EstadoConta; planoId: string | null },
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } });
  if (!tenant) throw new AssinaturaError('RESTAURANTE_NAO_ENCONTRADO', 'Restaurante não encontrado');

  if (dados.planoId) {
    const plano = await prisma.plano.findUnique({ where: { id: dados.planoId }, select: { id: true } });
    if (!plano) throw new AssinaturaError('PLANO_NAO_ENCONTRADO', 'Plano não encontrado');
  }

  const assinatura = await prisma.assinatura.upsert({
    where: { tenantId },
    create: { tenantId, planoId: dados.planoId, estado: dados.estado },
    update: { planoId: dados.planoId, estado: dados.estado },
    include: { plano: { select: { id: true, nome: true } } },
  });
  return serializar(assinatura);
}
