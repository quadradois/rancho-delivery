import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId: string;
  /** Quando true, o tenantGuard NÃO escopa as queries (uso EXCLUSIVO do super-admin). */
  semEscopo?: boolean;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * Tenant placeholder usado APENAS pelo modo super-admin (`runSemEscopo`), onde
 * o tenantGuard é ignorado e o valor não escopa nada. Não é mais um fallback
 * implícito: fora de um contexto explícito, `getTenantId()` lança.
 */
export const TENANT_PADRAO = 'rancho';

/** Executa `fn` com o tenant fixado no contexto (propaga por toda a cadeia async). */
export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run({ tenantId }, fn);
}

/**
 * tenantId do contexto atual. **Sem fallback pro Rancho**: se não há tenant
 * fixado (request com host não resolvido, job/script fora de `runWithTenant`,
 * webhook sem tenant resolvido), lança — para nenhuma operação assumir o Rancho
 * silenciosamente. Jobs usam `paraCadaTenantAtivo`; webhooks resolvem pelo
 * payload; super-admin usa `runSemEscopo`.
 */
export function getTenantId(): string {
  const tenantId = storage.getStore()?.tenantId;
  if (!tenantId) {
    throw new Error('Tenant não resolvido no contexto (sem fallback pro tenant padrão).');
  }
  return tenantId;
}

/**
 * Executa `fn` SEM escopo de tenant — o tenantGuard deixa as queries passarem
 * cross-tenant. **Uso exclusivo do super-admin** (control plane FoodFlow), que
 * precisa enxergar/gerir todos os restaurantes. NUNCA usar em rota de tenant.
 */
export function runSemEscopo<T>(fn: () => T): T {
  return storage.run({ tenantId: TENANT_PADRAO, semEscopo: true }, fn);
}

/** True se o contexto atual está em modo super-admin (sem escopo de tenant). */
export function semEscopoAtivo(): boolean {
  return storage.getStore()?.semEscopo === true;
}
