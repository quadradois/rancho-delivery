# 📋 Rancho Delivery — Resumo Completo do Projeto

Plataforma de delivery para restaurante **delivery-only**, com site de pedidos, painel administrativo e **agente de IA (Claude) para atendimento no WhatsApp**.

- **Monorepo:** pnpm workspaces · versão **0.9.0**
- **Apps:** `backend` (Express + Prisma + IA) · `frontend` (Next.js 14) · `packages/shared` (tipos)
- **Banco:** PostgreSQL via Prisma — **29 models**, **11 enums**, **33 migrações**

---

## 🧩 Visão Geral dos Módulos

| Módulo | Estado | Descrição |
|--------|--------|-----------|
| Site de pedidos | ✅ Implementado | Cardápio, carrinho, checkout e rastreamento |
| Painel admin | ✅ Implementado | 12 seções (pedidos, clientes, entregas, campanhas, etc.) |
| Agente IA (WhatsApp) | ✅ Implementado | Claude + skills + guardrails + tools |
| Pagamento online | ✅ Implementado | MercadoPago (PIX) |
| WhatsApp | ✅ Implementado | Evolution API (inbound/outbound) |
| Mineração de leads | ✅ Implementado | Geo360, Assertiva |
| App do entregador | ✅ Implementado | Operação de entregas |
| Roleta de promoções | 🟡 Schema apenas | Modelado, sem implementação |
| Programa de indicação | 🟡 Schema apenas | Modelado, sem implementação |

---

## 🖥️ Frontend (Next.js 14)

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · React Leaflet (mapas) · Recharts (gráficos)

### Site público
- `/` — Cardápio (feed)
- `/cart` — Carrinho
- `/checkout` — Finalização do pedido
- `/pedido/[id]` — Confirmação e rastreamento

### App do entregador
- `/entregador` — Painel de entregas

### Painel administrativo (`/admin`)
`pedidos` · `produtos` · `bairros` · `clientes` · `entregas` · `conversas` · `whatsapp` · `campanhas` · `engajamento` · `mineracao` · `decisoes` · `configuracoes`

### Bibliotecas (`src/lib`)
`api-client.ts` · `api.ts` · `http-client.ts` · `mercadopago.ts` · `customer-profile.ts` · `utils.ts`

---

## ⚙️ Backend (Express + TypeScript)

**Stack:** Express 4 · TypeScript · Prisma 5 · Zod · Winston · Helmet · express-rate-limit · node-cron · ioredis · `@anthropic-ai/sdk`

### Rotas da API (`/api`)
- `/produtos` — cardápio (listagem pública + CRUD admin)
- `/bairros` — bairros atendidos e taxa de entrega
- `/pedidos` — criação, consulta e rastreamento
- `/loja` — status e configuração pública
- `/entregador` — operação do entregador
- `/admin/*` — painel administrativo (pedidos, clientes, realtime, alertas, relatórios, IA, mineração, entregas)

### Webhooks (`/webhook`)
- `POST /webhook/mercadopago` — confirmação de pagamento
- `POST /webhook/whatsapp` e `/webhook/whatsapp/:event` — mensagens da Evolution API

### Services (regras de negócio e integrações)
`conversacao` (orquestrador IA) · `evolution` (WhatsApp) · `mercadopago` · `asaas` (legado) · `pedido` · `produto` · `cliente` · `bairro` · `taxaEntrega` · `rotaEntrega` · `alerta` · `relatorio` · `realtime` · `mineracao` (+ `mineracao.queue`) · `geo360` · `campanhaIA` · `ia` · `iaConhecimento` · `iaContexto`

### Middlewares
Autenticação JWT com RBAC (`admin`/`operador`/`viewer`), rate limit, idempotência e tratamento de erros.

### Tarefas agendadas (`node-cron`)
Detecção de novos imóveis (Geo360), carga incremental de dados e disparo de campanhas agendadas.

---

## 🤖 Agente de IA do WhatsApp (`src/agentes/`)

Orquestrado por `services/conversacao.service.ts` sobre o modelo **Claude (Anthropic)**.

| Componente | Função |
|-----------|--------|
| `cache.ts` | Histórico de conversa (Redis com fallback em `Map`, TTL ~6h) |
| `classificador-skills.ts` | Seleção dinâmica de skills por *triggers* (regex) |
| `skills/SKILLS_REGISTRY.ts` | Skills: regras do WhatsApp (sempre ativa), horário, cardápio, pedido por link, pedido por WhatsApp, opt-out, anti-injeção |
| `guardrails.ts` | Anti-spam, opt-out, anti-*prompt-injection*, lista negra |
| `sentiment.ts` | Análise de sentimento da mensagem |
| `sanitizer.ts` | Sanitização das respostas |
| `tools/` | Tools do Claude: `buscarCardapio`, `adicionarItem`, `consultarTaxaEntrega`, `confirmarPedido` (+ `executor`, `geocoder`, `sessao`) |

O agente é capaz de **montar e confirmar um pedido inteiro dentro da conversa do WhatsApp**, consultando cardápio e taxa de entrega em tempo real.

---

## 🗄️ Banco de Dados (Prisma + PostgreSQL)

**29 models** e **11 enums**. Entidades centrais:

- **Cliente** (PK por telefone, com `origem`) · **Pedido / ItemPedido / PedidoTimeline** · **Produto** · **Bairro** · **Motoboy**
- **LojaConfiguracao** — configuração + base de conhecimento da IA (voz da marca, diferenciais, horários, atendente)
- **MensagemCliente / SessaoPedidoWhatsApp / BlacklistWhatsApp** — atendimento WhatsApp
- **LeadMarketing / MensagemLead / CampanhaMarketing / CampanhaDestinatario** — aquisição e campanhas
- **ContatoMinerado / ImovelGeo360 / ImovelPrefeitura / AssertivaConsultaCache / ExecucaoMineracao / ScraperErro** — mineração de leads
- **FichaTecnica / IngredienteFicha** — custos e precificação
- **ConfiguracaoAlerta / RelatorioDia** — operação
- **RoletaGiro / Indicacao** — 🟡 modelados, ainda sem implementação

**Enums:** `StatusPedido` · `StatusPagamento` · `FormaPagamentoPedido` · `TipoAtendimentoPedido` · `OrigemMensagem` · `Origem` · `LeadStatus` · `CampanhaStatus` · `StatusMotoboy` · `EmpresaEntrega` · `StatusLoja`

---

## 🔌 Integrações Externas

| Integração | Uso |
|-----------|-----|
| **Claude (Anthropic)** | Orquestração de conversas e *tool use* do agente |
| **Evolution API** | WhatsApp (envio/recebimento de mensagens) |
| **MercadoPago** | Pagamento online (PIX) e webhook de confirmação |
| **Geo360** | Dados de imóveis (Goiânia / Aparecida de Goiânia) para mineração |
| **Assertiva** | Enriquecimento de contatos (com cache de consultas) |

> `asaas.service.ts` existe no código como **legado** e não está conectado ao fluxo atual de pedidos.

---

## 🧪 Testes

- **Vitest** no backend (com **Supertest**) e no frontend (com **Testing Library** + jsdom)
- Testes de controllers, services, integração e E2E
- Meta de cobertura: **80%**

```bash
pnpm test            # backend + frontend
pnpm test:coverage   # com relatório de cobertura
```

---

## 🚀 Como Executar

```bash
# 1. Instalar dependências (monorepo)
pnpm install

# 2. Configurar ambiente do backend
cp apps/backend/.env.example apps/backend/.env
# editar apps/backend/.env

# 3. Banco de dados
createdb rancho_delivery
pnpm db:migrate
pnpm db:seed        # opcional

# 4. Subir tudo (frontend + backend)
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

---

## 🛠️ Deploy

- **PM2** (`deploy/ecosystem.config.cjs`) gerencia backend (3001) e frontend (3000)
- **Nginx** como proxy reverso (`/etc/nginx/sites-available/rancho`)
- **systemd** mantém o PM2 ativo (`pm2-deploy.service`)
- `deploy/deploy.sh`: pull → install → build → migrate → reload
- Em produção, o backend escuta apenas em `127.0.0.1`; arquivos `.env` com permissão `600`

---

## 🗺️ Roadmap

Funcionalidades com modelagem no banco, aguardando implementação:

1. 🟡 **Roleta de promoções** (`RoletaGiro`) — gamificação pós-pedido
2. 🟡 **Programa de indicação** (`Indicacao`) — bonificação por indicação

---

**Versão:** 0.9.0
**Última atualização:** 05/06/2026
