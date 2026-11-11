// Lists what still stands between Lucid and a public launch, as far as the repository shows it, and exits 1 while
// anything is left (docs/setup.md "Launch switch"). It finds:
// - placeholders on the public pages: a "to be filled in before launch" note (Hebrew or English) on any page;
// - no contact on privacy.html: no email address (mailto:) for privacy questions;
// - noindex on a page other than 404.html (kept on purpose while the contact is a placeholder);
// - NEW_HOME empty in config.js (Lucid's own address is not known yet, so nothing moves learners there).
// It decides nothing and changes nothing. CI runs it for information only (a red step there is expected until the
// owner's edits are in).
// Usage (from lucid/): node tools/launch-check.mjs [appRoot]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const APP = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PLACEHOLDER = /להשלמה לפני הפעלה ציבורית|To be filled in before (public )?launch|\bTODO\b|\bplaceholder\b/gi;

const text = (html) => html.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>|<!--[\s\S]*?-->/g, ' ');

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
