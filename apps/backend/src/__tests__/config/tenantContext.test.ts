import { describe, it, expect } from 'vitest';
import {
  runWithTenant,
  runSemEscopo,
  getTenantId,
  semEscopoAtivo,
  TENANT_PADRAO,
} from '../../config/tenantContext';

describe('tenantContext — bypass do super-admin', () => {
  it('fora de qualquer contexto, semEscopoAtivo é false', () => {
    expect(semEscopoAtivo()).toBe(false);
  });

  it('runWithTenant NÃO ativa o bypass', () => {
    runWithTenant('outro-tenant', () => {
      expect(getTenantId()).toBe('outro-tenant');
      expect(semEscopoAtivo()).toBe(false);
    });
  });

  it('runSemEscopo ativa o bypass dentro do callback', () => {
    runSemEscopo(() => {
      expect(semEscopoAtivo()).toBe(true);
      expect(getTenantId()).toBe(TENANT_PADRAO);
    });
  });

  it('o bypass não vaza para fora do callback', () => {
    runSemEscopo(() => {
      expect(semEscopoAtivo()).toBe(true);
    });
    expect(semEscopoAtivo()).toBe(false);
  });
});
