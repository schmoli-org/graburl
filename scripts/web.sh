#!/usr/bin/env bash
# Run the Astro dev server for web/ and open the browser.
set -euo pipefail
cd "$(dirname "$0")/../web"
[[ -d node_modules ]] || pnpm install
exec pnpm dev --open
