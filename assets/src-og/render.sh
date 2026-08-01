#!/usr/bin/env bash
# Render assets/og.jpg — the WhatsApp/LinkedIn link-preview card — from og.html.
#
#   ./render.sh
#
# og.jpg is build output: edit og.html and re-run, never touch the jpg. Keep the
# result under ~300 KB or WhatsApp silently skips fetching the preview.
set -euo pipefail

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[ -x "$CHROME" ] || { echo "Chrome not found at $CHROME" >&2; exit 1; }

SRC="$(cd "$(dirname "$0")" && pwd)"
OUT="$(dirname "$SRC")"
TMP="$SRC/.og.png"

# --allow-file-access-from-files lets the page pull in ../src-svg/hero-carpool.svg
"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --allow-file-access-from-files \
  --screenshot="$TMP" "file://$SRC/og.html" 2>/dev/null

sips -s format jpeg -s formatOptions 82 "$TMP" --out "$OUT/og.jpg" >/dev/null
rm -f "$TMP"

printf "  og.jpg  1200x630  %s\n" "$(du -h "$OUT/og.jpg" | cut -f1)"
