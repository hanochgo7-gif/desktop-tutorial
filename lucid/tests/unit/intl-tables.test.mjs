// Shared Intl objects and ICU-free tables give exactly what the per-call Intl code gave (perf plan R6, R8):
// the progress week chart's narrow weekday names, util.groupDigits, the vocabulary notebook's "next review" text
// and its A-Z order, and the expressions list's A-Z order.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { groupDigits, collatorEn, relTime, warmIntl } from '../../js/core/util.js';

let progress; let vocab;
before(async () => {
  globalThis.document = { documentElement: { dataset: {}, lang: 'he', dir: 'rtl' }, visibilityState: 'visible' };
  progress = await import('../../js/views/progress.js');
  vocab = await import('../../js/views/vocab.js');
});

test('R6: the narrow weekday tables equal Intl for he and en, on every day of a year', () => {
  for (const lang of ['he', 'en']) {
    const fmt = new Intl.DateTimeFormat(lang, { weekday: 'narrow' });
    for (let i = 0; i < 7; i++) assert.equal(progress.NARROW_WEEKDAYS[lang][new Date(2026, 10, 1 + i).getDay()], fmt.format(new Date(2026, 10, 1 + i)), `${lang} ${i}`);
    for (let i = 0; i < 366; i++) {
      const d = new Date(Date.UTC(2026, 0, 1) + i * 86_400_000 + 13 * 3_600_000);
      assert.equal(progress.weekdayNarrow(d, lang), d.toLocaleDateString(lang, { weekday: 'narrow' }), `${lang} ${d.toISOString()}`);
    }
  }
  // Any other language still asks Intl.
  const d = new Date(2026, 10, 6);
  assert.equal(progress.weekdayNarrow(d, 'fr'), d.toLocaleDateString('fr', { weekday: 'narrow' }));
});

test('R6: groupDigits equals toLocaleString("en-US") for integers 0 to 10^7 and beyond', () => {
  for (let n = 0; n <= 10_000_000; n += n < 20_000 ? 1 : 997) assert.equal(groupDigits(n), n.toLocaleString('en-US'), String(n));
  for (const n of [-1, -999, -1000, -1234567, 2 ** 31, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 1e21, 1.5, 1234.5678, -0, NaN, Infinity, -Infinity]) {
    assert.equal(groupDigits(n), n.toLocaleString('en-US'), String(n));
  }
});

// The pre-change relativeDue (vocab.js at b2b669b): a new formatter on every call.
function oldRelativeDue(iso, now, lang) {
  const ms = new Date(iso) - now;
  if (!(ms > 0)) return null;
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  const fmt = (n, unit) => rtf.format(n, unit).replace(/\s*\(\d+\)$/, '');
  const hours = ms / 3_600_000;
  if (hours < 1) return fmt(Math.max(1, Math.round(ms / 60_000)), 'minute');
  if (hours < 24) return fmt(Math.round(hours), 'hour');
  const days = Math.round(hours / 24);
  if (days < 45) return fmt(days, 'day');
  if (days < 365) return fmt(Math.round(days / 30), 'month');
  return fmt(Math.round(days / 365), 'year');
}

test('R8: relativeDue with the shared formatter equals the old one for 1,000 offsets in he and en', () => {
  let s = 11;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const now = new Date(Date.UTC(2026, 10, 6, 12));
  const offsets = [-1, 0, 1, 59_999, 60_000, 3_599_999, 3_600_000, 86_399_999, 86_400_000, 44.4 * 86_400_000, 45 * 86_400_000, 364 * 86_400_000, 365 * 86_400_000, 900 * 86_400_000];
  for (let i = 0; i < 1000; i++) offsets.push(Math.floor((rnd() ** 3) * 800 * 86_400_000) - 86_400_000);
  for (const lang of ['he', 'en']) {
    for (const off of offsets) {
      const iso = new Date(now.getTime() + off).toISOString();
      assert.equal(vocab.relativeDue(iso, now, relTime(lang)), oldRelativeDue(iso, now, lang), `${lang} ${off}`);
    }
  }
  // Without the third argument it follows the UI language (Hebrew by default here).
  assert.equal(vocab.relativeDue(new Date(now.getTime() + 3 * 86_400_000).toISOString(), now), oldRelativeDue(new Date(now.getTime() + 3 * 86_400_000).toISOString(), now, 'he'));
});

test('R8 and R6: the shared collator sorts vocabulary words and expressions exactly as localeCompare did', () => {
  const dir = new URL('../../content/lessons/', import.meta.url);
  const words = readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => (JSON.parse(readFileSync(new URL(f, dir), 'utf8')).vocab || []).map((v) => v.word));
  // Case and accent variants, so ties under sensitivity 'base' keep their input order (a stable sort) in both.
  const list = [...words, ...words.slice(0, 200).map((w) => w.toUpperCase()), 'café', 'cafe', 'Cafe', 'résumé', 'resume', 'naïve', 'naive', "o'clock", 'oclock', 'e-mail', 'email', '', ' '];
  assert.ok(words.length > 700, `${words.length} lesson words`);
  const rows = list.map((word, i) => ({ id: i, p: { word } }));
  const old = [...rows].sort((a, b) => a.p.word.localeCompare(b.p.word, 'en', { sensitivity: 'base' }));
  assert.deepEqual([...rows].sort(vocab.byWord).map((r) => r.id), old.map((r) => r.id));
  const slang = JSON.parse(readFileSync(new URL('../../content/real-life/slang.json', import.meta.url), 'utf8')).entries.map((e) => e.term);
  assert.ok(slang.length > 20);
  const terms = [...slang, ...slang.map((x) => x.toLowerCase())];
  assert.deepEqual([...terms].sort((a, b) => collatorEn().compare(a, b)), [...terms].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' })));
});

test('the shared Intl objects are built once per kind and language; warmIntl is safe to call more than once', async () => {
  assert.equal(collatorEn(), collatorEn());
  assert.equal(relTime('he'), relTime('he'));
  assert.notEqual(relTime('he'), relTime('en'));
  assert.equal(relTime('en').resolvedOptions().numeric, 'auto');
  assert.equal(collatorEn().resolvedOptions().sensitivity, 'base');
  warmIntl('he');
  warmIntl('en');
  await new Promise((r) => setTimeout(r, 20));
});
