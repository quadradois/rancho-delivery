import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { StatusPedido } from '@prisma/client';
import { gerarTokenEntregador, decodificarTokenEntregador } from '../middlewares/entregadorAuth.middleware';
import realtimeService from '../services/realtime.service';
import { logger } from '../config/logger';

const schemaLogin = z.object({
  telefone: z.string().trim().min(8),
});

const schemaLocalizacao = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

const schemaConfirmar = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  fotoUrl: z.string().url().optional(),
  observacao: z.string().max(500).optional(),
});

class EntregadorController {
  async login(req: Request, res: Response) {
    try {
      const parsed = schemaLogin.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: { message: 'Telefone inválido' } });
      }

      const telefone = parsed.data.telefone.replace(/\D/g, '');
      const motoboy = await prisma.motoboy.findFirst({
        where: {
          telefone: { contains: telefone },
          empresa: 'PROPRIO',
          status: { not: 'INATIVO' },
        },
        select: { id: true, nome: true, telefone: true, status: true },
      });

      if (!motoboy) {
        return res.status(401).json({ success: false, error: { message: 'Entregador não encontrado ou inativo', code: 'NOT_FOUND' } });
      }

      const token = gerarTokenEntregador({
        motoboyId: motoboy.id,
        nome: motoboy.nome,
        telefone: motoboy.telefone,
      });

      return res.json({
        success: true,
        data: {
          token,
          expiresIn: 43200, // 12h em segundos
          entregador: { id: motoboy.id, nome: motoboy.nome, telefone: motoboy.telefone, status: motoboy.status },
        },
      });
    } catch (error) {
      logger.error('Erro no login do entregador:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao fazer login' } });
    }
  }

  async fila(req: Request, res: Response) {
    try {
      const motoboyId = req.entregador!.motoboyId;

      const pedidos = await prisma.pedido.findMany({
        where: {
          motoboyId,
          status: StatusPedido.SAIU_ENTREGA,
        },
        select: {
          id: true,
          clienteTelefone: true,
          enderecoEntrega: true,
          bairroEntrega: true,
          total: true,
          formaPagamento: true,
          trocoPara: true,
          observacao: true,
          statusMudouEm: true,
          criadoEm: true,
          cliente: { select: { nome: true, lat: true, lng: true } },
          itens: {
            select: {
              quantidade: true,
              precoUnit: true,
              produto: { select: { nome: true } },
            },
          },
        },
        orderBy: { statusMudouEm: 'asc' },
      });

      const data = pedidos.map((p) => ({
        id: p.id,
        clienteNome: p.cliente?.nome ?? p.clienteTelefone,
        clienteTelefone: p.clienteTelefone,
        enderecoEntrega: p.enderecoEntrega ?? '',
        bairroEntrega: p.bairroEntrega ?? '',
        lat: p.cliente?.lat ?? null,
        lng: p.cliente?.lng ?? null,
        total: Number(p.total),
        formaPagamento: p.formaPagamento,
        trocoPara: p.trocoPara ? Number(p.trocoPara) : null,
        observacao: p.observacao ?? null,
        saiuEm: p.statusMudouEm.toISOString(),
        itens: p.itens.map((i) => ({
          nome: i.produto?.nome ?? '?',
          quantidade: i.quantidade,
          precoUnitario: Number(i.precoUnit),
        })),
      }));

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter fila do entregador:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter fila' } });
    }
  }

  async historico(req: Request, res: Response) {
    try {
      const motoboyId = req.entregador!.motoboyId;
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const pedidos = await prisma.pedido.findMany({
        where: {
          motoboyId,
          status: StatusPedido.ENTREGUE,
          statusMudouEm: { gte: hoje },
        },
        select: {
          id: true,
          clienteTelefone: true,
          enderecoEntrega: true,
          bairroEntrega: true,
          total: true,
          statusMudouEm: true,
          cliente: { select: { nome: true } },
        },
        orderBy: { statusMudouEm: 'desc' },
      });

      const data = pedidos.map((p) => ({
        id: p.id,
        clienteNome: p.cliente?.nome ?? p.clienteTelefone,
        enderecoEntrega: p.enderecoEntrega ?? '',
        bairroEntrega: p.bairroEntrega ?? '',
        total: Number(p.total),
        entregueEm: p.statusMudouEm.toISOString(),
      }));

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter histórico do entregador:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao obter histórico' } });
    }
  }

  async events(req: Request, res: Response) {
    // Aceita token via query param (SSE não suporta headers customizados)
    const token = req.query.token as string | undefined;
    const payload = decodificarTokenEntregador(token);
    if (!payload) {
      return res.status(401).json({ success: false, error: { message: 'Token inválido' } });
    }

    const { motoboyId } = payload;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (type: string, data: unknown) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send('connected', { motoboyId });

    const unsubscribe = realtimeService.subscribe((event) => {
      if (event.type === 'entregador:novo_pedido' && event.data?.motoboyId === motoboyId) {
        send('entregador:novo_pedido', event.data);
      }
    });

    const heartbeat = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      unsubscribe();
    });

    return;
  }

  async atualizarLocalizacao(req: Request, res: Response) {
    try {
      const parsed = schemaLocalizacao.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: { message: 'lat e lng obrigatórios' } });
      }
      const { lat, lng } = parsed.data;
      const { motoboyId, nome } = req.entregador!;

      realtimeService.emit('motoboy:localizacao', { motoboyId, nome, lat, lng, ts: Date.now() });

      return res.json({ success: true });
    } catch (error) {
      logger.error('Erro ao atualizar localização:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao atualizar localização' } });
    }
  }

  async confirmar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const motoboyId = req.entregador!.motoboyId;

      const parsed = schemaConfirmar.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ success: false, error: { message: 'Dados inválidos' } });
      }

      const pedido = await prisma.pedido.findUnique({
        where: { id },
        select: { id: true, status: true, motoboyId: true },
      });

      if (!pedido) return res.status(404).json({ success: false, error: { message: 'Pedido não encontrado' } });
      if (pedido.motoboyId !== motoboyId) return res.status(403).json({ success: false, error: { message: 'Pedido não pertence a você' } });
      if (pedido.status !== StatusPedido.SAIU_ENTREGA) return res.status(422).json({ success: false, error: { message: 'Pedido não está em rota' } });

      await prisma.pedido.update({
        where: { id },
        data: {
          status: StatusPedido.ENTREGUE,
          statusMudouEm: new Date(),
        },
      });

      // Registra evidência na timeline
      const { lat, lng, fotoUrl, observacao } = parsed.data;
      const detalhes = [
        lat && lng ? `GPS: ${lat.toFixed(6)},${lng.toFixed(6)}` : null,
        fotoUrl ? `Foto: ${fotoUrl}` : null,
        observacao || null,
      ].filter(Boolean).join(' | ');

      await prisma.pedidoTimeline.create({
        data: {
          pedidoId: id,
          ator: req.entregador!.nome,
          acao: `Entrega confirmada${detalhes ? ` — ${detalhes}` : ''}`,
        },
      });

      realtimeService.emit('pedido:atualizado', { id, status: 'ENTREGUE' });

      logger.info('entregador.entrega.confirmada', { pedidoId: id, motoboyId, lat, lng });

      return res.json({ success: true, data: { id, status: 'ENTREGUE' } });
    } catch (error) {
      logger.error('Erro ao confirmar entrega:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao confirmar entrega' } });
    }
  }
}

export default new EntregadorController();
