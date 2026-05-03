#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/rancho-delivery"
PM2_HOME="/home/deploy/.pm2"

cd "$APP_DIR"

ensure_writable_artifacts() {
  # Garante ownership correto antes de limpar artefatos de build.
  chown -R deploy:www-data "$APP_DIR/apps/frontend/.next" "$APP_DIR/apps/backend/dist" 2>/dev/null || true
  rm -rf "$APP_DIR/apps/frontend/.next" "$APP_DIR/apps/backend/dist"
}

ensure_writable_artifacts
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pnpm --filter @rancho-delivery/backend db:migrate:deploy

PM2_HOME="$PM2_HOME" pm2 reload "$APP_DIR/deploy/ecosystem.config.cjs" --update-env
PM2_HOME="$PM2_HOME" pm2 save

"$APP_DIR/deploy/healthcheck.sh" "http://127.0.0.1:3001" "http://127.0.0.1:3000"
