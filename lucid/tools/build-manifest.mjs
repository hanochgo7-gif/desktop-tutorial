// Writes content/manifest.json: which lesson files exist, a content version for cache busting, and the files
// the service worker precaches for offline use.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const lessons = readdirSync(join(root, 'lessons')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
const hash = createHash('sha1');
const files = ['taxonomy.json', 'curriculum.json', 'placement.json', 'real-life/scenarios.json', 'real-life/slang.json', 'writing/exercises.json', 'writing/assignments.json', 'writing/rubric.json', ...lessons.map((l) => `lessons/${l}.json`)];
for (const f of files) if (existsSync(join(root, f))) hash.update(readFileSync(join(root, f)));
// Everything the app needs offline except lessons (about 3 MB, saved on request from Settings): every module
// the router can lazy-load, and the non-lesson content. The service worker precaches this list on install.
const app = join(root, '..');
const walk = (dir) => readdirSync(join(app, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? walk(`${dir}/${d.name}`) : /\.m?js$/.test(d.name) ? [`${dir}/${d.name}`] : []));
const offline = [...walk('js'), ...walk('vendor'), ...files.filter((f) => !f.startsWith('lessons/') && existsSync(join(root, f))).map((f) => `content/${f}`), 'privacy.html'].sort();
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ version: hash.digest('hex').slice(0, 12), lessons, offline }, null, 1) + '\n');
console.log(`manifest: ${lessons.length} lessons, ${offline.length} offline files`);
