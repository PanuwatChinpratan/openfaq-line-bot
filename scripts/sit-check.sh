#!/usr/bin/env bash
set -u
cd "$(dirname "$0")/.."
fail=0
check() { if "$@"; then echo "PASS: $*"; else echo "FAIL: $*"; fail=1; fi; }
check docker compose ps --status running postgres
check curl -fsS http://localhost:3000/health
ready="$(curl -fsS http://localhost:3000/ready 2>/dev/null || true)"
echo "READY: $ready"
echo "$ready" | grep -q 'approvedFaqCount' || fail=1
if grep -q '^AI_MODE=local-ai' .env 2>/dev/null; then echo "Local AI enabled; run npm run ai:smoke."; else echo "Public Lite mode; Ollama is optional."; fi
if grep -Eq '^LINE_CHANNEL_SECRET=.{8,}$' .env 2>/dev/null && grep -Eq '^LINE_CHANNEL_ACCESS_TOKEN=.{8,}$' .env 2>/dev/null; then echo "LINE secrets present."; else echo "WARN: LINE secrets missing; mock adapter active."; fi
exit "$fail"
