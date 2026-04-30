# FIRST_DEPLOY_RUNBOOK

Data: 2026-04-30  
Objetivo: primeiro deploy produtivo do Rancho com PM2 + Nginx + SSL.

## 1. Pre-requisitos do servidor

```bash
sudo apt update
sudo apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm pm2
```

## 2. Publicar codigo e instalar dependencias

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone git@github.com:quadradois/rancho-delivery.git
cd rancho-delivery
pnpm install --frozen-lockfile
```

## 3. Configurar variaveis de ambiente

Backend:
```bash
cp deploy/env.backend.production.example apps/backend/.env
```

Frontend:
```bash
cp deploy/env.frontend.production.example apps/frontend/.env.production
```

Editar os dois arquivos com os valores reais de producao.

## 4. Banco e build

```bash
pnpm --filter @rancho-delivery/backend db:generate
pnpm --filter @rancho-delivery/backend db:migrate:deploy
pnpm build
```

## 5. Subir com PM2

```bash
pm2 start deploy/ecosystem.config.cjs
pm2 save
pm2 startup
```

## 6. Configurar Nginx

```bash
sudo cp deploy/nginx.rancho-delivery.conf /etc/nginx/sites-available/rancho-delivery
sudo ln -sf /etc/nginx/sites-available/rancho-delivery /etc/nginx/sites-enabled/rancho-delivery
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Ativar SSL

```bash
sudo certbot --nginx -d rancho.delivery -d www.rancho.delivery -d app.rancho.delivery -d api.rancho.delivery
```

## 8. Smoke test pos-deploy

```bash
bash deploy/healthcheck.sh https://rancho.delivery
```

Validar manualmente:
- checkout completo com pedido real
- webhook de pagamento
- notificacao WhatsApp ao dono
- painel admin carregando pedidos

## 9. Rollback rapido

Se deploy falhar:
```bash
pm2 logs --lines 200
pm2 restart rancho-backend rancho-frontend
```

Se necessario voltar commit:
```bash
git log --oneline -n 5
git checkout <commit_estavel>
pnpm install --frozen-lockfile
pnpm build
pm2 restart rancho-backend rancho-frontend
```
