'use client';

import React from 'react';
import { CartProvider, useCart } from './CartContext';
import { CarrinhoItem, ProdutoCardDTO } from '../types/domain.types';

type CarrinhoState = {
  itens: CarrinhoItem[];
  quantidadeTotal: number;
  subtotal: number;
  taxaEntrega: number;
  total: number;
};

type CarrinhoActions = {
  adicionarItem: (produto: ProdutoCardDTO, quantidade?: number, observacao?: string) => void;
  removerItem: (produtoId: string) => void;
  atualizarQuantidade: (produtoId: string, quantidade: number) => void;
  atualizarObservacao: (produtoId: string, observacao: string) => void;
  limparCarrinho: () => void;
  definirTaxaEntrega: (taxa: number) => void;
};

export type CarrinhoContextType = CarrinhoState & CarrinhoActions;

// Compatibilidade: mantém o nome antigo, mas usa o provider consolidado.
export const CarrinhoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <CartProvider>{children}</CartProvider>;
};

export const useCarrinho = (): CarrinhoContextType => {
  let cart: ReturnType<typeof useCart>;
  try {
    cart = useCart();
  } catch {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  }

  const itens: CarrinhoItem[] = cart.items.map((item) => ({
    produto: {
      id: item.id,
      nome: item.name,
      preco: item.price,
      midia: item.imageUrl || '',
      descricao: item.description || '',
      categoria: '',
    },
    quantidade: item.quantity,
    observacao: item.observacao,
  }));

  return {
    itens,
    quantidadeTotal: cart.itemCount,
    subtotal: cart.totalPrice,
    taxaEntrega: cart.deliveryFee,
    total: cart.total,
    adicionarItem: (produto, quantidade = 1, observacao) => {
      for (let i = 0; i < quantidade; i += 1) {
        cart.addItem({
          id: produto.id,
          name: produto.nome,
          price: produto.preco,
          description: produto.descricao,
          imageUrl: produto.midia,
          observacao,
        });
      }
      if (observacao) {
        cart.updateObservacao(produto.id, observacao);
      }
    },
    removerItem: (produtoId) => cart.removeItem(produtoId),
    atualizarQuantidade: (produtoId, quantidade) => cart.updateQuantity(produtoId, quantidade),
    atualizarObservacao: (produtoId, observacao) => cart.updateObservacao(produtoId, observacao),
    limparCarrinho: () => cart.clearCart(),
    definirTaxaEntrega: (taxa) => cart.setDeliveryFee(taxa),
  };
};
