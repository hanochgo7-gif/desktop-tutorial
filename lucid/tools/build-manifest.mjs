// Writes the release files (contract C-5):
// - content/manifest.json: which lesson files exist, a content version, and the files the service worker
//   precaches for offline use (`offline`). Its shape stays {version, lessons, offline}: the page reads it at boot.
// - release.json (app root): {release, hashes}. hashes = a 128-bit sha256 prefix (HASH_LEN hex digits) of every
//   file the worker precaches (SHELL in sw.js plus `offline`), every lesson file, the centre and pool files when they
//   exist, the full files the index files replace (fetched when an index file cannot be loaded) and every font.
//   release = a hash of all of them plus sw.js with its RELEASE line blanked, so any change to a byte the worker
//   can serve from its cache, or to the worker's own logic, gives a new release (and a new cache).
// - the RELEASE line of sw.js, set to that release, and its LISTING line, set to the full SHA-256 of the hash list
//   ("<path> <hash>\n" per file, in release.json's order): the worker checks release.json against it, so a copy of
//   release.json in Cache Storage cannot be swapped for another (docs/qa/security-review.md 5a).
// Run `node tools/build-manifest.mjs` after changing any file the app ships; tests/unit/offline-manifest.test.mjs
// fails while the three are stale. The deploy build (tools/build/build.mjs) calls buildManifest(root) again on
// the minified bytes.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Per-file hashes: 128-bit SHA-256 prefixes, so a forged file cannot be made to match one (security review 5a). The
// release name is a cache name, not a check: it stays 12 characters.
export const HASH_LEN = 32;
export const RELEASE_LEN = 12;
export const RELEASE_LINE = /^const RELEASE = '[^'\n]*';$/m;
export const LISTING_LINE = /^const LISTING = '[^'\n]*';$/m;
const sha = (algo, buf) => createHash(algo).update(buf).digest('hex');
export const fileHash = (buf) => sha('sha256', buf).slice(0, HASH_LEN);

// The worker's SHELL list, read from sw.js so there is one source of truth.
export function shellOf(swSource) {
  const m = swSource.match(/const SHELL = (\[[^\]]*\]);/);
  if (!m) throw new Error('sw.js: SHELL list not found');
  return JSON.parse(m[1].replace(/'/g, '"'));
}
// './' is index.html; release.json is written here and cannot hash itself.
const shellFile = (p) => (p === './' ? 'index.html' : p);

// Content files the app fetches. An index file (contract C-2) replaces the big source file in the offline list.
const SPLIT = [
  ['real-life/index.json', 'real-life/scenario', ['real-life/scenarios.json']],
  ['writing/index.json', 'writing/task', ['writing/exercises.json', 'writing/assignments.json']],
];
const RUNTIME_ONLY = ['content/centers/', 'content/pool/']; // cached on first use, never precached

export function computeManifest(root) {
  const content = join(root, 'content');
  const listJson = (dir) => (existsSync(join(content, dir)) ? readdirSync(join(content, dir)).filter((f) => f.endsWith('.json')).sort().map((f) => `${dir}/${f}`) : []);
  const lessons = listJson('lessons').map((f) => f.slice('lessons/'.length, -'.json'.length));
  const base = ['taxonomy.json', 'curriculum.json', 'placement.json', 'pictures.json', 'real-life/scenarios.json', 'real-life/slang.json', 'writing/exercises.json', 'writing/assignments.json', 'writing/rubric.json'];
  const split = SPLIT.flatMap(([index, dir]) => (existsSync(join(content, index)) ? [index, ...listJson(dir)] : []));
  const files = [...base, ...split, ...lessons.map((l) => `lessons/${l}.json`)].filter((f) => existsSync(join(content, f)));
  const version = createHash('sha1');
  for (const f of files) version.update(readFileSync(join(content, f)));
  // Everything the app needs offline except lessons (about 3 MB, saved on request from Settings) and the centre
  // and pool files: every module the router can lazy-load, and the non-lesson content.
  const replaced = new Set(SPLIT.flatMap(([index, , old]) => (existsSync(join(content, index)) ? old : [])));
  const walk = (dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.m?js$/.test(d.name) ? [`${dir}/${d.name}`] : [])) : []);
  const offline = [...walk('js'), ...walk('vendor'), ...files.filter((f) => !f.startsWith('lessons/') && !replaced.has(f)).map((f) => `content/${f}`), 'privacy.html']
    .filter((f) => !RUNTIME_ONLY.some((p) => f.startsWith(p))).sort();
  const manifest = { version: version.digest('hex').slice(0, 12), lessons, offline };
  return { manifest, manifestText: `${JSON.stringify(manifest, null, 1)}\n` };
}

// Every file the worker may serve from its release cache, with its hash. `manifestText` is hashed as it will be
// written, so the release does not depend on whether the old manifest on disk was stale.
export function computeRelease(root, manifestText = computeManifest(root).manifestText) {
  const swSource = readFileSync(join(root, 'sw.js'), 'utf8');
  if (!RELEASE_LINE.test(swSource)) throw new Error("sw.js: no line of the form const RELEASE = '…';");
  if (!LISTING_LINE.test(swSource)) throw new Error("sw.js: no line of the form const LISTING = '…';");
  const manifest = JSON.parse(manifestText);
  const runtime = RUNTIME_ONLY.flatMap((p) => (existsSync(join(root, p)) ? readdirSync(join(root, p)).filter((f) => f.endsWith('.json')).map((f) => `${p}${f}`) : []));
  const fonts = existsSync(join(root, 'fonts')) ? readdirSync(join(root, 'fonts')).filter((f) => f.endsWith('.woff2')).map((f) => `fonts/${f}`) : [];
  const replaced = SPLIT.flatMap(([, , old]) => old.map((f) => `content/${f}`)).filter((f) => existsSync(join(root, f)));
  const paths = new Set([...shellOf(swSource).map(shellFile), ...manifest.offline, ...manifest.lessons.map((l) => `content/lessons/${l}.json`), ...runtime, ...replaced, ...fonts]);
  paths.delete('release.json');
  const hashes = {};
  for (const p of [...paths].sort()) {
    hashes[p] = fileHash(p === 'content/manifest.json' ? Buffer.from(manifestText) : readFileSync(join(root, p)));
  }
  const listing = Object.entries(hashes).map(([p, h]) => `${p} ${h}\n`).join('');
  const withListing = swSource.replace(LISTING_LINE, `const LISTING = '${sha('sha256', listing)}';`);
  const normalised = withListing.replace(RELEASE_LINE, "const RELEASE = '';");
  const all = createHash('sha256');
  all.update(listing);
  all.update(normalised);
  const release = all.digest('hex').slice(0, RELEASE_LEN);
  return {
    release,
    hashes,
    releaseText: `${JSON.stringify({ release, hashes }, null, 0)}\n`,
    swText: withListing.replace(RELEASE_LINE, `const RELEASE = '${release}';`),
  };
}

// Computes the three files for the app at root; writes them unless write is false. Returns what it computed and
// whether anything on disk was stale.
export function buildManifest(root, { write = true } = {}) {
  const { manifest, manifestText } = computeManifest(root);
  const rel = computeRelease(root, manifestText);
  const targets = [['content/manifest.json', manifestText], ['release.json', rel.releaseText], ['sw.js', rel.swText]];
  const stale = targets.filter(([p, text]) => !existsSync(join(root, p)) || readFileSync(join(root, p), 'utf8') !== text).map(([p]) => p);
  if (write) for (const [p, text] of targets) if (stale.includes(p)) writeFileSync(join(root, p), text);
  return { manifest, release: rel.release, hashes: rel.hashes, stale };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(process.argv[2] || join(dirname(fileURLToPath(import.meta.url)), '..'));
  const r = buildManifest(root);
  console.log(`manifest: ${r.manifest.lessons.length} lessons, ${r.manifest.offline.length} offline files; release ${r.release}, ${Object.keys(r.hashes).length} hashes${r.stale.length ? `; wrote ${r.stale.join(', ')}` : '; unchanged'}`);
}
