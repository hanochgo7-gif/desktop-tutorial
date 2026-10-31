// Essay editor: write, check, get feedback, revise, compare versions, delete.
// Automatic checks always work. AI feedback (when configured) marks errors hint-first: the learner
// sees what and why, tries a fix, and reveals the correction only if needed. Every submission is a
// version; any two versions can be compared word by word. Research E protocol, kept in code: stage-aware
// bands, a hint ladder whose correction opens only after an attempt, the overall level range only on a
// final draft, and at most three AI rounds per task.
import { html, render, on, $, debounce } from '../core/util.js';
import { tt, t, bi, legend, hebrewSupport } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, levelTag, toast, emptyState, confirmDialog, LEVEL_LABEL } from '../ui/components.js';
import { model, settings, recordAttempt, logEvent } from '../core/learner.js';
import { store } from '../core/store.js';
import { analyzeWriting, splitReferences } from '../core/writing-analyzer.js';
import { countWords } from '../core/grading.js';
import { callAI, configured, auth } from '../core/api.js';
import { CONFIG } from '../../config.js';
import { runSet } from '../ui/player.js';
import { STAGES } from './writing.js';
import { wordDiff, fixStatus, locateSpan } from '../core/diff.js';

const BAND = [['אין מספיק כדי לשפוט', 'Not enough to judge'], ['כרמה אחת מתחת ליעד', 'About a level below target'], ['מתקרב ליעד', 'Approaching target'], ['עומד ביעד', 'Meets target'], ['מעל היעד', 'Above target'], ['מעבר ליעד', 'Beyond target']];
const CATEGORY = {
  grammar: ['דקדוק', 'Grammar'], vocabulary: ['אוצר מילים', 'Vocabulary'], sentence_structure: ['מבנה משפטים', 'Sentence structure'],
  coherence: ['קוהרנטיות', 'Coherence'], cohesion: ['לכידות', 'Cohesion'], argument_strength: ['חוזק הטיעון', 'Argument strength'],
  evidence_quality: ['איכות הראיות', 'Evidence'], counterarguments: ['טיעונים נגדיים', 'Counterarguments'], academic_tone: ['טון אקדמי', 'Academic tone'],
  clarity: ['בהירות', 'Clarity'], precision: ['דיוק', 'Precision'], overall: ['הערכה כוללת', 'Overall'],
};
const SEVERITY = { critical: ['חשוב לתקן', 'Must fix', 'bad'], important: ['כדאי לתקן', 'Should fix', 'warn'], style: ['שיפור סגנון', 'Style', 'cobalt'] };
const ARGUMENTATIVE = new Set(['argument-construction', 'thesis-development', 'counterargument', 'essay', 'critical-response', 'research', 'timed', 'evidence-evaluation']);
const SOURCE_KINDS = new Set(['research', 'evidence-evaluation', 'critical-response']);
// Each level ends with a writing task from the curriculum (A1 self-introduction ... C2 research paper).
const FINAL_FOCUS = { 1: ['grammar', 'vocabulary', 'clarity'], 2: ['coherence', 'cohesion', 'grammar'], 3: ['coherence', 'argument_strength', 'cohesion'], 6: ['argument_strength', 'evidence_quality', 'counterarguments'], 8: ['argument_strength', 'evidence_quality', 'academic_tone', 'precision'], 10: ['argument_strength', 'evidence_quality', 'counterarguments', 'academic_tone', 'precision'] };
const MAX_EVALS = 3; // first draft plus at most two AI revision cycles (research E 9.6)
// The server takes learner texts of up to 24,000 characters (TEXT_MAX in supabase/functions/lucid-ai/schemas.ts)
// in a request body of at most 64 KiB (handler.ts); the client checks both before sending.
const AI_TEXT_MAX = 24000;
const AI_BODY_MAX = 62 * 1024;

function finalTask(cur, level) {
  const fa = cur?.levels?.find((l) => l.id === level)?.final_assessment;
  if (!fa) return null;
  return {
    id: `final-${level}`, final_task: true, stage: fa.stage || 0, level, kind: fa.kind || 'essay',
    title_en: `Final writing task: ${LEVEL_LABEL[level]}`, title_he: `משימת הסיום של ${LEVEL_LABEL[level]}`,
    instructions: fa.instructions || { en: fa.task, he: fa.task_he || null }, audience: fa.audience || null, topics: fa.topics || [],
    required: fa.required_elements || [], required_elements: (fa.required_elements || []).map((r) => r.en ?? r),
    min_words: fa.min_words, max_words: fa.max_words || null, focus: FINAL_FOCUS[fa.stage] || FREE.focus, checklist: [],
  };
}

const FREE = { id: 'free', stage: 0, level: null, kind: 'essay', title_en: 'Free writing', title_he: 'כתיבה חופשית', instructions: { en: 'Write about anything you like. Use the checks to improve it.', he: 'כתבו על כל נושא שתרצו, והשתמשו בבדיקות כדי לשפר.' }, min_words: 30, focus: ['grammar', 'vocabulary', 'clarity'], checklist: [] };

// Every way an AI request can fail, in plain words (persona panel P-78). Server messages are never shown raw.
const SAVED = ['הטקסט שמור במכשיר.', 'Your text is saved on this device.'];
const AI_ERRORS = {
  rate_limited: ['הגעתם למגבלת משוב ה-AI לשעה הזו או להיום. הבדיקות האוטומטיות עובדות; נסו שוב מאוחר יותר.', 'You have reached the AI feedback limit for this hour or for today. Automatic checks still work; try again later.'],
  in_flight: ['בקשת AI אחרת מהחשבון שלכם עדיין רצה. חכו שתסתיים ונסו שוב.', 'Another AI request from your account is still running. Wait for it to finish, then try again.'],
  budget_exhausted: ['משוב ה-AI של Lucid הגיע היום למגבלה של כל הלומדים. נסו שוב מחר; הבדיקות האוטומטיות עובדות.', 'Lucid\'s AI feedback has reached today\'s limit for all learners. Try again tomorrow; automatic checks still work.'],
  incomplete: ['התשובה של ה-AI נקטעה באמצע. נסו שוב; אם זה חוזר, קצרו מעט את הטקסט.', 'The AI\'s answer was cut off. Try again; if it happens again, shorten the text a little.'],
  declined: ['ה-AI לא הצליח להגיב לטקסט הזה. אם יש בו משהו שאינו חלק מהמשימה, הסירו אותו ונסו שוב.', 'The AI could not respond to this text. If it contains something that is not part of the task, remove it and try again.'],
  too_large: ['הטקסט ארוך מדי לשליחה. קצרו אותו ונסו שוב.', 'This text is too long to send. Shorten it and try again.'],
  unauthenticated: ['פג תוקף הכניסה לחשבון. היכנסו שוב ונסו שוב.', 'Your session has expired. Sign in again, then try again.'],
  ai_consent_required: ['כדי לקבל משוב AI צריך להפעיל אותו בהגדרות.', 'Turn on AI feedback in Settings to use it.'],
  no_profile: ['צריך לסיים ליצור את הפרופיל בחשבון לפני משוב AI.', 'Finish creating your profile before using AI feedback.'],
  invalid_request: ['Lucid לא הצליח לשלוח את הבקשה בצורה תקינה. רעננו את הדף ונסו שוב; אם זה חוזר, דווחו לנו.', 'Lucid could not send this request in the expected form. Reload the page and try again; if it happens again, please report it.'],
  unavailable: ['שירות ה-AI לא זמין כרגע. נסו שוב בעוד כמה דקות.', 'The AI service is not available right now. Try again in a few minutes.'],
};
const ALIAS = { invalid_json: 'invalid_request', busy: 'unavailable', upstream_error: 'unavailable', internal_error: 'unavailable', method_not_allowed: 'invalid_request' };
function aiErrorText(e) {
  if (e.network) return tt(`אין חיבור לאינטרנט. ${SAVED[0]} נסו שוב כשתהיה רשת.`, `No connection. ${SAVED[1]} Try again when you are online.`);
  if (e.code === 'not_configured' || e.code === 'origin_not_allowed') return t('ai.unavailable');
  let code = ALIAS[e.code] || e.code;
  if (code === 'invalid_request' && /\btext\b.*at most/i.test(e.message || '')) code = 'too_large';
  if (!AI_ERRORS[code]) code = e.status === 429 ? 'rate_limited' : e.status === 413 ? 'too_large' : e.status === 401 ? 'unauthenticated' : 'unavailable';
  const [he, en] = AI_ERRORS[code];
  return tt(`${he} ${SAVED[0]}`, `${en} ${SAVED[1]}`);
}

export default async function essay(el, ctx) {
  const id = ctx.params.id;
  const [ex, as, tx, cur, rubric] = await Promise.all([content.writingExercises(), content.assignments(), taxonomyIndex(), content.curriculum(), content.rubric()]);
  const assignments = as?.assignments || [];
  const task = id === 'free' ? FREE : id.startsWith('final-') ? finalTask(cur, id.slice(6)) : (ex?.exercises || []).find((x) => x.id === id) || assignments.find((x) => x.id === id);
  if (!task) { render(el, emptyState({ title: tt('התרגיל לא נמצא', 'Exercise not found'), action: html`<a class="key enter" href="#/writing">${t('nav.writing')}</a>` })); return; }
  ctx.setTitle(task.title_en);
  const m = model();
  const level = task.level || m.courseLevel;
  const isAssignment = Boolean(task.prompt);
  const minWords = task.word_range?.[0] ?? task.min_words ?? 0;
  const maxWords = task.word_range?.[1] ?? task.max_words ?? null;
  const topic = { 1: 'sentence-basics', 2: 'paragraph-basics', 3: 'opinion-language', 4: 'argument-structure', 5: 'argument-structure', 6: 'argument-structure', 7: 'essay-structure-basic', 8: 'fallacies', 9: 'hedging', 10: 'argument-architecture' }[task.stage] || 'sentence-basics';
  // Other essay tasks at this stage, for "try a new task" advice (persona panel P-80).
  const otherAtStage = [...(ex?.exercises || []), ...assignments].filter((x) => x.stage === task.stage && x.id !== task.id && (x.min_words || x.word_range)).length;

  // Auto-graded writing exercises (sentence correction, transformation...) run in the player.
  if (task.items?.length && !task.min_words) {
    const items = task.items.map((x, i) => ({ ex: { ...x, id: x.id || `${task.id}-${i}` }, lesson: task.id, level, topic: x.topic || topic }));
    return runSet(el, items, {
      title: task.title_en, source: 'writing', exitHref: '#/writing', errors: tx.error,
      onDone(results) {
        const right = results.filter((r) => r.correct).length;
        store.put('writing', { id: `ess:${task.id}`, kind: 'essay-summary', exercise: task.id, title: task.title_en, status: 'done', versions: 1, score: right / results.length, updated: new Date().toISOString() });
        logEvent({ type: 'writing', exercise: task.id });
        render(el, html`<div class="view narrow stack-lg"><h1>${tt('סיימתם', 'Done')}</h1><p class="muted">${tt(`${right} מתוך ${results.length} נכון.`, `${right} of ${results.length} correct.`)}</p>
          ${task.checklist?.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('מה לקחת מכאן', 'Take-aways')}</h2>${task.checklist.map((c) => html`<p class="row small">${icon('check', { size: 16 })} ${bi(c)}</p>`)}</div>` : ''}
          <div class="row"><a class="key enter" href="#/writing">${t('nav.writing')}</a></div></div>`);
      },
    });
  }

  const sumId = `ess:${task.id}`;
  const versions = () => store.all('writing').filter((w) => w.kind === 'essay-version' && w.exercise === task.id).sort((a, b) => a.n - b.n);
  const draftRec = store.get('writing', `${sumId}#draft`);
  let text = draftRec?.text ?? versions().at(-1)?.text ?? '';
  let chosen = Number.isInteger(draftRec?.topic) ? draftRec.topic : versions().at(-1)?.topic ?? null;
  // One set of options for every automatic check, so Check and Get feedback agree (persona panel P-81).
  const analyze = () => analyzeWriting(text, { level, minWords, maxWords, mustInclude: task.must_include || [], formal: ['B2', 'C1', 'C2'].includes(level) && task.stage >= 7 });
  let analysis = text ? analyze() : null;
  let busy = false; let aiError = ''; let aiNote = ''; let busySince = 0; let busyTimer = null;
  let tab = 'checks';
  let cmp = null; // { a, b }: version numbers, b may be 'now' (the current text)
  let checkedNote = '';
  // Hint ladder (research E 9.5): 1 locate, 2 name the error type, 3 clue, 4 correction with explanation.
  // Grammar starts at "name" for A1-A2 and at "locate" above; spelling and word choice always start at "locate".
  // "Next hint" works as an explicit "I'm stuck", but the correction opens only after a real attempt in the text,
  // so the ladder cannot be clicked straight through to the answer.
  const rung = new Map();
  const attempted = new Set();
  const LEXICAL = new Set(['spelling', 'word-choice', 'false-friend', 'capitalization', 'punctuation']);
  const startFor = (er) => (LEXICAL.has(er.type) ? 1 : ['PreA1', 'A1', 'A2'].includes(level) ? 2 : 1);
  // Judged in the sentence the mistake was in, not anywhere in the essay (persona panel P-72).
  const fixState = (er) => { const v = latestEval(); return v ? fixStatus(v.text, text, er.quote, er.correction) : null; };
  const SELF = ['argument_strength', 'evidence_quality', 'counterarguments', 'coherence'];
  let selfScores = {};
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
  let timerEnd = null; let timerId = null;

  const latestEval = () => versions().filter((v) => v.evaluation).at(-1) || null;
  const evaluatedCount = () => versions().filter((x) => x.evaluation).length;
  const isFinal = () => Boolean(latestEval()?.final);
  const roundsLeft = () => !isFinal() && evaluatedCount() < MAX_EVALS;
  const scope = () => { const s = settings().feedback_scope; return s !== 'auto' ? s : ['B2', 'C1', 'C2'].includes(level) ? 'comprehensive' : 'focused'; };
  const sourcePack = () => task.source_pack || assignments.find((a) => a.id === task.topics?.[chosen]?.assignment)?.source_pack || null;
  const sourceBased = () => (task.stage || 0) >= 9 || SOURCE_KINDS.has(task.kind) || Boolean(sourcePack());
  const bodyWords = () => countWords(splitReferences(text).body);
  const minForAi = () => Math.max(3, Math.floor(minWords * 0.5));
  const rangeOf = (e) => (e ? `${cefrLabel(e.cefr_low)}${e.cefr_low !== e.cefr_high ? `–${cefrLabel(e.cefr_high)}` : ''}` : '');

  // Why "Get feedback" is unavailable, in words (persona panel P-29), or '' when it can be used.
  function aiWhy() {
    if (busy) return '';
    if (isFinal()) return tt('המשימה מסומנת כסופית. למשוב נוסף, נסו משימה חדשה.', 'This task is marked final. For more feedback, try a new task.');
    if (evaluatedCount() >= MAX_EVALS) return tt('השתמשתם בשלושת סבבי המשוב של המשימה הזו.', 'You have used the three feedback rounds for this task.');
    if (task.topics?.length && chosen == null) return tt('בחרו קודם נושא (למעלה).', 'Choose a topic first (above).');
    const w = bodyWords();
    if (w < minForAi()) return tt(`המשוב נפתח ב-${minForAi()} מילים (כתבתם ${w}).`, `Feedback opens at ${minForAi()} words (you have ${w}).`);
    if (text.length > AI_TEXT_MAX) return tt(`הטקסט ארוך מדי למשוב: ${text.length.toLocaleString()} תווים, והמגבלה היא ${AI_TEXT_MAX.toLocaleString()} (בערך 2,500 מילים כולל רשימת מקורות). קצרו אותו.`, `This text is too long for feedback: ${text.length.toLocaleString()} characters, and the limit is ${AI_TEXT_MAX.toLocaleString()} (about 2,500 words with a reference list). Shorten it.`);
    return '';
  }

  function analysisPanel() {
    if (!analysis) return html`<p class="small muted">${tt('כתבו, ואז לחצו ״בדיקה אוטומטית״. הבדיקות האוטומטיות עובדות גם בלי AI.', 'Write, then press "Check". Automatic checks work without AI.')}</p>`;
    const a = analysis;
    const argumentative = ARGUMENTATIVE.has(task.kind) || isAssignment;
    const sig = [['thesis', 'תזה / עמדה', 'Thesis or position'], ['evidence', 'ראיות או דוגמאות', 'Evidence or examples'], ['counter', 'טיעון נגדי', 'Counterargument'], ['rebuttal', 'הפרכה', 'Rebuttal'], ['conclusion', 'סיכום', 'Conclusion']];
    return html`<div class="stack">
      <div class="check-list">${a.checks.map((c) => html`<div class="check-item">${icon(c.ok ? 'check' : 'alert', { size: 16 })}<span>${tt(c.he, c.en)}</span></div>`)}</div>
      ${argumentative ? html`<div class="stack-sm"><h3 class="small">${tt('מבנה הטיעון (סימנים בטקסט)', 'Argument structure (signals in the text)')}</h3>${sig.map(([k, he, en]) => html`<p class="row small">${icon(a.structure[k] ? 'check' : 'circle', { size: 16 })}<span class="${a.structure[k] ? '' : 'faint'}">${tt(he, en)}</span></p>`)}
        <p class="xsmall faint">${tt('הבדיקה מחפשת ביטויים אופייניים (למשל ״However״, ״For example״). היא לא שופטת את איכות הטיעון.', 'This looks for typical phrases (e.g. "However", "For example"). It does not judge how good the argument is.')}</p></div>` : ''}
      <div class="stack-sm"><h3 class="small">${tt('מילות קישור', 'Connectors')}</h3>${Object.keys(a.connectors).length ? Object.entries(a.connectors).map(([k, v]) => html`<p class="small"><span class="tag">${k}</span> <span lang="en" dir="ltr" class="muted">${v.join(', ')}</span></p>`) : html`<p class="small faint">${tt('לא נמצאו מילות קישור.', 'No connectors found.')}</p>`}</div>
      <p class="small muted">${tt(`${a.stats.sentences} משפטים · אורך ממוצע ${a.stats.avg_sentence} מילים · ${a.stats.paragraphs} פסקאות`, `${a.stats.sentences} sentences · average ${a.stats.avg_sentence} words · ${a.stats.paragraphs} paragraphs`)}</p>
      ${a.issues.length ? html`<div class="stack-sm"><h3 class="small">${tt('כדאי לבדוק', 'Worth checking')}</h3>${a.issues.slice(0, 12).map((i) => html`<div class="error-card"><p class="small"><span class="tag warn">${tt(i.he_title, i.title)}</span> <span class="quote" lang="en" dir="ltr">${i.match}</span></p><p class="small muted">${hebrewSupport() === 'off' ? i.en : tt(i.he, i.en)}</p></div>`)}</div>` : html`<p class="small">${icon('check', { size: 16 })} ${tt('הבדיקות האוטומטיות לא מצאו בעיות מוכרות.', 'The automatic checks found no known problems.')}</p>`}
      <p class="xsmall faint">${tt('בדיקות אוטומטיות פשוטות: הן יכולות לפספס טעויות ולפעמים לסמן משהו תקין.', 'Simple automatic checks: they can miss mistakes and occasionally flag correct English.')}</p></div>`;
  }

  // While a text is being assessed (persona panel P-83): shown under the editor, which stays in view on
  // desktop, whichever feedback tab is open.
  function busyStatus() {
    if (!busy) return '';
    const long = bodyWords() > 700;
    return html`<p class="banner small essay-busy" role="status">${html`<span class="spinner" aria-hidden="true" style="width:1rem;height:1rem;flex:none"></span>`}<span>${tt(`קוראים את הטקסט שלכם${long ? ' הארוך' : ''}. בדרך כלל זה לוקח פחות מדקה${long ? '; טקסט ארוך יכול לקחת כמה דקות' : ''}. שינויים שתעשו עכשיו לא ייכללו במשוב הזה.`, `Reading your ${long ? 'long ' : ''}text. This usually takes under a minute${long ? '; a long paper can take a few minutes' : ''}. Edits you make now are not included in this feedback.`)} <span class="num faint" data-elapsed aria-hidden="true"></span></span></p>`;
  }

  // What AI feedback cannot check on research and source-based tasks (persona panel P-79).
  function sourceLimits(e) {
    if (!sourceBased()) return '';
    return html`<div class="banner small">${icon('info', { size: 16 })}<div class="stack-sm"><span>${tt('משוב ה-AI שופט איך אתם בוחרים, מעריכים ומשלבים ראיות. הוא לא קורא את המקורות, ולכן לא יכול לבדוק אם מקור קיים, אם ציטוט מדויק או אם המקור באמת אומר את מה שאתם מדווחים. את זה צריך לבדוק בעצמכם.', 'AI feedback judges how you choose, evaluate and use evidence. It does not read your sources, so it cannot check whether a source exists, whether a quotation is accurate, or whether a source says what you report. Check those yourself.')}</span>${e?.verification_note ? html`<span dir="auto">${e.verification_note}</span>` : ''}</div></div>`;
  }

  function aiPanel() {
    const v = latestEval();
    if (!aiReady) {
      return html`<div class="stack-sm"><p class="banner small">${icon('info', { size: 18 })}<span>${!configured() || !CONFIG.aiEnabled ? t('ai.unavailable') : !auth.signedIn ? tt('כדי לקבל משוב AI צריך להיכנס לחשבון.', 'Sign in to get AI feedback.') : tt('הפעילו ״משוב AI״ בהגדרות.', 'Turn on "AI feedback" in Settings.')}</span></p></div>`;
    }
    if (!v) return html`<div class="stack"><p class="small muted">${busy ? '' : tt('שלחו את הטקסט למשוב כדי לקבל הערכה לפי 12 קטגוריות, טעויות עם רמזים ומשימות לתיקון.', 'Send your text for feedback to get an assessment across 12 categories, mistakes with hints, and revision tasks.')}</p>${sourceLimits(null)}${selfForm()}</div>`;
    const e = v.evaluation;
    const done = !roundsLeft();
    return html`<div class="stack">
      ${e.task_fulfilment && e.task_fulfilment.status !== 'complete' ? html`<p class="banner warn small">${icon('alert', { size: 16 })}<span dir="auto"><strong>${e.task_fulfilment.status === 'off_topic' ? tt('הטקסט לא עונה על המשימה.', 'The text does not answer the task.') : tt('חלק מהמשימה חסר.', 'Part of the task is missing.')}</strong> ${e.task_fulfilment.note}</span></p>` : ''}
      ${v.final ? html`<div class="row between"><span class="small">${tt('הערכת רמה של הטקסט (טווח)', 'Estimated level of this text (range)')}</span><span class="tag level">${rangeOf(e)}</span></div>`
        : html`<div class="stack-sm final-box"><p class="small muted">${tt('בזמן תיקונים רואים דירוג לפי קטגוריות. טווח הרמה הכולל מופיע כשמסמנים טיוטה סופית.', 'While you revise you see category bands. The overall level range appears when you mark a final draft.')}</p>
          <div class="row"><button type="button" class="key small" data-final>${icon('flag', { size: 16 })} ${tt('לסמן כטיוטה סופית', 'Mark as final draft')}</button></div>
          <p class="xsmall faint">${tt(`זה מסיים את התיקונים במשימה: הטיוטה האחרונה שקיבלה משוב נחשבת לסופית, טווח הרמה מופיע, והמשימה נספרת כגמורה.${evaluatedCount() < MAX_EVALS ? ` אפשר גם להמשיך לתקן (נשארו ${MAX_EVALS - evaluatedCount()} סבבים).` : ''}`, `This ends revising: your last draft with feedback becomes final, its level range appears and the task counts as done.${evaluatedCount() < MAX_EVALS ? ` You can also keep revising (${MAX_EVALS - evaluatedCount()} round${MAX_EVALS - evaluatedCount() === 1 ? '' : 's'} left).` : ''}`)}</p></div>`}
      <p dir="auto">${e.summary}</p>${e.summary_he && hebrewSupport() !== 'off' ? html`<p lang="he" dir="rtl" class="muted small">${e.summary_he}</p>` : ''}
      ${e.revision?.progress_since_previous ? html`<div class="banner small">${icon('compare', { size: 16 })}<span dir="auto">${e.revision.progress_since_previous}</span></div>` : ''}
      ${e.strengths?.length ? html`<div class="stack-sm"><h3 class="small">${tt('מה עובד', 'What works')}</h3>${e.strengths.map((s) => html`<p class="note-row small">${icon('check', { size: 16 })}<span dir="auto">${s}</span></p>`)}</div>` : ''}
      ${sourceLimits(e)}
      ${!done ? selfForm() : ''}
      ${done ? html`<p class="xsmall faint">${tt('זה היה סבב המשוב האחרון למשימה הזו.', 'That was the last feedback round for this task.')}${otherAtStage ? html` <a href="#/writing?stage=${task.stage}">${tt('כדי לבדוק שזה עובר הלאה, נסו משימה חדשה בשלב הזה.', 'To check that it transfers, try a new task at this stage.')}</a>` : ''}</p>` : ''}
      ${e.revision?.tasks?.length ? html`<div class="stack-sm"><h3 class="small">${done ? tt('מה לקחת למשימה הבאה', 'What to carry into your next task') : tt('לטיוטה הבאה', 'For your next draft')}</h3><ol class="small stack-sm" style="margin:0;padding-inline-start:1.2rem">${e.revision.tasks.map((x) => html`<li dir="auto">${x}</li>`)}</ol></div>` : ''}
      ${errorList(e)}
      <div class="stack-sm"><h3 class="small">${tt('לפי קטגוריה', 'By category')}</h3><div class="rubric">${e.categories.filter((c) => c.applicable).map((c) => html`<div class="rubric-row"><span>${tt(CATEGORY[c.id]?.[0] || c.id, CATEGORY[c.id]?.[1] || c.id)}</span><span class="band">${e.low_confidence?.includes(c.id) ? html`<span title="${tt('הערכה לא ודאית', 'Low-confidence estimate')}">~</span>` : ''}${tt(BAND[c.score ?? 0][0], BAND[c.score ?? 0][1])}${e.self?.[c.id] != null ? html` <span class="xsmall faint">(${tt('הערכה עצמית', 'you said')}: ${tt(BAND[e.self[c.id]][0], BAND[e.self[c.id]][1])})</span>` : ''}</span>
        <details><summary class="xsmall">${tt('פירוט', 'Details')}</summary><div class="stack-sm" style="margin-top:var(--s2)"><p dir="auto">${c.explanation}</p>${c.examples.map((x) => html`<p class="small"><span class="quote" lang="en" dir="ltr">${x.quote}</span> <span class="muted" dir="auto">${x.comment}</span></p>`)}<p dir="auto"><strong>${tt('לשפר:', 'Improve:')}</strong> ${c.improvement}</p><p dir="auto" class="muted"><strong>${tt('לתרגל:', 'Practise:')}</strong> ${c.practice}</p></div></details></div>`)}</div>
        <p class="xsmall faint">${tt(`הדירוג ביחס ליעד של רמה ${LEVEL_LABEL[level] || level}. ${t('level.estimate')}.`, `Bands are relative to the ${LEVEL_LABEL[level] || level} target. ${t('level.estimate')}.`)}</p>
        ${rubric?.scale ? html`<details><summary class="xsmall">${tt('איך עובד הדירוג?', 'How do the bands work?')}</summary><div class="stack-sm small" style="margin-top:var(--s2)">${rubric.scale.map((b) => html`<p><span class="tag num">${b.band}</span> ${bi(b)}</p>`)}${rubric.na ? html`<p><span class="tag">N/A</span> ${bi(rubric.na)}</p>` : ''}${e.categories.filter((c) => c.applicable).map((c) => { const rc = rubric.categories?.find((x) => x.id === c.id); return rc ? html`<p><strong>${tt(rc.name_he, rc.name_en)}:</strong> ${bi({ en: rc.what_en, he: rc.what_he })}</p>` : ''; })}</div></details>` : ''}</div>
      ${e.required_elements?.length ? html`<div class="stack-sm"><h3 class="small">${tt('רכיבי חובה', 'Required elements')}</h3>${e.required_elements.map((r) => html`<p class="note-row small">${icon(r.present ? 'check' : 'x', { size: 16 })}<span dir="auto"><strong>${r.element}</strong> · ${r.comment}</span></p>`)}</div>` : ''}
      <p class="xsmall faint row">${icon('alert', { size: 14 })} ${t('ai.label')}. <button type="button" class="key ghost small" data-report>${t('ai.report')}</button></p></div>`;
  }

  function errorList(e) {
    if (!e.errors?.length) return '';
    return html`<div class="stack-sm"><h3 class="small">${tt(`טעויות לתיקון (${e.errors.length})`, `Mistakes to fix (${e.errors.length})`)}</h3><p class="xsmall faint">${tt('נסו לתקן לבד לפי הרמז. את התיקון אפשר לחשוף אם צריך.', 'Try to fix each one from the hint. Reveal the correction only if you need it.')}</p>
      ${e.errors.map((er, i) => errorCard(er, i))}</div>`;
  }

  function errorCard(er, i) {
    const sev = SEVERITY[er.severity] || SEVERITY.important;
    const et = tx.error.get(er.type);
    const r = rung.get(i) ?? startFor(er);
    if (fixState(er)) attempted.add(i);
    return html`<div class="error-card ${er.severity === 'style' ? 'style' : ''}">
      <p class="row small"><span class="tag ${sev[2]}">${tt(sev[0], sev[1])}</span>${r >= 2 && et ? html`<span class="tag">${tt(et.name_he, et.name_en)}</span>` : ''}</p>
      <p class="row"><span class="quote" lang="en" dir="ltr">${er.quote}</span><button type="button" class="key small" data-locate="${i}">${icon('search', { size: 14 })} ${tt('להראות בטקסט', 'Show in my text')}</button></p>
      ${r === 1 ? html`<p class="small muted">${tt('יש כאן טעות. נסו למצוא ולתקן אותה בטקסט.', 'There is a mistake here. Try to find and fix it in your text.')}</p>` : ''}
      ${r >= 3 ? html`<p class="small">${icon('hint', { size: 14 })} <span dir="auto">${er.hint}</span></p>` : ''}
      <p class="xsmall" data-fix="${i}">${fixLabel(er)}</p>
      ${r >= 4 ? html`<p class="small">${tt('תיקון:', 'Correction:')} <strong lang="en" dir="ltr">${er.correction}</strong></p><p class="small" dir="auto">${er.explanation}</p>${er.explanation_he && hebrewSupport() !== 'off' ? html`<p class="small muted" lang="he" dir="rtl">${er.explanation_he}</p>` : ''}`
        : r < 3 ? html`<div class="row"><button type="button" class="key small" data-rung="${i}">${icon('hint', { size: 14 })} ${r === 1 ? tt('איזה סוג טעות?', 'What kind of mistake?') : tt('תקוע/ה? רמז', 'Stuck? A clue')}</button></div>`
        : html`<div class="row small"><button type="button" class="key small" data-rung="${i}" ${attempted.has(i) ? '' : html`disabled aria-describedby="need-${i}"`}>${tt('להשוות לתיקון', 'Compare with the correction')}</button>${attempted.has(i) ? '' : html`<span class="faint" id="need-${i}">${tt('נסו קודם תיקון בטקסט.', 'Try a fix in your text first.')}</span>`}</div>`}</div>`;
  }

  function fixLabel(er) {
    const st = fixState(er);
    return st === 'fixed' ? tt('נראה מתוקן. הטיוטה הבאה תיבדק.', 'Looks fixed. Your next draft will be checked.') : st === 'changed' ? tt('שיניתם את זה. הטיוטה הבאה תיבדק.', 'You changed this. Your next draft will be checked.') : '';
  }
  function cefrLabel(l) { return l === 'below_PreA1' ? '<Pre-A1' : LEVEL_LABEL[l] || l; }
  // From stage 7, learners rate themselves before seeing the AI's bands (research E, decision 31).
  function selfForm() {
    if ((task.stage || 0) < 7) return '';
    return html`<div class="panel flat stack-sm"><p class="small">${tt('לפני המשוב: איך הייתם מדרגים את עצמכם?', 'Before the feedback: how would you rate yourself?')}</p>
      ${SELF.map((id) => html`<label class="row small"><span class="grow">${tt(CATEGORY[id][0], CATEGORY[id][1])}</span><select class="input" style="width:auto;min-height:2.25rem;padding:0.2rem 0.5rem" data-self="${id}"><option value="">—</option>${[0, 1, 2, 3, 4, 5].map((n) => html`<option value="${n}" ${selfScores[id] === n ? html`selected` : ''}>${tt(BAND[n][0], BAND[n][1])}</option>`)}</select></label>`)}</div>`;
  }

  // Compare any two versions, or a version with the current text; previous vs latest by default
  // (persona panel P-73). Paragraph breaks are kept.
  function defaultCompare(vs) {
    if (vs.length >= 2) return { a: vs.at(-2).n, b: vs.at(-1).n };
    return vs.length ? { a: vs[0].n, b: 'now' } : null;
  }
  function compareView(vs) {
    cmp ||= defaultCompare(vs);
    if (!cmp) return '';
    const textOf = (n) => (n === 'now' ? text : vs.find((v) => v.n === n)?.text ?? '');
    const opt = (sel, side) => html`<select class="input compact" data-cmp="${side}" aria-label="${side === 'a' ? tt('גרסה ישנה', 'Older version') : tt('גרסה חדשה', 'Newer version')}">${vs.map((v) => html`<option value="${v.n}" ${sel === v.n ? html`selected` : ''}>v${v.n}</option>`)}${side === 'b' ? html`<option value="now" ${sel === 'now' ? html`selected` : ''}>${tt('הטקסט הנוכחי', 'Current text')}</option>` : ''}</select>`;
    const parts = cmp.a === cmp.b ? null : wordDiff(textOf(cmp.a), textOf(cmp.b));
    return html`<div class="panel flat stack-sm"><div class="row small"><span>${tt('השוואה', 'Compare')}</span>${opt(cmp.a, 'a')}<span aria-hidden="true">${tt('←', '→')}</span>${opt(cmp.b, 'b')}</div>
      ${!parts ? html`<p class="small faint">${tt('בחרו שתי גרסאות שונות.', 'Choose two different versions.')}</p>`
        : !parts.some((p) => p.type === 'add' || p.type === 'del') ? html`<p class="small faint">${tt('אין הבדלים.', 'No differences.')}</p>`
        : html`<div class="diff small" lang="en" dir="ltr">${parts.map((p) => (p.type === 'break' ? p.text : p.type === 'same' ? html`<span>${p.text}</span> ` : p.type === 'add' ? html`<ins>${p.text}</ins> ` : html`<del>${p.text}</del> `))}</div>
          <p class="xsmall faint"><ins>${tt('נוסף', 'added')}</ins> · <del>${tt('נמחק', 'removed')}</del></p>`}</div>`;
  }

  function versionsPanel() {
    const vs = versions();
    if (!vs.length) return html`<p class="small muted">${tt('כל בדיקה או שליחה שומרת גרסה. כך אפשר לראות מה השתנה.', 'Every check or submission saves a version, so you can see what changed.')}</p>${deleteRow()}`;
    // Only a final draft shows a level, and as a range (persona panel P-71).
    return html`<div class="stack">
      <ul class="stack-sm" style="list-style:none;padding:0;margin:0">${vs.map((v) => html`<li class="row small"><span class="tag num">v${v.n}</span><span class="grow">${new Date(v.at).toLocaleString(document.documentElement.lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })} · ${v.words} ${tt('מילים', 'words')}</span>${v.final ? html`<span class="tag level" title="${tt('טווח הרמה של הטיוטה הסופית', 'Level range of the final draft')}">${rangeOf(v.evaluation)}</span>` : v.evaluation ? html`<span class="tag">${tt('משוב AI', 'AI feedback')}</span>` : ''}</li>`)}</ul>
      ${compareView(vs)}${deleteRow()}</div>`;
  }

  // Delete this text, every version and the draft, here and on the server at the next sync (security review S-18).
  function deleteRow() {
    if (!versions().length && !store.get('writing', `${sumId}#draft`) && !store.get('writing', sumId)) return '';
    return html`<p class="xsmall faint row">${tt('הטקסט והגרסאות שמורים במכשיר, ואם יש לכם חשבון, גם בשרת.', 'The text and its versions are saved on this device and, if you have an account, on the server.')}<button type="button" class="key ghost small" data-delete>${icon('trash', { size: 14 })} ${tt('מחיקת הטקסט', 'Delete this text')}</button></p>`;
  }

  function sourcesPanel() {
    const pack = sourcePack() || [];
    return html`<div class="stack-sm">${task.topics?.[chosen]?.assignment ? html`<p class="xsmall faint">${tt('חומרי המקור של הנושא שבחרתם.', 'The source pack for the topic you chose.')}</p>` : ''}
      ${pack.map((s) => html`<div class="passage small source"><p><strong>${s.title}</strong> <span class="tag">${tt('חומר לדוגמה, לא נתונים אמיתיים', 'Illustrative, not real data')}</span></p>${s.text.split(/\n+/).map((p) => html`<p>${p}</p>`)}</div>`)}</div>`;
  }

  function topicPicker() {
    if (!task.topics?.length) return '';
    return html`<fieldset class="topic-pick stack-sm"><legend class="small"><strong>${tt('בחרו נושא אחד', 'Choose one topic')}</strong></legend>
      ${task.topics.map((tp, i) => html`<label class="note-row small"><input type="radio" name="topic" value="${i}" ${chosen === i ? html`checked` : ''}><span>${bi(tp)}${tp.assignment ? html` <span class="tag">${tt('עם חומרי מקור', 'With a source pack')}</span>` : ''}</span></label>`)}</fieldset>`;
  }

  function taskPanel() {
    const pack = sourcePack();
    const req = task.required || task.required_elements || [];
    return html`<div class="panel flat stack-sm">${isAssignment ? html`<p lang="en" dir="ltr" style="font-weight:500">${task.prompt}</p>` : ''}${bi(task.instructions)}
      ${task.audience ? html`<p class="small"><strong>${tt('למי כותבים:', 'Audience:')}</strong> <span lang="en" dir="ltr">${task.audience}</span></p>` : ''}
      ${topicPicker()}
      ${req.length ? html`<details ${task.final_task ? html`open` : ''}><summary class="small"><strong>${tt(`חובה לכלול (${req.length})`, `Must include (${req.length})`)}</strong></summary><ul class="small stack-sm req-list">${req.map((r) => html`<li>${bi(r)}</li>`)}</ul></details>` : ''}
      ${task.scaffold?.length ? html`<details><summary class="small">${tt('תוכנית עבודה', 'Plan it step by step')}</summary><ol class="small stack-sm" style="margin:var(--s2) 0 0;padding-inline-start:1.2rem">${task.scaffold.map((s) => html`<li>${bi(s)}</li>`)}</ol></details>` : ''}
      ${pack?.length ? html`<p class="row small">${icon('reading', { size: 16 })}<span class="grow">${tt(`חומרי מקור (${pack.length}), לדוגמה בלבד`, `Source pack (${pack.length}), illustrative only`)}</span><button type="button" class="key small" data-tab="sources" data-reveal>${tt('לפתוח ליד הטקסט', 'Open beside your text')}</button></p>` : ''}
      ${task.input_text ? html`<div class="passage small" lang="en" dir="ltr">${task.input_text.split(/\n+/).map((p) => html`<p>${p}</p>`)}</div>` : ''}
    </div>`;
  }

  // Self-check list and model answer: task material, kept above the editor so nothing hides behind it.
  function taskExtras() {
    const model = task.model_answer || task.exemplar;
    return html`${task.checklist?.length ? html`<details class="panel flat"><summary class="small">${tt('רשימת בדיקה עצמית', 'Self-check list')}</summary><div class="stack-sm" style="margin-top:var(--s2)">${task.checklist.map((c) => html`<label class="row small"><input type="checkbox"> ${bi(c)}</label>`)}</div></details>` : ''}
      ${model && !versions().length ? html`<p class="small faint row">${icon('lock', { size: 14 })} ${tt('דוגמה לתשובה תיפתח אחרי הבדיקה או המשוב הראשונים, כדי שתכתבו קודם בעצמכם.', 'A model answer opens after your first check or feedback, so you write it yourself first.')}</p>` : ''}
      ${model && versions().length ? html`<details class="panel flat"><summary class="small">${tt('דוגמה למשימה דומה', 'A model for a similar task')}</summary><div class="stack-sm small" style="margin-top:var(--s2)" lang="en" dir="ltr">${task.model_answer ? task.model_answer.split(/\n+/).map((p) => html`<p>${p}</p>`) : ''}${task.exemplar ? html`<p><strong>Outline</strong></p><p style="white-space:pre-wrap">${task.exemplar.outline}</p><p><strong>Annotated paragraph</strong></p><p style="white-space:pre-wrap">${task.exemplar.annotated_paragraph}</p>` : ''}</div></details>` : ''}`;
  }

  // On phones the feedback column is below the editor, so the mistakes are also listed right under it,
  // each one selecting its place in the text (persona panel P-30).
  function fixStrip() {
    const v = latestEval();
    const errs = v?.evaluation?.errors || [];
    if (!errs.length || tab !== 'ai') return '';
    return html`<div class="fix-strip stack-sm"><p class="xsmall faint">${tt('טעויות לתיקון: הקישו כדי לסמן בטקסט', 'Mistakes to fix: tap to select in your text')}</p><div class="row">${errs.map((er, i) => html`<button type="button" class="chip" data-locate="${i}" lang="en" dir="ltr">${er.quote}</button>`)}</div></div>`;
  }

  function draw() {
    const words = bodyWords();
    const refs = splitReferences(text).references;
    const stage = STAGES.find((s) => s[0] === task.stage);
    const why = aiReady ? aiWhy() : '';
    const tabs = [['checks', 'בדיקות', 'Checks'], ['ai', 'משוב AI', 'AI feedback'], ['versions', 'גרסאות', 'Versions'], ...(sourcePack()?.length ? [['sources', 'מקורות', 'Sources']] : [])];
    if (tab === 'sources' && !sourcePack()?.length) tab = 'checks';
    render(el, html`
      <div class="page-head"><div><p class="small faint"><a href="#/writing">${t('nav.writing')}</a>${stage ? html` · ${tt(`שלב ${stage[0]}: ${stage[2]}`, `Stage ${stage[0]}: ${stage[1]}`)}` : ''}</p><h1>${legend(task.title_en, task.title_he)}</h1></div>${task.level ? levelTag(task.level) : ''}</div>
      <div class="editor">
        <div class="stack">
          ${taskPanel()}
          ${taskExtras()}
          ${task.time_limit_min ? html`<div class="row small"><span>${icon('clock', { size: 16 })} ${tt(`כתיבה בזמן: ${task.time_limit_min} דקות (רשות)`, `Timed writing: ${task.time_limit_min} minutes (optional)`)}</span><button type="button" class="key small" data-timer>${timerEnd ? tt('עצירה', 'Stop') : tt('להתחיל טיימר', 'Start timer')}</button><span class="num" data-time aria-live="off"></span></div>` : ''}
          <div class="editor-pane stack-sm">
            <label class="sr-only" for="essay">${tt('הטקסט שלך', 'Your text')}</label>
            <textarea class="input" id="essay" lang="en" dir="ltr" spellcheck="false" placeholder="${tt('כתבו כאן באנגלית…', 'Write here in English…')}">${text}</textarea>
            <div class="row between"><div class="editor-stats"><span class="num" data-wc>${wordLabel(words, refs)}</span>${minWords ? html`<span>${tt('יעד', 'target')} ${minWords}${maxWords ? `-${maxWords}` : '+'}</span>` : ''}<span class="faint" data-saved>${draftRec ? tt('הטיוטה נשמרה', 'Draft saved') : ''}</span></div>
              <div class="row"><button type="button" class="key" data-check ${words < 3 ? html`disabled` : ''}>${tt('בדיקה אוטומטית', 'Check')}</button>
                ${aiReady ? html`<button type="button" class="key enter" data-ai ${busy || why ? html`disabled aria-describedby="ai-why"` : ''}>${busy ? html`<span class="spinner" aria-hidden="true" style="width:1rem;height:1rem"></span>` : ''} ${latestEval() ? tt('שליחת טיוטה מתוקנת', 'Submit revised draft') : tt('קבלת משוב', 'Get feedback')}</button>` : ''}</div></div>
            ${aiReady ? html`<p class="xsmall faint" id="ai-why" data-ai-why>${why}</p>` : ''}
            ${!aiReady ? html`<p class="xsmall faint row">${icon('info', { size: 14 })} ${!configured() || !CONFIG.aiEnabled ? tt('משוב AI לא הוגדר בשרת הזה; הבדיקות האוטומטיות עובדות.', 'AI feedback is not configured on this server; automatic checks work.') : !auth.signedIn ? tt('משוב AI זמין אחרי כניסה לחשבון.', 'AI feedback is available after you sign in.') : tt('אפשר להפעיל משוב AI בהגדרות.', 'You can turn on AI feedback in Settings.')}</p>` : ''}
            ${busyStatus()}
            <p class="small" role="status" data-status>${busy ? '' : checkedNote}</p>
            ${aiError ? html`<p class="error-text" role="alert">${aiError}</p>` : ''}
            ${aiNote ? html`<p class="xsmall faint">${aiNote}</p>` : ''}
            ${fixStrip()}
          </div>
        </div>
        <aside class="panel stack essay-side" aria-label="${tt('משוב', 'Feedback')}" tabindex="-1">
          <div class="seg" role="group">${tabs.map(([k, he, en]) => html`<button type="button" data-tab="${k}" aria-pressed="${tab === k}">${tt(he, en)}</button>`)}</div>
          ${tab === 'checks' ? analysisPanel() : tab === 'ai' ? aiPanel() : tab === 'sources' ? sourcesPanel() : versionsPanel()}
        </aside>
      </div>`);
    tickElapsed();
  }
  function wordLabel(words, refs) {
    const r = refs ? countWords(refs) : 0;
    return r ? tt(`${words} מילים (+${r} ברשימת המקורות)`, `${words} words (+${r} in references)`) : `${words} ${tt('מילים', 'words')}`;
  }

  // An empty editor with no saved draft (for example right after "Delete this text") writes nothing.
  const saveDraft = debounce(() => {
    if (!text && chosen == null && !store.get('writing', `${sumId}#draft`)) return;
    store.put('writing', { id: `${sumId}#draft`, kind: 'essay-draft', exercise: task.id, text, topic: chosen });
    const s = $('[data-saved]', el); if (s) s.textContent = tt('הטיוטה נשמרה', 'Draft saved');
  }, 600);

  // Live updates while typing, without redrawing (the textarea keeps focus).
  function refreshLive() {
    const wc = $('[data-wc]', el); if (wc) wc.textContent = wordLabel(bodyWords(), splitReferences(text).references);
    const ck = $('[data-check]', el); if (ck) ck.disabled = countWords(text) < 3;
    const why = aiWhy();
    const ai = $('[data-ai]', el);
    if (ai && !busy) { ai.disabled = Boolean(why); if (why) ai.setAttribute('aria-describedby', 'ai-why'); else ai.removeAttribute('aria-describedby'); }
    const w = $('[data-ai-why]', el); if (w && !busy) w.textContent = why;
  }
  const markAttempts = debounce(() => {
    (latestEval()?.evaluation?.errors || []).forEach((er, i) => {
      const f = $(`[data-fix="${i}"]`, el); if (f) f.textContent = fixLabel(er);
      if (!fixState(er) || attempted.has(i)) return;
      attempted.add(i);
      const b = $(`[data-rung="${i}"]`, el); if (b) { b.disabled = false; b.removeAttribute('aria-describedby'); }
      $(`#need-${i}`, el)?.remove();
    });
  }, 250);

  function putSummary(patch) {
    const cur = store.get('writing', sumId);
    store.put('writing', { id: sumId, kind: 'essay-summary', exercise: task.id, title: task.title_en, status: 'draft', versions: 0, ...(cur || {}), last_estimate: null, ...patch, updated: new Date().toISOString() });
  }

  function saveVersion(evaluation = null, body = text) {
    const vs = versions();
    const last = vs.at(-1);
    if (last && last.text === body && !evaluation) return last;
    const n = last && last.text === body ? last.n : (last?.n || 0) + 1;
    const rec = { id: `${sumId}#${n}`, kind: 'essay-version', exercise: task.id, n, text: body, words: countWords(splitReferences(body).body), at: new Date().toISOString(), level, topic: chosen, analysis: { stats: analysis?.stats, issues: analysis?.issues?.length || 0 }, evaluation: evaluation || (last?.n === n ? last.evaluation : null) };
    store.put('writing', rec);
    cmp = null; // back to previous vs latest
    const status = store.get('writing', sumId)?.status;
    putSummary({ status: status === 'final' ? 'final' : evaluation || status === 'evaluated' ? 'evaluated' : 'draft', versions: n });
    return rec;
  }

  // The last draft with feedback becomes final: the level range appears and the task counts as done.
  function markFinal(v, { auto = false } = {}) {
    store.put('writing', { ...v, final: true });
    putSummary({ status: 'final', final_range: rangeOf(v.evaluation) });
    logEvent({ type: 'writing-final', exercise: task.id, estimate: v.evaluation?.cefr_estimate, auto });
  }

  function payload(sent, prev) {
    const tp = task.topics?.[chosen];
    const pack = sourcePack();
    const instructions = [isAssignment ? task.prompt : '', task.instructions.en, tp ? `Topic chosen by the learner: ${tp.en}` : '',
      pack?.length ? `Source pack (fictional, invented for this task; the assessor sees only these titles): ${pack.map((s) => s.title).join(' | ')}` : ''].filter(Boolean).join('\n').slice(0, 4000);
    return {
      task: 'evaluate_writing', level, hebrew_support: hebrewSupport(), feedback_scope: scope(), stage: task.stage || 0, draft_number: evaluatedCount() + 1,
      exercise: { title: task.title_en, instructions, kind: task.kind || 'essay', min_words: minWords || undefined, max_words: maxWords || undefined, focus: task.focus || [], required_elements: (task.required_elements || []).slice(0, 12) },
      text: sent,
      ...(prev ? { previous: { text: prev.text, priorities: prev.evaluation?.priorities || [] } } : {}),
    };
  }
  const bytes = (o) => new TextEncoder().encode(JSON.stringify(o)).length;

  async function getFeedback() {
    if (busy || aiWhy()) return;
    analysis = analyze();
    const sent = text;
    const prev = latestEval();
    let body = payload(sent, prev);
    aiNote = '';
    // A long paper and its previous draft may not fit in one request: then the drafts are not compared.
    if (prev && bytes(body) > AI_BODY_MAX) { body = payload(sent, null); aiNote = tt('הטיוטה ארוכה מדי כדי לשלוח אותה יחד עם הקודמת, ולכן המשוב הפעם לא משווה בין הטיוטות.', 'This draft is too long to send together with the previous one, so this time the feedback does not compare drafts.'); }
    if (bytes(body) > AI_BODY_MAX) { aiError = aiErrorText({ code: 'too_large' }); draw(); return; }
    busy = true; aiError = ''; tab = 'ai'; busySince = Date.now(); draw(); revealPanel();
    busyTimer = setInterval(tickElapsed, 1000);
    try {
      const r = await callAI(body);
      const ev = { ...r.evaluation, self: Object.keys(selfScores).length ? { ...selfScores } : null };
      const v = saveVersion(ev, sent);
      selfScores = {};
      rung.clear(); attempted.clear();
      // AI-confirmed errors feed the recurring-mistake tracker; one writing attempt records the overall band.
      for (const er of ev.errors || []) if (er.severity !== 'style') recordAttempt({ source: 'writing', exercise: task.id, topic, skill: 'writing', level, correct: false, error_type: er.type, response: er.quote });
      const scored = (ev.categories || []).filter((c) => c.applicable && c.score != null);
      recordAttempt({ source: 'writing', exercise: task.id, topic, skill: 'writing', level, correct: scored.length ? scored.reduce((a, c) => a + c.score, 0) / scored.length >= 3 : true, score: scored.length ? scored.reduce((a, c) => a + c.score, 0) / scored.length / 5 : null });
      logEvent({ type: 'writing', exercise: task.id });
      // After the last round the draft is final (persona panel P-80).
      if (evaluatedCount() >= MAX_EVALS) { markFinal(v, { auto: true }); toast(tt('זה היה סבב המשוב האחרון, ולכן הטיוטה הזו היא עכשיו הסופית.', 'That was the last feedback round, so this draft is now your final draft.')); }
    } catch (e) {
      aiError = aiErrorText(e);
    }
    busy = false; clearInterval(busyTimer); draw(); revealPanel();
  }
  function tickElapsed() {
    const s = $('[data-elapsed]', el);
    if (s && busy) { const n = Math.floor((Date.now() - busySince) / 1000); s.textContent = `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; }
  }

  // When the feedback column is below the fold (phones), bring it into view (persona panel P-63).
  function revealPanel() {
    const side = $('aside.essay-side', el);
    if (!side || side.getBoundingClientRect().top < innerHeight - 96) return;
    side.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    side.focus({ preventScroll: true });
  }

  // Select a quoted mistake in the textarea, at the place it was in the assessed draft (persona panel P-30).
  function selectInEditor(i) {
    const v = latestEval();
    const er = v?.evaluation?.errors?.[i];
    const ta = $('#essay', el);
    const span = er && ta && locateSpan(v.text, text, er.quote);
    if (!span) { toast(tt('הקטע הזה כבר לא בטקסט הנוכחי.', 'This part is no longer in your current text.')); return; }
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(span[0], span[1]);
    const y = caretTop(ta, span[0]);
    ta.scrollTop = Math.max(0, y - ta.clientHeight / 3);
    // Then bring the selected line itself into the window.
    const line = ta.getBoundingClientRect().top + y - ta.scrollTop;
    if (line < 40 || line > innerHeight - 80) scrollBy({ top: line - innerHeight / 3 });
  }
  // Pixel offset of a character in a textarea, measured with a hidden copy that wraps the same way.
  function caretTop(ta, pos) {
    const cs = getComputedStyle(ta);
    const m = document.createElement('div');
    for (const p of ['boxSizing', 'width', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'wordSpacing', 'direction']) m.style[p] = cs[p];
    Object.assign(m.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', top: '0', insetInlineStart: '-9999px' });
    m.textContent = ta.value.slice(0, pos);
    const mark = m.appendChild(document.createElement('span'));
    mark.textContent = '​';
    document.body.append(m);
    const top = mark.offsetTop;
    m.remove();
    return top;
  }

  async function deleteText() {
    const ok = await confirmDialog({ title: tt('למחוק את הטקסט?', 'Delete this text?'), body: tt('הטקסט, כל הגרסאות שלו והמשוב יימחקו מהמכשיר, ואם יש לכם חשבון, גם מהשרת בסנכרון הבא. ההתקדמות שלכם (דירוגים וסוגי טעויות) נשמרת, בלי ציטוטים מהטקסט.', 'The text, all its versions and the feedback are removed from this device and, if you have an account, from the server at the next sync. Your progress (bands and mistake types) stays, without quotes from the text.'), confirm: tt('מחיקה', 'Delete'), danger: true });
    if (!ok) return;
    for (const w of store.all('writing').filter((x) => x.exercise === task.id)) store.remove('writing', w.id);
    for (const a of store.all('attempts').filter((x) => x.source === 'writing' && x.exercise === task.id && x.response)) store.update('attempts', a.id, { response: null });
    logEvent({ type: 'writing-deleted', exercise: task.id });
    text = ''; chosen = null; analysis = null; cmp = null; aiError = ''; aiNote = ''; checkedNote = ''; rung.clear(); attempted.clear(); tab = 'checks';
    draw();
    toast(tt('הטקסט נמחק.', 'The text was deleted.'));
  }

  draw();
  const offs = [
    on(el, 'input', '#essay', (e) => { text = e.target.value; refreshLive(); markAttempts(); saveDraft(); }),
    on(el, 'change', 'input[name=topic]', (e, r) => { chosen = Number(r.value); saveDraft(); draw(); }),
    on(el, 'click', '[data-check]', () => {
      analysis = analyze(); saveVersion(); tab = 'checks'; logEvent({ type: 'writing', exercise: task.id });
      const n = analysis.issues.length;
      checkedNote = n ? tt(`הבדיקה מצאה ${n === 1 ? 'דבר אחד' : `${n} דברים`} לבדוק.`, `The check found ${n} thing${n === 1 ? '' : 's'} to look at.`) : tt('הבדיקה לא מצאה בעיות מוכרות.', 'The check found no known problems.');
      draw(); revealPanel();
    }),
    on(el, 'click', '[data-ai]', (e, b) => { if (!b.disabled) getFeedback(); }),
    on(el, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; draw(); if (b.hasAttribute('data-reveal')) revealPanel(); }),
    on(el, 'click', '[data-locate]', (e, b) => selectInEditor(Number(b.dataset.locate))),
    on(el, 'click', '[data-rung]', (e, b) => {
      const i = Number(b.dataset.rung);
      const er = latestEval()?.evaluation?.errors?.[i];
      if (!er || b.disabled) return;
      const next = Math.min(4, (rung.get(i) ?? startFor(er)) + 1);
      rung.set(i, next);
      logEvent({ type: 'hint-level', exercise: task.id, error: er.type, level: next, after: attempted.has(i) ? 'attempt' : 'stuck' });
      draw();
    }),
    on(el, 'change', '[data-self]', (e, sel) => { if (sel.value === '') delete selfScores[sel.dataset.self]; else selfScores[sel.dataset.self] = Number(sel.value); }),
    on(el, 'change', '[data-cmp]', (e, sel) => { cmp = { ...cmp, [sel.dataset.cmp]: sel.value === 'now' ? 'now' : Number(sel.value) }; draw(); }),
    on(el, 'click', '[data-final]', () => { const v = latestEval(); if (v) { markFinal(v); draw(); } }),
    on(el, 'click', '[data-delete]', () => deleteText()),
    on(el, 'click', '[data-report]', () => { logEvent({ type: 'ai-report', exercise: task.id, version: latestEval()?.n }); toast(tt('תודה. הדיווח נשמר ויעזור לבדוק את איכות המשוב.', 'Thanks. Your report was saved and helps us audit feedback quality.')); }),
    on(el, 'click', '[data-timer]', () => {
      if (timerEnd) { clearInterval(timerId); timerEnd = null; draw(); return; }
      timerEnd = Date.now() + task.time_limit_min * 60_000; draw();
      timerId = setInterval(() => { const left = Math.max(0, timerEnd - Date.now()); const s = $('[data-time]', el); if (s) s.textContent = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`; if (!left) { clearInterval(timerId); toast(tt('הזמן נגמר. אפשר לסיים את המשפט ולבדוק.', 'Time is up. Finish your sentence and check.')); } }, 1000);
    }),
  ];
  return () => { offs.forEach((o) => o()); clearInterval(timerId); clearInterval(busyTimer); saveDraft.flush?.(); };
}
