#!/usr/bin/env bash
#
# Content-hash cache-busting for versioned static assets.
#
# Rewrites mutable assets to a SHA256 query token. The shared docs stylesheet
# instead receives a SHA256 filename: this guarantees a new CDN cache key even
# when a proxy ignores query parameters. Run automatically in CI before deploy.
#
# Portable: Linux CI (sha256sum) + macOS local (shasum). Idempotent: same bytes
# → same hash → no diff. Add a new versioned asset by adding one line to `assets`.

set -euo pipefail
cd "$(dirname "$0")/.."

hash_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -c1-12
  else
    shasum -a 256 "$1" | cut -c1-12
  fi
}

# Single source of truth: every asset referenced as `<basename>?v=...` in HTML.
assets=(
  assets/css/home.css
  assets/js/home.js
  assets/js/docs-nav.js
  assets/js/theme.js
  assets/js/blog.js
  assets/downloads/hexclaw-product-intro.pdf
)

pairs=()
for a in "${assets[@]}"; do
  if [ ! -f "$a" ]; then
    echo "warn: missing asset $a — skipped" >&2
    continue
  fi
  b=$(basename "$a")
  h=$(hash_of "$a")
  pairs+=("$b=$h")
  echo "  $b -> ?v=$h"
done

# One perl pass over all HTML; quotemeta-safe substitution per asset.
export STAMP_PAIRS="${pairs[*]}"
docs_asset="assets/css/docs.css"
docs_hash=$(hash_of "$docs_asset")
docs_version="docs-${docs_hash}.css"
if [ "$docs_asset" != "assets/css/$docs_version" ]; then
  cp "$docs_asset" "assets/css/$docs_version"
fi
export DOCS_VERSION_NAME="$docs_version"

changelog_asset="assets/css/changelog.css"
changelog_hash=$(hash_of "$changelog_asset")
changelog_version="changelog-${changelog_hash}.css"
if [ "$changelog_asset" != "assets/css/$changelog_version" ]; then
  cp "$changelog_asset" "assets/css/$changelog_version"
fi
export CHANGELOG_VERSION_NAME="$changelog_version"

# 博客与文档同样使用文件名哈希，匹配站点已有的长期资源缓存策略。
blog_asset="assets/css/blog.css"
blog_hash=$(hash_of "$blog_asset")
blog_version="blog-${blog_hash}.css"
cp "$blog_asset" "assets/css/$blog_version"
export BLOG_VERSION_NAME="$blog_version"

find . -name '*.html' -not -path './.git/*' -print0 \
  | xargs -0 perl -pi -e '
      BEGIN {
        for my $p (split / /, $ENV{STAMP_PAIRS}) {
          my ($b, $h) = split /=/, $p, 2;
          push @::RULES, [$b, $h];
        }
      }
      for my $r (@::RULES) {
        my ($b, $h) = @$r;
        s/\Q$b\E\?v=[0-9A-Za-z]+/$b?v=$h/g;
      }
      s/docs(?:-[0-9a-f]{12})?\.css(?:\?v=[0-9A-Za-z]+)?/$ENV{DOCS_VERSION_NAME}/g;
      s/changelog(?:-[0-9a-f]{12})?\.css(?:\?v=[0-9A-Za-z]+)?/$ENV{CHANGELOG_VERSION_NAME}/g;
      s/blog(?:-[0-9a-f]{12})?\.css(?:\?v=[0-9A-Za-z]+)?/$ENV{BLOG_VERSION_NAME}/g;
    '

echo "cache-bust stamped across HTML."
