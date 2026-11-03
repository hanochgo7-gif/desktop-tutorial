// Onboarding = registration for device-only use: language, name, age (16+), goals, starting point,
// daily time, privacy. Then the placement test (or straight to lesson one for complete beginners).
// The age gate asks for the year neutrally and states the rule only after a refusal, on its own screen;
// a refusal holds for 24 hours in this browser, across tabs, so another year cannot simply be tried (P-10,
// persona panel N10). Only the time of the refusal is kept (local storage), never the year or anything else.
// Age is computed from the year alone, because only the year is stored: someone born late in the year
// counts as a year older from January (a deliberate trade-off, also in privacy.html).
// Forms that keyboards and screen readers can use (TF-6): each step opens with focus on its heading; an error
// sits under its field, is tied to it (aria-describedby, aria-invalid) and takes the focus; radio groups are
// named by their question and move with the arrow keys; multi-choice cards carry a square check, single-choice
// cards a round dot. AI consent is asked only where AI exists (TF-7).
import { html, render, on, $ } from '../core/util.js';
import { tt, setUiLang, uiLang, isolateLatin } from '../core/i18n.js';
import { icon, brandMark } from '../ui/components.js';
import { saveProfile, saveSettings, applyPlacement } from '../core/learner.js';
import { zeroResult } from '../core/placement.js';
import { configured } from '../core/api.js';
import { content } from '../core/content.js';
import { CONFIG } from '../../config.js';
import { TEXT_SIZES, applyTextSize, chooseTextSize, currentTextSize } from './welcome.js';

// Each goal says what it changes (adaptive.dailyPlan: GOAL_KINDS, SCENARIO_MODULES). The work note depends on
// whether workplace scenarios exist yet. Profile uses the same cards and labels (goalCards).
export const GOALS = [
  ['travel', 'טיולים ונסיעות לחו״ל', 'Travel', 'תרחישים מנסיעה: שדה תעופה, מלון, מקרי חירום', 'Real travel situations: airport, hotel, emergencies'],
  ['work', 'עבודה ושיחות מקצועיות', 'Work', 'תרחישים מהעבודה', 'Workplace situations'],
  ['studies', 'בגרות, פסיכומטרי ולימודים אקדמיים', 'Exams and university', 'קריאה וכתיבה', 'Reading and writing'],
  ['conversation', 'ביטחון בשיחה', 'Confidence in conversation', 'שיחות מהחיים, ברמה שלכם', 'Real-life conversations at your level'],
  ['writing', 'כתיבה אקדמית וטיעונית', 'Academic and argumentative writing', 'משימות ממעבדת הכתיבה, וקריאה', 'Writing lab tasks, and reading'],
  ['everyday', 'אנגלית ליום-יום, סדרות ורשת', 'Everyday English, shows and the internet', 'דיבור וכתיבה לסירוגין', 'Speaking and writing in turn'],
];
const NO_WORK = ['עוד אין ב-Lucid תוכן לעבודה, אז כרגע אין לזה השפעה על התוכנית', 'Lucid has no workplace content yet, so for now this does not change the plan'];
const START = [
  ['zero', 'אני לא יודע/ת אנגלית בכלל', 'I don\'t know any English', 'נתחיל מהאותיות. בלי מבחן.', 'We start with the letters. No test.'],
  ['basics', 'אני מכיר/ה קצת: מילים ומשפטים פשוטים', 'I know some basics: words and simple sentences', 'מבחן קצר יתחיל מהבסיס.', 'A short test starts from the basics.'],
  ['conversations', 'אני מסתדר/ת בשיחות פשוטות', 'I can manage simple conversations', '', ''],
  ['comfortable', 'אני די בנוח/ה: קורא/ת וכותב/ת לא רע', 'I\'m fairly comfortable reading and writing', '', ''],
  ['advanced', 'אני מתקדם/ת ורוצה לשפר כתיבה וטיעון', 'I\'m advanced and want better writing and argument', '', ''],
];
const MINUTES = [[10, 'קצר וקל', 'Light'], [20, 'רגיל', 'Regular'], [35, 'רציני', 'Serious'], [50, 'אינטנסיבי', 'Intensive']];

// The visual check (square, several choices) or dot (round, one choice), on the first line of its card.
const checkMark = () => html`<span class="ob-mark check" aria-hidden="true">${icon('check', { size: 16 })}</span>`;
const radioMark = () => html`<span class="ob-mark radio" aria-hidden="true"></span>`;

// The goal cards, shared with Profile so both screens show one design and one set of labels (TF-6).
export function goalCards(chosen = [], { hasWork = true, labelledby = '' } = {}) {
  return html`<div class="choice-list ob-choices" role="group" ${labelledby ? html`aria-labelledby="${labelledby}"` : ''}>${GOALS.map(([id, he, en, nhe, nen]) => html`<button type="button" class="choice" data-goal="${id}" aria-pressed="${String(chosen.includes(id))}">${checkMark()}<span class="grow"><span>${tt(he, en)}</span><span class="choice-note">${id === 'work' && !hasWork ? tt(...NO_WORK) : tt(nhe, nen)}</span></span></button>`)}</div>`;
}

// Radio groups move with the arrow keys and are one Tab stop (roving tabindex), as the radio role promises.
export function radioKeys(e) {
  const r = e.target.closest?.('[role="radio"]');
  const group = r?.closest('[role="radiogroup"]');
  if (!group) return;
  const radios = [...group.querySelectorAll('[role="radio"]')];
  const rtl = document.documentElement.dir === 'rtl';
  const nextKeys = ['ArrowDown', rtl ? 'ArrowLeft' : 'ArrowRight'];
  const prevKeys = ['ArrowUp', rtl ? 'ArrowRight' : 'ArrowLeft'];
  let i = radios.indexOf(r);
  if (nextKeys.includes(e.key)) i = (i + 1) % radios.length;
  else if (prevKeys.includes(e.key)) i = (i - 1 + radios.length) % radios.length;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = radios.length - 1;
  else return;
  e.preventDefault();
  radios[i].click();
  radios[i].focus();
}
// Marks the chosen radio and keeps exactly one radio of the group in the Tab order.
function choose(group, chosen) {
  const radios = [...group.querySelectorAll('[role="radio"]')];
  radios.forEach((x) => { x.setAttribute('aria-checked', String(x === chosen)); x.tabIndex = x === chosen ? 0 : -1; });
  if (!chosen && radios[0]) radios[0].tabIndex = 0;
}
const tabFor = (checked, i, anyChecked) => (checked || (!anyChecked && i === 0) ? 0 : -1);

export default async function onboarding(el, ctx) {
  ctx.setTitle(tt('התחלה', 'Getting started'));
  const year = new Date().getFullYear();
  const hasWork = Boolean((await content.scenarios().catch(() => null))?.scenarios?.some((x) => x.module === 'work'));
  // AI consent is asked only where AI can work: with accounts and the AI service switched on (TF-7).
  const aiAvailable = configured() && CONFIG.aiEnabled;
  const data = { ui_language: uiLang(), name: '', birth_year: '', goals: [], start: '', daily_minutes: 20, weekly_goal_days: 5, ai_consent: false, terms: false, text_size: currentTextSize() };
  // The language and text size chosen on Welcome or earlier in this session (a reload keeps both, TF-1).
  try { const l = sessionStorage.getItem('lucid-ui-lang'); if (l) { data.ui_language = l; setUiLang(l); } } catch { /* ignore */ }
  applyTextSize(data.text_size);
  let step = 0;
  let error = null; // { field: 'year' | 'start' | 'terms', msg }
  const STEPS = 4;
  const REFUSED = 'lucid-age-refused';
  const HOLD_MS = 24 * 60 * 60 * 1000;
  let refused = false;
  try {
    const at = Number(localStorage.getItem(REFUSED));
    refused = at > 0 && Date.now() - at < HOLD_MS && at <= Date.now() + 60_000;
    if (!refused && localStorage.getItem(REFUSED) != null) localStorage.removeItem(REFUSED);
  } catch { /* storage blocked: this page load only */ }

  const age = () => (data.birth_year ? year - Number(data.birth_year) : null);
  const nextIcon = () => icon(uiLang() === 'he' ? 'arrow-back' : 'arrow-next');
  // The message sits directly under its field and is part of the field's description.
  const errFor = (field) => (error?.field === field ? html`<p class="error-text field-error" id="ob-err">${icon('alert', { size: 16 })}<span>${error.msg}</span></p>` : '');
  const invalid = (field) => (error?.field === field ? html`aria-invalid="true"` : '');
  const described = (field, ...ids) => [...ids, error?.field === field ? 'ob-err' : ''].filter(Boolean).join(' ');

  function body() {
    switch (step) {
      case 0: return html`
        <h1 id="ob-h" tabindex="-1">${tt('נעים להכיר', 'Nice to meet you')}</h1>
        <p class="muted">${tt('כמה שאלות קצרות כדי להתאים את Lucid אליכם. אפשר לשנות הכול אחר כך.', 'A few quick questions to fit Lucid to you. You can change everything later.')}</p>
        <div class="ob-prefs">
          <div class="field"><span class="label" id="ob-ui-l">${tt('שפת הממשק', 'Interface language')}</span>
            <div class="seg" role="group" aria-labelledby="ob-ui-l"><button type="button" data-ui="he" aria-pressed="${String(data.ui_language === 'he')}" lang="he">עברית</button><button type="button" data-ui="en" aria-pressed="${String(data.ui_language === 'en')}" lang="en">English</button></div>
            <span class="help">${tt('ממליצים על עברית בהתחלה. כשהרמה עולה, Lucid יציע לעבור לאנגלית.', 'Hebrew is recommended at first; Lucid will suggest switching to English as your level rises.')}</span></div>
          <div class="field"><span class="label" id="ob-size-l">${tt('גודל טקסט', 'Text size')}</span>
            <div class="seg" role="group" aria-labelledby="ob-size-l">${TEXT_SIZES.map((n) => html`<button type="button" data-size="${n}" aria-pressed="${String(data.text_size === n)}"><span class="num">${n}%</span></button>`)}</div>
            <span class="help">${tt('משתנה מיד. אפשר לשנות גם אחר כך בהגדרות.', 'Changes at once. You can also change it later in Settings.')}</span></div>
        </div>
        <div class="field"><label for="ob-name">${tt('איך לקרוא לכם? (לא חובה)', 'What should we call you? (optional)')}</label>
          <input class="input" id="ob-name" name="name" maxlength="40" autocomplete="given-name" value="${data.name}"></div>
        <div class="field"><label for="ob-year">${tt('שנת לידה', 'Year of birth')}</label>
          <select class="input" id="ob-year" name="birth_year" required aria-describedby="${described('year', 'ob-year-help')}" ${invalid('year')}>
            <option value="">${tt('בחירה', 'Choose')}</option>
            ${Array.from({ length: 90 }, (_, i) => year - 10 - i).map((y) => html`<option value="${y}" ${String(y) === String(data.birth_year) ? html`selected` : ''}>${y}</option>`)}
          </select>
          ${errFor('year')}
          <span class="help" id="ob-year-help">${tt('שומרים רק את השנה, לא תאריך מלא.', 'Only the year is stored, not the full date.')}</span></div>`;
      case 1: {
        const anyMin = MINUTES.some(([m]) => m === data.daily_minutes);
        return html`
        <h1 id="ob-h" tabindex="-1">${tt('בשביל מה האנגלית?', 'What do you need English for?')}</h1>
        <p class="muted">${tt('אפשר לבחור כמה מטרות, או אף אחת. התוכנית היומית מוסיפה תרגול לפי המטרות שבחרתם.', 'Choose any number of goals, or none. Your daily plan adds practice that matches them.')}</p>
        ${goalCards(data.goals, { hasWork, labelledby: 'ob-h' })}
        <h2 id="ob-min-h" class="ob-h2">${tt('כמה זמן ביום?', 'How much time a day?')}</h2>
        <p class="muted">${tt('תוכנית היום תתאים את עצמה לזמן הזה. ימים קצרים זה בסדר גמור.', 'Your daily plan fits this time. Short days are completely fine.')}</p>
        <div class="choice-list ob-choices" role="radiogroup" aria-labelledby="ob-min-h" aria-describedby="ob-min-note">${MINUTES.map(([m, he, en], i) => html`<button type="button" class="choice" role="radio" data-min="${m}" aria-checked="${String(data.daily_minutes === m)}" tabindex="${tabFor(data.daily_minutes === m, i, anyMin)}">${radioMark()}<span class="grow">${tt(he, en)}</span><span class="num faint">${m} ${tt('דק׳', 'min')}</span></button>`)}</div>
        <p class="help ob-note" id="ob-min-note">${isolateLatin(tt('ב-10 דקות: שיעור וחזרה. ההצעות לפי המטרות מתחילות מרמה A1, ומ-20 דקות הן בתוך התוכנית.', 'In 10 minutes: a lesson and a review. Suggestions from your goals start at A1, and from 20 minutes they are inside the plan.'))}</p>
        <div class="field"><label for="ob-days">${tt('יעד שבועי: כמה ימים בשבוע?', 'Weekly goal: how many days a week?')}</label>
          <select class="input" id="ob-days" name="weekly_goal_days" aria-describedby="ob-days-help">${[2, 3, 4, 5, 6, 7].map((d) => html`<option value="${d}" ${d === data.weekly_goal_days ? html`selected` : ''}>${d}</option>`)}</select>
          <span class="help" id="ob-days-help">${tt('אין רצף שנשבר: יום חופש לא מוחק שום דבר.', 'There is no streak to break: a day off erases nothing.')}</span></div>`;
      }
      case 2: {
        const anyStart = START.some(([id]) => id === data.start);
        return html`
        <h1 id="ob-h" tabindex="-1">${tt('מאיפה מתחילים?', 'Where are you starting from?')}</h1>
        <p class="muted" id="ob-start-help">${tt('זו רק נקודת פתיחה. מבחן מיקום קצר (כ-10 דקות) יבדוק בפועל.', 'This is only a starting point; a short placement test (about 10 minutes) checks it for real.')}</p>
        <div class="choice-list ob-choices" role="radiogroup" aria-labelledby="ob-h" aria-describedby="${described('start', 'ob-start-help')}" ${invalid('start')}>${START.map(([id, he, en, nhe, nen], i) => html`<button type="button" class="choice" role="radio" data-start="${id}" aria-checked="${String(data.start === id)}" tabindex="${tabFor(data.start === id, i, anyStart)}">${radioMark()}<span class="grow"><span>${tt(he, en)}</span>${nhe ? html`<span class="choice-note">${tt(nhe, nen)}</span>` : ''}</span></button>`)}</div>
        ${errFor('start')}`;
      }
      default: return html`
        <h1 id="ob-h" tabindex="-1">${tt('פרטיות, בקצרה', 'Privacy, briefly')}</h1>
        <div class="stack-sm small">
          <p>${tt('ההתקדמות שלכם נשמרת במכשיר הזה. אין פרסומות ואין מכירת מידע.', 'Your progress is saved on this device. No ads, no selling data.')}</p>
          ${configured() ? html`<p>${tt('אפשר לפתוח חשבון כדי לסנכרן בין מכשירים, עכשיו או אחר כך.', 'You can create an account to sync across devices, now or later.')}</p>` : ''}
          <p>${tt('בכל רגע אפשר להוריד את כל המידע שלכם או למחוק אותו בהגדרות.', 'You can download or delete all your data in Settings at any time.')}</p>
          <p>${isolateLatin(tt('בתרגילי דיבור אפשר להשתמש במיקרופון, אבל לא חייבים. את זיהוי הדיבור עושה הדפדפן (ב-Chrome וב-Edge, שירות מקוון של יצרן הדפדפן); Lucid מקבל רק את הטקסט ולא מקליט את הקול.', 'Speaking exercises can use the microphone, but you don\'t have to. Your browser does the speech recognition (in Chrome and Edge, the browser maker\'s online service); Lucid gets only the text and never records your voice.'))}</p>
          ${!aiAvailable ? html`<p class="ob-ai-off">${icon('info', { size: 16 })}<span>${isolateLatin(tt('AI לא פעיל באתר הזה. כל השאר עובד. אם יתווסף, נשאל קודם.', 'AI is not active on this site. Everything else works. If it is added, we will ask first.'))}</span></p>` : ''}
          ${age() != null && age() < 18 ? html`<p class="banner">${icon('info', { size: 18 })}<span>${isolateLatin(aiAvailable
            ? tt('מתחת לגיל 18: Lucid לא שולח שיווק לאף אחד, ובחשבון השרת חוסם הסכמה לשיווק. כל שאר ברירות המחדל זהות לכולם, למשל משוב AI כבוי עד שמפעילים אותו.', 'Under 18: Lucid sends no marketing to anyone, and for accounts the server blocks marketing consent. Every other default is the same for everyone; for example, AI feedback stays off until you turn it on.')
            : tt('מתחת לגיל 18: Lucid לא שולח שיווק לאף אחד. כל שאר ברירות המחדל זהות לכולם.', 'Under 18: Lucid sends no marketing to anyone. Every other default is the same for everyone.'))}</span></p>` : ''}
        </div>
        ${aiAvailable ? html`<div class="ob-check">
          <label class="choice"><input type="checkbox" name="ai_consent" aria-describedby="ob-ai-details" ${data.ai_consent ? html`checked` : ''}><span class="grow">${isolateLatin(tt('לאפשר משוב AI (אפשר לשנות בהגדרות)', 'Allow AI feedback (you can change this in Settings)'))}</span></label>
          <p class="help" id="ob-ai-details">${isolateLatin(tt('בכתיבה, בשיחות ובמורה, צריך חשבון. הטקסטים שתשלחו, עם הרמה וההגדרות שלכם, ובמורה גם המטרות והטעויות החוזרות, יישלחו לספק ה-AI (Anthropic) רק כדי ליצור את התשובה. לא נשלחים שם, דוא״ל או שנת לידה.', 'For writing, conversations and the tutor; needs an account. The texts you send, with your level and settings, and for the tutor also your goals and recurring mistakes, go to the AI provider (Anthropic) only to produce the response. Your name, email and birth year are not sent.'))}</p></div>` : ''}
        <div class="ob-check">
          <label class="choice"><input type="checkbox" name="terms" required aria-describedby="${described('terms', 'ob-terms-help')}" ${invalid('terms')} ${data.terms ? html`checked` : ''}><span class="grow">${tt('קראתי ואני מסכים/ה לתנאים ולמדיניות הפרטיות', 'I have read and agree to the terms and privacy policy')}</span></label>
          ${errFor('terms')}
          <p class="help" id="ob-terms-help"><a href="privacy.html" target="_blank" rel="noopener">${tt('לקריאת התנאים ומדיניות הפרטיות (בחלון חדש)', 'Read the terms and privacy policy (opens in a new window)')}</a></p></div>`;
    }
  }

  // A refusal is its own screen, not an editable form.
  function drawRefused() {
    render(el, html`<div class="onboard stack" role="alert">
      <a class="brand" href="#/welcome">${brandMark()}<span>Lucid</span></a>
      <h1 tabindex="-1">${tt('עדיין אי אפשר להירשם', 'You can\'t register yet')}</h1>
      <p>${tt('תודה שרציתם ללמוד איתנו. Lucid מיועד לגילאי 16 ומעלה, ולכן עדיין אי אפשר להירשם. נשמח לראות אתכם כשתגיעו לגיל 16.', 'Thank you for wanting to learn with Lucid. Lucid is for learners aged 16 and over, so you can\'t register yet. We\'d be glad to see you when you turn 16.')}</p>
      <p class="small muted">${tt('לא שמרנו את שנת הלידה או פרט אחר עליכם. הדפדפן הזה זוכר רק שההרשמה לא אושרה, ורק למשך 24 שעות.', 'We did not save your year of birth or anything else about you. This browser only remembers that registration was refused, for 24 hours.')}</p>
      <div class="row"><a class="key" href="#/welcome">${tt('לדף הבית', 'Back to the home page')}</a></div>
    </div>`);
    el.querySelector('h1')?.focus();
  }

  // focus: 'heading' (a step opens), 'error' (the first invalid field) or null (keep it where the caller puts it).
  function draw(focus = 'heading') {
    if (refused) { drawRefused(); return; }
    render(el, html`
      <div class="onboard">
        <div class="row between" style="margin-block-end:var(--s5)"><a class="brand" href="#/welcome">${brandMark()}<span>Lucid</span></a><span class="step-count">${tt(`${step + 1} מתוך ${STEPS}`, `${step + 1} of ${STEPS}`)}</span></div>
        <div class="steps-dots" aria-hidden="true">${Array.from({ length: STEPS }, (_, i) => html`<span class="${i <= step ? 'on' : ''}"></span>`)}</div>
        <form class="stack" id="ob-form" novalidate>
          ${body()}
          <div class="row between" style="margin-block-start:var(--s6)">
            ${step > 0 ? html`<button type="button" class="key ghost" data-back>${icon(uiLang() === 'he' ? 'arrow-next' : 'arrow-back')} ${tt('הקודם', 'Previous')}</button>` : html`<span></span>`}
            <button type="submit" class="key enter">${step === STEPS - 1 ? tt('סיום והתחלה', 'Finish and start') : tt('המשך', 'Continue')} ${nextIcon()}</button>
          </div>
        </form>
      </div>`);
    if (focus === 'error') {
      const target = { year: '#ob-year', start: '[data-start][tabindex="0"]', terms: 'input[name=terms]' }[error?.field];
      el.querySelector(target)?.focus();
    } else if (focus === 'heading') el.querySelector('#ob-h')?.focus();
  }

  function collect() {
    const f = $('#ob-form', el);
    if (!f) return;
    if (f.name) data.name = f.name.value.trim();
    if (f.birth_year) data.birth_year = f.birth_year.value;
    if (f.weekly_goal_days) data.weekly_goal_days = Number(f.weekly_goal_days.value);
    if (f.ai_consent) data.ai_consent = f.ai_consent.checked;
    if (f.terms) data.terms = f.terms.checked;
  }

  function validate() {
    if (step === 0) {
      if (!data.birth_year) return { field: 'year', msg: tt('בחרו שנת לידה.', 'Choose your year of birth.') };
      if (age() < 16) return 'refused';
    }
    if (step === 2 && !data.start) return { field: 'start', msg: tt('בחרו נקודת פתיחה.', 'Choose a starting point.') };
    if (step === 3 && !data.terms) return { field: 'terms', msg: tt('כדי להמשיך צריך לאשר את התנאים.', 'Please accept the terms to continue.') };
    return null;
  }

  async function finish() {
    const minor = age() < 18;
    saveProfile({ onboarded: true, created_at: new Date().toISOString(), name: data.name, birth_year: Number(data.birth_year), minor, ui_language: data.ui_language, goals: data.goals, start_choice: data.start, consent_terms_at: new Date().toISOString() });
    const ai = aiAvailable && data.ai_consent;
    saveSettings({ daily_minutes: data.daily_minutes, weekly_goal_days: data.weekly_goal_days, text_size: data.text_size, ai_consent: ai, ai_consent_at: ai ? new Date().toISOString() : null, marketing: false });
    if (data.start === 'zero') {
      await applyPlacement(zeroResult());
      ctx.navigate('lesson/pa1-01');
    } else {
      ctx.navigate(`placement?start=${data.start}`);
    }
  }

  draw();
  const offs = [
    on(el, 'click', '[data-ui]', (e, b) => {
      collect(); data.ui_language = b.dataset.ui; setUiLang(b.dataset.ui);
      try { sessionStorage.setItem('lucid-ui-lang', b.dataset.ui); } catch { /* ignore */ }
      draw(null); el.querySelector(`[data-ui="${b.dataset.ui}"]`)?.focus();
    }),
    // Text size applies at once, without redrawing the form, and is kept for this session (TF-1). The key just
    // tapped stays where the finger is (TP-11): the text above it grows, so the page scrolls by as much.
    on(el, 'click', '[data-size]', (e, b) => {
      const before = b.getBoundingClientRect().top;
      data.text_size = Number(b.dataset.size);
      chooseTextSize(data.text_size);
      el.querySelectorAll('[data-size]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const moved = b.getBoundingClientRect().top - before;
      if (Math.abs(moved) >= 1) globalThis.scrollBy?.({ top: moved, behavior: 'instant' });
    }),
    on(el, 'click', '[data-goal]', (e, b) => { const g = b.dataset.goal; data.goals = data.goals.includes(g) ? data.goals.filter((x) => x !== g) : [...data.goals, g]; b.setAttribute('aria-pressed', String(data.goals.includes(g))); }),
    on(el, 'click', '[data-start]', (e, b) => {
      data.start = b.dataset.start; choose(b.closest('[role="radiogroup"]'), b);
      // Choosing clears the error that asked for it.
      if (error?.field === 'start') { error = null; const g = b.closest('[role="radiogroup"]'); g.removeAttribute('aria-invalid'); g.setAttribute('aria-describedby', 'ob-start-help'); el.querySelector('#ob-err')?.remove(); }
    }),
    on(el, 'click', '[data-min]', (e, b) => { data.daily_minutes = Number(b.dataset.min); choose(b.closest('[role="radiogroup"]'), b); }),
    // A corrected field drops its error at once, without moving the focus.
    on(el, 'change', '#ob-year, input[name=terms]', (e, f) => {
      const field = f.id === 'ob-year' ? 'year' : 'terms';
      if (error?.field !== field || (field === 'year' ? !f.value : !f.checked)) return;
      error = null;
      f.removeAttribute('aria-invalid');
      f.setAttribute('aria-describedby', field === 'year' ? 'ob-year-help' : 'ob-terms-help');
      el.querySelector('#ob-err')?.remove();
    }),
    on(el, 'keydown', '[role="radio"]', (e) => radioKeys(e)),
    on(el, 'click', '[data-back]', () => { collect(); error = null; step = Math.max(0, step - 1); draw(); }),
    on(el, 'submit', '#ob-form', async (e) => {
      e.preventDefault();
      collect();
      const v = validate();
      if (v === 'refused') {
        refused = true; error = null; data.birth_year = '';
        try { localStorage.setItem(REFUSED, String(Date.now())); } catch { /* this page load only */ }
        draw(); return;
      }
      error = v;
      if (error) { draw('error'); return; }
      if (step < STEPS - 1) { step++; draw(); return; }
      await finish();
    }),
  ];
  return () => offs.forEach((o) => o());
}
