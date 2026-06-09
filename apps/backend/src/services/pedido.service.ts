import crypto from 'crypto';
import prisma from '../config/database';
import { logger } from '../config/logger';
import clienteService from './cliente.service';
import bairroService from './bairro.service';
import taxaEntregaService from './taxaEntrega.service';
import mercadoPagoService from './mercadopago.service';
import evolutionService from './evolution.service';
import realtimeService from './realtime.service';
import { getLojaConfig, upsertLojaConfig } from './lojaConfig.service';
import { EmpresaEntrega, FormaPagamentoPedido, Origem, StatusLoja, StatusPagamento, StatusPedido, TipoAtendimentoPedido } from '@prisma/client';
import { getSaoPauloDayRange } from '../utils/timezone';

interface ItemPedidoInput {
  produtoId: string;
  quantidade: number;
  observacao?: string;
}

interface CriarPedidoInput {
  cliente: {
    telefone: string;
    nome: string;
    endereco?: string;
    bairro?: string;
    cep?: string;
  };
  itens: ItemPedidoInput[];
  observacao?: string;
  origem?: Origem;
  pagamento?: {
    forma: FormaPagamentoPedido;
    trocoPara?: number;
  };
  tipoAtendimento?: TipoAtendimentoPedido;
}

interface MercadoPagoConfigInput {
  ativo: boolean;
  publicKey?: string | null;
  accessToken?: string | null;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
}

export class PedidoService {
  private isAguardandoEntregador(status: StatusPedido, tipoAtendimento?: TipoAtendimentoPedido | null, motoboyId?: string | null) {
    return status === StatusPedido.PRONTO && (tipoAtendimento ?? TipoAtendimentoPedido.ENTREGA) === TipoAtendimentoPedido.ENTREGA && !motoboyId;
  }

  private ultimaExecucaoExpiracaoMs = 0;
  private processandoExpiracao = false;
  private cacheEstimativa: { valor: number; atualizadoEm: number } | null = null;
  private transicoesPermitidas: Record<StatusPedido, StatusPedido[]> = {
    PENDENTE: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
    AGUARDANDO_PAGAMENTO: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO, StatusPedido.EXPIRADO],
    CONFIRMADO: [StatusPedido.PREPARANDO, StatusPedido.CANCELADO],
    PREPARANDO: [StatusPedido.PRONTO, StatusPedido.CANCELADO],
    PRONTO: [StatusPedido.SAIU_ENTREGA, StatusPedido.CANCELADO],
    SAIU_ENTREGA: [StatusPedido.ENTREGUE, StatusPedido.CANCELADO],
    ENTREGUE: [],
    EXPIRADO: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO, StatusPedido.ABANDONADO],
    ABANDONADO: [StatusPedido.CONFIRMADO, StatusPedido.CANCELADO],
    CANCELADO: [],
  };

  private prioridadeStatus(status: StatusPedido) {
    const ordem: Record<StatusPedido, number> = {
      AGUARDANDO_PAGAMENTO: 0,
      PENDENTE: 1,
      CONFIRMADO: 2,
      PREPARANDO: 3,
      PRONTO: 4,
      SAIU_ENTREGA: 5,
      ENTREGUE: 6,
      EXPIRADO: 7,
      ABANDONADO: 8,
      CANCELADO: 9,
    };
    return ordem[status] ?? 99;
  }

  private async notificarMudancaStatus(
    pedidoId: string,
    novoStatus: StatusPedido,
    motivoCancelamento?: string
  ) {
    const deveNotificarCliente =
      novoStatus === StatusPedido.AGUARDANDO_PAGAMENTO ||
      novoStatus === StatusPedido.CONFIRMADO ||
      novoStatus === StatusPedido.PREPARANDO ||
      novoStatus === StatusPedido.PRONTO ||
      novoStatus === StatusPedido.SAIU_ENTREGA ||
      novoStatus === StatusPedido.ENTREGUE ||
      novoStatus === StatusPedido.CANCELADO ||
      novoStatus === StatusPedido.EXPIRADO ||
      novoStatus === StatusPedido.ABANDONADO;

    if (!deveNotificarCliente) return;

    try {
      const pedidoCompleto = await this.buscarPedidoPorId(pedidoId);
      if (!pedidoCompleto) return;

      const texto = evolutionService.formatarMensagemStatusPedido(pedidoCompleto, novoStatus, motivoCancelamento);
      const enviado = await evolutionService.notificarClienteStatusPedido(pedidoCompleto, novoStatus, motivoCancelamento);
      if (enviado && texto) {
        await clienteService.registrarMensagemSistema(
          pedidoCompleto.cliente.telefone,
          texto,
          pedidoCompleto.id
        );
      }
    } catch (error) {
      logger.error('Erro ao enviar mensagem automática de status ao cliente:', error);
    }
  }

  private getCheckoutTtlMinutes() {
    const ttl = Number(process.env.CHECKOUT_TTL_MINUTES || 20);
    return Number.isFinite(ttl) && ttl > 0 ? ttl : 20;
  }

  private getAbandonoMinutes() {
    const abandono = Number(process.env.ABANDONO_MINUTES || 30);
    return Number.isFinite(abandono) && abandono > 0 ? abandono : 30;
  }

  private async registrarTimeline(pedidoId: string, ator: string, acao: string) {
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

  private async obterWebhookUrlMercadoPago(baseUrl: string) {
    const loja = await getLojaConfig();
    return loja?.mercadopagoWebhookUrl?.trim() || process.env.MERCADOPAGO_WEBHOOK_URL || `${baseUrl}/webhook/mercadopago`;
  }

  private async obterTempoMedioPreparoMin(): Promise<number> {
    const now = Date.now();
    if (this.cacheEstimativa && now - this.cacheEstimativa.atualizadoEm < 60_000) {
      return this.cacheEstimativa.valor;
    }

    const media = await prisma.$queryRaw<Array<{ avg_segundos: number | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (atualizado_em - status_mudou_em))) as avg_segundos
      FROM pedidos
      WHERE status = 'ENTREGUE'
        AND criado_em >= NOW() - INTERVAL '7 days'
    `;

    const min = media[0]?.avg_segundos ? Math.max(10, Math.round(Number(media[0].avg_segundos) / 60)) : 30;
    this.cacheEstimativa = { valor: min, atualizadoEm: now };
    return min;
  }

  private async calcularTempoEstimadoMin(pedido: { status: StatusPedido; bairroEntrega?: string | null }): Promise<number> {
    if (pedido.status === StatusPedido.ENTREGUE) return 0;
    if (pedido.status === StatusPedido.SAIU_ENTREGA) {
      const bairro = pedido.bairroEntrega
        ? await prisma.bairro.findFirst({
            where: { nome: { equals: pedido.bairroEntrega, mode: 'insensitive' }, ativo: true },
            select: { tempoEntrega: true },
          })
        : null;
      return Math.max(5, bairro?.tempoEntrega || 20);
    }
    const basePreparo = await this.obterTempoMedioPreparoMin();
    return basePreparo;
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
        formaPagamento: pedido.formaPagamento,
        trocoParaValor: pedido.trocoPara ? Number(pedido.trocoPara) : undefined,
        tipoAtendimento: pedido.tipoAtendimento,
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

  async listarPedidosAdmin(filtros?: { status?: string; busca?: string; page?: number; limit?: number }) {
    const busca = filtros?.busca?.trim();
    const page = Math.max(1, filtros?.page || 1);
    const limit = Math.min(100, Math.max(1, filtros?.limit || 50));
    const skip = (page - 1) * limit;

    const STATUSES_FINAIS = [
      StatusPedido.ENTREGUE,
      StatusPedido.CANCELADO,
      StatusPedido.EXPIRADO,
      StatusPedido.ABANDONADO,
    ];

    const where: any = {};

    if (filtros?.status && filtros.status !== 'todos') {
      where.status = filtros.status.toUpperCase();
    } else {
      // Sem filtro explícito: ativos de qualquer data + finais apenas do dia corrente.
      // "Início do dia" calculado no timezone do servidor (America/Sao_Paulo via TZ env).
      const { start: inicioDia } = getSaoPauloDayRange();
      where.OR = [
        { status: { notIn: STATUSES_FINAIS } },
        { status: { in: STATUSES_FINAIS }, criadoEm: { gte: inicioDia } },
      ];
    }

    if (busca) {
      // Combinar filtro de busca com o where existente via AND
      const buscaConditions = [
        { id: { contains: busca, mode: 'insensitive' } },
        { clienteTelefone: { contains: busca, mode: 'insensitive' } },
        { cliente: { nome: { contains: busca, mode: 'insensitive' } } },
        { cliente: { bairro: { contains: busca, mode: 'insensitive' } } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: buscaConditions }];
        delete where.OR;
      } else {
        where.OR = buscaConditions;
      }
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
      const baseStatus = pedido.statusMudouEm || pedido.atualizadoEm;
      const tempoNoEstagio = Math.max(0, Math.floor((agora - baseStatus.getTime()) / 1000));
        return {
          id: pedido.id,
          numero: pedido.id.slice(-6).toUpperCase(),
          status: pedido.status,
          aguardandoEntregador: this.isAguardandoEntregador(pedido.status, pedido.tipoAtendimento, pedido.motoboyId),
          statusPagamento: pedido.statusPagamento,
          formaPagamento: pedido.formaPagamento,
          trocoPara: pedido.trocoPara ? Number(pedido.trocoPara) : null,
          tipoAtendimento: pedido.tipoAtendimento,
          clienteNome: pedido.cliente?.nome || 'Cliente',
        clienteTelefone: pedido.cliente?.telefone || '',
        bairro: pedido.bairroEntrega || pedido.cliente?.bairro || '',
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

    return {
      data,
      pagination: { page, limit, total },
    };
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

    const baseStatus = pedido.statusMudouEm || pedido.atualizadoEm;
    const tempoNoEstagio = Math.max(0, Math.floor((Date.now() - baseStatus.getTime()) / 1000));
    return {
      id: pedido.id,
      numero: pedido.id.slice(-6).toUpperCase(),
      status: pedido.status,
      aguardandoEntregador: this.isAguardandoEntregador(pedido.status, pedido.tipoAtendimento, pedido.motoboyId),
      statusPagamento: pedido.statusPagamento,
      formaPagamento: pedido.formaPagamento,
      trocoPara: pedido.trocoPara ? Number(pedido.trocoPara) : null,
      tipoAtendimento: pedido.tipoAtendimento,
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
        endereco: pedido.enderecoEntrega || pedido.cliente?.endereco || '',
        bairro: pedido.bairroEntrega || pedido.cliente?.bairro || '',
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
    const inicioMs = Date.now();
    try {
      const { cliente: dadosCliente, itens, observacao, origem = 'SITE' } = dados;
      const formaPagamento = dados.pagamento?.forma ?? FormaPagamentoPedido.PIX;
      const trocoPara = formaPagamento === FormaPagamentoPedido.DINHEIRO ? dados.pagamento?.trocoPara : undefined;
      const tipoAtendimento = dados.tipoAtendimento ?? TipoAtendimentoPedido.ENTREGA;
      const telefoneMascarado = dadosCliente.telefone.replace(/\D/g, '').replace(/^(\d{0,7})/, (m) => '*'.repeat(m.length));
      logger.info('pedido.criar.inicio', {
        telefone: telefoneMascarado || 'anon',
        bairro: dadosCliente.bairro,
        qtdItens: itens.length,
      });

      if (origem === Origem.SITE) {
        const loja = await upsertLojaConfig({
          update: {},
          create: { status: StatusLoja.ABERTO },
        });
        if (loja.status === StatusLoja.FECHADO) throw new Error('LOJA_FECHADA');
        if (loja.status === StatusLoja.PAUSADO) {
          const erro = new Error('LOJA_PAUSADA');
          (erro as any).mensagemPausado = loja.mensagemPausado || null;
          throw erro;
        }
      }

      // 1. Validar bairro e obter taxa (somente para entrega)
      let taxaEntrega = 0;
      if (tipoAtendimento === TipoAtendimentoPedido.ENTREGA) {
        if (!dadosCliente.endereco || !dadosCliente.bairro) {
          throw new Error('ENDERECO_OBRIGATORIO_ENTREGA');
        }

        // Calcula taxa de entrega por distância (CEP) ou por bairro
        const faixas = await taxaEntregaService.obterFaixas();
        if (taxaEntregaService.usaFaixasPorDistancia(faixas)) {
          // Modo distância: CEP obrigatório
          if (!dadosCliente.cep) {
            throw new Error('CEP_OBRIGATORIO');
          }
          const resultado = await taxaEntregaService.calcularPorCep(dadosCliente.cep);
          if (!resultado.atendido) {
            logger.warn(`pedido.entrega.fora_area cep=${dadosCliente.cep} motivo=${resultado.erro}`);
            throw new Error('AREA_NAO_ATENDIDA');
          }
          taxaEntrega = resultado.taxa;
        } else {
          // Modo bairro (legado)
          const validacaoBairro = await bairroService.validarBairro(dadosCliente.bairro);
          if (!validacaoBairro.valido) {
            throw new Error('AREA_NAO_ATENDIDA');
          }
          taxaEntrega = validacaoBairro.taxa!;
        }
      }

      // 2. Validar produtos e calcular subtotal (batch — evita N+1)
      const produtoIds = [...new Set(itens.map((i) => i.produtoId))];
      const produtos = await prisma.produto.findMany({
        where: { id: { in: produtoIds } },
        select: { id: true, nome: true, preco: true, disponivel: true },
      });
      const produtoMap = new Map(produtos.map((p) => [p.id, p]));

      let subtotal = 0;
      const itensValidados: Array<{
        produtoId: string;
        quantidade: number;
        precoUnit: number;
        subtotal: number;
        observacao?: string;
      }> = [];

      for (const item of itens) {
        const produto = produtoMap.get(item.produtoId);

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
      if (formaPagamento === FormaPagamentoPedido.DINHEIRO && trocoPara !== undefined && trocoPara < total) {
        throw new Error('TROCO_INVALIDO');
      }

      // 4. Criar ou atualizar cliente
      const cliente = await clienteService.criarOuAtualizar({
        ...dadosCliente,
        endereco: dadosCliente.endereco ?? '',
        bairro: dadosCliente.bairro ?? '',
        origem,
      });

      // 5. Criar pedido com itens (transação)
      const usaFluxoPagamentoOnline =
        formaPagamento === FormaPagamentoPedido.PIX ||
        formaPagamento === FormaPagamentoPedido.CARTAO_CREDITO ||
        formaPagamento === FormaPagamentoPedido.CARTAO_DEBITO;
      const pagamentoExpiraEm = usaFluxoPagamentoOnline ? new Date(Date.now() + this.getCheckoutTtlMinutes() * 60 * 1000) : null;
      const tokenAcesso = crypto.randomBytes(32).toString('hex');
      const pedido = await prisma.pedido.create({
        data: {
          clienteTelefone: cliente.telefone,
          enderecoEntrega: dadosCliente.endereco,
          bairroEntrega: dadosCliente.bairro,
          formaPagamento,
          trocoPara: trocoPara ?? null,
          tipoAtendimento,
          subtotal,
          taxaEntrega,
          total,
          status: usaFluxoPagamentoOnline ? StatusPedido.AGUARDANDO_PAGAMENTO : StatusPedido.CONFIRMADO,
          statusPagamento: usaFluxoPagamentoOnline ? StatusPagamento.PENDENTE : StatusPagamento.A_RECEBER,
          statusMudouEm: new Date(),
          pagamentoExpiraEm,
          observacao,
          tokenAcesso,
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
      realtimeService.emit('pedido:novo', { id: pedido.id, status: pedido.status });
      if (!usaFluxoPagamentoOnline) {
        logger.info('pedido.criar.sucesso_sem_pix', {
          pedidoId: pedido.id,
          formaPagamento,
          total,
          tempoMs: Date.now() - inicioMs,
        });
        return pedido;
      }

      // 6. Criar link de pagamento no Mercado Pago para PIX/Cartão
      try {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${baseUrl}/pedido/${pedido.id}`;
        const webhookUrl = await this.obterWebhookUrlMercadoPago(baseUrl);
        const telefoneNumeros = pedido.cliente?.telefone?.replace(/\D/g, '') || '';
        const telefoneFormatado = telefoneNumeros ? `+55${telefoneNumeros}` : undefined;
        const customer = {
          name: pedido.cliente?.nome || undefined,
          phone_number: telefoneFormatado,
        };
        // Montar itens para Mercado Pago (preço em centavos)
        const itensMercadoPago = pedido.itens.map((item) => ({
          quantity: item.quantidade,
          price: mercadoPagoService.reaisParaCentavos(Number(item.precoUnit)),
          description: item.produto?.nome || `Produto ${item.produtoId}`,
        }));

        // Adicionar taxa de entrega como item se > 0
        if (taxaEntrega > 0) {
          itensMercadoPago.push({
            quantity: 1,
            price: mercadoPagoService.reaisParaCentavos(taxaEntrega),
            description: 'Taxa de entrega',
          });
        }

        const linkPagamento = await mercadoPagoService.criarLinkPagamento({
          itens: itensMercadoPago,
          order_nsu: pedido.id,
          redirect_url: redirectUrl,
          webhook_url: webhookUrl,
          customer,
        });

        // Atualizar pedido com ID do pagamento
        await prisma.pedido.update({
          where: { id: pedido.id },
          data: { pagamentoId: linkPagamento.id || pedido.id },
        });

        await this.registrarTimeline(pedido.id, 'SISTEMA', 'Link de pagamento PIX gerado');

        logger.info('mercadopago.link.criado', {
          pedidoId: pedido.id,
          tempoMs: Date.now() - inicioMs,
        });
        logger.info('pedido.criar.sucesso', {
          pedidoId: pedido.id,
          total,
          tempoMs: Date.now() - inicioMs,
        });

        return {
          ...pedido,
          pagamentoId: linkPagamento.id,
          linkPagamento: linkPagamento.url,
        };
      } catch (error) {
        logger.warn('mercadopago.link.falha', {
          pedidoId: pedido.id,
          erro: error instanceof Error ? error.message : String(error),
        });
        logger.info('pedido.criar.sucesso_sem_link', {
          pedidoId: pedido.id,
          total,
          tempoMs: Date.now() - inicioMs,
        });
        // Para cartão, sem link significa fluxo quebrado: aborta para evitar pedido "fantasma" sem checkout.
        if (formaPagamento === FormaPagamentoPedido.CARTAO_CREDITO || formaPagamento === FormaPagamentoPedido.CARTAO_DEBITO) {
          throw new Error('CHECKOUT_CARTAO_INDISPONIVEL');
        }
        // PIX pode seguir sem link para usar endpoint /pagamento/pix direto.
        return pedido;
      }
    } catch (error) {
      logger.error('pedido.criar.falha', {
        erro: error instanceof Error ? error.message : String(error),
        tempoMs: Date.now() - inicioMs,
      });
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
      const tempoEstimadoMin = await this.calcularTempoEstimadoMin({
        status: pedido.status,
        bairroEntrega: pedido.bairroEntrega,
      });
      return {
        ...pedido,
        clienteNome: pedido.cliente?.nome || 'Cliente',
        clienteTelefone: pedido.cliente?.telefone || '',
        tempoEstimadoMin,
      };
    } catch (error) {
      logger.error(`Erro ao buscar pedido ${id}:`, error);
      throw new Error('Erro ao buscar pedido');
    }
  }

  /**
   * Atualiza status do pedido
   */
  async atualizarStatus(id: string, status: string, pagamentoId?: string) {
    const inicioMs = Date.now();
    try {
      const pedidoAtual = await prisma.pedido.findUnique({
        where: { id },
        select: { status: true, statusPagamento: true },
      });

      const eraAbandonadoOuExpirado =
        pedidoAtual?.status === StatusPedido.ABANDONADO || pedidoAtual?.status === StatusPedido.EXPIRADO;
      const virouConfirmado = status === StatusPedido.CONFIRMADO;

      const pedido = await prisma.pedido.update({
        where: { id },
        data: {
          status: status as StatusPedido,
          statusPagamento: virouConfirmado ? StatusPagamento.CONFIRMADO : pedidoAtual?.statusPagamento,
          statusMudouEm: new Date(),
          pagamentoId,
          ...(virouConfirmado && { recuperadoEm: eraAbandonadoOuExpirado ? new Date() : null }),
        },
      });

      await this.registrarTimeline(id, 'SISTEMA', `Status -> ${status}`);

      const novoStatus = status as StatusPedido;
      await this.notificarMudancaStatus(id, novoStatus);
      realtimeService.emit('pedido:atualizado', { id, status: novoStatus });

      logger.info('pedido.status.transicao', {
        pedidoId: id,
        de: pedidoAtual?.status,
        para: novoStatus,
        ator: 'SISTEMA',
        tempoMs: Date.now() - inicioMs,
      });
      return pedido;
    } catch (error) {
      logger.error(`Erro ao atualizar status do pedido ${id}:`, error);
      throw new Error('Erro ao atualizar pedido');
    }
  }

  async atualizarStatusAdmin(id: string, novoStatus: StatusPedido, motivoCancelamento?: string, operadorNome?: string) {
    const inicioMs = Date.now();
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, status: true, statusPagamento: true, formaPagamento: true, tipoAtendimento: true, motoboyId: true, observacaoEntrega: true },
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

    const pagamentoOnline =
      pedido.formaPagamento === FormaPagamentoPedido.PIX ||
      pedido.formaPagamento === FormaPagamentoPedido.CARTAO_CREDITO ||
      pedido.formaPagamento === FormaPagamentoPedido.CARTAO_DEBITO;
    const operacaoPermitidaSemConfirmacao =
      novoStatus === StatusPedido.CANCELADO || novoStatus === StatusPedido.EXPIRADO || novoStatus === StatusPedido.ABANDONADO;
    if (pagamentoOnline && pedido.statusPagamento !== StatusPagamento.CONFIRMADO && !operacaoPermitidaSemConfirmacao) {
      throw new Error('PAGAMENTO_NAO_CONFIRMADO');
    }

    if (
      pedido.status === StatusPedido.PRONTO &&
      novoStatus === StatusPedido.SAIU_ENTREGA &&
      (pedido.tipoAtendimento ?? TipoAtendimentoPedido.ENTREGA) === TipoAtendimentoPedido.ENTREGA &&
      !pedido.motoboyId &&
      !String(pedido.observacaoEntrega || '').startsWith('TERCEIRIZADA:')
    ) {
      throw new Error('DESPACHO_SEM_ENTREGADOR');
    }

    const statusPagamentoAtualizado =
      novoStatus === StatusPedido.CANCELADO
        ? (pedido.statusPagamento === StatusPagamento.CONFIRMADO ? StatusPagamento.CONFIRMADO : StatusPagamento.EXPIRADO)
        : pedido.statusPagamento;
    const estornoNecessario = novoStatus === StatusPedido.CANCELADO && pedido.statusPagamento === StatusPagamento.CONFIRMADO;

    const atualizado = await prisma.pedido.update({
      where: { id },
      data: {
        status: novoStatus,
        statusPagamento: statusPagamentoAtualizado,
        statusMudouEm: new Date(),
        ...(novoStatus === StatusPedido.CANCELADO ? { estornoNecessario } : {}),
        ...(novoStatus === StatusPedido.CANCELADO && motivoCancelamento
          ? { canceladoMotivo: motivoCancelamento }
          : {}),
      },
      select: { id: true, status: true, atualizadoEm: true },
    });

    logger.info('pedido.status.transicao', {
      pedidoId: id,
      de: pedido.status,
      para: novoStatus,
      ator: operadorNome ?? 'OPERADOR',
      tempoMs: Date.now() - inicioMs,
    });

    await this.registrarTimeline(id, operadorNome ?? 'OPERADOR', `Status -> ${novoStatus}`);

    await this.notificarMudancaStatus(id, novoStatus, motivoCancelamento);
    realtimeService.emit('pedido:atualizado', { id, status: novoStatus });

    // Notifica entregador quando pedido sai para entrega individualmente
    if (novoStatus === StatusPedido.SAIU_ENTREGA && pedido.motoboyId) {
      realtimeService.emit('entregador:novo_pedido', {
        motoboyId: pedido.motoboyId,
        pedidoIds: [id],
        quantidade: 1,
      });
    }

    return atualizado;
  }

  async listarMotoboyStatus() {
    const { start: inicioDia } = getSaoPauloDayRange();

    const motoboys = await prisma.motoboy.findMany({
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
      include: {
        pedidos: {
          where: {
            status: { in: [StatusPedido.SAIU_ENTREGA, StatusPedido.PREPARANDO, StatusPedido.CONFIRMADO] },
          },
          select: { id: true },
        },
      },
    });

    const entregasHoje = await prisma.pedido.groupBy({
      by: ['motoboyId'],
      where: {
        motoboyId: { not: null },
        status: StatusPedido.ENTREGUE,
        atualizadoEm: { gte: inicioDia },
      },
      _count: { _all: true },
    });

    const entregasMap = new Map(entregasHoje.map((e) => [e.motoboyId, e._count._all]));

    return motoboys.map((m) => ({
      // Status operacional derivado da carga atual para manter o cockpit consistente.
      // Se houver rota ativa, considera EM_ENTREGA; INATIVO permanece INATIVO.
      // Caso contrário, DISPONIVEL.
      status: m.status === 'INATIVO'
        ? 'INATIVO'
        : (m.pedidos.length > 0 ? 'EM_ENTREGA' : 'DISPONIVEL'),
      id: m.id,
      nome: m.nome,
      telefone: m.telefone,
      empresa: m.empresa,
      rotasAtivas: m.pedidos.length,
      pedidosAtivos: m.pedidos.map((p) => p.id),
      entregasHoje: entregasMap.get(m.id) || 0,
    }));
  }

  async listarMotoboys() {
    const motoboys = await prisma.motoboy.findMany({
      orderBy: [{ status: 'asc' }, { nome: 'asc' }],
    });
    return motoboys.map((m) => ({
      id: m.id,
      nome: m.nome,
      telefone: m.telefone,
      empresa: m.empresa,
      status: m.status,
      tipoRemuneracao: m.tipoRemuneracao,
      percentualEntregas: m.percentualEntregas,
      valorFixoPorEntrega: m.valorFixoPorEntrega,
    }));
  }

  async criarMotoboy(input: { nome: string; telefone: string; empresa?: EmpresaEntrega; status?: 'DISPONIVEL' | 'EM_ENTREGA' | 'INATIVO' }) {
    const telefone = input.telefone.replace(/\D/g, '');
    const criado = await prisma.motoboy.create({
      data: {
        nome: input.nome.trim(),
        telefone,
        empresa: input.empresa || EmpresaEntrega.PROPRIO,
        status: input.status || 'DISPONIVEL',
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        empresa: true,
        status: true,
      },
    });
    return criado;
  }

  async atribuirMotoboy(pedidoId: string, motoboyId: string | null, observacaoEntrega?: string, operadorNome?: string) {
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
      operadorNome ?? 'OPERADOR',
      atualizado.motoboy ? `Motoboy atribuido: ${atualizado.motoboy.nome}` : 'Motoboy removido'
    );

    return {
      id: atualizado.id,
      motoboy: atualizado.motoboy,
      observacaoEntrega: atualizado.observacaoEntrega,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
    };
  }

  async atualizarEnderecoEntrega(pedidoId: string, endereco: string, bairro: string, operadorNome?: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true },
    });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');

    const validacaoBairro = await bairroService.validarBairro(bairro.trim());
    if (!validacaoBairro.valido) {
      throw new Error('BAIRRO_NAO_ATENDIDO');
    }

    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        enderecoEntrega: endereco.trim(),
        bairroEntrega: bairro.trim(),
        taxaEntrega: validacaoBairro.taxa ?? 0,
      },
    });

    await this.registrarTimeline(pedidoId, operadorNome ?? 'OPERADOR', 'Endereco de entrega atualizado');
    realtimeService.emit('pedido:atualizado', { id: pedidoId });

    const atualizado = await this.buscarPedidoAdminPorId(pedidoId);
    return atualizado;
  }

  async criarPedidoManual(dados: CriarPedidoInput & { pagamentoMetodo: 'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO'; valorDinheiro?: number; operadorNome?: string; tipoAtendimento?: TipoAtendimentoPedido }) {
    const pagamentoMetodoMap: Record<'PIX' | 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO', FormaPagamentoPedido> = {
      PIX: FormaPagamentoPedido.PIX,
      DINHEIRO: FormaPagamentoPedido.DINHEIRO,
      CARTAO_CREDITO: FormaPagamentoPedido.CARTAO_CREDITO,
      CARTAO_DEBITO: FormaPagamentoPedido.CARTAO_DEBITO,
    };
    const pedido = await this.criarPedido({
      ...dados,
      pagamento: {
        forma: pagamentoMetodoMap[dados.pagamentoMetodo],
        trocoPara: dados.pagamentoMetodo === 'DINHEIRO' ? dados.valorDinheiro : undefined,
      },
      tipoAtendimento: dados.tipoAtendimento ?? TipoAtendimentoPedido.ENTREGA,
    });

    await this.registrarTimeline(pedido.id, dados.operadorNome ?? 'OPERADOR', `Pedido manual criado: ${dados.pagamentoMetodo}`);
    return pedido;
  }

  async cancelarPedidoAdmin(id: string, motivo: string, operadorNome?: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      select: { id: true, status: true, statusPagamento: true },
    });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');

    const estornoNecessario = pedido.statusPagamento === StatusPagamento.CONFIRMADO;

      const atualizado = await prisma.pedido.update({
      where: { id },
      data: {
        status: StatusPedido.CANCELADO,
        statusPagamento: estornoNecessario ? StatusPagamento.CONFIRMADO : (pedido.statusPagamento === StatusPagamento.A_RECEBER ? StatusPagamento.A_RECEBER : StatusPagamento.EXPIRADO),
        statusMudouEm: new Date(),
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

    await this.registrarTimeline(id, operadorNome ?? 'OPERADOR', `Pedido cancelado: ${motivo.trim()}`);
    if (estornoNecessario) {
      await this.registrarTimeline(id, 'SISTEMA', 'Estorno necessario');
    }

    return {
      ...atualizado,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
      estornoRealizadoEm: atualizado.estornoRealizadoEm?.toISOString() || null,
    };
  }

  async marcarEstornoAdmin(id: string, operadorNome?: string) {
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

    await this.registrarTimeline(id, operadorNome ?? 'OPERADOR', 'Estorno marcado como realizado');

    return {
      ...atualizado,
      estornoRealizadoEm: atualizado.estornoRealizadoEm?.toISOString() || null,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
    };
  }

  async obterStatusLoja() {
    const loja = await upsertLojaConfig({
      update: {},
      create: { status: StatusLoja.ABERTO },
    });

    return {
      status: loja.status,
      mensagem: loja.mensagemPausado,
      entregadoresDisponiveisDia: loja.entregadoresDisponiveisDia ?? 0,
      atualizadoEm: loja.atualizadoEm.toISOString(),
    };
  }

  async atualizarStatusLoja(status: StatusLoja, mensagem?: string, entregadoresDisponiveisDia?: number) {
    if (status === StatusLoja.PAUSADO && !mensagem?.trim()) {
      throw new Error('MENSAGEM_PAUSADO_OBRIGATORIA');
    }
    const entregadores = typeof entregadoresDisponiveisDia === 'number'
      ? Math.max(0, Math.trunc(entregadoresDisponiveisDia))
      : undefined;

    const loja = await upsertLojaConfig({
      update: {
        status,
        mensagemPausado: status === StatusLoja.PAUSADO ? mensagem!.trim() : null,
        ...(entregadores !== undefined ? { entregadoresDisponiveisDia: entregadores } : {}),
      },
      create: {
        status,
        mensagemPausado: status === StatusLoja.PAUSADO ? mensagem!.trim() : null,
        entregadoresDisponiveisDia: entregadores ?? 0,
      },
    });

    return {
      status: loja.status,
      mensagem: loja.mensagemPausado,
      entregadoresDisponiveisDia: loja.entregadoresDisponiveisDia ?? 0,
      atualizadoEm: loja.atualizadoEm.toISOString(),
    };
  }

  async obterLocalizacaoLoja() {
    const loja = await upsertLojaConfig({
      update: {},
      create: { status: StatusLoja.ABERTO },
    });
    return {
      endereco: loja.enderecoLoja ?? null,
      lat: loja.latLoja ?? null,
      lng: loja.lngLoja ?? null,
    };
  }

  async atualizarLocalizacaoLoja(endereco: string, lat: number, lng: number) {
    const loja = await upsertLojaConfig({
      update: { enderecoLoja: endereco.trim(), latLoja: lat, lngLoja: lng },
      create: { status: StatusLoja.ABERTO, enderecoLoja: endereco.trim(), latLoja: lat, lngLoja: lng },
    });
    return {
      endereco: loja.enderecoLoja ?? null,
      lat: loja.latLoja ?? null,
      lng: loja.lngLoja ?? null,
    };
  }

  async obterConfiguracaoMercadoPago() {
    const loja = await upsertLojaConfig({
      update: {},
      create: { status: StatusLoja.ABERTO },
    });

    return {
      ativo: loja.mercadopagoAtivo,
      publicKey: loja.mercadopagoPublicKey || '',
      webhookUrl: loja.mercadopagoWebhookUrl || '',
      webhookSecretConfigured: Boolean(loja.mercadopagoWebhookSecret),
      accessTokenConfigured: Boolean(loja.mercadopagoAccessToken),
      atualizadoEm: loja.atualizadoEm.toISOString(),
    };
  }

  async atualizarConfiguracaoMercadoPago(payload: MercadoPagoConfigInput) {
    const normalizar = (valor?: string | null) => {
      if (valor == null) return null;
      const limpo = valor.trim();
      return limpo.length > 0 ? limpo : null;
    };

    const loja = await upsertLojaConfig({
      update: {
        mercadopagoAtivo: payload.ativo,
        mercadopagoPublicKey: normalizar(payload.publicKey),
        mercadopagoAccessToken: normalizar(payload.accessToken),
        mercadopagoWebhookSecret: normalizar(payload.webhookSecret),
        mercadopagoWebhookUrl: normalizar(payload.webhookUrl),
      },
      create: {
        status: StatusLoja.ABERTO,
        mercadopagoAtivo: payload.ativo,
        mercadopagoPublicKey: normalizar(payload.publicKey),
        mercadopagoAccessToken: normalizar(payload.accessToken),
        mercadopagoWebhookSecret: normalizar(payload.webhookSecret),
        mercadopagoWebhookUrl: normalizar(payload.webhookUrl),
      },
    });

    return {
      ativo: loja.mercadopagoAtivo,
      publicKey: loja.mercadopagoPublicKey || '',
      webhookUrl: loja.mercadopagoWebhookUrl || '',
      webhookSecretConfigured: Boolean(loja.mercadopagoWebhookSecret),
      accessTokenConfigured: Boolean(loja.mercadopagoAccessToken),
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

  async registrarNps(pedidoId: string, nota: number, feedback?: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, status: true },
    });
    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');
    if (pedido.status !== StatusPedido.ENTREGUE) throw new Error('NPS_APENAS_ENTREGUE');

    const atualizado = await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        npsNota: nota,
        npsFeedback: feedback?.trim() || null,
        npsEnviadoEm: new Date(),
      },
      select: {
        id: true,
        npsNota: true,
        npsFeedback: true,
        atualizadoEm: true,
      },
    });

    await this.registrarTimeline(pedidoId, 'CLIENTE', `NPS registrado: ${nota} estrela(s)`);
    return {
      ...atualizado,
      atualizadoEm: atualizado.atualizadoEm.toISOString(),
    };
  }

  async criarReorder(pedidoId: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: {
        cliente: {
          select: {
            telefone: true,
            nome: true,
            endereco: true,
            bairro: true,
          },
        },
        itens: {
          select: {
            produtoId: true,
            quantidade: true,
            observacao: true,
          },
        },
      },
    });

    if (!pedido || !pedido.cliente) throw new Error('PEDIDO_NAO_ENCONTRADO');
    if (!pedido.itens.length) throw new Error('PEDIDO_SEM_ITENS_REORDER');

    return this.criarPedido({
      cliente: {
        telefone: pedido.cliente.telefone,
        nome: pedido.cliente.nome,
        endereco: pedido.enderecoEntrega || pedido.cliente.endereco,
        bairro: pedido.bairroEntrega || pedido.cliente.bairro,
      },
      itens: pedido.itens.map((item) => ({
        produtoId: item.produtoId,
        quantidade: item.quantidade,
        observacao: item.observacao || undefined,
      })),
      observacao: `Reorder do pedido ${pedido.id}`,
      origem: Origem.SITE,
    });
  }

  async gerarPagamentoPixPedido(id: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id },
      include: {
        cliente: {
          select: { nome: true, telefone: true },
        },
      },
    });

    if (!pedido) throw new Error('PEDIDO_NAO_ENCONTRADO');
    if (pedido.formaPagamento !== FormaPagamentoPedido.PIX) throw new Error('PAGAMENTO_NAO_PIX');
    if (pedido.status !== StatusPedido.AGUARDANDO_PAGAMENTO) throw new Error('STATUS_INVALIDO_PAGAMENTO');

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const webhookUrl = await this.obterWebhookUrlMercadoPago(baseUrl);
    const telefone = (pedido.cliente?.telefone || '').replace(/\D/g, '');
    const email = `cliente${telefone || 'anon'}@rancho.delivery`;

    const pagamento = await mercadoPagoService.criarPagamentoPix({
      order_nsu: pedido.id,
      transaction_amount: Number(pedido.total),
      description: `Pedido ${pedido.id.slice(-8).toUpperCase()}`,
      webhook_url: webhookUrl,
      payer: {
        email,
        first_name: pedido.cliente?.nome || 'Cliente',
      },
      date_of_expiration: pedido.pagamentoExpiraEm?.toISOString() || undefined,
    });

    await prisma.pedido.update({
      where: { id: pedido.id },
      data: {
        pagamentoId: pagamento.id || pedido.pagamentoId,
      },
    });
    await this.registrarTimeline(pedido.id, 'SISTEMA', 'Pagamento PIX transparente gerado');

    return {
      pedidoId: pedido.id,
      pagamentoId: pagamento.id,
      status: pagamento.status,
      qrCode: pagamento.qr_code || '',
      qrCodeBase64: pagamento.qr_code_base64 || '',
      ticketUrl: pagamento.ticket_url || '',
      expiraEm: pedido.pagamentoExpiraEm?.toISOString() || null,
    };
  }

  async processarExpiracoesEAbandonos() {
    try {
      const agora = new Date();
      const abandonoMinutes = this.getAbandonoMinutes();
      const limiteAbandono = new Date(agora.getTime() - abandonoMinutes * 60 * 1000);

      const expirados = await prisma.pedido.updateMany({
        where: {
          formaPagamento: FormaPagamentoPedido.PIX,
          status: StatusPedido.AGUARDANDO_PAGAMENTO,
          statusPagamento: StatusPagamento.PENDENTE,
          pagamentoExpiraEm: { not: null, lte: agora },
        },
        data: { status: StatusPedido.EXPIRADO, statusPagamento: StatusPagamento.EXPIRADO, statusMudouEm: agora },
      });

      const abandonados = await prisma.pedido.updateMany({
        where: {
          status: StatusPedido.EXPIRADO,
          pagamentoExpiraEm: { not: null, lte: limiteAbandono },
          abandonadoEm: null,
        },
        data: {
          status: StatusPedido.ABANDONADO,
          statusPagamento: StatusPagamento.EXPIRADO,
          statusMudouEm: agora,
          abandonadoEm: agora,
        },
      });

      if (expirados.count > 0 || abandonados.count > 0) {
        logger.info('Rotina de abandono executada', {
          expirados: expirados.count,
          abandonados: abandonados.count,
        });
      }

      if (expirados.count > 0) {
        const pedidosExpirados = await prisma.pedido.findMany({
          where: {
            formaPagamento: FormaPagamentoPedido.PIX,
            status: StatusPedido.EXPIRADO,
            statusMudouEm: { gte: new Date(agora.getTime() - 2 * 60 * 1000) },
          },
          select: { id: true },
          take: 200,
        });
        await Promise.all(pedidosExpirados.map((p) => this.notificarMudancaStatus(p.id, StatusPedido.EXPIRADO)));
      }

      if (abandonados.count > 0) {
        const pedidosAbandonados = await prisma.pedido.findMany({
          where: {
            status: StatusPedido.ABANDONADO,
            abandonadoEm: { gte: new Date(agora.getTime() - 2 * 60 * 1000) },
          },
          select: { id: true },
          take: 200,
        });
        await Promise.all(pedidosAbandonados.map((p) => this.notificarMudancaStatus(p.id, StatusPedido.ABANDONADO)));
      }

      return { expirados: expirados.count, abandonados: abandonados.count };
    } catch (error) {
      logger.error('Erro na rotina de abandono:', error);
      throw error;
    }
  }

  async reprocessarPedidosSemLink() {
    const atrasoMin = Number(process.env.PIX_REPROCESS_DELAY_MINUTES || 2);
    const limite = new Date(Date.now() - atrasoMin * 60 * 1000);

      const pedidosSemLink = await prisma.pedido.findMany({
        where: {
          formaPagamento: FormaPagamentoPedido.PIX,
          status: StatusPedido.AGUARDANDO_PAGAMENTO,
          statusPagamento: StatusPagamento.PENDENTE,
          pagamentoId: null,
          criadoEm: { lte: limite },
        },
      include: {
        itens: {
          include: {
            produto: {
              select: { nome: true },
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
      take: 50,
      orderBy: { criadoEm: 'asc' },
    });

    if (pedidosSemLink.length === 0) return { total: 0, reprocessados: 0, falhas: 0 };

    let reprocessados = 0;
    let falhas = 0;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const webhookUrl = await this.obterWebhookUrlMercadoPago(baseUrl);

    for (const pedido of pedidosSemLink) {
      try {
        const redirectUrl = `${baseUrl}/pedido/${pedido.id}`;
        const telefoneNumeros = pedido.cliente?.telefone?.replace(/\D/g, '') || '';
        const telefoneFormatado = telefoneNumeros ? `+55${telefoneNumeros}` : undefined;

        const itensMercadoPago = pedido.itens.map((item) => ({
          quantity: item.quantidade,
          price: mercadoPagoService.reaisParaCentavos(Number(item.precoUnit)),
          description: item.produto?.nome || `Produto ${item.produtoId}`,
        }));

        if (Number(pedido.taxaEntrega) > 0) {
          itensMercadoPago.push({
            quantity: 1,
            price: mercadoPagoService.reaisParaCentavos(Number(pedido.taxaEntrega)),
            description: 'Taxa de entrega',
          });
        }

        const linkPagamento = await mercadoPagoService.criarLinkPagamento({
          itens: itensMercadoPago,
          order_nsu: pedido.id,
          redirect_url: redirectUrl,
          webhook_url: webhookUrl,
          customer: {
            name: pedido.cliente?.nome || undefined,
            phone_number: telefoneFormatado,
          },
        });

        const atualizado = await prisma.pedido.updateMany({
          where: { id: pedido.id, pagamentoId: null },
          data: { pagamentoId: linkPagamento.id || pedido.id },
        });

        if (atualizado.count > 0) {
          reprocessados += 1;
          await this.registrarTimeline(pedido.id, 'SISTEMA', 'Link de pagamento PIX reprocessado');
          logger.info('Link PIX reprocessado com sucesso', {
            pedidoId: pedido.id,
            pagamentoId: linkPagamento.id || pedido.id,
          });
        }
      } catch (error) {
        falhas += 1;
        logger.warn('Falha ao reprocessar link PIX', {
          pedidoId: pedido.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { total: pedidosSemLink.length, reprocessados, falhas };
  }

  async recuperarCarrinhosAbandonados() {
    if ((process.env.RECOVERY_ENABLED || 'false').toLowerCase() !== 'true') {
      return { total: 0, enviados: 0, falhas: 0 };
    }

    const abandonados = await prisma.pedido.findMany({
      where: {
        status: StatusPedido.ABANDONADO,
        tentativasRecuperacao: { lt: 1 },
      },
      include: {
        cliente: { select: { telefone: true, nome: true } },
      },
      take: 30,
      orderBy: { abandonadoEm: 'asc' },
    });

    let enviados = 0;
    let falhas = 0;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    for (const pedido of abandonados) {
      try {
        if (!pedido.cliente?.telefone) continue;
        const link = `${baseUrl}/pedido/${pedido.id}?token=${pedido.tokenAcesso || ''}`;
        const nome = pedido.cliente.nome || 'cliente';
        const mensagem = `Oi ${nome}, seu pedido ficou pendente e foi pausado. Se quiser retomar rapidinho, use este link: ${link}`;
        const ok = await evolutionService.enviarMensagem({ numero: pedido.cliente.telefone, mensagem });
        if (!ok) {
          falhas += 1;
          continue;
        }

        enviados += 1;
        await prisma.pedido.update({
          where: { id: pedido.id },
          data: {
            tentativasRecuperacao: { increment: 1 },
          },
        });
      } catch (error) {
        falhas += 1;
        logger.warn('Falha ao enviar recovery de carrinho abandonado', {
          pedidoId: pedido.id,
          erro: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { total: abandonados.length, enviados, falhas };
  }

  async enviarNpsPosEntrega() {
    if ((process.env.NPS_ENABLED || 'false').toLowerCase() !== 'true') {
      return { total: 0, enviados: 0, falhas: 0 };
    }

    const atrasoMin = Number(process.env.NPS_DELAY_MINUTES || 120);
    const limite = new Date(Date.now() - atrasoMin * 60 * 1000);
    const elegiveis = await prisma.pedido.findMany({
      where: {
        status: StatusPedido.ENTREGUE,
        statusMudouEm: { lte: limite },
        npsEnviadoEm: null,
      },
      include: {
        cliente: { select: { telefone: true, nome: true } },
      },
      take: 30,
      orderBy: { statusMudouEm: 'asc' },
    });

    let enviados = 0;
    let falhas = 0;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    for (const pedido of elegiveis) {
      try {
        if (!pedido.cliente?.telefone) continue;
        const nome = pedido.cliente.nome || 'cliente';
        const link = `${baseUrl}/pedido/${pedido.id}?token=${pedido.tokenAcesso || ''}#avaliacao`;
        const texto = `Oi ${nome}! Como foi seu pedido? Avalie de 1 a 5 estrelas: ${link}`;
        const ok = await evolutionService.enviarMensagem({ numero: pedido.cliente.telefone, mensagem: texto });
        if (!ok) {
          falhas += 1;
          continue;
        }

        enviados += 1;
        await prisma.pedido.update({
          where: { id: pedido.id },
          data: { npsEnviadoEm: new Date() },
        });
      } catch (error) {
        falhas += 1;
      }
    }

    return { total: elegiveis.length, enviados, falhas };
  }

  async sincronizarExpiracoesCheckout() {
    const intervaloMs = Number(process.env.EXPIRACAO_SYNC_INTERVAL_MS || 15000);
    const agora = Date.now();
    if (this.processandoExpiracao) return;
    if (agora - this.ultimaExecucaoExpiracaoMs < intervaloMs) return;

    this.processandoExpiracao = true;
    this.ultimaExecucaoExpiracaoMs = agora;
    try {
      await this.processarExpiracoesEAbandonos();
      await this.reprocessarPedidosSemLink();
      await this.recuperarCarrinhosAbandonados();
      await this.enviarNpsPosEntrega();
    } finally {
      this.processandoExpiracao = false;
    }
  }

  async obterMetricasAdmin() {
    const { start: inicioDia } = getSaoPauloDayRange();
    const { start: inicioOntem } = getSaoPauloDayRange(new Date(inicioDia.getTime() - 24 * 60 * 60 * 1000));
    const fimOntem = inicioDia;

    const statusesReceita: StatusPedido[] = [
      StatusPedido.CONFIRMADO,
      StatusPedido.PREPARANDO,
      StatusPedido.PRONTO,
      StatusPedido.SAIU_ENTREGA,
      StatusPedido.ENTREGUE,
    ];

    const [porStatus, receitaDia, receitaOntem, pedidosHoje, mensagensNaoLidas, canceladosHoje, entreguesHoje, tempoPreparoRaw, pedidosPronto] = await Promise.all([
      prisma.pedido.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: { criadoEm: { gte: inicioDia }, status: { in: statusesReceita } },
      }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: { criadoEm: { gte: inicioOntem, lt: fimOntem }, status: { in: statusesReceita } },
      }),
      prisma.pedido.count({ where: { criadoEm: { gte: inicioDia } } }),
      prisma.mensagemCliente.count({ where: { origem: 'HUMANO', lida: false } }),
      prisma.pedido.count({ where: { criadoEm: { gte: inicioDia }, status: StatusPedido.CANCELADO } }),
      prisma.pedido.count({ where: { criadoEm: { gte: inicioDia }, status: StatusPedido.ENTREGUE } }),
      // Tempo médio de preparo: diferença entre CONFIRMADO e SAIU_ENTREGA nos pedidos de hoje
      prisma.$queryRaw<Array<{ avg_segundos: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM (atualizado_em - status_mudou_em))) as avg_segundos
        FROM pedidos
        WHERE status = 'ENTREGUE'
          AND criado_em >= ${inicioDia}
      `,
      prisma.pedido.findMany({
        where: { status: StatusPedido.PRONTO },
        select: { tipoAtendimento: true, motoboyId: true, statusMudouEm: true },
      }),
    ]);

    const statusCounts = Object.fromEntries(
      Object.values(StatusPedido).map((status) => [status, 0])
    ) as Record<StatusPedido, number>;

    for (const item of porStatus) {
      statusCounts[item.status] = item._count._all;
    }

    const receitaDiaNum = Number(receitaDia._sum.total || 0);
    const receitaOntemNum = Number(receitaOntem._sum.total || 0);
    const variacaoReceita = receitaOntemNum > 0
      ? Math.round(((receitaDiaNum - receitaOntemNum) / receitaOntemNum) * 100)
      : null;

    const totalHoje = pedidosHoje;
    const taxaCancelamento = totalHoje > 0 ? Math.round((canceladosHoje / totalHoje) * 100) : 0;
    const tempoMedioPreparo = tempoPreparoRaw[0]?.avg_segundos
      ? Math.round(Number(tempoPreparoRaw[0].avg_segundos) / 60)
      : null;

    const agora = Date.now();
    const aguardandoEntregadorList = pedidosPronto.filter(
      (p) => (p.tipoAtendimento ?? TipoAtendimentoPedido.ENTREGA) === TipoAtendimentoPedido.ENTREGA && !p.motoboyId,
    );
    const prontoParaRetiradaCount = pedidosPronto.length - aguardandoEntregadorList.length;
    const tempoMedioAguardandoEntregadorMs = aguardandoEntregadorList.length > 0
      ? Math.round(
          aguardandoEntregadorList.reduce((acc, p) => acc + (agora - (p.statusMudouEm?.getTime() ?? agora)), 0) /
          aguardandoEntregadorList.length,
        )
      : null;

    return {
      total: Object.values(statusCounts).reduce((acc, value) => acc + value, 0),
      pedidosHoje,
      receitaDia: receitaDiaNum,
      receitaOntem: receitaOntemNum,
      variacaoReceita,
      mensagensNaoLidas,
      aguardandoPagamento: statusCounts.AGUARDANDO_PAGAMENTO + statusCounts.PENDENTE,
      aguardandoAprovacao: statusCounts.CONFIRMADO,
      emPreparo: statusCounts.PREPARANDO,
      aguardandoEntregador: aguardandoEntregadorList.length,
      prontoParaRetirada: prontoParaRetiradaCount,
      tempoMedioAguardandoEntregadorMs,
      emRota: statusCounts.SAIU_ENTREGA,
      entregues: statusCounts.ENTREGUE,
      entreguesHoje,
      cancelados: statusCounts.CANCELADO,
      canceladosHoje,
      taxaCancelamento,
      tempoMedioPreparo,
      expirados: statusCounts.EXPIRADO + statusCounts.ABANDONADO,
      porStatus: statusCounts,
      atualizadoEm: new Date().toISOString(),
    };
  }

  async obterFilaUrgente() {
    const agora = Date.now();

    const pedidosAtivos = await prisma.pedido.findMany({
      where: {
        status: {
          in: [
            StatusPedido.AGUARDANDO_PAGAMENTO,
            StatusPedido.PENDENTE,
            StatusPedido.CONFIRMADO,
            StatusPedido.PREPARANDO,
            StatusPedido.PRONTO,
            StatusPedido.SAIU_ENTREGA,
          ],
        },
      },
      include: {
        cliente: { select: { nome: true, telefone: true } },
        itens: { include: { produto: { select: { nome: true } } } },
      },
      orderBy: { statusMudouEm: 'asc' },
    });

    const slaThresholds: Record<string, { warningAt: number; dangerAt: number }> = {
      CONFIRMADO:          { warningAt: 180,  dangerAt: 300  },
      PREPARANDO:          { warningAt: 1500, dangerAt: 2100 },
      PRONTO:              { warningAt: 900,  dangerAt: 1500 },
      SAIU_ENTREGA:        { warningAt: 3000, dangerAt: 3600 },
      AGUARDANDO_PAGAMENTO:{ warningAt: 300,  dangerAt: 600  },
      PENDENTE:            { warningAt: 300,  dangerAt: 600  },
    };

    const telefones = [...new Set(pedidosAtivos.map((p) => p.clienteTelefone))];
    const mensagensSemResposta = telefones.length
      ? await prisma.mensagemCliente.findMany({
          where: {
            clienteTelefone: { in: telefones },
            origem: 'HUMANO',
            lida: false,
          },
          orderBy: { criadoEm: 'asc' },
          select: { clienteTelefone: true, criadoEm: true },
        })
      : [];

    const primeiraMsg = new Map<string, Date>();
    for (const msg of mensagensSemResposta) {
      if (!primeiraMsg.has(msg.clienteTelefone)) {
        primeiraMsg.set(msg.clienteTelefone, msg.criadoEm);
      }
    }

    const estornosPendentes = await prisma.pedido.findMany({
      where: { estornoNecessario: true, estornoRealizadoEm: null },
      select: {
        id: true,
        clienteTelefone: true,
        atualizadoEm: true,
        cliente: { select: { nome: true } },
      },
    });

    type FilaItem = {
      id: string;
      numero: string;
      clienteNome: string;
      clienteTelefone: string;
      tipo: 'PAGAMENTO_PENDENTE' | 'SLA_ESTOURADO' | 'MENSAGEM_SEM_RESPOSTA' | 'ESTORNO_PENDENTE';
      tempoEsperaSegundos: number;
      status: string;
      itensResumo: string[];
    };

    const fila: FilaItem[] = [];
    const tipoPrioridade = {
      PAGAMENTO_PENDENTE: 0,
      SLA_ESTOURADO: 1,
      MENSAGEM_SEM_RESPOSTA: 2,
      ESTORNO_PENDENTE: 3,
    };

    for (const pedido of pedidosAtivos) {
      const baseStatus = pedido.statusMudouEm || pedido.atualizadoEm;
      const tempoNoEstagio = Math.floor((agora - baseStatus.getTime()) / 1000);
      const sla = slaThresholds[pedido.status];
      const itensResumo = pedido.itens.slice(0, 2).map((i) => i.produto?.nome || 'Produto');
      const numero = pedido.id.slice(-6).toUpperCase();

      // Pagamento pendente: pago mas não confirmado pelo operador
      if (
        pedido.status === StatusPedido.AGUARDANDO_PAGAMENTO &&
        pedido.statusPagamento === 'CONFIRMADO' &&
        tempoNoEstagio >= 60
      ) {
        fila.push({
          id: pedido.id,
          numero,
          clienteNome: pedido.cliente?.nome || 'Cliente',
          clienteTelefone: pedido.clienteTelefone,
          tipo: 'PAGAMENTO_PENDENTE',
          tempoEsperaSegundos: tempoNoEstagio,
          status: pedido.status,
          itensResumo,
        });
        continue;
      }

      // SLA estourado
      if (sla && tempoNoEstagio >= sla.dangerAt) {
        fila.push({
          id: pedido.id,
          numero,
          clienteNome: pedido.cliente?.nome || 'Cliente',
          clienteTelefone: pedido.clienteTelefone,
          tipo: 'SLA_ESTOURADO',
          tempoEsperaSegundos: tempoNoEstagio,
          status: pedido.status,
          itensResumo,
        });
        continue;
      }

      // Mensagem sem resposta há mais de 10 min
      const primeiraMsgData = primeiraMsg.get(pedido.clienteTelefone);
      if (primeiraMsgData) {
        const tempoMsg = Math.floor((agora - primeiraMsgData.getTime()) / 1000);
        if (tempoMsg >= 600) {
          fila.push({
            id: pedido.id,
            numero,
            clienteNome: pedido.cliente?.nome || 'Cliente',
            clienteTelefone: pedido.clienteTelefone,
            tipo: 'MENSAGEM_SEM_RESPOSTA',
            tempoEsperaSegundos: tempoMsg,
            status: pedido.status,
            itensResumo,
          });
        }
      }
    }

    // Estornos pendentes (sem pedido ativo necessário)
    for (const pedido of estornosPendentes) {
      const jaNaFila = fila.some((f) => f.id === pedido.id);
      if (!jaNaFila) {
        const tempoEspera = Math.floor((agora - pedido.atualizadoEm.getTime()) / 1000);
        fila.push({
          id: pedido.id,
          numero: pedido.id.slice(-6).toUpperCase(),
          clienteNome: (pedido as any).cliente?.nome || 'Cliente',
          clienteTelefone: pedido.clienteTelefone,
          tipo: 'ESTORNO_PENDENTE',
          tempoEsperaSegundos: tempoEspera,
          status: 'CANCELADO',
          itensResumo: [],
        });
      }
    }

    fila.sort((a, b) => {
      const pa = tipoPrioridade[a.tipo];
      const pb = tipoPrioridade[b.tipo];
      if (pa !== pb) return pa - pb;
      return b.tempoEsperaSegundos - a.tempoEsperaSegundos;
    });

    return fila;
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
