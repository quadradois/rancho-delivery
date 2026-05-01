import prisma from '../config/database';
import { StatusPedido } from '@prisma/client';

export type TipoSugestao =
  | 'PREPARO_ACIMA_MEDIA'
  | 'AGRUPAR_ENTREGAS'
  | 'CLIENTE_INATIVO'
  | 'CANCELAMENTOS_ITEM'
  | 'TODOS_MOTOBOYS_OCUPADOS'
  | 'WHATSAPP_ACUMULADO';

export interface Sugestao {
  id: string;
  tipo: TipoSugestao;
  texto: string;
  acao?: string;
  dados?: Record<string, any>;
  criadaEm: string;
}

export class IaService {
  async gerarSugestoes(): Promise<Sugestao[]> {
    const sugestoes: Sugestao[] = [];
    const agora = new Date();
    const inicioDia = new Date(agora);
    inicioDia.setHours(0, 0, 0, 0);

    // 1. Preparo acima da média
    const pedidosEmPreparo = await prisma.pedido.findMany({
      where: { status: StatusPedido.PREPARANDO },
      select: { id: true, statusMudouEm: true, atualizadoEm: true },
    });

    if (pedidosEmPreparo.length > 0) {
      const tempoMedioHoje = await prisma.$queryRaw<Array<{ avg_min: number | null }>>`
        SELECT AVG(EXTRACT(EPOCH FROM (atualizado_em - status_mudou_em)) / 60) as avg_min
        FROM pedidos
        WHERE status = 'ENTREGUE'
          AND criado_em >= ${inicioDia}
      `;
      const mediaMin = tempoMedioHoje[0]?.avg_min;

      if (mediaMin && mediaMin > 0) {
        const acimaDaMedia = pedidosEmPreparo.filter((p) => {
          const base = p.statusMudouEm || p.atualizadoEm;
          const minutos = (agora.getTime() - base.getTime()) / 60000;
          return minutos > mediaMin * 1.4;
        });

        if (acimaDaMedia.length > 0) {
          sugestoes.push({
            id: `preparo-${Date.now()}`,
            tipo: 'PREPARO_ACIMA_MEDIA',
            texto: `${acimaDaMedia.length} pedido${acimaDaMedia.length > 1 ? 's' : ''} em preparo ${Math.round(acimaDaMedia.length > 1 ? 40 : 40)}% acima da média hoje (${Math.round(mediaMin)}min) — possível problema na cozinha`,
            dados: { pedidoIds: acimaDaMedia.map((p) => p.id), mediaMin: Math.round(mediaMin) },
            criadaEm: agora.toISOString(),
          });
        }
      }
    }

    // 2. Agrupar entregas por bairro
    const pedidosProntos = await prisma.pedido.findMany({
      where: {
        status: StatusPedido.PREPARANDO,
        motoboyId: null,
      },
      select: { id: true, bairroEntrega: true, clienteTelefone: true },
      include: { cliente: { select: { bairro: true } } },
    });

    const porBairro: Record<string, number> = {};
    for (const p of pedidosProntos) {
      const bairro = p.bairroEntrega || (p as any).cliente?.bairro || 'Desconhecido';
      porBairro[bairro] = (porBairro[bairro] || 0) + 1;
    }

    const bairrosComMultiplos = Object.entries(porBairro).filter(([, qtd]) => qtd >= 2);
    for (const [bairro, qtd] of bairrosComMultiplos) {
      sugestoes.push({
        id: `agrupar-${bairro}-${Date.now()}`,
        tipo: 'AGRUPAR_ENTREGAS',
        texto: `${qtd} pedidos prontos para o bairro ${bairro} — considere agrupar na mesma entrega`,
        dados: { bairro, quantidade: qtd },
        criadaEm: agora.toISOString(),
      });
    }

    // 3. Clientes inativos (sem pedir há 21+ dias com histórico)
    const limite21dias = new Date(agora.getTime() - 21 * 24 * 60 * 60 * 1000);
    const clientesInativos = await prisma.pedido.groupBy({
      by: ['clienteTelefone'],
      _max: { criadoEm: true },
      _count: { _all: true },
      having: {
        _count: { _all: { gte: 3 } },
      },
    });

    const inativos = clientesInativos.filter(
      (c) => c._max.criadoEm && c._max.criadoEm < limite21dias
    );

    if (inativos.length > 0) {
      sugestoes.push({
        id: `inativos-${Date.now()}`,
        tipo: 'CLIENTE_INATIVO',
        texto: `${inativos.length} cliente${inativos.length > 1 ? 's' : ''} com 3+ pedidos não pede${inativos.length > 1 ? 'm' : ''} há 21+ dias — considere reativação via WhatsApp`,
        dados: { total: inativos.length, telefones: inativos.slice(0, 5).map((c) => c.clienteTelefone) },
        criadaEm: agora.toISOString(),
      });
    }

    // 4. Cancelamentos por item indisponível
    const cancelamentosHoje = await prisma.pedido.findMany({
      where: {
        status: StatusPedido.CANCELADO,
        criadoEm: { gte: inicioDia },
        canceladoMotivo: { contains: 'indispon', mode: 'insensitive' },
      },
      select: { id: true, canceladoMotivo: true },
    });

    if (cancelamentosHoje.length >= 2) {
      sugestoes.push({
        id: `cancelamentos-item-${Date.now()}`,
        tipo: 'CANCELAMENTOS_ITEM',
        texto: `${cancelamentosHoje.length} cancelamentos hoje com motivo de item indisponível — verifique o estoque`,
        dados: { total: cancelamentosHoje.length },
        criadaEm: agora.toISOString(),
      });
    }

    // 5. Todos motoboys ocupados com pedido aguardando
    const [motoboysTotais, motoboysOcupados, pedidosSemMotoboy] = await Promise.all([
      prisma.motoboy.count({ where: { status: { not: 'INATIVO' } } }),
      prisma.motoboy.count({ where: { status: 'EM_ENTREGA' } }),
      prisma.pedido.count({
        where: {
          status: { in: [StatusPedido.PREPARANDO, StatusPedido.CONFIRMADO] },
          motoboyId: null,
        },
      }),
    ]);

    if (motoboysTotais > 0 && motoboysOcupados >= motoboysTotais && pedidosSemMotoboy > 0) {
      sugestoes.push({
        id: `motoboys-ocupados-${Date.now()}`,
        tipo: 'TODOS_MOTOBOYS_OCUPADOS',
        texto: `Todos os ${motoboysTotais} entregadores estão em rota e há ${pedidosSemMotoboy} pedido${pedidosSemMotoboy > 1 ? 's' : ''} aguardando entregador`,
        dados: { motoboysTotais, pedidosSemMotoboy },
        criadaEm: agora.toISOString(),
      });
    }

    // 6. WhatsApp acumulado
    const mensagensNaoLidas = await prisma.mensagemCliente.count({
      where: { origem: 'HUMANO', lida: false },
    });

    if (mensagensNaoLidas >= 5) {
      sugestoes.push({
        id: `whatsapp-${Date.now()}`,
        tipo: 'WHATSAPP_ACUMULADO',
        texto: `${mensagensNaoLidas} mensagens de clientes sem resposta — verifique a central de WhatsApp`,
        dados: { total: mensagensNaoLidas },
        criadaEm: agora.toISOString(),
      });
    }

    // Limitar a 3 sugestões mais relevantes
    return sugestoes.slice(0, 3);
  }
}

export default new IaService();
