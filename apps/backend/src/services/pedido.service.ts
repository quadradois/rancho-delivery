import prisma from '../config/database';
import { logger } from '../config/logger';
import clienteService from './cliente.service';
import bairroService from './bairro.service';
import produtoService from './produto.service';
import { Origem } from '@prisma/client';

interface ItemPedidoInput {
  produtoId: string;
  quantidade: number;
  observacao?: string;
}

interface CriarPedidoInput {
  cliente: {
    telefone: string;
    nome: string;
    endereco: string;
    bairro: string;
  };
  itens: ItemPedidoInput[];
  observacao?: string;
  origem?: Origem;
}

export class PedidoService {
  /**
   * Cria novo pedido
   */
  async criarPedido(dados: CriarPedidoInput) {
    try {
      const { cliente: dadosCliente, itens, observacao, origem = 'SITE' } = dados;

      // 1. Validar bairro e obter taxa
      const validacaoBairro = await bairroService.validarBairro(dadosCliente.bairro);
      
      if (!validacaoBairro.valido) {
        throw new Error('Bairro não atendido');
      }

      const taxaEntrega = validacaoBairro.taxa!;

      // 2. Validar produtos e calcular subtotal
      let subtotal = 0;
      const itensValidados: Array<{
        produtoId: string;
        quantidade: number;
        precoUnit: number;
        subtotal: number;
        observacao?: string;
      }> = [];

      for (const item of itens) {
        const produto = await produtoService.buscarProdutoPorId(item.produtoId);
        
        if (!produto) {
          throw new Error(`Produto não encontrado: ${item.produtoId}`);
        }

        if (!produto.disponivel) {
          throw new Error(`Produto indisponível: ${produto.nome}`);
        }

        const precoUnit = Number(produto.preco);
        const subtotalItem = precoUnit * item.quantidade;
        subtotal += subtotalItem;

        itensValidados.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          precoUnit,
          subtotal: subtotalItem,
          observacao: item.observacao,
        });
      }

      // 3. Calcular total
      const total = subtotal + taxaEntrega;

      // 4. Criar ou atualizar cliente
      const cliente = await clienteService.criarOuAtualizar({
        ...dadosCliente,
        origem,
      });

      // 5. Criar pedido com itens (transação)
      const pedido = await prisma.$transaction(async (tx) => {
        // Criar pedido
        const novoPedido = await tx.pedido.create({
          data: {
            clienteTelefone: cliente.telefone,
            subtotal,
            taxaEntrega,
            total,
            status: 'PENDENTE',
            observacao,
            itens: {
              create: itensValidados,
            },
          },
          include: {
            itens: {
              include: {
                produto: {
                  select: {
                    nome: true,
                    categoria: true,
                  },
                },
              },
            },
            cliente: {
              select: {
                nome: true,
                telefone: true,
                endereco: true,
                bairro: true,
              },
            },
          },
        });

        return novoPedido;
      });

      logger.info(`Pedido criado: ${pedido.id} - Cliente: ${cliente.telefone} - Total: R$ ${total}`);
      
      return pedido;
    } catch (error) {
      logger.error('Erro ao criar pedido:', error);
      throw error;
    }
  }

  /**
   * Busca pedido por ID
   */
  async buscarPedidoPorId(id: string) {
    try {
      const pedido = await prisma.pedido.findUnique({
        where: { id },
        include: {
          itens: {
            include: {
              produto: {
                select: {
                  nome: true,
                  preco: true,
                  categoria: true,
                },
              },
            },
          },
          cliente: {
            select: {
              nome: true,
              telefone: true,
              endereco: true,
              bairro: true,
            },
          },
        },
      });

      if (!pedido) {
        logger.warn(`Pedido não encontrado: ${id}`);
        return null;
      }

      logger.info(`Pedido encontrado: ${id}`);
      return pedido;
    } catch (error) {
      logger.error(`Erro ao buscar pedido ${id}:`, error);
      throw new Error('Erro ao buscar pedido');
    }
  }

  /**
   * Atualiza status do pedido
   */
  async atualizarStatus(id: string, status: string, pagamentoId?: string) {
    try {
      const pedido = await prisma.pedido.update({
        where: { id },
        data: {
          status: status as any,
          pagamentoId,
        },
      });

      logger.info(`Status do pedido ${id} atualizado para: ${status}`);
      return pedido;
    } catch (error) {
      logger.error(`Erro ao atualizar status do pedido ${id}:`, error);
      throw new Error('Erro ao atualizar pedido');
    }
  }

  /**
   * Lista pedidos por cliente
   */
  async listarPedidosPorCliente(telefone: string) {
    try {
      const pedidos = await prisma.pedido.findMany({
        where: {
          clienteTelefone: telefone,
        },
        orderBy: {
          criadoEm: 'desc',
        },
        include: {
          itens: {
            include: {
              produto: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
      });

      return pedidos;
    } catch (error) {
      logger.error(`Erro ao listar pedidos do cliente ${telefone}:`, error);
      throw new Error('Erro ao buscar pedidos');
    }
  }
}

export default new PedidoService();
