#!/usr/bin/env bash
# Builds a server-less copy of the site into out/ for static hosting (GitHub Pages).
# The studio and all public pages work fully; server features (accounts, AI tools, payments,
# development checkout) are left out and the pages say they're off.
#
#   BASE_PATH=/desktop-tutorial/dira SITE_URL=https://hanochgo7-gif.github.io/desktop-tutorial/dira bash scripts/build-static.sh
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_PATH="${BASE_PATH:-}"
SITE_URL="${SITE_URL:-http://localhost:3000}"
HOLD="$(mktemp -d)"

# Server-only parts can't be exported; set them aside and always put them back. The regular
# (server) build in .next is set aside too, so its route types survive this build.
restore() {
  rm -rf .next
  [ -d "$HOLD/next" ] && mv "$HOLD/next" .next
  [ -d "$HOLD/api" ] && mv "$HOLD/api" src/app/api
  [ -f "$HOLD/proxy.ts" ] && mv "$HOLD/proxy.ts" src/proxy.ts
  [ -d "$HOLD/pay" ] && mv "$HOLD/pay" "src/app/[lang]/(site)/pay"
  rm -rf "$HOLD"
}
trap restore EXIT
mv src/app/api "$HOLD/api"
mv src/proxy.ts "$HOLD/proxy.ts"
mv "src/app/[lang]/(site)/pay" "$HOLD/pay"
[ -d .next ] && mv .next "$HOLD/next"

rm -rf out
STATIC_EXPORT=1 NEXT_PUBLIC_STATIC=1 NEXT_PUBLIC_BASE_PATH="$BASE_PATH" NEXT_PUBLIC_SITE_URL="$SITE_URL" npx next build

# Entry page: send visitors to their language (saved choice, else browser language, else Hebrew).
cat > out/index.html <<HTML
<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>דירה מוכנה · Dira Ready</title>
<link rel="icon" href="$BASE_PATH/icon.svg">
<script>
  (function () {
    var m = document.cookie.match(/(?:^|; )lang=(he|en)/);
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    var lang = m ? m[1] : tz === "Asia/Jerusalem" || /^(he|iw)/i.test(navigator.language || "") ? "he" : /^en/i.test(navigator.language || "") ? "en" : "he";
    location.replace("$BASE_PATH/" + lang + "/" + location.search);
  })();
</script>
</head>
<body style="font-family:system-ui,sans-serif;padding:2rem">
<a href="$BASE_PATH/he/">דירה מוכנה — עברית</a> · <a href="$BASE_PATH/en/">Dira Ready — English</a>
</body>
</html>
HTML
touch out/.nojekyll
echo "Static site ready in out/ (base path: '${BASE_PATH:-/}')"
