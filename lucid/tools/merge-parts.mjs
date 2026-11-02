// Merges authored content parts (content/<area>/parts/<kind>-N.json) into the files the app loads.
// Usage: node tools/merge-parts.mjs   (then run the validator)
import { readdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content');
const plan = [
  ['real-life', 'scenarios', 'scenarios'],
  ['real-life', 'slang', 'entries'],
  ['writing', 'exercises', 'exercises'],
  ['writing', 'assignments', 'assignments'],
];
for (const [area, kind, key] of plan) {
  const dir = join(root, area, 'parts');
  if (!existsSync(dir)) continue;
  const parts = readdirSync(dir).filter((f) => f.startsWith(`${kind}-`) && f.endsWith('.json')).sort();
  if (!parts.length) continue;
  const items = parts.flatMap((f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))[key] || []);
  const ids = new Set();
  const unique = items.filter((x) => (ids.has(x.id) ? false : ids.add(x.id)));
  writeFileSync(join(root, area, `${kind}.json`), JSON.stringify({ [key]: unique }, null, 1) + '\n');
  console.log(`${area}/${kind}.json: ${unique.length} (${items.length - unique.length} duplicate ids dropped) from ${parts.join(', ')}`);
}
if (process.argv.includes('--clean')) for (const area of ['real-life', 'writing']) rmSync(join(root, area, 'parts'), { recursive: true, force: true });
