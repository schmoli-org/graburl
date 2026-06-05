#!/usr/bin/env bash
# Deploy web/ to Vercel. Preview by default; pass --prod for production.
set -euo pipefail
cd "$(dirname "$0")/../web"

if ! command -v vercel >/dev/null 2>&1; then
  echo "vercel CLI not found — brew install vercel-cli" >&2
  exit 1
fi

[[ -d node_modules ]] || pnpm install

if [[ "${1:-}" == "--prod" ]]; then
  vercel deploy --prod
else
  vercel deploy
fi
