import prisma from '../config/database';
import { logger } from '../config/logger';
import clienteService from './cliente.service';
import bairroService from './bairro.service';
import produtoService from './produto.service';
import infinitePayService from './infinitepay.service';
import { Origem, StatusPedido } from '@prisma/client';

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
  private getCheckoutTtlMinutes() {
    const ttl = Number(process.env.CHECKOUT_TTL_MINUTES || 20);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 20;
  }

  private getAbandonoMinutes() {
    const abandono = Number(process.env.ABANDONO_MINUTES || 30);
    return Number.isFinite(abandono) && abandono > 0 ? abandono : 30;
  }

  /**
   * Lista pedidos para o painel admin
   */
  async listarPedidos(filtros?: { status?: string; page?: number; limit?: number }) {
    try {
      const page = Math.max(1, filtros?.page || 1);
      const limit = Math.min(100, Math.max(1, filtros?.limit || 50));
      const skip = (page - 1) * limit;

      const where: any = {};
      if (filtros?.status && filtros.status !== 'todos') {
        where.status = filtros.status.toUpperCase();
      }

      const pedidos = await prisma.pedido.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip,
        take: limit,
        include: {
          cliente: {
            select: {
              nome: true,
              telefone: true,
              endereco: true,
              bairro: true,
            },
          },
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

      const total = await prisma.pedido.count({ where });

      const data = pedidos.map((pedido) => ({
        id: pedido.id,
        numero: pedido.id.slice(-6).toUpperCase(),
        clienteNome: pedido.cliente?.nome || 'Cliente',
        clienteTelefone: pedido.cliente?.telefone || '',
        clienteEmail: '',
        formaPagamento: 'pix',
        trocoParaValor: undefined,
        itens: pedido.itens.map((item) => ({
          id: item.id,
          produtoId: item.produtoId,
          produto: {
            nome: item.produto?.nome || 'Produto',
          },
          quantidade: item.quantidade,
          precoUnit: Number(item.precoUnit),
          precoUnitario: Number(item.precoUnit),
          subtotal: Number(item.subtotal),
          observacao: item.observacao || undefined,
          observacoes: item.observacao || undefined,
        })),
        subtotal: Number(pedido.subtotal),
        taxaEntrega: Number(pedido.taxaEntrega),
        total: Number(pedido.total),
        status: pedido.status.toLowerCase(),
        observacao: pedido.observacao || undefined,
        observacoes: pedido.observacao || undefined,
        pagamentoId: pedido.pagamentoId || undefined,
        pagamentoExpiraEm: pedido.pagamentoExpiraEm?.toISOString() || undefined,
        abandonadoEm: pedido.abandonadoEm?.toISOString() || undefined,
        recuperadoEm: pedido.recuperadoEm?.toISOString() || undefined,
        tentativasRecuperacao: pedido.tentativasRecuperacao,
        linkPagamento: undefined,
        endereco: {
          rua: pedido.cliente?.endereco || '',
          numero: '',
          complemento: undefined,
          bairro: pedido.cliente?.bairro || '',
          cep: '',
          pontoReferencia: undefined,
        },
        tempoEstimadoMin: 30,
        createdAt: pedido.criadoEm.toISOString(),
        criadoEm: pedido.criadoEm.toISOString(),
        atualizadoEm: pedido.atualizadoEm.toISOString(),
      }));

      return { data, pagination: { page, limit, total } };
    } catch (error) {
      logger.error('Erro ao listar pedidos:', error);
      throw new Error('Erro ao buscar pedidos');
    }
  }

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
      const pagamentoExpiraEm = new Date(Date.now() + this.getCheckoutTtlMinutes() * 60 * 1000);
      const pedido = await prisma.pedido.create({
        data: {
          clienteTelefone: cliente.telefone,
          subtotal,
          taxaEntrega,
          total,
          status: StatusPedido.AGUARDANDO_PAGAMENTO,
          pagamentoExpiraEm,
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

      // 6. Criar link de pagamento no InfinitePay
      try {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${baseUrl}/pedido/${pedido.id}`;
        const webhookUrl = process.env.INFINITEPAY_WEBHOOK_URL || `${baseUrl}/webhook/infinitepay`;
        const telefoneNumeros = pedido.cliente?.telefone?.replace(/\D/g, '') || '';
        const telefoneFormatado = telefoneNumeros ? `+55${telefoneNumeros}` : undefined;
        const customer = {
          name: pedido.cliente?.nome || undefined,
          phone_number: telefoneFormatado,
        };
        const address = {
          street: pedido.cliente?.endereco || undefined,
          neighborhood: pedido.cliente?.bairro || undefined,
        };

        // Montar itens para InfinitePay (preço em centavos)
        const itensInfinitePay = pedido.itens.map((item) => ({
          quantity: item.quantidade,
          price: infinitePayService.reaisParaCentavos(Number(item.precoUnit)),
          description: item.produto?.nome || `Produto ${item.produtoId}`,
        }));

        // Adicionar taxa de entrega como item se > 0
        if (taxaEntrega > 0) {
          itensInfinitePay.push({
            quantity: 1,
            price: infinitePayService.reaisParaCentavos(taxaEntrega),
            description: 'Taxa de entrega',
          });
        }

        const linkPagamento = await infinitePayService.criarLinkPagamento({
          itens: itensInfinitePay,
          order_nsu: pedido.id,
          redirect_url: redirectUrl,
          webhook_url: webhookUrl,
          customer,
          address,
        });

        // Atualizar pedido com ID do pagamento
        await prisma.pedido.update({
          where: { id: pedido.id },
          data: { pagamentoId: linkPagamento.id || pedido.id },
        });

        logger.info(`Link InfinitePay criado para pedido ${pedido.id}: ${linkPagamento.url}`);

        return {
          ...pedido,
          pagamentoId: linkPagamento.id,
          linkPagamento: linkPagamento.url,
        };
      } catch (error) {
        logger.error('Erro ao criar link InfinitePay:', error);
        // Pedido já foi criado — retorna sem link de pagamento
        return pedido;
      }
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
      const pedidoAtual = await prisma.pedido.findUnique({
        where: { id },
        select: { status: true },
      });

      const eraAbandonadoOuExpirado =
        pedidoAtual?.status === StatusPedido.ABANDONADO || pedidoAtual?.status === StatusPedido.EXPIRADO;
      const virouConfirmado = status === StatusPedido.CONFIRMADO;

      const pedido = await prisma.pedido.update({
        where: { id },
        data: {
          status: status as StatusPedido,
          pagamentoId,
          ...(virouConfirmado && { recuperadoEm: eraAbandonadoOuExpirado ? new Date() : null }),
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

  async processarExpiracoesEAbandonos() {
    try {
      const agora = new Date();
      const abandonoMinutes = this.getAbandonoMinutes();
      const limiteAbandono = new Date(agora.getTime() - abandonoMinutes * 60 * 1000);

      const expirados = await prisma.pedido.updateMany({
        where: {
          status: StatusPedido.AGUARDANDO_PAGAMENTO,
          pagamentoExpiraEm: { not: null, lte: agora },
        },
        data: { status: StatusPedido.EXPIRADO },
      });

      const abandonados = await prisma.pedido.updateMany({
        where: {
          status: StatusPedido.EXPIRADO,
          pagamentoExpiraEm: { not: null, lte: limiteAbandono },
          abandonadoEm: null,
        },
        data: {
          status: StatusPedido.ABANDONADO,
          abandonadoEm: agora,
        },
      });

      if (expirados.count > 0 || abandonados.count > 0) {
        logger.info('Rotina de abandono executada', {
          expirados: expirados.count,
          abandonados: abandonados.count,
        });
      }

      return { expirados: expirados.count, abandonados: abandonados.count };
    } catch (error) {
      logger.error('Erro na rotina de abandono:', error);
      throw error;
    }
  }

  async obterMetricasAbandono(dias = 7) {
    const diasValidos = Math.max(1, Math.min(90, Number(dias) || 7));
    const inicio = new Date(Date.now() - diasValidos * 24 * 60 * 60 * 1000);

    const [
      checkoutsIniciados,
      pagamentosConfirmados,
      checkoutsExpirados,
      abandonados,
      recuperados,
      valorAbandonado,
    ] = await Promise.all([
      prisma.pedido.count({ where: { criadoEm: { gte: inicio } } }),
      prisma.pedido.count({ where: { criadoEm: { gte: inicio }, status: StatusPedido.CONFIRMADO } }),
      prisma.pedido.count({ where: { criadoEm: { gte: inicio }, status: StatusPedido.EXPIRADO } }),
      prisma.pedido.count({ where: { abandonadoEm: { gte: inicio } } }),
      prisma.pedido.count({ where: { recuperadoEm: { gte: inicio } } }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: { abandonadoEm: { gte: inicio } },
      }),
    ]);

    const taxaAbandono = checkoutsIniciados > 0
      ? Number(((abandonados / checkoutsIniciados) * 100).toFixed(2))
      : 0;
    const taxaRecuperacao = abandonados > 0
      ? Number(((recuperados / abandonados) * 100).toFixed(2))
      : 0;

    return {
      periodoDias: diasValidos,
      checkoutsIniciados,
      pagamentosConfirmados,
      checkoutsExpirados,
      abandonados,
      recuperados,
      taxaAbandono,
      taxaRecuperacao,
      valorPerdidoEstimado: Number(valorAbandonado._sum?.total || 0),
      parametros: {
        checkoutTtlMinutes: this.getCheckoutTtlMinutes(),
        abandonoMinutes: this.getAbandonoMinutes(),
        retryLinkLimit: Number(process.env.RETRY_LINK_LIMIT || 2),
        recoveryEnabled: (process.env.RECOVERY_ENABLED || 'false').toLowerCase() === 'true',
      },
    };
  }
}

export default new PedidoService();
