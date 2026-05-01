import prisma from '../config/database';
import { logger } from '../config/logger';
import { StatusPedido, StatusPagamento } from '@prisma/client';

export class RelatorioService {
  async gerarRelatorioDia(data?: Date): Promise<any> {
    const hoje = data || new Date();
    const inicioDia = new Date(hoje);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(hoje);
    fimDia.setHours(23, 59, 59, 999);

    const inicioOntem = new Date(inicioDia);
    inicioOntem.setDate(inicioOntem.getDate() - 1);
    const fimOntem = new Date(inicioDia);

    const statusesReceita: StatusPedido[] = [
      StatusPedido.CONFIRMADO,
      StatusPedido.PREPARANDO,
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
    ] = await Promise.all([
      prisma.pedido.findMany({
        where: { criadoEm: { gte: inicioDia, lte: fimDia } },
        select: {
          id: true,
          status: true,
          total: true,
          canceladoMotivo: true,
          criadoEm: true,
          statusMudouEm: true,
          atualizadoEm: true,
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
    ]);

    const pedidosRecebidos = pedidosHoje.length;
    const pedidosEntregues = pedidosHoje.filter((p) => p.status === StatusPedido.ENTREGUE).length;
    const pedidosCancelados = cancelamentos.length;

    const motivosCancelamento: Record<string, number> = {};
    for (const c of cancelamentos) {
      const motivo = c.canceladoMotivo || 'Sem motivo';
      motivosCancelamento[motivo] = (motivosCancelamento[motivo] || 0) + 1;
    }

    const receitaBrutaNum = Number(receitaBruta._sum.total || 0);
    const receitaOntemNum = Number(receitaOntem._sum.total || 0);
    const ticketMedio = pedidosEntregues > 0 ? receitaBrutaNum / pedidosEntregues : 0;

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

    const relatorio = {
      data: inicioDia,
      pedidosRecebidos,
      pedidosEntregues,
      pedidosCancelados,
      motivosCancelamento,
      tempoMedioPreparo: null as number | null,
      tempoMedioEntrega: null as number | null,
      receitaBruta: receitaBrutaNum,
      ticketMedio,
      receitaOntem: receitaOntemNum,
      mensagensRespondidas,
      mensagensTotal,
      piorHorario,
      produtoMaisVendido: produtoNome,
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
          receitaBruta: receitaBrutaNum,
          ticketMedio,
          receitaOntem: receitaOntemNum,
          mensagensRespondidas,
          mensagensTotal,
          piorHorario,
          produtoMaisVendido: produtoNome,
        },
        create: {
          data: inicioDia,
          pedidosRecebidos,
          pedidosEntregues,
          pedidosCancelados,
          motivosCancelamento,
          receitaBruta: receitaBrutaNum,
          ticketMedio,
          receitaOntem: receitaOntemNum,
          mensagensRespondidas,
          mensagensTotal,
          piorHorario,
          produtoMaisVendido: produtoNome,
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
    }));
  }
}

export default new RelatorioService();
