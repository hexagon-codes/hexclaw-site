#!/usr/bin/env bash
#
# Content-hash cache-busting for versioned static assets.
#
# Rewrites every `<asset>?v=<token>` reference across all HTML files to
# `?v=<sha256-prefix>` of that asset's *current bytes*. Run automatically in CI
# before each deploy, so the cache-buster changes exactly when — and only when —
# an asset changes. No human ever bumps `?v=` by hand again, and unchanged assets
# keep their warm 1-year immutable cache.
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
  assets/css/docs.css
  assets/js/docs-nav.js
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
    '

echo "cache-bust stamped across HTML."
