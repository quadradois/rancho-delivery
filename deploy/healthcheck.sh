#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${1:-http://127.0.0.1:3001}"
WEB_BASE_URL="${2:-http://127.0.0.1:3000}"

curl -fsS "$API_BASE_URL/health" >/dev/null
curl -fsS "$API_BASE_URL/api/produtos" >/dev/null
curl -fsS "$WEB_BASE_URL" >/dev/null

echo "healthcheck ok: api=$API_BASE_URL web=$WEB_BASE_URL"
