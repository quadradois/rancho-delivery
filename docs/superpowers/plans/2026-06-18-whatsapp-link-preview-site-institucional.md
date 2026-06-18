# Link preview WhatsApp — site institucional FoodFlow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o link do site institucional FoodFlow exibir um cartão com imagem no WhatsApp, adicionando `og:image` (gerado por código) e `metadataBase` dinâmico.

**Architecture:** Três peças isoladas em `apps/frontend/src/app/marketing/`. Um helper puro converte o host da requisição em URL absoluta do site (testável). Um arquivo `opengraph-image.tsx` (convenção do Next App Router) gera um banner 1200×630 com `next/og`. O `layout.tsx` do marketing passa a usar `generateMetadata()` para definir `metadataBase` dinâmico + `twitter card`.

**Tech Stack:** Next.js 14.2.35 (App Router), `next/og` (`ImageResponse`), `next/headers`, TypeScript, Vitest.

## Global Constraints

- Mexer **somente** em `apps/frontend/src/app/marketing/` e adicionar um helper em `apps/frontend/src/lib/`. Não tocar no layout root nem nas lojas de tenants.
- Domínio **não** hardcodeado: derivar de `x-forwarded-host`/`host` (mesmo padrão de `src/lib/branding.ts:29`), fallback `https://foodflow.ia.br`.
- Imagem OG: 1200×630, gerada por `next/og`. Sem dependência de designer/arte externa.
- Comandos rodam de `apps/frontend/` ou via `pnpm --filter @rancho-delivery/frontend <script>`.
- Verificação final antes de concluir: `pnpm --filter @rancho-delivery/frontend typecheck` e `... test`.

---

### Task 1: Helper `siteUrlFromHost` (URL absoluta a partir do host)

**Files:**
- Create: `apps/frontend/src/lib/siteUrl.ts`
- Test: `apps/frontend/src/__tests__/lib/siteUrl.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `siteUrlFromHost(host: string | null | undefined): string` — retorna `https://${host}` quando há host, senão `https://foodflow.ia.br`.

- [ ] **Step 1: Write the failing test**

Create `apps/frontend/src/__tests__/lib/siteUrl.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { siteUrlFromHost } from '@/lib/siteUrl';

describe('siteUrlFromHost', () => {
  it('usa o host da requisição com https', () => {
    expect(siteUrlFromHost('foodflow.ia.br')).toBe('https://foodflow.ia.br');
    expect(siteUrlFromHost('www.foodflow.ia.br')).toBe('https://www.foodflow.ia.br');
  });

  it('cai no domínio padrão quando o host é vazio/ausente', () => {
    expect(siteUrlFromHost('')).toBe('https://foodflow.ia.br');
    expect(siteUrlFromHost(null)).toBe('https://foodflow.ia.br');
    expect(siteUrlFromHost(undefined)).toBe('https://foodflow.ia.br');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @rancho-delivery/frontend exec vitest run src/__tests__/lib/siteUrl.test.ts`
Expected: FAIL — `Failed to resolve import "@/lib/siteUrl"` (arquivo ainda não existe).

- [ ] **Step 3: Write minimal implementation**

Create `apps/frontend/src/lib/siteUrl.ts`:

```ts
/** Domínio padrão do site institucional, usado como fallback. */
const DEFAULT_SITE_URL = 'https://foodflow.ia.br';

/**
 * Converte o host da requisição (x-forwarded-host/host) em URL absoluta do site.
 * Necessário para o `metadataBase` — o WhatsApp exige og:image com URL absoluta.
 * Sem host (ex.: build estático), cai no domínio padrão.
 */
export function siteUrlFromHost(host: string | null | undefined): string {
  return host ? `https://${host}` : DEFAULT_SITE_URL;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @rancho-delivery/frontend exec vitest run src/__tests__/lib/siteUrl.test.ts`
Expected: PASS (5 assertions).

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/lib/siteUrl.ts apps/frontend/src/__tests__/lib/siteUrl.test.ts
git commit -m "feat(frontend): helper siteUrlFromHost para metadataBase dinâmico"
```

---

### Task 2: Imagem OG gerada por código (`opengraph-image.tsx`)

**Files:**
- Create: `apps/frontend/src/app/marketing/opengraph-image.tsx`

**Interfaces:**
- Consumes: nada.
- Produces: rota de imagem `/marketing/opengraph-image` (PNG 1200×630). O Next liga automaticamente `og:image`/`og:image:width`/`og:image:height`/`twitter:image` para as páginas sob `marketing/`, resolvendo a URL absoluta contra o `metadataBase` (definido na Task 3).

Notas: usar runtime padrão (nodejs). `next/og` exporta `ImageResponse`. JSX inline com estilos (sem CSS externo). É exigido um único elemento raiz com `display:flex` quando há múltiplos filhos.

- [ ] **Step 1: Create the OG image route**

Create `apps/frontend/src/app/marketing/opengraph-image.tsx`:

```tsx
import { ImageResponse } from 'next/og';

// Convenção do App Router: este arquivo vira a og:image das páginas sob /marketing.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'FoodFlow — sistema de delivery com IA';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1a1410 0%, #2a1d12 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color: '#f97316' }}>
          FoodFlow
        </div>
        <div style={{ display: 'flex', fontSize: 44, marginTop: 24, lineHeight: 1.3 }}>
          O sistema de delivery com IA que vende por você
        </div>
        <div style={{ display: 'flex', fontSize: 30, marginTop: 28, color: '#d6c9bd' }}>
          Cardápio, pedidos e entregas num lugar só — com a AURA.
        </div>
      </div>
    ),
    { ...size },
  );
}
```

- [ ] **Step 2: Build to verify the route compiles**

Run: `pnpm --filter @rancho-delivery/frontend build`
Expected: build conclui sem erro; a saída lista uma rota para `/marketing` (e a imagem associada). Não pode haver erro de TypeScript/compilação no arquivo novo.

- [ ] **Step 3: Verify the image renders (dev server)**

Run em um terminal:
```bash
pnpm --filter @rancho-delivery/frontend dev
```
Em outro terminal:
```bash
curl -s -o /tmp/og.png -w "%{http_code} %{content_type}\n" http://localhost:3000/marketing/opengraph-image
file /tmp/og.png
```
Expected: `200 image/png` e `file` reporta `PNG image data, 1200 x 630`. Encerrar o dev server depois.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/marketing/opengraph-image.tsx
git commit -m "feat(frontend): og:image do site institucional gerada via next/og"
```

---

### Task 3: `metadataBase` dinâmico + twitter card no layout do marketing

**Files:**
- Modify: `apps/frontend/src/app/marketing/layout.tsx:4-13`

**Interfaces:**
- Consumes: `siteUrlFromHost` (Task 1); a og:image é fornecida automaticamente pelo arquivo da Task 2.
- Produces: meta tags renderizadas em `/marketing` — `og:image` com URL **absoluta**, `og:image:width=1200`, `og:image:height=630`, `twitter:card=summary_large_image`.

Nota: ao trocar `export const metadata` por `generateMetadata`, **remover** o `export const metadata` (senão o Next acusa export duplicado). Manter title/description/openGraph atuais. Ler o host com `headers()` exige que a função seja `async`.

- [ ] **Step 1: Replace static metadata with generateMetadata**

Em `apps/frontend/src/app/marketing/layout.tsx`, trocar o bloco `export const metadata` (linhas 4-13) por:

```tsx
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { siteUrlFromHost } from '@/lib/siteUrl';
import './marketing.css';

export async function generateMetadata(): Promise<Metadata> {
  const host = headers().get('x-forwarded-host') || headers().get('host');
  return {
    metadataBase: new URL(siteUrlFromHost(host)),
    title: 'FoodFlow — o sistema de delivery com IA que vende por você',
    description:
      'Cardápio, pedidos, entregas e pagamento num lugar só — com a AURA, sua IA que atende, prospecta e faz campanhas. Comece grátis.',
    openGraph: {
      title: 'FoodFlow — delivery com IA para o seu restaurante',
      description: 'Tudo do seu delivery em um lugar, turbinado pela IA AURA. Comece grátis.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'FoodFlow — delivery com IA para o seu restaurante',
      description: 'Tudo do seu delivery em um lugar, turbinado pela IA AURA. Comece grátis.',
    },
  };
}
```

(O `import type { Metadata }` e `import './marketing.css'` já existem no topo — não duplicar; o trecho acima mostra o conjunto final dos imports do arquivo. O `export default function MarketingLayout` permanece inalterado.)

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @rancho-delivery/frontend typecheck`
Expected: PASS (sem erros). Confirma que não há `export const metadata` duplicado e que os tipos do `Metadata` batem.

- [ ] **Step 3: Build and inspect rendered meta tags**

Run em um terminal:
```bash
pnpm --filter @rancho-delivery/frontend dev
```
Em outro terminal:
```bash
curl -s -H "x-forwarded-host: foodflow.ia.br" http://localhost:3000/marketing | grep -Eo '<meta (property="og:[^"]*"|name="twitter:[^"]*")[^>]*>'
```
Expected: linhas contendo:
- `<meta property="og:image" ... content="https://foodflow.ia.br/marketing/opengraph-image...">` (URL **absoluta**, host = o header enviado)
- `<meta property="og:image:width" content="1200">` e `og:image:height` `630`
- `<meta name="twitter:card" content="summary_large_image">`

Encerrar o dev server depois.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/marketing/layout.tsx
git commit -m "feat(frontend): metadataBase dinâmico + twitter card no site institucional"
```

---

### Task 4: Verificação final

- [ ] **Step 1: Rodar a suíte e o typecheck do frontend**

```bash
pnpm --filter @rancho-delivery/frontend typecheck
pnpm --filter @rancho-delivery/frontend test
```
Expected: ambos PASS (inclui `siteUrl.test.ts` da Task 1).

- [ ] **Step 2: Validar no WhatsApp / debugger da Meta (manual, usuário)**

Após deploy: colar o link do site no validador da Meta (https://developers.facebook.com/tools/debug/) para forçar o re-scrape e ver o cartão com imagem. No WhatsApp, testar com URL nova (`?v=1`) por causa do cache agressivo de previews.

---

## Notas operacionais

- **Cache do WhatsApp:** previews são cacheados por link. Links já compartilhados podem manter o cartão antigo (sem imagem) por horas/dias — usar `?v=1` ou o debugger da Meta para forçar atualização.
- `next.config.js` tem `images.unoptimized: true` — não afeta `next/og` (gera o PNG em runtime, fora do otimizador).
