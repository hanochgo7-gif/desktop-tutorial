// Aggregates the qualitative coding of the sampled reviews into the competitor review matrix.
// Inputs: samples/<app>.json (the sampled reviews) and coded/*.json (one code record per review).
// Every quote is checked to be a verbatim substring of its review; unverifiable quotes are dropped.
// Output (committed): docs/research/data/review-coding.json - metadata, codes and verified quotes only
// (no author names, no full review text).
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [SP, OUT] = process.argv.slice(2);
const samples = new Map();
for (const f of readdirSync(join(SP, 'samples')).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  for (const r of JSON.parse(readFileSync(join(SP, 'samples', f), 'utf8'))) samples.set(`${r.app}:${r.id}`, r);
}
const coded = readdirSync(join(SP, 'coded')).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(readFileSync(join(SP, 'coded', f), 'utf8')));
const norm = (s) => String(s || '').replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();

const rows = []; let quotes = 0, quotesOk = 0, missing = 0;
for (const c of coded) {
  const s = samples.get(`${c.app}:${c.id}`);
  if (!s) { missing++; continue; }
  let quote = null, quote_en = null;
  if (c.quote) {
    quotes++;
    if (norm(`${s.title} ${s.text}`).includes(norm(c.quote)) || norm(s.text).includes(norm(c.quote)) || norm(s.title).includes(norm(c.quote))) { quote = c.quote; quote_en = c.quote_en || null; quotesOk++; }
  }
  rows.push({ app: s.app, store: s.store, country: s.country, id: s.id, rating: s.rating, date: s.date, hebrew: /[֐-׿]/.test(s.text), neg: c.neg || [], pos: c.pos || [], abandon: Boolean(c.abandon), learner_of_english: c.learner_of_english ?? null, quote, quote_en });
}
const apps = [...new Set(rows.map((r) => r.app))];
const codes = { neg: new Set(), pos: new Set() };
rows.forEach((r) => { r.neg.forEach((x) => codes.neg.add(x)); r.pos.forEach((x) => codes.pos.add(x)); });
const matrix = {};
for (const app of apps) {
  const rs = rows.filter((r) => r.app === app);
  const low = rs.filter((r) => r.rating <= 2);
  matrix[app] = {
    n: rs.length, n_low: low.length, n_hebrew: rs.filter((r) => r.hebrew).length,
    date_range: [rs.map((r) => r.date).sort()[0], rs.map((r) => r.date).sort().pop()],
    abandon: rs.filter((r) => r.abandon).length,
    english_learners: rs.filter((r) => r.learner_of_english === true).length,
    neg: Object.fromEntries([...codes.neg].map((k) => [k, rs.filter((r) => r.neg.includes(k)).length]).filter(([, v]) => v)),
    neg_in_low: Object.fromEntries([...codes.neg].map((k) => [k, low.filter((r) => r.neg.includes(k)).length]).filter(([, v]) => v)),
    pos: Object.fromEntries([...codes.pos].map((k) => [k, rs.filter((r) => r.pos.includes(k)).length]).filter(([, v]) => v)),
  };
}
// Cross-app patterns: how many apps have a code in >= 10% of their sampled reviews.
const crossApp = {};
for (const side of ['neg', 'pos']) for (const k of codes[side]) {
  const per = apps.map((a) => ({ a, share: (matrix[a][side][k] || 0) / matrix[a].n }));
  crossApp[`${side}:${k}`] = { total: rows.filter((r) => r[side].includes(k)).length, apps_at_10pct: per.filter((p) => p.share >= 0.1).map((p) => p.a) };
}
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'review-coding.json'), JSON.stringify({
  method: 'Stratified sample (per app: up to 24 reviews rated 1-2, 12 rated 3, 24 rated 4-5, English, >= 80 characters, from 2025-05-01 or 2023-01-01 for low-volume apps; plus up to 10 Hebrew reviews), coded by research agents against a fixed codebook; counts computed by tools/research/aggregate-coding.mjs. The sample is stratified, so counts describe the sample, not prevalence among all reviews.',
  collected: 'Apple customer-review RSS (us, gb, il, in) and Google Play (en-US newest plus newest 1-3 star, iw-IL), collected 2026-10-30 by tools/research/collect-reviews.mjs',
  totals: { coded: rows.length, missing_from_samples: missing, quotes_submitted: quotes, quotes_verified: quotesOk },
  matrix, cross_app: crossApp, reviews: rows,
}, null, 1));
console.log(JSON.stringify({ coded: rows.length, missing, quotes, quotesOk }));
for (const a of apps) {
  const m = matrix[a];
  const top = Object.entries(m.neg).sort((x, y) => y[1] - x[1]).slice(0, 5).map(([k, v]) => `${k}:${v}`).join(' ');
  const topP = Object.entries(m.pos).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`${a.padEnd(10)} n=${m.n} low=${m.n_low} he=${m.n_hebrew} abandon=${m.abandon} EN-learners=${m.english_learners} | neg ${top} | pos ${topP}`);
}
console.log('cross-app (>=10% in 5+ apps):', Object.entries(crossApp).filter(([, v]) => v.apps_at_10pct.length >= 5).map(([k, v]) => `${k}(${v.apps_at_10pct.length})`).join(' '));
