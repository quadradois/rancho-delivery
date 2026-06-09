import { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import { runWithTenant, TENANT_PADRAO } from '../config/tenantContext';

// Cache host -> tenantId (TTL curto; evita uma query por request).
const cache = new Map<string, { tenantId: string; exp: number }>();
const TTL_MS = 5 * 60 * 1000;

async function resolverTenant(host: string): Promise<string> {
  const agora = Date.now();
  const hit = cache.get(host);
  if (hit && hit.exp > agora) return hit.tenantId;

  // Resolve por domínio próprio (ex: frandelicia.com) ou subdomínio (slug.foodflow.ia.br).
  const sub = host.endsWith('.foodflow.ia.br') ? host.split('.')[0] : null;
  const tenant = await prisma.tenant.findFirst({
    where: {
      ativo: true,
      OR: [{ dominio: host }, ...(sub ? [{ slug: sub }] : [])],
    },
    select: { id: true },
  });

  const tenantId = tenant?.id ?? TENANT_PADRAO;
  cache.set(host, { tenantId, exp: agora + TTL_MS });
  return tenantId;
}

/**
 * Resolve o tenant pelo Host e o fixa no contexto (AsyncLocalStorage) para
 * o restante do request. Em erro de resolução, segue no tenant padrão —
 * nunca derruba o request.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const host = (req.hostname || '').toLowerCase();
    const tenantId = await resolverTenant(host);
    runWithTenant(tenantId, () => next());
  } catch {
    runWithTenant(TENANT_PADRAO, () => next());
  }
}
