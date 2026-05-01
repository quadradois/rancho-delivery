import {
  AcaoRecomendada,
  Prisma,
  SeveridadeAlerta,
  StatusAlerta,
  StatusPagamento,
  StatusPedido,
  TipoAlertaOperacional,
} from '@prisma/client';
import prisma from '../config/database';
import { logger } from '../config/logger';
import realtimeService from './realtime.service';

const STATUS_ALERTA_ABERTO: StatusAlerta[] = [StatusAlerta.ABERTO, StatusAlerta.EM_TRATAMENTO];
const STATUS_PEDIDO_ATIVO = [
  StatusPedido.PENDENTE,
  StatusPedido.AGUARDANDO_PAGAMENTO,
  StatusPedido.CONFIRMADO,
  StatusPedido.PREPARANDO,
  StatusPedido.SAIU_ENTREGA,
];

const SLA = {
  clienteSemRespostaAtencao: 120,
  clienteSemRespostaCritico: 300,
  preparoAtencao: 25 * 60,
  preparoCritico: 35 * 60,
  semEntregadorAtencao: 5 * 60,
  semEntregadorCritico: 8 * 60,
};

interface CriarOuAtualizarAlertaInput {
  tipo: TipoAlertaOperacional;
  severidade: SeveridadeAlerta;
  pedidoId?: string | null;
  clienteTelefone?: string | null;
  titulo: string;
  descricao: string;
  motivo: string;
  proximaAcao: AcaoRecomendada;
  acaoPayload?: Prisma.InputJsonValue;
  dedupeKey: string;
  detectadoEm?: Date;
}

interface ListarDecisoesParams {
  status?: StatusAlerta;
  severidade?: SeveridadeAlerta;
  tipo?: TipoAlertaOperacional;
  busca?: string;
  page?: number;
  limit?: number;
}

interface ResolverAlertaInput {
  status?: StatusAlerta;
  motivo?: string;
  resolvidoPor?: string;
}

function segundosDesde(data: Date) {
  return Math.max(0, Math.floor((Date.now() - data.getTime()) / 1000));
}

function severidadeRank(severidade: SeveridadeAlerta) {
  const rank: Record<SeveridadeAlerta, number> = {
    CRITICO: 0,
    ATENCAO: 1,
    INFO: 2,
  };
  return rank[severidade] ?? 99;
}

function statusAbertoWhere() {
  return { in: STATUS_ALERTA_ABERTO };
}

export class DecisaoService {
  private async registrarTimeline(pedidoId: string | null | undefined, ator: string, acao: string) {
    if (!pedidoId) return;

    try {
      await prisma.pedidoTimeline.create({
        data: {
          pedidoId,
          ator,
          acao,
        },
      });
    } catch (error) {
      logger.error('Erro ao registrar timeline de decisao:', { pedidoId, acao, error });
    }
  }

  private emitirDecisao(evento: 'decisao:nova' | 'decisao:atualizada' | 'decisao:resolvida', data: any) {
    realtimeService.emit(evento, data);
  }

  private async criarOuAtualizarAlerta(input: CriarOuAtualizarAlertaInput) {
    const existente = await prisma.alertaOperacional.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });

    if (existente && !STATUS_ALERTA_ABERTO.includes(existente.status)) {
      return { alerta: existente, acao: 'ignorado' as const };
    }

    if (existente) {
      const payloadAtual = JSON.stringify(existente.acaoPayload ?? null);
      const payloadNovo = JSON.stringify(input.acaoPayload ?? null);
      const semMudanca =
        existente.severidade === input.severidade &&
        existente.titulo === input.titulo &&
        existente.descricao === input.descricao &&
        existente.motivo === input.motivo &&
        existente.proximaAcao === input.proximaAcao &&
        payloadAtual === payloadNovo;

      if (semMudanca) {
        return { alerta: existente, acao: 'inalterado' as const };
      }

      const atualizado = await prisma.alertaOperacional.update({
        where: { id: existente.id },
        data: {
          severidade: input.severidade,
          titulo: input.titulo,
          descricao: input.descricao,
          motivo: input.motivo,
          proximaAcao: input.proximaAcao,
          acaoPayload: input.acaoPayload ?? Prisma.JsonNull,
        },
      });

      this.emitirDecisao('decisao:atualizada', {
        id: atualizado.id,
        tipo: atualizado.tipo,
        severidade: atualizado.severidade,
        status: atualizado.status,
        pedidoId: atualizado.pedidoId,
        clienteTelefone: atualizado.clienteTelefone,
      });

      return { alerta: atualizado, acao: 'atualizado' as const };
    }

    const criado = await prisma.alertaOperacional.create({
      data: {
        tipo: input.tipo,
        severidade: input.severidade,
        pedidoId: input.pedidoId || null,
        clienteTelefone: input.clienteTelefone || null,
        titulo: input.titulo,
        descricao: input.descricao,
        motivo: input.motivo,
        proximaAcao: input.proximaAcao,
        acaoPayload: input.acaoPayload ?? Prisma.JsonNull,
        dedupeKey: input.dedupeKey,
        detectadoEm: input.detectadoEm || new Date(),
      },
    });

    await this.registrarTimeline(criado.pedidoId, 'SISTEMA', `Alerta criado: ${criado.titulo}`);
    this.emitirDecisao('decisao:nova', {
      id: criado.id,
      tipo: criado.tipo,
      severidade: criado.severidade,
      status: criado.status,
      pedidoId: criado.pedidoId,
      clienteTelefone: criado.clienteTelefone,
    });

    return { alerta: criado, acao: 'criado' as const };
  }

  private async resolverPorDedupeKey(dedupeKey: string, motivo: string, resolvidoPor = 'SISTEMA') {
    const alerta = await prisma.alertaOperacional.findFirst({
      where: {
        dedupeKey,
        status: statusAbertoWhere(),
      },
    });

    if (!alerta) return null;

    const resolvido = await prisma.alertaOperacional.update({
      where: { id: alerta.id },
      data: {
        status: StatusAlerta.RESOLVIDO,
        resolvidoEm: new Date(),
        resolvidoPor,
        resolucaoMotivo: motivo,
      },
    });

    await this.registrarTimeline(resolvido.pedidoId, resolvidoPor, `Alerta resolvido: ${motivo}`);
    this.emitirDecisao('decisao:resolvida', {
      id: resolvido.id,
      status: resolvido.status,
      pedidoId: resolvido.pedidoId,
      clienteTelefone: resolvido.clienteTelefone,
    });

    return resolvido;
  }

  private async resolverPorPedidoETipo(pedidoId: string, tipo: TipoAlertaOperacional, motivo: string) {
    const alertas = await prisma.alertaOperacional.findMany({
      where: {
        pedidoId,
        tipo,
        status: statusAbertoWhere(),
      },
    });

    for (const alerta of alertas) {
      await this.resolverPorDedupeKey(alerta.dedupeKey, motivo);
    }
  }

  private async resolverClienteSemResposta(clienteTelefone: string, motivo: string, pedidoId?: string | null) {
    const alertas = await prisma.alertaOperacional.findMany({
      where: {
        clienteTelefone,
        tipo: TipoAlertaOperacional.CLIENTE_SEM_RESPOSTA,
        status: statusAbertoWhere(),
        ...(pedidoId ? { pedidoId } : {}),
      },
    });

    for (const alerta of alertas) {
      await this.resolverPorDedupeKey(alerta.dedupeKey, motivo);
    }
  }

  async resolverAlertasClienteSemResposta(clienteTelefone: string, pedidoId?: string | null) {
    await this.resolverClienteSemResposta(clienteTelefone, 'Cliente recebeu atendimento', pedidoId);
  }

  async avaliarPedido(pedidoId: string) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      select: {
        id: true,
        status: true,
        statusPagamento: true,
        statusMudouEm: true,
        criadoEm: true,
        total: true,
        motoboyId: true,
        estornoNecessario: true,
        estornoRealizadoEm: true,
        clienteTelefone: true,
        bairroEntrega: true,
        cliente: {
          select: {
            nome: true,
            telefone: true,
            bairro: true,
          },
        },
      },
    });

    if (!pedido) return { avaliados: 0, criados: 0, atualizados: 0, resolvidos: 0 };

    let criados = 0;
    let atualizados = 0;
    let resolvidos = 0;
    const tempoNoStatus = segundosDesde(pedido.statusMudouEm || pedido.criadoEm);
    const numero = pedido.id.slice(-6).toUpperCase();
    const clienteNome = pedido.cliente?.nome || 'Cliente';
    const clienteTelefone = pedido.cliente?.telefone || pedido.clienteTelefone;

    const registrarResultado = (acao: string) => {
      if (acao === 'criado') criados += 1;
      if (acao === 'atualizado') atualizados += 1;
    };

    const pagoSemConfirmacaoKey = `${TipoAlertaOperacional.PEDIDO_PAGO_SEM_CONFIRMACAO}:${pedido.id}`;
    if (
      pedido.statusPagamento === StatusPagamento.CONFIRMADO &&
      (pedido.status === StatusPedido.AGUARDANDO_PAGAMENTO || pedido.status === StatusPedido.PENDENTE)
    ) {
      const resultado = await this.criarOuAtualizarAlerta({
        tipo: TipoAlertaOperacional.PEDIDO_PAGO_SEM_CONFIRMACAO,
        severidade: SeveridadeAlerta.CRITICO,
        pedidoId: pedido.id,
        clienteTelefone,
        titulo: 'Pedido pago aguardando confirmacao',
        descricao: 'Cliente pagou e o pedido ainda nao foi confirmado.',
        motivo: `Pagamento confirmado ha ${Math.floor(tempoNoStatus / 60)} min e pedido segue em ${pedido.status}.`,
        proximaAcao: AcaoRecomendada.CONFIRMAR_PEDIDO,
        acaoPayload: { pedidoId: pedido.id, status: StatusPedido.CONFIRMADO },
        dedupeKey: pagoSemConfirmacaoKey,
      });
      registrarResultado(resultado.acao);
    } else if (await this.resolverPorDedupeKey(pagoSemConfirmacaoKey, 'Pedido confirmado ou pagamento deixou de exigir acao')) {
      resolvidos += 1;
    }

    if (pedido.status === StatusPedido.PREPARANDO && tempoNoStatus >= SLA.preparoAtencao) {
      const severidade = tempoNoStatus >= SLA.preparoCritico ? SeveridadeAlerta.CRITICO : SeveridadeAlerta.ATENCAO;
      const resultado = await this.criarOuAtualizarAlerta({
        tipo: TipoAlertaOperacional.PREPARO_ATRASADO,
        severidade,
        pedidoId: pedido.id,
        clienteTelefone,
        titulo: 'Pedido em preparo atrasado',
        descricao: 'Pedido esta em preparo acima do SLA operacional.',
        motivo: `Pedido #${numero} esta em preparo ha ${Math.floor(tempoNoStatus / 60)} min.`,
        proximaAcao: AcaoRecomendada.VERIFICAR_COZINHA,
        acaoPayload: { pedidoId: pedido.id },
        dedupeKey: `${TipoAlertaOperacional.PREPARO_ATRASADO}:${pedido.id}`,
      });
      registrarResultado(resultado.acao);
    } else {
      await this.resolverPorPedidoETipo(pedido.id, TipoAlertaOperacional.PREPARO_ATRASADO, 'Pedido saiu do estado de preparo atrasado');
    }

    if (pedido.status === StatusPedido.SAIU_ENTREGA && !pedido.motoboyId && tempoNoStatus >= SLA.semEntregadorAtencao) {
      const severidade = tempoNoStatus >= SLA.semEntregadorCritico ? SeveridadeAlerta.CRITICO : SeveridadeAlerta.ATENCAO;
      const resultado = await this.criarOuAtualizarAlerta({
        tipo: TipoAlertaOperacional.PEDIDO_SEM_ENTREGADOR,
        severidade,
        pedidoId: pedido.id,
        clienteTelefone,
        titulo: 'Pedido sem entregador atribuido',
        descricao: 'Pedido esta em rota/despacho sem motoboy vinculado.',
        motivo: `Pedido #${numero} esta sem entregador ha ${Math.floor(tempoNoStatus / 60)} min.`,
        proximaAcao: AcaoRecomendada.ATRIBUIR_ENTREGADOR,
        acaoPayload: { pedidoId: pedido.id },
        dedupeKey: `${TipoAlertaOperacional.PEDIDO_SEM_ENTREGADOR}:${pedido.id}`,
      });
      registrarResultado(resultado.acao);
    } else {
      await this.resolverPorPedidoETipo(pedido.id, TipoAlertaOperacional.PEDIDO_SEM_ENTREGADOR, 'Pedido recebeu entregador ou saiu do despacho');
    }

    const estornoKey = `${TipoAlertaOperacional.ESTORNO_NECESSARIO}:${pedido.id}`;
    if (pedido.estornoNecessario && !pedido.estornoRealizadoEm) {
      const resultado = await this.criarOuAtualizarAlerta({
        tipo: TipoAlertaOperacional.ESTORNO_NECESSARIO,
        severidade: SeveridadeAlerta.CRITICO,
        pedidoId: pedido.id,
        clienteTelefone,
        titulo: 'Estorno pendente',
        descricao: 'Pedido cancelado com pagamento confirmado exige acompanhamento financeiro.',
        motivo: `Pedido #${numero} de ${clienteNome} esta com estorno necessario.`,
        proximaAcao: AcaoRecomendada.MARCAR_ESTORNO,
        acaoPayload: { pedidoId: pedido.id },
        dedupeKey: estornoKey,
      });
      registrarResultado(resultado.acao);
    } else if (await this.resolverPorDedupeKey(estornoKey, 'Estorno concluido ou deixou de ser necessario')) {
      resolvidos += 1;
    }

    return { avaliados: 1, criados, atualizados, resolvidos };
  }

  async avaliarPedidoSeguro(pedidoId: string) {
    try {
      return await this.avaliarPedido(pedidoId);
    } catch (error) {
      logger.error('Erro ao avaliar decisoes do pedido:', { pedidoId, error });
      return { avaliados: 0, criados: 0, atualizados: 0, resolvidos: 0 };
    }
  }

  private async buscarPedidoAtivoDoCliente(clienteTelefone: string) {
    return prisma.pedido.findFirst({
      where: {
        clienteTelefone,
        status: { in: STATUS_PEDIDO_ATIVO },
      },
      orderBy: { criadoEm: 'desc' },
      select: { id: true, status: true },
    });
  }

  async avaliarMensagensCliente(clienteTelefone: string, pedidoId?: string | null) {
    const mensagem = await prisma.mensagemCliente.findFirst({
      where: {
        clienteTelefone,
        origem: 'HUMANO',
        lida: false,
        ...(pedidoId ? { pedidoId } : {}),
      },
      orderBy: { criadoEm: 'asc' },
    });

    if (!mensagem) {
      await this.resolverClienteSemResposta(clienteTelefone, 'Nao existem mensagens humanas pendentes', pedidoId);
      return { avaliados: 1, criados: 0, atualizados: 0, resolvidos: 0 };
    }

    const tempoPendente = segundosDesde(mensagem.criadoEm);
    if (tempoPendente < SLA.clienteSemRespostaAtencao) {
      return { avaliados: 1, criados: 0, atualizados: 0, resolvidos: 0 };
    }

    const pedidoAtivo = pedidoId ? { id: pedidoId } : await this.buscarPedidoAtivoDoCliente(clienteTelefone);
    const alertaPedidoId = pedidoId || pedidoAtivo?.id || mensagem.pedidoId || null;
    const severidade =
      tempoPendente >= SLA.clienteSemRespostaCritico ? SeveridadeAlerta.CRITICO : SeveridadeAlerta.ATENCAO;

    const resultado = await this.criarOuAtualizarAlerta({
      tipo: TipoAlertaOperacional.CLIENTE_SEM_RESPOSTA,
      severidade,
      pedidoId: alertaPedidoId,
      clienteTelefone,
      titulo: 'Cliente aguardando resposta',
      descricao: 'Existe mensagem humana nao lida acima do SLA de atendimento.',
      motivo: `Cliente aguarda resposta ha ${Math.floor(tempoPendente / 60)} min.`,
      proximaAcao: AcaoRecomendada.RESPONDER_CLIENTE,
      acaoPayload: { telefone: clienteTelefone, pedidoId: alertaPedidoId },
      dedupeKey: `${TipoAlertaOperacional.CLIENTE_SEM_RESPOSTA}:${clienteTelefone}:${alertaPedidoId || 'GLOBAL'}:${mensagem.id}`,
      detectadoEm: mensagem.criadoEm,
    });

    return {
      avaliados: 1,
      criados: resultado.acao === 'criado' ? 1 : 0,
      atualizados: resultado.acao === 'atualizado' ? 1 : 0,
      resolvidos: 0,
    };
  }

  async registrarFalhaWhatsApp(motivo: string) {
    return this.criarOuAtualizarAlerta({
      tipo: TipoAlertaOperacional.FALHA_ENVIO_WHATSAPP,
      severidade: SeveridadeAlerta.CRITICO,
      titulo: 'Falha no WhatsApp',
      descricao: 'Uma mensagem operacional nao foi enviada pelo WhatsApp.',
      motivo,
      proximaAcao: AcaoRecomendada.RECONECTAR_WHATSAPP,
      acaoPayload: { origem: 'WHATSAPP' },
      dedupeKey: `${TipoAlertaOperacional.FALHA_ENVIO_WHATSAPP}:GLOBAL`,
    });
  }

  async recalcularAbertos() {
    const resultado = { avaliados: 0, criados: 0, atualizados: 0, resolvidos: 0 };

    const pedidos = await prisma.pedido.findMany({
      where: {
        OR: [
          { status: { in: STATUS_PEDIDO_ATIVO } },
          { estornoNecessario: true, estornoRealizadoEm: null },
        ],
      },
      select: { id: true },
      orderBy: { criadoEm: 'desc' },
      take: 250,
    });

    for (const pedido of pedidos) {
      const parcial = await this.avaliarPedidoSeguro(pedido.id);
      resultado.avaliados += parcial.avaliados;
      resultado.criados += parcial.criados;
      resultado.atualizados += parcial.atualizados;
      resultado.resolvidos += parcial.resolvidos;
    }

    const mensagensPendentes = await prisma.mensagemCliente.findMany({
      where: {
        origem: 'HUMANO',
        lida: false,
        criadoEm: { lte: new Date(Date.now() - SLA.clienteSemRespostaAtencao * 1000) },
      },
      select: { clienteTelefone: true, pedidoId: true },
      orderBy: { criadoEm: 'asc' },
      take: 250,
    });
    const chavesAvaliadas = new Set<string>();

    for (const mensagem of mensagensPendentes) {
      const chave = `${mensagem.clienteTelefone}:${mensagem.pedidoId || 'GLOBAL'}`;
      if (chavesAvaliadas.has(chave)) continue;
      chavesAvaliadas.add(chave);

      const parcial = await this.avaliarMensagensCliente(mensagem.clienteTelefone, mensagem.pedidoId);
      resultado.avaliados += parcial.avaliados;
      resultado.criados += parcial.criados;
      resultado.atualizados += parcial.atualizados;
      resultado.resolvidos += parcial.resolvidos;
    }

    return resultado;
  }

  async listarDecisoes(params: ListarDecisoesParams = {}) {
    await this.recalcularAbertos();

    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 30)));
    const where: Prisma.AlertaOperacionalWhereInput = {
      ...(params.status ? { status: params.status } : { status: statusAbertoWhere() }),
      ...(params.severidade ? { severidade: params.severidade } : {}),
      ...(params.tipo ? { tipo: params.tipo } : {}),
    };

    if (params.busca?.trim()) {
      const busca = params.busca.trim();
      where.OR = [
        { titulo: { contains: busca, mode: 'insensitive' } },
        { descricao: { contains: busca, mode: 'insensitive' } },
        { motivo: { contains: busca, mode: 'insensitive' } },
        { clienteTelefone: { contains: busca } },
        { pedido: { id: { contains: busca } } },
        { pedido: { cliente: { nome: { contains: busca, mode: 'insensitive' } } } },
      ];
    }

    const alertas = await prisma.alertaOperacional.findMany({
      where,
      include: {
        pedido: {
          select: {
            id: true,
            status: true,
            statusPagamento: true,
            statusMudouEm: true,
            criadoEm: true,
            total: true,
            bairroEntrega: true,
            cliente: {
              select: {
                nome: true,
                telefone: true,
                bairro: true,
              },
            },
          },
        },
      },
      orderBy: { detectadoEm: 'asc' },
      take: 500,
    });

    const ordenados = alertas.sort((a, b) => {
      const severidade = severidadeRank(a.severidade) - severidadeRank(b.severidade);
      if (severidade !== 0) return severidade;
      return a.detectadoEm.getTime() - b.detectadoEm.getTime();
    });

    const total = ordenados.length;
    const items = ordenados.slice((page - 1) * limit, page * limit).map((alerta) => ({
      id: alerta.id,
      tipo: alerta.tipo,
      severidade: alerta.severidade,
      status: alerta.status,
      titulo: alerta.titulo,
      descricao: alerta.descricao,
      motivo: alerta.motivo,
      proximaAcao: alerta.proximaAcao,
      acaoPayload: alerta.acaoPayload,
      tempoPendenteSegundos: alerta.resolvidoEm ? 0 : segundosDesde(alerta.detectadoEm),
      detectadoEm: alerta.detectadoEm.toISOString(),
      atualizadoEm: alerta.atualizadoEm.toISOString(),
      resolvidoEm: alerta.resolvidoEm?.toISOString() || null,
      pedido: alerta.pedido
        ? {
            id: alerta.pedido.id,
            numero: alerta.pedido.id.slice(-6).toUpperCase(),
            status: alerta.pedido.status,
            statusPagamento: alerta.pedido.statusPagamento,
            clienteNome: alerta.pedido.cliente?.nome || 'Cliente',
            clienteTelefone: alerta.pedido.cliente?.telefone || alerta.clienteTelefone || '',
            bairro: alerta.pedido.bairroEntrega || alerta.pedido.cliente?.bairro || '',
            total: Number(alerta.pedido.total),
            tempoNoEstagio: segundosDesde(alerta.pedido.statusMudouEm || alerta.pedido.criadoEm),
          }
        : null,
      clienteTelefone: alerta.clienteTelefone,
    }));

    return {
      items,
      pagination: { page, limit, total },
    };
  }

  async obterMetricas() {
    await this.recalcularAbertos();

    const alertas = await prisma.alertaOperacional.findMany({
      where: { status: statusAbertoWhere() },
      select: { tipo: true, severidade: true },
    });

    return {
      abertos: alertas.length,
      criticos: alertas.filter((a) => a.severidade === SeveridadeAlerta.CRITICO).length,
      atencao: alertas.filter((a) => a.severidade === SeveridadeAlerta.ATENCAO).length,
      clientesSemResposta: alertas.filter((a) => a.tipo === TipoAlertaOperacional.CLIENTE_SEM_RESPOSTA).length,
      pagosSemConfirmacao: alertas.filter((a) => a.tipo === TipoAlertaOperacional.PEDIDO_PAGO_SEM_CONFIRMACAO).length,
      preparoAtrasado: alertas.filter((a) => a.tipo === TipoAlertaOperacional.PREPARO_ATRASADO).length,
      estornosPendentes: alertas.filter((a) => a.tipo === TipoAlertaOperacional.ESTORNO_NECESSARIO).length,
      whatsappDisponivel: null,
      atualizadoEm: new Date().toISOString(),
    };
  }

  async buscarPorId(id: string) {
    const alerta = await prisma.alertaOperacional.findUnique({
      where: { id },
      include: {
        pedido: {
          include: {
            cliente: { select: { nome: true, telefone: true, endereco: true, bairro: true } },
            itens: { include: { produto: { select: { nome: true } } } },
            timeline: { orderBy: { criadoEm: 'asc' } },
          },
        },
      },
    });

    if (!alerta) return null;

    return {
      id: alerta.id,
      tipo: alerta.tipo,
      severidade: alerta.severidade,
      status: alerta.status,
      titulo: alerta.titulo,
      descricao: alerta.descricao,
      motivo: alerta.motivo,
      proximaAcao: alerta.proximaAcao,
      acaoPayload: alerta.acaoPayload,
      detectadoEm: alerta.detectadoEm.toISOString(),
      resolvidoEm: alerta.resolvidoEm?.toISOString() || null,
      pedido: alerta.pedido
        ? {
            id: alerta.pedido.id,
            numero: alerta.pedido.id.slice(-6).toUpperCase(),
            status: alerta.pedido.status,
            statusPagamento: alerta.pedido.statusPagamento,
            cliente: alerta.pedido.cliente,
            itens: alerta.pedido.itens.map((item) => ({
              id: item.id,
              quantidade: item.quantidade,
              produtoNome: item.produto?.nome || 'Produto',
              subtotal: Number(item.subtotal),
            })),
            total: Number(alerta.pedido.total),
            timeline: alerta.pedido.timeline.map((item) => ({
              timestamp: item.criadoEm.toISOString(),
              ator: item.ator,
              acao: item.acao,
            })),
          }
        : null,
    };
  }

  async atualizarStatusAlerta(id: string, status: StatusAlerta) {
    const alerta = await prisma.alertaOperacional.findUnique({ where: { id } });
    if (!alerta) throw new Error('DECISAO_NAO_ENCONTRADA');
    if (!STATUS_ALERTA_ABERTO.includes(alerta.status)) throw new Error('DECISAO_JA_RESOLVIDA');
    if (status === StatusAlerta.RESOLVIDO || status === StatusAlerta.IGNORADO) {
      return this.resolverAlerta(id, { status, motivo: status === StatusAlerta.IGNORADO ? undefined : 'Resolvido pelo operador' });
    }
    if (status !== StatusAlerta.EM_TRATAMENTO && status !== StatusAlerta.ABERTO) {
      throw new Error('TRANSICAO_DECISAO_INVALIDA');
    }

    const atualizado = await prisma.alertaOperacional.update({
      where: { id },
      data: { status },
    });

    this.emitirDecisao('decisao:atualizada', {
      id: atualizado.id,
      tipo: atualizado.tipo,
      severidade: atualizado.severidade,
      status: atualizado.status,
      pedidoId: atualizado.pedidoId,
      clienteTelefone: atualizado.clienteTelefone,
    });

    return atualizado;
  }

  async resolverAlerta(id: string, input: ResolverAlertaInput = {}) {
    const alerta = await prisma.alertaOperacional.findUnique({ where: { id } });
    if (!alerta) throw new Error('DECISAO_NAO_ENCONTRADA');
    if (!STATUS_ALERTA_ABERTO.includes(alerta.status)) throw new Error('DECISAO_JA_RESOLVIDA');

    const novoStatus = input.status || StatusAlerta.RESOLVIDO;
    const motivo = input.motivo?.trim();
    if (novoStatus === StatusAlerta.IGNORADO && !motivo) {
      throw new Error('MOTIVO_OBRIGATORIO');
    }

    const atualizado = await prisma.alertaOperacional.update({
      where: { id },
      data: {
        status: novoStatus,
        resolvidoEm: new Date(),
        resolvidoPor: input.resolvidoPor || 'admin',
        resolucaoMotivo: motivo || (novoStatus === StatusAlerta.RESOLVIDO ? 'Resolvido pelo operador' : 'Ignorado pelo operador'),
      },
    });

    await this.registrarTimeline(
      atualizado.pedidoId,
      input.resolvidoPor || 'OPERADOR',
      `Alerta ${novoStatus === StatusAlerta.RESOLVIDO ? 'resolvido' : 'ignorado'}: ${atualizado.titulo}`
    );
    this.emitirDecisao('decisao:resolvida', {
      id: atualizado.id,
      status: atualizado.status,
      pedidoId: atualizado.pedidoId,
      clienteTelefone: atualizado.clienteTelefone,
    });

    return atualizado;
  }
}

export default new DecisaoService();
