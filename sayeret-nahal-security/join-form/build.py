#!/usr/bin/env python3
"""Build sayeret-nahal/join/index.html from src.html.

Run after any change to src.html (including setting ENDPOINT):
    python3 sayeret-nahal-security/join-form/build.py
It recomputes the script hash and opens connect-src only to the ENDPOINT's origin.
"""
import base64, hashlib, pathlib, re, urllib.parse

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent
src = (HERE / "src.html").read_text(encoding="utf-8")

m = re.search(r'const ENDPOINT="([^"]*)"', src)
endpoint = m.group(1) if m else ""
if endpoint:
    u = urllib.parse.urlparse(endpoint)
    assert u.scheme == "https" and u.netloc, "ENDPOINT must be an https:// URL"
    connect = f"{u.scheme}://{u.netloc}"
else:
    connect = "'none'"

scripts = re.findall(r"<script>(.*?)</script>", src, re.S)
hashes = " ".join(
    "'sha256-" + base64.b64encode(hashlib.sha256(s.encode("utf-8")).digest()).decode() + "'" for s in scripts
)
csp = (
    "default-src 'none'; "
    f"script-src {hashes}; "
    "style-src 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src https://fonts.gstatic.com; "
    "img-src data: blob:; "
    f"connect-src {connect}; "
    "base-uri 'none'; form-action 'none'; object-src 'none'; frame-src 'none'; upgrade-insecure-requests"
)

head = f"""<!doctype html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{csp}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#E7EADF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#11150E" media="(prefers-color-scheme: dark)">
<title>מצטרפים למעגל | בוגרי סיירת נח״ל</title>
<meta name="description" content="טופס הצטרפות לקהילת בוגרי סיירת נח״ל. 3 דקות.">
<style>*,*::before,*::after{{box-sizing:border-box}}body{{margin:0}}img{{max-width:100%}}</style>
"""
body = src.replace("<style>", "<style>", 1)
# everything up to the first <div class="app"> is head material (font link + style)
i = body.index('<div class="app">')
out = head + body[:i] + "</head>\n<body>\n" + body[i:] + "\n</body>\n</html>\n"

dst = ROOT / "sayeret-nahal" / "join" / "index.html"
dst.parent.mkdir(parents=True, exist_ok=True)
dst.write_text(out, encoding="utf-8")
print(f"wrote {dst.relative_to(ROOT)}  endpoint={'(not set)' if not endpoint else connect}")
