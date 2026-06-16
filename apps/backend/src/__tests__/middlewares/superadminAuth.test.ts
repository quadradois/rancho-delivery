import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  autenticarSuperAdmin,
  criarAdminToken,
} from '../../middlewares/adminAuth.middleware';
import { semEscopoAtivo } from '../../config/tenantContext';

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function reqComToken(token?: string) {
  return { headers: token ? { authorization: `Bearer ${token}` } : {} } as any;
}

describe('autenticarSuperAdmin middleware', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responde 403 sem token', () => {
    const res = mockRes();
    const next = vi.fn();
    autenticarSuperAdmin(reqComToken(), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('responde 403 com token de admin comum (não super-admin)', () => {
    const res = mockRes();
    const next = vi.fn();
    autenticarSuperAdmin(reqComToken(criarAdminToken('admin', 'admin')), res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('libera (next) com token de super-admin e ativa o bypass de tenant', () => {
    const res = mockRes();
    let bypassDuranteNext = false;
    const next = vi.fn(() => {
      bypassDuranteNext = semEscopoAtivo();
    });
    autenticarSuperAdmin(reqComToken(criarAdminToken('dono', 'superadmin')), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(bypassDuranteNext).toBe(true);
  });
});
