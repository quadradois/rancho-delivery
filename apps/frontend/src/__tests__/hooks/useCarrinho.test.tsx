/**
 * Testes de Regressão para useCarrinho e CarrinhoContext
 * 
 * Testa todas as funcionalidades críticas do carrinho:
 * - Adicionar, remover e atualizar itens
 * - Cálculos de subtotal, taxa e total
 * - Persistência no localStorage
 * - Validações e edge cases
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CarrinhoProvider, useCarrinho } from '../../contexts/CarrinhoContext';
import { ProdutoCardDTO } from '../../types/domain.types';

// Mock do localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useCarrinho - Testes de Regressão', () => {
  const mockProduto1: ProdutoCardDTO = {
    id: 'prod-1',
    nome: 'Marmita Executiva',
    preco: 24.90,
    midia: 'https://example.com/foto.jpg',
    descricao: 'Descrição do produto',
    categoria: 'Executiva',
    ordem: 1,
  };

  const mockProduto2: ProdutoCardDTO = {
    id: 'prod-2',
    nome: 'Refrigerante',
    preco: 5.00,
    midia: 'https://example.com/foto2.jpg',
    descricao: 'Bebida gelada',
    categoria: 'Bebidas',
    ordem: 2,
  };

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com carrinho vazio', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      expect(result.current.itens).toEqual([]);
      expect(result.current.quantidadeTotal).toBe(0);
      expect(result.current.subtotal).toBe(0);
      expect(result.current.taxaEntrega).toBe(0);
      expect(result.current.total).toBe(0);
    });

    it('deve carregar dados do localStorage na inicialização', () => {
      const dadosSalvos = {
        itens: [
          {
            produto: mockProduto1,
            quantidade: 2,
            observacao: 'Sem cebola',
          },
        ],
        taxaEntrega: 6.00,
      };

      localStorageMock.setItem('rancho-delivery:carrinho', JSON.stringify(dadosSalvos));

      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      expect(result.current.itens).toHaveLength(1);
      expect(result.current.itens[0].produto.id).toBe('prod-1');
      expect(result.current.itens[0].quantidade).toBe(2);
      expect(result.current.taxaEntrega).toBe(6.00);
    });

    it('deve lançar erro quando usado fora do provider', () => {
      expect(() => {
        renderHook(() => useCarrinho());
      }).toThrow('useCarrinho deve ser usado dentro de um CarrinhoProvider');
    });
  });

  describe('Adicionar Itens', () => {
    it('deve adicionar novo item ao carrinho', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      expect(result.current.itens).toHaveLength(1);
      expect(result.current.itens[0].produto.id).toBe('prod-1');
      expect(result.current.itens[0].quantidade).toBe(1);
      expect(result.current.quantidadeTotal).toBe(1);
    });

    it('deve adicionar item com observação', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1, 'Sem cebola');
      });

      expect(result.current.itens[0].observacao).toBe('Sem cebola');
    });

    it('deve incrementar quantidade quando produto já existe', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2);
      });

      expect(result.current.itens).toHaveLength(1);
      expect(result.current.itens[0].quantidade).toBe(3);
      expect(result.current.quantidadeTotal).toBe(3);
    });

    it('deve adicionar múltiplos produtos diferentes', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2);
        result.current.adicionarItem(mockProduto2, 1);
      });

      expect(result.current.itens).toHaveLength(2);
      expect(result.current.quantidadeTotal).toBe(3);
    });

    it('deve atualizar observação quando produto já existe', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1, 'Sem cebola');
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1, 'Sem tomate');
      });

      expect(result.current.itens[0].observacao).toBe('Sem tomate');
      expect(result.current.itens[0].quantidade).toBe(2);
    });
  });

  describe('Remover Itens', () => {
    it('deve remover item do carrinho', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
        result.current.adicionarItem(mockProduto2, 1);
      });

      expect(result.current.itens).toHaveLength(2);

      act(() => {
        result.current.removerItem('prod-1');
      });

      expect(result.current.itens).toHaveLength(1);
      expect(result.current.itens[0].produto.id).toBe('prod-2');
    });

    it('deve não fazer nada ao remover item inexistente', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      act(() => {
        result.current.removerItem('prod-inexistente');
      });

      expect(result.current.itens).toHaveLength(1);
    });
  });

  describe('Atualizar Quantidade', () => {
    it('deve atualizar quantidade de um item', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      act(() => {
        result.current.atualizarQuantidade('prod-1', 5);
      });

      expect(result.current.itens[0].quantidade).toBe(5);
      expect(result.current.quantidadeTotal).toBe(5);
    });

    it('deve remover item quando quantidade for 0', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      act(() => {
        result.current.atualizarQuantidade('prod-1', 0);
      });

      expect(result.current.itens).toHaveLength(0);
    });

    it('deve remover item quando quantidade for negativa', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      act(() => {
        result.current.atualizarQuantidade('prod-1', -1);
      });

      expect(result.current.itens).toHaveLength(0);
    });
  });

  describe('Atualizar Observação', () => {
    it('deve atualizar observação de um item', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1, 'Sem cebola');
      });

      act(() => {
        result.current.atualizarObservacao('prod-1', 'Sem cebola e sem tomate');
      });

      expect(result.current.itens[0].observacao).toBe('Sem cebola e sem tomate');
    });

    it('deve não afetar outros itens ao atualizar observação', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1, 'Obs 1');
        result.current.adicionarItem(mockProduto2, 1, 'Obs 2');
      });

      act(() => {
        result.current.atualizarObservacao('prod-1', 'Nova obs 1');
      });

      expect(result.current.itens[0].observacao).toBe('Nova obs 1');
      expect(result.current.itens[1].observacao).toBe('Obs 2');
    });
  });

  describe('Limpar Carrinho', () => {
    it('deve limpar todos os itens do carrinho', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2);
        result.current.adicionarItem(mockProduto2, 1);
        result.current.definirTaxaEntrega(6.00);
      });

      expect(result.current.itens).toHaveLength(2);
      expect(result.current.taxaEntrega).toBe(6.00);

      act(() => {
        result.current.limparCarrinho();
      });

      expect(result.current.itens).toHaveLength(0);
      expect(result.current.quantidadeTotal).toBe(0);
      expect(result.current.subtotal).toBe(0);
      expect(result.current.taxaEntrega).toBe(0);
      expect(result.current.total).toBe(0);
    });
  });

  describe('Cálculos', () => {
    it('deve calcular subtotal corretamente com um item', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2); // 2 x 24.90 = 49.80
      });

      expect(result.current.subtotal).toBe(49.80);
    });

    it('deve calcular subtotal corretamente com múltiplos itens', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2); // 2 x 24.90 = 49.80
        result.current.adicionarItem(mockProduto2, 3); // 3 x 5.00 = 15.00
      });

      expect(result.current.subtotal).toBe(64.80); // 49.80 + 15.00
    });

    it('deve calcular total com taxa de entrega', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2); // 49.80
        result.current.definirTaxaEntrega(6.00);
      });

      expect(result.current.subtotal).toBe(49.80);
      expect(result.current.taxaEntrega).toBe(6.00);
      expect(result.current.total).toBe(55.80); // 49.80 + 6.00
    });

    it('deve recalcular totais ao atualizar quantidade', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1); // 24.90
        result.current.definirTaxaEntrega(6.00);
      });

      expect(result.current.total).toBe(30.90);

      act(() => {
        result.current.atualizarQuantidade('prod-1', 3); // 3 x 24.90 = 74.70
      });

      expect(result.current.subtotal).toBeCloseTo(74.70, 2);
      expect(result.current.total).toBeCloseTo(80.70, 2); // 74.70 + 6.00
    });

    it('deve recalcular totais ao remover item', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2); // 49.80
        result.current.adicionarItem(mockProduto2, 1); // 5.00
        result.current.definirTaxaEntrega(6.00);
      });

      expect(result.current.total).toBe(60.80); // 54.80 + 6.00

      act(() => {
        result.current.removerItem('prod-2');
      });

      expect(result.current.subtotal).toBe(49.80);
      expect(result.current.total).toBe(55.80); // 49.80 + 6.00
    });
  });

  describe('Persistência no localStorage', () => {
    it('deve salvar carrinho no localStorage ao adicionar item', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 2);
      });

      const saved = JSON.parse(localStorageMock.getItem('rancho-delivery:carrinho') || '{}');
      expect(saved.itens).toHaveLength(1);
      expect(saved.itens[0].produto.id).toBe('prod-1');
      expect(saved.itens[0].quantidade).toBe(2);
    });

    it('deve salvar taxa de entrega no localStorage', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.definirTaxaEntrega(6.00);
      });

      const saved = JSON.parse(localStorageMock.getItem('rancho-delivery:carrinho') || '{}');
      expect(saved.taxaEntrega).toBe(6.00);
    });

    it('deve atualizar localStorage ao remover item', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
        result.current.adicionarItem(mockProduto2, 1);
      });

      act(() => {
        result.current.removerItem('prod-1');
      });

      const saved = JSON.parse(localStorageMock.getItem('rancho-delivery:carrinho') || '{}');
      expect(saved.itens).toHaveLength(1);
      expect(saved.itens[0].produto.id).toBe('prod-2');
    });

    it('deve limpar localStorage ao limpar carrinho', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
      });

      act(() => {
        result.current.limparCarrinho();
      });

      const saved = JSON.parse(localStorageMock.getItem('rancho-delivery:carrinho') || '{}');
      expect(saved.itens).toEqual([]);
      expect(saved.taxaEntrega).toBe(0);
    });
  });

  describe('Casos de Regressão Críticos', () => {
    it('deve manter integridade ao adicionar mesmo produto múltiplas vezes', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
        result.current.adicionarItem(mockProduto1, 1);
        result.current.adicionarItem(mockProduto1, 1);
      });

      expect(result.current.itens).toHaveLength(1);
      expect(result.current.itens[0].quantidade).toBe(3);
      expect(result.current.quantidadeTotal).toBe(3);
    });

    it('deve calcular corretamente com valores decimais', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 3); // 3 x 24.90 = 74.70
        result.current.definirTaxaEntrega(5.50);
      });

      expect(result.current.subtotal).toBeCloseTo(74.70, 2);
      expect(result.current.total).toBeCloseTo(80.20, 2);
    });

    it('deve manter ordem dos itens ao adicionar', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.adicionarItem(mockProduto1, 1);
        result.current.adicionarItem(mockProduto2, 1);
      });

      expect(result.current.itens[0].produto.id).toBe('prod-1');
      expect(result.current.itens[1].produto.id).toBe('prod-2');
    });

    it('deve lidar com carrinho vazio ao tentar remover', () => {
      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      act(() => {
        result.current.removerItem('prod-1');
      });

      expect(result.current.itens).toHaveLength(0);
      expect(result.current.total).toBe(0);
    });

    it('deve lidar com localStorage corrompido', () => {
      localStorageMock.setItem('rancho-delivery:carrinho', 'invalid json');

      const { result } = renderHook(() => useCarrinho(), {
        wrapper: CarrinhoProvider,
      });

      // Deve inicializar com carrinho vazio
      expect(result.current.itens).toEqual([]);
      expect(result.current.total).toBe(0);
    });
  });
});
