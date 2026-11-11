// The Vercel build (LB-01, docs/setup.md "Launch switch"). Vercel runs it with lucid/ as the project root
// (vercel.json: buildCommand) and publishes dist/. It:
// 1. copies only the files Lucid ships (tools/build/shipped.mjs) into dist/: no docs, tests, tools, Supabase backend,
//    notes or package files, and fails if a file release.json or the offline list names is not among them;
// 2. once NEW_HOME is set in config.js: puts the canonical link and og:url in dist/index.html (at the marker
//    comment), makes the share image's address absolute, and writes sitemap.xml (only pages without noindex);
//    robots.txt is always written;
// 3. runs build.mjs on dist/ (minified modules with source maps, release files recomputed on the built bytes);
// 4. runs verify.mjs on dist/ against the source tree (--source: Vercel's checkout has no .git) with --shipped,
//    and checks again that nothing internal is in dist/.
// Any error fails the build, so Vercel keeps the last good deployment. There is no fallback to the source here.
// Usage (from lucid/): node tools/build/vercel-build.mjs [--out <dir>]   (default: dist)
import { rmSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { shippedFiles, isShipped } from './shipped.mjs';
import { build } from './build.mjs';
import { verify } from './verify.mjs';
import { computeManifest } from '../build-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
export const APP = resolve(here, '..', '..');
export const CANONICAL_MARK = '<!-- canonical: tools/build/vercel-build.mjs puts the canonical link and og:url here once NEW_HOME is set in config.js -->';
export const SHARE_IMAGE = 'assets/og-image.png';

const all = (root, dir = '') => readdirSync(join(root, dir), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? all(root, `${dir}${d.name}/`) : [`${dir}${d.name}`]));

// NEW_HOME from the source's config.js: '' or an https address ending in '/'. Anything else fails the build.
let loads = 0;
export async function newHomeOf(root) {
  const mod = await import(`${pathToFileURL(join(root, 'config.js')).href}?load=${++loads}`); // never a cached copy
  const home = typeof mod.NEW_HOME === 'string' ? mod.NEW_HOME.trim() : '';
  if (!home) return '';
  let u;
  try { u = new URL(home); } catch { throw new Error(`config.js: NEW_HOME is not an address: ${home}`); }
  if (u.protocol !== 'https:') throw new Error(`config.js: NEW_HOME must start with https:// (${home})`);
  if (/(^|\.)github\.io$/i.test(u.hostname)) throw new Error('config.js: NEW_HOME is the old, shared github.io origin; it must be Lucid\'s own address');
  if (!home.endsWith('/') || u.search || u.hash) throw new Error(`config.js: NEW_HOME must end with "/" and have no query or #: ${home}`);
  return u.href;
}

const noindex = (html) => /<meta name="robots" content="[^"]*noindex/i.test(html);

// Step 2, on the copied tree. Returns the files it wrote or changed.
export function personalise(out, newHome) {
  const changed = [];
  const pages = readdirSync(out).filter((f) => f.endsWith('.html') && f !== '404.html').sort();
  if (newHome) {
    const index = join(out, 'index.html');
    let page = readFileSync(index, 'utf8');
    if (page.split(CANONICAL_MARK).length !== 2) throw new Error('index.html: the canonical marker comment is missing or repeated');
    page = page.replace(CANONICAL_MARK, `<link rel="canonical" href="${newHome}">\n<meta property="og:url" content="${newHome}">`);
    page = page.replaceAll(`content="${SHARE_IMAGE}"`, `content="${new URL(SHARE_IMAGE, newHome).href}"`);
    writeFileSync(index, page);
    changed.push('index.html');
    const listed = pages.filter((p) => !noindex(readFileSync(join(out, p), 'utf8')));
    if (listed.length) {
      const loc = (p) => (p === 'index.html' ? newHome : new URL(p, newHome).href);
      writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${listed.map((p) => `  <url><loc>${loc(p)}</loc></url>`).join('\n')}\n</urlset>\n`);
      changed.push('sitemap.xml');
    }
  }
  const sitemap = existsSync(join(out, 'sitemap.xml'));
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\n${sitemap ? `Sitemap: ${new URL('sitemap.xml', newHome).href}\n` : ''}`);
  changed.push('robots.txt');
  return changed;
}

// What must never be in dist/, as problems.
export function distProblems(out) {
  const extra = new Set(['robots.txt', 'sitemap.xml']);
  return all(out).filter((p) => !extra.has(p) && !isShipped(p)).map((p) => `${p}: not a shipped file`);
}

export async function vercelBuild({ root = APP, out = join(root, 'dist'), log = () => {} } = {}) {
  const files = shippedFiles(root);
  // Everything the worker and its integrity check need must be shipped.
  const release = JSON.parse(readFileSync(join(root, 'release.json'), 'utf8'));
  const { manifest } = computeManifest(root);
  const needed = [...Object.keys(release.hashes), ...manifest.offline, 'index.html', 'release.json', 'sw.js', '404.html'];
  const missing = [...new Set(needed)].filter((p) => !files.includes(p));
  if (missing.length) throw new Error(`not shipped but needed: ${missing.slice(0, 10).join(', ')}`);
  const home = await newHomeOf(root);
  rmSync(out, { recursive: true, force: true });
  for (const rel of files) {
    mkdirSync(dirname(join(out, rel)), { recursive: true });
    copyFileSync(join(root, rel), join(out, rel));
  }
  const personal = personalise(out, home);
  const built = await build(out, { log });
  const { problems } = await verify(out, { sourceDir: root, shipped: true });
  problems.push(...distProblems(out));
  if (problems.length) throw new Error(`verify: ${problems.length} problem(s)\n  ${problems.slice(0, 40).join('\n  ')}`);
  log(`dist: ${files.length} files copied, ${personal.join(', ')} written, release ${built.release}${home ? `, canonical ${home}` : ', NEW_HOME empty (no canonical yet)'}`);
  return { files, release: built.release, home, personal };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--out');
  const out = resolve(i < 0 ? join(APP, 'dist') : args[i + 1]);
  const t0 = Date.now();
  vercelBuild({ out, log: (s) => console.log(s) })
    .then(() => console.log(`vercel-build: ok (${relative(process.cwd(), out) || '.'}, ${Date.now() - t0} ms)`))
    .catch((e) => { console.error(`vercel-build failed: ${e.message}`); process.exit(1); });
}
