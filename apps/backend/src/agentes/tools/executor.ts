import Anthropic from '@anthropic-ai/sdk';
import prisma from '../../config/database';
import { logger } from '../../config/logger';
import bairroService from '../../services/bairro.service';
import taxaEntregaService from '../../services/taxaEntrega.service';
import pedidoService from '../../services/pedido.service';
import { geocodificarReverso } from './geocoder';
import {
  obterSessaoAtiva,
  criarOuObterSessao,
  atualizarItens,
  atualizarEntrega,
  finalizarSessao,
  cancelarSessao,
  ItemSessao,
} from './sessao';

const MAX_ITENS_CARRINHO = 10;

type ToolResult = Record<string, unknown>;

// ─── buscar_cardapio ───────────────────────────────────────────────────────────
async function buscarCardapio(input: { categoria?: string }): Promise<ToolResult> {
  const produtos = await prisma.produto.findMany({
    where: {
      disponivel: true,
      ...(input.categoria ? { categoria: { contains: input.categoria, mode: 'insensitive' } } : {}),
    },
    select: { id: true, nome: true, preco: true, descricao: true, categoria: true },
    orderBy: [{ categoria: 'asc' }, { ordem: 'asc' }],
  });

  return {
    produtos: produtos.map((p) => ({
      id: p.id,
      nome: p.nome,
      preco: Number(p.preco),
      descricao: p.descricao,
      categoria: p.categoria,
    })),
    total: produtos.length,
  };
}

// ─── adicionar_item ───────────────────────────────────────────────────────────
async function adicionarItem(
  telefone: string,
  input: { produtoId: string; quantidade: number; observacao?: string },
): Promise<ToolResult> {
  if (input.quantidade < 1) return { erro: 'Quantidade deve ser pelo menos 1.' };

  const produto = await prisma.produto.findUnique({
    where: { id: input.produtoId },
    select: { id: true, nome: true, preco: true, disponivel: true },
  });

  if (!produto) return { erro: 'Produto não encontrado.' };
  if (!produto.disponivel) return { erro: `${produto.nome} não está disponível no momento.` };

  const sessao = await criarOuObterSessao(telefone);
  const itens = [...sessao.itens];

  const existente = itens.findIndex((i) => i.produtoId === input.produtoId);
  if (existente >= 0) {
    itens[existente].quantidade += input.quantidade;
    if (input.observacao) itens[existente].observacao = input.observacao;
  } else {
    if (itens.length >= MAX_ITENS_CARRINHO) {
      return { erro: `Carrinho cheio (máximo ${MAX_ITENS_CARRINHO} itens diferentes).` };
    }
    itens.push({
      produtoId: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco),
      quantidade: input.quantidade,
      observacao: input.observacao,
    });
  }

  const atualizada = await atualizarItens(sessao.id, itens);
  return { ok: true, carrinho: atualizada.itens, subtotal: atualizada.subtotal };
}

// ─── remover_item ─────────────────────────────────────────────────────────────
async function removerItem(telefone: string, input: { produtoId: string }): Promise<ToolResult> {
  const sessao = await obterSessaoAtiva(telefone);
  if (!sessao || sessao.itens.length === 0) return { erro: 'Carrinho já está vazio.' };

  const itens = sessao.itens.filter((i) => i.produtoId !== input.produtoId);
  const atualizada = await atualizarItens(sessao.id, itens);
  return { ok: true, carrinho: atualizada.itens, subtotal: atualizada.subtotal };
}

// ─── ver_carrinho ─────────────────────────────────────────────────────────────
async function verCarrinho(telefone: string): Promise<ToolResult> {
  const sessao = await obterSessaoAtiva(telefone);
  if (!sessao) return { vazio: true, itens: [], subtotal: 0 };

  const total =
    sessao.taxaEntrega !== null ? sessao.subtotal + sessao.taxaEntrega : null;

  return {
    itens: sessao.itens,
    subtotal: sessao.subtotal,
    taxaEntrega: sessao.taxaEntrega,
    total,
    endereco: sessao.endereco,
    bairro: sessao.bairro,
  };
}

// ─── validar_entrega ──────────────────────────────────────────────────────────
async function validarEntrega(
  telefone: string,
  input: { bairro?: string; cep?: string; lat?: number; lng?: number; endereco?: string },
): Promise<ToolResult> {
  let enderecoFinal = input.endereco;
  let bairroFinal = input.bairro;
  let cepFinal = input.cep;

  // Geocodificação reversa se vier lat/lng
  if (input.lat && input.lng) {
    const geo = await geocodificarReverso(input.lat, input.lng);
    if (geo) {
      enderecoFinal = enderecoFinal || geo.enderecoFormatado;
      bairroFinal = bairroFinal || geo.bairro;
      cepFinal = cepFinal || geo.cep;
    }
  }

  const faixas = await taxaEntregaService.obterFaixas();
  let taxa = 0;
  let atendido = false;

  if (taxaEntregaService.usaFaixasPorDistancia(faixas) && cepFinal) {
    const resultado = await taxaEntregaService.calcularPorCep(cepFinal);
    atendido = resultado.atendido;
    taxa = resultado.taxa;
  } else if (bairroFinal) {
    const resultado = await bairroService.validarBairro(bairroFinal);
    atendido = resultado.valido;
    taxa = resultado.taxa ?? 0;
  } else {
    return { erro: 'Informe o bairro, CEP ou compartilhe sua localização.' };
  }

  if (!atendido) {
    return {
      atendido: false,
      erro: `Infelizmente não entregamos em ${bairroFinal || cepFinal}. Temos entrega apenas nas regiões cadastradas.`,
    };
  }

  // Persiste endereço na sessão
  const sessao = await criarOuObterSessao(telefone);
  await atualizarEntrega(sessao.id, {
    taxa,
    endereco: enderecoFinal,
    bairro: bairroFinal,
    cep: cepFinal,
    lat: input.lat,
    lng: input.lng,
  });

  return { atendido: true, taxa, endereco: enderecoFinal, bairro: bairroFinal, cep: cepFinal };
}

// ─── confirmar_pedido ─────────────────────────────────────────────────────────
async function confirmarPedido(
  telefone: string,
  input: { nome: string; formaPagamento: 'PIX' | 'DINHEIRO'; trocoPara?: number },
): Promise<ToolResult> {
  const sessao = await obterSessaoAtiva(telefone);
  if (!sessao) return { erro: 'Nenhum carrinho ativo. Comece escolhendo os itens.' };
  if (sessao.itens.length === 0) return { erro: 'Carrinho vazio. Adicione itens antes de confirmar.' };
  if (!sessao.endereco && !sessao.bairro) {
    return { erro: 'Informe o endereço de entrega antes de confirmar o pedido.' };
  }
  if (sessao.taxaEntrega === null) {
    return { erro: 'Valide a entrega no seu endereço antes de confirmar.' };
  }

  try {
    const pedido = await pedidoService.criarPedido({
      cliente: {
        telefone,
        nome: input.nome,
        endereco: sessao.endereco || '',
        bairro: sessao.bairro || '',
        cep: sessao.cep || undefined,
      },
      itens: sessao.itens.map((i: ItemSessao) => ({
        produtoId: i.produtoId,
        quantidade: i.quantidade,
        observacao: i.observacao,
      })),
      origem: 'WHATSAPP' as any,
      pagamento: {
        forma: input.formaPagamento as any,
        trocoPara: input.trocoPara,
      },
      tipoAtendimento: 'ENTREGA' as any,
    });

    await finalizarSessao(sessao.id, pedido.id);

    const total = Number((pedido as any).total ?? sessao.subtotal + sessao.taxaEntrega!);
    const linkPagamento = (pedido as any).linkPagamento || null;

    return {
      ok: true,
      pedidoId: pedido.id,
      total,
      linkPagamento,
      mensagem: linkPagamento
        ? `Pedido criado! Total: R$${total.toFixed(2)}. Pague pelo link: ${linkPagamento}`
        : `Pedido criado! Total: R$${total.toFixed(2)}. Pagamento na entrega.`,
    };
  } catch (error: any) {
    logger.error('executor.confirmarPedido erro:', error);
    return { erro: error.message || 'Erro ao criar o pedido. Tente novamente.' };
  }
}

// ─── cancelar_pedido ──────────────────────────────────────────────────────────
async function cancelarPedidoTool(telefone: string): Promise<ToolResult> {
  const sessao = await obterSessaoAtiva(telefone);
  if (!sessao) return { ok: true, mensagem: 'Nenhum pedido em andamento.' };
  await cancelarSessao(sessao.id);
  return { ok: true };
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────
export async function executarToolCall(
  toolUse: Anthropic.ToolUseBlock,
  telefone: string,
): Promise<ToolResult> {
  const input = toolUse.input as Record<string, any>;
  logger.info(`executor.tool name=${toolUse.name} telefone=${telefone}`);

  switch (toolUse.name) {
    case 'buscar_cardapio':
      return buscarCardapio(input);
    case 'adicionar_item':
      return adicionarItem(telefone, input as any);
    case 'remover_item':
      return removerItem(telefone, input as any);
    case 'ver_carrinho':
      return verCarrinho(telefone);
    case 'validar_entrega':
      return validarEntrega(telefone, input);
    case 'confirmar_pedido':
      return confirmarPedido(telefone, input as any);
    case 'cancelar_pedido':
      return cancelarPedidoTool(telefone);
    default:
      return { erro: `Tool desconhecida: ${toolUse.name}` };
  }
}

// Monta o array de tool_result para enviar de volta ao Claude
export function montarToolResults(
  toolUses: Anthropic.ToolUseBlock[],
  results: ToolResult[],
): Anthropic.ToolResultBlockParam[] {
  return toolUses.map((tu, i) => ({
    type: 'tool_result' as const,
    tool_use_id: tu.id,
    content: JSON.stringify(results[i]),
  }));
}
