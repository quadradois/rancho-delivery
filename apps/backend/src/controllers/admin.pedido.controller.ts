import { Request, Response } from 'express';
import { z } from 'zod';
import pedidoService from '../services/pedido.service';
import { logger } from '../config/logger';
import { StatusLoja, StatusPedido } from '@prisma/client';
import realtimeService from '../services/realtime.service';

const schemaAtualizarStatus = z.object({
  status: z.string().min(1),
  motivoCancelamento: z.string().trim().optional(),
});

const schemaAtribuirMotoboy = z.object({
  motoboyId: z.string().nullable().optional(),
  observacaoEntrega: z.string().optional(),
});

const schemaAtualizarEndereco = z.object({
  endereco: z.string().trim().min(1, 'Endereço obrigatório'),
  bairro: z.string().trim().min(1, 'Bairro obrigatório'),
});

const schemaCriarManual = z.object({
  pagamentoMetodo: z.enum(['PIX', 'DINHEIRO']),
  cliente: z.object({
    nome: z.string().trim().min(1),
    telefone: z.string().trim().min(1),
    endereco: z.string().trim().min(1),
    bairro: z.string().trim().min(1),
  }),
  itens: z.array(z.object({
    produtoId: z.string().min(1),
    quantidade: z.number().int().min(1),
    observacao: z.string().optional(),
  })).min(1),
  observacao: z.string().optional(),
  origem: z.enum(['SITE', 'WHATSAPP', 'MINERACAO', 'INDICACAO', 'CAMPANHA']).optional(),
  valorDinheiro: z.number().optional(),
});

const schemaCancelar = z.object({
  motivo: z.string().trim().min(1, 'Motivo obrigatório'),
});

const schemaStatusLoja = z.object({
  status: z.string().min(1),
  mensagem: z.string().optional(),
});

function validar<T>(schema: z.ZodType<T>, data: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const msg = result.error.errors.map(e => e.message).join('; ');
    return { error: msg };
  }
  return { data: result.data };
}

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
   * GET /api/admin/fila-urgente
   */
  async filaUrgente(_req: Request, res: Response) {
    try {
      await pedidoService.sincronizarExpiracoesCheckout();
      const data = await pedidoService.obterFilaUrgente();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar fila urgente:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar fila urgente' },
      });
    }
  }

  /**
   * GET /api/admin/metricas
   */
  async metricas(_req: Request, res: Response) {
    try {
      await pedidoService.sincronizarExpiracoesCheckout();
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
      await pedidoService.sincronizarExpiracoesCheckout();
      const { status, busca, page, limit } = req.query;
      const data = await pedidoService.listarPedidosAdmin({
        status: typeof status === 'string' ? status : undefined,
        busca: typeof busca === 'string' ? busca : undefined,
        page: typeof page === 'string' ? Number(page) : undefined,
        limit: typeof limit === 'string' ? Number(limit) : undefined,
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
      await pedidoService.sincronizarExpiracoesCheckout();
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
      const parsed = validar(schemaAtualizarStatus, { ...req.body, status: String(req.body?.status || '').toUpperCase() });
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }

      const { status, motivoCancelamento } = parsed.data;
      const validos = Object.values(StatusPedido);
      if (!validos.includes(status as StatusPedido)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status inválido', code: 'STATUS_INVALIDO' },
        });
      }

      const data = await pedidoService.atualizarStatusAdmin(id, status as StatusPedido, motivoCancelamento, req.adminUser?.username);
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
   * GET /api/admin/motoboys/status
   */
  async statusMotoboys(_req: Request, res: Response) {
    try {
      const data = await pedidoService.listarMotoboyStatus();
      return res.json({ success: true, data });
    } catch (error) {
      logger.error('Erro ao buscar status dos motoboys:', error);
      return res.status(500).json({
        success: false,
        error: { message: 'Erro ao buscar status dos motoboys' },
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
      const parsed = validar(schemaAtribuirMotoboy, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }
      const { motoboyId = null, observacaoEntrega } = parsed.data;
      const data = await pedidoService.atribuirMotoboy(id, motoboyId ?? null, observacaoEntrega, req.adminUser?.username);
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
      const parsed = validar(schemaAtualizarEndereco, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'ENDERECO_INVALIDO' } });
      }
      const { endereco, bairro } = parsed.data;
      const data = await pedidoService.atualizarEnderecoEntrega(id, endereco, bairro, req.adminUser?.username);
      realtimeService.emit('pedido:atualizado', { id });
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }
      if (error.message === 'BAIRRO_NAO_ATENDIDO') {
        return res.status(400).json({
          success: false,
          error: { message: 'Bairro não atendido', code: 'BAIRRO_NAO_ATENDIDO' },
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
      const rawBody = { ...req.body, pagamentoMetodo: String(req.body?.pagamentoMetodo || '').toUpperCase() };
      const parsed = validar(schemaCriarManual, rawBody);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'VALIDACAO_INVALIDA' } });
      }

      const data = await pedidoService.criarPedidoManual({
        ...parsed.data,
        operadorNome: req.adminUser?.username,
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
      const parsed = validar(schemaCancelar, req.body);
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'MOTIVO_OBRIGATORIO' } });
      }
      const { motivo } = parsed.data;
      const data = await pedidoService.cancelarPedidoAdmin(id, motivo, req.adminUser?.username);
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
      const data = await pedidoService.marcarEstornoAdmin(id, req.adminUser?.username);
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
      const parsed = validar(schemaStatusLoja, { ...req.body, status: String(req.body?.status || '').toUpperCase() });
      if ('error' in parsed) {
        return res.status(400).json({ success: false, error: { message: parsed.error, code: 'STATUS_LOJA_INVALIDO' } });
      }
      const { status, mensagem } = parsed.data;
      const validos = Object.values(StatusLoja);
      if (!validos.includes(status as StatusLoja)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Status de loja inválido', code: 'STATUS_LOJA_INVALIDO' },
        });
      }
      const data = await pedidoService.atualizarStatusLoja(status as StatusLoja, mensagem);
      realtimeService.emit('loja:status', data);
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
