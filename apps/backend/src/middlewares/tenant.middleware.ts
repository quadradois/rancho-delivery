import { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import { runWithTenant, runSemEscopo } from '../config/tenantContext';

// Cache host -> tenantId (TTL curto; evita uma query por request).
// tenantId null = host conhecidamente sem tenant (também cacheado).
const cache = new Map<string, { tenantId: string | null; exp: number }>();
const TTL_MS = 5 * 60 * 1000;

async function resolverTenant(host: string): Promise<string | null> {
  const agora = Date.now();
  const hit = cache.get(host);
  if (hit && hit.exp > agora) return hit.tenantId;

  // Resolve por domínio próprio (ex: frandelicia.com) ou subdomínio (slug.foodflow.ia.br).
  // runSemEscopo: esta é a própria query que RESOLVE o tenant — ainda não há
  // contexto, e o tenantGuard chamaria getTenantId() (que agora lança). O bypass
  // deixa a consulta passar (Tenant não é tenant-scoped de qualquer forma).
  const sub = host.endsWith('.foodflow.ia.br') ? host.split('.')[0] : null;
  // Callback async com await DENTRO do runSemEscopo: a query Prisma é lazy e
  // executaria o guard fora do contexto se só retornássemos a promise.
  const tenant = await runSemEscopo(async () => {
    return await prisma.tenant.findFirst({
      where: {
        ativo: true,
        OR: [{ dominio: host }, ...(sub ? [{ slug: sub }] : [])],
      },
      select: { id: true },
    });
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
