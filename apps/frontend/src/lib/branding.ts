import { headers } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Brand {
  slug: string;
  nome: string;
  logoUrl: string;
  tema: Record<string, unknown> | null;
}

// Default neutro enquanto a marca não vem do cadastro do tenant
// (logo atual como placeholder; cada restaurante sobrescreve via cadastro).
export const DEFAULT_BRAND: Brand = {
  slug: 'rancho',
  nome: 'Rancho Comida Caseira',
  logoUrl: '/logo-symbol-brasa.svg',
  tema: null,
};

/**
 * Marca do restaurante atual (resolvido por host), buscada na API — server-side.
 * Encaminha o host original ao backend (x-forwarded-host) para resolver o tenant
 * certo. SEM cache (o cache do fetch é por URL e vazaria a marca entre tenants).
 * Cai no DEFAULT_BRAND em qualquer erro — nunca derruba a página.
 */
export async function getBranding(): Promise<Brand> {
  try {
    const host = headers().get('x-forwarded-host') || headers().get('host') || '';
    const res = await fetch(`${API_BASE_URL}/api/loja/branding`, {
      headers: host ? { 'x-forwarded-host': host } : undefined,
      cache: 'no-store',
    });
    if (!res.ok) return DEFAULT_BRAND;
    const json = await res.json();
    const d = json?.data;
    if (!d?.nome) return DEFAULT_BRAND;
    return {
      slug: d.slug ?? DEFAULT_BRAND.slug,
      nome: d.nome,
      logoUrl: d.logoUrl ?? DEFAULT_BRAND.logoUrl,
      tema: d.tema ?? null,
    };
  } catch {
    return DEFAULT_BRAND;
  }
}
