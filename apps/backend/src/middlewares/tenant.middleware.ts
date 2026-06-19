import { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import { runWithTenant } from '../config/tenantContext';

// Cache host -> tenantId (TTL curto; evita uma query por request).
// tenantId null = host conhecidamente sem tenant (também cacheado).
const cache = new Map<string, { tenantId: string | null; exp: number }>();
const TTL_MS = 5 * 60 * 1000;

async function resolverTenant(host: string): Promise<string | null> {
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

  const tenantId = tenant?.id ?? null;
  cache.set(host, { tenantId, exp: agora + TTL_MS });
  return tenantId;
}

/**
 * Resolve o tenant pelo Host e o fixa no contexto (AsyncLocalStorage) para o
 * restante do request. **Sem fallback pro Rancho**: se o host não resolve,
 * segue SEM contexto de tenant — rotas de tenant falham em `getTenantId()`,
 * enquanto super-admin (`runSemEscopo`) e login (query raw) seguem normalmente.
 */
export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const host = (req.hostname || '').toLowerCase();
    const tenantId = await resolverTenant(host);
    if (tenantId) {
      runWithTenant(tenantId, () => next());
    } else {
      next();
    }
  } catch {
    next();
  }
}
