// Practice hub: what to practise now (recurring mistakes, weak topics, due words; for a new learner a word game and
// a real-life scenario at their level), then every lab.
import { html, render } from '../core/util.js';
import { tt, t, legend, isolateLatin } from '../core/i18n.js';
import { taxonomyIndex, content } from '../core/content.js';
import { icon, LEVEL_LABEL } from '../ui/components.js';
import { model, due, allCards, profile } from '../core/learner.js';
import { store } from '../core/store.js';
import { recommendScenarios } from '../core/reallife.js';
import { configured } from '../core/api.js';
import { CONFIG } from '../../config.js';

const LABS = [
  ['vocab', 'vocab', 'nav.vocab', 'מילים שלמדתם, עם הגייה, דוגמאות ומתי הן חוזרות', 'Words you learned, with pronunciation, examples and when they come back'],
  ['games', 'sparkle', 'nav.games', 'שאלון אוצר מילים, השלמת מילים, התאמת מילים לתמונות ומשחק זיכרון: תשובה מיידית, רמות וניקוד', 'Vocabulary quiz, word completion, words and pictures and a memory game: instant answers, levels and scores'],
  ['grammar', 'grammar', 'nav.grammar', 'כל נושא דקדוק, כמה הוא בשליטה, ותרגול ממוקד', 'Every grammar topic, how secure it is, and focused practice'],
  ['reading', 'reading', 'nav.reading', 'טקסטים מדורגים עם שאלות הבנה', 'Graded texts with comprehension questions'],
  ['listening', 'listening', 'nav.listening', 'האזנה, הכתבה ושליטה במהירות', 'Listening, dictation and speed control'],
  ['speaking', 'speaking', 'nav.speaking', 'צלילים שמשנים משמעות, ומשפטים שאומרים אחרי הדובר', 'Sounds that change meaning, and shadowing'],
  ['writing', 'writing', 'nav.writing', 'מהמשפט הראשון ועד חיבור טיעוני מלא', 'From the first sentence to a full argumentative essay'],
  ['tutor', 'tutor', 'nav.tutor', 'מורה שמסביר, שואל ומתקן, בשמונה מצבים', 'A tutor who explains, asks and corrects, in eight modes'],
];

export default async function practice(el, ctx) {
  ctx.setTitle(t('nav.practice'));
  const [tx, scenarioData] = await Promise.all([taxonomyIndex(), content.scenarios().catch(() => null)]);
  const m = model();
  const dueList = due();
  const dueN = dueList.length;
  // Today's review titles (UX r4 PG-9): words never reviewed get "סבב ראשון", the others are words to refresh.
  const newN = dueList.filter((c) => !c.log?.length && !c.fsrs?.reps).length;
  const reviewTitle = newN === dueN
    ? (dueN === 1 ? tt('מילה חדשה אחת: סבב ראשון', 'One new word: first round') : tt(`${dueN} מילים חדשות: סבב ראשון`, `${dueN} new words: first round`))
    : !newN ? (dueN === 1 ? tt('מילה אחת שכדאי לרענן', 'One word to refresh') : tt(`מילים שכדאי לרענן · ${dueN}`, `Words to refresh · ${dueN}`))
      : tt(`${dueN} מילים לחזרה: ${newN} חדשות, ${dueN - newN} לרענון`, `${dueN} words to review: ${newN} new, ${dueN - newN} to refresh`);
  const reviewWhy = newN === dueN ? tt('מילים מהשיעורים האחרונים, בפעם הראשונה בחזרה.', 'Words from your recent lessons, in review for the first time.') : tt('מילים שהגיע הזמן לחזור עליהן.', 'Words whose time to come back has come.');
  const words = allCards().filter((c) => c.kind === 'meaning').length;
  const aiReady = configured() && CONFIG.aiEnabled;
  // Only topics that can be practised somewhere: a drill, or a scenario for real-life topics (R2-24).
  const weak = m.weak.filter((w) => w.route !== null);
  const wordsText = words === 1 ? tt('מילה אחת', '1 word') : tt(`${words} מילים`, `${words} words`);
  const counts = { vocab: words ? tt(`${wordsText} · ${dueN} לחזרה`, `${wordsText} · ${dueN} due`) : '', tutor: aiReady ? '' : tt('לא פעיל באתר הזה', 'Not active on this site') };
  const answers = (n) => tt(n === 1 ? 'תשובה אחת' : `${n} תשובות`, n === 1 ? '1 answer' : `${n} answers`);
  // UX r3 PH-9: before there are mistakes or weak topics to work on, the hub still has something for today: a word
  // game and a real-life scenario at the learner's level.
  const fresh = !m.recurring.length && !weak.length;
  const L = LEVEL_LABEL[m.courseLevel] || m.courseLevel;
  const doneScenarios = new Set(store.all('progress').filter((p) => String(p.id).startsWith('rl:') && p.status === 'completed').map((p) => p.id.slice(3)));
  const scenario = fresh ? recommendScenarios(scenarioData?.scenarios || [], { courseLevel: m.courseLevel, goals: profile()?.goals || [], done: doneScenarios, n: 1 })[0] : null;

  render(el, html`
    <div class="page-head"><div><h1>${t('nav.practice')}</h1><p>${tt('מה כדאי לתרגל עכשיו, ומעבדות לכל מיומנות.', 'What to practise now, and a lab for every skill.')}</p></div></div>
    <div class="stack-lg">
      <section class="stack-sm" aria-labelledby="now-h">
        <h2 id="now-h" class="small" style="font-size:var(--t-md)">${tt('מומלץ עכשיו', 'Recommended now')}</h2>
        ${dueN ? html`<a class="panel plan-item" href="#/review"><span class="glyph">${icon('layers')}</span><span class="grow"><span style="font-weight:500">${reviewTitle}</span><span class="why" style="display:block">${reviewWhy}</span></span>${icon('chevron')}</a>` : ''}
        ${m.recurring.slice(0, 3).map((e) => { const x = tx.error.get(e.error_type); return html`<a class="panel plan-item" href="#/drill?error=${e.error_type}"><span class="glyph">${icon('practice')}</span><span class="grow"><span style="font-weight:500">${tt(x?.name_he, x?.name_en)}</span><span class="why" style="display:block">${tt(`טעות שחזרה ${e.count} פעמים ב-${e.days} ימים`, `Came up ${e.count} times on ${e.days} days`)}</span></span>${icon('chevron')}</a>`; })}
        ${weak.slice(0, 3).map((w) => { const x = tx.topic.get(w.topic); return html`<a class="panel plan-item" href="#/${w.route || `drill?topic=${w.topic}`}"><span class="glyph">${icon(w.scenario ? 'reallife' : x?.skill === 'vocabulary' ? 'vocab' : 'grammar')}</span><span class="grow"><span style="font-weight:500">${x ? legend(x.name_en, x.name_he) : w.topic}</span><span class="why" style="display:block">${tt(`שליטה ${Math.round(w.mastery * 100)}% לפי ${answers(w.evidence)}`, `${Math.round(w.mastery * 100)}% secure from ${answers(w.evidence)}`)}</span></span>${icon('chevron')}</a>`; })}
        ${fresh ? html`<a class="panel plan-item" href="#/games/${m.courseLevel}/1" data-rec="game"><span class="glyph">${icon('sparkle')}</span><span class="grow"><span style="font-weight:500">${isolateLatin(tt(`משחק מילים · ${L}`, `Word game · ${L}`))}</span><span class="why" style="display:block">${isolateLatin(tt(`מילים משיעורי ${L}: בוחרים את הפירוש.`, `Words from the ${L} lessons: choose the meaning.`))}</span></span>${icon('chevron')}</a>` : ''}
        ${scenario ? html`<a class="panel plan-item" href="#/scenario/${scenario.id}" data-rec="scenario"><span class="glyph">${icon('reallife')}</span><span class="grow"><span style="font-weight:500">${legend(scenario.title_en, scenario.title_he)}</span><span class="why" style="display:block">${tt('שיחה מהחיים, ברמה שלכם', 'A real-life conversation at your level')}</span></span>${icon('chevron')}</a>` : ''}
        ${fresh ? html`<p class="xsmall faint">${tt('אחרי כמה שיעורים יופיעו כאן גם טעויות שחוזרות ונושאים שכדאי לחזק.', 'After a few lessons, recurring mistakes and topics to strengthen will show up here too.')}</p>` : ''}
      </section>
      <section class="stack-sm" aria-labelledby="labs-h">
        <h2 id="labs-h" class="small" style="font-size:var(--t-md)">${tt('מעבדות', 'Labs')}</h2>
        <ul class="lesson-list practice-labs" style="list-style:none;padding:0;margin:0">${LABS.map(([href, ic, key, he, en]) => html`<li><a class="lesson-row" href="#/${href}" style="grid-template-columns:auto 1fr auto">
          <span class="glyph" style="color:var(--ink-2)">${icon(ic)}</span>
          <span class="grow"><span style="font-weight:500;display:block">${t(key)}</span><span class="meta">${tt(he, en)}</span></span>
          <span class="small faint">${counts[href] || ''}</span></a></li>`)}</ul>
      </section>
    </div>`);
}
