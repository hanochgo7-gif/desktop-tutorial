// Essay editor: write, check, get feedback, revise, compare versions.
// Automatic checks always work. AI feedback (when configured) marks errors hint-first: the learner
// sees what and why, tries a fix, and reveals the correction only if needed. Every submission is a
// version; versions can be compared word by word.
import { html, render, on, $, debounce } from '../core/util.js';
import { tt, t, bi, legend, hebrewSupport } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, levelTag, toast, emptyState, LEVEL_LABEL } from '../ui/components.js';
import { model, settings, recordAttempt, logEvent } from '../core/learner.js';
import { store } from '../core/store.js';
import { analyzeWriting } from '../core/writing-analyzer.js';
import { countWords } from '../core/grading.js';
import { callAI, configured, auth } from '../core/api.js';
import { CONFIG } from '../../config.js';
import { runSet } from '../ui/player.js';
import { STAGES } from './writing.js';
import { wordDiff } from '../core/diff.js';

const BAND = [['לא הודגם', 'Not shown'], ['רחוק מהיעד', 'Well below target'], ['מתקרב ליעד', 'Approaching target'], ['עומד ביעד', 'Meets target'], ['מעל היעד', 'Above target'], ['מעבר ליעד', 'Beyond target']];
const CATEGORY = {
  grammar: ['דקדוק', 'Grammar'], vocabulary: ['אוצר מילים', 'Vocabulary'], sentence_structure: ['מבנה משפטים', 'Sentence structure'],
  coherence: ['קוהרנטיות', 'Coherence'], cohesion: ['לכידות', 'Cohesion'], argument_strength: ['חוזק הטיעון', 'Argument strength'],
  evidence_quality: ['איכות הראיות', 'Evidence'], counterarguments: ['טיעונים נגדיים', 'Counterarguments'], academic_tone: ['טון אקדמי', 'Academic tone'],
  clarity: ['בהירות', 'Clarity'], precision: ['דיוק', 'Precision'], overall: ['הערכה כוללת', 'Overall'],
};
const SEVERITY = { critical: ['חשוב לתקן', 'Must fix', 'bad'], important: ['כדאי לתקן', 'Should fix', 'warn'], style: ['שיפור סגנון', 'Style', 'cobalt'] };
const ARGUMENTATIVE = new Set(['argument-construction', 'thesis-development', 'counterargument', 'essay', 'critical-response', 'research', 'timed', 'evidence-evaluation']);
// Each level ends with a writing task from the curriculum (A1 self-introduction ... C2 research paper).
const FINAL_FOCUS = { 1: ['grammar', 'vocabulary', 'clarity'], 2: ['coherence', 'cohesion', 'grammar'], 3: ['coherence', 'argument_strength', 'cohesion'], 6: ['argument_strength', 'evidence_quality', 'counterarguments'], 8: ['argument_strength', 'evidence_quality', 'academic_tone', 'precision'], 10: ['argument_strength', 'evidence_quality', 'counterarguments', 'academic_tone', 'precision'] };
function finalTask(cur, level) {
  const lvl = cur?.levels?.find((l) => l.id === level);
  const fa = lvl?.final_assessment;
  if (!fa) return null;
  return {
    id: `final-${level}`, final_task: true, stage: fa.stage || 0, level, kind: 'essay',
    title_en: `Final writing task: ${LEVEL_LABEL[level]}`, title_he: `משימת הסיום של ${LEVEL_LABEL[level]}`,
    instructions: { en: fa.task, he: fa.task_he || null }, min_words: fa.min_words, max_words: fa.max_words || null,
    focus: FINAL_FOCUS[fa.stage] || FREE.focus, checklist: [],
  };
}

const FREE = { id: 'free', stage: 0, level: null, kind: 'essay', title_en: 'Free writing', title_he: 'כתיבה חופשית', instructions: { en: 'Write about anything you like. Use the checks to improve it.', he: 'כתבו על כל נושא שתרצו, והשתמשו בבדיקות כדי לשפר.' }, min_words: 30, focus: ['grammar', 'vocabulary', 'clarity'], checklist: [] };

export default async function essay(el, ctx) {
  const id = ctx.params.id;
  const [ex, as, tx, cur] = await Promise.all([content.writingExercises(), content.assignments(), taxonomyIndex(), content.curriculum()]);
  const task = id === 'free' ? FREE : id.startsWith('final-') ? finalTask(cur, id.slice(6)) : (ex?.exercises || []).find((x) => x.id === id) || (as?.assignments || []).find((x) => x.id === id);
  if (!task) { render(el, emptyState({ title: tt('התרגיל לא נמצא', 'Exercise not found'), action: html`<a class="key enter" href="#/writing">${t('nav.writing')}</a>` })); return; }
  ctx.setTitle(task.title_en);
  const m = model();
  const level = task.level || m.courseLevel;
  const isAssignment = Boolean(task.prompt);
  const minWords = task.word_range?.[0] ?? task.min_words ?? 0;
  const maxWords = task.word_range?.[1] ?? task.max_words ?? null;
  const topic = { 1: 'sentence-basics', 2: 'paragraph-basics', 3: 'opinion-language', 4: 'argument-structure', 5: 'argument-structure', 6: 'argument-structure', 7: 'essay-structure-basic', 8: 'fallacies', 9: 'hedging', 10: 'argument-architecture' }[task.stage] || 'sentence-basics';

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
  let analysis = text ? analyzeWriting(text, { level, minWords, maxWords, mustInclude: task.must_include || [], formal: ['B2', 'C1', 'C2'].includes(level) && task.stage >= 7 }) : null;
  let busy = false; let aiError = '';
  let tab = 'checks';
  let compareWith = null;
  // Hint ladder (research E 9.5): 1 locate, 2 name the error type, 3 clue, 4 correction with explanation.
  // Grammar starts at "name" for A1-A2 and at "locate" above; spelling and word choice always start at "locate".
  // "Next hint" works as an explicit "I'm stuck", but the correction opens only after a real attempt in the text,
  // so the ladder cannot be clicked straight through to the answer.
  const rung = new Map();
  const attempted = new Set();
  const LEXICAL = new Set(['spelling', 'word-choice', 'false-friend', 'capitalization', 'punctuation']);
  const startFor = (er) => (LEXICAL.has(er.type) ? 1 : ['PreA1', 'A1', 'A2'].includes(level) ? 2 : 1);
  const fixState = (er) => (text.includes(er.quote) ? null : er.correction && text.includes(er.correction) ? 'fixed' : 'changed');
  const MAX_EVALS = 3; // first draft plus at most two AI revision cycles (research E 9.6)
  const SELF = ['argument_strength', 'evidence_quality', 'counterarguments', 'coherence'];
  let selfScores = {};
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
  let timerEnd = null; let timerId = null;

  const latestEval = () => versions().filter((v) => v.evaluation).at(-1) || null;
  const scope = () => { const s = settings().feedback_scope; return s !== 'auto' ? s : ['B2', 'C1', 'C2'].includes(level) ? 'comprehensive' : 'focused'; };

  function analysisPanel() {
    if (!analysis) return html`<p class="small muted">${tt('כתבו, ואז לחצו ״בדיקה״. הבדיקות האוטומטיות עובדות גם בלי AI.', 'Write, then press "Check". Automatic checks work without AI.')}</p>`;
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

  function aiPanel() {
    const v = latestEval();
    if (!aiReady) {
      return html`<div class="stack-sm"><p class="banner small">${icon('info', { size: 18 })}<span>${!configured() || !CONFIG.aiEnabled ? t('ai.unavailable') : !auth.signedIn ? tt('כדי לקבל משוב AI צריך להיכנס לחשבון.', 'Sign in to get AI feedback.') : tt('הפעילו ״משוב AI״ בהגדרות.', 'Turn on "AI feedback" in Settings.')}</span></p></div>`;
    }
    if (!v) return html`<p class="small muted">${tt('שלחו את הטקסט למשוב כדי לקבל הערכה לפי 12 קטגוריות, טעויות עם רמזים ומשימות לתיקון.', 'Send your text for feedback to get an assessment across 12 categories, mistakes with hints, and revision tasks.')}</p>${selfForm()}`;
    const e = v.evaluation;
    return html`<div class="stack">
      ${e.task_fulfilment && e.task_fulfilment.status !== 'complete' ? html`<p class="banner warn small">${icon('alert', { size: 16 })}<span dir="auto"><strong>${e.task_fulfilment.status === 'off_topic' ? tt('הטקסט לא עונה על המשימה.', 'The text does not answer the task.') : tt('חלק מהמשימה חסר.', 'Part of the task is missing.')}</strong> ${e.task_fulfilment.note}</span></p>` : ''}
      ${v.final || evaluatedCount() >= MAX_EVALS ? html`<div class="row between"><span class="small">${tt('הערכת רמה של הטקסט (טווח)', 'Estimated level of this text (range)')}</span><span class="tag level">${cefrLabel(e.cefr_low)}${e.cefr_low !== e.cefr_high ? html`–${cefrLabel(e.cefr_high)}` : ''}</span></div>`
        : html`<div class="row between small"><span class="muted">${tt('בזמן תיקונים רואים דירוג לפי קטגוריות. הערכת הרמה הכוללת מופיעה בטיוטה הסופית.', 'While you revise you see category bands. The overall level appears on your final draft.')}</span><button type="button" class="key ghost small" data-final>${tt('זו הטיוטה הסופית', 'This is my final draft')}</button></div>`}
      <p dir="auto">${e.summary}</p>${e.summary_he && hebrewSupport() !== 'off' ? html`<p lang="he" dir="rtl" class="muted small">${e.summary_he}</p>` : ''}
      ${e.revision?.progress_since_previous ? html`<div class="banner small">${icon('compare', { size: 16 })}<span dir="auto">${e.revision.progress_since_previous}</span></div>` : ''}
      ${e.strengths?.length ? html`<div class="stack-sm"><h3 class="small">${tt('מה עובד', 'What works')}</h3>${e.strengths.map((s) => html`<p class="row small">${icon('check', { size: 16 })}<span dir="auto">${s}</span></p>`)}</div>` : ''}
      ${evaluatedCount() < MAX_EVALS && !v.final ? selfForm() : ''}
      ${evaluatedCount() >= MAX_EVALS ? html`<p class="xsmall faint">${tt('זה היה סבב המשוב האחרון למשימה הזו. כדי לבדוק העברה, נסו משימה חדשה בשלב הזה.', 'That was the last feedback round for this task. To check that it transfers, try a new task at this stage.')}</p>` : ''}
      ${e.revision?.tasks?.length ? html`<div class="stack-sm"><h3 class="small">${tt('לטיוטה הבאה', 'For your next draft')}</h3><ol class="small stack-sm" style="margin:0;padding-inline-start:1.2rem">${e.revision.tasks.map((x) => html`<li dir="auto">${x}</li>`)}</ol></div>` : ''}
      ${e.errors?.length ? html`<div class="stack-sm"><h3 class="small">${tt(`טעויות לתיקון (${e.errors.length})`, `Mistakes to fix (${e.errors.length})`)}</h3><p class="xsmall faint">${tt('נסו לתקן לבד לפי הרמז. את התיקון אפשר לחשוף אם צריך.', 'Try to fix each one from the hint. Reveal the correction only if you need it.')}</p>
        ${e.errors.map((er, i) => { const sev = SEVERITY[er.severity] || SEVERITY.important; const et = tx.error.get(er.type); const r = rung.get(i) ?? startFor(er); if (fixState(er)) attempted.add(i); return html`<div class="error-card ${er.severity === 'style' ? 'style' : ''}">
          <p class="row small"><span class="tag ${sev[2]}">${tt(sev[0], sev[1])}</span>${r >= 2 && et ? html`<span class="tag">${tt(et.name_he, et.name_en)}</span>` : ''}</p>
          <p><span class="quote" lang="en" dir="ltr">${er.quote}</span></p>
          ${r === 1 ? html`<p class="small muted">${tt('יש כאן טעות. נסו למצוא ולתקן אותה בטקסט.', 'There is a mistake here. Try to find and fix it in your text.')}</p>` : ''}
          ${r >= 3 ? html`<p class="small">${icon('hint', { size: 14 })} <span dir="auto">${er.hint}</span></p>` : ''}
          <p class="xsmall" data-fix="${i}">${fixLabel(er)}</p>
          ${r >= 4 ? html`<p class="small">${tt('תיקון:', 'Correction:')} <strong lang="en" dir="ltr">${er.correction}</strong></p><p class="small" dir="auto">${er.explanation}</p>${er.explanation_he && hebrewSupport() !== 'off' ? html`<p class="small muted" lang="he" dir="rtl">${er.explanation_he}</p>` : ''}`
            : r < 3 ? html`<button type="button" class="key ghost small" data-rung="${i}">${r === 1 ? tt('איזה סוג טעות?', 'What kind of mistake?') : tt('תקוע/ה: רמז', 'Stuck? A clue')}</button>`
            : html`<div class="row small"><button type="button" class="key ghost small" data-rung="${i}" ${attempted.has(i) ? '' : html`disabled aria-describedby="need-${i}"`}>${tt('להשוות לתיקון', 'Compare with the correction')}</button>${attempted.has(i) ? '' : html`<span class="faint" id="need-${i}">${tt('נסו קודם תיקון בטקסט.', 'Try a fix in your text first.')}</span>`}</div>`}</div>`; })}</div>` : ''}
      <div class="stack-sm"><h3 class="small">${tt('לפי קטגוריה', 'By category')}</h3><div class="rubric">${e.categories.filter((c) => c.applicable).map((c) => html`<div class="rubric-row"><span>${tt(CATEGORY[c.id]?.[0] || c.id, CATEGORY[c.id]?.[1] || c.id)}</span><span class="band">${e.low_confidence?.includes(c.id) ? html`<span title="${tt('הערכה לא ודאית', 'Low-confidence estimate')}">~</span>` : ''}${tt(BAND[c.score ?? 0][0], BAND[c.score ?? 0][1])}${e.self?.[c.id] != null ? html` <span class="xsmall faint">(${tt('הערכה עצמית', 'you said')}: ${tt(BAND[e.self[c.id]][0], BAND[e.self[c.id]][1])})</span>` : ''}</span>
        <details><summary class="xsmall">${tt('פירוט', 'Details')}</summary><div class="stack-sm" style="margin-top:var(--s2)"><p dir="auto">${c.explanation}</p>${c.examples.map((x) => html`<p class="small"><span class="quote" lang="en" dir="ltr">${x.quote}</span> <span class="muted" dir="auto">${x.comment}</span></p>`)}<p dir="auto"><strong>${tt('לשפר:', 'Improve:')}</strong> ${c.improvement}</p><p dir="auto" class="muted"><strong>${tt('לתרגל:', 'Practise:')}</strong> ${c.practice}</p></div></details></div>`)}</div>
        <p class="xsmall faint">${tt(`הדירוג ביחס ליעד של רמה ${LEVEL_LABEL[level] || level}. ${t('level.estimate')}.`, `Bands are relative to the ${LEVEL_LABEL[level] || level} target. ${t('level.estimate')}.`)}</p></div>
      ${e.required_elements?.length ? html`<div class="stack-sm"><h3 class="small">${tt('רכיבי חובה', 'Required elements')}</h3>${e.required_elements.map((r) => html`<p class="row small">${icon(r.present ? 'check' : 'x', { size: 16 })}<span dir="auto"><strong>${r.element}</strong> · ${r.comment}</span></p>`)}</div>` : ''}
      <p class="xsmall faint row">${icon('alert', { size: 14 })} ${t('ai.label')}. <button type="button" class="key ghost small" data-report>${t('ai.report')}</button></p></div>`;
  }

  function fixLabel(er) {
    const st = fixState(er);
    return st === 'fixed' ? tt('נראה מתוקן. הטיוטה הבאה תיבדק.', 'Looks fixed. Your next draft will be checked.') : st === 'changed' ? tt('שיניתם את זה. הטיוטה הבאה תיבדק.', 'You changed this. Your next draft will be checked.') : '';
  }
  function evaluatedCount() { return versions().filter((x) => x.evaluation).length; }
  function cefrLabel(l) { return l === 'below_PreA1' ? '<Pre-A1' : LEVEL_LABEL[l] || l; }
  // From stage 7, learners rate themselves before seeing the AI's bands (research E, decision 31).
  function selfForm() {
    if ((task.stage || 0) < 7) return '';
    return html`<div class="panel flat stack-sm"><p class="small">${tt('לפני המשוב: איך הייתם מדרגים את עצמכם?', 'Before the feedback: how would you rate yourself?')}</p>
      ${SELF.map((id) => html`<label class="row small"><span class="grow">${tt(CATEGORY[id][0], CATEGORY[id][1])}</span><select class="input" style="width:auto;min-height:2.25rem;padding:0.2rem 0.5rem" data-self="${id}"><option value="">—</option>${[0, 1, 2, 3, 4, 5].map((n) => html`<option value="${n}" ${selfScores[id] === n ? html`selected` : ''}>${tt(BAND[n][0], BAND[n][1])}</option>`)}</select></label>`)}</div>`;
  }

  function versionsPanel() {
    const vs = versions();
    if (!vs.length) return html`<p class="small muted">${tt('כל בדיקה או שליחה שומרת גרסה. כך אפשר לראות מה השתנה.', 'Every check or submission saves a version, so you can see what changed.')}</p>`;
    const base = vs.find((v) => v.n === compareWith);
    return html`<div class="stack">
      <ul class="stack-sm" style="list-style:none;padding:0;margin:0">${vs.map((v) => html`<li class="row small"><span class="tag num">v${v.n}</span><span class="grow">${new Date(v.at).toLocaleString(document.documentElement.lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })} · ${v.words} ${tt('מילים', 'words')}</span>${v.evaluation ? html`<span class="tag level">${v.evaluation.cefr_estimate}</span>` : ''}<button type="button" class="key ghost small" data-compare="${v.n}" aria-pressed="${compareWith === v.n}">${tt('השוואה', 'Compare')}</button></li>`)}</ul>
      ${base ? html`<div class="panel flat"><p class="xsmall faint">${tt(`השוואה בין v${base.n} לטקסט הנוכחי`, `Comparing v${base.n} with your current text`)}</p><div class="small" lang="en" dir="ltr" style="line-height:1.8">${wordDiff(base.text, text).map((p) => p.type === 'same' ? html`<span>${p.text} </span>` : p.type === 'add' ? html`<ins style="background:var(--ok-tint);text-decoration:none">${p.text}</ins> ` : html`<del style="background:var(--bad-tint)">${p.text}</del> `)}</div></div>` : ''}</div>`;
  }

  function draw() {
    const words = countWords(text);
    const stage = STAGES.find((s) => s[0] === task.stage);
    render(el, html`
      <div class="page-head"><div><p class="small faint"><a href="#/writing">${t('nav.writing')}</a>${stage ? html` · ${tt(`שלב ${stage[0]}: ${stage[2]}`, `Stage ${stage[0]}: ${stage[1]}`)}` : ''}</p><h1>${legend(task.title_en, task.title_he)}</h1></div>${task.level ? levelTag(task.level) : ''}</div>
      <div class="editor">
        <div class="stack">
          <div class="panel flat stack-sm">${isAssignment ? html`<p lang="en" dir="ltr" style="font-weight:500">${task.prompt}</p>` : ''}${bi(task.instructions)}
            ${task.required_elements?.length ? html`<p class="small"><strong>${tt('חובה לכלול:', 'Must include:')}</strong> <span lang="en" dir="ltr">${task.required_elements.join(' · ')}</span></p>` : ''}
            ${task.scaffold?.length ? html`<details><summary class="small">${tt('תוכנית עבודה', 'Plan it step by step')}</summary><ol class="small stack-sm" style="margin:var(--s2) 0 0;padding-inline-start:1.2rem">${task.scaffold.map((s) => html`<li>${bi(s)}</li>`)}</ol></details>` : ''}
            ${task.source_pack?.length ? html`<details><summary class="small">${tt(`חומרי מקור (${task.source_pack.length})`, `Source pack (${task.source_pack.length})`)}</summary><div class="stack-sm" style="margin-top:var(--s2)">${task.source_pack.map((s) => html`<div class="passage small"><p><strong>${s.title}</strong> <span class="tag">${tt('חומר לדוגמה, לא נתונים אמיתיים', 'Illustrative, not real data')}</span></p>${s.text.split(/\n+/).map((p) => html`<p>${p}</p>`)}</div>`)}</div></details>` : ''}
            ${task.input_text ? html`<div class="passage small" lang="en" dir="ltr">${task.input_text.split(/\n+/).map((p) => html`<p>${p}</p>`)}</div>` : ''}
          </div>
          ${task.time_limit_min ? html`<div class="row small"><span>${icon('clock', { size: 16 })} ${tt(`כתיבה בזמן: ${task.time_limit_min} דקות (רשות)`, `Timed writing: ${task.time_limit_min} minutes (optional)`)}</span><button type="button" class="key small" data-timer>${timerEnd ? tt('עצירה', 'Stop') : tt('להתחיל טיימר', 'Start timer')}</button><span class="num" data-time aria-live="off"></span></div>` : ''}
          <label class="sr-only" for="essay">${tt('הטקסט שלך', 'Your text')}</label>
          <textarea class="input" id="essay" lang="en" dir="ltr" spellcheck="false" placeholder="${tt('כתבו כאן באנגלית…', 'Write here in English…')}">${text}</textarea>
          <div class="row between"><div class="editor-stats"><span class="num" data-wc>${words} ${tt('מילים', 'words')}</span>${minWords ? html`<span>${tt('יעד', 'target')} ${minWords}${maxWords ? `-${maxWords}` : '+'}</span>` : ''}<span class="faint" data-saved>${draftRec ? tt('הטיוטה נשמרה', 'Draft saved') : ''}</span></div>
            <div class="row"><button type="button" class="key" data-check ${words < 3 ? html`disabled` : ''}>${tt('בדיקה אוטומטית', 'Check')}</button>
              ${aiReady ? html`<button type="button" class="key enter" data-ai ${busy || evaluatedCount() >= MAX_EVALS || words < Math.max(3, Math.floor(minWords * 0.5)) ? html`disabled` : ''}>${busy ? html`<span class="spinner" aria-hidden="true" style="width:1rem;height:1rem"></span>` : ''} ${latestEval() ? tt('שליחת טיוטה מתוקנת', 'Submit revised draft') : tt('קבלת משוב', 'Get feedback')}</button>` : ''}</div></div>
          ${!aiReady ? html`<p class="xsmall faint row">${icon('info', { size: 14 })} ${!configured() || !CONFIG.aiEnabled ? tt('משוב AI לא הוגדר בשרת הזה; הבדיקות האוטומטיות עובדות.', 'AI feedback is not configured on this server; automatic checks work.') : !auth.signedIn ? tt('משוב AI זמין אחרי כניסה לחשבון.', 'AI feedback is available after you sign in.') : tt('אפשר להפעיל משוב AI בהגדרות.', 'You can turn on AI feedback in Settings.')}</p>` : ''}
          ${aiError ? html`<p class="error-text" role="alert">${aiError}</p>` : ''}
          ${task.checklist?.length ? html`<details class="panel flat"><summary class="small">${tt('רשימת בדיקה עצמית', 'Self-check list')}</summary><div class="stack-sm" style="margin-top:var(--s2)">${task.checklist.map((c) => html`<label class="row small"><input type="checkbox"> ${bi(c)}</label>`)}</div></details>` : ''}
          ${task.model_answer || task.exemplar ? html`<details class="panel flat"><summary class="small">${tt('דוגמה (מומלץ אחרי שכתבתם)', 'A model (best read after you write)')}</summary><div class="stack-sm small" style="margin-top:var(--s2)" lang="en" dir="ltr">${task.model_answer ? task.model_answer.split(/\n+/).map((p) => html`<p>${p}</p>`) : ''}${task.exemplar ? html`<p><strong>Outline</strong></p><p style="white-space:pre-wrap">${task.exemplar.outline}</p><p><strong>Annotated paragraph</strong></p><p style="white-space:pre-wrap">${task.exemplar.annotated_paragraph}</p>` : ''}</div></details>` : ''}
        </div>
        <aside class="panel stack" aria-label="${tt('משוב', 'Feedback')}">
          <div class="seg" role="group">${[['checks', 'בדיקות', 'Checks'], ['ai', 'משוב AI', 'AI feedback'], ['versions', 'גרסאות', 'Versions']].map(([k, he, en]) => html`<button type="button" data-tab="${k}" aria-pressed="${tab === k}">${tt(he, en)}</button>`)}</div>
          ${tab === 'checks' ? analysisPanel() : tab === 'ai' ? aiPanel() : versionsPanel()}
        </aside>
      </div>`);
  }

  const saveDraft = debounce(() => { store.put('writing', { id: `${sumId}#draft`, kind: 'essay-draft', exercise: task.id, text }); const s = $('[data-saved]', el); if (s) s.textContent = tt('הטיוטה נשמרה', 'Draft saved'); }, 600);

  function markAttempts() {
    (latestEval()?.evaluation?.errors || []).forEach((er, i) => {
      const f = $(`[data-fix="${i}"]`, el); if (f) f.textContent = fixLabel(er);
      if (!fixState(er) || attempted.has(i)) return;
      attempted.add(i);
      const b = $(`[data-rung="${i}"]`, el); if (b) { b.disabled = false; b.removeAttribute('aria-describedby'); }
      $(`#need-${i}`, el)?.remove();
    });
  }

  function saveVersion(evaluation = null) {
    const vs = versions();
    const last = vs.at(-1);
    if (last && last.text === text && !evaluation) return last;
    const n = last && last.text === text ? last.n : (last?.n || 0) + 1;
    const rec = { id: `${sumId}#${n}`, kind: 'essay-version', exercise: task.id, n, text, words: countWords(text), at: new Date().toISOString(), level, analysis: { stats: analysis?.stats, issues: analysis?.issues?.length || 0 }, evaluation: evaluation || (last?.n === n ? last.evaluation : null) };
    store.put('writing', rec);
    store.put('writing', { id: sumId, kind: 'essay-summary', exercise: task.id, title: task.title_en, status: store.get('writing', sumId)?.status === 'final' ? 'final' : evaluation ? 'evaluated' : 'draft', versions: n, last_estimate: evaluation?.cefr_estimate || store.get('writing', sumId)?.last_estimate || null, updated: rec.at });
    return rec;
  }

  async function getFeedback() {
    if (busy) return;
    analysis = analyzeWriting(text, { level, minWords, maxWords, mustInclude: task.must_include || [] });
    busy = true; aiError = ''; tab = 'ai'; draw();
    const prev = latestEval();
    try {
      const r = await callAI({
        task: 'evaluate_writing', level, hebrew_support: hebrewSupport(), feedback_scope: scope(), stage: task.stage || 0, draft_number: versions().filter((v) => v.evaluation).length + 1,
        exercise: { title: task.title_en, instructions: (isAssignment ? `${task.prompt}\n` : '') + task.instructions.en, kind: task.kind || 'essay', min_words: minWords || undefined, max_words: maxWords || undefined, focus: task.focus || [], required_elements: task.required_elements || [] },
        text,
        ...(prev ? { previous: { text: prev.text, priorities: prev.evaluation?.priorities || [] } } : {}),
      });
      const ev = { ...r.evaluation, self: Object.keys(selfScores).length ? { ...selfScores } : null };
      saveVersion(ev);
      selfScores = {};
      rung.clear(); attempted.clear();
      // AI-confirmed errors feed the recurring-mistake tracker; one writing attempt records the overall band.
      for (const er of ev.errors || []) if (er.severity !== 'style') recordAttempt({ source: 'writing', exercise: task.id, topic, skill: 'writing', level, correct: false, error_type: er.type, response: er.quote });
      const scored = (ev.categories || []).filter((c) => c.applicable && c.score != null);
      recordAttempt({ source: 'writing', exercise: task.id, topic, skill: 'writing', level, correct: scored.length ? scored.reduce((a, c) => a + c.score, 0) / scored.length >= 3 : true, score: scored.length ? scored.reduce((a, c) => a + c.score, 0) / scored.length / 5 : null });
      logEvent({ type: 'writing', exercise: task.id });
    } catch (e) {
      aiError = e.code === 'rate_limited' || e.status === 429 ? e.message : e.network ? tt('אין חיבור. הטקסט נשמר במכשיר.', 'No connection. Your text is saved on this device.') : e.message;
    }
    busy = false; draw();
  }

  draw();
  const offs = [
    on(el, 'input', '#essay', (e) => { text = e.target.value; const wc = $('[data-wc]', el); if (wc) wc.textContent = `${countWords(text)} ${tt('מילים', 'words')}`; const ck = $('[data-check]', el); if (ck) ck.disabled = countWords(text) < 3; const ai = $('[data-ai]', el); if (ai && !busy) ai.disabled = evaluatedCount() >= MAX_EVALS || countWords(text) < Math.max(3, Math.floor(minWords * 0.5)); markAttempts(); saveDraft(); }),
    on(el, 'click', '[data-check]', () => { analysis = analyzeWriting(text, { level, minWords, maxWords, mustInclude: task.must_include || [], formal: ['B2', 'C1', 'C2'].includes(level) && task.stage >= 7 }); saveVersion(); tab = 'checks'; logEvent({ type: 'writing', exercise: task.id }); draw(); }),
    on(el, 'click', '[data-ai]', (e, b) => { if (!b.disabled) getFeedback(); }),
    on(el, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; draw(); }),
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
    on(el, 'click', '[data-final]', () => { const v = latestEval(); if (v) { store.put('writing', { ...v, final: true }); store.update('writing', sumId, { status: 'final' }); logEvent({ type: 'writing-final', exercise: task.id, estimate: v.evaluation?.cefr_estimate }); draw(); } }),
    on(el, 'click', '[data-compare]', (e, b) => { const n = Number(b.dataset.compare); compareWith = compareWith === n ? null : n; draw(); }),
    on(el, 'click', '[data-report]', () => { logEvent({ type: 'ai-report', exercise: task.id, version: latestEval()?.n }); toast(tt('תודה. הדיווח נשמר ויעזור לבדוק את איכות המשוב.', 'Thanks. Your report was saved and helps us audit feedback quality.')); }),
    on(el, 'click', '[data-timer]', () => {
      if (timerEnd) { clearInterval(timerId); timerEnd = null; draw(); return; }
      timerEnd = Date.now() + task.time_limit_min * 60_000; draw();
      timerId = setInterval(() => { const left = Math.max(0, timerEnd - Date.now()); const s = $('[data-time]', el); if (s) s.textContent = `${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}`; if (!left) { clearInterval(timerId); toast(tt('הזמן נגמר. אפשר לסיים את המשפט ולבדוק.', 'Time is up. Finish your sentence and check.')); } }, 1000);
    }),
  ];
  return () => { offs.forEach((o) => o()); clearInterval(timerId); saveDraft.flush?.(); };
}
