import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId: string;
  /** Quando true, o tenantGuard NÃO escopa as queries (uso EXCLUSIVO do super-admin). */
  semEscopo?: boolean;
}

const storage = new AsyncLocalStorage<TenantStore>();

/**
 * Tenant padrão — fallback quando a resolução por host não casa
 * (jobs, scripts, CLI, ou host desconhecido). Hoje a plataforma nasceu
 * single-tenant; este é o tenant do Rancho.
 */
export const TENANT_PADRAO = 'rancho';

/** Executa `fn` com o tenant fixado no contexto (propaga por toda a cadeia async). */
export function runWithTenant<T>(tenantId: string, fn: () => T): T {
  return storage.run({ tenantId }, fn);
}

/** tenantId do contexto atual; cai no padrão se não houver (jobs/scripts). */
export function getTenantId(): string {
  return storage.getStore()?.tenantId ?? TENANT_PADRAO;
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
