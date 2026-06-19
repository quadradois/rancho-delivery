/**
 * F0.1 — o middleware de tenant resolve pelo Host e NÃO cai mais no Rancho.
 *  - host conhecido → fixa o tenant resolvido.
 *  - host desconhecido → segue SEM contexto (getTenantId lança downstream),
 *    nunca assume o Rancho.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { tenantMiddleware } from '../../middlewares/tenant.middleware';
import { getTenantId } from '../../config/tenantContext';
import prisma from '../../config/database';

const tenant = (prisma as any).tenant;

function makeReq(host: string): Request {
  return { hostname: host } as any;
}

describe('tenantMiddleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fixa o tenant quando o host resolve', async () => {
    tenant.findFirst.mockResolvedValue({ id: 'frandelicia-buriti' });
    let visto: string | undefined;

    await tenantMiddleware(makeReq('frandelicia-buriti.foodflow.ia.br'), {} as Response, () => {
      visto = getTenantId();
    });

    expect(visto).toBe('frandelicia-buriti');
  });

  it('host desconhecido segue sem contexto (getTenantId lança, não cai no Rancho)', async () => {
    tenant.findFirst.mockResolvedValue(null);
    let lancou = false;

    await tenantMiddleware(makeReq('host-desconhecido.example.com'), {} as Response, () => {
      try {
        getTenantId();
      } catch {
        lancou = true;
      }
    });

    expect(lancou).toBe(true);
  });
});
