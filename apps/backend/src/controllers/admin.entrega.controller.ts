import { Request, Response } from 'express';
import { z } from 'zod';
import rotaEntregaService from '../services/rotaEntrega.service';
import realtimeService from '../services/realtime.service';
import { logger } from '../config/logger';

const schemaAgrupar = z.object({
  pedidoIds: z.array(z.string()).optional(),
  maxPorGrupo: z.number().int().min(1).max(10).optional().default(4),
  raioKm: z.number().min(0.5).max(20).optional().default(3),
});

const schemaDespachar = z.object({
  pedidoIds: z.array(z.string().min(1)).min(1),
  motoboyId: z.string().nullable().optional(),
});

class AdminEntregaController {
  async pedidosProntos(_req: Request, res: Response) {
    try {
      const pedidos = await rotaEntregaService.obterPedidosProntos();
      return res.json({ success: true, data: pedidos });
    } catch (error: unknown) {
      logger.error('Erro ao listar pedidos prontos:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao listar pedidos' } });
    }
  }

  async agrupar(req: Request, res: Response) {
    try {
      const parsed = schemaAgrupar.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join('; ');
        return res.status(400).json({ success: false, error: { message: msg } });
      }
      const { pedidoIds, maxPorGrupo, raioKm } = parsed.data;
      const resultado = await rotaEntregaService.agruparRota(pedidoIds ?? null, maxPorGrupo, raioKm);
      return res.json({ success: true, data: resultado });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao agrupar rotas';
      if (msg === 'LOJA_SEM_COORDENADAS') {
        return res.status(422).json({ success: false, error: { message: 'Configure a localização da loja antes de agrupar entregas.', code: 'LOJA_SEM_COORDENADAS' } });
      }
      logger.error('Erro ao agrupar rotas:', error);
      return res.status(500).json({ success: false, error: { message: msg } });
    }
  }

  async despachar(req: Request, res: Response) {
    try {
      const parsed = schemaDespachar.safeParse(req.body);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join('; ');
        return res.status(400).json({ success: false, error: { message: msg } });
      }
      const { pedidoIds, motoboyId } = parsed.data;
      await rotaEntregaService.despacharGrupo(
        pedidoIds,
        motoboyId ?? null,
        req.adminUser?.username
      );
      // Notifica cockpit via SSE
      for (const id of pedidoIds) {
        realtimeService.emit('pedido:atualizado', { id, status: 'SAIU_ENTREGA' });
      }
      return res.json({ success: true, data: { despachados: pedidoIds.length } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro ao despachar';
      if (msg === 'GRUPO_VAZIO') return res.status(400).json({ success: false, error: { message: 'Nenhum pedido selecionado' } });
      if (msg === 'PEDIDOS_STATUS_INVALIDO') return res.status(422).json({ success: false, error: { message: 'Um ou mais pedidos não estão com status PRONTO', code: 'PEDIDOS_STATUS_INVALIDO' } });
      if (msg === 'MOTOBOY_NAO_ENCONTRADO') return res.status(404).json({ success: false, error: { message: 'Entregador não encontrado' } });
      logger.error('Erro ao despachar grupo:', error);
      return res.status(500).json({ success: false, error: { message: msg } });
    }
  }
}

export default new AdminEntregaController();
