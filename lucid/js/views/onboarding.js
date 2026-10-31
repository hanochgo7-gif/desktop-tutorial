// Onboarding = registration for device-only use: language, name, age (16+), goals, starting point,
// daily time, privacy. Then the placement test (or straight to lesson one for complete beginners).
// The age gate asks for the year neutrally and states the rule only after a refusal, on its own screen;
// a refusal holds for 24 hours in this browser, across tabs, so another year cannot simply be tried (P-10,
// persona panel N10). Only the time of the refusal is kept (local storage), never the year or anything else.
// Age is computed from the year alone, because only the year is stored: someone born late in the year
// counts as a year older from January (a deliberate trade-off, also in privacy.html).
import { html, render, on, $ } from '../core/util.js';
import { tt, setUiLang, uiLang } from '../core/i18n.js';
import { icon, brandMark } from '../ui/components.js';
import { saveProfile, saveSettings, applyPlacement } from '../core/learner.js';
import { zeroResult } from '../core/placement.js';
import { configured } from '../core/api.js';
import { content } from '../core/content.js';

// Each goal says what it changes today (adaptive.dailyPlan: GOAL_KINDS, SCENARIO_MODULES). The work note
// depends on whether workplace scenarios exist yet.
const GOALS = [
  ['travel', 'טיולים ונסיעות לחו״ל', 'Travel', 'מצבים מנסיעה: שדה תעופה, מלון, מקרי חירום', 'Real travel situations: airport, hotel, emergencies'],
  ['work', 'עבודה ושיחות מקצועיות', 'Work', 'מצבים מהעבודה', 'Workplace situations'],
  ['studies', 'בגרות, פסיכומטרי ולימודים אקדמיים', 'Exams and university', 'קריאה וכתיבה', 'Reading and writing'],
  ['conversation', 'ביטחון בשיחה', 'Confidence in conversation', 'שיחות מהחיים, ברמה שלך', 'Real-life conversations at your level'],
  ['writing', 'כתיבה אקדמית וטיעונית', 'Academic and argumentative writing', 'משימות ממעבדת הכתיבה, וקריאה', 'Writing lab tasks, and reading'],
  ['everyday', 'אנגלית ליום-יום, סדרות ורשת', 'Everyday English, shows and the internet', 'לא משנה את התוכנית: דיבור וכתיבה לסירוגין', 'No change to the plan: speaking and writing in turn'],
];
const NO_WORK = ['עוד אין ב-Lucid תוכן לעבודה, אז כרגע זה משפיע רק על מורה ה-AI', 'Lucid has no workplace content yet, so for now this only shapes the AI tutor'];
const START = [
  ['zero', 'אני לא יודע/ת אנגלית בכלל', 'I don\'t know any English', 'נתחיל מהאותיות. בלי מבחן.', 'We start with the letters. No test.'],
  ['basics', 'אני מכיר/ה קצת: מילים ומשפטים פשוטים', 'I know some basics: words and simple sentences', 'מבחן קצר יתחיל מהבסיס.', 'A short test starts from the basics.'],
  ['conversations', 'אני מסתדר/ת בשיחות פשוטות', 'I can manage simple conversations', '', ''],
  ['comfortable', 'אני די בנוח/ה: קורא/ת וכותב/ת לא רע', 'I\'m fairly comfortable reading and writing', '', ''],
  ['advanced', 'אני מתקדם/ת ורוצה לשפר כתיבה וטיעון', 'I\'m advanced and want better writing and argument', '', ''],
];

export default async function onboarding(el, ctx) {
  ctx.setTitle(tt('התחלה', 'Getting started'));
  const year = new Date().getFullYear();
  const hasWork = Boolean((await content.scenarios().catch(() => null))?.scenarios?.some((x) => x.module === 'work'));
  const data = { ui_language: uiLang(), name: '', birth_year: '', goals: [], start: '', daily_minutes: 20, weekly_goal_days: 5, ai_consent: false, terms: false };
  try { const l = sessionStorage.getItem('lucid-ui-lang'); if (l) data.ui_language = l; } catch { /* ignore */ }
  let step = 0;
  let error = '';
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

  function body() {
    switch (step) {
      case 0: return html`
        <h1>${tt('נעים להכיר', 'Nice to meet you')}</h1>
        <p class="muted">${tt('כמה שאלות קצרות כדי להתאים את Lucid אליך. אפשר לשנות הכול אחר כך.', 'A few quick questions to fit Lucid to you. You can change everything later.')}</p>
        <div class="field"><span class="label">${tt('שפת הממשק', 'Interface language')}</span>
          <div class="seg" role="group"><button type="button" data-ui="he" aria-pressed="${data.ui_language === 'he'}" lang="he">עברית</button><button type="button" data-ui="en" aria-pressed="${data.ui_language === 'en'}" lang="en">English</button></div>
          <span class="help">${tt('ממליצים על עברית בהתחלה. כשהרמה עולה, Lucid יציע לעבור לאנגלית.', 'Hebrew is recommended at first; Lucid will suggest switching to English as your level rises.')}</span></div>
        <div class="field"><label for="ob-name">${tt('איך לקרוא לך? (לא חובה)', 'What should we call you? (optional)')}</label>
          <input class="input" id="ob-name" name="name" maxlength="40" autocomplete="given-name" value="${data.name}"></div>
        <div class="field"><label for="ob-year">${tt('שנת לידה', 'Year of birth')}</label>
          <select class="input" id="ob-year" name="birth_year" required aria-describedby="ob-year-help">
            <option value="">${tt('בחירה', 'Choose')}</option>
            ${Array.from({ length: 90 }, (_, i) => year - 10 - i).map((y) => html`<option value="${y}" ${String(y) === String(data.birth_year) ? html`selected` : ''}>${y}</option>`)}
          </select>
          <span class="help" id="ob-year-help">${tt('שומרים רק את השנה, לא תאריך מלא.', 'Only the year is stored, not the full date.')}</span></div>`;
      case 1: return html`
        <h1>${tt('בשביל מה האנגלית?', 'What do you need English for?')}</h1>
        <p class="muted">${tt('אפשר לבחור כמה. מרמה A1 ומ-20 דקות ביום, התוכנית היומית כוללת תרגול אחד לפי המטרות, ומורה ה-AI מתאים אליהן את הדוגמאות.', 'Choose any. From level A1 and 20 minutes a day, your daily plan includes one practice matched to your goals, and the AI tutor fits its examples to them.')}</p>
        <div class="choice-list" role="group">${GOALS.map(([id, he, en, nhe, nen]) => html`<button type="button" class="choice" data-goal="${id}" aria-pressed="${String(data.goals.includes(id))}"><span class="grow"><span>${tt(he, en)}</span><span class="xsmall faint" style="display:block">${id === 'work' && !hasWork ? tt(...NO_WORK) : tt(nhe, nen)}</span></span></button>`)}</div>
        <h2 style="font-size:var(--t-lg);margin-top:var(--s5)">${tt('כמה זמן ביום?', 'How much time a day?')}</h2>
        <p class="muted">${tt('תוכנית היום תתאים את עצמה לזמן הזה. ימים קצרים זה בסדר גמור.', 'Your daily plan fits this time. Short days are completely fine.')}</p>
        <div class="choice-list" role="radiogroup">${[[10, 'קצר וקל', 'Light'], [20, 'רגיל', 'Regular'], [35, 'רציני', 'Serious'], [50, 'אינטנסיבי', 'Intensive']].map(([m, he, en]) => html`<button type="button" class="choice" role="radio" data-min="${m}" aria-checked="${data.daily_minutes === m}"><span class="grow">${tt(he, en)}</span><span class="num faint">${m} ${tt('דק׳', 'min')}</span></button>`)}</div>
        <div class="field"><label for="ob-days">${tt('יעד שבועי: כמה ימים בשבוע?', 'Weekly goal: how many days a week?')}</label>
          <select class="input" id="ob-days" name="weekly_goal_days">${[2, 3, 4, 5, 6, 7].map((d) => html`<option value="${d}" ${d === data.weekly_goal_days ? html`selected` : ''}>${d}</option>`)}</select>
          <span class="help">${tt('אין רצף שנשבר: יום חופש לא מוחק שום דבר.', 'There is no streak to break: a day off erases nothing.')}</span></div>`;
      case 2: return html`
        <h1>${tt('מאיפה מתחילים?', 'Where are you starting from?')}</h1>
        <p class="muted">${tt('זו רק נקודת פתיחה. מבחן מיקום קצר (כ-10 דקות) יבדוק בפועל.', 'This is only a starting point; a short placement test (about 10 minutes) checks it for real.')}</p>
        <div class="choice-list" role="radiogroup">${START.map(([id, he, en, nhe, nen]) => html`<button type="button" class="choice" role="radio" data-start="${id}" aria-checked="${data.start === id}"><span class="grow"><span>${tt(he, en)}</span>${nhe ? html`<span class="xsmall faint" style="display:block">${tt(nhe, nen)}</span>` : ''}</span></button>`)}</div>`;
      default: return html`
        <h1>${tt('פרטיות, בקצרה', 'Privacy, briefly')}</h1>
        <div class="stack-sm small">
          <p>${tt('ההתקדמות שלך נשמרת במכשיר הזה. אין פרסומות ואין מכירת מידע.', 'Your progress is saved on this device. No ads, no selling data.')}</p>
          ${configured() ? html`<p>${tt('אפשר לפתוח חשבון כדי לסנכרן בין מכשירים, עכשיו או אחר כך.', 'You can create an account to sync across devices, now or later.')}</p>` : ''}
          <p>${tt('בכל רגע אפשר להוריד את כל המידע שלך או למחוק אותו בהגדרות.', 'You can download or delete all your data in Settings at any time.')}</p>
          <p>${tt('בתרגילי דיבור אפשר להשתמש במיקרופון, אבל לא חייבים. את זיהוי הדיבור עושה הדפדפן (ב-Chrome וב-Edge, שירות מקוון של יצרן הדפדפן); Lucid מקבל רק את הטקסט ולא מקליט את הקול.', 'Speaking exercises can use the microphone, but you don\'t have to. Your browser does the speech recognition (in Chrome and Edge, the browser maker\'s online service); Lucid gets only the text and never records your voice.')}</p>
          ${age() != null && age() < 18 ? html`<p class="banner">${icon('info', { size: 18 })}<span>${tt('מתחת לגיל 18: Lucid לא שולח שיווק לאף אחד, ובחשבון השרת חוסם הסכמה לשיווק. כל שאר ברירות המחדל זהות לכולם, למשל משוב AI כבוי עד שמפעילים אותו.', 'Under 18: Lucid sends no marketing to anyone, and for accounts the server blocks marketing consent. Every other default is the same for everyone; for example, AI feedback stays off until you turn it on.')}</span></p>` : ''}
        </div>
        <label class="choice"><input type="checkbox" name="ai_consent" ${data.ai_consent ? html`checked` : ''}><span class="grow small">${tt('לאפשר משוב AI (כתיבה, שיחות, מורה; צריך חשבון). הטקסטים שתשלחו, עם הרמה וההגדרות שלכם, ובמורה גם המטרות והטעויות החוזרות, יישלחו לספק ה-AI (Anthropic) רק כדי ליצור את התשובה. לא נשלחים שם, דוא״ל או שנת לידה. אפשר לשנות בהגדרות.', 'Allow AI feedback (writing, conversations, tutor; needs an account). The texts you send, with your level and settings, and for the tutor also your goals and recurring mistakes, go to the AI provider (Anthropic) only to produce the response. Your name, email and birth year are not sent. You can change this in Settings.')}</span></label>
        <label class="choice"><input type="checkbox" name="terms" ${data.terms ? html`checked` : ''} required><span class="grow small">${tt('קראתי ואני מסכים/ה לתנאים ולמדיניות הפרטיות.', 'I have read and agree to the terms and privacy policy.')} <a href="privacy.html" target="_blank" rel="noopener">${tt('לקריאה', 'Read')}</a></span></label>`;
    }
  }

  // A refusal is its own screen, not an editable form.
  function drawRefused() {
    render(el, html`<div class="onboard stack" role="alert">
      <a class="brand" href="#/welcome">${brandMark()}<span>Lucid</span></a>
      <h1 tabindex="-1">${tt('עדיין אי אפשר להירשם', 'You can\'t register yet')}</h1>
      <p>${tt('תודה שרצית ללמוד איתנו. Lucid מיועד לגילאי 16 ומעלה, ולכן עדיין אי אפשר להירשם. נשמח לראות אותך כשתגיע/י לגיל 16.', 'Thank you for wanting to learn with Lucid. Lucid is for learners aged 16 and over, so you can\'t register yet. We\'d be glad to see you when you turn 16.')}</p>
      <p class="small muted">${tt('לא שמרנו את שנת הלידה או פרט אחר עליך. הדפדפן הזה זוכר רק שההרשמה לא אושרה, ורק למשך 24 שעות.', 'We did not save your year of birth or anything else about you. This browser only remembers that registration was refused, for 24 hours.')}</p>
      <div class="row"><a class="key" href="#/welcome">${tt('לדף הבית', 'Back to the home page')}</a></div>
    </div>`);
    el.querySelector('h1')?.focus();
  }

  function draw() {
    if (refused) { drawRefused(); return; }
    render(el, html`
      <div class="onboard">
        <div class="row between" style="margin-block-end:var(--s5)"><a class="brand" href="#/welcome">${brandMark()}<span>Lucid</span></a><span class="step-count">${tt(`${step + 1} מתוך ${STEPS}`, `${step + 1} of ${STEPS}`)}</span></div>
        <div class="steps-dots" aria-hidden="true">${Array.from({ length: STEPS }, (_, i) => html`<span class="${i <= step ? 'on' : ''}"></span>`)}</div>
        <form class="stack" id="ob-form" novalidate>
          ${body()}
          ${error ? html`<p class="error-text" role="alert">${error}</p>` : ''}
          <div class="row between" style="margin-block-start:var(--s6)">
            ${step > 0 ? html`<button type="button" class="key ghost" data-back>${tt('חזרה', 'Back')}</button>` : html`<span></span>`}
            <button type="submit" class="key enter">${step === STEPS - 1 ? tt('סיום והתחלה', 'Finish and start') : tt('המשך', 'Continue')} ${nextIcon()}</button>
          </div>
        </form>
      </div>`);
    el.querySelector('h1')?.focus?.();
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
      if (!data.birth_year) return tt('בחרו שנת לידה.', 'Choose your year of birth.');
      if (age() < 16) return 'refused';
    }
    if (step === 2 && !data.start) return tt('בחרו נקודת פתיחה.', 'Choose a starting point.');
    if (step === 3 && !data.terms) return tt('כדי להמשיך צריך לאשר את התנאים.', 'Please accept the terms to continue.');
    return '';
  }

  async function finish() {
    const minor = age() < 18;
    saveProfile({ onboarded: true, created_at: new Date().toISOString(), name: data.name, birth_year: Number(data.birth_year), minor, ui_language: data.ui_language, goals: data.goals, start_choice: data.start, consent_terms_at: new Date().toISOString() });
    saveSettings({ daily_minutes: data.daily_minutes, weekly_goal_days: data.weekly_goal_days, ai_consent: data.ai_consent, ai_consent_at: data.ai_consent ? new Date().toISOString() : null, marketing: false });
    if (data.start === 'zero') {
      await applyPlacement(zeroResult());
      ctx.navigate('lesson/pa1-01');
    } else {
      ctx.navigate(`placement?start=${data.start}`);
    }
  }

  draw();
  const offs = [
    on(el, 'click', '[data-ui]', (e, b) => { collect(); data.ui_language = b.dataset.ui; setUiLang(b.dataset.ui); draw(); }),
    on(el, 'click', '[data-goal]', (e, b) => { const g = b.dataset.goal; data.goals = data.goals.includes(g) ? data.goals.filter((x) => x !== g) : [...data.goals, g]; b.setAttribute('aria-pressed', String(data.goals.includes(g))); }),
    on(el, 'click', '[data-start]', (e, b) => { data.start = b.dataset.start; el.querySelectorAll('[data-start]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }),
    on(el, 'click', '[data-min]', (e, b) => { data.daily_minutes = Number(b.dataset.min); el.querySelectorAll('[data-min]').forEach((x) => x.setAttribute('aria-checked', String(x === b))); }),
    on(el, 'click', '[data-back]', () => { collect(); error = ''; step = Math.max(0, step - 1); draw(); }),
    on(el, 'submit', '#ob-form', async (e) => {
      e.preventDefault();
      collect();
      error = validate();
      if (error === 'refused') {
        refused = true; error = ''; data.birth_year = '';
        try { localStorage.setItem(REFUSED, String(Date.now())); } catch { /* this page load only */ }
        draw(); return;
      }
      if (error) { draw(); return; }
      if (step < STEPS - 1) { step++; draw(); return; }
      await finish();
    }),
  ];
  return () => offs.forEach((o) => o());
}
