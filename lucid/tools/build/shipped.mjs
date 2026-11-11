// What Lucid ships: the files a visitor's browser may ask for. Everything else under lucid/ (docs, tests, tools, the
// Supabase backend, notes, package files) stays in the repository. Used by vercel-build.mjs to copy the app into
// dist/ and by verify.mjs --shipped to check that tree.
// - every .html page at the app root (index.html, privacy.html, 404.html and any page added later);
// - the root files below, when they exist;
// - everything under the directories below, except dotfiles.
// tests/unit/vercel.test.mjs checks that this covers every file release.json and the offline list name.
import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const SHIPPED_DIRS = ['assets', 'content', 'css', 'fonts', 'js', 'vendor'];
export const SHIPPED_ROOT_FILES = ['config.js', 'manifest.webmanifest', 'release.json', 'sw.js', 'favicon.ico'];
// Never published, whatever the rules above say (a guard for a later edit of them).
export const NEVER = [/^docs\//, /^tests\//, /^tools\//, /^supabase\//, /^node_modules\//, /(^|\/)\./, /^[^/]+\.md$/, /^package(-lock)?\.json$/, /^vercel\.json$/, /^dist\//];

export function isShipped(rel) {
  const p = rel.split('\\').join('/');
  if (NEVER.some((re) => re.test(p))) return false;
  // The build's source maps are shipped on purpose (the shipped code stays auditable): config.js.map at the root.
  if (!p.includes('/')) return /\.html$/.test(p) || SHIPPED_ROOT_FILES.includes(p) || (p.endsWith('.js.map') && SHIPPED_ROOT_FILES.includes(p.slice(0, -4)));
  return SHIPPED_DIRS.includes(p.split('/')[0]);
}

const walk = (root, dir) => readdirSync(join(root, dir), { withFileTypes: true })
  .filter((d) => !d.name.startsWith('.'))
  .flatMap((d) => (d.isDirectory() ? walk(root, `${dir}/${d.name}`) : [`${dir}/${d.name}`]));

// The shipped files of the app at root, sorted, as app-relative posix paths.
export function shippedFiles(root) {
  const top = readdirSync(root).filter((f) => statSync(join(root, f)).isFile() && isShipped(f));
  const dirs = SHIPPED_DIRS.filter((d) => existsSync(join(root, d))).flatMap((d) => walk(root, d));
  return [...top, ...dirs].filter(isShipped).sort();
}
