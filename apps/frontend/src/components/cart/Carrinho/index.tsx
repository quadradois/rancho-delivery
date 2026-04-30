/**
 * Carrinho - Componente de carrinho de compras
 * 
 * Exibe os itens do carrinho em um bottom sheet com:
 * - Listagem de itens
 * - Controles de quantidade (+/-)
 * - Subtotal, taxa de entrega e total
 * - Botão para finalizar pedido
 * - Integração completa com CarrinhoContext
 * 
 * Features:
 * - Bottom sheet animado
 * - Controles de quantidade
 * - Cálculos automáticos
 * - Estado vazio
 * - Acessibilidade completa
 */

import React from 'react';
import Image from 'next/image';
import { BottomSheet } from '../../ui/BottomSheet';
import { useCarrinho } from '../../../hooks/useCarrinho';
import { formatarPreco } from '../../../utils/formatters';
import './styles.css';

export interface CarrinhoProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalizarPedido: () => void;
}

export const Carrinho: React.FC<CarrinhoProps> = ({
  isOpen,
  onClose,
  onFinalizarPedido,
}) => {
  const {
    itens,
    quantidadeTotal,
    subtotal,
    taxaEntrega,
    total,
    atualizarQuantidade,
    removerItem,
  } = useCarrinho();

  /**
   * Incrementa a quantidade de um item
   */
  const handleIncrementar = (produtoId: string, quantidadeAtual: number) => {
    atualizarQuantidade(produtoId, quantidadeAtual + 1);
  };

  /**
   * Decrementa a quantidade de um item
   */
  const handleDecrementar = (produtoId: string, quantidadeAtual: number) => {
    if (quantidadeAtual > 1) {
      atualizarQuantidade(produtoId, quantidadeAtual - 1);
    } else {
      removerItem(produtoId);
    }
  };

  /**
   * Remove um item do carrinho
   */
  const handleRemover = (produtoId: string) => {
    removerItem(produtoId);
  };

  /**
   * Finaliza o pedido
   */
  const handleFinalizar = () => {
    if (itens.length === 0) return;
    onFinalizarPedido();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Seu Carrinho"
      maxHeight="85vh"
    >
      <div className="carrinho">
        {/* Estado vazio */}
        {itens.length === 0 ? (
          <div className="carrinho__empty">
            <div className="carrinho__empty-icon" aria-hidden="true">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <h3 className="carrinho__empty-title">Carrinho vazio</h3>
            <p className="carrinho__empty-message">
              Adicione produtos ao carrinho para continuar
            </p>
          </div>
        ) : (
          <>
            {/* Lista de itens */}
            <div className="carrinho__items" role="list">
              {itens.map((item) => (
                <div
                  key={item.produto.id}
                  className="carrinho__item"
                  role="listitem"
                >
                  {/* Imagem do produto */}
                  <div className="carrinho__item-image">
                    <Image
                      src={item.produto.midia}
                      alt={item.produto.nome}
                      width={80}
                      height={80}
                      loading="lazy"
                    />
                  </div>

                  {/* Informações do produto */}
                  <div className="carrinho__item-info">
                    <h4 className="carrinho__item-name">{item.produto.nome}</h4>
                    {item.observacao && (
                      <p className="carrinho__item-obs">
                        Obs: {item.observacao}
                      </p>
                    )}
                    <p className="carrinho__item-price">
                      {formatarPreco(item.produto.preco)}
                    </p>
                  </div>

                  {/* Controles de quantidade */}
                  <div className="carrinho__item-controls">
                    <div className="carrinho__quantity">
                      <button
                        type="button"
                        className="carrinho__quantity-btn"
                        onClick={() =>
                          handleDecrementar(item.produto.id, item.quantidade)
                        }
                        aria-label={`Diminuir quantidade de ${item.produto.nome}`}
                      >
                        {item.quantidade === 1 ? (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        )}
                      </button>

                      <span
                        className="carrinho__quantity-value"
                        aria-label={`Quantidade: ${item.quantidade}`}
                      >
                        {item.quantidade}
                      </span>

                      <button
                        type="button"
                        className="carrinho__quantity-btn"
                        onClick={() =>
                          handleIncrementar(item.produto.id, item.quantidade)
                        }
                        aria-label={`Aumentar quantidade de ${item.produto.nome}`}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    </div>

                    {/* Subtotal do item */}
                    <p className="carrinho__item-subtotal">
                      {formatarPreco(item.produto.preco * item.quantidade)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumo do pedido */}
            <div className="carrinho__summary">
              <div className="carrinho__summary-row">
                <span className="carrinho__summary-label">
                  Subtotal ({quantidadeTotal}{' '}
                  {quantidadeTotal === 1 ? 'item' : 'itens'})
                </span>
                <span className="carrinho__summary-value">
                  {formatarPreco(subtotal)}
                </span>
              </div>

              <div className="carrinho__summary-row">
                <span className="carrinho__summary-label">Taxa de entrega</span>
                <span className="carrinho__summary-value">
                  {taxaEntrega === 0
                    ? 'Grátis'
                    : formatarPreco(taxaEntrega)}
                </span>
              </div>

              <div className="carrinho__summary-divider" />

              <div className="carrinho__summary-row carrinho__summary-row--total">
                <span className="carrinho__summary-label">Total</span>
                <span className="carrinho__summary-value carrinho__summary-value--total">
                  {formatarPreco(total)}
                </span>
              </div>
            </div>

            {/* Botão finalizar pedido */}
            <button
              type="button"
              className="carrinho__checkout-btn"
              onClick={handleFinalizar}
              disabled={itens.length === 0}
            >
              Finalizar Pedido
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
};

export default Carrinho;
