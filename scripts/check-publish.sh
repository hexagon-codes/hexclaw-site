#!/usr/bin/env bash
# 在隔离目录检查实际提交，避免未提交素材掩盖待发布版本的问题。
set -euo pipefail
cd "$(dirname "$0")/.."

if [ "$#" -gt 1 ]; then
  echo "Usage: bash scripts/check-publish.sh [commit]" >&2
  exit 2
fi

commit=$(git rev-parse --verify "${1:-HEAD}^{commit}")
snapshot=$(mktemp -d "${TMPDIR:-/tmp}/hexclaw-site-publish.XXXXXX")
trap 'node -e '\''require("node:fs").rmSync(process.argv[1], { recursive: true, force: true })'\'' "$snapshot"' EXIT

git archive "$commit" | tar -x -C "$snapshot"
echo "Checking committed site: $commit"
cd "$snapshot"
node --test scripts/*.test.mjs
