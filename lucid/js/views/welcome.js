// Welcome: what Lucid is, in one screen, with the dual-legend keyboard as its proof.
import { html, render, on } from '../core/util.js';
import { tt, setUiLang, uiLang } from '../core/i18n.js';
import { icon, brandMark } from '../ui/components.js';
import { configured } from '../core/api.js';

// Israeli keyboard (SI-1452): Latin legend and Hebrew legend on each key.
const ROWS = [
  [['Q', '/'], ['W', '׳'], ['E', 'ק'], ['R', 'ר'], ['T', 'א'], ['Y', 'ט'], ['U', 'ו'], ['I', 'ן'], ['O', 'ם'], ['P', 'פ']],
  [['A', 'ש'], ['S', 'ד'], ['D', 'ג'], ['F', 'כ'], ['G', 'ע'], ['H', 'י'], ['J', 'ח'], ['K', 'ל'], ['L', 'ך']],
  [['Z', 'ז'], ['X', 'ס'], ['C', 'ב'], ['V', 'ה'], ['B', 'נ'], ['N', 'מ'], ['M', 'צ']],
];
const WORD = 'LUCID';

export default async function welcome(el, ctx) {
  ctx.setTitle('');
  const draw = () => render(el, html`
    <div class="welcome">
      <div class="welcome-top">
        <span class="brand">${brandMark()}<span>Lucid</span></span>
        <div class="seg" role="group" aria-label="${tt('שפת הממשק', 'Interface language')}">
          <button type="button" data-lang="he" aria-pressed="${uiLang() === 'he'}" lang="he">עברית</button>
          <button type="button" data-lang="en" aria-pressed="${uiLang() === 'en'}" lang="en">English</button>
        </div>
      </div>
      <div class="welcome-main">
        <div class="stack-lg">
          <div>
            <h1>${tt('אנגלית, מהאות הראשונה ועד הטיעון הכי טוב שלך.', 'English, from your first letter to your best argument.')}</h1>
            <p class="lede">${tt(
              'שיעורים שנבנו לדוברי עברית, תרגול שמתאים את עצמו לטעויות שלך, אנגלית לטיול הבא, ומעבדת כתיבה שמלמדת אותך לתקן בעצמך.',
              'Lessons built for Hebrew speakers, practice that adapts to your mistakes, English for your next trip, and a writing lab that teaches you to fix your own writing.')}</p>
          </div>
          <div class="start-bar">
            <a class="key enter" href="#/start">${tt('בואו נתחיל', 'Get started')} ${icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next')}</a>
            ${configured() ? html`<a class="key ghost" href="#/account?mode=signin">${tt('כבר יש לי חשבון', 'I already have an account')}</a>` : ''}
          </div>
          <ul class="check-rows small muted">
            <li>${icon('check', { size: 16 })}<span>${tt('75 שיעורים, מאפס ועד C2, עם הסברים בעברית שנעלמים בהדרגה', '75 lessons from zero to C2, with Hebrew support that fades as you grow')}</span></li>
            <li>${icon('check', { size: 16 })}<span>${tt('30 מצבים אמיתיים: שדה תעופה, מלון, מסעדה, היכרויות וחירום', '30 real situations: airports, hotels, restaurants, meeting people, emergencies')}</span></li>
            <li>${icon('check', { size: 16 })}<span>${tt('בלי פרסומות, בלי לחץ של רצפים, ורמה שנמדדת לפי מה שאתם יודעים לעשות', 'No ads, no streak pressure, and a level based on what you can actually do')}</span></li>
          </ul>
        </div>
        <div class="keyboard" role="img" aria-label="${tt('מקלדת עם אותיות באנגלית ובעברית על כל מקש', 'A keyboard with an English and a Hebrew letter on every key')}">
          ${ROWS.map((row) => html`<div class="krow">${row.map(([l, h]) => html`<span class="kc" data-k="${l}"><span class="kl">${l}</span><span class="kh">${h}</span></span>`)}</div>`)}
          <div class="krow"><span class="kc wide" style="height:2.6rem"></span></div>
        </div>
      </div>
      <p class="xsmall faint" style="text-align:center;padding:var(--s4)">${tt('הרמות ב-Lucid הן הערכה לפי מתארי CEFR, לא תעודה רשמית.', 'Lucid levels are estimates aligned to CEFR descriptors, not official certificates.')}</p>
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

  const off = on(el, 'click', '[data-lang]', (e, b) => {
    setUiLang(b.dataset.lang);
    try { sessionStorage.setItem('lucid-ui-lang', b.dataset.lang); } catch { /* ignore */ }
    clearInterval(timer);
    draw();
  });
  return () => { off(); clearInterval(timer); };
}
