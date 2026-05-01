import { Request, Response } from 'express';
import pedidoService from '../services/pedido.service';
import { logger } from '../config/logger';
import { StatusPedido } from '@prisma/client';
import realtimeService from '../services/realtime.service';

export class AdminPedidoController {
  /**
   * GET /api/admin/pedidos
   */
  async listar(req: Request, res: Response) {
    try {
      const { status, busca } = req.query;
      const data = await pedidoService.listarPedidosAdmin({
        status: typeof status === 'string' ? status : undefined,
        busca: typeof busca === 'string' ? busca : undefined,
      });

      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar pedidos admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar pedidos do admin' },
      });
    }
  }

  /**
   * GET /api/admin/pedidos/:id
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const pedido = await pedidoService.buscarPedidoAdminPorId(id);

      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      return res.json({ success: true, data: pedido });
    } catch (error) {
      logger.error('Erro ao buscar pedido admin por id:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar pedido do admin' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/status
   */
  async atualizarStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const status = String(req.body?.status || '').toUpperCase() as StatusPedido;
      const motivoCancelamento =
        typeof req.body?.motivoCancelamento === 'string' ? req.body.motivoCancelamento.trim() : undefined;

      const validos = Object.values(StatusPedido);
      if (!validos.includes(status)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status inválido', code: 'STATUS_INVALIDO' },
        });
      }

      const data = await pedidoService.atualizarStatusAdmin(id, status, motivoCancelamento);
      realtimeService.emit('pedido:atualizado', { id, status: data.status });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      if (error.message === 'TRANSICAO_INVALIDA') {
        return res.status(400).json({
          success: false,
          error: { message: 'Transição de status inválida', code: 'TRANSICAO_INVALIDA' },
        });
      }

      logger.error('Erro ao atualizar status do pedido admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar status do pedido' },
      });
    }
  }
}

export default new AdminPedidoController();
