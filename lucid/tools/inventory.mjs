// Counts the content that actually exists, for the product spec and reports.
// Usage: node tools/inventory.mjs   (prints Markdown)
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const read = (p) => (existsSync(join(root, p)) ? JSON.parse(readFileSync(join(root, p), 'utf8')) : null);
const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const MIN = { PreA1: 10, A1: 15, A2: 15, B1: 12, B2: 10, C1: 8, C2: 5 };

const curriculum = read('curriculum.json');
const lessons = readdirSync(join(root, 'lessons')).filter((f) => f.endsWith('.json')).map((f) => read(`lessons/${f}`));
const planned = Object.fromEntries(curriculum.levels.map((l) => [l.id, l.lessons.length]));
const byLevel = Object.fromEntries(LEVELS.map((l) => [l, lessons.filter((x) => x.level === l)]));
const types = {};
let exercises = 0, vocab = 0, pitfalls = 0;
for (const l of lessons) {
  for (const e of l.exercises || []) { types[e.type] = (types[e.type] || 0) + 1; exercises++; }
  vocab += (l.vocab || []).length;
  pitfalls += (l.hebrew_pitfalls || []).length;
}
const scenarios = read('real-life/scenarios.json')?.scenarios || [];
const slang = read('real-life/slang.json')?.entries || [];
const wex = read('writing/exercises.json')?.exercises || [];
const was = read('writing/assignments.json')?.assignments || [];
const placement = read('placement.json')?.items || [];
const modules = {};
for (const s of scenarios) modules[s.module] = (modules[s.module] || 0) + 1;

const ok = (n, min) => (n >= min ? 'yes' : `no (${n}/${min})`);
const out = [];
out.push('| Level | Planned | Written | Required minimum | Met |', '|---|---|---|---|---|');
for (const l of LEVELS) out.push(`| ${l} | ${planned[l]} | ${byLevel[l].length} | ${MIN[l]} | ${ok(byLevel[l].length, MIN[l])} |`);
out.push('', `Lessons: ${lessons.length} written of ${Object.values(planned).reduce((a, b) => a + b, 0)} planned; ${exercises} exercises; ${vocab} vocabulary entries; ${pitfalls} Hebrew-speaker pitfalls.`);
out.push(`Exercise types: ${Object.entries(types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${n}`).join(', ')}.`);
out.push('', '| Content | Count | Required minimum | Met |', '|---|---|---|---|');
out.push(`| Real-life scenarios | ${scenarios.length} (${Object.entries(modules).map(([m, n]) => `${m} ${n}`).join(', ')}) | 30 | ${ok(scenarios.length, 30)} |`);
out.push(`| Expressions and slang | ${slang.length} | 50 | ${ok(slang.length, 50)} |`);
out.push(`| Writing exercises | ${wex.length} | 20 | ${ok(wex.length, 20)} |`);
out.push(`| Advanced writing assignments | ${was.length} | 10 | ${ok(was.length, 10)} |`);
out.push(`| Placement items | ${placement.length} | - | - |`);
console.log(out.join('\n'));
