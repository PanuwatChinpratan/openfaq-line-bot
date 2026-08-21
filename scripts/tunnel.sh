#!/usr/bin/env bash
set -euo pipefail
if command -v cloudflared >/dev/null; then exec cloudflared tunnel --url http://localhost:3000; fi
if command -v ngrok >/dev/null; then exec ngrok http 3000; fi
echo "Install cloudflared (preferred) or ngrok first." >&2
exit 1
