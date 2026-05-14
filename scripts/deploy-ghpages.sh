#!/usr/bin/env bash
# Deploy out/ to the gh-pages branch as a clean orphan commit.
#
# The `gh-pages` npm package leaves contamination (.gitignore, public/,
# components/, font/ from when GitHub auto-created gh-pages off main) because
# its "clean" step only removes files it's about to replace, not everything.
# This script blows out/.git away and force-pushes a single-commit orphan
# branch with exactly the built site and nothing else.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"
REMOTE_URL="$(git -C "$ROOT" remote get-url origin)"

if [ ! -d "$ROOT/out" ]; then
  echo "out/ not found — run \`pnpm build\` first" >&2
  exit 1
fi

cd "$ROOT/out"
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email=deploy@etglobal -c user.name=deploy commit -q -m "deploy: $SHA"
git remote add origin "$REMOTE_URL"
git push -f origin gh-pages
echo "Deployed $SHA to gh-pages → https://robblack21.github.io/etglobal/"
