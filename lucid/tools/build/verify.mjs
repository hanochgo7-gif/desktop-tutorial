// Checks a tree built by build.mjs before it is published (perf D7). Exits 1 on the first kind of failure, so the
// pages.yml step falls back to deploying the source.
// - every module parses as an ES module, and every relative import (static, and dynamic with a literal path)
//   names a file that exists; the built modules import exactly what the source modules import;
// - every minified file has its .map, and the sourceMappingURL comment names it;
// - content/manifest.json, release.json and sw.js's RELEASE match the built bytes, and every hash matches;
// - no file the repository tracks under the app root disappeared or moved, and the only new files are .map files;
// - the CSP meta of index.html is byte-identical to the source's.
// Usage: node tools/build/verify.mjs [appRoot] [--source <dir>]   (source default: git HEAD of the repository)
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildManifest, fileHash, STATIC_PAGES } from '../build-manifest.mjs';
import { targets, loadEsbuild } from './build.mjs';

const here = dirname(fileURLToPath(import.meta.url));

// Relative specifiers a module imports: from '…', import '…', export … from '…', import('…') with a literal.
export function importsOf(code) {
  const out = new Set();
  for (const m of code.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)(["'`])(\.{1,2}\/[^"'`$]+)\1/g)) out.add(m[2]);
  return [...out].sort();
}

// The source text of an app-relative file: from --source <dir>, or from git HEAD.
function sourceReader(root, sourceDir) {
  if (sourceDir) return (rel) => (existsSync(join(sourceDir, rel)) ? readFileSync(join(sourceDir, rel), 'utf8') : null);
  const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root }).toString().trim();
  const prefix = relative(top, root).split('\\').join('/');
  return (rel) => { try { return execFileSync('git', ['show', `HEAD:${prefix ? `${prefix}/` : ''}${rel}`], { cwd: root, maxBuffer: 64 << 20 }).toString(); } catch { return null; } };
}
function trackedFiles(root, sourceDir) {
  if (sourceDir) {
    const walk = (dir) => readdirSync(join(sourceDir, dir), { withFileTypes: true }).flatMap((d) => (d.name === 'node_modules' ? [] : d.isDirectory() ? walk(join(dir, d.name)) : [join(dir, d.name)]));
    return walk('.').map((p) => p.replace(/^\.\//, '').split('\\').join('/'));
  }
  return execFileSync('git', ['ls-files', '-z', '.'], { cwd: root }).toString().split('\0').filter(Boolean);
}
const untracked = (root) => execFileSync('git', ['ls-files', '-z', '--others', '--exclude-standard', '.'], { cwd: root }).toString().split('\0').filter(Boolean);

export async function verify(root, { sourceDir = null } = {}) {
  const problems = [];
  const src = sourceReader(root, sourceDir);
  const t = targets(root);
  const esbuild = loadEsbuild();
  for (const rel of t.js) {
    const code = readFileSync(join(root, rel), 'utf8');
    try { await esbuild.transform(code, { loader: 'js', format: 'esm', target: 'esnext' }); } catch (e) { problems.push(`${rel}: does not parse (${e.message.split('\n')[0]})`); }
    for (const spec of importsOf(code)) if (!existsSync(join(root, dirname(rel), spec))) problems.push(`${rel}: import ${spec} does not exist`);
    const original = src(rel);
    if (original != null && importsOf(original).join() !== importsOf(code).join()) problems.push(`${rel}: imports differ from the source`);
  }
  for (const rel of [...t.js, ...t.css]) {
    const code = readFileSync(join(root, rel), 'utf8');
    const want = `sourceMappingURL=${basename(rel)}.map`;
    if (!code.includes(want)) problems.push(`${rel}: no sourceMappingURL comment`);
    else if (!existsSync(join(root, `${rel}.map`))) problems.push(`${rel}.map missing`);
    else { try { const map = JSON.parse(readFileSync(join(root, `${rel}.map`), 'utf8')); if (!map.mappings || !map.sourcesContent?.length) problems.push(`${rel}.map is empty`); } catch { problems.push(`${rel}.map is not JSON`); } }
  }
  for (const rel of t.json) { try { JSON.parse(readFileSync(join(root, rel), 'utf8')); } catch { problems.push(`${rel}: not JSON`); } }
  try {
    const m = buildManifest(root, { write: false });
    if (m.stale.length) problems.push(`stale after the build: ${m.stale.join(', ')}`);
  } catch (e) { problems.push(`release files cannot be recomputed: ${e.message}`); }
  const release = JSON.parse(readFileSync(join(root, 'release.json'), 'utf8'));
  for (const [p, h] of Object.entries(release.hashes)) if (!existsSync(join(root, p)) || fileHash(readFileSync(join(root, p))) !== h) problems.push(`${p}: hash does not match`);
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  if (sw.match(/^const RELEASE = '([^']*)';$/m)?.[1] !== release.release) problems.push('sw.js RELEASE differs from release.json');
  // Paths: nothing tracked is gone; the build only adds .map files.
  for (const rel of trackedFiles(root, sourceDir)) if (!existsSync(join(root, rel))) problems.push(`${rel}: missing after the build`);
  if (!sourceDir) for (const rel of untracked(root)) if (!rel.endsWith('.map') && !rel.startsWith('tools/build/node_modules/')) problems.push(`${rel}: new file`);
  const csp = (html) => html?.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)?.[0];
  for (const page of ['index.html', ...STATIC_PAGES]) {
    if (!existsSync(join(root, page))) continue;
    if (csp(readFileSync(join(root, page), 'utf8')) !== csp(src(page))) problems.push(`${page}: CSP meta changed`);
  }
  return { problems, modules: t.js.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--source');
  const sourceDir = i < 0 ? null : resolve(args[i + 1]);
  const root = resolve(args.find((a, k) => !a.startsWith('--') && args[k - 1] !== '--source') || join(here, '..', '..'));
  verify(root, { sourceDir }).then(({ problems, modules }) => {
    if (problems.length) { console.error(`verify: ${problems.length} problem(s)\n  ${problems.slice(0, 40).join('\n  ')}`); process.exit(1); }
    console.log(`verify: ok (${modules} modules, maps, hashes, paths, CSP)`);
  }).catch((e) => { console.error(`verify failed: ${e.message}`); process.exit(1); });
}
