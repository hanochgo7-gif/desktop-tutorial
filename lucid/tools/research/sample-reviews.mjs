// Deterministic, stratified sample of the collected reviews for qualitative coding.
// Per app: up to 24 reviews rated 1-2, 12 rated 3, 24 rated 4-5 (English, last 18 months,
// at least 80 characters), plus up to 10 Hebrew-language reviews from the Israeli stores.
// Order inside a stratum is a stable hash of the review id, so the sample is reproducible
// and not biased toward a single day.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const [IN, OUTDIR, SINCE = '2025-05-01'] = process.argv.slice(2);
const rows = readFileSync(IN, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const hash = (s) => createHash('sha1').update(s).digest('hex');
const isHebrew = (t) => /[֐-׿]/.test(t);
const byApp = {};
for (const r of rows) (byApp[r.app] ||= []).push(r);
mkdirSync(OUTDIR, { recursive: true });
const summary = {};
for (const [app, list] of Object.entries(byApp)) {
  // Low-volume apps fall back to a wider window (from 2023) so the sample is not too thin.
  let since = SINCE;
  let recent = list.filter((r) => r.date >= since && (r.title + ' ' + r.text).length >= 80);
  if (recent.length < 60) { since = '2023-01-01'; recent = list.filter((r) => r.date >= since && (r.title + ' ' + r.text).length >= 80); }
  const en = recent.filter((r) => !isHebrew(r.text));
  const pick = (arr, n) => arr.sort((a, b) => (hash(a.id) < hash(b.id) ? -1 : 1)).slice(0, n);
  const sample = [
    ...pick(en.filter((r) => r.rating <= 2), 24),
    ...pick(en.filter((r) => r.rating === 3), 12),
    ...pick(en.filter((r) => r.rating >= 4), 24),
    ...pick(list.filter((r) => isHebrew(r.text) && r.text.length >= 30), 10),
  ];
  summary[app] = { collected: list.length, window_from: since, eligible_recent: recent.length, sampled: sample.length,
    by_rating: [1, 2, 3, 4, 5].map((s) => sample.filter((r) => r.rating === s).length),
    hebrew: sample.filter((r) => isHebrew(r.text)).length };
  writeFileSync(`${OUTDIR}/${app}.json`, JSON.stringify(sample.map(({ app, store, country, id, rating, date, version, title, text }) =>
    ({ app, store, country, id, rating, date, version, title, text })), null, 1));
}
writeFileSync(`${OUTDIR}/_summary.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
