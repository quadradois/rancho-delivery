# Rancho Delivery

Sistema web completo para restaurante **delivery-only**, com site de pedidos mobile-first, painel administrativo e um **agente de IA (Claude) para atendimento via WhatsApp**.

## Visão Geral

O **Rancho Delivery** é uma plataforma que integra:

- **Site de pedidos** (cardápio, carrinho, checkout e rastreamento)
- **Painel administrativo** completo (pedidos em tempo real, clientes, entregas, campanhas, mineração de leads e configurações)
- **Agente de IA conversacional** que atende clientes no WhatsApp via Evolution API, usando o modelo Claude (Anthropic) com sistema de *skills*, *guardrails* e *tools* para montar pedidos diretamente na conversa
- **Mineração de leads** a partir de bases públicas e parceiras (Geo360, Assertiva)
- **Pagamento online** via MercadoPago (PIX)

## Arquitetura do Sistema

```
┌──────────────────────┐         ┌──────────────────────────────┐
│   FRONTEND           │◄───────►│   BACKEND (API REST)         │
│   Next.js 14         │  HTTP   │   Express + TypeScript        │
│   (mobile-first)     │         │                               │
│  • Site de pedidos   │         │  • /api  (produtos, pedidos,  │
│  • Painel /admin     │         │    bairros, loja, admin,      │
│  • App entregador    │         │    entregador)                │
│   localhost:3000     │         │  • /webhook (mercadopago,     │
└──────────────────────┘         │    whatsapp)                  │
                                 │  • Agente IA (Claude)         │
                                 │   localhost:3001              │
                                 └───────────────┬───────────────┘
                                                 │
              ┌──────────────────────────────────┼───────────────────────────┐
              │                                   │                           │
     ┌────────▼────────┐              ┌───────────▼───────────┐    ┌──────────▼──────────┐
     │  PostgreSQL     │              │  Integrações externas  │    │   Redis (opcional)  │
     │  Prisma ORM     │              │  • Claude (Anthropic)  │    │   cache de conversas│
     │  localhost:5432 │              │  • Evolution API (Wpp) │    │   (fallback em Map) │
     └─────────────────┘              │  • MercadoPago         │    └─────────────────────┘
                                      │  • Geo360 / Assertiva  │
                                      └───────────────────────┘
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Monorepo | pnpm workspaces (`pnpm@8.15.0`) |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · React Leaflet · Recharts |
| Backend | Node.js 18+ · Express 4 · TypeScript · Zod · Winston · Helmet · express-rate-limit · node-cron |
| Banco de Dados | PostgreSQL · Prisma ORM 5 |
| IA / Agente | `@anthropic-ai/sdk` (Claude) |
| Cache | Redis (`ioredis`), com fallback em memória |
| WhatsApp | Evolution API (self-hosted) |
| Pagamento | MercadoPago |
| Testes | Vitest · Supertest · Testing Library |
| Deploy | PM2 · Nginx · systemd |

## Estrutura do Projeto

```
rancho-delivery/
├── apps/
│   ├── backend/                    # API REST (Express + Prisma + Agente IA)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 29 models, 11 enums
│   │   │   └── migrations/         # 33 migrações
│   │   └── src/
│   │       ├── routes/             # produto, bairro, pedido, loja, admin, entregador, webhook
│   │       ├── controllers/        # controllers de domínio e admin.*
│   │       ├── services/           # regras de negócio e integrações
│   │       ├── agentes/            # agente de IA do WhatsApp (skills, guardrails, tools)
│   │       ├── jobs/               # tarefas agendadas (node-cron)
│   │       ├── middlewares/        # auth (JWT/RBAC), rate limit, idempotência, erros
│   │       └── __tests__/          # testes (Vitest)
│   └── frontend/                   # Next.js (site + painel admin + app entregador)
│       └── src/app/                # rotas do App Router
├── packages/
│   └── shared/                     # tipos TypeScript compartilhados
├── deploy/                         # ecosystem PM2, deploy.sh, healthcheck
├── scripts/                        # utilitários (coordenadas, imóveis, smoke tests)
├── docs/                           # documentação do projeto
├── CHANGELOG.md
└── README.md
```

## Backend — API REST

Servidor Express com prefixos `/api` e `/webhook`.

### Rotas `/api`

| Prefixo | Responsabilidade |
|---------|------------------|
| `/api/produtos` | Cardápio: listagem pública e CRUD admin |
| `/api/bairros` | Bairros atendidos e taxa de entrega |
| `/api/pedidos` | Criação, consulta e rastreamento de pedidos |
| `/api/loja` | Status e configuração pública da loja |
| `/api/entregador` | Painel/operação do entregador |
| `/api/admin/*` | Painel administrativo (ver abaixo) |

O grupo `/api/admin` reúne os controllers administrativos: **pedidos** (dashboard, métricas, status da loja, motoboys), **clientes** (CRUD, lista negra, WhatsApp), **realtime**, **alertas**, **relatórios**, **IA** (sugestões e base de conhecimento), **mineração** (leads, Geo360) e **entregas**. O acesso é protegido por JWT com RBAC (`admin` / `operador` / `viewer`).

### Webhooks `/webhook`

| Rota | Origem |
|------|--------|
| `POST /webhook/mercadopago` | Confirmação de pagamento |
| `POST /webhook/whatsapp` · `POST /webhook/whatsapp/:event` | Mensagens recebidas (Evolution API) |

### Agente de IA do WhatsApp (`src/agentes/`)

Orquestrado em `services/conversacao.service.ts` sobre o modelo **Claude**. Componentes:

- **`cache.ts`** — histórico de conversa por contato (Redis com fallback em `Map`, TTL ~6h)
- **`classificador-skills.ts`** — seleciona dinamicamente as *skills* relevantes por *triggers* (regex)
- **`skills/SKILLS_REGISTRY.ts`** — conjunto de *skills* (regras de WhatsApp sempre ativas, horário de funcionamento, cardápio, fluxo de pedido por link e por WhatsApp, opt-out, anti-injeção)
- **`guardrails.ts`** — proteções contra spam, opt-out, *prompt injection* e contatos em lista negra
- **`sentiment.ts`** — análise de sentimento da mensagem
- **`sanitizer.ts`** — sanitização das respostas geradas
- **`tools/`** — *tools* do Claude para montar pedidos na conversa: `buscarCardapio`, `adicionarItem`, `consultarTaxaEntrega`, `confirmarPedido`, além de `executor`, `geocoder` e gestão de `sessao`

### Tarefas agendadas (`src/jobs/`)

Executadas via `node-cron`: detecção de novos imóveis (Geo360), carga incremental de dados e disparo de campanhas agendadas.

## Banco de Dados (Prisma + PostgreSQL)

Schema em [apps/backend/prisma/schema.prisma](apps/backend/prisma/schema.prisma): **29 models** e **11 enums**, com **33 migrações** versionadas.

Entidades centrais:

- **Cliente** — identificado pelo telefone; rastreia origem (`SITE`, `WHATSAPP`, etc.)
- **Pedido / ItemPedido / PedidoTimeline** — pedido, itens e histórico de status
- **Produto** — cardápio
- **Bairro** — bairros atendidos e taxa de entrega
- **Motoboy** — entregadores e status
- **LojaConfiguracao** — configuração da loja e base de conhecimento da IA (descrição, voz da marca, diferenciais, horários, atendente)
- **MensagemCliente / SessaoPedidoWhatsApp / BlacklistWhatsApp** — atendimento via WhatsApp
- **LeadMarketing / MensagemLead / CampanhaMarketing / CampanhaDestinatario** — aquisição e campanhas
- **ContatoMinerado / ImovelGeo360 / ImovelPrefeitura / AssertivaConsultaCache / ExecucaoMineracao** — mineração de leads
- **FichaTecnica / IngredienteFicha** — custos e precificação
- **ConfiguracaoAlerta / RelatorioDia** — operação

> Os models `RoletaGiro` (roleta de promoções) e `Indicacao` (programa de indicação) existem no schema como base para evolução futura, mas **ainda não possuem implementação no código** (ver Roadmap).

## Frontend — Next.js

App Router em `apps/frontend/src/app`:

### Site público

- `/` — cardápio (feed)
- `/cart` — carrinho
- `/checkout` — finalização do pedido
- `/pedido/[id]` — confirmação e rastreamento

### App do entregador

- `/entregador` — operação de entregas

### Painel administrativo `/admin`

`pedidos` · `produtos` · `bairros` · `clientes` · `entregas` · `conversas` · `whatsapp` · `campanhas` · `engajamento` · `mineracao` · `decisoes` · `configuracoes`

Bibliotecas de apoio em `src/lib`: `api-client.ts`, `api.ts`, `http-client.ts`, `mercadopago.ts`, `customer-profile.ts`, `utils.ts`.

## Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- pnpm 8+
- PostgreSQL 15+
- (Opcional) Redis — sem ele, o cache de conversas usa memória
- (Opcional) Instância da Evolution API para WhatsApp

### Passos

```bash
# Clonar repositório
git clone git@github.com:quadradois/rancho-delivery.git
cd rancho-delivery

# Instalar dependências (monorepo)
pnpm install

# Configurar variáveis de ambiente do backend
cp apps/backend/.env.example apps/backend/.env
# Editar apps/backend/.env com suas credenciais

# Criar banco e rodar migrações
createdb rancho_delivery
pnpm db:migrate

# (Opcional) Popular dados de exemplo
pnpm db:seed

# Iniciar em desenvolvimento (frontend + backend em paralelo)
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Variáveis de Ambiente (backend)

Principais chaves de `apps/backend/.env.example`:

```env
# App
NODE_ENV=development
PORT=3001
HOST=127.0.0.1
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/rancho_delivery"

# IA (Claude / Anthropic)
ANTHROPIC_API_KEY=...

# WhatsApp (Evolution API)
EVOLUTION_API_URL="http://localhost:8080"
EVOLUTION_API_KEY="sua-api-key"
EVOLUTION_INSTANCE_NAME="rancho-delivery"
WHATSAPP_DONO=""

# Pagamento (MercadoPago)
MERCADOPAGO_ACCESS_TOKEN=...
MERCADOPAGO_WEBHOOK_URL=...

# Autenticação do painel admin (JWT + RBAC)
JWT_SECRET="gere-com: openssl rand -base64 32"
JWT_EXPIRES_IN="12h"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="troque-esta-senha"
ADMIN_ROLE="admin"        # admin | operador | viewer

# Cache (Redis — opcional)
REDIS_HOST=...
REDIS_PORT=...

# Mineração de leads (Assertiva)
ASSERTIVA_CLIENT_ID=
ASSERTIVA_CLIENT_SECRET=

# Logs
LOG_LEVEL="info"
```

> O arquivo `.env.example` completo lista todas as variáveis disponíveis, incluindo limites de upload e parâmetros de mineração.

## Scripts Disponíveis

Na raiz do monorepo (`pnpm <script>`):

```bash
# Desenvolvimento
pnpm dev                 # frontend + backend em paralelo
pnpm dev:backend         # apenas backend
pnpm dev:frontend        # apenas frontend

# Build
pnpm build               # build de todos os pacotes
pnpm build:backend
pnpm build:frontend

# Testes
pnpm test                # todos os testes
pnpm test:backend
pnpm test:frontend
pnpm test:coverage

# Qualidade
pnpm lint
pnpm lint:fix
pnpm typecheck
pnpm format

# Banco de dados
pnpm db:migrate          # migrações (dev)
pnpm db:seed             # popular dados
pnpm db:studio           # Prisma Studio
```

No backend (`apps/backend`) há ainda `db:migrate:deploy` (migrações em produção) e `db:generate` (gerar Prisma Client).

## Testes

Os testes usam **Vitest** (com Supertest no backend e Testing Library no frontend), com meta de cobertura de **80%**.

```bash
pnpm test                # roda backend + frontend
pnpm test:coverage       # com relatório de cobertura
```

## Deploy

- **PM2** gerencia os processos backend (3001) e frontend (3000) via `deploy/ecosystem.config.cjs`.
- **Nginx** atua como proxy reverso (`/etc/nginx/sites-available/rancho`).
- **systemd** mantém o PM2 ativo (`pm2-deploy.service`).
- O script `deploy/deploy.sh` executa: pull → install → build → migrate → reload.
- Em produção, o backend escuta apenas em `127.0.0.1` e os arquivos `.env` devem ter permissão `600`.

## Workflow de Desenvolvimento

### Regras Inegociáveis

1. **100% em Português Brasileiro** — código, commits, documentação e comentários
2. **Validação antes de construção** — toda funcionalidade tem critério de pronto
3. **Mobile-first** — toda interface é pensada primeiro para o celular

### Convenção de Commits

Formato `tipo(escopo): descrição`:

- `feat(cardapio): adiciona scroll snap no feed`
- `fix(checkout): corrige cálculo de taxa por bairro`
- `refactor(api): reorganiza controllers`
- `docs(readme): atualiza documentação`
- `test(pedidos): adiciona testes de integração`

Versionamento segue [Semantic Versioning](https://semver.org/) e o histórico é registrado em [CHANGELOG.md](CHANGELOG.md).

## Roadmap

Funcionalidades com modelagem no banco mas ainda **não implementadas** no código:

- **Roleta de promoções** (`RoletaGiro`) — gamificação pós-pedido
- **Programa de indicação** (`Indicacao`) — bonificação por cliente indicado

## Segurança

- Autenticação JWT com RBAC no painel admin (`admin` / `operador` / `viewer`)
- `helmet` para *hardening* de cabeçalhos HTTP
- *Rate limiting* (`express-rate-limit`) e middleware de idempotência
- Validação de entrada com **Zod**
- Guardrails do agente de IA contra spam e *prompt injection*
- Variáveis sensíveis apenas em `.env` (nunca no código)

## Licença

Proprietary — Todos os direitos reservados.

---

**Versão atual:** 0.9.0

**Última atualização:** 05/06/2026
