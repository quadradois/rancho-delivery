import { NextResponse, type NextRequest } from 'next/server';

// Host do site institucional do FoodFlow (a plataforma). Os subdomínios
// (admin., {restaurante}.) e domínios próprios NÃO são tocados — continuam
// caindo no app de pedidos/painel como hoje.
const HOSTS_MARKETING = new Set(['foodflow.ia.br', 'www.foodflow.ia.br']);

export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  if (HOSTS_MARKETING.has(host) && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/marketing';
    // Atrás do proxy (Cloudflare/nginx), o nextUrl vem com host interno
    // localhost:3000 mas protocolo https (X-Forwarded-Proto) → "https://localhost:3000"
    // quebra a reescrita (TLS num servidor http) e dá 500. Casa o proto com o host interno.
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      url.protocol = 'http:';
    }
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

// Só intercepta a raiz — zero impacto em /api, /_next, painel e lojas.
export const config = { matcher: '/' };
