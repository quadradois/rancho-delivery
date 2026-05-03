#!/usr/bin/env bash
set -euo pipefail

# Smoke test Fase 3 (Pedidos): reorder, stream SSE e NPS
# Uso:
#   BASE_URL=http://127.0.0.1:3001 bash scripts/smoke-fase3.sh
# Variáveis opcionais:
#   BASE_URL         URL base da API (default: http://127.0.0.1:3001)
#   PRODUTO_ID       produto para criar pedido de teste (se vazio, tenta buscar no banco)
#   BAIRRO_NOME      bairro para criar pedido de teste (se vazio, tenta buscar no banco)
#   FORCE_ENTREGUE   true/false (default: true) para validar NPS com sucesso

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/apps/backend"
BASE_URL="${BASE_URL:-http://127.0.0.1:3001}"
FORCE_ENTREGUE="${FORCE_ENTREGUE:-true}"

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "[ERRO] comando ausente: $1"; exit 1; }
}

need curl
need node
need pnpm

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

json_get() {
  local file="$1"
  local path="$2"
  node -e "const fs=require('fs');const j=JSON.parse(fs.readFileSync('$file','utf8'));const v='$path'.split('.').reduce((a,k)=>a&&a[k],j);process.stdout.write(v==null?'':String(v));"
}

echo "[1/7] Gerando token admin de smoke..."
ADMIN_TOKEN="$(cd "$BACKEND_DIR" && pnpm -s tsx -e "import { criarAdminToken } from './src/middlewares/adminAuth.middleware'; console.log(criarAdminToken('smoke-admin','admin'));" | tail -n 1)"

if [[ -z "$ADMIN_TOKEN" ]]; then
  echo "[ERRO] não foi possível gerar token admin"
  exit 1
fi

echo "[2/7] Descobrindo produto e bairro ativos..."
SEED_JSON="$TMP_DIR/seed.json"
cd "$BACKEND_DIR"
pnpm -s tsx -e "import prisma from './src/config/database'; (async()=>{ const produto=await prisma.produto.findFirst({ where:{ disponivel:true }, select:{ id:true }}); const bairro=await prisma.bairro.findFirst({ where:{ ativo:true }, select:{ nome:true }}); console.log(JSON.stringify({produto,bairro})); await prisma.\$disconnect(); })();" > "$SEED_JSON"
PRODUTO_ID="${PRODUTO_ID:-$(json_get "$SEED_JSON" produto.id)}"
BAIRRO_NOME="${BAIRRO_NOME:-$(json_get "$SEED_JSON" bairro.nome)}"

if [[ -z "$PRODUTO_ID" || -z "$BAIRRO_NOME" ]]; then
  echo "[ERRO] não encontrou produto/bairro ativos"
  cat "$SEED_JSON"
  exit 1
fi

echo "[3/7] Criando pedido de teste..."
CREATE_JSON="$TMP_DIR/create.json"
curl -s -X POST "$BASE_URL/api/pedidos" \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: smoke-fase3-$(date +%s)" \
  -d "{\"cliente\":{\"telefone\":\"5562999012345\",\"nome\":\"Smoke Fase3\",\"endereco\":\"Rua Smoke 123\",\"bairro\":\"$BAIRRO_NOME\",\"cep\":\"74000000\"},\"itens\":[{\"produtoId\":\"$PRODUTO_ID\",\"quantidade\":1}],\"observacao\":\"smoke-fase3\"}" > "$CREATE_JSON"

ORDER_ID="$(json_get "$CREATE_JSON" data.id)"
if [[ -z "$ORDER_ID" ]]; then
  echo "[ERRO] falha ao criar pedido"
  cat "$CREATE_JSON"
  exit 1
fi

echo "[4/7] Buscando token de acesso do pedido..."
TOKEN="$(cd "$BACKEND_DIR" && pnpm -s tsx -e "import prisma from './src/config/database'; const id='$ORDER_ID'; (async()=>{ const p=await prisma.pedido.findUnique({ where:{id}, select:{ tokenAcesso:true }}); process.stdout.write(p?.tokenAcesso||''); await prisma.\$disconnect(); })();")"
USE_ADMIN_AUTH=false
if [[ -z "$TOKEN" ]]; then
  USE_ADMIN_AUTH=true
  echo "[WARN] pedido sem tokenAcesso; usando fallback com JWT admin para smoke runtime"
fi

echo "[5/7] Testando reorder..."
REORDER_JSON="$TMP_DIR/reorder.json"
if [[ "$USE_ADMIN_AUTH" == "true" ]]; then
  REORDER_CODE="$(curl -s -o "$REORDER_JSON" -w '%{http_code}' -X POST "$BASE_URL/api/pedidos/reorder/$ORDER_ID" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{}')"
else
  REORDER_CODE="$(curl -s -o "$REORDER_JSON" -w '%{http_code}' -X POST "$BASE_URL/api/pedidos/reorder/$ORDER_ID?token=$TOKEN" -H 'Content-Type: application/json' -d '{}')"
fi

echo "[6/7] Testando stream SSE..."
set +e
if [[ "$USE_ADMIN_AUTH" == "true" ]]; then
  SSE_HEAD="$(curl -sN --max-time 5 "$BASE_URL/api/pedidos/$ORDER_ID/eventos" -H "Authorization: Bearer $ADMIN_TOKEN" | head -n 2 | tr '\n' ' ')"
else
  SSE_HEAD="$(curl -sN --max-time 5 "$BASE_URL/api/pedidos/$ORDER_ID/eventos?token=$TOKEN" | head -n 2 | tr '\n' ' ')"
fi
set -e

echo "[7/7] Testando NPS..."
if [[ "$FORCE_ENTREGUE" == "true" ]]; then
  cd "$BACKEND_DIR"
  pnpm -s tsx -e "import prisma from './src/config/database'; const id='$ORDER_ID'; (async()=>{ await prisma.pedido.update({ where:{id}, data:{ status:'ENTREGUE', statusPagamento:'CONFIRMADO', statusMudouEm:new Date() }}); await prisma.\$disconnect(); })();" >/dev/null
fi

NPS_JSON="$TMP_DIR/nps.json"
if [[ "$USE_ADMIN_AUTH" == "true" ]]; then
  NPS_CODE="$(curl -s -o "$NPS_JSON" -w '%{http_code}' -X POST "$BASE_URL/api/pedidos/$ORDER_ID/nps" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -d '{"nota":5,"feedback":"smoke-fase3"}')"
else
  NPS_CODE="$(curl -s -o "$NPS_JSON" -w '%{http_code}' -X POST "$BASE_URL/api/pedidos/$ORDER_ID/nps?token=$TOKEN" -H 'Content-Type: application/json' -d '{"nota":5,"feedback":"smoke-fase3"}')"
fi

echo
echo "==== RESULTADO SMOKE FASE 3 ===="
echo "BASE_URL:       $BASE_URL"
echo "ORDER_ID:       $ORDER_ID"
echo "TOKEN_PREFIX:   ${TOKEN:0:8}"
echo "AUTH_MODE:      $([[ \"$USE_ADMIN_AUTH\" == \"true\" ]] && echo admin_jwt_fallback || echo token_acesso)"
echo "REORDER_CODE:   $REORDER_CODE"
echo "SSE_SAMPLE:     $SSE_HEAD"
echo "NPS_CODE:       $NPS_CODE"
echo "REORDER_BODY:   $(tr '\n' ' ' < "$REORDER_JSON" | cut -c1-240)"
echo "NPS_BODY:       $(tr '\n' ' ' < "$NPS_JSON" | cut -c1-240)"

if [[ "$REORDER_CODE" != "201" ]]; then
  echo "[ERRO] reorder falhou"
  exit 1
fi
if [[ "$NPS_CODE" != "200" ]]; then
  echo "[ERRO] NPS falhou"
  exit 1
fi
if [[ "$SSE_HEAD" != *"connected"* ]]; then
  echo "[ERRO] SSE não conectou"
  exit 1
fi

echo "[OK] Smoke Fase 3 aprovado"
