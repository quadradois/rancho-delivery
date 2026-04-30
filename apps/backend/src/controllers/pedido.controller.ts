import { Request, Response } from 'express';
import pedidoService from '../services/pedido.service';
import { logger } from '../config/logger';
import { z } from 'zod';

// Schema de validação do pedido
const criarPedidoSchema = z.object({
  cliente: z.object({
    telefone: z.string().min(10),
    nome: z.string().min(3),
    endereco: z.string().min(10),
    bairro: z.string().min(3),
  }),
  itens: z.array(z.object({
    produtoId: z.string(),
    quantidade: z.number().int().positive(),
    observacao: z.string().optional(),
  })).min(1),
  observacao: z.string().optional(),
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
   * Busca pedido por ID
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

      return res.json({
        success: true,
        data: pedido,
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
   * Lista pedidos de um cliente
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
}

export default new PedidoController();
