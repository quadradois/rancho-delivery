import prisma from '../config/database';
import type { Prisma } from '@prisma/client';

/**
 * Control plane do FoodFlow — gestão de restaurantes (tenants) pelo super-admin.
 * Roda sempre sob `runSemEscopo` (ver autenticarSuperAdmin), então o tenantGuard
 * deixa as queries enxergarem/alterarem qualquer tenant.
 */

/** Erro de regra de negócio com código — o controller mapeia para HTTP. */
export class RestauranteError extends Error {
  constructor(public code: 'SLUG_EM_USO' | 'DOMINIO_EM_USO' | 'NAO_ENCONTRADO', message: string) {
    super(message);
    this.name = 'RestauranteError';
  }
}

function serializar(t: {
  id: string; slug: string; nome: string; dominio: string | null;
  logoUrl: string | null; tema: Prisma.JsonValue | null; ativo: boolean;
  criadoEm: Date;
  assinatura?: { estado: string; proximaCobranca: Date | null; plano: { nome: string } | null } | null;
}) {
  return {
    id: t.id,
    slug: t.slug,
    nome: t.nome,
    dominio: t.dominio,
    logoUrl: t.logoUrl,
    tema: t.tema,
    ativo: t.ativo,
    criadoEm: t.criadoEm,
    assinatura: t.assinatura
      ? { estado: t.assinatura.estado, plano: t.assinatura.plano?.nome ?? null, proximaCobranca: t.assinatura.proximaCobranca }
      : null,
  };
}

export async function listarRestaurantes() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { criadoEm: 'asc' },
    include: { assinatura: { include: { plano: true } } },
  });
  return tenants.map(serializar);
}

export async function obterRestaurante(id: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: { assinatura: { include: { plano: true } } },
  });
  if (!tenant) throw new RestauranteError('NAO_ENCONTRADO', 'Restaurante não encontrado');
  return serializar(tenant);
}

export async function criarRestaurante(dados: { slug: string; nome: string; dominio?: string | null }) {
  if (await prisma.tenant.findUnique({ where: { slug: dados.slug } })) {
    throw new RestauranteError('SLUG_EM_USO', `O slug '${dados.slug}' já está em uso`);
  }
  if (dados.dominio && (await prisma.tenant.findUnique({ where: { dominio: dados.dominio } }))) {
    throw new RestauranteError('DOMINIO_EM_USO', `O domínio '${dados.dominio}' já está em uso`);
  }
  const tenant = await prisma.tenant.create({
    data: { slug: dados.slug, nome: dados.nome, dominio: dados.dominio ?? null },
    include: { assinatura: { include: { plano: true } } },
  });
  return serializar(tenant);
}

export async function atualizarRestaurante(
  id: string,
  dados: { nome?: string; slug?: string; dominio?: string | null; ativo?: boolean },
) {
  const atual = await prisma.tenant.findUnique({ where: { id } });
  if (!atual) throw new RestauranteError('NAO_ENCONTRADO', 'Restaurante não encontrado');

  if (dados.slug && dados.slug !== atual.slug) {
    if (await prisma.tenant.findUnique({ where: { slug: dados.slug } })) {
      throw new RestauranteError('SLUG_EM_USO', `O slug '${dados.slug}' já está em uso`);
    }
  }
  if (dados.dominio && dados.dominio !== atual.dominio) {
    if (await prisma.tenant.findUnique({ where: { dominio: dados.dominio } })) {
      throw new RestauranteError('DOMINIO_EM_USO', `O domínio '${dados.dominio}' já está em uso`);
    }
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data: {
      nome: dados.nome,
      slug: dados.slug,
      dominio: dados.dominio,
      ativo: dados.ativo,
    },
    include: { assinatura: { include: { plano: true } } },
  });
  return serializar(tenant);
}
