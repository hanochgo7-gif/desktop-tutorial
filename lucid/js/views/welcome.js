// Welcome: what Lucid is, in one screen, with the dual-legend keyboard as its proof.
import { html, render, on } from '../core/util.js';
import { tt, setUiLang, uiLang } from '../core/i18n.js';
import { icon, brandMark } from '../ui/components.js';
import { configured } from '../core/api.js';
import { hasProfile, settings, saveSettings } from '../core/learner.js';
import { content } from '../core/content.js';
import '../core/compat.js'; // content.js's C-1 methods also on a page that started on release 2026-11-03.1 (compat.js).

// Text size before there is a profile (TF-1): the same 100-150% setting as Settings (:root[data-text]). Until
// onboarding ends it is kept for this browser session, like the interface language, and onboarding saves it
// with the other settings. With a profile, it is the saved setting itself.
export const TEXT_SIZES = [100, 115, 130, 150];
const TEXT_KEY = 'lucid-text-size';
export function sessionTextSize() {
  try { const n = Number(sessionStorage.getItem(TEXT_KEY)); return TEXT_SIZES.includes(n) ? n : null; } catch { return null; }
}
export function applyTextSize(n) {
  const root = document.documentElement;
  if (n && n !== 100) root.dataset.text = String(n); else delete root.dataset.text;
}
export function chooseTextSize(n) {
  if (hasProfile()) { saveSettings({ text_size: n }); return; }
  applyTextSize(n);
  try { sessionStorage.setItem(TEXT_KEY, String(n)); } catch { /* storage blocked: this page only */ }
}
export const currentTextSize = () => (hasProfile() ? settings().text_size : sessionTextSize()) || 100;
// The compact control cycles through the sizes. Its name says what it is and the size now; the change is also
// announced, since a button's new name is not always read out.
const sizeName = (n) => tt(`גודל טקסט: ${n}%`, `Text size: ${n}%`);
const sizeLabel = (n) => html`<span class="sr-only">${tt('גודל טקסט:', 'Text size:')} </span><span aria-hidden="true" lang="${uiLang()}">${tt('א+', 'A+')}</span> <span class="num">${n}%</span>`;

// Israeli keyboard (SI-1452): Latin legend and Hebrew legend on each key.
const ROWS = [
  [['Q', '/'], ['W', '׳'], ['E', 'ק'], ['R', 'ר'], ['T', 'א'], ['Y', 'ט'], ['U', 'ו'], ['I', 'ן'], ['O', 'ם'], ['P', 'פ']],
  [['A', 'ש'], ['S', 'ד'], ['D', 'ג'], ['F', 'כ'], ['G', 'ע'], ['H', 'י'], ['J', 'ח'], ['K', 'ל'], ['L', 'ך']],
  [['Z', 'ז'], ['X', 'ס'], ['C', 'ב'], ['V', 'ה'], ['B', 'נ'], ['N', 'מ'], ['M', 'צ']],
];
const WORD = 'LUCID';

export default async function welcome(el, ctx) {
  ctx.setTitle('');
  // The language and text size chosen earlier in this session (a reload keeps them).
  try { const l = sessionStorage.getItem('lucid-ui-lang'); if (l && !hasProfile()) setUiLang(l); } catch { /* ignore */ }
  if (!hasProfile()) applyTextSize(currentTextSize());
  // The numbers are counted from the content, never written in (launch FR-09): the curriculum is already loaded at boot
  // and the scenario list is fetched as the route resolves (router DATA). Without the list the line has no number.
  const [curriculum, scenarios] = await Promise.all([
    content.curriculum().catch(() => null),
    content.scenarioIndex().catch(() => null),
  ]);
  const lessonN = curriculum?.levels?.reduce((n, l) => n + (l.lessons?.length || 0), 0) || 0;
  const lastLevel = curriculum?.levels?.at(-1)?.id || 'C2';
  const scenarioN = scenarios?.scenarios?.length || 0;
  const draw = () => render(el, html`
    <div class="welcome">
      <div class="welcome-top">
        <span class="brand">${brandMark()}<span>Lucid</span></span>
        <div class="welcome-tools">
          <button type="button" class="key ghost small text-cycle" data-text-cycle>${sizeLabel(currentTextSize())}</button>
          <span class="sr-only" role="status" data-size-status></span>
          <div class="seg" role="group" aria-label="${tt('שפת הממשק', 'Interface language')}">
            <button type="button" data-lang="he" aria-pressed="${String(uiLang() === 'he')}" lang="he">עברית</button>
            <button type="button" data-lang="en" aria-pressed="${String(uiLang() === 'en')}" lang="en">English</button>
          </div>
        </div>
      </div>
      <div class="welcome-main">
        <div class="stack-lg">
          <div>
            <h1>${tt('אנגלית, מהאות הראשונה ועד הטיעון הכי טוב שלכם.', 'English, from your first letter to your best argument.')}</h1>
            <p class="lede">${tt(
              'שיעורים שנבנו לדוברי עברית, תרגול שמתאים את עצמו לטעויות שלכם, אנגלית לטיול הבא, ומעבדת כתיבה שמלמדת אתכם לתקן בעצמכם.',
              'Lessons built for Hebrew speakers, practice that adapts to your mistakes, English for your next trip, and a writing lab that teaches you to fix your own writing.')}</p>
          </div>
          <div class="start-bar">
            <a class="key enter" href="#/start">${tt('בואו נתחיל', 'Get started')} ${icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next')}</a>
            ${configured() ? html`<a class="key ghost" href="#/account?mode=signin">${tt('כבר יש לי חשבון', 'I already have an account')}</a>` : ''}
          </div>
          <ul class="check-rows small muted">
            <li data-count-lessons="${lessonN}">${icon('check', { size: 16 })}<span>${lessonN ? tt(`${lessonN} שיעורים, מאפס ועד ${lastLevel}, עם הסברים בעברית שנעלמים בהדרגה`, `${lessonN} lessons from zero to ${lastLevel}, with Hebrew support that fades as you grow`) : tt(`שיעורים מאפס ועד ${lastLevel}, עם הסברים בעברית שנעלמים בהדרגה`, `Lessons from zero to ${lastLevel}, with Hebrew support that fades as you grow`)}</span></li>
            <li data-count-scenarios="${scenarioN}">${icon('check', { size: 16 })}<span>${scenarioN ? tt(`${scenarioN} תרחישים מהחיים: שדה תעופה, מלון, מסעדה, שיחות עם אנשים חדשים וחירום`, `${scenarioN} real-life scenarios: airports, hotels, restaurants, meeting people, emergencies`) : tt('תרחישים מהחיים: שדה תעופה, מלון, מסעדה, שיחות עם אנשים חדשים וחירום', 'Real-life scenarios: airports, hotels, restaurants, meeting people, emergencies')}</span></li>
            <li>${icon('check', { size: 16 })}<span>${tt('בלי פרסומות, בלי לחץ של רצפים, ורמה שנמדדת לפי מה שאתם יודעים לעשות', 'No ads, no streak pressure, and a level based on what you can actually do')}</span></li>
          </ul>
        </div>
        <div class="keyboard" role="img" aria-label="${tt('מקלדת עם אותיות באנגלית ובעברית על כל מקש', 'A keyboard with an English and a Hebrew letter on every key')}">
          ${ROWS.map((row) => html`<div class="krow">${row.map(([l, h]) => html`<span class="kc" data-k="${l}"><span class="kl">${l}</span><span class="kh">${h}</span></span>`)}</div>`)}
          <div class="krow"><span class="kc wide"></span></div>
        </div>
      </div>
      <div class="welcome-foot">
        <p class="small welcome-links"><a href="privacy.html" target="_blank" rel="noopener">${tt('מדיניות הפרטיות', 'Privacy policy')}</a><span aria-hidden="true"> · </span><a href="accessibility.html" target="_blank" rel="noopener">${tt('הצהרת נגישות', 'Accessibility statement')}</a></p>
        <p class="xsmall faint">${tt('הרמות ב-Lucid הן הערכה לפי מתארי CEFR, לא תעודה רשמית.', 'Lucid levels are estimates aligned to CEFR descriptors, not official certificates.')}</p>
      </div>
    </div>`);
  draw();

  // Type the word on the keyboard, once, unless reduced motion is preferred.
  let timer = null;
  const type = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    timer = setInterval(() => {
      el.querySelectorAll('.kc.hot').forEach((k) => k.classList.remove('hot'));
      if (i >= WORD.length) { clearInterval(timer); return; }
      const k = el.querySelector(`.kc[data-k="${WORD[i]}"]`);
      if (k) { k.classList.add('hot', 'press'); setTimeout(() => k.classList.remove('press'), 360); }
      i++;
    }, 420);
  };
  setTimeout(type, 500);

  const offs = [
    on(el, 'click', '[data-lang]', (e, b) => {
      setUiLang(b.dataset.lang);
      try { sessionStorage.setItem('lucid-ui-lang', b.dataset.lang); } catch { /* ignore */ }
      clearInterval(timer);
      draw();
      el.querySelector(`[data-lang="${b.dataset.lang}"]`)?.focus();
    }),
    // Updated in place, so focus stays on the control and the keyboard animation does not restart.
    on(el, 'click', '[data-text-cycle]', (e, b) => {
      const n = TEXT_SIZES[(TEXT_SIZES.indexOf(currentTextSize()) + 1) % TEXT_SIZES.length];
      chooseTextSize(n);
      render(b, sizeLabel(n));
      const status = el.querySelector('[data-size-status]');
      if (status) status.textContent = sizeName(n);
    }),
  ];
  return () => { offs.forEach((o) => o()); clearInterval(timer); };
}
