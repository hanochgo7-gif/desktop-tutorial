# CSP בלי 'unsafe-inline' לסקריפטים: מחשב טביעה (sha256) לכל סקריפט מוטמע בעמודים שעולים לאתר, וכותב את המדיניות ל-vercel.json.
# מריצים אחרי כל שינוי בסקריפט מוטמע (וגם אחרי blog.py / seo_pages.py / legal.py, ליתר ביטחון):  python3 tools/csp.py
# --check: רק בודק שהטביעות ב-vercel.json מעודכנות (יוצא עם שגיאה אם לא). ממצא R-13 בביקורת FORTRESS.
import re, glob, hashlib, base64, json, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ('tools/', 'marketing/', 'node_modules/')
GOOGLE_SCRIPT = ['https://www.googletagmanager.com', 'https://www.google-analytics.com', 'https://www.googleadservices.com',
                 'https://googleads.g.doubleclick.net', 'https://*.googlesyndication.com', 'https://tagmanager.google.com']
# לאן הדפדפן מורשה לשלוח בקשות: האתר עצמו, מסד הפניות (Supabase), וכתובות המדידה של Google בלבד
CONNECT = ["'self'", 'https://ewddzunakbaxtonysgrd.supabase.co', 'https://*.google-analytics.com', 'https://*.analytics.google.com',
           'https://*.googletagmanager.com', 'https://stats.g.doubleclick.net', 'https://*.doubleclick.net', 'https://www.google.com',
           'https://www.google.co.il', 'https://pagead2.googlesyndication.com', 'https://www.googleadservices.com']

def hashes():
    out = set()
    for f in glob.glob(os.path.join(ROOT, '**/*.html'), recursive=True):
        rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
        if rel.startswith(SKIP): continue
        t = open(f, encoding='utf-8').read()
        for m in re.finditer(r'<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>', t, re.S):
            if 'application/ld+json' in m.group(1): continue
            out.add("'sha256-" + base64.b64encode(hashlib.sha256(m.group(2).encode('utf-8')).digest()).decode() + "'")
    return sorted(out)

def policy(frame_ancestors, h):
    return '; '.join([
        "default-src 'self'", "base-uri 'self'", "object-src 'none'", 'frame-ancestors ' + frame_ancestors, "frame-src 'self'",
        "script-src 'self' " + ' '.join(h + GOOGLE_SCRIPT),
        "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https:", "font-src 'self' data:", "media-src 'self' blob:",
        'connect-src ' + ' '.join(CONNECT + ['blob:']), "form-action 'self' https://wa.me https://api.whatsapp.com",
        "manifest-src 'self'", "worker-src 'self' blob:", 'upgrade-insecure-requests'])

def main():
    p = os.path.join(ROOT, 'vercel.json'); cfg = json.load(open(p, encoding='utf-8'))
    h = hashes(); changed = False
    for block in cfg['headers']:
        for hd in block['headers']:
            if hd['key'] != 'Content-Security-Policy': continue
            fa = "'self'" if block['source'].startswith('/sim/') else "'none'"
            new = policy(fa, h)
            if hd['value'] != new: hd['value'] = new; changed = True
    if '--check' in sys.argv:
        print('CSP up to date' if not changed else 'CSP OUT OF DATE: run python3 tools/csp.py'); sys.exit(1 if changed else 0)
    if changed: json.dump(cfg, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=2); open(p, 'a').write('\n')
    print(len(h), 'inline script hashes;', 'vercel.json updated' if changed else 'no change')

if __name__ == '__main__': main()
