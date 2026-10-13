#!/bin/zsh
cd -- "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null; then
  echo 'Node.js 20 or newer is required. Install it from https://nodejs.org then reopen this launcher.'
  read '?Press Enter to close.'
  exit 1
fi
if [[ ! -d node_modules/ws ]]; then
  npm ci --no-audit --no-fund || exit 1
fi
if [[ ! -f public/vendor/three.module.js ]]; then
  npm run build || exit 1
fi
node scripts/launch.mjs
