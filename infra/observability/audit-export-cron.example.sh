#!/usr/bin/env bash
# Example: periodic SIEM forward for Message2 access-audit (P6).
# Requires: ADMIN_TOKEN, GATEWAY_URL (default http://127.0.0.1:4000)

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:4000}"
ADMIN_TOKEN="${ADMIN_TOKEN:?set ADMIN_TOKEN}"

response="$(curl -sS -w "\n%{http_code}" -X POST "${GATEWAY_URL}/access-audit/admin/siem/forward" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "content-type: application/json")"

body="$(echo "$response" | head -n -1)"
code="$(echo "$response" | tail -n 1)"

if [[ "$code" != "200" ]]; then
  echo "SIEM forward failed: HTTP ${code}" >&2
  echo "$body" >&2
  exit 1
fi

echo "$body"
