import { Request, Response } from 'express';
import pedidoService from '../services/pedido.service';
import { logger } from '../config/logger';
import { z } from 'zod';
import realtimeService from '../services/realtime.service';

// Schema de validação do pedido
const criarPedidoSchema = z.object({
  cliente: z.object({
    telefone: z.string().min(10),
    nome: z.string().min(3),
    endereco: z.string().optional().default(''),
    bairro: z.string().optional().default(''),
    cep: z.string().min(8).optional(),
  }),
  itens: z.array(z.object({
    produtoId: z.string(),
    quantidade: z.number().int().positive(),
    observacao: z.string().optional(),
  })).min(1),
  observacao: z.string().optional(),
  pagamento: z.object({
    forma: z.enum(['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO']),
    trocoPara: z.number().positive().optional(),
  }).optional(),
  tipoAtendimento: z.enum(['ENTREGA', 'RETIRADA', 'CONSUMO_LOCAL']).optional(),
});

const registrarNpsSchema = z.object({
  nota: z.number().int().min(1).max(5),
  feedback: z.string().max(500).optional(),
});

export class PedidoController {
  /**
   * GET /api/pedidos
   * Lista pedidos para admin
   */
  async listar(req: Request, res: Response) {
    try {
      const { status, page, limit } = req.query;

      const resultado = await pedidoService.listarPedidos({
        status: typeof status === 'string' ? status : undefined,
        page: typeof page === 'string' ? Number(page) : undefined,
        limit: typeof limit === 'string' ? Number(limit) : undefined,
      });

      return res.json({
        success: true,
        data: resultado.data,
        pagination: resultado.pagination,
      });
    } catch (error) {
      logger.error('Erro ao listar pedidos:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar pedidos',
        },
      });
    }
  }

  /**
   * GET /api/pedidos/metricas/abandono
   * Retorna métricas de abandono de checkout
   */
  async metricasAbandono(req: Request, res: Response) {
    try {
      const { dias } = req.query;
      const resultado = await pedidoService.obterMetricasAbandono(
        typeof dias === 'string' ? Number(dias) : 7
      );

      return res.json({
        success: true,
        data: resultado,
      });
    } catch (error) {
      logger.error('Erro ao buscar métricas de abandono:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar métricas de abandono',
        },
      });
    }
  }

  /**
   * POST /api/pedidos
   * Cria novo pedido
   */
  async criar(req: Request, res: Response) {
    try {
      // Validar dados com Zod
      const validacao = criarPedidoSchema.safeParse(req.body);

      if (!validacao.success) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Dados inválidos',
            code: 'VALIDACAO_ERRO',
            details: validacao.error.errors,
          },
        });
      }

      const pedido = await pedidoService.criarPedido(validacao.data);

      return res.status(201).json({
        success: true,
        data: pedido,
      });
    } catch (error: any) {
      logger.error('Erro ao criar pedido:', error);

      // Erros de negócio
      if (error.message === 'Bairro não atendido') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Bairro não atendido',
            code: 'BAIRRO_NAO_ATENDIDO',
          },
        });
      }

      if (error.message === 'ENDERECO_OBRIGATORIO_ENTREGA') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Endereço e bairro são obrigatórios para entregas',
            code: 'ENDERECO_OBRIGATORIO_ENTREGA',
          },
        });
      }

      if (error.message?.includes('Produto não encontrado')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'PRODUTO_NAO_ENCONTRADO',
          },
        });
      }

      if (error.message?.includes('Produto indisponível')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'PRODUTO_INDISPONIVEL',
          },
        });
      }
      if (error.message === 'TROCO_INVALIDO') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Valor de troco deve ser maior ou igual ao total do pedido',
            code: 'TROCO_INVALIDO',
          },
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao criar pedido',
        },
      });
    }
  }

  /**
   * GET /api/pedidos/:id
   * Busca pedido por ID. Requer ?token=<tokenAcesso> ou JWT admin.
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pedido = await pedidoService.buscarPedidoPorId(id);

      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Pedido não encontrado',
            code: 'PEDIDO_NAO_ENCONTRADO',
          },
        });
      }

      // Admin JWT tem acesso irrestrito; cliente precisa do token correto
      if (!req.adminUser) {
        if (!req.pedidoToken || (pedido as any).tokenAcesso !== req.pedidoToken) {
          return res.status(403).json({
            success: false,
            error: {
              message: 'Token de acesso inválido para este pedido',
              code: 'PEDIDO_TOKEN_INVALID',
            },
          });
        }
      }

      // Nunca expor tokenAcesso na resposta
      const { tokenAcesso: _token, ...pedidoSemToken } = pedido as any;

      return res.json({
        success: true,
        data: pedidoSemToken,
      });
    } catch (error) {
      logger.error('Erro ao buscar pedido:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar pedido',
        },
      });
    }
  }

  /**
   * GET /api/pedidos/cliente/:telefone
   * Lista pedidos de um cliente. Requer JWT admin.
   */
  async listarPorCliente(req: Request, res: Response) {
    try {
      const { telefone } = req.params;

      const pedidos = await pedidoService.listarPedidosPorCliente(telefone);

      return res.json({
        success: true,
        data: pedidos,
      });
    } catch (error) {
      logger.error('Erro ao listar pedidos do cliente:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar pedidos',
        },
      });
    }
  }

  /**
   * POST /api/pedidos/reorder/:id
   * Cria um novo pedido reaproveitando cliente/itens de um pedido anterior.
   */
  async reorder(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const pedidoOriginal = await pedidoService.buscarPedidoPorId(id);
      if (!pedidoOriginal) {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      if (!req.adminUser) {
        if (!req.pedidoToken || (pedidoOriginal as any).tokenAcesso !== req.pedidoToken) {
          return res.status(403).json({
            success: false,
            error: { message: 'Token de acesso inválido para este pedido', code: 'PEDIDO_TOKEN_INVALID' },
          });
        }
      }

      const novoPedido = await pedidoService.criarReorder(id);
      return res.status(201).json({ success: true, data: novoPedido });
    } catch (error: any) {
      logger.error('Erro ao criar reorder:', error);
      if (error.message === 'PEDIDO_SEM_ITENS_REORDER') {
        return res.status(400).json({
          success: false,
          error: { message: 'Pedido original sem itens para reorder', code: 'PEDIDO_SEM_ITENS_REORDER' },
        });
      }
      return res.status(500).json({ success: false, error: { message: 'Erro ao criar reorder' } });
    }
  }

  /**
   * POST /api/pedidos/:id/pagamento/pix
   * Gera cobrança PIX transparente para pedido em aberto.
   */
  async gerarPagamentoPix(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = await pedidoService.gerarPagamentoPixPedido(id);
      return res.json({ success: true, data });
    } catch (error: any) {
      logger.error('Erro ao gerar pagamento PIX transparente:', error);
      if (error.message === 'PEDIDO_NAO_ENCONTRADO') {
        return res.status(404).json({ success: false, error: { message: 'Pedido não encontrado', code: error.message } });
      }
      if (error.message === 'PAGAMENTO_NAO_PIX' || error.message === 'STATUS_INVALIDO_PAGAMENTO') {
        return res.status(400).json({ success: false, error: { message: 'Pedido não elegível para pagamento PIX', code: error.message } });
      }
      return res.status(500).json({ success: false, error: { message: 'Erro ao gerar pagamento PIX' } });
    }
  }

  /**
   * GET /api/pedidos/:id/eventos
   * Stream SSE de eventos do pedido para acompanhamento em tempo real.
   */
  async streamEventos(req: Request, res: Response) {
    const { id } = req.params;

    try {
      const pedido = await pedidoService.buscarPedidoPorId(id);
      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      if (!req.adminUser) {
        if (!req.pedidoToken || (pedido as any).tokenAcesso !== req.pedidoToken) {
          return res.status(403).json({
            success: false,
            error: { message: 'Token de acesso inválido para este pedido', code: 'PEDIDO_TOKEN_INVALID' },
          });
        }
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const send = (payload: any) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      send({ type: 'connected', pedidoId: id, timestamp: new Date().toISOString() });

      const unsubscribe = realtimeService.subscribe((event) => {
        if (event.type !== 'pedido:atualizado') return;
        const pedidoId = event.data?.id || event.data?.pedidoId;
        if (pedidoId !== id) return;
        send(event);
      });

      const keepAlive = setInterval(() => {
        send({ type: 'ping', timestamp: new Date().toISOString() });
      }, 25000);

      req.on('close', () => {
        clearInterval(keepAlive);
        unsubscribe();
      });

      return;
    } catch (error) {
      logger.error('Erro no stream de pedido:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao abrir stream do pedido' } });
    }
  }

  async registrarNps(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validacao = registrarNpsSchema.safeParse(req.body);
      if (!validacao.success) {
        return res.status(400).json({
          success: false,
          error: { message: 'Dados inválidos', code: 'VALIDACAO_ERRO', details: validacao.error.errors },
        });
      }

      const pedido = await pedidoService.buscarPedidoPorId(id);
      if (!pedido) {
        return res.status(404).json({
          success: false,
          error: { message: 'Pedido não encontrado', code: 'PEDIDO_NAO_ENCONTRADO' },
        });
      }

      if (!req.adminUser) {
        if (!req.pedidoToken || (pedido as any).tokenAcesso !== req.pedidoToken) {
          return res.status(403).json({
            success: false,
            error: { message: 'Token de acesso inválido para este pedido', code: 'PEDIDO_TOKEN_INVALID' },
          });
        }
      }

      const data = await pedidoService.registrarNps(id, validacao.data.nota, validacao.data.feedback);
      return res.json({ success: true, data });
    } catch (error: any) {
      if (error.message === 'NPS_APENAS_ENTREGUE') {
        return res.status(400).json({
          success: false,
          error: { message: 'Avaliação disponível apenas para pedidos entregues', code: 'NPS_APENAS_ENTREGUE' },
        });
      }
      logger.error('Erro ao registrar NPS:', error);
      return res.status(500).json({ success: false, error: { message: 'Erro ao registrar avaliação' } });
    }
  }
}

export default new PedidoController();
