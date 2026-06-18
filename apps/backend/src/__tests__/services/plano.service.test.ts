import { describe, it, expect, vi, beforeEach } from 'vitest';

const { modulo, plano } = vi.hoisted(() => ({
  modulo: { findMany: vi.fn() },
  plano: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
}));
vi.mock('../../config/database', () => ({ default: { modulo, plano } }));

import * as service from '../../services/plano.service';
import { PlanoError } from '../../services/plano.service';

function planoRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p1', nome: 'Premium', descricao: null, preco: '99.90', ciclo: 'MENSAL', diasTeste: 0, beneficios: [], destaque: false, publico: true, ativo: true,
    modulos: [{ modulo: { chave: 'aura-prospeccao', nome: 'Prospecção', core: false } }],
    ...over,
  };
}

describe('plano.service — construtor de planos', () => {
  beforeEach(() => vi.clearAllMocks());

  it('listarModulos serializa precoAvulso e flags', async () => {
    modulo.findMany.mockResolvedValue([
      { chave: 'pedidos', nome: 'Pedidos', descricao: null, core: true, ativo: true, precoAvulso: null },
      { chave: 'aura-prospeccao', nome: 'Prospecção', descricao: null, core: false, ativo: true, precoAvulso: '49.90' },
    ]);
    const lista = await service.listarModulos();
    expect(lista[1]).toMatchObject({ chave: 'aura-prospeccao', core: false, precoAvulso: 49.9 });
  });

  it('criarPlano resolve chaves → ids e cria com módulos aninhados', async () => {
    modulo.findMany.mockResolvedValue([{ id: 'm1', chave: 'aura-prospeccao' }]);
    plano.create.mockResolvedValue(planoRow());
    const r = await service.criarPlano({ nome: 'Premium', preco: 99.9, modulos: ['aura-prospeccao'] });
    expect(plano.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ modulos: { create: [{ moduloId: 'm1' }] } }),
    }));
    expect(r).toMatchObject({ nome: 'Premium', preco: 99.9, modulos: [{ chave: 'aura-prospeccao' }] });
  });

  it('listarPlanosPublicos filtra público+ativo e ordena por preço', async () => {
    plano.findMany.mockResolvedValue([planoRow()]);
    await service.listarPlanosPublicos();
    expect(plano.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { publico: true, ativo: true },
      orderBy: { preco: 'asc' },
    }));
  });

  it('criarPlano lança MODULO_INVALIDO quando uma chave não existe', async () => {
    modulo.findMany.mockResolvedValue([{ id: 'm1', chave: 'aura-prospeccao' }]); // só 1 de 2
    await expect(service.criarPlano({ nome: 'X', preco: 0, modulos: ['aura-prospeccao', 'inexistente'] }))
      .rejects.toMatchObject({ code: 'MODULO_INVALIDO' });
    expect(plano.create).not.toHaveBeenCalled();
  });

  it('obterPlano lança NAO_ENCONTRADO', async () => {
    plano.findUnique.mockResolvedValue(null);
    await expect(service.obterPlano('nao')).rejects.toBeInstanceOf(PlanoError);
  });

  it('atualizarPlano substitui o conjunto de módulos (deleteMany + create)', async () => {
    plano.findUnique.mockResolvedValue({ id: 'p1' });
    modulo.findMany.mockResolvedValue([{ id: 'm2', chave: 'aura-campanhas' }]);
    plano.update.mockResolvedValue(planoRow({ modulos: [{ modulo: { chave: 'aura-campanhas', nome: 'Campanhas', core: false } }] }));
    await service.atualizarPlano('p1', { modulos: ['aura-campanhas'] });
    expect(plano.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ modulos: { deleteMany: {}, create: [{ moduloId: 'm2' }] } }),
    }));
  });

  it('atualizarPlano sem modulos NÃO mexe no conjunto de módulos', async () => {
    plano.findUnique.mockResolvedValue({ id: 'p1' });
    plano.update.mockResolvedValue(planoRow());
    await service.atualizarPlano('p1', { preco: 120 });
    const data = plano.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('modulos');
    expect(modulo.findMany).not.toHaveBeenCalled();
  });

  it('atualizarPlano lança NAO_ENCONTRADO quando id inexistente', async () => {
    plano.findUnique.mockResolvedValue(null);
    await expect(service.atualizarPlano('x', { nome: 'Y' })).rejects.toMatchObject({ code: 'NAO_ENCONTRADO' });
  });
});
