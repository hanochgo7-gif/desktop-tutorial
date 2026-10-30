// Lesson player: intro -> explanation -> practice -> review.
// Wrong answers show the right answer at once and come back once at the end of the set
// (retrieval after a delay). Only the first attempt counts toward the lesson score.
import { html, render, on, $ } from '../core/util.js';
import { tt, bi, legend, hebrewSupport } from '../core/i18n.js';
import { content, taxonomyIndex } from '../core/content.js';
import { icon, confirmDialog, levelTag } from '../ui/components.js';
import { mountExercise, verdictHtml } from '../ui/exercise.js';
import { recordAttempt, startLesson, finishLesson, progressOf, settings, model, newBudgetToday } from '../core/learner.js';
import { say, canSpeak, stopSpeaking } from '../core/speech.js';
import { lessonOrder } from '../core/adaptive.js';

export function renderBlocks(blocks) {
  return blocks.map((b) => {
    switch (b.type) {
      case 'rule': return html`<div class="block-rule">${bi(b)}</div>`;
      case 'tip': return html`<div class="block-tip row" style="align-items:flex-start">${icon('hint', { size: 18 })}<div class="grow">${bi(b)}</div></div>`;
      case 'warning': return html`<div class="block-warning row" style="align-items:flex-start">${icon('alert', { size: 18 })}<div class="grow">${bi(b)}</div></div>`;
      case 'table': return html`<div class="table-wrap"><table class="data"><thead><tr>${b.headers.map((h) => html`<th dir="auto">${h}</th>`)}</tr></thead><tbody>${b.rows.map((r) => html`<tr>${r.map((c) => html`<td dir="auto">${c}</td>`)}</tr>`)}</tbody></table></div>`;
      case 'examples': return html`<div class="examples">${b.items.map((x) => exampleRow(x))}</div>`;
      default: return html`<p>${bi(b)}</p>`;
    }
  });
}

export function exampleRow(x) {
  return html`<div class="example">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${x.en}" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}<div class="grow">${legend(x.en, hebrewSupport() === 'off' ? null : x.he)}${x.note ? html`<div class="note" lang="en">${x.note}</div>` : ''}</div></div>`;
}

export default async function lessonView(el, ctx) {
  const id = ctx.params.id;
  const [lesson, tx, curriculum] = await Promise.all([content.lesson(id), taxonomyIndex(), content.curriculum()]);
  const plan = lessonOrder(curriculum).find((l) => l.id === id);
  if (!lesson) {
    render(el, html`<div class="player"><div class="player-top"><a class="key ghost small icon-only" href="#/path" aria-label="${tt('יציאה', 'Exit')}">${icon('x')}</a></div><div class="player-body"><div class="empty"><h3>${plan ? legend(plan.title_en, plan.title_he) : tt('השיעור לא נמצא', 'Lesson not found')}</h3><p>${tt('השיעור הזה עוד לא זמין במכשיר. נסו לרענן, או חזרו למסלול.', 'This lesson is not available on this device yet. Try reloading, or go back to your path.')}</p><a class="key enter" href="#/path">${tt('למסלול', 'To the path')}</a></div></div></div>`);
    return;
  }
  ctx.setTitle(lesson.title_en);
  startLesson(lesson);
  const variant = settings().english_variant;
  const errors = tx.error;
  const order = lessonOrder(curriculum);
  const nextPlan = order[order.findIndex((l) => l.id === id) + 1] || null;

  let stage = ctx.query.stage === 'practice' ? 'practice' : 'intro';
  const queue = lesson.exercises.map((ex) => ({ ex, retry: false }));
  let qi = 0;
  const firstTry = new Map(); // exercise id -> points (0..1) on first attempt
  let ctl = null;
  let checked = null; // last check result
  let hintUsed = false;
  let shownAt = 0;

  const graded = () => lesson.exercises.filter((e) => !['write'].includes(e.type));

  function frame(body, foot = '') {
    const total = queue.length + 1;
    const pct = stage === 'intro' ? 0 : stage === 'learn' ? 6 : stage === 'review' ? 100 : Math.round(((qi + 1) / total) * 100);
    render(el, html`<div class="player">
      <div class="player-top">
        <button type="button" class="key ghost small icon-only" data-exit aria-label="${tt('יציאה מהשיעור', 'Leave lesson')}">${icon('x')}</button>
        <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${tt('התקדמות בשיעור', 'Lesson progress')}"><span style="width:${pct}%"></span></div>
        ${levelTag(lesson.level)}
      </div>
      <div class="player-body" id="pbody">${body}</div>
      ${foot ? html`<div class="player-foot" id="pfoot">${foot}</div>` : ''}
    </div>`);
  }

  function showIntro() {
    const p = progressOf(id);
    frame(html`<div class="lesson-intro stack-lg">
      <div class="stack-sm">
        <p class="small faint">${plan ? tt(`${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · שיעור ${plan.order}`, `${plan.level === 'PreA1' ? 'Pre-A1' : plan.level} · Lesson ${plan.order}`) : ''} · ${tt(`כ-${lesson.minutes} דקות`, `about ${lesson.minutes} min`)}</p>
        <h1>${legend(lesson.title_en, lesson.title_he)}</h1>
      </div>
      <div class="panel flat stack-sm"><h2 class="small">${tt('בסוף השיעור', 'By the end of this lesson')}</h2>
        <ul class="stack-sm" style="margin:0;padding-inline-start:1.2rem">${lesson.objectives.map((o) => html`<li>${bi(o)}</li>`)}</ul></div>
      ${lesson.warmup ? html`<div class="block-tip row" style="align-items:flex-start">${icon('sparkle', { size: 18 })}<div class="grow">${bi(lesson.warmup)}</div></div>` : ''}
      ${p?.status === 'completed' ? html`<p class="banner small">${icon('check', { size: 18 })}<span>${tt(`כבר השלמת את השיעור (ציון הכי טוב ${Math.round((p.best_score || 0) * 100)}%). אפשר לחזור עליו.`, `You've completed this lesson (best ${Math.round((p.best_score || 0) * 100)}%). You can go through it again.`)}</span></p>` : ''}
    </div>`, html`<div class="inner"><span class="grow"></span><button type="button" class="key ghost" data-skip-learn>${tt('ישר לתרגול', 'Skip to practice')}</button><button type="button" class="key enter" data-go="learn">${tt('בואו נלמד', 'Let\'s learn')} <span class="kbd">Enter</span></button></div>`);
  }

  function showLearn() {
    frame(html`<div class="stack-lg">
      <h1>${legend(lesson.title_en, lesson.title_he)}</h1>
      <div class="stack">${renderBlocks(lesson.explanation)}</div>
      <section class="stack-sm"><h2 class="small">${tt('דוגמאות', 'Examples')}</h2><div class="examples">${lesson.examples.map(exampleRow)}</div></section>
      ${lesson.hebrew_pitfalls?.length && hebrewSupport() !== 'off' ? html`<section class="stack-sm"><h2 class="small">${tt('שימו לב (דוברי עברית)', 'Watch out (Hebrew speakers)')}</h2>${lesson.hebrew_pitfalls.map((h) => html`<div class="block-warning">${bi(h)}</div>`)}</section>` : ''}
      <section class="stack-sm"><h2 class="small">${tt('מילים חדשות', 'New words')}</h2>
        <div class="grid-2">${lesson.vocab.map((v) => html`<div class="entry">
          <div class="entry-head"><span class="entry-word" lang="en" dir="ltr">${v.word}</span>${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${v.word}" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}</div>
          <div class="row small"><span class="faint" lang="en">${v.pos}</span>${v.ipa ? html`<span class="entry-ipa" lang="en" dir="ltr">${v.ipa}</span>` : ''}</div>
          <div class="entry-he" lang="he" dir="rtl">${v.he}</div>
          <div class="entry-ex" lang="en" dir="ltr">${v.example}</div></div>`)}</div></section>
    </div>`, html`<div class="inner"><span class="grow small faint">${tt('הסבר קצר, ועכשיו מתרגלים.', 'Short explanation, now practice.')}</span><button type="button" class="key enter" data-go="practice">${tt('לתרגול', 'Start practice')} <span class="kbd">Enter</span></button></div>`);
  }

  function footer(state) {
    const item = queue[qi];
    if (state === 'answer') {
      return html`<div class="inner">
        ${item.ex.hint && !hintUsed ? html`<button type="button" class="key ghost small" data-hint>${icon('hint', { size: 18 })} ${tt('רמז', 'Hint')}</button>` : ''}
        ${ctl?.graded !== false ? html`<button type="button" class="key ghost small" data-dontknow>${tt('לא יודע/ת', 'I don\'t know')}</button>` : ''}
        <span class="grow"></span>
        <button type="button" class="key enter" data-check disabled>${item.ex.type === 'write' ? tt('שליחה', 'Submit') : tt('בדיקה', 'Check')} <span class="kbd">Enter</span></button></div>`;
    }
    return html`<div class="inner"><div class="verdict" role="status">${verdictHtml(item.ex, checked, errors)}</div><button type="button" class="key enter" data-next>${tt('המשך', 'Continue')} <span class="kbd">Enter</span></button></div>`;
  }

  function showExercise() {
    const item = queue[qi];
    hintUsed = false; checked = null;
    frame(html`<div id="exroot"></div>${item.retry ? html`<p class="xsmall faint" style="margin-top:var(--s5)">${icon('refresh', { size: 14 })} ${tt('חוזרים על זה שוב, כדי שיישאר', 'Once more, so it sticks')}</p>` : ''}<div id="hintroot"></div>`, footer('answer'));
    ctl = mountExercise($('#exroot', el), item.ex, {
      errors, level: lesson.level, variant,
      onChange: (ready) => { const b = $('[data-check]', el); if (b) b.disabled = !ready; },
    });
    if (ctl.graded === false) { const dk = $('[data-dontknow]', el); dk?.remove(); }
    shownAt = performance.now();
  }

  async function doCheck({ dontKnow = false } = {}) {
    const item = queue[qi];
    let r;
    if (dontKnow) {
      r = { graded: true, correct: false, score: 0, response: '(I don\'t know)', error_type: null, answer: answerText(item.ex) };
      ctl.destroy();
      render($('#exroot', el), html`<div class="stack"><h2 class="ex-prompt">${bi(item.ex.prompt)}</h2></div>`);
    } else {
      r = await ctl.check();
    }
    checked = r;
    const latency = Math.round(performance.now() - shownAt);
    if (r.graded !== false) {
      const pts = r.correct ? (hintUsed ? 0.75 : r.almost ? 0.9 : 1) : Math.min(0.5, r.score || 0);
      if (!item.retry && !firstTry.has(item.ex.id)) firstTry.set(item.ex.id, pts);
      recordAttempt({ source: 'lesson', lesson: id, exercise: item.ex.id, topic: item.ex.topic || lesson.topics[0], skill: item.ex.skill, level: lesson.level, correct: r.correct, score: r.score ?? (r.correct ? 1 : 0), error_type: r.error_type, hint_used: hintUsed, latency_ms: latency, response: r.response });
      if (!r.correct && !item.retry && !['match', 'categorize', 'read'].includes(item.ex.type)) queue.push({ ex: item.ex, retry: true });
    } else {
      recordAttempt({ source: 'lesson', lesson: id, exercise: item.ex.id, topic: item.ex.topic || lesson.topics[0], skill: item.ex.skill, level: lesson.level, correct: Boolean(r.correct), score: null, response: r.response });
      if (item.ex.type === 'speak') import('../core/learner.js').then((m) => m.logEvent({ type: 'speaking', lesson: id }));
      if (item.ex.type === 'write') {
        import('../core/learner.js').then((m) => m.logEvent({ type: 'writing', lesson: id }));
        import('../core/store.js').then(({ store }) => store.put('writing', { id: `lesson:${id}:${item.ex.id}`, source: 'lesson', lesson: id, exercise: item.ex.id, level: lesson.level, drafts: [{ text: r.response, at: new Date().toISOString() }], updated: new Date().toISOString() }));
      }
    }
    const foot = $('#pfoot', el);
    foot.className = `player-foot ${r.graded === false ? 'ok' : r.correct ? (r.almost ? 'almost' : 'ok') : 'bad'}`;
    render(foot, footer('result'));
    $('[data-next]', el)?.focus();
  }

  function answerText(ex) {
    if (ex.type === 'mcq' || ex.type === 'listen') return ex.options[ex.answer];
    if (ex.type === 'gap') return ex.answers.map((a) => a[0]).join(' … ');
    if (ex.type === 'order') return ex.tokens.join(' ');
    if (['transform', 'correct', 'dictation'].includes(ex.type)) return ex.answers[0];
    if (ex.type === 'speak') return ex.target;
    if (ex.type === 'match') return ex.pairs.map((p) => `${p[0]} = ${p[1]}`).join(' · ');
    return '';
  }

  function showReview() {
    const pts = [...firstTry.values()];
    const gradedCount = graded().length;
    const score = gradedCount ? pts.reduce((a, b) => a + b, 0) / gradedCount : 1;
    const pass = lesson.completion?.pass_score ?? 0.7;
    const passed = score >= pass;
    const wasDone = progressOf(id)?.status === 'completed';
    const budgetBefore = newBudgetToday();
    finishLesson(lesson, { score, passed });
    const lessonErrors = model().attempts.filter((a) => a.lesson === id && !a.correct && a.error_type).map((a) => a.error_type);
    const topErr = [...new Set(lessonErrors)].slice(0, 3);
    frame(html`<div class="stack-lg">
      <div class="stack-sm">
        <h1>${passed ? tt('השיעור הושלם', 'Lesson complete') : tt('כמעט שם', 'Nearly there')}</h1>
        <p class="muted">${passed
          ? tt(`ענית נכון בניסיון הראשון על ${Math.round(score * 100)}% מהתרגילים.`, `You got ${Math.round(score * 100)}% right on the first try.`)
          : tt(`${Math.round(score * 100)}% בניסיון הראשון. צריך ${Math.round(pass * 100)}% כדי להשלים, ולכן כדאי לעבור שוב על התרגול.`, `${Math.round(score * 100)}% on the first try. ${Math.round(pass * 100)}% completes the lesson, so it's worth practising once more.`)}</p>
      </div>
      <div class="panel flat stack-sm"><h2 class="small">${tt('מה לזכור', 'Key points')}</h2>${lesson.review.key_points.map((k) => html`<div class="row" style="align-items:flex-start">${icon('check', { size: 18 })}<div class="grow">${bi(k)}</div></div>`)}</div>
      ${passed && !wasDone ? html`<p class="banner small">${icon('layers', { size: 18 })}<span>${tt(`${lesson.vocab.length} מילים מהשיעור נכנסו לחזרה המרווחת. הן יחזרו בדיוק לפני שתשכחו.`, `${lesson.vocab.length} words from this lesson joined your spaced review. They'll come back just before you'd forget them.`)}${budgetBefore <= 0 ? tt(' (המכסה היומית מלאה, אז חלקן יופיעו מחר.)', ' (Today\'s quota is full, so some will start tomorrow.)') : ''}</span></p>` : ''}
      ${topErr.length ? html`<div class="panel flat stack-sm"><h2 class="small">${tt('כדאי לשים לב', 'Worth watching')}</h2>${topErr.map((t) => { const e = errors.get(t); return e ? html`<p class="small"><span class="tag warn">${tt(e.name_he, e.name_en)}</span> ${hebrewSupport() !== 'off' ? html`<span lang="he" dir="rtl" class="muted">${e.why_he}</span>` : ''}</p>` : ''; })}<p class="xsmall faint">${tt('אם זה יחזור, Lucid יוסיף תרגול ממוקד לתוכנית היומית.', 'If this keeps happening, Lucid adds a short targeted drill to your daily plan.')}</p></div>` : ''}
    </div>`, html`<div class="inner">
      ${passed ? html`<a class="key ghost" href="#/today">${tt('להיום', 'To Today')}</a><span class="grow"></span>${nextPlan ? html`<a class="key enter" href="#/lesson/${nextPlan.id}" data-next-lesson>${tt('לשיעור הבא', 'Next lesson')} <span class="kbd">Enter</span></a>` : html`<a class="key enter" href="#/path">${tt('למסלול', 'To the path')}</a>`}`
      : html`<a class="key ghost" href="#/today">${tt('אחר כך', 'Later')}</a><span class="grow"></span><a class="key enter" href="#/lesson/${id}?stage=practice&t=${Date.now()}" data-retry>${tt('לתרגל שוב', 'Practise again')} <span class="kbd">Enter</span></a>`}</div>`);
    stage = 'review';
  }

  function go(next) {
    stopSpeaking();
    ctl?.destroy?.(); ctl = null;
    stage = next;
    if (next === 'intro') showIntro();
    else if (next === 'learn') showLearn();
    else if (next === 'practice') { if (qi >= queue.length) showReview(); else showExercise(); }
  }

  go(stage);

  const offs = [
    on(el, 'click', '[data-go]', (e, b) => go(b.dataset.go)),
    on(el, 'click', '[data-skip-learn]', () => go('practice')),
    on(el, 'click', '[data-check]', (e, b) => { if (!b.disabled) doCheck(); }),
    on(el, 'click', '[data-dontknow]', () => doCheck({ dontKnow: true })),
    on(el, 'click', '[data-hint]', (e, b) => {
      hintUsed = true; b.remove();
      render($('#hintroot', el), html`<div class="hint-box">${icon('hint', { size: 18 })}<div>${bi(queue[qi].ex.hint)}</div></div>`);
    }),
    on(el, 'click', '[data-next]', () => { qi++; go('practice'); }),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant })),
    on(el, 'click', '[data-exit]', async () => {
      if (stage === 'practice' && qi > 0 && !(await confirmDialog({ title: tt('לצאת מהשיעור?', 'Leave the lesson?'), body: tt('התשובות שכבר נתת נשמרו. בפעם הבאה תתחילו את התרגול מההתחלה.', 'Your answers so far are saved. Next time the practice starts from the beginning.'), confirm: tt('יציאה', 'Leave') }))) return;
      ctx.navigate('today');
    }),
  ];
  const onKey = (e) => {
    if (e.target.closest('dialog')) return;
    if (stage === 'practice' && ctl?.onKey(e)) { e.preventDefault(); return; }
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    const inTextarea = e.target.tagName === 'TEXTAREA';
    const btn = $('[data-next]', el) || $('[data-check]:not([disabled])', el) || $('[data-go]', el) || $('[data-next-lesson]', el) || $('[data-retry]', el);
    if (!btn || (inTextarea && queue[qi]?.ex.type === 'write' && !$('[data-next]', el))) return;
    if (e.target.tagName === 'BUTTON' && e.target !== btn) return;
    e.preventDefault();
    btn.click();
  };
  document.addEventListener('keydown', onKey);
  return () => { offs.forEach((o) => o()); document.removeEventListener('keydown', onKey); ctl?.destroy?.(); stopSpeaking(); };
}
