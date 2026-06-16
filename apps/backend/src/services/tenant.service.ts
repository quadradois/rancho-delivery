import prisma from '../config/database';
import { getTenantId } from '../config/tenantContext';

export interface MarcaPublica {
  slug: string;
  nome: string;
  logoUrl: string | null;
  tema: unknown | null;
}

/**
 * Marca pública do tenant atual (resolvido por host no tenant.middleware) —
 * alimenta o white-label do front: nome, logo e tema da loja.
 *
 * `Tenant` não é tenant-scoped (não tem coluna tenantId), então o tenantGuard
 * passa direto; consulta segura por id do contexto.
 */
export async function obterMarcaPublica(): Promise<MarcaPublica | null> {
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: getTenantId() },
    select: { slug: true, nome: true, logoUrl: true, tema: true },
  });
  if (!tenant) return null;
  return {
    slug: tenant.slug,
    nome: tenant.nome,
    logoUrl: tenant.logoUrl ?? null,
    tema: tenant.tema ?? null,
  };
}
