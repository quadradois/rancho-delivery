/**
 * Serviço de Produtos
 * Gerencia operações relacionadas a produtos
 */

import { apiClient } from '@/lib/http-client';
import { Produto, ProdutoCardDTO } from '@/types/domain.types';

/**
 * Serviço de produtos
 */
export const produtoService = {
  /**
   * Lista todos os produtos disponíveis
   * @param categoria - Filtro opcional por categoria
   * @returns Array de produtos
   * 
   * @example
   * ```ts
   * const produtos = await produtoService.listar();
   * const pizzas = await produtoService.listar('pizza');
   * ```
   */
  async listar(categoria?: string): Promise<Produto[]> {
    const params = categoria ? { categoria } : undefined;
    return apiClient.get<Produto[]>('/produtos', params);
  },

  /**
   * Lista produtos no formato simplificado para cards
   * @param categoria - Filtro opcional por categoria
   * @returns Array de produtos no formato ProdutoCardDTO
   * 
   * @example
   * ```ts
   * const produtos = await produtoService.listarCards();
   * const pizzas = await produtoService.listarCards('pizza');
   * ```
   */
  async listarCards(categoria?: string): Promise<ProdutoCardDTO[]> {
    const produtos = await this.listar(categoria);
    
    // Converte Produto[] para ProdutoCardDTO[]
    return produtos.map((produto) => ({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      midia: produto.midia,
      descricao: produto.descricao,
      categoria: produto.categoria,
    }));
  },

  /**
   * Busca produto específico por ID
   * @param id - ID do produto
   * @returns Produto encontrado
   * @throws ApiException com código PRODUTO_NAO_ENCONTRADO ou PRODUTO_INDISPONIVEL
   * 
   * @example
   * ```ts
   * const produto = await produtoService.buscarPorId('123');
   * ```
   */
  async buscarPorId(id: string): Promise<Produto> {
    return apiClient.get<Produto>(`/produtos/${id}`);
  },
};

export default produtoService;
