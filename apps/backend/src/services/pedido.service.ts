import prisma from '../config/database';
import { logger } from '../config/logger';
import clienteService from './cliente.service';
import bairroService from './bairro.service';
import produtoService from './produto.service';
import infinitePayService from './infinitepay.service';
import evolutionService from './evolution.service';
import { Origem, StatusLoja, StatusPedido } from '@prisma/client';

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
    cep?: string;
  };
  itens: ItemPedidoInput[];
  observacao?: string;
  origem?: Origem;
}

export class PedidoService {
  private transicoesPermitidas: Record<StatusPedido, StatusPedido[]> = {
    PENDENTE: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
    AGUARDANDO_PAGAMENTO: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO, StatusPedido.EXPIRADO],
    CONFIRMADO: [StatusPedido.PREPARANDO, StatusPedido.CANCELADO],
    PREPARANDO: [StatusPedido.SAIU_ENTREGA, StatusPedido.CANCELADO],
    SAIU_ENTREGA: [StatusPedido.ENTREGUE, StatusPedido.CANCELADO],
    ENTREGUE: [],
    EXPIRADO: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO, StatusPedido.ABANDONADO],
    ABANDONADO: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
    CANCELADO: [],
  };

  private resolverStatusPagamento(status: StatusPedido) {
    switch (status) {
      case StatusPedido.EXPIRADO:
      case StatusPedido.ABANDONADO:
      case StatusPedido.CANCELADO:
        return 'EXPIRADO';
      case StatusPedido.CONFIRMADO:
      case StatusPedido.PREPARANDO:
      case StatusPedido.SAIU_ENTREGA:
      case StatusPedido.ENTREGUE:
        return 'CONFIRMADO';
      default:
        return 'PENDENTE';
    }
  }

  private prioridadeStatus(status: StatusPedido) {
    const ordem: Record<StatusPedido, number> = {
      AGUARDANDO_PAGAMENTO: 0,
      PENDENTE: 1,
      CONFIRMADO: 2,
      PREPARANDO: 3,
      SAIU_ENTREGA: 4,
      ENTREGUE: 5,
      EXPIRADO: 6,
      ABANDONADO: 7,
      CANCELADO: 8,
    };
    return ordem[status] ?? 99;
  }

  private getCheckoutTtlMinutes() {
    const ttl = Number(process.env.CHECKOUT_TTL_MINUTES || 20);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 20;
  }

  private getAbandonoMinutes() {
    const abandono = Number(process.env.ABANDONO_MINUTES || 30);
    return Number.isFinite(abandono) && abandono > 0 ? abandono : 30;
  }

  private async registrarTimeline(pedidoId: string, ator: 'SISTEMA' | 'OPERADOR' | 'CLIENTE' | 'IA', acao: string) {
    try {
      await prisma.pedidoTimeline.create({
        data: {
          pedidoId,
          ator,
          acao,
        },
      });
    } catch (error) {
      logger.error('Erro ao registrar timeline do pedido:', { pedidoId, acao, error });
    }
  }

  private montarTimeline(
    pedido: {
      criadoEm: Date;
      atualizadoEm: Date;
      status: StatusPedido;
      canceladoMotivo?: string | null;
      estornoNecessario?: boolean | null;
      estornoRealizadoEm?: Date | null;
      timeline?: Array<{ criadoEm: Date; ator: string; acao: string }>;
    }
  ) {
    const registros = pedido.timeline?.map((item) => ({
      timestamp: item.criadoEm.toISOString(),
      ator: item.ator,
      acao: item.acao,
    })) || [];

    if (registros.length === 0) {
      registros.push({
        timestamp: pedido.criadoEm.toISOString(),
        ator: 'SISTEMA',
        acao: 'Pedido criado',
      });
    }

    if (pedido.canceladoMotivo) {
      registros.push({
        timestamp: pedido.atualizadoEm.toISOString(),
        ator: 'OPERADOR',
        acao: `Cancelamento: ${pedido.canceladoMotivo}`,
      });
    }

    if (pedido.estornoRealizadoEm) {
      registros.push({
        timestamp: pedido.estornoRealizadoEm.toISOString(),
        ator: 'OPERADOR',
        acao: 'Estorno marcado como realizado',
      });
    } else if (pedido.estornoNecessario) {
      registros.push({
        timestamp: pedido.atualizadoEm.toISOString(),
        ator: 'SISTEMA',
        acao: 'Estorno necessário',
      });
    }

    return registros.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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

  async listarPedidosAdmin(filtros?: { status?: string; busca?: string }) {
    const busca = filtros?.busca?.trim();

    const where: any = {};
    if (filtros?.status && filtros.status !== 'todos') {
      where.status = filtros.status.toUpperCase();
    }

    if (busca) {
      where.OR = [
        { id: { contains: busca, mode: 'insensitive' } },
        { clienteTelefone: { contains: busca, mode: 'insensitive' } },
        { cliente: { nome: { contains: busca, mode: 'insensitive' } } },
        { cliente: { bairro: { contains: busca, mode: 'insensitive' } } },
      ];
    }

    const pedidos = await prisma.pedido.findMany({
      where,
      include: {
        cliente: {
          select: {
            nome: true,
            telefone: true,
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

    const telefones = [...new Set(pedidos.map((p) => p.cliente?.telefone).filter(Boolean))] as string[];
    const unreadGrouped = telefones.length
      ? await prisma.mensagemCliente.groupBy({
          by: ['clienteTelefone'],
          where: {
            clienteTelefone: { in: telefones },
            origem: 'HUMANO',
            lida: false,
          },
          _count: {
            _all: true,
          },
        })
      : [];
    const unreadMap = new Map(unreadGrouped.map((g) => [g.clienteTelefone, g._count._all]));

    const agora = Date.now();
    const data = pedidos.map((pedido) => {
      const tempoNoEstagio = Math.max(0, Math.floor((agora - pedido.atualizadoEm.getTime()) / 1000));
      return {
        id: pedido.id,
        numero: pedido.id.slice(-6).toUpperCase(),
        status: pedido.status,
        statusPagamento: this.resolverStatusPagamento(pedido.status),
        clienteNome: pedido.cliente?.nome || 'Cliente',
        clienteTelefone: pedido.cliente?.telefone || '',
        bairro: pedido.cliente?.bairro || '',
        itensResumo: pedido.itens.slice(0, 3).map((item) => item.produto?.nome || 'Produto'),
        mensagensNaoLidas: unreadMap.get(pedido.cliente?.telefone || '') || 0,
        total: Number(pedido.total),
        createdAt: pedido.criadoEm.toISOString(),
        tempoNoEstagio,
      };
    });

    data.sort((a, b) => {
      const aStatus = this.prioridadeStatus(a.status as StatusPedido);
      const bStatus = this.prioridadeStatus(b.status as StatusPedido);
      if (aStatus !== bStatus) return aStatus - bStatus;
      if (a.tempoNoEstagio !== b.tempoNoEstagio) return b.tempoNoEstagio - a.tempoNoEstagio;
      return a.createdAt.localeCompare(b.createdAt);
    });

    return data;
  }

  async buscarPedidoAdminPorId(id: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
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
                id: true,
                nome: true,
                categoria: true,
                preco: true,
              },
            },
          },
        },
        motoboy: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            status: true,
          },
        },
        timeline: {
          orderBy: {
            criadoEm: 'asc',
          },
          select: {
            criadoEm: true,
            ator: true,
            acao: true,
          },
        },
      },
    });

    if (!pedido) return null;

    const tempoNoEstagio = Math.max(0, Math.floor((Date.now() - pedido.atualizadoEm.getTime()) / 1000));
    return {
      id: pedido.id,
      numero: pedido.id.slice(-6).toUpperCase(),
      status: pedido.status,
      statusPagamento: this.resolverStatusPagamento(pedido.status),
      pagamentoId: pedido.pagamentoId,
      observacao: pedido.observacao,
      observacaoEntrega: pedido.observacaoEntrega,
      canceladoMotivo: pedido.canceladoMotivo,
      estornoNecessario: pedido.estornoNecessario,
      estornoRealizadoEm: pedido.estornoRealizadoEm?.toISOString() || null,
      subtotal: Number(pedido.subtotal),
      taxaEntrega: Number(pedido.taxaEntrega),
      total: Number(pedido.total),
      createdAt: pedido.criadoEm.toISOString(),
      updatedAt: pedido.atualizadoEm.toISOString(),
      tempoNoEstagio,
      cliente: {
        nome: pedido.cliente?.nome || 'Cliente',
        telefone: pedido.cliente?.telefone || '',
        endereco: pedido.cliente?.endereco || '',
        bairro: pedido.cliente?.bairro || '',
      },
      itens: pedido.itens.map((item) => ({
        id: item.id,
        quantidade: item.quantidade,
        precoUnit: Number(item.precoUnit),
        subtotal: Number(item.subtotal),
        observacao: item.observacao,
        produto: item.produto
          ? {
              id: item.produto.id,
              nome: item.produto.nome,
              categoria: item.produto.categoria,
              preco: Number(item.produto.preco),
            }
          : null,
      })),
      motoboy: pedido.motoboy
        ? {
            id: pedido.motoboy.id,
            nome: pedido.motoboy.nome,
            telefone: pedido.motoboy.telefone,
            status: pedido.motoboy.status,
          }
        : null,
      timeline: this.montarTimeline(pedido),
    };
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

      await this.registrarTimeline(pedido.id, 'SISTEMA', 'Pedido criado');

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
          cep: dadosCliente.cep?.replace(/\D/g, '') || undefined,
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

        await this.registrarTimeline(pedido.id, 'SISTEMA', 'Link de pagamento PIX gerado');

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

      await this.registrarTimeline(id, 'SISTEMA', `Status -> ${status}`);

      logger.info(`Status do pedido ${id} atualizado para: ${status}`);
      return pedido;
    } catch (error) {
      logger.error(`Erro ao atualizar status do pedido ${id}:`, error);
      throw new Error('Erro ao atualizar pedido');
    }
  }

  async atualizarStatusAdmin(id: string, novoStatus: StatusPedido, motivoCancelamento?: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!pedido) {
      throw new Error('PEDIDO_NAO_ENCONTRADO');
    }

    if (pedido.status === novoStatus) {
      return pedido;
    }

    const permitidos = this.transicoesPermitidas[pedido.status] || [];
    if (!permitidos.includes(novoStatus)) {
      throw new Error('TRANSICAO_INVALIDA');
    }

    const atualizado = await prisma.pedido.update({
      where: { id },
      data: {
        status: novoStatus,
        ...(novoStatus === StatusPedido.CANCELADO && motivoCancelamento
          ? { canceladoMotivo: motivoCancelamento }
          : {}),
      },
      select: { id: true, status: true, atualizadoEm: true },
    });

    logger.info('Status alterado pelo admin', {
      pedidoId: id,
      de: pedido.status,
      para: novoStatus,
    });

    await this.registrarTimeline(id, 'OPERADOR', `Status -> ${novoStatus}`);

    const deveNotificarCliente =
      novoStatus === StatusPedido.CONFIRMADO ||
      novoStatus === StatusPedido.SAIU_ENTREGA ||
      novoStatus === StatusPedido.ENTREGUE ||
      novoStatus === StatusPedido.CANCELADO;

    if (deveNotificarCliente) {
      try {
        const pedidoCompleto = await this.buscarPedidoPorId(id);
        if (pedidoCompleto) {
          const texto = evolutionService.formatarMensagemStatusPedido(pedidoCompleto, novoStatus, motivoCancelamento);
          const enviado = await evolutionService.notificarClienteStatusPedido(pedidoCompleto, novoStatus, motivoCancelamento);
          if (enviado && texto) {
            await clienteService.registrarMensagemSistema(
              pedidoCompleto.cliente.telefone,
              texto,
              pedidoCompleto.id
            );
          }
        }
      } catch (error) {
        logger.error('Erro ao enviar mensagem automática de status ao cliente:', error);
      }
    }

    return atualizado;
  }

  async listarMotoboys() {
    const motoboys = await prisma.motoboy.findMany({
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
    });
    return motoboys.map((m) => ({
      id: m.id,
      nome: m.nome,
      telefone: m.telefone,
      status: m.status,
    }));
  }

  async atribuirMotoboy(pedidoId: string, motoboyId: string | null, observacaoEntrega?: string) {
    const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId }, select: { id: true } });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');

    if (motoboyId) {
      const motoboy = await prisma.motoboy.findUnique({ where: { id: motoboyId }, select: { id: true } });
      if (!motoboy) throw new Error('MOTOBOY_NAO_ENCONTRADO');
    }

    const atualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        motoboyId,
        observacaoEntrega: observacaoEntrega?.trim() || null,
      },
      include: {
        motoboy: { select: { id: true, nome: true, telefone: true, status: true } },
      },
    });

    await this.registrarTimeline(
      pedidoId,
      'OPERADOR',
      atualizado.motoboy ? `Motoboy atribuido: ${atualizado.motoboy.nome}` : 'Motoboy removido'
    );

    return {
      id: atualizado.id,
      motoboy: atualizado.motoboy,
      observacaoEntrega: atualizado.observacaoEntrega,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
    };
  }

  async atualizarEnderecoEntrega(pedidoId: string, endereco: string, bairro: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, clienteTelefone: true },
    });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');

    await prisma.cliente.update({
      where: { telefone: pedido.clienteTelefone },
      data: {
        endereco: endereco.trim(),
        bairro: bairro.trim(),
      },
    });

    await this.registrarTimeline(pedidoId, 'OPERADOR', 'Endereco de entrega atualizado');

    const atualizado = await this.buscarPedidoAdminPorId(pedidoId);
    return atualizado;
  }

  async criarPedidoManual(dados: CriarPedidoInput & { pagamentoMetodo: 'PIX' | 'DINHEIRO'; valorDinheiro?: number }) {
    const pedido = await this.criarPedido(dados);

    if (dados.pagamentoMetodo === 'DINHEIRO') {
      const atualizado = await prisma.pedido.update({
        where: { id: pedido.id },
        data: {
          status: StatusPedido.CONFIRMADO,
        },
      });
      await this.registrarTimeline(pedido.id, 'OPERADOR', 'Pedido manual em dinheiro confirmado');
      return {
        ...pedido,
        status: atualizado.status,
        formaPagamento: 'DINHEIRO_ENTREGA',
        valorDinheiro: dados.valorDinheiro ?? null,
      };
    }

    return {
      ...pedido,
      formaPagamento: 'PIX',
    };
  }

  async cancelarPedidoAdmin(id: string, motivo: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');

    const statusPagamento = this.resolverStatusPagamento(pedido.status);
    const estornoNecessario = statusPagamento === 'CONFIRMADO';

    const atualizado = await prisma.pedido.update({
      where: { id },
      data: {
        status: StatusPedido.CANCELADO,
        canceladoMotivo: motivo.trim(),
        estornoNecessario,
      },
      select: {
        id: true,
        status: true,
        canceladoMotivo: true,
        estornoNecessario: true,
        estornoRealizadoEm: true,
        atualizadoEm: true,
      },
    });

    await this.registrarTimeline(id, 'OPERADOR', `Pedido cancelado: ${motivo.trim()}`);
    if (estornoNecessario) {
      await this.registrarTimeline(id, 'SISTEMA', 'Estorno necessario');
    }

    return {
      ...atualizado,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
      estornoRealizadoEm: atualizado.estornoRealizadoEm?.toISOString() || null,
    };
  }

  async marcarEstornoAdmin(id: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, status: true, estornoNecessario: true },
    });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');
    if (pedido.status !== StatusPedido.CANCELADO) throw new Error('ESTORNO_STATUS_INVALIDO');
    if (!pedido.estornoNecessario) throw new Error('ESTORNO_NAO_NECESSARIO');

    const atualizado = await prisma.pedido.update({
      where: { id },
      data: {
        estornoRealizadoEm: new Date(),
        estornoNecessario: false,
      },
      select: {
        id: true,
        estornoNecessario: true,
        estornoRealizadoEm: true,
        atualizadoEm: true,
      },
    });

    await this.registrarTimeline(id, 'OPERADOR', 'Estorno marcado como realizado');

    return {
      ...atualizado,
      estornoRealizadoEm: atualizado.estornoRealizadoEm?.toISOString() || null,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
    };
  }

  async obterStatusLoja() {
    const loja = await prisma.lojaConfiguracao.upsert({
      where: { id: 'loja_principal' },
      update: {},
      create: { id: 'loja_principal', status: StatusLoja.ABERTO },
    });

    return {
      status: loja.status,
      mensagem: loja.mensagemPausado,
      atualizadoEm: loja.atualizadoEm.toISOString(),
    };
  }

  async atualizarStatusLoja(status: StatusLoja, mensagem?: string) {
    if (status === StatusLoja.PAUSADO && !mensagem?.trim()) {
      throw new Error('MENSAGEM_PAUSADO_OBRIGATORIA');
    }

    const loja = await prisma.lojaConfiguracao.upsert({
      where: { id: 'loja_principal' },
      update: {
        status,
        mensagemPausado: status === StatusLoja.PAUSADO ? mensagem!.trim() : null,
      },
      create: {
        id: 'loja_principal',
        status,
        mensagemPausado: status === StatusLoja.PAUSADO ? mensagem!.trim() : null,
      },
    });

    return {
      status: loja.status,
      mensagem: loja.mensagemPausado,
      atualizadoEm: loja.atualizadoEm.toISOString(),
    };
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

  async obterMetricasAdmin() {
    const inicioDia = new Date();
    inicioDia.setHours(0, 0, 0, 0);
    const statusesReceita: StatusPedido[] = [
      StatusPedido.CONFIRMADO,
      StatusPedido.PREPARANDO,
      StatusPedido.SAIU_ENTREGA,
      StatusPedido.ENTREGUE,
    ];

    const [porStatus, receitaDia, pedidosHoje, mensagensNaoLidas] = await Promise.all([
      prisma.pedido.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: {
          criadoEm: { gte: inicioDia },
          status: { in: statusesReceita },
        },
      }),
      prisma.pedido.count({
        where: {
          criadoEm: { gte: inicioDia },
        },
      }),
      prisma.mensagemCliente.count({
        where: {
          origem: 'HUMANO',
          lida: false,
        },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(StatusPedido).map((status) => [status, 0])
    ) as Record<StatusPedido, number>;

    for (const item of porStatus) {
      statusCounts[item.status] = item._count._all;
    }

    return {
      total: Object.values(statusCounts).reduce((acc, value) => acc + value, 0),
      pedidosHoje,
      receitaDia: Number(receitaDia._sum.total || 0),
      mensagensNaoLidas,
      aguardandoPagamento: statusCounts.AGUARDANDO_PAGAMENTO + statusCounts.PENDENTE,
      aguardandoAprovacao: statusCounts.CONFIRMADO,
      emPreparo: statusCounts.PREPARANDO,
      aguardandoEntregador: 0,
      emRota: statusCounts.SAIU_ENTREGA,
      entregues: statusCounts.ENTREGUE,
      cancelados: statusCounts.CANCELADO,
      expirados: statusCounts.EXPIRADO + statusCounts.ABANDONADO,
      porStatus: statusCounts,
      atualizadoEm: new Date().toISOString(),
    };
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
