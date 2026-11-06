// Deploy-only build (perf D7, contract C-7). The repository source stays buildless (ADR-1); .github/workflows/pages.yml
// runs this on the checked-out tree just before publishing, and deploys the source unchanged if it, or verify.mjs,
// fails. It edits files in place under the app root and keeps every path:
// - js/**/*.js, vendor/*.mjs and config.js: minified ES modules (no bundling, no renaming of files or imports),
//   each with an external source map (<file>.map) and a sourceMappingURL comment, so the shipped code stays
//   auditable against the repository;
// - css/app.css: minified, with a source map; modern colour functions (oklch) are kept as written;
// - content/**/*.json: whitespace removed (JSON.parse then JSON.stringify: the same values);
// - then content/manifest.json, release.json and the RELEASE line of sw.js are recomputed on the built bytes.
// sw.js, the HTML files and everything else are left as they are (the CSP meta in index.html is never touched).
// Usage: node tools/build/build.mjs [appRoot]      (default: the lucid/ directory this file is in)
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
    ? { loader: 'css', minify: true, supported: { 'color-functions': true }, legalComments: 'inline', sourcemap: 'external', sourcefile: basename(rel) }
    : { loader: 'js', format: 'esm', target: 'esnext', minify: true, legalComments: 'inline', sourcemap: 'external', sourcefile: basename(rel) };
  const out = await esbuild.transform(source, opts);
  const comment = loader === 'css' ? `/*# sourceMappingURL=${basename(rel)}.map */` : `//# sourceMappingURL=${basename(rel)}.map`;
  writeFileSync(path, `${out.code.replace(/\n+$/, '')}\n${comment}\n`);
  writeFileSync(`${path}.map`, out.map);
  return { before: Buffer.byteLength(source), after: statSync(path).size };
}

export async function build(root, { log = () => {} } = {}) {
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
  const m = buildManifest(root);
  log(`built ${t.js.length} modules, ${t.css.length} stylesheet, ${t.json.length} content files: ${Math.round(before / 1024)} KB -> ${Math.round(after / 1024)} KB raw; release ${m.release}`);
  return { ...t, release: m.release, before, after };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(process.argv[2] || join(here, '..', '..'));
  const t0 = Date.now();
  build(root, { log: (s) => console.log(`${s} (${relative(process.cwd(), root) || '.'}, ${Date.now() - t0} ms)`) }).catch((e) => { console.error(`build failed: ${e.message}`); process.exit(1); });
}
