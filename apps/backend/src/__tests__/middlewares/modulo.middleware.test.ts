import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/entitlements.service', () => ({ temModulo: vi.fn() }));

import { exigirModulo } from '../../middlewares/modulo.middleware';
import { temModulo } from '../../services/entitlements.service';

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('exigirModulo middleware (gating)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('libera (next) quando a loja tem o módulo', async () => {
    (temModulo as any).mockResolvedValue(true);
    const next = vi.fn();
    const res = mockRes();
    await exigirModulo('aura-prospeccao')({} as any, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('responde 403 quando a loja NÃO tem o módulo', async () => {
    (temModulo as any).mockResolvedValue(false);
    const next = vi.fn();
    const res = mockRes();
    await exigirModulo('aura-prospeccao')({} as any, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'MODULO_INDISPONIVEL', modulo: 'aura-prospeccao' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('fail-open (next) em erro de verificação', async () => {
    (temModulo as any).mockRejectedValue(new Error('db down'));
    const next = vi.fn();
    const res = mockRes();
    await exigirModulo('aura-prospeccao')({} as any, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});
