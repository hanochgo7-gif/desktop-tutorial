// Deploy-only build (perf D7, contract C-7). The repository source stays buildless (ADR-1); .github/workflows/pages.yml
// runs this on the checked-out tree just before publishing, and deploys the source unchanged if it, or verify.mjs,
// fails. It edits files in place under the app root and keeps every path:
// - js/**/*.js, vendor/*.mjs and config.js: minified ES modules (no bundling, no renaming of files or imports),
//   each with an external source map (<file>.map) and a sourceMappingURL comment, so the shipped code stays
//   auditable against the repository;
// - css/app.css: comments and whitespace removed, with a source map. Syntax minification is off on purpose: it
//   rewrites some oklch() colours as hex with a rounded alpha (oklch(1 0 0 / 0.07) -> #ffffff12), which changed
//   pixels, for 46 bytes gzipped;
// - content/**/*.json: whitespace removed (JSON.parse then JSON.stringify: the same values);
// - then content/manifest.json, release.json and the RELEASE line of sw.js are recomputed on the built bytes.
// sw.js, the HTML files and everything else are left as they are (the CSP meta in index.html is never touched).
// Usage: node tools/build/build.mjs [appRoot] [--inline-css]   (default root: the lucid/ directory this file is in)
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { buildManifest } from '../build-manifest.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const esbuild = createRequire(join(here, 'package.json'))('esbuild');
export const ESBUILD_VERSION = '0.25.10';

const walk = (root, dir, test) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir), { withFileTypes: true })
  .flatMap((d) => (d.isDirectory() ? walk(root, `${dir}/${d.name}`, test) : test(d.name) ? [`${dir}/${d.name}`] : [])) : []);

// The files build() changes, by kind.
export function targets(root) {
  return {
    js: [...walk(root, 'js', (n) => n.endsWith('.js')), ...walk(root, 'vendor', (n) => n.endsWith('.mjs')), ...(existsSync(join(root, 'config.js')) ? ['config.js'] : [])].sort(),
    css: existsSync(join(root, 'css/app.css')) ? ['css/app.css'] : [],
    json: walk(root, 'content', (n) => n.endsWith('.json')).sort(),
  };
}

async function minify(root, rel, loader) {
  const path = join(root, rel);
  const source = readFileSync(path, 'utf8');
  const opts = loader === 'css'
    ? { loader: 'css', minifyWhitespace: true, legalComments: 'inline', sourcemap: 'external', sourcefile: basename(rel) }
    : { loader: 'js', format: 'esm', target: 'esnext', minify: true, legalComments: 'inline', sourcemap: 'external', sourcefile: basename(rel) };
  const out = await esbuild.transform(source, opts);
  const comment = loader === 'css' ? `/*# sourceMappingURL=${basename(rel)}.map */` : `//# sourceMappingURL=${basename(rel)}.map`;
  writeFileSync(path, `${out.code.replace(/\n+$/, '')}\n${comment}\n`);
  writeFileSync(`${path}.map`, out.map);
  return { before: Buffer.byteLength(source), after: statSync(path).size };
}

// perf D9 (gated, off unless --inline-css): replaces exactly one tag in index.html,
// <link rel="stylesheet" href="css/app.css">, wherever it is, with a <style> of the built CSS (font URLs rewritten
// from ../fonts/ to fonts/). Does nothing when the tag is absent or appears more than once. css/app.css stays
// (privacy.html links it). Allowed by the CSP's style-src 'unsafe-inline'; the CSP meta is not touched.
export const CSS_TAG = '<link rel="stylesheet" href="css/app.css">';
export function inlineCss(root) {
  const index = join(root, 'index.html');
  if (!existsSync(index) || !existsSync(join(root, 'css/app.css'))) return false;
  const page = readFileSync(index, 'utf8');
  if (page.split(CSS_TAG).length !== 2) return false;
  const css = readFileSync(join(root, 'css/app.css'), 'utf8')
    .replace(/\/\*# sourceMappingURL=[^*]*\*\/\s*$/, '')
    .replace(/url\((["']?)\.\.\/fonts\//g, 'url($1fonts/')
    .trim();
  if (/<\/style/i.test(css)) throw new Error('css/app.css contains </style');
  writeFileSync(index, page.replace(CSS_TAG, () => `<style>${css}</style>`));
  return true;
}

export async function build(root, { log = () => {}, inline = false } = {}) {
  if (esbuild.version !== ESBUILD_VERSION) throw new Error(`esbuild ${esbuild.version}, expected ${ESBUILD_VERSION} (npm ci --prefix tools/build)`);
  if (existsSync(join(root, 'js/app.js')) && /sourceMappingURL=/.test(readFileSync(join(root, 'js/app.js'), 'utf8'))) throw new Error('already built');
  const t = targets(root);
  let before = 0; let after = 0;
  for (const rel of t.js) { const s = await minify(root, rel, 'js'); before += s.before; after += s.after; }
  for (const rel of t.css) { const s = await minify(root, rel, 'css'); before += s.before; after += s.after; }
  for (const rel of t.json) {
    const path = join(root, rel);
    const text = readFileSync(path, 'utf8');
    const compact = `${JSON.stringify(JSON.parse(text))}\n`;
    before += Buffer.byteLength(text); after += Buffer.byteLength(compact);
    writeFileSync(path, compact);
  }
  const inlined = inline ? inlineCss(root) : false;
  const m = buildManifest(root);
  log(`${inlined ? 'css inlined into index.html; ' : ''}built ${t.js.length} modules, ${t.css.length} stylesheet, ${t.json.length} content files: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB raw; release ${m.release}`);
  return { ...t, release: m.release, before, after, inlined };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const root = resolve(args.find((a) => !a.startsWith('--')) || join(here, '..', '..'));
  const t0 = Date.now();
  build(root, { inline: args.includes('--inline-css'), log: (s) => console.log(`${s} (${relative(process.cwd(), root) || '.'}, ${Date.now() - t0} ms)`) }).catch((e) => { console.error(`build failed: ${e.message}`); process.exit(1); });
}
