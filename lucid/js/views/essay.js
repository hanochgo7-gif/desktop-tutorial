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
const FREE = { id: 'free', stage: 0, level: null, kind: 'essay', title_en: 'Free writing', title_he: 'כתיבה חופשית', instructions: { en: 'Write about anything you like. Use the checks to improve it.', he: 'כתבו על כל נושא שתרצו, והשתמשו בבדיקות כדי לשפר.' }, min_words: 30, focus: ['grammar', 'vocabulary', 'clarity'], checklist: [] };

export default async function essay(el, ctx) {
  const id = ctx.params.id;
  const [ex, as, tx] = await Promise.all([content.writingExercises(), content.assignments(), taxonomyIndex()]);
  const task = id === 'free' ? FREE : (ex?.exercises || []).find((x) => x.id === id) || (as?.assignments || []).find((x) => x.id === id);
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
  const revealed = new Set();
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
    if (!v) return html`<p class="small muted">${tt('שלחו את הטקסט למשוב כדי לקבל הערכה לפי 12 קטגוריות, טעויות עם רמזים ומשימות לתיקון.', 'Send your text for feedback to get an assessment across 12 categories, mistakes with hints, and revision tasks.')}</p>`;
    const e = v.evaluation;
    return html`<div class="stack">
      <div class="row between"><span class="small">${tt('הערכת רמה של הטקסט', 'Estimated level of this text')}</span><span class="tag level">${e.cefr_estimate === 'below_PreA1' ? '<Pre-A1' : LEVEL_LABEL[e.cefr_estimate]}</span></div>
      <p dir="auto">${e.summary}</p>${e.summary_he && hebrewSupport() !== 'off' ? html`<p lang="he" dir="rtl" class="muted small">${e.summary_he}</p>` : ''}
      ${e.revision?.progress_since_previous ? html`<div class="banner small">${icon('compare', { size: 16 })}<span dir="auto">${e.revision.progress_since_previous}</span></div>` : ''}
      ${e.strengths?.length ? html`<div class="stack-sm"><h3 class="small">${tt('מה עובד', 'What works')}</h3>${e.strengths.map((s) => html`<p class="row small">${icon('check', { size: 16 })}<span dir="auto">${s}</span></p>`)}</div>` : ''}
      ${e.revision?.tasks?.length ? html`<div class="stack-sm"><h3 class="small">${tt('לטיוטה הבאה', 'For your next draft')}</h3><ol class="small stack-sm" style="margin:0;padding-inline-start:1.2rem">${e.revision.tasks.map((x) => html`<li dir="auto">${x}</li>`)}</ol></div>` : ''}
      ${e.errors?.length ? html`<div class="stack-sm"><h3 class="small">${tt(`טעויות לתיקון (${e.errors.length})`, `Mistakes to fix (${e.errors.length})`)}</h3><p class="xsmall faint">${tt('נסו לתקן לבד לפי הרמז. את התיקון אפשר לחשוף אם צריך.', 'Try to fix each one from the hint. Reveal the correction only if you need it.')}</p>
        ${e.errors.map((er, i) => { const sev = SEVERITY[er.severity] || SEVERITY.important; const et = tx.error.get(er.type); return html`<div class="error-card ${er.severity === 'style' ? 'style' : ''}">
          <p class="row small"><span class="tag ${sev[2]}">${tt(sev[0], sev[1])}</span>${et ? html`<span class="tag">${tt(et.name_he, et.name_en)}</span>` : ''}</p>
          <p><span class="quote" lang="en" dir="ltr">${er.quote}</span></p>
          <p class="small" dir="auto">${er.explanation}</p>${er.explanation_he && hebrewSupport() !== 'off' ? html`<p class="small muted" lang="he" dir="rtl">${er.explanation_he}</p>` : ''}
          <p class="small">${icon('hint', { size: 14 })} <span dir="auto">${er.hint}</span></p>
          ${revealed.has(i) ? html`<p class="small">${tt('תיקון:', 'Correction:')} <strong lang="en" dir="ltr">${er.correction}</strong></p>` : html`<button type="button" class="key ghost small" data-reveal="${i}">${tt('להציג תיקון', 'Show correction')}</button>`}</div>`; })}</div>` : ''}
      <div class="stack-sm"><h3 class="small">${tt('לפי קטגוריה', 'By category')}</h3><div class="rubric">${e.categories.filter((c) => c.applicable).map((c) => html`<div class="rubric-row"><span>${tt(CATEGORY[c.id]?.[0] || c.id, CATEGORY[c.id]?.[1] || c.id)}</span><span class="band">${tt(BAND[c.score ?? 0][0], BAND[c.score ?? 0][1])}</span>
        <details><summary class="xsmall">${tt('פירוט', 'Details')}</summary><div class="stack-sm" style="margin-top:var(--s2)"><p dir="auto">${c.explanation}</p>${c.examples.map((x) => html`<p class="small"><span class="quote" lang="en" dir="ltr">${x.quote}</span> <span class="muted" dir="auto">${x.comment}</span></p>`)}<p dir="auto"><strong>${tt('לשפר:', 'Improve:')}</strong> ${c.improvement}</p><p dir="auto" class="muted"><strong>${tt('לתרגל:', 'Practise:')}</strong> ${c.practice}</p></div></details></div>`)}</div>
        <p class="xsmall faint">${tt(`הדירוג ביחס ליעד של רמה ${LEVEL_LABEL[level] || level}. ${t('level.estimate')}.`, `Bands are relative to the ${LEVEL_LABEL[level] || level} target. ${t('level.estimate')}.`)}</p></div>
      ${e.required_elements?.length ? html`<div class="stack-sm"><h3 class="small">${tt('רכיבי חובה', 'Required elements')}</h3>${e.required_elements.map((r) => html`<p class="row small">${icon(r.present ? 'check' : 'x', { size: 16 })}<span dir="auto"><strong>${r.element}</strong> · ${r.comment}</span></p>`)}</div>` : ''}
      <p class="xsmall faint row">${icon('alert', { size: 14 })} ${t('ai.label')}. <button type="button" class="key ghost small" data-report>${t('ai.report')}</button></p></div>`;
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
              ${aiReady ? html`<button type="button" class="key enter" data-ai ${busy || words < Math.max(3, Math.floor(minWords * 0.5)) ? html`disabled` : ''}>${busy ? html`<span class="spinner" aria-hidden="true" style="width:1rem;height:1rem"></span>` : ''} ${latestEval() ? tt('שליחת טיוטה מתוקנת', 'Submit revised draft') : tt('קבלת משוב', 'Get feedback')}</button>` : ''}</div></div>
          ${aiError ? html`<p class="error-text" role="alert">${aiError}</p>` : ''}
          ${task.checklist?.length ? html`<details class="panel flat"><summary class="small">${tt('רשימת בדיקה עצמית', 'Self-check list')}</summary><div class="stack-sm" style="margin-top:var(--s2)">${task.checklist.map((c) => html`<label class="row small"><input type="checkbox"> ${bi(c)}</label>`)}</div></details>` : ''}
          ${task.model_answer || task.exemplar ? html`<details class="panel flat"><summary class="small">${tt('דוגמה (מומלץ אחרי שכתבתם)', 'A model (best read after you write)')}</summary><div class="stack-sm small" style="margin-top:var(--s2)" lang="en" dir="ltr">${task.model_answer ? task.model_answer.split(/\n+/).map((p) => html`<p>${p}</p>`) : ''}${task.exemplar ? html`<p><strong>Outline</strong></p><p style="white-space:pre-wrap">${task.exemplar.outline}</p><p><strong>Annotated paragraph</strong></p><p style="white-space:pre-wrap">${task.exemplar.annotated_paragraph}</p>` : ''}</div></details>` : ''}
        </div>
        <aside class="panel stack" aria-label="${tt('משוב', 'Feedback')}">
          <div class="seg" role="tablist">${[['checks', 'בדיקות', 'Checks'], ['ai', 'משוב AI', 'AI feedback'], ['versions', 'גרסאות', 'Versions']].map(([k, he, en]) => html`<button type="button" role="tab" data-tab="${k}" aria-selected="${tab === k}" aria-pressed="${tab === k}">${tt(he, en)}</button>`)}</div>
          ${tab === 'checks' ? analysisPanel() : tab === 'ai' ? aiPanel() : versionsPanel()}
        </aside>
      </div>`);
  }

  const saveDraft = debounce(() => { store.put('writing', { id: `${sumId}#draft`, kind: 'essay-draft', exercise: task.id, text }); const s = $('[data-saved]', el); if (s) s.textContent = tt('הטיוטה נשמרה', 'Draft saved'); }, 600);

  function saveVersion(evaluation = null) {
    const vs = versions();
    const last = vs.at(-1);
    if (last && last.text === text && !evaluation) return last;
    const n = last && last.text === text ? last.n : (last?.n || 0) + 1;
    const rec = { id: `${sumId}#${n}`, kind: 'essay-version', exercise: task.id, n, text, words: countWords(text), at: new Date().toISOString(), level, analysis: { stats: analysis?.stats, issues: analysis?.issues?.length || 0 }, evaluation: evaluation || (last?.n === n ? last.evaluation : null) };
    store.put('writing', rec);
    store.put('writing', { id: sumId, kind: 'essay-summary', exercise: task.id, title: task.title_en, status: evaluation ? 'evaluated' : 'draft', versions: n, last_estimate: evaluation?.cefr_estimate || store.get('writing', sumId)?.last_estimate || null, updated: rec.at });
    return rec;
  }

  async function getFeedback() {
    if (busy) return;
    analysis = analyzeWriting(text, { level, minWords, maxWords, mustInclude: task.must_include || [] });
    busy = true; aiError = ''; tab = 'ai'; draw();
    const prev = latestEval();
    try {
      const r = await callAI({
        task: 'evaluate_writing', level, hebrew_support: hebrewSupport(), feedback_scope: scope(),
        exercise: { title: task.title_en, instructions: (isAssignment ? `${task.prompt}\n` : '') + task.instructions.en, kind: task.kind || 'essay', min_words: minWords || undefined, max_words: maxWords || undefined, focus: task.focus || [], required_elements: task.required_elements || [] },
        text,
        ...(prev ? { previous: { text: prev.text, priorities: prev.evaluation?.priorities || [] } } : {}),
      });
      const ev = r.evaluation;
      saveVersion(ev);
      revealed.clear();
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
    on(el, 'input', '#essay', (e) => { text = e.target.value; const wc = $('[data-wc]', el); if (wc) wc.textContent = `${countWords(text)} ${tt('מילים', 'words')}`; const ck = $('[data-check]', el); if (ck) ck.disabled = countWords(text) < 3; const ai = $('[data-ai]', el); if (ai && !busy) ai.disabled = countWords(text) < Math.max(3, Math.floor(minWords * 0.5)); saveDraft(); }),
    on(el, 'click', '[data-check]', () => { analysis = analyzeWriting(text, { level, minWords, maxWords, mustInclude: task.must_include || [], formal: ['B2', 'C1', 'C2'].includes(level) && task.stage >= 7 }); saveVersion(); tab = 'checks'; logEvent({ type: 'writing', exercise: task.id }); draw(); }),
    on(el, 'click', '[data-ai]', (e, b) => { if (!b.disabled) getFeedback(); }),
    on(el, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; draw(); }),
    on(el, 'click', '[data-reveal]', (e, b) => { revealed.add(Number(b.dataset.reveal)); draw(); }),
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
