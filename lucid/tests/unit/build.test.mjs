// The deploy-only build (perf D7): tools/build/build.mjs minifies in place and keeps every path; verify.mjs refuses a
// tree that lost a file, a map, a hash or the CSP. Skipped when esbuild is not installed (npm ci --prefix tools/build),
// except in CI (CI=true, as GitHub Actions sets it), where a missing esbuild fails these tests instead of hiding them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, cpSync, rmSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = fileURLToPath(new URL('../../', import.meta.url));
const hasEsbuild = existsSync(join(app, 'tools/build/node_modules/esbuild/package.json'));
const skip = hasEsbuild || process.env.CI === 'true' ? false : 'esbuild not installed (npm ci --prefix tools/build)';
const SHIPPED = ['js', 'vendor', 'css', 'fonts', 'content', 'assets', 'index.html', 'privacy.html', 'accessibility.html', 'config.js', 'manifest.webmanifest', 'sw.js', 'release.json'];

function copyApp() {
  const dir = mkdtempSync(join(tmpdir(), 'lucid-build-'));
  for (const d of ['src', 'out']) for (const p of SHIPPED) cpSync(join(app, p), join(dir, d, p), { recursive: true });
  return { dir, src: join(dir, 'src'), out: join(dir, 'out') };
}
const files = (root, dir = '.') => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(root, `${dir}/${d.name}`) : [`${dir}/${d.name}`.slice(2)])).sort();

test('importsOf finds static, re-export and literal dynamic imports, not computed ones', async () => {
  const { importsOf } = await import('../../tools/build/verify.mjs');
  const code = `import{a as b}from"./a.js";import './side.js';export { c } from '../c.js';const v=()=>import("../views/v.js");import(\`./x/\${n}.js\`);fetch('./data.json')`;
  assert.deepEqual(importsOf(code), ['../c.js', '../views/v.js', './a.js', './side.js']);
});

test('the build keeps every path, adds only source maps, keeps the CSP and colours, and passes verify', { skip }, async () => {
  const { build } = await import('../../tools/build/build.mjs');
  const { verify } = await import('../../tools/build/verify.mjs');
  const { dir, src, out } = copyApp();
  try {
    const before = files(src);
    const r = await build(out);
    const after = files(out);
    assert.deepEqual(after.filter((f) => !f.endsWith('.map')), before, 'paths changed');
    assert.deepEqual(after.filter((f) => f.endsWith('.map')).sort(), [...r.js, ...r.css].map((f) => `${f}.map`).sort());
    assert.ok(r.after < r.before * 0.9, 'nothing was minified');
    assert.equal(readFileSync(join(out, 'index.html'), 'utf8'), readFileSync(join(src, 'index.html'), 'utf8'), 'index.html is untouched');
    // The minified bytes give new hashes, so the two generated lines (tools/build-manifest.mjs) change; nothing else.
    const generated = (t) => t.replace(/^const (RELEASE|LISTING) = .*$/gm, '');
    assert.equal(generated(readFileSync(join(out, 'sw.js'), 'utf8')), generated(readFileSync(join(src, 'sw.js'), 'utf8')), 'only the RELEASE and LISTING lines of sw.js change');
    const css = readFileSync(join(out, 'css/app.css'), 'utf8');
    const srcCss = readFileSync(join(src, 'css/app.css'), 'utf8');
    assert.equal((css.match(/oklch\(/g) || []).length > 0, (srcCss.match(/oklch\(/g) || []).length > 0, 'oklch colours are kept');
    const fontUrls = (t) => [...new Set((t.match(/url\(["']?[^)"']*fonts\/[^)"']*/g) || []).map((u) => u.replace(/^url\(["']?/, '')))].sort();
    assert.ok(fontUrls(srcCss).length >= 3);
    assert.deepEqual(fontUrls(css), fontUrls(srcCss), 'font URLs are kept');
    for (const f of ['content/curriculum.json', 'content/lessons/a1-01.json', 'content/real-life/scenarios.json']) {
      assert.deepEqual(JSON.parse(readFileSync(join(out, f), 'utf8')), JSON.parse(readFileSync(join(src, f), 'utf8')), f);
    }
    const release = JSON.parse(readFileSync(join(out, 'release.json'), 'utf8'));
    assert.notEqual(release.release, JSON.parse(readFileSync(join(src, 'release.json'), 'utf8')).release, 'the release follows the built bytes');
    assert.deepEqual((await verify(out, { sourceDir: src })).problems, []);
    // Deterministic: the same source gives the same release (else every deploy would make learners download again).
    const again = copyApp();
    try { assert.equal((await build(again.out)).release, r.release); } finally { rmSync(again.dir, { recursive: true, force: true }); }
    await assert.rejects(build(out), /already built/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('verify refuses a missing map, a stale hash, a broken import, a lost file and a changed CSP', { skip }, async () => {
  const { build } = await import('../../tools/build/build.mjs');
  const { verify } = await import('../../tools/build/verify.mjs');
  const { dir, src, out } = copyApp();
  try {
    await build(out);
    const breakers = [
      ['map', () => unlinkSync(join(out, 'js/core/util.js.map')), /util\.js\.map missing/],
      ['hash', () => writeFileSync(join(out, 'js/views/today.js'), `${readFileSync(join(out, 'js/views/today.js'), 'utf8')}\n`), /today\.js: hash does not match|stale/],
      ['import', () => writeFileSync(join(out, 'js/views/help.js'), readFileSync(join(out, 'js/views/help.js'), 'utf8').replace(/from"\.\.\/core\/util\.js"/, 'from"../core/utl.js"')), /utl\.js does not exist/],
      ['file', () => unlinkSync(join(out, 'assets/favicon.svg')), /favicon\.svg: missing/],
      ['csp', () => writeFileSync(join(out, 'index.html'), readFileSync(join(out, 'index.html'), 'utf8').replace("object-src 'none'", "object-src 'self'")), /CSP meta changed/],
    ];
    for (const [name, breakIt, expect] of breakers) {
      breakIt();
      const { problems } = await verify(out, { sourceDir: src });
      assert.ok(problems.some((p) => expect.test(p)), `${name}: ${problems.join(' | ')}`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('CSS inlining (D9, gated) replaces exactly the one stylesheet tag, rewrites font URLs and keeps the CSP', { skip }, async () => {
  const { build, inlineCss, CSS_TAG } = await import('../../tools/build/build.mjs');
  const { verify } = await import('../../tools/build/verify.mjs');
  const { dir, src, out } = copyApp();
  try {
    const r = await build(out, { inline: true });
    assert.equal(r.inlined, true);
    const page = readFileSync(join(out, 'index.html'), 'utf8');
    const source = readFileSync(join(src, 'index.html'), 'utf8');
    assert.ok(!page.includes(CSS_TAG) && source.includes(CSS_TAG));
    // index.html has other <style> blocks (the boot frame, B5), so compare around the one tag the build replaced.
    const [head, tail] = source.split(CSS_TAG);
    assert.ok(page.startsWith(head) && page.endsWith(tail), 'only the tag changed');
    assert.match(page.slice(head.length, page.length - tail.length), /^<style>(?:(?!<\/style>)[\s\S])*<\/style>$/, 'the tag became one <style>');
    assert.ok(/url\(fonts\/rubik-hebrew\.woff2\)/.test(page) && !page.includes('../fonts/'));
    assert.ok(!/sourceMappingURL/.test(page));
    assert.ok(existsSync(join(out, 'css/app.css')), 'privacy.html still links the stylesheet');
    assert.deepEqual((await verify(out, { sourceDir: src })).problems, []);
    assert.equal(inlineCss(out), false, 'no tag left: nothing to do');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
