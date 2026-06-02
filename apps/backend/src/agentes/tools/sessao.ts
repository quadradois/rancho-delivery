import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../../config/database';
import { logger } from '../../config/logger';

export interface ItemSessao {
  produtoId: string;
  nome: string;
  preco: number;
  quantidade: number;
  observacao?: string;
}

export interface SessaoAtiva {
  id: string;
  clienteTelefone: string;
  itens: ItemSessao[];
  subtotal: number;
  taxaEntrega: number | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  lat: number | null;
  lng: number | null;
}

const TTL_MINUTOS = 30;

function calcularSubtotal(itens: ItemSessao[]): number {
  return itens.reduce((acc, i) => acc + i.preco * i.quantidade, 0);
}

export async function obterSessaoAtiva(telefone: string): Promise<SessaoAtiva | null> {
  const limite = new Date(Date.now() - TTL_MINUTOS * 60 * 1000);

  const sessao = await prisma.sessaoPedidoWhatsApp.findFirst({
    where: {
      clienteTelefone: telefone,
      status: 'ATIVA',
      ultimaInteracaoEm: { gte: limite },
    },
    orderBy: { ultimaInteracaoEm: 'desc' },
  });

  if (!sessao) return null;

  return {
    id: sessao.id,
    clienteTelefone: sessao.clienteTelefone,
    itens: (sessao.itens as unknown as ItemSessao[]) || [],
    subtotal: Number(sessao.subtotal),
    taxaEntrega: sessao.taxaEntrega ? Number(sessao.taxaEntrega) : null,
    endereco: sessao.endereco,
    bairro: sessao.bairro,
    cep: sessao.cep,
    lat: sessao.lat,
    lng: sessao.lng,
  };
}

export async function criarOuObterSessao(telefone: string): Promise<SessaoAtiva> {
  const existente = await obterSessaoAtiva(telefone);
  if (existente) return existente;

  const nova = await prisma.sessaoPedidoWhatsApp.create({
    data: {
      clienteTelefone: telefone,
      status: 'ATIVA',
      itens: [],
      subtotal: new Decimal(0),
    },
  });

  logger.info(`sessao.criada id=${nova.id} telefone=${telefone}`);

  return {
    id: nova.id,
    clienteTelefone: telefone,
    itens: [],
    subtotal: 0,
    taxaEntrega: null,
    endereco: null,
    bairro: null,
    cep: null,
    lat: null,
    lng: null,
  };
}

export async function atualizarItens(
  sessaoId: string,
  itens: ItemSessao[],
): Promise<SessaoAtiva> {
  const subtotal = calcularSubtotal(itens);

  const atualizada = await prisma.sessaoPedidoWhatsApp.update({
    where: { id: sessaoId },
    data: {
      itens: itens as any,
      subtotal: new Decimal(subtotal),
    },
  });

  return {
    id: atualizada.id,
    clienteTelefone: atualizada.clienteTelefone,
    itens,
    subtotal,
    taxaEntrega: atualizada.taxaEntrega ? Number(atualizada.taxaEntrega) : null,
    endereco: atualizada.endereco,
    bairro: atualizada.bairro,
    cep: atualizada.cep,
    lat: atualizada.lat,
    lng: atualizada.lng,
  };
}

export async function atualizarEntrega(
  sessaoId: string,
  dados: { taxa: number; endereco?: string; bairro?: string; cep?: string; lat?: number; lng?: number },
): Promise<void> {
  await prisma.sessaoPedidoWhatsApp.update({
    where: { id: sessaoId },
    data: {
      taxaEntrega: new Decimal(dados.taxa),
      endereco: dados.endereco,
      bairro: dados.bairro,
      cep: dados.cep,
      lat: dados.lat,
      lng: dados.lng,
    },
  });
}

export async function finalizarSessao(sessaoId: string, pedidoId: string): Promise<void> {
  await prisma.sessaoPedidoWhatsApp.update({
    where: { id: sessaoId },
    data: { status: 'FINALIZADA', pedidoId, expiradaEm: new Date() },
  });
  logger.info(`sessao.finalizada id=${sessaoId} pedidoId=${pedidoId}`);
}

export async function cancelarSessao(sessaoId: string): Promise<void> {
  await prisma.sessaoPedidoWhatsApp.update({
    where: { id: sessaoId },
    data: { status: 'EXPIRADA', expiradaEm: new Date() },
  });
  logger.info(`sessao.cancelada id=${sessaoId}`);
}

// Job: expira sessões inativas (chamado no bootstrap do servidor)
export async function expirarSessoesInativas(): Promise<void> {
  const limite = new Date(Date.now() - TTL_MINUTOS * 60 * 1000);
  const { count } = await prisma.sessaoPedidoWhatsApp.updateMany({
    where: { status: 'ATIVA', ultimaInteracaoEm: { lt: limite } },
    data: { status: 'EXPIRADA', expiradaEm: new Date() },
  });
  if (count > 0) logger.info(`sessao.expiradas count=${count}`);
}
