#!/usr/bin/env python3
"""Builds Bar's site as a standalone package for his own hosting (Cloudflare Pages or Netlify).

    python3 bar-lifschitz/src/make_package.py --domain https://barlif.pages.dev

What goes in: the Hebrew and English pages, images/, media/ and the logo. What stays out: brief/ (the questionnaire),
kit/, options/, src/ and README.md.
- The addresses (canonical, og, hreflang) are switched to the new domain.
- GSAP and Lenis are served from vendor/ instead of a CDN. The bytes are checked against the sha384 recorded below,
  and the build stops on a mismatch.
- The output gets a _headers file with CSP (sha256 hashes of the inline scripts, no 'unsafe-inline' for scripts),
  frame-ancestors, Referrer-Policy, nosniff, Permissions-Policy and cache headers. Cloudflare Pages and Netlify both
  read it. It also gets robots.txt, sitemap.xml and 404.html.
"""
import argparse, base64, hashlib, re, shutil, sys, urllib.request, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
OLD = 'https://hanochgo7-gif.github.io/desktop-tutorial/bar-lifschitz/'
VENDOR = {  # CDN address -> (local name, sha384 checked on 17.11.2026, identical to the npm package)
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js':
        ('gsap-3.12.5.min.js', 'g4NTh/Iv5PPU4xPyhEWqPcwtNXOvdaDI8LLnyYfyNZOjKJeYQyjzQ9X5275eBjpt'),
    'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js':
        ('ScrollTrigger-3.12.5.min.js', 'Z3REaz79l2IaAZqJsSABtTbhjgOUYyV3p90XNnAPCSHg3EMTz1fouunq9WZRtj3d'),
    'https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js':
        ('lenis-1.1.14.min.js', 'O55L/6rhHr9CFvrxqv5luxOCcmVaBmETbZbJDP+Do8T0pztTACsFBD/IXCNkj7DV'),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--domain', required=True, help='e.g. https://barlif.pages.dev or https://barlif.co.il')
    ap.add_argument('--out', default=None)
    a = ap.parse_args()
    base = a.domain.rstrip('/') + '/'
    if not re.fullmatch(r'https://[a-z0-9.-]+/', base):
        sys.exit('domain must look like https://name.example')
    out = Path(a.out) if a.out else HERE.parent / 'dist' / 'barlif-site'
    if out.exists():
        shutil.rmtree(out)
    (out / 'en').mkdir(parents=True)
    (out / 'brand').mkdir()
    (out / 'vendor').mkdir()
    shutil.copytree(HERE / 'images', out / 'images')
    shutil.copytree(HERE / 'media', out / 'media')
    for f in ('favicon.svg', 'barlif.svg'):
        shutil.copy2(HERE / 'brand' / f, out / 'brand' / f)

    for url, (name, want) in VENDOR.items():
        data = urllib.request.urlopen(url, timeout=30).read()
        got = base64.b64encode(hashlib.sha384(data).digest()).decode()
        if got != want:
            sys.exit(f'STOP: {url} changed (sha384 {got}), check it before shipping')
        (out / 'vendor' / name).write_bytes(data)

    hashes = set()
    for rel in ('index.html', 'en/index.html'):
        html = (HERE / rel).read_text(encoding='utf-8')
        html = html.replace(OLD, base)
        up = '../' if rel.startswith('en/') else ''
        for url, (name, _) in VENDOR.items():
            html = html.replace(f'src="{url}"', f'src="{up}vendor/{name}"')
        html = re.sub(r'<link rel="preconnect" href="https://(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)"[^>]*>\n?', '', html)
        if 'hanochgo7' in html or 'cdnjs' in html or 'jsdelivr' in html:
            sys.exit(f'STOP: an old address is left in {rel}')
        for body in re.findall(r'<script>(.*?)</script>', html, flags=re.S):
            hashes.add(base64.b64encode(hashlib.sha256(body.encode('utf-8')).digest()).decode())
        (out / rel).write_text(html, encoding='utf-8')

    csp = '; '.join([
        "default-src 'self'",
        "script-src 'self' " + ' '.join(f"'sha256-{h}'" for h in sorted(hashes)),
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        "img-src 'self' data:",
        "media-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'none'",
        "object-src 'none'",
        "upgrade-insecure-requests",
    ])
    (out / '_headers').write_text(f"""/*
  Content-Security-Policy: {csp}
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  X-Frame-Options: DENY

/images/*
  Cache-Control: public, max-age=2592000
/media/*
  Cache-Control: public, max-age=2592000
/vendor/*
  Cache-Control: public, max-age=31536000, immutable
""", encoding='utf-8')
    (out / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n', encoding='utf-8')
    (out / 'sitemap.xml').write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url><loc>{base}</loc><xhtml:link rel="alternate" hreflang="he" href="{base}"/><xhtml:link rel="alternate" hreflang="en" href="{base}en/"/></url>
  <url><loc>{base}en/</loc><xhtml:link rel="alternate" hreflang="he" href="{base}"/><xhtml:link rel="alternate" hreflang="en" href="{base}en/"/></url>
</urlset>
""", encoding='utf-8')
    (out / '404.html').write_text("""<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>הדף לא נמצא | בר ליפשיץ</title><meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#2b1219;color:#f3f2ec;font:18px/1.6 system-ui,sans-serif;text-align:center}a{color:#e7a3ad}</style></head>
<body><main><h1>הדף לא נמצא</h1><p><a href="/">לעמוד הבית</a> · <a href="/en/">English</a></p></main></body></html>
""", encoding='utf-8')

    z = out.with_suffix('.zip')
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(out.rglob('*')):
            if f.is_file():
                zf.write(f, f.relative_to(out))
    size = sum(f.stat().st_size for f in out.rglob('*') if f.is_file())
    print(f'built {out} ({size / 1e6:.1f}MB), {len(hashes)} inline script hashes, zip {z} ({z.stat().st_size / 1e6:.1f}MB)')


if __name__ == '__main__':
    main()
