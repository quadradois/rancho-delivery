import prisma from '../config/database';
import { logger } from '../config/logger';

interface ProdutoInput {
  nome: string;
  preco: number;
  midia?: string;
  descricao: string;
  categoria: string;
  disponivel?: boolean;
  ordem?: number;
  tempoPreparo?: number;
}

const PRODUTO_SELECT = {
  id: true,
  nome: true,
  preco: true,
  midia: true,
  descricao: true,
  categoria: true,
  disponivel: true,
  ordem: true,
  tempoPreparo: true,
};

export class ProdutoService {
  /**
   * Lista todos os produtos disponíveis ordenados por ordem
   */
  async listarProdutos() {
    try {
      const produtos = await prisma.produto.findMany({
        where: { disponivel: true },
        orderBy: { ordem: 'asc' },
        select: PRODUTO_SELECT,
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
        select: PRODUTO_SELECT,
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
        where: { categoria, disponivel: true },
        orderBy: { ordem: 'asc' },
        select: PRODUTO_SELECT,
      });

      logger.info(`Listados ${produtos.length} produtos da categoria ${categoria}`);
      return produtos;
    } catch (error) {
      logger.error(`Erro ao listar produtos da categoria ${categoria}:`, error);
      throw new Error('Erro ao buscar produtos por categoria');
    }
  }

  /**
   * Cria um produto no cardápio
   */
  async criarProduto(dados: ProdutoInput) {
    try {
      const produto = await prisma.produto.create({
        data: {
          nome: dados.nome,
          preco: dados.preco,
          midia: dados.midia || '',
          descricao: dados.descricao,
          categoria: dados.categoria,
          disponivel: dados.disponivel ?? true,
          ordem: dados.ordem ?? 0,
          tempoPreparo: dados.tempoPreparo ?? 15,
        },
      });

      logger.info(`Produto criado: ${produto.nome}`);
      return produto;
    } catch (error) {
      logger.error('Erro ao criar produto:', error);
      throw new Error('Erro ao criar produto');
    }
  }

  /**
   * Atualiza um produto existente
   */
  async atualizarProduto(id: string, dados: Partial<ProdutoInput>) {
    try {
      const produto = await prisma.produto.update({
        where: { id },
        data: {
          ...(dados.nome !== undefined && { nome: dados.nome }),
          ...(dados.preco !== undefined && { preco: dados.preco }),
          ...(dados.midia !== undefined && { midia: dados.midia || '' }),
          ...(dados.descricao !== undefined && { descricao: dados.descricao }),
          ...(dados.categoria !== undefined && { categoria: dados.categoria }),
          ...(dados.disponivel !== undefined && { disponivel: dados.disponivel }),
          ...(dados.ordem !== undefined && { ordem: dados.ordem }),
          ...(dados.tempoPreparo !== undefined && { tempoPreparo: dados.tempoPreparo }),
        },
      });

      logger.info(`Produto atualizado: ${produto.nome}`);
      return produto;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        logger.warn(`Produto não encontrado para atualização: ${id}`);
        return null;
      }
      logger.error(`Erro ao atualizar produto ${id}:`, error);
      throw new Error('Erro ao atualizar produto');
    }
  }

  /**
   * Remove produto do cardápio sem apagar histórico de pedidos
   */
  async excluirProduto(id: string) {
    try {
      const produto = await prisma.produto.update({
        where: { id },
        data: { disponivel: false },
      });

      logger.info(`Produto desativado: ${produto.nome}`);
      return produto;
    } catch (error: any) {
      if (error?.code === 'P2025') {
        logger.warn(`Produto não encontrado para exclusão: ${id}`);
        return null;
      }
      logger.error(`Erro ao excluir produto ${id}:`, error);
      throw new Error('Erro ao excluir produto');
    }
  }
}

export default new ProdutoService();
