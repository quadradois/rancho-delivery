import { Request, Response } from 'express';
import produtoService from '../services/produto.service';
import { logger } from '../config/logger';

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
}

export default new ProdutoController();
