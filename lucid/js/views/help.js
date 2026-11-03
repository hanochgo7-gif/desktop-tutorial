// Help: how Lucid works, in plain language, and where to find things. Same place on every screen.
import { html, render } from '../core/util.js';
import { tt, t } from '../core/i18n.js';
import { icon } from '../ui/components.js';
import { configured } from '../core/api.js';
import { CONFIG } from '../../config.js';

const AI_ANSWER = () => (configured() && CONFIG.aiEnabled
  ? [
    'באתר הזה AI פעיל. הוא עובד אחרי שמתחברים לחשבון ומאשרים אותו בהגדרות. גם בלעדיו כל השאר עובד: שיעורים, חזרה על מילים, תרגול מובנה ובדיקות כתיבה אוטומטיות. משוב AI יכול לטעות, ואפשר לדווח על כך.',
    'AI is active on this site. It works once you sign in to an account and allow it in Settings. Everything else works without it: lessons, word review, scripted practice and automatic writing checks. AI feedback can be wrong, and you can report it.']
  : [
    'AI לא פעיל באתר הזה. כל השאר עובד: שיעורים, חזרה על מילים, תרגול מובנה ובדיקות כתיבה אוטומטיות. אם יתווסף, נשאל קודם.',
    'AI is not active on this site. Everything else works: lessons, word review, scripted practice and automatic writing checks. If it is added, we will ask you first.']);

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
    'אחרי כל תשובה תראו אם צדקתם ולמה. בתשובה שכתבתם אפשר לנסות שוב פעם אחת, עם רמז, לפני שהתשובה מוצגת. תרגיל שטעיתם בו יחזור פעם נוספת בסוף השיעור. טעות שחוזרת בכמה ימים תיכנס לתוכנית היומית כתרגול קצר וממוקד.',
    'After every answer you see whether you were right, and why. In an answer you typed you can try again once, with a hint, before the answer is shown. An exercise you got wrong comes back once at the end of the lesson. A mistake that repeats across days enters your daily plan as a short targeted practice.'],
  ['עצרתי באמצע שיעור', 'I stopped in the middle of a lesson',
    'שום דבר לא הולך לאיבוד. במסך ״היום״ יופיע ״להמשיך מאיפה שעצרתם״.',
    'Nothing is lost. Today shows "Continue where you left off".'],
  ['איך משתמשים במעבדת הכתיבה?', 'How do I use the Writing lab?',
    'כתבו, לחצו ״בדיקה״ לבדיקות אוטומטיות, ואם יש משוב AI, שלחו למשוב. המשוב מסמן טעויות ונותן רמז; נסו לתקן לבד ורק אז חשפו את התיקון. כל שליחה נשמרת כגרסה, ואפשר להשוות בין גרסאות.',
    'Write, press "Check" for automatic checks, and if AI feedback is available, send it for feedback. Feedback marks mistakes with a hint; try to fix them yourself before revealing the correction. Every submission is saved as a version you can compare.'],
  // The answer says what is true on this site (SB-10): the glossary's one sentence when AI is off.
  ['משוב AI, שיחות AI והמורה', 'AI feedback, AI conversations and the tutor', 'ai'],
  ['שימוש בלי אינטרנט', 'Using Lucid offline',
    'אחרי שפתחתם את Lucid פעם אחת עם חיבור, המסכים, החזרה על מילים, התרגול המובנה בתרחישים ומעבדת הכתיבה עובדים גם בלי אינטרנט. את השיעורים (כ-3MB) שומרים מראש בהגדרות, ב״שימוש בלי אינטרנט״. משוב AI, שיחות AI וזיהוי דיבור דורשים חיבור. כשאין חיבור, בטלפון מופיע ״אין חיבור״ בראש המסך, ובמחשב בתפריט הצד.',
    'Once you have opened Lucid with a connection, screens, word review, scripted scenario practice and the Writing lab work without internet. Save the lessons (about 3 MB) beforehand in Settings, under "Offline use". AI feedback, AI conversations and speech recognition need a connection. When you are offline, a phone shows "Offline" at the top of the screen, and a computer shows it in the side menu.',
    ['#/settings?section=offline', 'לשמירת השיעורים במכשיר', 'Save the lessons on this device', 'download']],
  ['קיצורי מקלדת', 'Keyboard shortcuts',
    'Enter: בדיקה והמשך. 1-4: בחירת תשובה. Tab: מעבר בין כפתורים.',
    'Enter: check and continue. 1-4: choose an answer. Tab: move between controls.'],
  ['לא שומעים את ההקראה', 'I can\'t hear the audio',
    'בדקו את עוצמת הקול ושהמכשיר לא במצב שקט. Lucid מקריא בעזרת הקול באנגלית של הדפדפן. אם בדפדפן אין קול באנגלית, לא יושמע כלום ותופיע הודעה. אפשר לנסות דפדפן אחר, ובמחשב אפשר להוסיף קול באנגלית בהגדרות השפה של מערכת ההפעלה. בתרגילי האזנה התמליל מוצג אחרי הבדיקה.',
    'Check the volume and that the device is not on silent. Lucid reads aloud with your browser\'s English voice. If the browser has no English voice, nothing plays and a note says so. You can try another browser, and on a computer you can add an English voice in the operating system\'s language settings. In listening exercises the transcript is shown after you check.',
    ['#/settings', 'למהירות ההקראה בהגדרות', 'Speech speed in Settings', 'settings']],
  ['איך מתרגלים דיבור בלי מיקרופון', 'How do I practise speaking without a microphone?',
    'בתרגילי הדיבור שבשיעורים אומרים את המשפט בקול ומסמנים בעצמכם: ״אמרתי את זה בבירור״ או ״צריך עוד תרגול״. דיבור לא מקבל ציון. כשאי אפשר לדבר, ״לא יכול/ה לדבר כרגע״ מדלג על התרגיל בלי שום הפסד. במעבדת הדיבור אפשר להקשיב ולחזור בקול גם בלי מיקרופון.',
    'In lesson speaking exercises, say the sentence aloud and mark it yourself: "I said it clearly" or "I need more practice". Speaking is never scored. When you can\'t speak, "Can\'t speak right now" skips the exercise with nothing lost. In the Speaking lab you can listen and repeat aloud without a microphone too.',
    ['#/speaking', 'למעבדת הדיבור', 'To the Speaking lab', 'speaking']],
  ['נוחות קריאה', 'Comfortable reading',
    'בהגדרות: גודל טקסט, מראה בהיר או כהה, כמות העברית, ומהירות ההקראה. Lucid מכבד גם את הגדרת ״הפחתת תנועה״ של המכשיר.',
    'In Settings: text size, light or dark, how much Hebrew, and speech speed. Lucid also respects your device\'s "reduce motion" setting.',
    ['#/settings', 'להגדרות', 'To Settings', 'settings']],
  ['המידע שלי', 'My data',
    'בהגדרות אפשר להוריד את כל המידע, לשחזר מגיבוי, או למחוק הכול. בלי חשבון, ההתקדמות שלכם לא יוצאת מהמכשיר. חריג אחד: בתרגילי דיבור, הדפדפן עשוי לשלוח את הקול לשירות זיהוי הדיבור שלו (Lucid לא שומר הקלטות).',
    'In Settings you can download everything, restore a backup, or delete it all. Without an account, your progress never leaves this device. One exception: in speaking exercises your browser may send your voice to its own speech-recognition service (Lucid stores no recordings).'],
];

// A touch screen with no hover has no keyboard to speak of: its help leaves the keyboard shortcuts out (SC-2).
const touchOnly = () => typeof matchMedia === 'function' && matchMedia('(hover: none) and (pointer: coarse)').matches;

export default async function help(el, ctx) {
  ctx.setTitle(t('nav.help'));
  const items = (touchOnly() ? Q.filter(([, en]) => en !== 'Keyboard shortcuts') : Q).map((q) => (q[2] === 'ai' ? [q[0], q[1], ...AI_ANSWER()] : q));
  render(el, html`
    <div class="page-head"><div><h1>${t('nav.help')}</h1><p>${tt('תשובות קצרות לשאלות הנפוצות.', 'Short answers to common questions.')}</p></div></div>
    <div class="stack-sm" style="max-width:46rem">
      ${items.map(([qhe, qen, ahe, aen, link], i) => html`<details class="panel flat" ${i === 0 || (link?.[0].includes('offline') && ctx.query.q === 'offline') ? html`open` : ''}><summary style="font-weight:500;cursor:pointer">${tt(qhe, qen)}</summary><p class="muted" style="margin-top:var(--s3)">${tt(ahe, aen)}</p>${link ? html`<p style="margin-top:var(--s3)"><a class="key small" href="${link[0]}">${icon(link[3] || 'chevron', { size: 16 })} ${tt(link[1], link[2])}</a></p>` : ''}</details>`)}
      <p class="small faint row help-foot" style="margin-top:var(--s5)">${icon('info', { size: 16 })} ${configured() && CONFIG.aiEnabled ? tt('השרת הזה מוגדר עם חשבונות ו-AI.', 'This server is set up with accounts and AI.') : configured() ? tt('השרת הזה מוגדר עם חשבונות, בלי AI.', 'This server is set up with accounts, without AI.') : tt('Lucid פועל כאן במצב מכשיר בלבד.', 'Lucid runs in device-only mode here.')} <a href="privacy.html" target="_blank" rel="noopener">${tt('פרטיות ותנאים', 'Privacy and terms')}</a></p>
    </div>`);
}
