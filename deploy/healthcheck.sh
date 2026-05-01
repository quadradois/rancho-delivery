#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${1:-http://127.0.0.1:3001}"
WEB_BASE_URL="${2:-http://127.0.0.1:3000}"
ATTEMPTS="${HEALTHCHECK_ATTEMPTS:-30}"
SLEEP_SECONDS="${HEALTHCHECK_SLEEP_SECONDS:-2}"

wait_for_url() {
  local label="$1"
  local url="$2"

  for attempt in $(seq 1 "$ATTEMPTS"); do
    if curl -fsS "$url" >/dev/null; then
      echo "healthcheck ok: $label ($url)"
      return 0
    fi

    echo "healthcheck aguardando: $label tentativa $attempt/$ATTEMPTS"
    sleep "$SLEEP_SECONDS"
  done

  echo "healthcheck falhou: $label ($url)" >&2
  return 1
}

wait_for_url "api health" "$API_BASE_URL/health"
wait_for_url "api produtos" "$API_BASE_URL/api/produtos"
wait_for_url "frontend" "$WEB_BASE_URL"

echo "healthcheck ok: api=$API_BASE_URL web=$WEB_BASE_URL"
