/**
 * Página de Cardápio - Feed Vertical com Scroll Snap
 * 
 * Features:
 * - Feed vertical com scroll snap
 * - Carregamento de produtos da API
 * - Estados de loading (skeleton screens)
 * - Tratamento de erros
 * - Performance otimizada (lazy loading de imagens)
 * - Integração com CardProduto e CarrinhoContext
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CardProduto } from '../../components/product/CardProduto';
import { produtoService } from '../../services';
import { ProdutoCardDTO } from '../../types/domain.types';
import './styles.css';

export const Cardapio: React.FC = () => {
  const [produtos, setProdutos] = useState<ProdutoCardDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | undefined>(undefined);

  /**
   * Carrega produtos da API
   */
  const carregarProdutos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await produtoService.listarCards(categoriaAtiva);
      setProdutos(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar produtos';
      setError(errorMessage);
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setIsLoading(false);
    }
  }, [categoriaAtiva]);

  /**
   * Carrega produtos na inicialização e quando a categoria muda
   */
  useEffect(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  /**
   * Callback quando um produto é adicionado ao carrinho
   */
  const handleProdutoAdicionado = useCallback((produto: ProdutoCardDTO) => {
    console.log('Produto adicionado ao carrinho:', produto.nome);
  }, []);

  /**
   * Tenta recarregar os produtos
   */
  const handleTentarNovamente = useCallback(() => {
    carregarProdutos();
  }, [carregarProdutos]);

  return (
    <div className="cardapio">
      {/* Loading State */}
      {isLoading && (
        <div className="cardapio__loading">
          <CardapioSkeleton />
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="cardapio__error">
          <div className="cardapio__error-icon" aria-hidden="true">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="cardapio__error-title">Erro ao carregar cardápio</h2>
          <p className="cardapio__error-message">{error}</p>
          <button
            type="button"
            className="cardapio__error-button"
            onClick={handleTentarNovamente}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && produtos.length === 0 && (
        <div className="cardapio__empty">
          <div className="cardapio__empty-icon" aria-hidden="true">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3h18v18H3z" />
              <path d="M9 9h6v6H9z" />
            </svg>
          </div>
          <h2 className="cardapio__empty-title">Nenhum produto disponível</h2>
          <p className="cardapio__empty-message">
            Não há produtos cadastrados no momento.
          </p>
        </div>
      )}

      {/* Feed Vertical com Scroll Snap */}
      {!isLoading && !error && produtos.length > 0 && (
        <div className="cardapio__feed" role="feed" aria-label="Feed de produtos">
          {produtos.map((produto, index) => (
            <article
              key={produto.id}
              className="cardapio__item"
              aria-posinset={index + 1}
              aria-setsize={produtos.length}
            >
              <CardProduto
                produto={produto}
                onAdicionado={handleProdutoAdicionado}
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Skeleton Screen para loading
 */
const CardapioSkeleton: React.FC = () => {
  return (
    <div className="cardapio__feed" aria-label="Carregando produtos" aria-busy="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="cardapio__item">
          <div className="cardapio__skeleton">
            {/* Imagem skeleton */}
            <div className="cardapio__skeleton-image skeleton" />
            
            {/* Conteúdo skeleton */}
            <div className="cardapio__skeleton-content">
              <div className="cardapio__skeleton-badge skeleton" />
              <div className="cardapio__skeleton-title skeleton" />
              <div className="cardapio__skeleton-description skeleton" />
              <div className="cardapio__skeleton-description skeleton" />
              
              <div className="cardapio__skeleton-footer">
                <div className="cardapio__skeleton-price skeleton" />
                <div className="cardapio__skeleton-button skeleton" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Cardapio;
