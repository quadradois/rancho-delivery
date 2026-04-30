'use client';

/**
 * Context API para gerenciamento do carrinho de compras
 * 
 * Funcionalidades:
 * - Adicionar, remover e atualizar itens do carrinho
 * - Cálculo automático de subtotal e total
 * - Persistência no localStorage
 * - Hook customizado useCarrinho()
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { CarrinhoItem, ProdutoCardDTO } from '../types/domain.types';

/**
 * Estado do carrinho
 */
interface CarrinhoState {
  itens: CarrinhoItem[];
  quantidadeTotal: number;
  subtotal: number;
  taxaEntrega: number;
  total: number;
}

/**
 * Ações do carrinho
 */
interface CarrinhoActions {
  adicionarItem: (produto: ProdutoCardDTO, quantidade?: number, observacao?: string) => void;
  removerItem: (produtoId: string) => void;
  atualizarQuantidade: (produtoId: string, quantidade: number) => void;
  atualizarObservacao: (produtoId: string, observacao: string) => void;
  limparCarrinho: () => void;
  definirTaxaEntrega: (taxa: number) => void;
}

/**
 * Contexto do carrinho (estado + ações)
 */
type CarrinhoContextType = CarrinhoState & CarrinhoActions;

/**
 * Chave do localStorage
 */
const STORAGE_KEY = 'rancho-delivery:carrinho';

/**
 * Estado inicial do carrinho
 */
const initialState: CarrinhoState = {
  itens: [],
  quantidadeTotal: 0,
  subtotal: 0,
  taxaEntrega: 0,
  total: 0,
};

/**
 * Context do carrinho
 */
const CarrinhoContext = createContext<CarrinhoContextType | undefined>(undefined);

/**
 * Provider do carrinho
 */
export const CarrinhoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [itens, setItens] = useState<CarrinhoItem[]>([]);
  const [taxaEntrega, setTaxaEntrega] = useState<number>(0);

  /**
   * Carrega o carrinho do localStorage na inicialização
   */
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(STORAGE_KEY);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        setItens(parsed.itens || []);
        setTaxaEntrega(parsed.taxaEntrega || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho do localStorage:', error);
    }
  }, []);

  /**
   * Persiste o carrinho no localStorage sempre que houver mudanças
   */
  useEffect(() => {
    try {
      const dataToStore = {
        itens,
        taxaEntrega,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
    } catch (error) {
      console.error('Erro ao salvar carrinho no localStorage:', error);
    }
  }, [itens, taxaEntrega]);

  /**
   * Calcula a quantidade total de itens no carrinho
   */
  const quantidadeTotal = useMemo(() => {
    return itens.reduce((total, item) => total + item.quantidade, 0);
  }, [itens]);

  /**
   * Calcula o subtotal (soma dos preços dos produtos)
   */
  const subtotal = useMemo(() => {
    return itens.reduce((total, item) => {
      return total + item.produto.preco * item.quantidade;
    }, 0);
  }, [itens]);

  /**
   * Calcula o total (subtotal + taxa de entrega)
   */
  const total = useMemo(() => {
    return subtotal + taxaEntrega;
  }, [subtotal, taxaEntrega]);

  /**
   * Adiciona um item ao carrinho
   * Se o produto já existir, incrementa a quantidade
   */
  const adicionarItem = useCallback((
    produto: ProdutoCardDTO,
    quantidade: number = 1,
    observacao?: string
  ) => {
    setItens((prevItens) => {
      const itemExistente = prevItens.find((item) => item.produto.id === produto.id);

      if (itemExistente) {
        // Produto já existe, atualiza quantidade
        return prevItens.map((item) =>
          item.produto.id === produto.id
            ? {
                ...item,
                quantidade: item.quantidade + quantidade,
                observacao: observacao || item.observacao,
              }
            : item
        );
      } else {
        // Produto novo, adiciona ao carrinho
        return [
          ...prevItens,
          {
            produto,
            quantidade,
            observacao,
          },
        ];
      }
    });
  }, []);

  /**
   * Remove um item do carrinho
   */
  const removerItem = useCallback((produtoId: string) => {
    setItens((prevItens) => prevItens.filter((item) => item.produto.id !== produtoId));
  }, []);

  /**
   * Atualiza a quantidade de um item
   * Se a quantidade for 0 ou negativa, remove o item
   */
  const atualizarQuantidade = useCallback((produtoId: string, quantidade: number) => {
    if (quantidade <= 0) {
      removerItem(produtoId);
      return;
    }

    setItens((prevItens) =>
      prevItens.map((item) =>
        item.produto.id === produtoId
          ? { ...item, quantidade }
          : item
      )
    );
  }, [removerItem]);

  /**
   * Atualiza a observação de um item
   */
  const atualizarObservacao = useCallback((produtoId: string, observacao: string) => {
    setItens((prevItens) =>
      prevItens.map((item) =>
        item.produto.id === produtoId
          ? { ...item, observacao }
          : item
      )
    );
  }, []);

  /**
   * Limpa todos os itens do carrinho
   */
  const limparCarrinho = useCallback(() => {
    setItens([]);
    setTaxaEntrega(0);
  }, []);

  /**
   * Define a taxa de entrega
   */
  const definirTaxaEntrega = useCallback((taxa: number) => {
    setTaxaEntrega(taxa);
  }, []);

  /**
   * Valor do contexto
   */
  const value: CarrinhoContextType = {
    // Estado
    itens,
    quantidadeTotal,
    subtotal,
    taxaEntrega,
    total,
    // Ações
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    atualizarObservacao,
    limparCarrinho,
    definirTaxaEntrega,
  };

  return <CarrinhoContext.Provider value={value}>{children}</CarrinhoContext.Provider>;
};

/**
 * Hook customizado para usar o carrinho
 * 
 * @throws {Error} Se usado fora do CarrinhoProvider
 * 
 * @example
 * ```tsx
 * const { itens, adicionarItem, total } = useCarrinho();
 * 
 * const handleAdicionar = () => {
 *   adicionarItem(produto, 1, 'Sem cebola');
 * };
 * ```
 */
export const useCarrinho = (): CarrinhoContextType => {
  const context = useContext(CarrinhoContext);

  if (!context) {
    throw new Error('useCarrinho deve ser usado dentro de um CarrinhoProvider');
  }

  return context;
};
