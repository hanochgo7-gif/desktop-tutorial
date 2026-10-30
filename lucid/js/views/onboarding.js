// Onboarding = registration for device-only use: language, name, age (16+), goals, starting point,
// daily time, privacy. Then the placement test (or straight to lesson one for complete beginners).
import { html, render, on, $ } from '../core/util.js';
import { tt, setUiLang, uiLang } from '../core/i18n.js';
import { icon, brandMark } from '../ui/components.js';
import { saveProfile, saveSettings, applyPlacement } from '../core/learner.js';
import { zeroResult } from '../core/placement.js';
import { configured } from '../core/api.js';

const GOALS = [
  ['travel', 'טיולים ונסיעות לחו״ל', 'Travel'],
  ['work', 'עבודה ושיחות מקצועיות', 'Work'],
  ['studies', 'בגרות, פסיכומטרי ולימודים אקדמיים', 'Exams and university'],
  ['conversation', 'ביטחון בשיחה', 'Confidence in conversation'],
  ['writing', 'כתיבה אקדמית וטיעונית', 'Academic and argumentative writing'],
  ['everyday', 'אנגלית ליום-יום, סדרות ורשת', 'Everyday English, shows and the internet'],
];
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
  const data = { ui_language: uiLang(), name: '', birth_year: '', goals: [], start: '', daily_minutes: 20, weekly_goal_days: 5, ai_consent: false, terms: false };
  try { const l = sessionStorage.getItem('lucid-ui-lang'); if (l) data.ui_language = l; } catch { /* ignore */ }
  let step = 0;
  let error = '';
  const STEPS = 4;

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
          <span class="help" id="ob-year-help">${tt('Lucid מיועד לגילאי 16 ומעלה. שומרים רק את שנת הלידה.', 'Lucid is for ages 16 and up. Only the year is stored.')}</span></div>`;
      case 1: return html`
        <h1>${tt('בשביל מה האנגלית?', 'What do you need English for?')}</h1>
        <p class="muted">${tt('אפשר לבחור כמה. זה משפיע על הדוגמאות וההמלצות.', 'Choose any. This shapes examples and recommendations.')}</p>
        <div class="choice-list" role="group">${GOALS.map(([id, he, en]) => html`<button type="button" class="choice" data-goal="${id}" aria-pressed="${data.goals.includes(id)}">${tt(he, en)}</button>`)}</div>
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
          ${age() != null && age() < 18 ? html`<p class="banner">${icon('info', { size: 18 })}<span>${tt('כי גילך מתחת ל-18: אין שיווק, והגדרות הפרטיות מחמירות כברירת מחדל.', 'Because you are under 18: no marketing, and the strictest privacy settings by default.')}</span></p>` : ''}
        </div>
        <label class="choice"><input type="checkbox" name="ai_consent" ${data.ai_consent ? html`checked` : ''}><span class="grow small">${tt('לאפשר משוב AI (כתיבה, שיחות, מורה). הטקסטים שלך יישלחו לעיבוד אצל ספק ה-AI (Anthropic) לצורך המשוב בלבד. אפשר לשנות בהגדרות.', 'Allow AI feedback (writing, conversations, tutor). Your texts are sent to the AI provider (Anthropic) only to produce feedback. You can change this in Settings.')}</span></label>
        <label class="choice"><input type="checkbox" name="terms" ${data.terms ? html`checked` : ''} required><span class="grow small">${tt('קראתי ואני מסכים/ה לתנאים ולמדיניות הפרטיות.', 'I have read and agree to the terms and privacy policy.')} <a href="privacy.html" target="_blank" rel="noopener">${tt('לקריאה', 'Read')}</a></span></label>`;
    }
  }

  function draw() {
    render(el, html`
      <div class="onboard">
        <div class="row between" style="margin-block-end:var(--s5)"><a class="brand" href="#/welcome">${brandMark()}<span>Lucid</span></a><span class="small faint num">${step + 1} / ${STEPS}</span></div>
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
      if (age() < 16) return tt('Lucid מיועד לגילאי 16 ומעלה. מצטערים, עדיין אי אפשר להירשם.', 'Lucid is for learners aged 16 and over, so you can\'t register yet. Sorry.');
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
      if (error) { draw(); return; }
      if (step < STEPS - 1) { step++; draw(); return; }
      await finish();
    }),
  ];
  return () => offs.forEach((o) => o());
}
