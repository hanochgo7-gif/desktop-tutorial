// The operator's contact details have one source, js/core/contact.js (launch BLK-01, BLK-06). privacy.html and
// accessibility.html run no script, so they carry the details as static text; this keeps the three in step. While
// contact.js is empty both pages keep their "to be filled in" boxes (the owner's decision) and show no address;
// once it is filled in, both pages must show the same email (and name) in both languages, with no box left.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8');
const PAGES = ['privacy.html', 'accessibility.html'];
const PLACEHOLDER = { he: 'להשלמה לפני הפעלה ציבורית', en: 'To be filled in before public launch' };

// The Hebrew part of a page and its English part (the <section lang="en">).
export function halves(page) {
  const i = page.indexOf('<section class="stack" lang="en"');
  return i < 0 ? { he: page, en: '' } : { he: page.slice(0, i), en: page.slice(i) };
}
// What is wrong with a page's contact text for these details ([] when nothing).
export function contactProblems(page, contact, name = 'page') {
  const out = [];
  const { he, en } = halves(page);
  if (!en) out.push(`${name}: no English section`);
  const filled = Boolean(contact.email);
  const addresses = page.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || [];
  if (!filled) {
    if (!he.slice(he.lastIndexOf('<h2')).includes(PLACEHOLDER.he)) out.push(`${name}: the Hebrew contact box ("${PLACEHOLDER.he}") is missing while contact.js is empty`);
    if (!en.slice(en.lastIndexOf('<h2')).includes(PLACEHOLDER.en)) out.push(`${name}: the English contact box ("${PLACEHOLDER.en}") is missing while contact.js is empty`);
    if (addresses.length || /mailto:/.test(page)) out.push(`${name}: shows an address (${addresses.join(', ') || 'mailto'}) that contact.js does not have`);
    return out;
  }
  for (const [lang, part] of [['Hebrew', he], ['English', en]]) {
    if (!part.includes(contact.email)) out.push(`${name}: the ${lang} section does not show ${contact.email}`);
  }
  if (contact.name_he && !he.includes(contact.name_he)) out.push(`${name}: the Hebrew section does not name ${contact.name_he}`);
  if (contact.name_en && !en.includes(contact.name_en)) out.push(`${name}: the English section does not name ${contact.name_en}`);
  for (const a of addresses) if (a !== contact.email) out.push(`${name}: shows ${a}, which is not contact.js's address`);
  // The contact section is each half's last one (another box, such as the legal review, may stay).
  if (he.slice(he.lastIndexOf('<h2')).includes(PLACEHOLDER.he)) out.push(`${name}: the Hebrew contact box is still there`);
  if (en.slice(en.lastIndexOf('<h2')).includes(PLACEHOLDER.en)) out.push(`${name}: the English contact box is still there`);
  return out;
}

test('contact.js holds strings only, and is empty until the owner supplies the details (nothing made up)', async () => {
  const { CONTACT, hasContact } = await import('../../js/core/contact.js');
  assert.deepEqual(Object.keys(CONTACT).sort(), ['email', 'name_en', 'name_he']);
  for (const [k, v] of Object.entries(CONTACT)) assert.equal(typeof v, 'string', `${k} is not a string`);
  // An address, when there is one, is a real-looking address, not a placeholder.
  if (CONTACT.email) {
    assert.ok(hasContact(), `contact.js email "${CONTACT.email}" is not an address`);
    assert.ok(!/example\.(com|org|net)|test|placeholder|xxx/i.test(CONTACT.email), 'contact.js holds a placeholder address');
  } else assert.equal(hasContact(), false);
});

test('privacy.html and accessibility.html show the same contact details as contact.js (or their boxes while it is empty)', async () => {
  const { CONTACT } = await import('../../js/core/contact.js');
  const problems = PAGES.flatMap((p) => contactProblems(read(p), CONTACT, p));
  assert.deepEqual(problems, [], `update the pages from js/core/contact.js:\n${problems.join('\n')}`);
});

test('the check itself: a filled contact.js fails pages that still have their boxes, and passes pages that show it', () => {
  const filled = { name_he: 'שם לבדיקה', name_en: 'Name for the test', email: 'someone@lucid.invalid' };
  const page = read('privacy.html');
  assert.ok(contactProblems(page, filled).length > 0, 'a page with only boxes passes a filled contact.js');
  const done = page.replace(/<p class="banner warn"><span><strong>להשלמה לפני הפעלה ציבורית:<\/strong> שם מפעיל האתר[\s\S]*?<\/p>/, `<p>${filled.name_he}: ${filled.email}</p>`)
    .replace(/<p class="banner warn"><span><strong>To be filled in before public launch:<\/strong> the site operator's name[\s\S]*?<\/p>/, `<p>${filled.name_en}: ${filled.email}</p>`);
  assert.deepEqual(contactProblems(done, filled), []);
  assert.ok(contactProblems(done, { name_he: '', name_en: '', email: '' }).length > 0, 'an address shows while contact.js is empty');
  assert.ok(contactProblems(done.replace(filled.email, 'other@lucid.invalid'), filled).length > 0, 'a different address passes');
});

test('Help reads the contact from contact.js, and says plainly that it is not published yet while it is empty', () => {
  const help = read('js/views/help.js');
  assert.match(help, /from '\.\.\/core\/contact\.js'/);
  assert.match(help, /יפורסמו כאן ובמדיניות הפרטיות לפני ההשקה הציבורית/);
  assert.match(help, /will be published here and in the privacy policy before the public launch/);
  assert.ok(!/mailto:[^$]/.test(help), 'help.js writes an address of its own');
});
