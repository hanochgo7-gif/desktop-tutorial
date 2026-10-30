// Help: how Lucid works, in plain language, and where to find things. Same place on every screen.
import { html, render } from '../core/util.js';
import { tt, t } from '../core/i18n.js';
import { icon } from '../ui/components.js';
import { configured } from '../core/api.js';
import { CONFIG } from '../../config.js';

const Q = [
  ['מאיפה מתחילים כל יום?', 'Where do I start each day?',
    'במסך ״היום״. התוכנית מורכבת מחזרה על מילים, השיעור הבא, תרגול של טעויות שחוזרות, ודיבור או כתיבה. כל חלק מסביר למה הוא שם. אפשר לבחור 10, 20, 35 או 50 דקות.',
    'On Today. The plan combines word review, your next lesson, practice of recurring mistakes, and speaking or writing. Each part says why it is there. Choose 10, 20, 35 or 50 minutes.'],
  ['איך נקבעת הרמה שלי?', 'How is my level decided?',
    'לפי ראיות: מבחן המיקום הוא נקודת התחלה, ואחריו כל מיומנות מקבלת רמה רק כשעניתם נכון על מספיק שאלות ברמה הזו, בימים שונים. בדיקת רמה בלי רמזים מסיימת כל רמה. זו הערכה לפי מתארי CEFR, לא תעודה.',
    'From evidence: the placement test is a starting point; after that each skill gets a level only when you answer enough items at that level correctly, on different days. A level check with no hints closes each level. It is an estimate aligned to CEFR descriptors, not a certificate.'],
  ['איך עובדת החזרה על מילים?', 'How does word review work?',
    'מילים מכל שיעור שהשלמתם חוזרות בדיוק לפני שהייתם שוכחים אותן. Lucid מחליט לפי מה שעשיתם (נכון, עם רמז, לאט או טעות), לא לפי הרגשה. מילים קשות חוזרות מוקדם יותר.',
    'Words from each lesson you complete come back just before you would forget them. Lucid decides from what you did (right, with a hint, slowly, or wrong), not from a self-rating. Hard words come back sooner.'],
  ['טעיתי. מה עכשיו?', 'I made a mistake. Now what?',
    'אחרי כל תשובה תראו את התשובה הנכונה ולמה. תרגיל שטעיתם בו יחזור פעם נוספת בסוף השיעור. טעות שחוזרת בכמה ימים תיכנס לתוכנית היומית כתרגול קצר וממוקד.',
    'After every answer you see the right answer and why. An exercise you got wrong comes back once at the end of the lesson. A mistake that repeats across days enters your daily plan as a short targeted practice.'],
  ['עצרתי באמצע שיעור', 'I stopped in the middle of a lesson',
    'שום דבר לא הולך לאיבוד. במסך ״היום״ יופיע ״להמשיך מאיפה שעצרתם״.',
    'Nothing is lost. Today shows "Continue where you left off".'],
  ['איך משתמשים במעבדת הכתיבה?', 'How do I use the Writing lab?',
    'כתבו, לחצו ״בדיקה״ לבדיקות אוטומטיות, ואם יש משוב AI, שלחו למשוב. המשוב מסמן טעויות ונותן רמז; נסו לתקן לבד ורק אז חשפו את התיקון. כל שליחה נשמרת כגרסה, ואפשר להשוות בין גרסאות.',
    'Write, press "Check" for automatic checks, and if AI feedback is available, send it for feedback. Feedback marks mistakes with a hint; try to fix them yourself before revealing the correction. Every submission is saved as a version you can compare.'],
  ['משוב AI, שיחות AI והמורה', 'AI feedback, AI conversations and the tutor',
    'אלה דורשים שרת שבו הוגדר שירות AI, חשבון, והסכמה בהגדרות. בלעדיהם כל השאר עובד: שיעורים, חזרה, תרגול מובנה ובדיקות כתיבה אוטומטיות. משוב AI יכול לטעות, ואפשר לדווח על כך.',
    'These need a server with AI configured, an account, and your consent in Settings. Without them everything else works: lessons, review, scripted practice and automatic writing checks. AI feedback can be wrong, and you can report it.'],
  ['קיצורי מקלדת', 'Keyboard shortcuts',
    'Enter: בדיקה והמשך. 1-4: בחירת תשובה. Tab: מעבר בין כפתורים.',
    'Enter: check and continue. 1-4: choose an answer. Tab: move between controls.'],
  ['נוחות קריאה', 'Comfortable reading',
    'בהגדרות: גודל טקסט, מראה בהיר או כהה, כמות העברית, ומהירות ההקראה. Lucid מכבד גם את הגדרת ״הפחתת תנועה״ של המכשיר.',
    'In Settings: text size, light or dark, how much Hebrew, and speech speed. Lucid also respects your device\'s "reduce motion" setting.'],
  ['המידע שלי', 'My data',
    'בהגדרות אפשר להוריד את כל המידע, לשחזר מגיבוי, או למחוק הכול. בלי חשבון, המידע לא יוצא מהמכשיר.',
    'In Settings you can download everything, restore a backup, or delete it all. Without an account, nothing leaves this device.'],
];

export default async function help(el, ctx) {
  ctx.setTitle(t('nav.help'));
  render(el, html`
    <div class="page-head"><div><h1>${t('nav.help')}</h1><p>${tt('תשובות קצרות לשאלות הנפוצות.', 'Short answers to common questions.')}</p></div></div>
    <div class="stack-sm" style="max-width:46rem">
      ${Q.map(([qhe, qen, ahe, aen], i) => html`<details class="panel flat" ${i === 0 ? html`open` : ''}><summary style="font-weight:500;cursor:pointer">${tt(qhe, qen)}</summary><p class="muted" style="margin-top:var(--s3)">${tt(ahe, aen)}</p></details>`)}
      <p class="small faint row" style="margin-top:var(--s5)">${icon('info', { size: 16 })} ${configured() && CONFIG.aiEnabled ? tt('השרת הזה מוגדר עם חשבונות ו-AI.', 'This server is set up with accounts and AI.') : configured() ? tt('השרת הזה מוגדר עם חשבונות, בלי AI.', 'This server is set up with accounts, without AI.') : tt('Lucid פועל כאן במצב מכשיר בלבד.', 'Lucid runs in device-only mode here.')} <a href="privacy.html" target="_blank" rel="noopener">${tt('פרטיות ותנאים', 'Privacy and terms')}</a></p>
    </div>`);
}
