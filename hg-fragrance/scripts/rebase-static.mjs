// Re-root a built Astro client folder under a sub-path (for GitHub Pages project sites).
// Usage: node rebase-static.mjs <dir> <base>   e.g. dist/client /desktop-tutorial/perfume
import fs from 'node:fs';
import path from 'node:path';

const [dir, baseArg, origin] = process.argv.slice(2);
const base = baseArg.replace(/\/$/, '');
const roots = ['fragrances', 'film', 'house', 'campaigns', 'bag', 'legal', 'media', 'fonts', '_astro', 'og-image.jpg', 'favicon.svg', 'api', 'checkout', 'sitemap-index.xml', 'sitemap-0.xml', 'robots.txt', '404'];
const rootAlt = roots.map((r) => r.replace(/\./g, '\\.')).join('|');
// a root-relative path right after a quote (also an HTML-escaped &quot; or &#34; inside JSON attributes), backtick, paren, comma-space (srcset) or "url("
const rel = new RegExp(`(&quot;|&#34;|["'\`(]|, )/(${rootAlt})(?=[/"'\`)?#\\s,&]|$)`, 'g');
// the bare home link: href="/"
const home = /(href=)(["'])\/\2/g;
// absolute URLs on the origin that miss the base (canonical, og:image, sitemap, JSON-LD)
const abs = origin ? new RegExp(`${origin.replace(/[.\/]/g, '\\$&')}/(?!${base.slice(1).replace(/\//g, '\\/')}(?:[/"'<]|$))`, 'g') : null;

let changed = 0;
const walk = (d) => {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(html|css|js|mjs|xml|txt|webmanifest|json)$/.test(f)) {
      const src = fs.readFileSync(p, 'utf8');
      const out = src.replace(rel, `$1${base}/$2`).replace(home, `$1$2${base}/$2`);
      const out2 = abs ? out.replace(abs, `${origin}${base}/`) : out;
      if (out2 !== src) {
        fs.writeFileSync(p, out2);
        changed++;
      }
    }
  }
};
walk(dir);
console.log(`rebased ${changed} files under ${base}`);
