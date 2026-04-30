'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, ReactNode } from 'react';

const STORAGE_KEY = 'rancho-delivery:carrinho';

export interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  icon?: string;
  observacao?: string;
}

interface CartContextType {
  // Estado
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  deliveryFee: number;
  total: number;
  // Ações
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateObservacao: (id: string, observacao: string) => void;
  clearCart: () => void;
  setDeliveryFee: (fee: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryFee, setDeliveryFeeState] = useState<number>(0);

  // Carrega do localStorage na inicialização
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setItems(parsed.items || []);
        setDeliveryFeeState(parsed.deliveryFee || 0);
      }
    } catch {
      // ignora erros de parse
    }
  }, []);

  // Persiste no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, deliveryFee }));
    } catch {
      // ignora erros de storage
    }
  }, [items, deliveryFee]);

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const updateObservacao = useCallback((id: string, observacao: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, observacao } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDeliveryFeeState(0);
  }, []);

  const setDeliveryFee = useCallback((fee: number) => {
    setDeliveryFeeState(fee);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const total = useMemo(() => totalPrice + deliveryFee, [totalPrice, deliveryFee]);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        totalPrice,
        deliveryFee,
        total,
        addItem,
        removeItem,
        updateQuantity,
        updateObservacao,
        clearCart,
        setDeliveryFee,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
