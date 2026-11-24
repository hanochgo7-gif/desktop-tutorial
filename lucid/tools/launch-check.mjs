// Lists what still stands between Lucid and a public launch, as far as the repository shows it, and exits 1 while
// anything is left (docs/setup.md "Launch switch"). It finds:
// - placeholders on the public pages: a "to be filled in before launch" note (Hebrew or English) on any page;
// - no contact on privacy.html: no email address (mailto:) for privacy questions; no email in js/core/contact.js,
//   the one source Help's "Contact" answer reads (tests/unit/contact.test.mjs keeps it and the pages in step);
// - noindex on a page other than 404.html (kept on purpose while the contact is a placeholder);
// - NEW_HOME empty in config.js (Lucid's own address is not known yet, so nothing moves learners there);
// - a host privacy.html does not name: with vercel.json in the app, the page must say, in Hebrew and in English,
//   that Vercel serves the site and receives the visitor's IP address (GitHub Pages too, for the earlier address).
// It decides nothing and changes nothing. CI runs it for information only (a red step there is expected until the
// owner's edits are in).
// Usage (from lucid/): node tools/launch-check.mjs [appRoot]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PLACEHOLDER = /להשלמה לפני הפעלה ציבורית|To be filled in before (public )?launch|\bTODO\b|\bplaceholder\b/gi;

const text = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');

// The hosts that serve this copy of the app: Vercel when vercel.json is there (the Vercel build keeps it), and
// GitHub Pages, which serves the earlier address from this repository either way.
export const hostsOf = (root) => [...(existsSync(join(root, 'vercel.json')) ? ['Vercel'] : []), 'GitHub Pages'];
// privacy.html names the host in its hosting line (data-hosting) in each language, with the IP address.
export function hostNamed(html, host) {
  const lines = [...html.matchAll(/<li data-hosting>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]));
  const he = lines.find((l) => /[א-ת]/.test(l));
  const en = lines.find((l) => !/[א-ת]/.test(l));
  return Boolean(he && en && he.includes(host) && en.includes(host) && /כתובת ה-IP/.test(he) && /IP address/.test(en));
}

export function launchItems(root = APP) {
  const items = [];
  const pages = readdirSync(root).filter((f) => f.endsWith('.html')).sort();
  for (const page of pages) {
    const html = readFileSync(join(root, page), 'utf8');
    const notes = text(html).match(PLACEHOLDER) || [];
    if (notes.length) items.push({ id: 'placeholder', file: page, text: `${notes.length} placeholder note(s) still on the page` });
    if (page !== '404.html' && /<meta name="robots" content="[^"]*noindex/i.test(html)) items.push({ id: 'noindex', file: page, text: 'noindex is still on (remove it once the contact is filled in)' });
  }
  const privacy = existsSync(join(root, 'privacy.html')) ? readFileSync(join(root, 'privacy.html'), 'utf8') : '';
  if (!/href="mailto:[^"@\s]+@[^"\s]+"/i.test(privacy)) items.push({ id: 'contact', file: 'privacy.html', text: 'no contact email (mailto:) for privacy questions' });
  if (privacy) for (const host of hostsOf(root)) if (!hostNamed(privacy, host)) items.push({ id: 'hosting', file: 'privacy.html', text: `does not say, in both languages, that ${host} serves the site and receives the visitor's IP address` });
  const contact = existsSync(join(root, 'js/core/contact.js')) ? readFileSync(join(root, 'js/core/contact.js'), 'utf8') : '';
  if (!/^\s*email: (['"])[^'"\s@]+@[^'"\s]+\1/m.test(contact)) items.push({ id: 'contact', file: 'js/core/contact.js', text: 'no contact email for Help\'s "Contact" answer' });
  const config = existsSync(join(root, 'config.js')) ? readFileSync(join(root, 'config.js'), 'utf8') : '';
  const home = config.match(/^export const NEW_HOME = (['"])(.*?)\1;/m);
  if (!home || !home[2].trim()) items.push({ id: 'new-home', file: 'config.js', text: 'NEW_HOME is empty: Lucid\'s own address is not set' });
  return items;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const items = launchItems(resolve(process.argv[2] || APP));
  if (!items.length) { console.log('launch-check: nothing left that this check can see. Read docs/setup.md "Launch switch" once more.'); process.exit(0); }
  console.log(`launch-check: ${items.length} item(s) left before launch (docs/setup.md "Launch switch"):`);
  for (const i of items) console.log(`  - [${i.id}] ${i.file}: ${i.text}`);
  process.exit(1);
}
