import prisma from '../config/database';
import { StatusPedido, TipoAtendimentoPedido } from '@prisma/client';
import { logger } from '../config/logger';
import realtimeService from './realtime.service';

export interface PedidoParaRota {
  id: string;
  clienteTelefone: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairroEntrega: string;
  lat: number | null;
  lng: number | null;
  valorTotal: number;
  motoboyId: string | null;
  criadoEm: Date;
}

export interface ParadaRota {
  ordem: number;
  pedidoId: string;
  clienteTelefone: string;
  clienteNome: string;
  enderecoEntrega: string;
  bairroEntrega: string;
  lat: number | null;
  lng: number | null;
  valorTotal: number;
  distanciaKm: number;
}

export interface GrupoRota {
  pedidos: ParadaRota[];
  distanciaTotalKm: number;
  estimativaMinutos: number;
  lojaLat: number;
  lojaLng: number;
}

function distanciaHaversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestNeighbor(
  origem: { lat: number; lng: number },
  pedidos: PedidoParaRota[]
): PedidoParaRota[] {
  const restantes = [...pedidos];
  const ordenados: PedidoParaRota[] = [];
  let posAtual = origem;

  while (restantes.length > 0) {
    let menorDist = Infinity;
    let indiceMenor = 0;

    for (let i = 0; i < restantes.length; i++) {
      const p = restantes[i];
      if (p.lat == null || p.lng == null) {
        // pedidos sem coordenadas ficam no final
        continue;
      }
      const d = distanciaHaversineKm(posAtual.lat, posAtual.lng, p.lat, p.lng);
      if (d < menorDist) {
        menorDist = d;
        indiceMenor = i;
      }
    }

    const proximo = restantes.splice(indiceMenor, 1)[0];
    ordenados.push(proximo);
    if (proximo.lat != null && proximo.lng != null) {
      posAtual = { lat: proximo.lat, lng: proximo.lng };
    }
  }

  return ordenados;
}

function calcularDistanciaTotal(
  origem: { lat: number; lng: number },
  paradas: PedidoParaRota[]
): number {
  let total = 0;
  let pos = origem;
  for (const p of paradas) {
    if (p.lat != null && p.lng != null) {
      total += distanciaHaversineKm(pos.lat, pos.lng, p.lat, p.lng);
      pos = { lat: p.lat, lng: p.lng };
    }
  }
  return Math.round(total * 10) / 10;
}

class RotaEntregaService {
  async obterPedidosProntos(): Promise<PedidoParaRota[]> {
    const pedidos = await prisma.pedido.findMany({
      where: {
        status: StatusPedido.PRONTO,
        tipoAtendimento: TipoAtendimentoPedido.ENTREGA,
      },
      include: {
        cliente: { select: { nome: true, lat: true, lng: true } },
      },
      orderBy: { criadoEm: 'asc' },
    });

    return pedidos.map((p) => ({
      id: p.id,
      clienteTelefone: p.clienteTelefone,
      clienteNome: p.cliente?.nome ?? p.clienteTelefone,
      enderecoEntrega: p.enderecoEntrega ?? '',
      bairroEntrega: p.bairroEntrega ?? '',
      lat: p.cliente?.lat ?? null,
      lng: p.cliente?.lng ?? null,
      valorTotal: Number(p.total),
      motoboyId: p.motoboyId,
      criadoEm: p.criadoEm,
    }));
  }

  async agruparRota(
    pedidoIds: string[] | null,
    maxPorGrupo = 4,
    raioKm = 3
  ): Promise<{ grupo: GrupoRota; semCoordenadas: PedidoParaRota[] }> {
    const loja = await prisma.lojaConfiguracao.findFirst({
      select: { latLoja: true, lngLoja: true },
    });

    if (!loja?.latLoja || !loja?.lngLoja) {
      throw new Error('LOJA_SEM_COORDENADAS');
    }

    const origem = { lat: loja.latLoja, lng: loja.lngLoja };

    let candidatos: PedidoParaRota[];
    if (pedidoIds && pedidoIds.length > 0) {
      const todos = await this.obterPedidosProntos();
      candidatos = todos.filter((p) => pedidoIds.includes(p.id));
    } else {
      candidatos = await this.obterPedidosProntos();
    }

    const comCoordenadas = candidatos.filter((p) => p.lat != null && p.lng != null);
    const semCoordenadas = candidatos.filter((p) => p.lat == null || p.lng == null);

    // Filtra por raio da loja se pedidoIds não foi especificado
    let elegíveis = comCoordenadas;
    if (!pedidoIds) {
      elegíveis = comCoordenadas.filter((p) => {
        const d = distanciaHaversineKm(origem.lat, origem.lng, p.lat!, p.lng!);
        return d <= raioKm;
      });
    }

    // Limita ao max por grupo
    const paraRota = elegíveis.slice(0, maxPorGrupo);

    const ordenados = nearestNeighbor(origem, paraRota);
    const distanciaTotal = calcularDistanciaTotal(origem, ordenados);

    // Estimativa: 8 min/km em zona urbana + 3 min por parada
    const estimativaMinutos = Math.round(distanciaTotal * 8 + ordenados.length * 3);

    let posAtual = origem;
    const paradas: ParadaRota[] = ordenados.map((p, idx) => {
      const dist =
        p.lat != null && p.lng != null
          ? distanciaHaversineKm(posAtual.lat, posAtual.lng, p.lat, p.lng)
          : 0;
      if (p.lat != null && p.lng != null) posAtual = { lat: p.lat, lng: p.lng };
      return {
        ordem: idx + 1,
        pedidoId: p.id,
        clienteTelefone: p.clienteTelefone,
        clienteNome: p.clienteNome,
        enderecoEntrega: p.enderecoEntrega,
        bairroEntrega: p.bairroEntrega,
        lat: p.lat,
        lng: p.lng,
        valorTotal: p.valorTotal,
        distanciaKm: Math.round(dist * 10) / 10,
      };
    });

    // Adiciona pedidos sem coordenadas ao final do grupo
    for (const p of semCoordenadas) {
      paradas.push({
        ordem: paradas.length + 1,
        pedidoId: p.id,
        clienteTelefone: p.clienteTelefone,
        clienteNome: p.clienteNome,
        enderecoEntrega: p.enderecoEntrega,
        bairroEntrega: p.bairroEntrega,
        lat: null,
        lng: null,
        valorTotal: p.valorTotal,
        distanciaKm: 0,
      });
    }

    return {
      grupo: {
        pedidos: paradas,
        distanciaTotalKm: distanciaTotal,
        estimativaMinutos,
        lojaLat: origem.lat,
        lojaLng: origem.lng,
      },
      semCoordenadas,
    };
  }

  async despacharGrupo(
    pedidoIds: string[],
    motoboyId: string | null,
    operadorNome?: string
  ): Promise<void> {
    if (pedidoIds.length === 0) throw new Error('GRUPO_VAZIO');

    const pedidos = await prisma.pedido.findMany({
      where: { id: { in: pedidoIds }, status: StatusPedido.PRONTO },
      select: { id: true, status: true, tipoAtendimento: true },
    });

    if (pedidos.length !== pedidoIds.length) {
      throw new Error('PEDIDOS_STATUS_INVALIDO');
    }

    if (motoboyId) {
      const motoboy = await prisma.motoboy.findUnique({ where: { id: motoboyId }, select: { id: true } });
      if (!motoboy) throw new Error('MOTOBOY_NAO_ENCONTRADO');
    }

    await prisma.$transaction(async (tx) => {
      for (const pedidoId of pedidoIds) {
        await tx.pedido.update({
          where: { id: pedidoId },
          data: {
            status: StatusPedido.SAIU_ENTREGA,
            statusMudouEm: new Date(),
            ...(motoboyId ? { motoboyId } : {}),
          },
        });
      }
    });

    logger.info('rota.despachada', {
      pedidoIds,
      motoboyId,
      operador: operadorNome ?? 'OPERADOR',
    });

    if (motoboyId) {
      realtimeService.emit('entregador:novo_pedido', {
        motoboyId,
        pedidoIds,
        quantidade: pedidoIds.length,
      });
    }
  }
}

export default new RotaEntregaService();
