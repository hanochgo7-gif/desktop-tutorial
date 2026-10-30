// Writes content/manifest.json: which lesson files exist and a content version for cache busting.
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const lessons = readdirSync(join(root, 'lessons')).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
const hash = createHash('sha1');
const files = ['taxonomy.json', 'curriculum.json', 'placement.json', 'real-life/scenarios.json', 'real-life/slang.json', 'writing/exercises.json', 'writing/assignments.json', 'writing/rubric.json', ...lessons.map((l) => `lessons/${l}.json`)];
for (const f of files) if (existsSync(join(root, f))) hash.update(readFileSync(join(root, f)));
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ version: hash.digest('hex').slice(0, 12), lessons }, null, 1) + '\n');
console.log(`manifest: ${lessons.length} lessons`);
