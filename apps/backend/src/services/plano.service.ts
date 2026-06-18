import { CicloCobranca } from '@prisma/client';
import prisma from '../config/database';

/**
 * Control plane do FoodFlow — construtor de planos (combos de módulos) usados
 * pelo super-admin. Roda sob `runSemEscopo`; Plano/Modulo não são tenant-scoped.
 *
 * Módulos são referenciados por `chave` na API (estável e legível); resolvidos
 * para id internamente.
 */

export class PlanoError extends Error {
  constructor(public code: 'NAO_ENCONTRADO' | 'MODULO_INVALIDO', message: string) {
    super(message);
    this.name = 'PlanoError';
  }
}

type PlanoComModulos = {
  id: string; nome: string; descricao: string | null;
  preco: { toString(): string }; ciclo: CicloCobranca; diasTeste: number; beneficios: string[]; destaque: boolean; ordem: number; publico: boolean; ativo: boolean;
  modulos: { modulo: { chave: string; nome: string; core: boolean } }[];
};

function serializar(p: PlanoComModulos) {
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    preco: Number(p.preco),
    ciclo: p.ciclo,
    diasTeste: p.diasTeste,
    beneficios: p.beneficios,
    destaque: p.destaque,
    ordem: p.ordem,
    publico: p.publico,
    ativo: p.ativo,
    modulos: p.modulos.map((pm) => ({ chave: pm.modulo.chave, nome: pm.modulo.nome, core: pm.modulo.core })),
  };
}

const includeModulos = { modulos: { include: { modulo: true } } } as const;

export async function listarModulos() {
  const modulos = await prisma.modulo.findMany({ orderBy: [{ core: 'desc' }, { nome: 'asc' }] });
  return modulos.map((m) => ({
    chave: m.chave,
    nome: m.nome,
    descricao: m.descricao,
    core: m.core,
    ativo: m.ativo,
    precoAvulso: m.precoAvulso != null ? Number(m.precoAvulso) : null,
  }));
}

/** Resolve chaves de módulo para ids; lança MODULO_INVALIDO se alguma não existir. */
async function resolverModuloIds(chaves: string[]): Promise<string[]> {
  const unicas = [...new Set(chaves)];
  if (unicas.length === 0) return [];
  const modulos = await prisma.modulo.findMany({ where: { chave: { in: unicas } }, select: { id: true, chave: true } });
  if (modulos.length !== unicas.length) {
    const achadas = new Set(modulos.map((m) => m.chave));
    const faltando = unicas.filter((c) => !achadas.has(c));
    throw new PlanoError('MODULO_INVALIDO', `Módulo(s) inexistente(s): ${faltando.join(', ')}`);
  }
  return modulos.map((m) => m.id);
}

export async function listarPlanos() {
  const planos = await prisma.plano.findMany({ orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }], include: includeModulos });
  return planos.map(serializar);
}

/** Planos visíveis no site institucional: apenas público + ativo, do mais barato ao mais caro. */
export async function listarPlanosPublicos() {
  const planos = await prisma.plano.findMany({
    where: { publico: true, ativo: true },
    orderBy: [{ ordem: 'asc' }, { preco: 'asc' }],
    include: includeModulos,
  });
  return planos.map(serializar);
}

export async function obterPlano(id: string) {
  const plano = await prisma.plano.findUnique({ where: { id }, include: includeModulos });
  if (!plano) throw new PlanoError('NAO_ENCONTRADO', 'Plano não encontrado');
  return serializar(plano);
}

export async function criarPlano(dados: {
  nome: string; descricao?: string | null; preco: number; ciclo?: CicloCobranca; diasTeste?: number; beneficios?: string[]; destaque?: boolean; publico?: boolean; ativo?: boolean; modulos?: string[];
}) {
  const moduloIds = await resolverModuloIds(dados.modulos ?? []);
  const agg = await prisma.plano.aggregate({ _max: { ordem: true } });
  const plano = await prisma.plano.create({
    data: {
      nome: dados.nome,
      descricao: dados.descricao ?? null,
      preco: dados.preco,
      ciclo: dados.ciclo,
      diasTeste: dados.diasTeste,
      beneficios: dados.beneficios ?? [],
      destaque: dados.destaque,
      ordem: (agg._max.ordem ?? -1) + 1,
      publico: dados.publico,
      ativo: dados.ativo,
      modulos: { create: moduloIds.map((moduloId) => ({ moduloId })) },
    },
    include: includeModulos,
  });
  return serializar(plano);
}

export async function atualizarPlano(
  id: string,
  dados: { nome?: string; descricao?: string | null; preco?: number; ciclo?: CicloCobranca; diasTeste?: number; beneficios?: string[]; destaque?: boolean; publico?: boolean; ativo?: boolean; modulos?: string[] },
) {
  const existe = await prisma.plano.findUnique({ where: { id }, select: { id: true } });
  if (!existe) throw new PlanoError('NAO_ENCONTRADO', 'Plano não encontrado');

  // `modulos` é opcional: quando enviado, substitui o conjunto inteiro.
  const moduloIds = dados.modulos !== undefined ? await resolverModuloIds(dados.modulos) : undefined;

  const plano = await prisma.plano.update({
    where: { id },
    data: {
      nome: dados.nome,
      descricao: dados.descricao,
      preco: dados.preco,
      ciclo: dados.ciclo,
      diasTeste: dados.diasTeste,
      beneficios: dados.beneficios,
      destaque: dados.destaque,
      publico: dados.publico,
      ativo: dados.ativo,
      ...(moduloIds !== undefined
        ? { modulos: { deleteMany: {}, create: moduloIds.map((moduloId) => ({ moduloId })) } }
        : {}),
    },
    include: includeModulos,
  });
  return serializar(plano);
}

/** Salva a nova ordem dos planos (drag-and-drop): ordem = posição na lista. */
export async function reordenarPlanos(ids: string[]) {
  await prisma.$transaction(ids.map((id, i) => prisma.plano.update({ where: { id }, data: { ordem: i } })));
}
