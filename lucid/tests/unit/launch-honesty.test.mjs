// Launch audit, honesty lane: the static pages say only what is true on this site (BLK-01, BLK-02, BLK-07), the
// numbers come from the content (FR-09), and the retired wording stays out (TS-09). The screens themselves are
// checked in the browser by tests/e2e/launch-honesty.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (p) => readFileSync(join(root, p), 'utf8');
const csp = (page) => page.match(/<meta http-equiv="Content-Security-Policy"[^>]*>/)?.[0];

test('BLK-01: while AI is off, privacy.html says so in both languages instead of a retention placeholder', async () => {
  const { CONFIG } = await import('../../config.js');
  const policy = read('privacy.html');
  if (CONFIG.aiEnabled) {
    assert.fail('config.js turns AI on: privacy.html must first say how long the AI provider keeps data (in both languages), then update this test');
  }
  assert.ok(policy.includes('AI לא פעיל באתר הזה, ולכן שום טקסט לא נשלח ל-Anthropic. לפני שיופעל, יפורט כאן לכמה זמן ספק ה-AI שומר את הנתונים'), 'the Hebrew AI-off statement is missing');
  assert.ok(policy.includes('AI is not active on this site, so no text is sent to Anthropic. Before it is turned on, this page will say how long the AI provider keeps data, and you will be asked first.'), 'the English AI-off statement is missing');
  assert.ok(!/how long Anthropic keeps API data|לכמה זמן Anthropic שומרת נתוני API/.test(policy), 'the retention placeholder is still there');
});

test('BLK-02: no terms of use are claimed: the policy is titled as a privacy policy and onboarding asks only that it was read', () => {
  const policy = read('privacy.html');
  assert.match(policy, /<title>מדיניות פרטיות · Lucid<\/title>/);
  assert.match(policy, /<h1>מדיניות פרטיות<\/h1>/);
  assert.match(policy, /<h1>Privacy policy<\/h1>/);
  assert.ok(!/תנאי שימוש|ותנאים|Privacy and terms|terms of use/i.test(policy), 'privacy.html still names terms');
  for (const f of ['js/views/onboarding.js', 'js/views/settings.js', 'js/views/help.js']) {
    const src = read(f);
    assert.ok(!/לתנאים|התנאים|ותנאים|the terms|Privacy and terms/.test(src), `${f} still mentions terms`);
  }
  const ob = read('js/views/onboarding.js');
  assert.ok(ob.includes("'קראתי את מדיניות הפרטיות', 'I have read the privacy policy'"), 'the onboarding box does not say "I have read the privacy policy"');
  // consent_terms_at keeps its name (a server column) and its meaning is written down.
  assert.match(ob, /consent_terms_at keeps its name/);
  assert.match(read('docs/08-product-specification.md'), /its meaning is "privacy policy acknowledged"/);
});

test('BLK-07: accessibility.html is shipped like privacy.html (same CSP, offline, verified), in both languages, and linked', async () => {
  const page = read('accessibility.html');
  assert.equal(csp(page), csp(read('privacy.html')), 'a different CSP from privacy.html');
  assert.ok(!/<script/i.test(page), 'the statement runs a script');
  assert.match(page, /<html lang="he" dir="rtl">/);
  assert.match(page, /<section class="stack" lang="en" dir="ltr">/);
  assert.match(page, /<h1>הצהרת נגישות<\/h1>/);
  assert.match(page, /<h1>Accessibility statement<\/h1>/);
  // No claim of legal compliance before legal review; the tested facts are named.
  assert.equal((page.match(/data-legal-pending/g) || []).length, 2, 'the legal-review note is not in both languages');
  assert.ok(!/עומד בתקן 5568|תקן ישראלי|complies with|is compliant|fully accessible|נגיש במלואו/i.test(page), 'the statement claims compliance');
  assert.ok(page.includes('axe-core') && page.includes('WCAG 2.0, 2.1 ו-2.2') && page.includes('WCAG 2.0, 2.1 and 2.2'));
  const { STATIC_PAGES } = await import('../../tools/build-manifest.mjs');
  assert.ok(STATIC_PAGES.includes('accessibility.html') && STATIC_PAGES.includes('privacy.html'));
  const manifest = JSON.parse(read('content/manifest.json'));
  assert.ok(manifest.offline.includes('accessibility.html'), 'not in the offline list');
  assert.ok(JSON.parse(read('release.json')).hashes['accessibility.html'], 'not in release.json');
  for (const f of ['js/views/help.js', 'js/views/settings.js', 'js/views/welcome.js', 'privacy.html']) {
    assert.ok(read(f).includes('href="accessibility.html"'), `${f} does not link the accessibility statement`);
  }
});

test('BLK-07: the audit that the statement cites covers the static pages too', () => {
  const a11y = read('tests/e2e/a11y.mjs');
  assert.ok(a11y.includes("'privacy.html'") && a11y.includes("'accessibility.html'"), 'a11y.mjs does not audit privacy.html and accessibility.html');
});

test('FR-09: Welcome, the path and Today count lessons and scenarios from the content; no count is written into the copy', () => {
  for (const f of ['js/views/welcome.js', 'js/views/path.js', 'js/views/today.js']) {
    const src = read(f);
    assert.ok(!/\b(75|30|36) (שיעורים|lessons|תרחישים|real-life scenarios)|כל 75/.test(src), `${f} writes a count into its copy`);
  }
  const product = read('PRODUCT.md');
  const scenarios = JSON.parse(read('content/real-life/index.json')).scenarios.length;
  const slang = JSON.parse(read('content/real-life/slang.json')).entries.length;
  assert.ok(product.includes(`${scenarios} real-life scenarios`) && product.includes(`${slang} expressions`), `PRODUCT.md does not say ${scenarios} scenarios and ${slang} expressions`);
});

test('TS-09: the interface never says "היכרויות" (it reads as dating) for meeting people', () => {
  const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  const hits = walk(join(root, 'js')).filter((p) => /היכרויות/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(hits.map((p) => p.slice(root.length)), []);
});

test('TS-06: no screen promises that someone reads a "report"', () => {
  const essay = read('js/views/essay.js');
  assert.ok(!/helps us audit|ויעזור לבדוק|דווחו לנו|please report it/.test(essay), 'essay.js still promises a review of reports');
  assert.ok(!/and you can report it|ואפשר לדווח על כך/.test(read('js/views/help.js')));
});
