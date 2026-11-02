// Hebrew microcopy check (round 3, BL-8; the rules are in docs/ux/hebrew-microcopy.md).
// It scans the Hebrew string literals in js/ for two things the glossary rules out:
//   - singular address in instructions and possessives: שלך, אליך, בחרת (the plural is שלכם, אליכם, בחרתם);
//   - 'חזרה' used as a "back" label ('חזרה' means word review only; going back is 'הקודם' or the destination,
//     'להיום').
// Today's hits are listed in ALLOW (per file and word, as counts), so only new ones fail. When a string is fixed,
// lower its count here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HE = /[֐-׿]/;
const SINGULAR = [['שלך', /שלך(?![א-ת])/g], ['אליך', /אליך(?![א-ת])/g], ['בחרת', /בחרת(?![א-ת])/g]];

function files(dir) {
  return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : []; });
}
// String literals ('…', "…", `…`) that hold Hebrew, in source order, each with the literal right after it when the
// two are a Hebrew/English pair (tt('…', '…') or a STRINGS entry). A template literal's text is its fixed parts; the
// code inside its ${…} is scanned too, so a tt('…', '…') inside an html`` template counts on its own.
export function hebrewLiterals(src) {
  const lits = [];
  let i = 0;
  let prev = '';
  const readQuoted = (q) => {
    const start = i++;
    let t = '';
    while (i < src.length && src[i] !== q && src[i] !== '\n') { if (src[i] === '\\') { t += src.slice(i, i + 2); i += 2; } else t += src[i++]; }
    i++;
    lits.push({ text: t, start, end: i });
  };
  const readTemplate = () => {
    const start = i++;
    let t = '';
    while (i < src.length && src[i] !== '`') {
      if (src[i] === '\\') { t += src.slice(i, i + 2); i += 2; }
      else if (src[i] === '$' && src[i + 1] === '{') { i += 2; code(true); t += ' '; }
      else t += src[i++];
    }
    i++;
    lits.push({ text: t, start, end: i });
  };
  const readRegex = () => {
    i++;
    let cls = false;
    while (i < src.length && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') cls = true; else if (c === ']') cls = false; else if (c === '/' && !cls) break;
      i++;
    }
    i++;
  };
  function code(inside) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "'" || c === '"') { readQuoted(c); prev = 'x'; }
      else if (c === '`') { readTemplate(); prev = 'x'; }
      else if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; }
      else if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; }
      else if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev) || /\b(?:return|typeof|case)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd()))) { readRegex(); prev = 'x'; }
      else if (c === '{') { depth++; i++; prev = c; }
      else if (c === '}') { if (inside && depth === 0) { i++; return; } depth--; i++; prev = c; }
      else { if (!/\s/.test(c)) prev = /[\w$)\]]/.test(c) ? 'x' : c; i++; }
    }
  }
  code(false);
  lits.sort((a, b) => a.start - b.start);
  return lits.flatMap((l, k) => {
    if (!HE.test(l.text)) return [];
    const next = lits[k + 1];
    const paired = next && next.start >= l.end && /^\s*,\s*$/.test(src.slice(l.end, next.start));
    return [{ he: l.text, en: paired ? next.text : '' }];
  });
}
// 'חזרה' as a back label: 'חזרה ל…' / 'חזרה אל …' naming where to go, or 'חזרה' paired with an English "Back…".
// 'חזרה' as the name of word review ('Review') is the glossary's meaning and is not flagged.
export const isBackLabel = (he, en = '') => /^\s*חזרה\s+(?:ל|אל\s)/.test(he) || (/^\s*חזרה(?:\s|$)/.test(he) && /^\s*back\b/i.test(en));

export function scan() {
  const hits = {};
  const add = (file, word, n = 1) => { (hits[file] ??= {})[word] = (hits[file][word] || 0) + n; };
  for (const p of files(join(root, 'js'))) {
    const file = relative(root, p).split('\\').join('/');
    for (const { he, en } of hebrewLiterals(readFileSync(p, 'utf8'))) {
      for (const [word, re] of SINGULAR) { const n = (he.match(re) || []).length; if (n) add(file, word, n); }
      if (isBackLabel(he, en)) add(file, 'חזרה (back)');
    }
  }
  return hits;
}

// Hits on the day the check was added (round 3).
const ALLOW = {
  'js/core/reallife.js': { 'שלך': 2 },
  'js/core/router.js': { 'חזרה (back)': 1 },
  'js/ui/center.js': { 'שלך': 1 },
  'js/ui/exercise.js': { 'שלך': 3 },
  'js/views/checkpoint.js': { 'שלך': 2 },
  'js/views/drill.js': { 'חזרה (back)': 1 },
  'js/views/essay.js': { 'שלך': 1 },
  'js/views/grammar.js': { 'שלך': 1 },
  'js/views/lesson.js': { 'שלך': 2 },
  'js/views/listening.js': { 'חזרה (back)': 1 },
  'js/views/memorygame.js': { 'שלך': 2 },
  'js/views/onboarding.js': { 'שלך': 3, 'אליך': 1, 'חזרה (back)': 1 },
  'js/views/path.js': { 'שלך': 1 },
  'js/views/picturegame.js': { 'שלך': 2 },
  'js/views/placement.js': { 'שלך': 4, 'בחרת': 1 },
  'js/views/reading.js': { 'חזרה (back)': 1, 'שלך': 1 },
  'js/views/reallife.js': { 'שלך': 5 },
  'js/views/review.js': { 'חזרה (back)': 2 },
  'js/views/scenario.js': { 'שלך': 5 },
  'js/views/settings.js': { 'שלך': 3 },
  'js/views/speaking.js': { 'חזרה (back)': 1, 'שלך': 1 },
  'js/views/today.js': { 'שלך': 9, 'בחרת': 7 },
  'js/views/tutor.js': { 'שלך': 1 },
  'js/views/welcome.js': { 'שלך': 2 },
  'js/views/wordgame.js': { 'שלך': 5 },
};

test('BL-8: the copy check finds singular address and "חזרה" as a back label', () => {
  assert.deepEqual(hebrewLiterals("tt('בחרו את התשובה שלך', 'Pick') + \"שלכם\" + `אליך ${a}` + html`<a>${tt('חזרה להיום', 'Back to Today')}</a>`; const r = /['\"]/;"),
    [{ he: 'בחרו את התשובה שלך', en: 'Pick' }, { he: 'שלכם', en: '' }, { he: 'אליך  ', en: '' }, { he: 'חזרה להיום', en: 'Back to Today' }]);
  assert.ok(isBackLabel('חזרה', 'Back') && isBackLabel('חזרה להיום') && isBackLabel('חזרה אל המסלול'));
  assert.ok(!isBackLabel('חזרה', 'Review') && !isBackLabel('חזרה על מילים') && !isBackLabel('חזרות להיום') && !isBackLabel('זמן לחזרה'));
});

test('BL-8: no new singular address or "חזרה" back label in the Hebrew UI', () => {
  const hits = scan();
  const size = Object.values(ALLOW).reduce((a, w) => a + Object.values(w).reduce((x, y) => x + y, 0), 0);
  console.log(`copy allowlist: ${size} known hits in ${Object.keys(ALLOW).length} files`);
  const fresh = [];
  for (const [file, words] of Object.entries(hits)) for (const [word, n] of Object.entries(words)) {
    const allowed = ALLOW[file]?.[word] || 0;
    if (n > allowed) fresh.push(`${file}: ${word} ×${n} (allowed ${allowed})`);
  }
  assert.deepEqual(fresh, [], `new copy outside the glossary (docs/ux/hebrew-microcopy.md):\n${fresh.join('\n')}`);
});
