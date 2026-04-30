# Handoff — Rancho Comida Caseira
## Documento de Continuidade para Próximo Agente

**Data:** 2026-04-30  
**Projeto:** Rancho Comida Caseira — Sistema de delivery online  
**Status atual:** Em processo de deploy no servidor de produção  

---

## 1. Visão Geral do Projeto

Sistema web completo para restaurante delivery-only com:
- Site de pedidos para clientes (`rancho.delivery`)
- Painel administrativo (`app.rancho.delivery`)
- API REST (`api.rancho.delivery`)
- Webhook de pagamento (`POST /webhook/infinitepay` via `api.rancho.delivery`)

---

## 2. Repositório GitHub

- URL: `https://github.com/quadradois/rancho-delivery`
- SSH: `git@github.com:quadradois/rancho-delivery.git`
- Branch principal: `master`

---

## 3. Stack Técnico

### Frontend
- **Next.js 14** (App Router) + React 18 + TypeScript 5.3
- **Tailwind CSS 3.4** com design system customizado
- **Zod** — validação de formulários
- **Vitest** + Testing Library — testes unitários (82/82 passando)
- Gerenciador: **pnpm 8**

### Backend
- **Node.js 18+** + **Express 4** + TypeScript 5.3
- **Prisma 5** — ORM com PostgreSQL
- **Zod** — validação de dados
- **Winston** — logging
- **Helmet + CORS** — segurança

### Banco de Dados
- **PostgreSQL 14+**
- Usuário: `rancho`
- Banco: `rancho_delivery`
- Credenciais reais: ver `.env` no servidor (nunca commitar)

### Infraestrutura
- **Servidor VPS:** Ubuntu 22.04 — IP `194.5.152.177`
- **Monorepo** pnpm workspaces (`apps/frontend` + `apps/backend` + `packages/shared`)
- **Sem Docker** — PostgreSQL instalado diretamente no servidor
- **PM2** — gerenciador de processos
- **Nginx** — proxy reverso
- **Certbot** — SSL Let's Encrypt

### Integrações
- **InfinitePay** — gateway de pagamento (substituiu Asaas)
  - Handle: `orancho-comida`
  - Endpoint webhook: `POST /webhook/infinitepay`
  - Configurar webhook no painel InfinitePay apontando para `https://api.rancho.delivery/webhook/infinitepay`
- **Evolution API** — notificações WhatsApp ao dono

---

## 4. Domínios e DNS (Cloudflare)

| Nome | Tipo | IP | Uso |
|---|---|---|---|
| `@` (rancho.delivery) | A | 194.5.152.177 | Site de pedidos |
| `app` | A | 194.5.152.177 | Painel admin |
| `api` | A | 194.5.152.177 | Backend API |
| `webhook` | A | 194.5.152.177 | Alternativo para webhooks |
| `www` | CNAME | rancho.delivery | Redirect www |

Todos com proxy Cloudflare ativo (nuvem laranja). SSL modo Full (strict).

---

## 5. Estrutura do Projeto

```
/
├── apps/
│   ├── frontend/                       (Next.js)
│   │   ├── src/app/                    (App Router)
│   │   │   ├── page.tsx                (cardápio principal)
│   │   │   ├── layout.tsx              (layout global)
│   │   │   ├── cart/page.tsx           (carrinho)
│   │   │   ├── checkout/page.tsx       (checkout com Zod)
│   │   │   ├── pedido/[id]/page.tsx    (confirmação de pedido)
│   │   │   └── admin/                  (painel admin — sem auth ainda)
│   │   │       ├── layout.tsx          (sidebar)
│   │   │       ├── page.tsx            (dashboard)
│   │   │       ├── produtos/           (CRUD produtos)
│   │   │       ├── bairros/            (CRUD bairros)
│   │   │       └── pedidos/            (visualização pedidos)
│   │   ├── src/styles/design-system.css
│   │   └── tailwind.config.js
│   └── backend/
│       ├── src/services/
│       │   ├── infinitepay.service.ts  (gateway de pagamento)
│       │   ├── pedido.service.ts
│       │   ├── produto.service.ts
│       │   ├── bairro.service.ts
│       │   ├── cliente.service.ts
│       │   └── evolution.service.ts    (WhatsApp)
│       ├── src/routes/
│       │   └── webhook.routes.ts       (POST /webhook/infinitepay)
│       └── prisma/
│           ├── schema.prisma
│           ├── migrations/
│           └── seed.ts
├── deploy/
│   ├── deploy.sh                       (script de deploy padrão)
│   ├── ecosystem.config.cjs            (PM2 config)
│   ├── nginx.rancho-delivery.conf      (config Nginx)
│   ├── healthcheck.sh                  (smoke test)
│   ├── env.backend.production.example  (template .env backend)
│   └── env.frontend.production.example (template .env frontend)
├── docs/operacao/
│   ├── FIRST_DEPLOY_RUNBOOK.md         (passo a passo primeiro deploy)
│   ├── DEPLOY_PADRAO.md                (deploy de rotina)
│   └── HANDOFF.md                      (este arquivo)
└── AGENTS.md                           (instruções para agentes de IA)
```

---

## 6. Design System — Fontes

| Variável CSS | Classe Tailwind | Fonte | Uso |
|---|---|---|---|
| `--font-brand` / `--font-display` | `font-brand` / `font-display` | Rustic Printed | Logo, marca, badges de categoria |
| `--font-produto` | `font-produto` | Alfa Slab One | Títulos e preços de produtos |
| `--font-body` | `font-body` | Nunito | Textos corridos, labels, inputs |

Cores principais: `#1A0D06` (fundo), `#D4601C` (brasa/primária), `#E8A040` (mel/acento), `#F4E8CC` (bege claro/texto).

---

## 7. Variáveis de Ambiente

### Backend (`apps/backend/.env`)
Ver template em `deploy/env.backend.production.example`.
Valores críticos:
- `DATABASE_URL` — string de conexão PostgreSQL
- `INFINITEPAY_HANDLE=orancho-comida`
- `INFINITEPAY_WEBHOOK_SECRET` — definir secret forte
- `FRONTEND_URL=https://rancho.delivery`
- `WHATSAPP_DONO` — número com DDI+DDD

### Frontend (`apps/frontend/.env.production`)
Ver template em `deploy/env.frontend.production.example`.
- `NEXT_PUBLIC_API_URL=https://api.rancho.delivery`

---

## 8. O Que Já Foi Feito no Servidor

- [x] Ubuntu 22.04 atualizado
- [x] Node.js 18 instalado
- [x] pnpm 8 instalado
- [x] PM2 instalado
- [x] Nginx instalado
- [x] Certbot instalado
- [x] PostgreSQL instalado e rodando
- [x] Banco `rancho_delivery` criado
- [x] Usuário `rancho` criado
- [ ] Usuário `deploy` criado no servidor
- [ ] Repositório clonado em `/var/www/rancho-delivery`
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations do Prisma executadas (`db:migrate:deploy`)
- [ ] Seed do banco executado (`db:seed`)
- [ ] Build do backend e frontend
- [ ] PM2 configurado com `ecosystem.config.cjs`
- [ ] Nginx configurado com `nginx.rancho-delivery.conf`
- [ ] SSL via Certbot ativado
- [ ] Firewall UFW configurado
- [ ] Webhook InfinitePay configurado no painel

---

## 9. Próximos Passos — Completar Deploy

Seguir o `docs/operacao/FIRST_DEPLOY_RUNBOOK.md` a partir do passo 2.

Resumo rápido:
```bash
# No servidor
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /var/www
sudo chown deploy:www-data /var/www
sudo -iu deploy
cd /var/www
git clone git@github.com:quadradois/rancho-delivery.git
cd rancho-delivery
cp deploy/env.backend.production.example apps/backend/.env
cp deploy/env.frontend.production.example apps/frontend/.env.production
# Editar os dois .env com valores reais
pnpm install --frozen-lockfile
pnpm --filter @rancho-delivery/backend db:generate
pnpm --filter @rancho-delivery/backend db:migrate:deploy
pnpm build
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
# Nginx e SSL — ver FIRST_DEPLOY_RUNBOOK.md passos 6 e 7
```

---

## 10. Pendências e Observações

1. **Autenticação do admin** — o painel `/admin` não tem autenticação. Qualquer pessoa com a URL acessa. Implementar antes de ir para produção.

2. **Usuário `deploy`** — o `AGENTS.md` define que PM2 deve rodar como usuário `deploy`, não `root`. Criar o usuário antes do deploy.

3. **Webhook InfinitePay** — após deploy, configurar no painel InfinitePay:
   `https://api.rancho.delivery/webhook/infinitepay`

4. **Senha do servidor** — a senha root foi exposta no chat. Trocar imediatamente:
   ```bash
   passwd root
   ```

5. **Prisma schema** — o comentário no campo `pagamentoId` ainda diz "ID do Asaas". Cosmético, não afeta funcionamento.

6. **Testes** — 82/82 testes unitários passando. Rodar `pnpm test:frontend` antes de cada deploy.
