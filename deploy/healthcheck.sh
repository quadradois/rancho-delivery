#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1}"

curl -fsS "$BASE_URL/health" >/dev/null
curl -fsS "$BASE_URL/api/produtos" >/dev/null
curl -fsS "$BASE_URL" >/dev/null

echo "healthcheck ok: $BASE_URL"
