import { describe, it, expect } from 'vitest';
import { injectTenant, TENANT_MODELS } from '../../config/tenantGuard';

describe('tenantGuard.injectTenant', () => {
  it('injeta tenantId no where de findMany (model tenant-scoped)', () => {
    const out = injectTenant('Pedido', 'findMany', { where: { status: 'CONFIRMADO' } }, 't1');
    expect(out.where).toEqual({ status: 'CONFIRMADO', tenantId: 't1' });
  });

  it('injeta tenantId mesmo sem where (findMany sem args)', () => {
    const out = injectTenant('Cliente', 'findMany', undefined, 't1');
    expect(out.where).toEqual({ tenantId: 't1' });
  });

  it('filtra count/aggregate/groupBy/updateMany/deleteMany', () => {
    for (const op of ['count', 'aggregate', 'groupBy', 'updateMany', 'deleteMany']) {
      const out = injectTenant('Pedido', op, { where: { a: 1 } }, 't1');
      expect(out.where).toEqual({ a: 1, tenantId: 't1' });
    }
  });

  it('injeta tenantId no data de create', () => {
    const out = injectTenant('Cliente', 'create', { data: { telefone: '9' } }, 't1');
    expect(out.data).toEqual({ telefone: '9', tenantId: 't1' });
  });

  it('injeta tenantId em cada row de createMany', () => {
    const out = injectTenant('Pedido', 'createMany', { data: [{ a: 1 }, { a: 2 }] }, 't1');
    expect(out.data).toEqual([
      { a: 1, tenantId: 't1' },
      { a: 2, tenantId: 't1' },
    ]);
  });

  it('o tenant do contexto sobrescreve um tenantId informado (segurança)', () => {
    const out = injectTenant('Pedido', 'create', { data: { tenantId: 'outro' } }, 't1');
    expect((out.data as Record<string, unknown>).tenantId).toBe('t1');
  });

  it('NÃO toca models de plataforma (sem coluna tenantId)', () => {
    const args = { where: { id: 'x' } };
    expect(injectTenant('ImovelRancho', 'findMany', args, 't1')).toEqual(args);
    expect(injectTenant('AssertivaConsultaCache', 'create', { data: {} }, 't1')).toEqual({ data: {} });
  });

  it('injeta tenantId apenas no ramo create de upsert (where/update intactos)', () => {
    const out = injectTenant(
      'LeadMarketing',
      'upsert',
      { where: { id: 'x' }, create: { telefone: '9' }, update: { nome: 'y' } },
      't1',
    );
    expect((out.create as Record<string, unknown>).tenantId).toBe('t1');
    expect(out.where).toEqual({ id: 'x' });
    expect(out.update).toEqual({ nome: 'y' });
  });

  it('NÃO toca operações por chave única (findUnique/update/delete) — cobertas pela RLS na F1b', () => {
    const a1 = { where: { id: 'x' } };
    expect(injectTenant('Pedido', 'findUnique', a1, 't1')).toEqual(a1);
    const a2 = { where: { id: 'x' }, data: { status: 'Y' } };
    expect(injectTenant('Pedido', 'update', a2, 't1')).toEqual(a2);
    const a3 = { where: { id: 'x' } };
    expect(injectTenant('Pedido', 'delete', a3, 't1')).toEqual(a3);
  });

  it('TENANT_MODELS reflete o schema (Cliente/Pedido sim; Tenant/ImovelRancho não)', () => {
    expect(TENANT_MODELS.has('Cliente')).toBe(true);
    expect(TENANT_MODELS.has('Pedido')).toBe(true);
    expect(TENANT_MODELS.has('ItemPedido')).toBe(true);
    expect(TENANT_MODELS.has('Tenant')).toBe(false);
    expect(TENANT_MODELS.has('ImovelRancho')).toBe(false);
    expect(TENANT_MODELS.has('AssertivaConsultaCache')).toBe(false);
  });
});
