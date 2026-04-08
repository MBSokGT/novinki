#!/usr/bin/env bash
set -euo pipefail

pages_base_path="${PAGES_BASE_PATH:-}"
if [[ -z "$pages_base_path" ]]; then
  echo "PAGES_BASE_PATH is required, for example /novinki" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"

cleanup() {
  if [[ -d "$tmp_dir/api" ]]; then
    mkdir -p app
    mv "$tmp_dir/api" app/api
  fi

  if [[ -f "$tmp_dir/middleware.ts" ]]; then
    mv "$tmp_dir/middleware.ts" middleware.ts
  fi

  rm -rf "$tmp_dir"
}

trap cleanup EXIT

# GitHub Pages is static hosting only, so strip server-only entry points for export.
if [[ -d app/api ]]; then
  mv app/api "$tmp_dir/api"
fi

if [[ -f middleware.ts ]]; then
  mv middleware.ts "$tmp_dir/middleware.ts"
fi

export NEXT_PUBLIC_STATIC_EXPORT=true
export NEXT_PUBLIC_DEMO_MODE="${NEXT_PUBLIC_DEMO_MODE:-true}"
export NEXT_PUBLIC_BASE_PATH="$pages_base_path"

npm run build
touch out/.nojekyll
