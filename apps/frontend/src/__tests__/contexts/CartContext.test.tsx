/**
 * Testes unitários para CartContext (contexto consolidado)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart } from '../../contexts/CartContext';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider>{children}</CartProvider>
);

describe('CartContext', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('deve iniciar com carrinho vazio', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.totalPrice).toBe(0);
  });

  it('deve adicionar item ao carrinho', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(1);
    expect(result.current.itemCount).toBe(1);
    expect(result.current.totalPrice).toBe(25.9);
  });

  it('deve incrementar quantidade ao adicionar item existente', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.itemCount).toBe(2);
    expect(result.current.totalPrice).toBeCloseTo(51.8);
  });

  it('deve remover item do carrinho', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.removeItem('1');
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('deve atualizar quantidade de um item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.updateQuantity('1', 3);
    });

    expect(result.current.items[0].quantity).toBe(3);
    expect(result.current.itemCount).toBe(3);
  });

  it('deve remover item quando quantidade for 0', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.updateQuantity('1', 0);
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('deve limpar o carrinho', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.addItem({ id: '2', name: 'Coca-Cola', price: 7.0 });
      result.current.clearCart();
    });

    expect(result.current.items).toHaveLength(0);
    expect(result.current.totalPrice).toBe(0);
    expect(result.current.deliveryFee).toBe(0);
  });

  it('deve definir taxa de entrega e calcular total corretamente', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.setDeliveryFee(5.0);
    });

    expect(result.current.deliveryFee).toBe(5.0);
    expect(result.current.total).toBeCloseTo(30.9);
  });

  it('deve calcular total com múltiplos itens', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.addItem({ id: '2', name: 'Coca-Cola', price: 7.0 });
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
    });

    expect(result.current.itemCount).toBe(3);
    expect(result.current.totalPrice).toBeCloseTo(58.8);
  });

  it('deve lançar erro se usado fora do CartProvider', () => {
    expect(() => {
      renderHook(() => useCart());
    }).toThrow('useCart must be used within a CartProvider');
  });

  it('deve persistir carrinho no localStorage', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
    });

    const stored = JSON.parse(localStorageMock.getItem('sabor-express:carrinho') || '{}');
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].name).toBe('X-Burguer');
  });

  it('deve atualizar observação de um item', () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ id: '1', name: 'X-Burguer', price: 25.9 });
      result.current.updateObservacao('1', 'Sem cebola');
    });

    expect(result.current.items[0].observacao).toBe('Sem cebola');
  });
});
