import prisma from '../config/database';
import { logger } from '../config/logger';

export class ProdutoService {
  /**
   * Lista todos os produtos disponíveis ordenados por ordem
   */
  async listarProdutos() {
    try {
      const produtos = await prisma.produto.findMany({
        where: {
          disponivel: true,
        },
        orderBy: {
          ordem: 'asc',
        },
        select: {
          id: true,
          nome: true,
          preco: true,
          midia: true,
          descricao: true,
          categoria: true,
          ordem: true,
        },
      });

      logger.info(`Listados ${produtos.length} produtos disponíveis`);
      return produtos;
    } catch (error) {
      logger.error('Erro ao listar produtos:', error);
      throw new Error('Erro ao buscar produtos');
    }
  }

  /**
   * Busca produto por ID
   */
  async buscarProdutoPorId(id: string) {
    try {
      const produto = await prisma.produto.findUnique({
        where: { id },
        select: {
          id: true,
          nome: true,
          preco: true,
          midia: true,
          descricao: true,
          categoria: true,
          disponivel: true,
          ordem: true,
        },
      });

      if (!produto) {
        logger.warn(`Produto não encontrado: ${id}`);
        return null;
      }

      logger.info(`Produto encontrado: ${produto.nome}`);
      return produto;
    } catch (error) {
      logger.error(`Erro ao buscar produto ${id}:`, error);
      throw new Error('Erro ao buscar produto');
    }
  }

  /**
   * Lista produtos por categoria
   */
  async listarProdutosPorCategoria(categoria: string) {
    try {
      const produtos = await prisma.produto.findMany({
        where: {
          categoria,
          disponivel: true,
        },
        orderBy: {
          ordem: 'asc',
        },
        select: {
          id: true,
          nome: true,
          preco: true,
          midia: true,
          descricao: true,
          categoria: true,
          ordem: true,
        },
      });

      logger.info(`Listados ${produtos.length} produtos da categoria ${categoria}`);
      return produtos;
    } catch (error) {
      logger.error(`Erro ao listar produtos da categoria ${categoria}:`, error);
      throw new Error('Erro ao buscar produtos por categoria');
    }
  }
}

export default new ProdutoService();
