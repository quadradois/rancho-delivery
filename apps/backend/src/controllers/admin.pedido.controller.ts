import { Request, Response } from 'express';
import pedidoService from '../services/pedido.service';
import { logger } from '../config/logger';
import { StatusLoja, StatusPedido } from '@prisma/client';
import realtimeService from '../services/realtime.service';

export class AdminPedidoController {
  private async emitirMetricasAtualizadas() {
    try {
      const metricas = await pedidoService.obterMetricasAdmin();
      realtimeService.emit('metricas:atualizadas', metricas);
    } catch (error) {
      logger.error('Erro ao emitir metricas atualizadas:', error);
    }
  }

  /**
   * GET /api/admin/metricas
   */
  async metricas(_req: Request, res: Response) {
    try {
      const data = await pedidoService.obterMetricasAdmin();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar metricas admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar metricas do admin' },
      });
    }
  }

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
      void this.emitirMetricasAtualizadas();
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

  /**
   * GET /api/admin/motoboys
   */
  async listarMotoboys(_req: Request, res: Response) {
    try {
      const data = await pedidoService.listarMotoboys();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao listar motoboys:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao listar motoboys' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/motoboy
   */
  async atribuirMotoboy(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const motoboyId = typeof req.body?.motoboyId === 'string' ? req.body.motoboyId : null;
      const observacaoEntrega = typeof req.body?.observacaoEntrega === 'string' ? req.body.observacaoEntrega : undefined;
      const data = await pedidoService.atribuirMotoboy(id, motoboyId, observacaoEntrega);
      realtimeService.emit('pedido:atualizado', { id: data.id, motoboyId: data.motoboy?.id || null });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'MOTOBOY_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Motoboy não encontrado', code: 'MOTOBOY_NAO_ENCONTRADO' },
        });
      }
      logger.error('Erro ao atribuir motoboy:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atribuir motoboy' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/endereco
   */
  async atualizarEnderecoEntrega(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const endereco = typeof req.body?.endereco === 'string' ? req.body.endereco.trim() : '';
      const bairro = typeof req.body?.bairro === 'string' ? req.body.bairro.trim() : '';
      if (!endereco || !bairro) {
        return res.status(400).json({
          success: false,
          error: { message: 'Endereço e bairro são obrigatórios', code: 'ENDERECO_INVALIDO' },
        });
      }
      const data = await pedidoService.atualizarEnderecoEntrega(id, endereco, bairro);
      realtimeService.emit('pedido:atualizado', { id });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      logger.error('Erro ao atualizar endereço de entrega:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar endereço de entrega' },
      });
    }
  }

  /**
   * POST /api/admin/pedidos/manual
   */
  async criarManual(req: Request, res: Response) {
    try {
      const pagamentoMetodo = String(req.body?.pagamentoMetodo || '').toUpperCase();
      if (pagamentoMetodo !== 'PIX' && pagamentoMetodo !== 'DINHEIRO') {
        return res.status(400).json({
          success: false,
          error: { message: 'Método de pagamento inválido', code: 'PAGAMENTO_INVALIDO' },
        });
      }

      const data = await pedidoService.criarPedidoManual({
        cliente: req.body?.cliente,
        itens: req.body?.itens,
        observacao: req.body?.observacao,
        origem: req.body?.origem,
        pagamentoMetodo,
        valorDinheiro: req.body?.valorDinheiro,
      });

      realtimeService.emit('pedido:novo', { id: data.id, status: data.status });
      void this.emitirMetricasAtualizadas();
      return res.status(201).json({ success: true, data });
    } catch (error: any) {
      logger.error('Erro ao criar pedido manual:', error);
      return res.status(400).json({
        success: false,
        error: { message: error?.message || 'Erro ao criar pedido manual' },
      });
    }
  }

  /**
   * POST /api/admin/pedidos/:id/cancelar
   */
  async cancelar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
      if (!motivo) {
        return res.status(400).json({
          success: false,
          error: { message: 'Motivo é obrigatório', code: 'MOTIVO_OBRIGATORIO' },
        });
      }
      const data = await pedidoService.cancelarPedidoAdmin(id, motivo);
      realtimeService.emit('pedido:atualizado', { id: data.id, status: data.status });
      void this.emitirMetricasAtualizadas();
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      logger.error('Erro ao cancelar pedido admin:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao cancelar pedido' },
      });
    }
  }

  /**
   * PATCH /api/admin/pedidos/:id/estorno
   */
  async marcarEstorno(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await pedidoService.marcarEstornoAdmin(id);
      realtimeService.emit('pedido:atualizado', { id: data.id, estorno: true });
      void this.emitirMetricasAtualizadas();
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'ESTORNO_STATUS_INVALIDO' || error.message === 'ESTORNO_NAO_NECESSARIO') {
        return res.status(400).json({
          success: false,
          error: { message: 'Pedido não está elegível para estorno', code: error.message },
        });
      }
      logger.error('Erro ao marcar estorno:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao marcar estorno' },
      });
    }
  }

  /**
   * GET /api/admin/loja/status
   */
  async obterStatusLoja(_req: Request, res: Response) {
    try {
      const data = await pedidoService.obterStatusLoja();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao obter status da loja:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao obter status da loja' },
      });
    }
  }

  /**
   * PATCH /api/admin/loja/status
   */
  async atualizarStatusLoja(req: Request, res: Response) {
    try {
      const status = String(req.body?.status || '').toUpperCase() as StatusLoja;
      const mensagem = typeof req.body?.mensagem === 'string' ? req.body.mensagem : undefined;
      const validos = Object.values(StatusLoja);
      if (!validos.includes(status)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status de loja inválido', code: 'STATUS_LOJA_INVALIDO' },
        });
      }
      const data = await pedidoService.atualizarStatusLoja(status, mensagem);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'MENSAGEM_PAUSADO_OBRIGATORIA') {
        return res.status(400).json({
          success: false,
          error: { message: 'Mensagem é obrigatória quando loja está pausada', code: error.message },
        });
      }
      logger.error('Erro ao atualizar status da loja:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao atualizar status da loja' },
      });
    }
  }
}

export default new AdminPedidoController();
