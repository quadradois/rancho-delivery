import prisma from '../config/database';
import { logger } from '../config/logger';
import { StatusPedido, TipoAtendimentoPedido } from '@prisma/client';
import { getSaoPauloDayRange } from '../utils/timezone';

export class RelatorioService {
  async gerarRelatorioDia(data?: Date): Promise<any> {
    const hoje = data || new Date();
    const { start: inicioDia, end: fimDia } = getSaoPauloDayRange(hoje);
    const { start: inicioOntem } = getSaoPauloDayRange(new Date(inicioDia.getTime() - 24 * 60 * 60 * 1000));
    const fimOntem = inicioDia;

    const statusesReceita: StatusPedido[] = [
      StatusPedido.CONFIRMADO,
      StatusPedido.PREPARANDO,
      StatusPedido.PRONTO,
      StatusPedido.SAIU_ENTREGA,
      StatusPedido.ENTREGUE,
    ];

    const [
      pedidosHoje,
      receitaBruta,
      receitaOntem,
      cancelamentos,
      mensagensTotal,
      mensagensRespondidas,
      produtoMaisVendido,
      pedidosPorHora,
      timelineEvents,
    ] = await Promise.all([
      prisma.pedido.findMany({
        where: { criadoEm: { gte: inicioDia, lte: fimDia } },
        select: {
          id: true,
          status: true,
          total: true,
          tipoAtendimento: true,
          taxaEntrega: true,
          canceladoMotivo: true,
          criadoEm: true,
          statusMudouEm: true,
          motoboy: { select: { nome: true } },
          observacaoEntrega: true,
        },
      }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: { criadoEm: { gte: inicioDia, lte: fimDia }, status: { in: statusesReceita } },
      }),
      prisma.pedido.aggregate({
        _sum: { total: true },
        where: { criadoEm: { gte: inicioOntem, lt: fimOntem }, status: { in: statusesReceita } },
      }),
      prisma.pedido.findMany({
        where: { criadoEm: { gte: inicioDia, lte: fimDia }, status: StatusPedido.CANCELADO },
        select: { canceladoMotivo: true },
      }),
      prisma.mensagemCliente.count({
        where: { criadoEm: { gte: inicioDia, lte: fimDia }, origem: 'HUMANO' },
      }),
      prisma.mensagemCliente.count({
        where: { criadoEm: { gte: inicioDia, lte: fimDia }, origem: 'HUMANO', lida: true },
      }),
      prisma.itemPedido.groupBy({
        by: ['produtoId'],
        where: { pedido: { criadoEm: { gte: inicioDia, lte: fimDia }, status: { in: statusesReceita } } },
        _sum: { quantidade: true },
        orderBy: { _sum: { quantidade: 'desc' } },
        take: 1,
      }),
      prisma.$queryRaw<Array<{ hora: number; total: bigint }>>`
        SELECT EXTRACT(HOUR FROM criado_em) as hora, COUNT(*) as total
        FROM pedidos
        WHERE criado_em >= ${inicioDia} AND criado_em <= ${fimDia}
        GROUP BY hora
        ORDER BY total DESC
        LIMIT 1
      `,
      prisma.pedidoTimeline.findMany({
        where: { pedido: { criadoEm: { gte: inicioDia, lte: fimDia } } },
        select: { pedidoId: true, acao: true, criadoEm: true },
        orderBy: [{ pedidoId: 'asc' }, { criadoEm: 'asc' }],
      }),
    ]);

    const pedidosRecebidos = pedidosHoje.length;
    const pedidosEntregues = pedidosHoje.filter((p) => p.status === StatusPedido.ENTREGUE).length;
    const pedidosCancelados = cancelamentos.length;
    const entregasConcluidas = pedidosHoje.filter(
      (p) => p.status === StatusPedido.ENTREGUE && p.tipoAtendimento === TipoAtendimentoPedido.ENTREGA
    );

    const motivosCancelamento: Record<string, number> = {};
    for (const c of cancelamentos) {
      const motivo = c.canceladoMotivo || 'Sem motivo';
      motivosCancelamento[motivo] = (motivosCancelamento[motivo] || 0) + 1;
    }

    const receitaBrutaNum = Number(receitaBruta._sum.total || 0);
    const receitaOntemNum = Number(receitaOntem._sum.total || 0);
    const ticketMedio = pedidosEntregues > 0 ? receitaBrutaNum / pedidosEntregues : 0;
    const taxaEntregaTotal = entregasConcluidas.reduce((acc, p) => acc + Number(p.taxaEntrega || 0), 0);

    const entregasResponsavelMap = new Map<string, { responsavel: string; quantidade: number; taxaTotal: number }>();
    const entregasPorHoraMap = new Map<string, number>();
    for (const entrega of entregasConcluidas) {
      const hora = `${String(new Date(entrega.statusMudouEm).getHours()).padStart(2, '0')}h`;
      entregasPorHoraMap.set(hora, (entregasPorHoraMap.get(hora) || 0) + 1);

      const responsavel = entrega.motoboy?.nome
        || (entrega.observacaoEntrega?.startsWith('TERCEIRIZADA:') ? entrega.observacaoEntrega.replace('TERCEIRIZADA:', '').trim() : null)
        || 'Não informado';
      const atual = entregasResponsavelMap.get(responsavel) || { responsavel, quantidade: 0, taxaTotal: 0 };
      atual.quantidade += 1;
      atual.taxaTotal += Number(entrega.taxaEntrega || 0);
      entregasResponsavelMap.set(responsavel, atual);
    }
    const entregasPorResponsavel = Array.from(entregasResponsavelMap.values()).sort((a, b) => b.quantidade - a.quantidade);
    const entregasPorHora = Array.from(entregasPorHoraMap.entries())
      .map(([hora, quantidade]) => ({ hora, quantidade }))
      .sort((a, b) => a.hora.localeCompare(b.hora));

    const piorHorario = pedidosPorHora[0]
      ? `${String(pedidosPorHora[0].hora).padStart(2, '0')}h`
      : null;

    let produtoNome: string | null = null;
    if (produtoMaisVendido[0]) {
      const produto = await prisma.produto.findUnique({
        where: { id: produtoMaisVendido[0].produtoId },
        select: { nome: true },
      });
      produtoNome = produto?.nome || null;
    }

    // Compute average time per stage from order timelines
    const STATUS_SEQUENCE = ['AGUARDANDO_PAGAMENTO', 'CONFIRMADO', 'PREPARANDO', 'PRONTO', 'SAIU_ENTREGA', 'ENTREGUE'];
    const stageAccum: Record<string, { total: number; count: number }> = {};
    for (const s of STATUS_SEQUENCE) stageAccum[s] = { total: 0, count: 0 };

    const byPedido = new Map<string, Array<{ pedidoId: string; acao: string; criadoEm: Date }>>();
    for (const ev of timelineEvents) {
      if (!byPedido.has(ev.pedidoId)) byPedido.set(ev.pedidoId, []);
      byPedido.get(ev.pedidoId)!.push(ev);
    }

    for (const [, events] of byPedido) {
      let currentStatus: string | null = null;
      let stageStart: number | null = null;

      for (const ev of events) {
        const status = STATUS_SEQUENCE.find(s => ev.acao.toUpperCase().includes(s));
        if (status) {
          if (currentStatus && stageStart !== null) {
            const duration = (new Date(ev.criadoEm).getTime() - stageStart) / 1000;
            if (duration > 0 && duration < 86400) {
              stageAccum[currentStatus].total += duration;
              stageAccum[currentStatus].count += 1;
            }
          }
          currentStatus = status;
          stageStart = new Date(ev.criadoEm).getTime();
        } else if (!currentStatus && ev.acao.toLowerCase().includes('criado')) {
          currentStatus = 'AGUARDANDO_PAGAMENTO';
          stageStart = new Date(ev.criadoEm).getTime();
        }
      }
    }

    const tempoMedioPorEtapa = STATUS_SEQUENCE
      .filter(s => stageAccum[s].count > 0)
      .map(s => ({
        status: s,
        mediaSegundos: Math.round(stageAccum[s].total / stageAccum[s].count),
        amostras: stageAccum[s].count,
      }));

    const tempoMedioPreparoCalculado = stageAccum['PREPARANDO'].count > 0
      ? Math.round(stageAccum['PREPARANDO'].total / stageAccum['PREPARANDO'].count)
      : null;
    const tempoMedioEntregaCalculado = stageAccum['SAIU_ENTREGA'].count > 0
      ? Math.round(stageAccum['SAIU_ENTREGA'].total / stageAccum['SAIU_ENTREGA'].count)
      : null;

    const relatorio = {
      data: inicioDia,
      pedidosRecebidos,
      pedidosEntregues,
      pedidosCancelados,
      motivosCancelamento,
      tempoMedioPreparo: tempoMedioPreparoCalculado,
      tempoMedioEntrega: tempoMedioEntregaCalculado,
      tempoMedioPorEtapa,
      receitaBruta: receitaBrutaNum,
      ticketMedio,
      receitaOntem: receitaOntemNum,
      mensagensRespondidas,
      mensagensTotal,
      piorHorario,
      produtoMaisVendido: produtoNome,
      entregasRealizadas: entregasConcluidas.length,
      taxaEntregaTotal,
      entregasPorResponsavel,
      entregasPorHora,
    };

    // Salvar snapshot
    try {
      await prisma.relatorioDia.upsert({
        where: { data: inicioDia },
        update: {
          pedidosRecebidos,
          pedidosEntregues,
          pedidosCancelados,
          motivosCancelamento,
          tempoMedioPreparo: tempoMedioPreparoCalculado,
          tempoMedioEntrega: tempoMedioEntregaCalculado,
          receitaBruta: receitaBrutaNum,
          ticketMedio,
          receitaOntem: receitaOntemNum,
          mensagensRespondidas,
          mensagensTotal,
          piorHorario,
          produtoMaisVendido: produtoNome,
          entregasRealizadas: entregasConcluidas.length,
          taxaEntregaTotal,
          entregasPorResponsavel,
          entregasPorHora,
        },
        create: {
          data: inicioDia,
          pedidosRecebidos,
          pedidosEntregues,
          pedidosCancelados,
          motivosCancelamento,
          tempoMedioPreparo: tempoMedioPreparoCalculado,
          tempoMedioEntrega: tempoMedioEntregaCalculado,
          receitaBruta: receitaBrutaNum,
          ticketMedio,
          receitaOntem: receitaOntemNum,
          mensagensRespondidas,
          mensagensTotal,
          piorHorario,
          produtoMaisVendido: produtoNome,
          entregasRealizadas: entregasConcluidas.length,
          taxaEntregaTotal,
          entregasPorResponsavel,
          entregasPorHora,
        },
      });
    } catch (err) {
      logger.warn('Nao foi possivel salvar snapshot do relatorio:', err);
    }

    return relatorio;
  }

  async listarRelatorios(limite = 30) {
    const relatorios = await prisma.relatorioDia.findMany({
      orderBy: { data: 'desc' },
      take: Math.min(90, limite),
    });

    return relatorios.map((r) => ({
      ...r,
      receitaBruta: Number(r.receitaBruta),
      ticketMedio: Number(r.ticketMedio),
      receitaOntem: r.receitaOntem ? Number(r.receitaOntem) : null,
      taxaEntregaTotal: Number(r.taxaEntregaTotal),
    }));
  }
}

export default new RelatorioService();
