# Link preview com imagem no WhatsApp — site institucional FoodFlow

**Data:** 2026-06-18
**Status:** Aprovado, pronto para plano de implementação

## Problema

Ao compartilhar o link do site institucional FoodFlow no WhatsApp (e redes sociais),
aparece apenas o link puro, sem cartão com imagem. O WhatsApp só monta o cartão de
preview quando a página expõe meta tags Open Graph — principalmente `og:image`,
`og:title`, `og:description` e uma **URL absoluta** (via `metadataBase`).

Estado atual: `app/marketing/layout.tsx` já tem `openGraph` com title/description/type,
mas **sem `og:image`** e **sem `metadataBase`**. Por isso o WhatsApp não tem imagem para
puxar e mostra só o texto.

## Escopo

Apenas o **site institucional FoodFlow** (`app/marketing/`). Não toca no layout root
nem nas lojas dos tenants (white-label per-tenant fica fora deste escopo, decisão do
usuário).

## Decisões

- **Imagem:** gerada por código com `next/og` (`ImageResponse`) — banner 1200×630 com a
  marca FoodFlow. Sem dependência de designer; arte versionada no código.
- **Domínio:** não hardcodear. `metadataBase` é derivado dinamicamente do host da
  requisição (`x-forwarded-host`/`host`, mesmo padrão de `lib/branding.ts`), com
  `https://foodflow.ia.br` como fallback. Funciona em qualquer domínio que o cliente
  escolher (`foodflow.ia.br`, `www.foodflow.ia.br`, etc.).

## Mudanças

1. **`app/marketing/opengraph-image.tsx`** (novo)
   - Convenção de arquivo do Next App Router. Exporta `size = { width: 1200, height: 630 }`,
     `contentType = 'image/png'` e um default que retorna `ImageResponse`.
   - Banner com fundo da marca, "FoodFlow" + tagline da AURA.
   - O Next liga automaticamente `og:image`, `og:image:width`, `og:image:height` e
     `twitter:image`, resolvendo a URL absoluta contra o `metadataBase`.

2. **`app/marketing/layout.tsx`** (editar)
   - Trocar o `export const metadata` estático por `export async function generateMetadata()`.
   - Definir `metadataBase: new URL(\`https://${host}\`)` com host lido de `headers()`;
     fallback `https://foodflow.ia.br`.
   - Adicionar `twitter: { card: 'summary_large_image' }`.
   - Manter title/description/openGraph(title/description/type) atuais.

3. Nada além disso.

## Critério de sucesso

- Inspecionar o HTML servido em `/marketing`: existe `<meta property="og:image">` com
  **URL absoluta**, mais `og:image:width/height` e `twitter:card=summary_large_image`.
- A rota `/marketing/opengraph-image` retorna um PNG 1200×630 válido.
- Validador da Meta (developers.facebook.com/tools/debug) renderiza o cartão com imagem.
- `pnpm --filter @rancho-delivery/frontend build` (ou typecheck) passa.

## Observações

- **Cache do WhatsApp:** previews são cacheados de forma agressiva por link. Links já
  compartilhados podem manter o cartão antigo por horas/dias. Para testar: usar URL nova
  (`?v=1`) ou forçar re-scrape pelo debugger da Meta.
- `next.config.js` tem `images.unoptimized: true` — não afeta `next/og`, que gera o PNG
  em runtime independente do otimizador de imagens.
