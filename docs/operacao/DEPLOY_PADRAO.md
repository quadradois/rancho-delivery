# Deploy Padrao

O projeto de producao fica em `/var/www/rancho-delivery` e deve ser operado
com o usuario `deploy`.

## Deploy via GitHub

```bash
sudo -iu deploy
cd /var/www/rancho-delivery
./deploy/deploy.sh
```

## Rebuild apos edicao manual

```bash
sudo -iu deploy
cd /var/www/rancho-delivery
pnpm build
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save
```

## Conferencias

```bash
systemctl status pm2-deploy.service --no-pager
runuser -u deploy -- env PM2_HOME=/home/deploy/.pm2 pm2 list
nginx -t
curl -fsS http://127.0.0.1:3001/health
curl -I -k https://rancho.delivery/
```

Estado esperado:

- PM2 rodando como `deploy`, nao como `root`.
- Backend em `127.0.0.1:3001`.
- Frontend em `127.0.0.1:3000`.
- Nginx expondo o site em 80/443.

Mais detalhes para agentes estao em `AGENTS.md` na raiz do projeto.
