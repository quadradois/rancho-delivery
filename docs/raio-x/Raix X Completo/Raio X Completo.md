# RAIO-X COMPLETO — Módulo `/admin/pedidos`
## Projeto: Rancho Delivery
**Data:** 2026-05-02 | **Escopo:** Backend · Frontend · DB · Integrações · Segurança · Testes · UX

> **Legenda:** ✅ OK | ⚠️ Atenção | ❌ Ausente/Crítico | 🔴 Risco Alto | 🟡 Risco Médio | 🟢 Risco Baixo

---

## 1. VISÃO GERAL DO MÓDULO

O módulo `/admin/pedidos` é o **cockpit operacional em tempo real** do Rancho Delivery. Ele permite que operadores gerenciem todo o ciclo de vida de pedidos: recebimento, confirmação de pagamento PIX, preparo, despacho com motoboy, entrega e cancelamento com estorno.

**Stack:**
- **Backend:** Node.js 20 · TypeScript · Express · Prisma ORM · PostgreSQL
- **Frontend:** Next.js 14.1.0 · React 18.2.0 · TypeScript 5.3.3 · Tailwind CSS 3.4.1
- **Realtime:** Server-Sent Events (SSE) com fallback polling de 8s
- **Pagamentos:** InfinitePay (PIX)
- **Notificações:** Evolution API (WhatsApp)
- **Localização:** `/var/www/rancho-delivery/`

---

## 2. MAPA DE ARQUITETURA ATUAL

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js 14.1.0)                                      │
│  /apps/frontend/src/                                            │
│                                                                  │
│  app/admin/pedidos/page.tsx  ←── 945 linhas (mega-componente)   │
│  components/crm/             ←── 8 componentes customizados     │
│  hooks/useCockpitSocket.ts   ←── SSE + fallback polling 8s      │
│  hooks/useCockpitAudio.ts    ←── Alertas sonoros                │
│  lib/api.ts                  ←── Serviços da API (490 linhas)   │
│  lib/api-client.ts           ←── HTTP client centralizado       │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST + SSE
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Express + TypeScript)                                  │
│  /apps/backend/src/                                             │
│                                                                  │
│  routes/admin.pedido.routes.ts   ←── 8 rotas HTTP admin         │
│  controllers/admin.pedido.controller.ts  ←── 13 métodos         │
│  services/pedido.service.ts      ←── 1.146 linhas, 20+ métodos  │
│  middlewares/adminAuth.middleware.ts  ←── JWT custom HS256       │
│  services/infinitepay.service.ts ←── Gateway PIX                │
│  services/evolution.service.ts   ←── WhatsApp                   │
│  controllers/webhook.controller.ts  ←── 2 webhooks              │
│  services/realtime.service.ts    ←── EventEmitter SSE           │
└────────────────────┬────────────────────────────────────────────┘
                     │ Prisma ORM
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  BANCO DE DADOS (PostgreSQL)                                     │
│  /apps/backend/prisma/                                          │
│                                                                  │
│  Tabelas: pedidos · itens_pedido · pedido_timeline              │
│           clientes · motoboys · produtos · mensagens_cliente     │
│  Migrations: 4 recentes (2026-05-01)                            │
│  Índices: 6 em pedidos (status, criado_em, motoboy_id, etc.)    │
└─────────────────────────────────────────────────────────────────┘
         │                          │
         ▼                          ▼
┌──────────────────┐    ┌───────────────────────┐
│  InfinitePay     │    │  Evolution API         │
│  (PIX checkout)  │    │  (WhatsApp)            │
│  + Webhook       │    │  + Webhook inbound     │
└──────────────────┘    └───────────────────────┘
```

---

## 3. FLUXOS PRINCIPAIS

### 3.1 Ciclo de Vida de um Pedido (Máquina de Estados)

```
AGUARDANDO_PAGAMENTO ──(webhook PIX)──► CONFIRMADO ──► PREPARANDO ──► SAIU_ENTREGA ──► ENTREGUE
        │                                   │               │               │
        └──(timeout 20min)──► EXPIRADO       └──────────────┴───────────────┴──► CANCELADO
                                  │
                          (30min s/ ação)
                                  │
                             ABANDONADO
```

**Estados terminais:** `ENTREGUE`, `CANCELADO`
**Prioridade visual admin:** AGUARDANDO_PAGAMENTO > PENDENTE > CONFIRMADO > PREPARANDO > SAIU_ENTREGA

### 3.2 Fluxo de Criação (Cliente)
1. Cliente submete pedido → `POST /api/pedidos`
2. Backend valida bairro, produtos, calcula subtotal + taxa
3. Cria link PIX no InfinitePay → pedido fica `AGUARDANDO_PAGAMENTO`
4. InfinitePay dispara `POST /webhook/infinitepay` ao confirmar
5. Backend atualiza → `CONFIRMADO` + notifica cliente via WhatsApp
6. SSE emite `pedido:novo` → cockpit admin toca som e recarrega lista

### 3.3 Fluxo de Operação Admin
1. Operador abre `/admin/pedidos` → carrega lista (50/pág) com filtros/busca
2. Seleciona pedido → carrega detalhes + timeline + mensagens WhatsApp
3. Ações disponíveis: Avançar status · Atribuir motoboy · Atualizar endereço · Cancelar · Estorno

### 3.4 Fluxo de Pedido Manual
1. Operador clica "Pedido manual" → preenche: nome, telefone, endereço, bairro, produto, método (PIX|DINHEIRO)
2. Se PIX: gera link InfinitePay e exibe QR/link copiável
3. Se DINHEIRO: confirma pedido imediatamente (sem gateway)

---

## 4. PONTOS FORTES

| # | Ponto Forte | Evidência |
|---|-------------|-----------|
| 1 | Máquina de estados bem definida | 9 status com transições controladas em `pedido.service.ts:30-40` |
| 2 | Timeline imutável de auditoria | Tabela `pedido_timeline` com ator (SISTEMA/OPERADOR/CLIENTE/IA) |
| 3 | Realtime funcional com fallback | SSE em `useCockpitSocket.ts` + polling 8s de degradação |
| 4 | Feedback audiovisual rico | Tons diferenciados por evento, timer SLA com cores e piscar |
| 5 | Webhook idempotente | Verifica status antes de processar reconfirmação de PIX |
| 6 | Logs estruturados | Winston com levels, timestamps e contexto em todos os eventos chave |
| 7 | Snapshots de dados | Endereço/bairro copiados no pedido, não apenas FK para cliente |
| 8 | Migrações versionadas | 4 migrations recentes com backfill seguro |
| 9 | Build e testes no CI | `.github/workflows/ci-backend.yml` roda vitest + typecheck |
| 10 | Componentes CRM próprios | 8 componentes reutilizáveis (Badge, Timer, Tab, Modal, etc.) |

---

## 5. GAPS FUNCIONAIS

| # | Gap | Impacto | Arquivo |
|---|-----|---------|---------|
| 1 | Sem estorno automático via InfinitePay | Operador precisa fazer estorno manual no painel do gateway | `pedido.service.ts:890` apenas marca flag |
| 2 | Apenas 1 item por pedido manual | Modal `criarManual` aceita somente 1 produto | `page.tsx:901-932` |
| 3 | Sem rastreamento de motoboy em tempo real | Posição do motoboy não é exibida no mapa | Não implementado |
| 4 | Sem impressão de comanda | Nenhuma funcionalidade de impressão térmica | Não implementado |
| 5 | Ausência de notificação push/email para admin | Depende exclusivamente do SSE; sem fallback offline | Não implementado |
| 6 | Recuperação de abandonados desabilitada | `RECOVERY_ENABLED=false` por padrão | `pedido.service.ts:993` |
| 7 | Aba "IA" desabilitada | Código presente mas renderiza `disabled` | `page.tsx:703` |
| 8 | Sem integração com transportadoras externas | Apenas motoboy próprio; sem Correios/Loggi/Melhor Envio | `asaas.service.ts` (inativo) |
| 9 | Sem infinite scroll na lista de pedidos | Carregar mais de 50 pedidos requer troca de página | `page.tsx:133` `pageSize=50` |
| 10 | Sem histórico de preços de produto | `ItemPedido.precoUnit` existe mas não há relatório de variação | Schema OK, relatório ausente |

---

## 6. DÍVIDAS TÉCNICAS

| Severidade | Dívida | Arquivo | Linha |
|------------|--------|---------|-------|
| 🔴 Alta | Megacomponente de 945 linhas sem divisão | `app/admin/pedidos/page.tsx` | 1-945 |
| 🔴 Alta | `AdminPedidoController` sem testes unitários | `__tests__/controllers/` | — |
| 🔴 Alta | Thresholds de cobertura permissivos (20% fn, 30% lines) | `vitest.config.ts` | — |
| 🟡 Média | Deploy stages no CI marcados como TODO | `.github/workflows/ci-backend.yml` | 114, 130 |
| 🟡 Média | `pedidoService.ts` com 1.146 linhas (God Service) | `services/pedido.service.ts` | 1-1146 |
| 🟡 Média | Sem validação Zod nos formulários do cockpit admin | `page.tsx` (7 formulários) | — |
| 🟡 Média | Axios importado mas não usado (usa fetch nativo) | `lib/api-client.ts` | — |
| 🟡 Média | `asaas.service.ts` implementado mas sem uso | `services/asaas.service.ts` | — |
| 🟡 Média | Timeline não registra usuário admin específico | `pedido.service.ts:98` | ator='OPERADOR' genérico |
| 🟢 Baixa | Fontes de display carregadas globalmente | `layout.tsx` | — |
| 🟢 Baixa | Sem compressão de resposta HTTP (gzip/brotli) | `index.ts` middlewares | — |

---

## 7. RISCOS DE SEGURANÇA

### 🔴 CRÍTICO

#### S1 — Sem Autorização Granular (RBAC)
**Fato:** O middleware `adminAuth.middleware.ts` valida apenas existência de JWT válido. Não há verificação de permissões por operação.
**Impacto:** Qualquer operador pode criar pedidos manuais, marcar estornos, cancelar pedidos, alterar status da loja.
**Arquivo:** `middlewares/adminAuth.middleware.ts:59-72`

#### S2 — Next.js 14.1.0 com 6 CVEs conhecidos
**Fato (pnpm audit):**
- `GHSA-f82v-jwr5-mffw` — Authorization Bypass in Middleware (CRÍTICO)
- `GHSA-fr5h-rqp8-mj6g` — SSRF em Server Actions (HIGH)
- `GHSA-gp8f-8m3g-qvj9` — Cache Poisoning (HIGH)
- `GHSA-7gfc-8cq8-jh5f` — Authorization Bypass (HIGH)
- `GHSA-mwv6-3258-q52c` — DoS com Server Components (HIGH)
- `GHSA-5j98-mcp5-4vw2` — Command Injection via glob CLI (HIGH)

**Versão vulnerável:** 14.1.0 | **Correção:** `pnpm update next@>=14.2.35`
**Arquivo:** `apps/frontend/package.json`

### 🟡 MÉDIO

#### S3 — Sem Rate Limiting em Nenhuma Rota
**Fato:** Não há `express-rate-limit` ou equivalente.
**Impacto:** Rota de login suscetível a força bruta; webhooks podem ser inundados.
**Arquivo:** `routes/admin.routes.ts` e `routes/webhook.routes.ts`

#### S4 — Webhooks sem Validação de Integridade do Body
**Fato:** Webhook InfinitePay valida o token no header mas não verifica HMAC do payload completo.
**Impacto:** Body manipulation possível se token vazado.
**Arquivo:** `controllers/webhook.controller.ts:24-48`

#### S5 — Secret JWT com Fallback Inseguro em Dev
**Fato:** Se `ADMIN_AUTH_SECRET` e `JWT_SECRET` não estão definidos, usa `'dev-admin-secret'` hardcoded.
**Impacto:** Em ambientes de dev/staging mal configurados, token é previsível.
**Arquivo:** `middlewares/adminAuth.middleware.ts:16`

### 🟢 BAIXO

#### S6 — Timeline não Identifica Usuário Admin Específico
**Fato:** `ator='OPERADOR'` é genérico; não há multi-usuário admin implementado.
**Impacto:** Sem rastreabilidade de qual operador fez o quê.

#### S7 — Token Admin Aceito via Query String (`?token=...`)
**Fato:** Além do header `Authorization: Bearer`, aceita token na query string.
**Impacto:** Token pode aparecer em logs de servidor, CDN ou histórico de browser.
**Arquivo:** `middlewares/adminAuth.middleware.ts:62-65`

---

## 8. RISCOS DE UX/PRODUTO

| # | Risco | Impacto | Evidência |
|---|-------|---------|-----------|
| U1 | Megapágina de 945 linhas = difícil manutenção | Alto | `page.tsx` único arquivo |
| U2 | Sem confirmação visual ao avançar status | Ação irreversível sem dialog | `page.tsx:420` |
| U3 | Pedido manual aceita apenas 1 item | Operadores criam múltiplos pedidos para 1 cliente | `page.tsx:901` |
| U4 | Sem ordenação clicável na lista | Não ordena por valor, cliente ou bairro | `page.tsx:612-684` |
| U5 | Motivos de cancelamento: 6 opções fixas | Sem campo "Outro" livre | `page.tsx:881` |
| U6 | SLA timer sem configuração por tipo de pedido | Mesmo threshold para todos os pedidos | `CrmTimer.tsx:1-63` |
| U7 | Sem feedback claro para pedido expirado/cancelado | Erro genérico 404/400 | `admin.pedido.controller.ts:59` |
| U8 | Aba "IA" visível mas desabilitada sem explicação | Confunde operadores | `page.tsx:703` |

---

## 9. RISCOS DE INTEGRAÇÃO

| # | Risco | Severidade | Arquivo |
|---|-------|------------|---------|
| I1 | InfinitePay sem circuit breaker | 🔴 Alto | Falha cria pedido sem link PIX silenciosamente |
| I2 | Evolution API (WhatsApp) sem retry/backoff | 🟡 Médio | Falha silenciosa, cliente não notificado |
| I3 | Instância WhatsApp externa sem monitoramento | 🟡 Médio | QR Code expira; sem auto-reconexão |
| I4 | Sem dead letter queue para webhooks | 🟡 Médio | Evento perdido = pedido preso em AGUARDANDO_PAGAMENTO |
| I5 | Webhook secret CSV (múltiplos valores) | 🟢 Baixo | Rotação OK mas sem documentação |
| I6 | Webhook sem IP whitelist | 🟢 Baixo | Qualquer IP pode tentar POST |
| I7 | `asaas.service.ts` implementado mas inativo | 🟢 Baixo | Código morto que pode confundir |

---

## 10. TESTES AUSENTES

### Backend

| Componente | Cobertura | O que falta |
|-----------|-----------|-------------|
| `AdminPedidoController` | ❌ 0% | Todos os 13 métodos |
| `pedido.service.ts` — ops admin | ⚠️ Parcial | atualizarStatusAdmin, cancelarAdmin, marcarEstorno, atribuirMotoboy, criarManual |
| `pedido.service.ts` — métricas | ❌ 0% | obterMetricasAdmin, obterMetricasAbandono |
| `pedido.service.ts` — loja | ❌ 0% | obterStatusLoja, atualizarStatusLoja |
| Transições de estado inválidas | ❌ 0% | Testar que ENTREGUE → CONFIRMADO lança erro |
| Thresholds de coverage | 🔴 Muito baixo | 20% functions, 30% lines, 30% statements |

### Frontend

| Componente | Cobertura | O que falta |
|-----------|-----------|-------------|
| `AdminPedidosPage` | ❌ 0% | Página completa sem testes |
| Componentes CRM | ❌ 0% | Badge, Button, Tab, Timer, Modal, Input |
| `useCockpitSocket` | ❌ 0% | Lógica de SSE e fallback polling |
| `useCockpitAudio` | ❌ 0% | Lógica de áudio e notificações |
| `api.ts` (funções admin) | ❌ 0% | 12 funções de chamada à API admin |

---

## 11. RECOMENDAÇÕES PRIORIZADAS

### Prioridade 1 — Crítico (segurança e estabilidade)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| R1 | **Atualizar Next.js de 14.1.0 para ≥ 14.2.35** | Baixo | 6 CVEs eliminados |
| R2 | **Implementar RBAC com permissões granulares** | Alto | Toda operação sensível protegida |
| R3 | **Rate limiting**: login (5 req/15min), `/admin/*` (100 req/15min) | Baixo | Brute force + DoS mitigados |

### Prioridade 2 — Alta (resiliência e qualidade)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| R4 | **Circuit breaker para InfinitePay** com fallback gracioso | Médio | Pedidos não ficam presos sem link PIX |
| R5 | **Testes para AdminPedidoController** — cobertura mínima 60% | Alto | Regressões detectadas antes de produção |
| R6 | **Elevar thresholds de coverage** para 60% lines, 50% functions | Baixo | Dívida técnica visível no CI |
| R7 | **Validação HMAC do body do webhook InfinitePay** | Baixo | Integridade do payload garantida |

### Prioridade 3 — Média (produto e manutenibilidade)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| R8 | **Quebrar `page.tsx`** em componentes menores (<200 linhas) | Alto | Manutenibilidade e testabilidade |
| R9 | **Validação Zod** nos formulários admin | Médio | Consistência com fluxo cliente |
| R10 | **Identificar usuário admin na timeline** (suporte multi-operador) | Médio | Rastreabilidade completa |
| R11 | **Retry com backoff exponencial** para Evolution API | Médio | Notificações WhatsApp confiáveis |
| R12 | **Remover token de query string** (`?token=`) | Baixo | Evitar vazamento em logs |

### Prioridade 4 — Baixa (melhorias futuras)

| # | Ação | Esforço | Impacto |
|---|------|---------|---------|
| R13 | Swagger/OpenAPI para o backend | Médio | Developer experience |
| R14 | Múltiplos itens no pedido manual | Médio | Operação mais rápida |
| R15 | Testes E2E com Playwright para o cockpit | Alto | Confiança total em deploys |
| R16 | Deploy automático no CI (stages staging/prod) | Médio | CD automatizado |
| R17 | Remover `asaas.service.ts` ou documentar como futuro | Baixo | Limpeza de código morto |

---

## 12. PLANO TO-BE RESUMIDO

```
CURTO PRAZO (sprint 1-2)
├── Atualizar Next.js → ≥ 14.2.35
├── Rate limiting em login e admin
├── HMAC validation no webhook InfinitePay
└── Remover token de query string

MÉDIO PRAZO (sprint 3-5)
├── RBAC com 3 roles mínimos (admin, operador, viewer)
├── Circuit breaker + retry para InfinitePay
├── Testes do AdminPedidoController (60% cobertura)
├── Identificação de usuário admin na timeline
└── Validação Zod nos formulários admin

LONGO PRAZO (sprint 6+)
├── Quebrar page.tsx em componentes (<200 linhas cada)
├── Retry com backoff para Evolution API
├── Swagger/OpenAPI
├── Testes E2E (Playwright)
├── Deploy automático no CI
└── Múltiplos itens no pedido manual
```

---

## 13. PRÓXIMOS PASSOS SUGERIDOS

1. **Imediatamente:** `pnpm update next@14.2.35` no frontend — zero risco, elimina 6 CVEs
2. **Esta semana:** Adicionar `express-rate-limit` no backend (< 1h de trabalho)
3. **Este sprint:** Definir modelo RBAC (quais roles e permissões) antes de implementar
4. **Backlog:** Criar épico "Qualidade do módulo pedidos" com R4–R12 quebradas em tasks

---

## APÊNDICE — Arquivos Críticos Mapeados

| Arquivo | Função | Linhas |
|---------|--------|--------|
| `apps/frontend/src/app/admin/pedidos/page.tsx` | Cockpit principal | 945 |
| `apps/backend/src/services/pedido.service.ts` | Lógica de negócio | 1.146 |
| `apps/backend/src/controllers/admin.pedido.controller.ts` | Controller admin | 353 |
| `apps/backend/src/middlewares/adminAuth.middleware.ts` | Autenticação JWT | 102 |
| `apps/backend/src/services/infinitepay.service.ts` | Gateway PIX | 160 |
| `apps/backend/src/services/evolution.service.ts` | WhatsApp | ~100 |
| `apps/backend/src/controllers/webhook.controller.ts` | Webhooks externos | ~150 |
| `apps/backend/prisma/schema.prisma` | Schema banco (Pedido: L87-124) | — |
| `apps/frontend/src/lib/api.ts` | Serviços HTTP frontend | 490 |
| `apps/frontend/src/hooks/useCockpitSocket.ts` | SSE + polling | 109 |
| `.github/workflows/ci-backend.yml` | Pipeline CI | — |
