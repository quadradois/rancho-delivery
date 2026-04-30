/**
 * CardProduto - Componente de card de produto
 * 
 * Exibe informações do produto e permite adicionar ao carrinho
 * 
 * Features:
 * - Exibição de imagem, nome, descrição e preço
 * - Botão de adicionar ao carrinho
 * - Estados: hover, loading, disabled
 * - Responsivo (mobile-first)
 * - Acessibilidade (ARIA labels)
 */

import React, { useState } from 'react';
import Image from 'next/image';
import { ProdutoCardDTO } from '../../../types/domain.types';
import { useCarrinho } from '../../../hooks/useCarrinho';
import { formatarPreco } from '../../../utils/formatters';
import './styles.css';

export interface CardProdutoProps {
  produto: ProdutoCardDTO;
  disabled?: boolean;
  onAdicionado?: (produto: ProdutoCardDTO) => void;
}

export const CardProduto: React.FC<CardProdutoProps> = ({
  produto,
  disabled = false,
  onAdicionado,
}) => {
  const { adicionarItem } = useCarrinho();
  const [isLoading, setIsLoading] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  /**
   * Adiciona o produto ao carrinho
   */
  const handleAdicionar = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);

    try {
      // Simula um pequeno delay para feedback visual
      await new Promise((resolve) => setTimeout(resolve, 300));

      adicionarItem(produto, 1);

      // Feedback visual de sucesso
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 2000);

      // Callback opcional
      onAdicionado?.(produto);
    } catch (error) {
      console.error('Erro ao adicionar produto ao carrinho:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = disabled || isLoading;

  return (
    <article
      className={`card-produto ${isDisabled ? 'card-produto--disabled' : ''}`}
      aria-label={`Produto: ${produto.nome}`}
    >
      {/* Imagem do produto */}
      <div className="card-produto__image-container">
        <Image
          src={produto.midia}
          alt={produto.nome}
          className="card-produto__image"
          width={300}
          height={200}
          loading="lazy"
        />
        
        {/* Badge de categoria */}
        {produto.categoria && (
          <span className="card-produto__badge" aria-label={`Categoria: ${produto.categoria}`}>
            {produto.categoria}
          </span>
        )}
      </div>

      {/* Conteúdo do card */}
      <div className="card-produto__content">
        {/* Nome do produto */}
        <h3 className="card-produto__title">{produto.nome}</h3>

        {/* Descrição */}
        {produto.descricao && (
          <p className="card-produto__description">{produto.descricao}</p>
        )}

        {/* Footer: Preço e botão */}
        <div className="card-produto__footer">
          {/* Preço */}
          <span className="card-produto__price" aria-label={`Preço: ${formatarPreco(produto.preco)}`}>
            {formatarPreco(produto.preco)}
          </span>

          {/* Botão de adicionar */}
          <button
            type="button"
            className={`card-produto__button ${isAdded ? 'card-produto__button--added' : ''}`}
            onClick={handleAdicionar}
            disabled={isDisabled}
            aria-label={`Adicionar ${produto.nome} ao carrinho`}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="card-produto__button-spinner" aria-hidden="true" />
                <span className="sr-only">Adicionando...</span>
              </>
            ) : isAdded ? (
              <>
                <svg
                  className="card-produto__button-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M16.6667 5L7.50004 14.1667L3.33337 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Adicionado!
              </>
            ) : (
              <>
                <svg
                  className="card-produto__button-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M10 4.16667V15.8333M4.16667 10H15.8333"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};

export default CardProduto;
