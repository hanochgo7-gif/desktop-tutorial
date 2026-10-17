// Write the redirects from astro.config.mjs as static HTML files (for hosts without a server, e.g. GitHub Pages).
// Usage: node scripts/static-redirects.mjs <dir> <base>   e.g. dist/client /desktop-tutorial/perfume
import fs from 'node:fs';
import path from 'node:path';

const [dir, baseArg = ''] = process.argv.slice(2);
const base = baseArg.replace(/\/$/, '');
const src = fs.readFileSync(new URL('../astro.config.mjs', import.meta.url), 'utf8');
const block = src.match(/redirects:\s*{([^}]*)}/);
const pairs = block ? [...block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]) : [];

for (const [from, to] of pairs) {
  const target = `${base}${to}/`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>HG</title><meta name="robots" content="noindex"><link rel="canonical" href="${target}"><meta http-equiv="refresh" content="0;url=${target}"></head><body><a href="${target}">${target}</a></body></html>\n`;
  const out = path.join(dir, from, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}
console.log(`wrote ${pairs.length} redirect pages`);
