# Instrucoes Para Agentes

## Deploy e acesso ao servidor

Este projeto roda em producao a partir de `/var/www/rancho-delivery`.

Nao mover o projeto para `/root`. No VS Code, pode existir um atalho em
`/root/rancho-delivery` apontando para `/var/www/rancho-delivery`; ele serve
apenas para facilitar o acesso pelo Explorer.

## Usuario correto

O usuario operacional do projeto e `deploy`.

- Arquivos do projeto: `deploy:www-data`
- PM2 em producao: usuario `deploy`
- Servico systemd: `pm2-deploy.service`
- PM2_HOME: `/home/deploy/.pm2`

Nao subir backend ou frontend com PM2 do `root`.

## Deploy padrao

Para fazer deploy de uma versao que ja esta no GitHub:

```bash
sudo -iu deploy
cd /var/www/rancho-delivery
./deploy/deploy.sh
```

O script faz:

- `git pull --ff-only`
- `pnpm install --frozen-lockfile`
- `pnpm build`
- `pnpm --filter @rancho-delivery/backend db:migrate:deploy`
- `pm2 reload deploy/ecosystem.config.cjs --update-env`
- `pm2 save`
- healthcheck local

Se houver alteracoes locais nao commitadas, o `git pull --ff-only` pode falhar.
Nesse caso, revisar `git status` antes de qualquer deploy e nunca descartar
alteracoes sem confirmacao explicita.

## Reload apos edicao manual no servidor

Se a alteracao foi feita diretamente no servidor:

```bash
sudo -iu deploy
cd /var/www/rancho-delivery
pnpm build
pm2 reload deploy/ecosystem.config.cjs --update-env
pm2 save
```

## Validacoes importantes

Depois de mexer em deploy, validar:

```bash
systemctl status pm2-deploy.service --no-pager
runuser -u deploy -- env PM2_HOME=/home/deploy/.pm2 pm2 list
nginx -t
curl -fsS http://127.0.0.1:3001/health
curl -I -k https://rancho.delivery/
ss -ltnp | grep -E ':(3000|3001)\b'
```

Estado esperado:

- `pm2-deploy.service` ativo e habilitado.
- `rancho-backend` e `rancho-frontend` online como `deploy`.
- Backend em `127.0.0.1:3001`.
- Frontend em `127.0.0.1:3000`.
- Nginx exposto nas portas 80/443.

## Arquivos sensiveis

Manter estes arquivos privados:

```bash
chmod 600 /var/www/rancho-delivery/apps/backend/.env
chmod 600 /var/www/rancho-delivery/apps/frontend/.env.production
```

Nao imprimir segredos de `.env` em respostas, logs ou documentacao.
