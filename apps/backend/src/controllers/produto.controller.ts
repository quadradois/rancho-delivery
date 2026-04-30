import { Request, Response } from 'express';
import produtoService from '../services/produto.service';
import { logger } from '../config/logger';
import { z } from 'zod';

const produtoSchema = z.object({
  nome: z.string().min(3),
  descricao: z.string().min(10),
  preco: z.number().positive(),
  categoria: z.string().min(1),
  midia: z.string().optional(),
  disponivel: z.boolean().optional(),
  ordem: z.number().int().min(0).optional(),
  tempoPreparo: z.number().int().min(1).optional(),
});

const produtoUpdateSchema = produtoSchema.partial();

export class ProdutoController {
  /**
   * GET /api/produtos
   * Lista todos os produtos disponíveis
   */
  async listar(req: Request, res: Response) {
    try {
      const { categoria } = req.query;

      let produtos;
      
      if (categoria && typeof categoria === 'string') {
        produtos = await produtoService.listarProdutosPorCategoria(categoria);
      } else {
        produtos = await produtoService.listarProdutos();
      }

      return res.json({
        success: true,
        data: produtos,
      });
    } catch (error) {
      logger.error('Erro no controller de produtos:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar produtos',
        },
      });
    }
  }

  /**
   * GET /api/produtos/:id
   * Busca produto por ID
   */
  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const produto = await produtoService.buscarProdutoPorId(id);

      if (!produto) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Produto não encontrado',
            code: 'PRODUTO_NAO_ENCONTRADO',
          },
        });
      }

      if (!produto.disponivel) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Produto indisponível',
            code: 'PRODUTO_INDISPONIVEL',
          },
        });
      }

      return res.json({
        success: true,
        data: produto,
      });
    } catch (error) {
      logger.error('Erro ao buscar produto por ID:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao buscar produto',
        },
      });
    }
  }

  /**
   * POST /api/produtos
   * Cria produto
   */
  async criar(req: Request, res: Response) {
    try {
      const validacao = produtoSchema.safeParse(req.body);

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

      const produto = await produtoService.criarProduto(validacao.data);

      return res.status(201).json({
        success: true,
        data: produto,
      });
    } catch (error) {
      logger.error('Erro ao criar produto:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao criar produto',
        },
      });
    }
  }

  /**
   * PUT /api/produtos/:id
   * Atualiza produto
   */
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const validacao = produtoUpdateSchema.safeParse(req.body);

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

      const produto = await produtoService.atualizarProduto(id, validacao.data);

      if (!produto) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Produto não encontrado',
            code: 'PRODUTO_NAO_ENCONTRADO',
          },
        });
      }

      return res.json({
        success: true,
        data: produto,
      });
    } catch (error) {
      logger.error('Erro ao atualizar produto:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao atualizar produto',
        },
      });
    }
  }

  /**
   * DELETE /api/produtos/:id
   * Remove produto do cardápio
   */
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const produto = await produtoService.excluirProduto(id);

      if (!produto) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Produto não encontrado',
            code: 'PRODUTO_NAO_ENCONTRADO',
          },
        });
      }

      return res.json({
        success: true,
        data: produto,
      });
    } catch (error) {
      logger.error('Erro ao excluir produto:', error);
      return res.status(500).json({
        success: false,
        error: {
          message: 'Erro ao excluir produto',
        },
      });
    }
  }
}

export default new ProdutoController();
