import { AsyncLocalStorage } from 'node:async_hooks';

interface TenantStore {
  tenantId: string;
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
