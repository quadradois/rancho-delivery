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
- Webhooks de pagamento (`webhook.rancho.delivery` ou via `api.rancho.delivery/webhook/infinitepay`)

---

## 2. Stack Técnico

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
- Credenciais no servidor:
  - Usuário: `<definir_no_servidor>`
  - Senha: `<secret_manager_ou_env_var>`
  - Banco: `<nome_banco_producao>`

### Infraestrutura
- **Servidor VPS:** Ubuntu 22.04 — IP `194.5.152.177`
- **Monorepo** pnpm workspaces (`apps/frontend` + `apps/backend` + `packages/shared`)
- **Sem Docker** — PostgreSQL instalado diretamente no servidor

### Integrações
- **InfinitePay** — gateway de pagamento (substituiu Asaas)
  - Handle: `orancho-comida`
  - Endpoint webhook: `POST /webhook/infinitepay`
- **Evolution API** — notificações WhatsApp

---

## 3. Domínios e DNS (Cloudflare)

| Subdomínio | Tipo | IP | Uso |
|---|---|---|---|
| `@` (rancho.delivery) | A | 194.5.152.177 | Site de pedidos |
| `app` | A | 194.5.152.177 | Painel admin |
| `api` | A | 194.5.152.177 | Backend API |
| `webhook` | A | 194.5.152.177 | Webhooks (alternativo) |

Todos com proxy Cloudflare ativo (nuvem laranja).

---

## 4. Estrutura do Projeto

```
C:\sabosexprex\                         (raiz do monorepo)
├── apps/
│   ├── frontend/                       (Next.js)
│   │   ├── src/
│   │   │   ├── app/                    (App Router)
│   │   │   │   ├── page.tsx            (cardápio principal)
│   │   │   │   ├── layout.tsx          (layout global)
│   │   │   │   ├── cart/page.tsx       (carrinho)
│   │   │   │   ├── checkout/page.tsx   (checkout)
│   │   │   │   ├── pedido/[id]/page.tsx (confirmação)
│   │   │   │   └── admin/              (painel admin)
│   │   │   │       ├── layout.tsx      (sidebar admin)
│   │   │   │       ├── page.tsx        (dashboard)
│   │   │   │       ├── produtos/       (CRUD produtos)
│   │   │   │       ├── bairros/        (CRUD bairros)
│   │   │   │       └── pedidos/        (visualização pedidos)
│   │   │   ├── components/             (componentes React)
│   │   │   ├── contexts/               (CartContext, ToastContext)
│   │   │   ├── lib/                    (api-client, utils)
│   │   │   ├── schemas/                (checkoutSchema Zod)
│   │   │   └── styles/                 (design-system.css)
│   │   ├── tailwind.config.js
│   │   └── package.json
│   └── backend/
│       ├── src/
│       │   ├── controllers/            (produto, bairro, pedido, webhook)
│       │   ├── services/
│       │   │   ├── infinitepay.service.ts  (NOVO — substituiu asaas)
│       │   │   ├── pedido.service.ts
│       │   │   ├── produto.service.ts
│       │   │   ├── bairro.service.ts
│       │   │   ├── cliente.service.ts
│       │   │   └── evolution.service.ts
│       │   ├── routes/
│       │   │   └── webhook.routes.ts   (POST /webhook/infinitepay)
│       │   ├── middlewares/
│       │   └── config/
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       └── package.json
├── packages/shared/                    (tipos compartilhados)
├── docs/
│   └── relatorios/
│       └── 2026-04-29_planejamento_frontend.md  (planejamento completo)
├── .env.example                        (template de variáveis)
├── .gitignore
└── package.json
```

---

## 5. Design System — Fontes

| Variável CSS | Classe Tailwind | Fonte | Uso |
|---|---|---|---|
| `--font-brand` / `--font-display` | `font-brand` / `font-display` | Rustic Printed | Logo, marca, badges de categoria |
| `--font-produto` | `font-produto` | Alfa Slab One | Títulos e preços de produtos |
| `--font-body` | `font-body` | Nunito | Textos corridos, labels, inputs |

Fontes carregadas em `src/styles/design-system.css` via `@font-face` e Google Fonts.

---

## 6. Variáveis de Ambiente Necessárias

### Backend (`apps/backend/.env`)
```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://<usuario>:<senha>@localhost:5432/<banco>
FRONTEND_URL=https://rancho.delivery
INFINITEPAY_HANDLE=orancho-comida
INFINITEPAY_WEBHOOK_SECRET=<definir um secret forte>
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=<api key da Evolution>
EVOLUTION_INSTANCE_NAME=rancho-comida
WHATSAPP_DONO=<número com DDI+DDD, ex: 5562999999999>
LOG_LEVEL=info
JWT_SECRET=<secret forte para JWT>
JWT_EXPIRES_IN=7d
```

### Frontend (`apps/frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://api.rancho.delivery
```

---

## 7. O Que Já Foi Feito no Servidor

- [x] Ubuntu 22.04 atualizado
- [x] Node.js 18 instalado
- [x] pnpm 8 instalado
- [x] PM2 instalado
- [x] Nginx instalado
- [x] Certbot instalado
- [x] PostgreSQL instalado e rodando
- [x] Banco de produção criado
- [x] Usuário de produção criado
- [ ] Repositório git clonado no servidor
- [ ] Variáveis de ambiente configuradas
- [ ] Migrations do Prisma executadas
- [ ] Seed do banco executado
- [ ] Build do backend
- [ ] Build do frontend
- [ ] PM2 configurado
- [ ] Nginx configurado com os 4 domínios
- [ ] SSL via Certbot configurado
- [ ] Firewall UFW configurado
- [ ] Webhook InfinitePay configurado no painel

---

## 8. Próximos Passos — Deploy Completo

### Passo 1 — Commit e Push para GitHub
No terminal local (`C:\sabosexprex`):
```powershell
git rm -r --cached .claude
git add .
git commit -m "feat: projeto inicial Rancho Comida Caseira"
git branch -M main
git remote add origin https://github.com/<usuario>/rancho-delivery.git
git push -u origin main
```

### Passo 2 — Clonar no servidor
No servidor via SSH (`ssh root@194.5.152.177`):
```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/<usuario>/rancho-delivery.git rancho
cd rancho
```

### Passo 3 — Variáveis de ambiente no servidor
```bash
# Backend
cp .env.example apps/backend/.env
nano apps/backend/.env
# Preencher todas as variáveis conforme seção 6

# Frontend
nano apps/frontend/.env.local
# NEXT_PUBLIC_API_URL=https://api.rancho.delivery
```

### Passo 4 — Instalar dependências e migrations
```bash
cd /var/www/rancho
pnpm install
pnpm db:migrate
pnpm db:seed
```

### Passo 5 — Build
```bash
pnpm build:backend
pnpm build:frontend
```

### Passo 6 — PM2
```bash
# Backend
pm2 start apps/backend/dist/index.js --name rancho-api

# Frontend
pm2 start "pnpm start" --name rancho-frontend --cwd apps/frontend

pm2 save
pm2 startup
```

### Passo 7 — Nginx
Criar arquivo `/etc/nginx/sites-available/rancho`:
```nginx
# Site de pedidos — rancho.delivery
server {
    listen 80;
    server_name rancho.delivery www.rancho.delivery;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# Painel admin — app.rancho.delivery
server {
    listen 80;
    server_name app.rancho.delivery;

    location / {
        proxy_pass http://localhost:3000/admin;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# API — api.rancho.delivery
server {
    listen 80;
    server_name api.rancho.delivery;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/rancho /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Passo 8 — SSL
```bash
certbot --nginx -d rancho.delivery -d www.rancho.delivery -d app.rancho.delivery -d api.rancho.delivery
```

### Passo 9 — Firewall
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

### Passo 10 — Webhook InfinitePay
No painel InfinitePay, configurar webhook apontando para:
```
https://api.rancho.delivery/webhook/infinitepay
```

---

## 9. Comandos Úteis no Servidor

```bash
# Ver logs do backend
pm2 logs rancho-api

# Ver logs do frontend
pm2 logs rancho-frontend

# Reiniciar serviços
pm2 restart all

# Status dos processos
pm2 status

# Testar API
curl https://api.rancho.delivery/health

# Testar banco
sudo -u postgres psql -d rancho_delivery -c "\dt"
```

---

## 10. Observações Importantes

1. **Senha do servidor exposta no chat** — trocar a senha root imediatamente após o deploy:
   ```bash
   passwd root
   ```

2. **Autenticação do admin** — o painel `/admin` não tem autenticação ainda. Qualquer pessoa com a URL acessa. Implementar autenticação antes de ir para produção.

3. **InfinitePay webhook secret** — definir um secret forte e configurar tanto no `.env` do backend quanto no painel InfinitePay.

4. **Prisma schema** — o campo `pagamentoId` no modelo `Pedido` ainda tem comentário "ID do Asaas". Pode atualizar para "ID do InfinitePay" em uma migration futura.

5. **CORS** — o backend já está configurado para aceitar `https://rancho.delivery` via variável `FRONTEND_URL`.

6. **Testes** — 82/82 testes unitários passando. Rodar `pnpm test:frontend` para confirmar antes do deploy.

---

## 11. Repositório GitHub

- URL: `https://github.com/<usuario>/rancho-delivery` (preencher após push)
- Branch principal: `main`
- Primeiro commit ainda não foi feito — ver Passo 1 acima

---

*Documento criado em 2026-04-30 para continuidade do desenvolvimento.*
