'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Brand } from '@/lib/branding';

const FALLBACK: Brand = {
  slug: 'rancho',
  nome: 'Rancho Comida Caseira',
  logoUrl: '/logo-symbol-brasa.svg',
  tema: null,
};

const BrandContext = createContext<Brand | null>(null);

/** Provider preenchido no server (layout) com a marca do tenant atual. */
export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

/** Marca do restaurante atual (white-label), para componentes client. */
export function useBrand(): Brand {
  return useContext(BrandContext) ?? FALLBACK;
}
