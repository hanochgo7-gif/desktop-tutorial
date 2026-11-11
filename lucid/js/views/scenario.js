// One real-life scenario: prepare (phrases), listen (model dialogue), practise (scripted turns that
// work with no AI), and roleplay with an AI partner plus an end-of-conversation report.
import { html, render, on, $, $$, shuffle, uid } from '../core/util.js';
import { tt, bi, legend, hebrewSupport, isolateLatin, uiLang, SUPPORT_BY_LEVEL } from '../core/i18n.js';
import { content } from '../core/content.js';
import '../core/compat.js'; // content.js's C-1 methods also on a page that started on release 2026-11-03.1 (compat.js).
import { icon, levelTag, emptyState, toast } from '../ui/components.js';
import { say, canSpeak, canListen, listen, stopSpeaking, speechErrorText } from '../core/speech.js';
import { recordAttempt, settings, logEvent, profile, model, aiConsent } from '../core/learner.js';
import { store } from '../core/store.js';
import { callAI, configured, auth } from '../core/api.js';
import { CONFIG } from '../../config.js';
import { checkOwnReply, nextScenario, fitOf, FIT_LABEL } from '../core/reallife.js';

const TABS = [['prepare', 'הכנה', 'Prepare'], ['listen', 'שיחה לדוגמה', 'Model dialogue'], ['practise', 'תרגול', 'Practise'], ['roleplay', 'שיחה עם AI', 'AI roleplay']];
const REGISTER = { polite: ['מנומס', 'polite', 'cobalt'], neutral: ['ניטרלי', 'neutral', ''], casual: ['יומיומי', 'casual', 'warn'] };

// "I'm stuck" phrases are the learner's own lines, so a name in them ("My name is Dana Cohen") becomes a slot to
// fill, selected when the phrase is copied (persona panel R2-07). The Hebrew gloss gets the same slot.
const NAME_SLOT = '[your name]';
const NAME_EN = /\b([Mm]y name is|I'm|I am|under the name|in the name of|[Nn]ame's)\s+((?:[A-Z][a-z]+)(?:\s+[A-Z][a-z]+)?)\b/;
const HE_WORD = '[א-ת][א-ת׳\'"-]*';
function nameSlot(phrase) {
  const m = NAME_EN.exec(phrase.en || '');
  if (!m) return { ...phrase, slot: null };
  const start = m.index + m[1].length + 1;
  const en = `${phrase.en.slice(0, start)}${NAME_SLOT}${phrase.en.slice(m.index + m[0].length)}`;
  const n = m[2].split(/\s+/).length;
  const heName = new RegExp(`(קוראים לי|שמי|אני|על שם|על השם)\\s+${Array(n).fill(HE_WORD).join('\\s+')}`);
  const he = phrase.he ? phrase.he.replace(heName, '$1 [השם שלכם]') : phrase.he;
  return { ...phrase, en, he, slot: [start, start + NAME_SLOT.length] };
}

export default async function scenarioView(el, ctx) {
  // This scenario's own file (C3); the list, for "next scenario" at the end of the practice, loads after it.
  const s = await content.scenario(ctx.params.id);
  const data = { scenarios: null };
  if (!s) { render(el, emptyState({ title: tt('התרחיש לא נמצא', 'Scenario not found'), action: html`<a class="key enter" href="#/real-life">${tt('לכל התרחישים', 'All scenarios')}</a>` })); return; }
  ctx.setTitle(s.title_en);
  // A saved practice place opens the practice tab with its resume offer, unless the route names a tab (r4 RW-8).
  const hasPlace = () => { const p = store.get('progress', `rl:${s.id}`); return Number.isInteger(p?.turn) && p.turn > 0 && p.turn < s.practice.length; };
  let tab = ctx.query.tab || (hasPlace() ? 'practise' : 'prepare');
  const variant = settings().english_variant === 'any' ? undefined : settings().english_variant;
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && aiConsent();
  // practise state: a tap selects a reply (picked), "Check" commits it (checked), as in lessons (RW-1).
  let ti = 0; let picked = null; let checked = false; let typed = ''; let typedResult = null; let results = [];
  let ownOpen = false; let othersOpen = false;
  // Practice keeps its place (RW-11): after each checked reply the next turn and the answers so far are saved in
  // progress rl:<id>; coming back offers to continue from there or start again.
  const progressId = `rl:${s.id}`;
  const savedTurn = () => { const p = store.get('progress', progressId); return Number.isInteger(p?.turn) && p.turn > 0 && p.turn < s.practice.length ? p : null; };
  let resume = savedTurn();
  const savePlace = () => {
    const prev = store.get('progress', progressId) || {};
    store.put('progress', { ...prev, id: progressId, status: prev.status === 'completed' ? 'completed' : 'started', turn: ti + 1, answers: results.slice(0, ti + 1), updated_at: new Date().toISOString() });
  };
  const clearPlace = () => {
    const prev = store.get('progress', progressId);
    if (!prev || prev.turn == null) return;
    const { turn, answers, ...rest } = prev;
    if (rest.status === 'completed') store.put('progress', rest); else store.remove('progress', progressId);
  };
  const turnOrder = s.practice.map((t) => ({ ...t, options: shuffle(t.options, t.partner.length / 100) }));
  // roleplay state
  let chat = null; let busy = false; let report = null; let rpError = ''; let stuck = false;
  // Hebrew tips in the roleplay follow the scene's level, not the course level, and the learner can switch
  // them on or off (persona panel P-17).
  let hebrewTips = ['full', 'partial'].includes(hebrewSupport()) || ['full', 'partial'].includes(SUPPORT_BY_LEVEL[s.level]);
  const done = () => new Set(store.all('progress').filter((p) => p.id.startsWith('rl:') && p.status === 'completed').map((p) => p.id.slice(3)));
  const after = () => (data.scenarios ? nextScenario(data.scenarios, s, { courseLevel: model().courseLevel, goals: profile()?.goals || [], done: done() }) : null);
  const noAiWhy = () => (!configured() || !CONFIG.aiEnabled ? tt('AI לא פעיל באתר הזה. כל השאר עובד.', 'AI is not active on this site. Everything else works.')
    : !auth.signedIn ? tt('שיחה עם AI דורשת חשבון: ההסכמה שלכם לעיבוד ב-AI נשמרת בחשבון, ולכל חשבון יש מגבלת שימוש יומית ב-AI. אין חשבון? אפשר ליצור אחד עכשיו, וההתקדמות שבמכשיר עוברת אליו.', 'AI conversations need an account: your consent to AI processing is saved in it, and each account has a daily AI limit. No account yet? You can create one now, and the progress on this device moves into it.') : tt('צריך להפעיל ״משוב AI״ בהגדרות.', 'Turn on "AI feedback" in Settings.'));

  const head = () => html`<div class="page-head"><div><p class="small faint"><a href="#/real-life">${tt('אנגלית לחיים', 'Real life')}</a></p><h1>${legend(s.title_en, s.title_he)}</h1><div class="row" style="margin-top:var(--s2)">${levelTag(s.level)}<span class="small faint">${tt(...FIT_LABEL[fitOf(s.level, model().courseLevel)])}</span><span class="small muted">${tt('את/ה מדבר/ת עם:', 'You are talking to:')} <span lang="en" dir="ltr">${s.partner_role}</span></span></div></div></div>
    ${resume && tab !== 'practise' ? html`<p class="small resume-line" data-resume-line>${tt(`עצרתם בתור ${resume.turn + 1} מתוך ${turnOrder.length}`, `You stopped at turn ${resume.turn + 1} of ${turnOrder.length}`)} · <button type="button" class="link-key" data-resume>${tt('להמשיך', 'Continue')}</button></p>` : ''}
    <div class="seg scenario-tabs" role="group" aria-label="${tt('חלקי התרחיש', 'Parts of the scenario')}" style="margin-block-end:var(--s5)">${TABS.map(([id, he, en]) => html`<button type="button" data-tab="${id}" aria-pressed="${tab === id}">${tt(he, en)}</button>`)}</div>`;

  // A phrase note in English is an English block; a Hebrew one keeps its English in order (r4 RW-9).
  const noteLine = (note) => (/[א-ת]/.test(note)
    ? html`<div class="note" lang="he" dir="rtl">${isolateLatin(note)}</div>`
    : html`<div class="note" lang="en" dir="ltr">${note}</div>`);
  const prepare = () => html`<div class="stack-lg" style="max-width:52rem">
    <div class="panel stack-sm"><h2 class="small">${tt('המצב', 'The situation')}</h2>${bi(s.situation, { always: true })}<h2 class="small" style="margin-top:var(--s3)">${tt('המטרה שלכם', 'Your goal')}</h2>${bi(s.goal, { always: true })}</div>
    <section class="stack-sm"><h2 class="small">${tt('משפטים שימושיים', 'Useful phrases')}</h2>
      <div class="examples">${s.phrases.map((p) => html`<div class="example">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${p.en}" aria-label="${tt('השמעה', 'Play')}: ${p.en}">${icon('volume', { size: 18 })}</button>` : ''}
        <div class="grow stack-sm">${legend(p.en, p.he)}${p.note ? noteLine(p.note) : ''}
        ${REGISTER[p.register] || p.variant ? html`<span class="row" style="gap:var(--s2)">${REGISTER[p.register] ? html`<span class="tag ${REGISTER[p.register][2]}">${tt(REGISTER[p.register][0], REGISTER[p.register][1])}</span>` : ''}${p.variant ? html`<span class="tag">${p.variant}</span>` : ''}</span>` : ''}</div></div>`)}</div></section>
    ${s.variants?.length ? html`<section class="stack-sm"><h2 class="small">${tt('אמריקאית מול בריטית', 'American vs British')}</h2><div class="table-wrap variants-wrap" dir="ltr"><table class="data variants-table" lang="en"><thead><tr><th>US</th><th>UK</th><th lang="${tt('he', 'en')}" dir="auto">${tt('הסבר', 'Note')}</th></tr></thead><tbody>${s.variants.map((v) => html`<tr><td data-label="US">${v.us}</td><td data-label="UK">${v.uk}</td><td dir="auto" class="faint">${v.note || ''}</td></tr>`)}</tbody></table></div></section>` : ''}
    ${s.culture?.length ? html`<section class="stack-sm"><h2 class="small">${tt('טיפים תרבותיים', 'Culture tips')}</h2>${s.culture.map((c) => html`<div class="block-tip">${bi(c, { always: hebrewSupport() !== 'off' })}</div>`)}</section>` : ''}
    <div class="row"><button type="button" class="key enter" data-tab="listen">${tt('לשיחה לדוגמה', 'To the model dialogue')}</button></div></div>`;

  // A play key inside a chat bubble: the shared icon key, at least 44 x 44 px under a coarse pointer (RW-1).
  const sayKey = (text) => html`<button type="button" class="key ghost small icon-only say-key" data-say-text="${text}" aria-label="${tt('השמעה', 'Play')}: ${text}">${icon('volume', { size: 16 })}</button>`;

  const listenTab = () => html`<div class="stack" style="max-width:46rem">
    ${canSpeak() ? html`<div class="row"><button type="button" class="key" data-play-all>${icon('play', { size: 18 })} ${tt('להשמיע את כל השיחה', 'Play the whole conversation')}</button></div>` : ''}
    <div class="chat" style="height:auto;min-height:0"><div class="chat-log">${s.model_dialogue.map((l) => html`<div class="msg ${l.speaker === 'you' ? 'me' : 'them'}" lang="en" dir="ltr"><span class="who">${l.speaker === 'you' ? tt('את/ה', 'You') : s.partner_role}</span>${l.text}${canSpeak() ? html` ${sayKey(l.text)}` : ''}</div>`)}</div></div>
    <div class="row"><button type="button" class="key enter" data-tab="practise">${tt('לתרגל את זה', 'Practise it')}</button></div></div>`;

  // After the last turn: how it went, and where to go next. AI roleplay leads only when it can start (P-66).
  const practiseDone = () => {
    const best = results.filter((v) => v === 'best').length;
    const next = after();
    const nextLink = next ? html`<a class="key ${aiReady ? '' : 'enter'}" href="#/scenario/${next.id}?tab=prepare"><span>${tt('לתרחיש הבא:', 'Next scenario:')} <bdi lang="en" dir="ltr">${next.title_en}</bdi></span></a>` : '';
    return html`<div class="stack" style="max-width:46rem"><h2 tabindex="-1" data-done-head>${tt('סיימתם את התרגול', 'Practice complete')}</h2>
      <p>${tt(`בחרתם את התשובה הטבעית ביותר ${best === 1 ? 'פעם אחת' : `${best} פעמים`} מתוך ${results.length}.`, `You chose the most natural reply ${best === 1 ? 'once' : `${best} times`} out of ${results.length}.`)} ${best < results.length ? tt('אפשר לתרגל שוב: הסדר של התשובות מתחלף.', 'You can practise again: the replies come in a new order.') : ''}</p>
      ${aiReady ? html`<p class="muted">${tt('עכשיו אפשר לנסות את אותו מצב בשיחה חופשית עם AI.', 'Now try the same situation in a free conversation with AI.')}</p>` : html`<p class="small muted">${noAiWhy()} ${tt('בינתיים אפשר להמשיך לתרחיש הבא.', 'Meanwhile, you can go on to the next scenario.')}</p>`}
      <div class="row">${aiReady ? html`<button type="button" class="key enter" data-tab="roleplay">${tt('לשיחה עם AI', 'To AI roleplay')}</button>` : ''}${nextLink}<button type="button" class="key ghost" data-restart>${tt('לתרגל שוב', 'Practise again')}</button></div></div>`;
  };

  // The check on a reply in the learner's own words is a suggestion, never a verdict (P-60). It names possible
  // Hebrew-speaker errors first, then the turn's goal points as a checklist; it praises key words only when they
  // are there and no such error was found (RW-3).
  const ownResult = (t) => {
    const r = typedResult;
    if (r.empty) return html`<p class="small muted">${tt('כתבו או אמרו תשובה, ואז ״השוואה״.', 'Type or say a reply, then "Compare".')}</p>`;
    const he = hebrewSupport() !== 'off' && uiLang() === 'he';
    const praise = !r.points.length && r.hits.length && !r.l1.length;
    return html`<div class="stack-sm small own-result" aria-live="polite">
      ${r.l1.length ? html`<section class="stack-sm" aria-labelledby="own-l1-h"><h4 class="small own-l1-h" id="own-l1-h">${icon('alert', { size: 16 })}<span>${tt('אולי טעות נפוצה לדוברי עברית', 'Maybe a common mistake for Hebrew speakers')}</span></h4>
        ${r.l1.map((i) => html`<div class="error-card"><p class="small issue-head"><span class="tag warn">${tt(i.he_title, i.title)}</span> <span class="quote" lang="en" dir="ltr">${i.match}</span></p>${he ? html`<p class="small muted" lang="he" dir="rtl">${isolateLatin(i.he)}</p>` : html`<p class="small muted en-line" lang="en" dir="ltr">${i.en}</p>`}${i.ex ? html`<p class="small en-line issue-ex" dir="ltr"><span class="sr-only" lang="${uiLang()}" dir="auto">${tt('אפשר לומר:', 'You could say:')} </span><span lang="en"><span aria-hidden="true">→ </span>${i.ex}</span></p>` : ''}</div>`)}</section>` : ''}
      ${r.points.length ? html`<section class="stack-sm"><h4 class="small">${tt('מה כדאי שיהיה בתשובה', 'What a good reply does here')}</h4>
        <ul class="check-rows goal-points">${r.points.map((p) => html`<li class="${p.ok ? 'ok' : 'todo'}">${icon(p.ok ? 'check' : 'circle', { size: 16 })}<span>${tt(p.he, p.en)}<span class="sr-only"> ${p.ok ? tt('(נמצא)', '(found)') : tt('(לא נמצא)', '(not found)')}</span></span></li>`)}</ul></section>`
        : praise ? html`<p>${tt('בתשובה שלכם יש מילים שמתאימות למצב:', 'Your reply has words that fit this situation:')} <bdi lang="en" dir="ltr">${r.hits.join(', ')}</bdi>${r.asked ? tt(', וגם שאלה בחזרה, שמשאירה את השיחה פתוחה.', ', and a question back, which keeps the conversation going.') : '.'}</p>`
        : !r.hits.length ? html`<p>${tt('לא מצאנו את המילים שציפינו להן, אבל זה לא אומר שהתשובה לא טובה.', 'We did not find the words we expected, but that does not mean your reply is wrong.')}</p>` : ''}
      <p>${tt('השוו לדוגמאות:', 'Compare with these examples:')}</p>
      <ul lang="en" dir="ltr" class="model-replies">${t.model_replies.map((m) => html`<li>${m}</li>`)}</ul>
      <p class="xsmall faint">${tt('הבדיקה הזו מחפשת מילות מפתח וכמה טעויות נפוצות של דוברי עברית. היא לא בודקת את כל הדקדוק, ולא אם הניסוח טבעי.', 'This check looks for key words and a few common mistakes of Hebrew speakers. It does not check all the grammar, or whether the wording is natural.')}</p></div>`;
  };

  // The verdict for a checked reply: the words, the footer tint and the icon, as in the lesson player.
  const VERDICT = {
    best: ['בדיוק', 'Spot on', 'ok', 'check'],
    ok: ['עובד, אבל יש טבעי יותר', 'It works, but there is a more natural way', 'almost', 'alert'],
    poor: ['לא מתאים כאן', 'Not right here', 'bad', 'x'],
  };
  // The footer is the lesson player's (.player-foot > .inner, a .verdict with role=status, one Enter key), sticky
  // inside the page and lifted above the phone tab bar by --rw-tabbar-h (RW-1): "Check" before, "Continue" after.
  // While the learner writes their own reply, the footer is neutral: no verdict colour about the pick above, only
  // "המשך" (r4 RW-7).
  const practiseFoot = (chosen) => {
    if (chosen && ownOpen) {
      return html`<div class="player-foot scenario-foot neutral" id="pfoot"><div class="inner"><button type="button" class="key enter" data-next-turn>${tt('המשך', 'Continue')}</button></div></div>`;
    }
    if (!chosen) {
      return html`<div class="player-foot scenario-foot" id="pfoot"><div class="inner"><span class="grow small faint">${picked == null ? tt('בחרו תשובה, ואז ״בדיקה״.', 'Choose a reply, then "Check".') : ''}</span><button type="button" class="key enter" data-check-turn ${picked == null ? html`disabled` : ''}>${tt('בדיקה', 'Check')}</button></div></div>`;
    }
    const [he, en, cls, ic] = VERDICT[chosen.verdict] || VERDICT.poor;
    return html`<div class="player-foot scenario-foot ${cls}" id="pfoot"><div class="inner"><div class="verdict" role="status"><p class="verdict-title">${icon(ic, { size: 18 })}<span>${tt(he, en)}</span></p></div><button type="button" class="key enter" data-next-turn>${tt('המשך', 'Continue')}</button></div></div>`;
  };

  const resumeOffer = () => html`<div class="panel flat stack-sm resume-turn" style="max-width:46rem"><h2 class="small" tabindex="-1" data-resume-head>${tt(`עצרתם אחרי ${resume.turn === 1 ? 'תור אחד' : `${resume.turn} תורות`} מתוך ${turnOrder.length}.`, `You stopped after ${resume.turn} of ${turnOrder.length} turns.`)}</h2>
    <div class="row"><button type="button" class="key enter" data-resume>${tt(`להמשיך מתור ${resume.turn + 1} מתוך ${turnOrder.length}`, `Continue from turn ${resume.turn + 1} of ${turnOrder.length}`)}</button><button type="button" class="key" data-start-over>${tt('להתחיל מחדש', 'Start again')}</button></div></div>`;

  const practiseTab = () => {
    if (resume && ti === 0 && !checked) return resumeOffer();
    if (ti >= turnOrder.length) return practiseDone();
    const t = turnOrder[ti];
    const chosen = checked && picked != null ? t.options[picked] : null;
    const others = chosen ? t.options.filter((o) => o !== chosen) : [];
    return html`<div class="stack scenario-practise" style="max-width:46rem">
      <p class="step-count" tabindex="-1" data-step>${tt(`${ti + 1} מתוך ${turnOrder.length}`, `${ti + 1} of ${turnOrder.length}`)}</p>
      <div class="msg them" lang="en" dir="ltr" style="max-width:100%"><span class="who">${s.partner_role}</span>${t.partner}${canSpeak() ? html` ${sayKey(t.partner)}` : ''}</div>
      <h2 class="small" id="turn-q">${tt('מה הכי טבעי לענות?', 'What is the most natural reply?')}</h2>
      <div class="options" role="group" aria-labelledby="turn-q">${t.options.map((o, i) => html`<button type="button" class="option ${chosen && o.verdict === 'best' ? 'is-right' : ''} ${chosen && picked === i && o.verdict !== 'best' ? 'is-wrong' : ''}" data-opt="${i}" aria-pressed="${picked === i}" ${chosen ? html`disabled` : ''} lang="en" dir="ltr"><span class="k">${i + 1}</span>${o.text}</button>`)}</div>
      ${chosen ? html`<div class="explain stack-sm" tabindex="-1" data-explain><p class="xsmall faint">${tt('התשובה שבחרתם:', 'Your reply:')}</p><p class="alt-quote chosen-quote" lang="en" dir="ltr">“${chosen.text}”</p>${bi(chosen.feedback, { always: hebrewSupport() !== 'off' })}
        <details class="why-others" data-why-others ${othersOpen ? html`open` : ''}><summary class="disclosure"><span class="chev" aria-hidden="true">${icon('chevron', { size: 16 })}</span><span>${chosen.verdict === 'best' ? tt('למה לא האחרות?', 'Why not the others?') : tt('מה עם התשובות האחרות?', 'What about the other replies?')}</span></summary>
          <ul class="alt-list">${others.map((o) => html`<li><p class="alt-quote" lang="en" dir="ltr">“${o.text}”${o.verdict === 'best' ? html` <span class="tag ok" lang="he" dir="rtl">${tt('הטבעית ביותר', 'Most natural')}</span>` : ''}</p><div class="xsmall muted">${bi(o.feedback)}</div></li>`)}</ul></details></div>
        <details class="panel flat own-words" data-own-box ${ownOpen ? html`open` : ''}><summary class="disclosure"><span class="chev" aria-hidden="true">${icon('chevron', { size: 18 })}</span><span>${tt('לנסות בניסוח שלכם', 'Try it in your own words')}</span></summary>
          <div class="stack-sm own-words-body">
          <label class="sr-only" for="own-reply">${tt('התשובה שלכם באנגלית', 'Your reply in English')}</label><textarea class="input own-input" id="own-reply" data-own rows="3" lang="en" dir="ltr" placeholder="${tt('כתבו או אמרו תשובה משלכם', 'Type or say your own reply')}" autocomplete="off" spellcheck="false">${typed}</textarea>
          <div class="row">${canListen() ? html`<button type="button" class="key icon-only" data-dictate aria-label="${tt('לומר בקול', 'Say it')}">${icon('speaking')}</button>` : ''}<button type="button" class="key" data-own-check>${tt('השוואה', 'Compare')}</button></div>
          ${typedResult ? ownResult(t) : ''}
        </div></details>` : ''}
    </div>`;
  };

  const CORRECTIONS = { off: ['בלי', 'Off'], light: ['רק מה שחוסם הבנה', 'Only what blocks meaning'], standard: ['רגיל', 'Standard'], intensive: ['הרבה', 'Intensive'] };
  const correctionsNote = () => {
    const c = settings().corrections || 'standard';
    const label = tt(...(CORRECTIONS[c] || CORRECTIONS.standard));
    return html`<p class="small muted">${c === 'intensive'
      ? tt(`לפי הגדרת התיקונים שלכם (${label}), השותף עשוי לחזור על מה שאמרתם בצורה הנכונה, בלי לעצור את השיחה. בסוף מקבלים משוב מפורט.`, `With your correction setting (${label}), the other person may repeat what you meant in the correct form, without stopping the conversation. You get detailed feedback at the end.`)
      : tt(`לא יתקנו אתכם באמצע השיחה. בסוף מקבלים משוב, לפי הגדרת התיקונים שלכם: ${label}.`, `You will not be corrected mid-conversation. At the end you get feedback that follows your correction setting: ${label}.`)}
      <a href="#/settings">${tt('לשנות', 'Change')}</a></p>`;
  };
  const tipsToggle = () => html`<label class="row small" style="gap:var(--s2)"><input type="checkbox" data-tips ${hebrewTips ? html`checked` : ''}><span>${tt('טיפים בעברית כשנתקעים', 'Hebrew tips when I get stuck')}</span></label>`;
  // On-demand help that needs no AI and costs nothing: the goal and the scenario's phrases, ready to adapt.
  const helpPanel = () => html`<section class="panel flat stack-sm" data-help tabindex="-1" aria-labelledby="rp-help-h">
    <div class="row between"><h3 class="small" id="rp-help-h">${tt('עזרה לשיחה', 'Help with the conversation')}</h3><button type="button" class="key ghost small" data-stuck>${tt('הסתרה', 'Hide')}</button></div>
    <div class="small goal-block"><p><strong>${tt('המטרה שלכם', 'Your goal')}</strong></p>${bi(s.goal, { always: hebrewTips })}</div>
    <p class="small muted">${tt('משפטים שאפשר להתחיל בהם. לחיצה מעתיקה את המשפט לתיבה, ושם אפשר לשנות אותו. במקום [your name] כתבו את השם שלכם.', 'Phrases you can start from. Tap one to copy it into the box, then change it as you like. Replace [your name] with your own name.')}</p>
    <ul class="phrase-help">${s.phrases.map(nameSlot).map((p, i) => html`<li><button type="button" class="key small" data-use-phrase="${i}"><span lang="en" dir="ltr">${p.en}</span></button>${hebrewTips && p.he ? html`<span class="xsmall l-he" lang="he" dir="rtl">${isolateLatin(p.he)}</span>` : ''}</li>`)}</ul>
  </section>`;

  // No account: both ways in, sign-up first on a device that has never been signed in (persona panel R2-09).
  const accountLinks = () => {
    const next = encodeURIComponent(`scenario/${s.id}?tab=roleplay`);
    const up = html`<a class="key" href="#/account?mode=signup&next=${next}">${tt('יצירת חשבון', 'Create an account')}</a>`;
    const inn = html`<a class="key ${store.owner() ? '' : 'ghost'}" href="#/account?mode=signin&next=${next}">${tt('כניסה לחשבון קיים', 'Sign in')}</a>`;
    return store.owner() ? html`${inn}${up}` : html`${up}${inn}`;
  };
  const roleplayTab = () => {
    if (!aiReady) {
      return html`<div class="stack" style="max-width:40rem"><p class="banner">${icon('info', { size: 18 })}<span>${noAiWhy()}</span></p><p class="small muted">${tt('בינתיים, התרגול המובנה עובד במלואו ונותן משוב על כל תשובה.', 'Meanwhile, the scripted practice works fully and gives feedback on every reply.')}</p>
        <div class="row"><button type="button" class="key enter" data-tab="practise">${tt('לתרגול המובנה', 'To scripted practice')}</button>${configured() && !auth.signedIn ? accountLinks() : ''}${configured() && auth.signedIn && !aiConsent() ? html`<a class="key" href="#/settings">${tt('להגדרות', 'Settings')}</a>` : ''}</div></div>`;
    }
    if (report) return reportView();
    if (!chat) {
      return html`<div class="stack" style="max-width:42rem"><div class="panel stack-sm"><h2 class="small">${tt('המשימה', 'Your task')}</h2>${bi(s.goal, { always: true })}<p class="small muted">${tt('ה-AI ישחק את הצד השני.', 'The AI plays the other person.')}</p><p class="small muted" data-no-real-details>${tt('אל תכתבו פרטים אישיים אמיתיים; אם השיחה מבקשת שם, כתובת או מספר, אפשר להמציא.', 'Do not type real personal details; if the conversation asks for a name, an address or a number, you can make one up.')}</p>${correctionsNote()}${tipsToggle()}<p class="xsmall faint">${tt('אם נתקעים, ״עזרה״ מציג את המטרה ומשפטים שימושיים, בלי לפגוע במשוב. משוב AI יכול לטעות.', 'If you get stuck, "Help" shows your goal and useful phrases; it does not affect your feedback. AI feedback can be wrong.')}</p></div>
        <div class="row"><button type="button" class="key enter" data-start-rp>${tt('להתחיל שיחה', 'Start the conversation')}</button></div></div>`;
    }
    const learnerTurns = chat.turns.filter((t) => t.role === 'learner').length;
    return html`<div class="stack" style="max-width:46rem">
      <div class="chat"><div class="chat-log" id="rplog">${chat.turns.map((t) => html`<div class="msg ${t.role === 'learner' ? 'me' : 'them'}" lang="en" dir="ltr"><span class="who">${t.role === 'learner' ? tt('את/ה', 'You') : s.roleplay.persona.split(/[,.]/)[0]}</span>${t.text}</div>${t.hint_he ? html`<p class="hint-box xsmall" lang="he" dir="rtl">${icon('hint', { size: 14 })}<span>${isolateLatin(t.hint_he)}</span></p>` : ''}`)}${busy ? html`<div class="msg them"><span class="spinner" aria-label="${tt('ממתין לתשובה', 'Waiting for a reply')}" style="width:1rem;height:1rem"></span></div>` : ''}</div>
        <form class="chat-input" data-rp-send><label class="sr-only" for="rpin">${tt('התשובה שלכם', 'Your reply')}</label><textarea class="input" id="rpin" rows="1" lang="en" dir="ltr" maxlength="1200" placeholder="${tt('כתבו באנגלית…', 'Write in English…')}" ${busy || chat.done ? html`disabled` : ''}></textarea>${canListen() ? html`<button type="button" class="key icon-only" data-rp-dictate aria-label="${tt('לומר בקול', 'Say it')}" ${busy ? html`disabled` : ''}>${icon('speaking')}</button>` : ''}<button class="key enter icon-only" type="submit" aria-label="${tt('שליחה', 'Send')}" ${busy || chat.done ? html`disabled` : ''}>${icon('send')}</button></form></div>
      <p class="xsmall faint" data-no-real-details>${tt('אל תכתבו פרטים אישיים אמיתיים; אפשר להמציא.', 'Do not type real personal details; you can make them up.')}</p>
      ${rpError ? html`<p class="error-text" role="alert">${rpError}</p>` : ''}
      <div class="row">${chat.done ? '' : html`<button type="button" class="key small" data-stuck aria-expanded="${stuck}">${icon('hint', { size: 16 })} ${tt('נתקעתי: עזרה', 'I\'m stuck: help')}</button>`}${tipsToggle()}</div>
      ${stuck && !chat.done ? helpPanel() : ''}
      <div class="row"><span class="grow small faint">${chat.done ? tt('השיחה הסתיימה.', 'The conversation is over.') : ''}</span><button type="button" class="key ${chat.done ? 'enter' : ''}" data-end-rp ${busy || learnerTurns < 1 ? html`disabled` : ''}>${tt('לסיים ולקבל משוב', 'Finish and get feedback')}</button></div></div>`;
  };

  // The report leads with the outcome in words and what worked; language points follow, and the numbers sit
  // in "Scores" (research C2: task success and language quality reported separately; P-16).
  // One report point: the English, then its Hebrew when the report has it (persona panel R2-10). The item takes
  // the screen's direction, so the list lines up under its heading; the English is isolated inside it.
  const reportItem = (en, he) => html`<span class="report-item"><bdi lang="en" dir="ltr">${en}</bdi>${he && hebrewSupport() !== 'off' ? html`<span class="bi-he" lang="he" dir="rtl">${isolateLatin(he)}</span>` : ''}</span>`;
  const reportView = () => {
    const f = report;
    const strengths = Array.isArray(f.strengths) ? f.strengths.filter(Boolean) : [];
    const row = (k, he, en) => (f[k] ? html`<div class="rubric-row"><span>${tt(he, en)}</span><span class="band num">${f[k].score}/100</span>${f[k].comments?.length ? html`<details><summary class="xsmall">${tt('פירוט', 'Details')}</summary><ul style="margin:0;padding-inline-start:1.1rem">${f[k].comments.map((c) => html`<li dir="auto">${c}</li>`)}</ul></details>` : ''}</div>` : '');
    return html`<div class="stack-lg" style="max-width:46rem">
      <div class="stack-sm"><h2 tabindex="-1" data-report-head>${tt('המשוב שלכם', 'Your feedback')}</h2>
        <p>${f.task_completed ? html`<span class="tag ok">${icon('check', { size: 14 })} ${tt('השגתם את המטרה', 'You reached the goal')}</span>` : html`<span class="tag warn">${tt('המטרה עוד לא הושגה', 'Goal not reached yet')}</span>`}</p>
        <p dir="auto">${f.summary}</p>${f.summary_he ? html`<p lang="he" dir="rtl" class="muted">${isolateLatin(f.summary_he)}</p>` : ''}</div>
      ${strengths.length ? html`<section class="stack-sm"><h3 class="small">${tt('מה עבד טוב', 'What worked')}</h3><ul class="check-rows small report-list">${strengths.map((x, i) => html`<li>${icon('check', { size: 16 })}${reportItem(x, f.strengths_he?.[i])}</li>`)}</ul></section>` : ''}
      ${f.better_alternatives?.length ? html`<section class="stack-sm"><h3 class="small">${tt('ניסוחים טבעיים יותר', 'More natural ways to say it')}</h3>${f.better_alternatives.map((a) => html`<div class="error-card style"><p class="small"><span class="quote" lang="en" dir="ltr">${a.you_said}</span></p><p lang="en" dir="ltr"><strong>${a.more_natural}</strong></p><p class="small muted" dir="auto">${a.why}</p></div>`)}</section>` : ''}
      ${f.practice?.length ? html`<section class="stack-sm"><h3 class="small">${tt('מה לתרגל', 'What to practise')}</h3><ul class="check-rows small report-list">${f.practice.map((p, i) => html`<li>${icon('arrow-next', { size: 16 })}${reportItem(p, f.practice_he?.[i])}</li>`)}</ul></section>` : ''}
      <details class="panel flat"><summary class="small">${tt('ציונים', 'Scores')} <span class="faint num">${f.conversation_score}/100</span></summary>
        <div class="stack-sm" style="margin-block-start:var(--s3)"><p class="xsmall faint">${tt('הערכה של AI לשיחה הזו, ביחס למה שמצופה ברמה של התרחיש. היא לא קובעת את הרמה שלכם.', 'An AI estimate for this conversation, relative to what the scenario\'s level expects. It does not set your level.')}</p>
        <div class="rubric">${row('grammar', 'דקדוק', 'Grammar')}${row('vocabulary', 'אוצר מילים', 'Vocabulary')}${row('naturalness', 'טבעיות', 'Naturalness')}</div></div></details>
      <p class="xsmall faint">${tt('משוב AI יכול לטעות.', 'AI feedback can be wrong.')}</p>
      <div class="row"><button type="button" class="key enter" data-new-rp>${tt('שיחה חדשה', 'New conversation')}</button><a class="key" href="#/real-life">${tt('לתרחישים', 'All scenarios')}</a></div></div>`;
  };

  function draw() {
    const body = { prepare, listen: listenTab, practise: practiseTab, roleplay: roleplayTab }[tab]();
    // The practice footer is a child of the whole view, not of the practice column: a sticky footer cannot rise
    // above the top of its parent, so at 150% text, where the header and tabs fill the first screen, it would sit
    // under the tab bar at turn 1 (r4 RW-7).
    const inTurn = tab === 'practise' && !(resume && ti === 0 && !checked) && ti < turnOrder.length;
    const t = inTurn ? turnOrder[ti] : null;
    render(el, html`<div class="scenario-view">${head()}${body}${inTurn ? practiseFoot(checked && picked != null ? t.options[picked] : null) : ''}</div>`);
    measureFoot();
    const log = $('#rplog', el); if (log) log.scrollTop = log.scrollHeight;
  }
  // Bring a part of the page into view and move focus to it, so a phone user sees what changed (P-65, P-16).
  // always: scroll even when the top is in view (block 'nearest' then moves only as far as needed, RW-1).
  const reveal = (sel, { block = 'start', always = false } = {}) => {
    const target = $(sel, el);
    if (!target) return;
    target.focus({ preventScroll: true });
    const r = target.getBoundingClientRect();
    if (always || r.top < 64 || r.top > innerHeight * 0.55) target.scrollIntoView({ block, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  // The footer alone is redrawn when the own-words box opens or closes, so the textarea keeps its focus (r4 RW-7).
  const redrawFoot = () => {
    const f = $('#pfoot', el);
    if (!f || tab !== 'practise' || ti >= turnOrder.length) return;
    const t = turnOrder[ti];
    const box = document.createElement('div');
    render(box, practiseFoot(checked && picked != null ? t.options[picked] : null));
    f.replaceWith(box.firstElementChild);
    measureFoot();
  };
  // The view's bottom padding is taller than the tab bar, so at the end of the page the footer would sit above its
  // stuck place and jump between turns. Its end margin takes the difference back, so it always sits right on the
  // tab bar; its height is kept in --rw-foot-h for the scroll margins (r4 RW-7).
  const measureFoot = () => {
    const view = el.closest('#view') || el;
    el.style.setProperty('--rw-view-pad', getComputedStyle(view).paddingBottom);
    const f = $('#pfoot', el);
    if (f) el.style.setProperty('--rw-foot-h', `${f.getBoundingClientRect().height}px`);
  };
  // The practice footer sits above the phone tab bar: its height (it changes with the text size, and is 0 when
  // the bar is hidden on wide screens) is kept in --rw-tabbar-h (RW-1).
  const tabbar = document.querySelector('.tabbar');
  const setTabbarH = () => { el.style.setProperty('--rw-tabbar-h', `${tabbar && getComputedStyle(tabbar).display !== 'none' ? tabbar.getBoundingClientRect().height : 0}px`); measureFoot(); };
  const tabbarRO = tabbar && typeof ResizeObserver === 'function' ? new ResizeObserver(setTabbarH) : null;
  tabbarRO?.observe(tabbar);
  setTabbarH();
  addEventListener('resize', setTabbarH);

  const scenarioPayload = () => ({ title: s.title_en, partner_role: s.partner_role, persona: s.roleplay.persona, complication: s.roleplay.complication, goal: s.goal.en, level: s.level, variant: settings().english_variant });
  const history = () => chat.turns.slice(1).map((t) => ({ role: t.role, text: t.text }));
  // Hebrew tips on: at least "partial", so the partner may add a Hebrew tip when the learner is stuck. Off:
  // at most "minimal", so it does not. Corrections follow the learner's setting (P-17, P-21).
  const support = () => {
    const own = hebrewSupport();
    const tipsOn = ['full', 'partial'].includes(own);
    if (hebrewTips) return tipsOn ? own : 'partial';
    return tipsOn ? 'minimal' : own;
  };
  const rpRequest = (task) => ({ task, hebrew_support: support(), corrections: settings().corrections || 'standard', scenario: scenarioPayload(), opening_line: s.roleplay.opening_line, history: history() });
  const RP_ERRORS = {
    rate_limited: ['הגעתם למגבלת ה-AI לשעה הזו או להיום. נסו שוב מאוחר יותר; התרגול המובנה עובד גם בלי AI.', 'You have reached the AI limit for this hour or for today. Try again later; the scripted practice works without AI.'],
    in_flight: ['בקשת AI אחרת שלכם עדיין רצה. חכו רגע ונסו שוב.', 'Another AI request of yours is still running. Wait a moment, then try again.'],
    budget_exhausted: ['ה-AI של Lucid הגיע היום למגבלה של כל הלומדים. נסו שוב מחר.', 'Lucid\'s AI has reached today\'s limit for all learners. Try again tomorrow.'],
    unauthenticated: ['פג תוקף הכניסה לחשבון. היכנסו שוב ונסו שוב.', 'Your session has expired. Sign in again, then try again.'],
    ai_consent_required: ['צריך להפעיל ״משוב AI״ בהגדרות.', 'Turn on "AI feedback" in Settings.'],
  };
  const rpErrorText = (e) => {
    if (e.network) return tt('אין חיבור. ההודעה לא נשלחה.', 'No connection. The message was not sent.');
    const code = RP_ERRORS[e.code] ? e.code : e.status === 429 ? 'rate_limited' : e.status === 401 ? 'unauthenticated' : null;
    return code ? tt(...RP_ERRORS[code]) : tt('ה-AI לא זמין כרגע. נסו שוב בעוד כמה דקות.', 'The AI is not available right now. Try again in a few minutes.');
  };

  async function sendTurn(text) {
    if (!text.trim() || busy) return;
    chat.turns.push({ role: 'learner', text: text.trim() });
    busy = true; rpError = ''; draw();
    try {
      const r = await callAI(rpRequest('roleplay_turn'));
      chat.turns.push({ role: 'partner', text: r.reply, hint_he: r.hint_he });
      if (r.scene_complete) chat.done = true;
      if (canSpeak()) say(r.reply, { variant });
    } catch (e) {
      chat.turns.pop();
      rpError = rpErrorText(e);
    }
    busy = false; saveChat(); draw();
    $('#rpin', el)?.focus();
  }
  function saveChat() { store.put('chats', { id: chat.id, kind: 'roleplay', scenario: s.id, turns: chat.turns.slice(-40), report, done: Boolean(chat.done), at: chat.at }); }

  draw();
  // The list arrives after the first draw. In the rare case the practice already ended, its end screen gets the
  // "Next scenario" link now, with focus kept on its heading.
  let left = false;
  content.scenarioIndex().then((d) => {
    data.scenarios = d?.scenarios || [];
    if (left || tab !== 'practise' || ti < turnOrder.length || !after()) return;
    const refocus = el.contains(document.activeElement);
    draw();
    if (refocus) $('[data-done-head]', el)?.focus();
  }).catch(() => {});
  const offs = [
    on(el, 'click', '[data-tab]', (e, b) => { stopSpeaking(); tab = b.dataset.tab; draw(); }),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant })),
    on(el, 'click', '[data-play-all]', async () => { for (const l of s.model_dialogue) { const ok = await say(l.text, { variant }); if (!ok) break; } }),
    // A tap selects (and can change) the reply without grading it; the selection is updated in place, so focus
    // stays on the tapped option (RW-1).
    on(el, 'click', '[data-opt]', (e, b) => {
      if (checked) return;
      picked = Number(b.dataset.opt);
      $$('[data-opt]', el).forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
      const key = $('[data-check-turn]', el); if (key) key.disabled = false;
      const help = $('#pfoot .grow', el); if (help) help.textContent = '';
    }),
    on(el, 'click', '[data-check-turn]', (e, b) => {
      if (b.disabled || checked || picked == null) return;
      checked = true;
      const o = turnOrder[ti].options[picked];
      results[ti] = o.verdict;
      if (ti + 1 < turnOrder.length) savePlace();
      recordAttempt({ source: 'scenario', exercise: `${s.id}:${ti}`, topic: ['social', 'work'].includes(s.module) ? 'social-functional' : 'travel-functional', skill: 'speaking', level: s.level, correct: o.verdict === 'best', score: o.verdict === 'best' ? 1 : o.verdict === 'ok' ? 0.5 : 0, error_type: o.verdict === 'best' ? null : o.error_type || null, response: o.text });
      draw();
      reveal('[data-explain]', { block: 'nearest', always: true });
    }),
    on(el, 'toggle', 'details[data-own-box]', (e, d) => { ownOpen = d.open; redrawFoot(); if (d.open) $('[data-own]', d)?.focus({ preventScroll: true }); }, true),
    on(el, 'toggle', 'details[data-why-others]', (e, d) => { othersOpen = d.open; }, true),
    on(el, 'click', '[data-own-check]', () => {
      typed = $('[data-own]', el).value;
      typedResult = checkOwnReply(typed, turnOrder[ti], { level: s.level });
      draw();
      // The result comes into view clear of the sticky footer (r4 RW-7).
      reveal('.own-result', { block: 'nearest', always: true });
    }),
    on(el, 'click', '[data-dictate]', async () => { try { const r = await listen({ variant }); typed = r.transcript; draw(); $('[data-own-check]', el)?.click(); } catch (e) { toast(speechErrorText(e)); } }),
    on(el, 'click', '[data-next-turn]', () => {
      ti++; picked = null; checked = false; typed = ''; typedResult = null; ownOpen = false; othersOpen = false;
      if (ti >= turnOrder.length) { store.put('progress', { id: `rl:${s.id}`, status: 'completed', completed_at: new Date().toISOString() }); logEvent({ type: 'speaking', scenario: s.id }); }
      draw();
      reveal(ti >= turnOrder.length ? '[data-done-head]' : '[data-step]');
    }),
    on(el, 'click', '[data-resume]', () => { tab = 'practise'; ti = resume.turn; results = [...(resume.answers || [])]; resume = null; picked = null; checked = false; draw(); reveal('[data-step]'); }),
    on(el, 'click', '[data-start-over]', () => { resume = null; clearPlace(); draw(); reveal('[data-step]'); }),
    on(el, 'click', '[data-restart]', () => { clearPlace(); ti = 0; picked = null; checked = false; typed = ''; typedResult = null; ownOpen = false; othersOpen = false; results = []; turnOrder.forEach((x) => { x.options = shuffle(x.options); }); draw(); }),
    on(el, 'change', '[data-tips]', (e, i) => { hebrewTips = i.checked; if (stuck) draw(); }),
    on(el, 'click', '[data-stuck]', () => {
      const draft = $('#rpin', el)?.value || '';
      stuck = !stuck;
      if (stuck) logEvent({ type: 'roleplay-help', scenario: s.id });
      draw();
      $('#rpin', el).value = draft;
      if (stuck) reveal('[data-help]', { block: 'nearest' }); else $('[data-stuck]', el)?.focus();
    }),
    on(el, 'click', '[data-use-phrase]', (e, b) => {
      const input = $('#rpin', el);
      const raw = s.phrases[Number(b.dataset.usePhrase)];
      if (!input || !raw) return;
      const p = nameSlot(raw);
      input.value = p.en;
      input.focus();
      input.setSelectionRange(...(p.slot || [p.en.length, p.en.length]));
    }),
    on(el, 'click', '[data-start-rp]', () => { chat = { id: uid('rp'), at: new Date().toISOString(), turns: [{ role: 'partner', text: s.roleplay.opening_line }] }; draw(); if (canSpeak()) say(s.roleplay.opening_line, { variant }); $('#rpin', el)?.focus(); }),
    on(el, 'submit', '[data-rp-send]', (e) => { e.preventDefault(); sendTurn($('#rpin', el).value); }),
    on(el, 'keydown', '#rpin', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendTurn(e.target.value); } }),
    on(el, 'click', '[data-rp-dictate]', async () => { try { const r = await listen({ variant }); $('#rpin', el).value = r.transcript; } catch (e) { toast(speechErrorText(e)); } }),
    on(el, 'click', '[data-end-rp]', async (e, b) => {
      if (b.disabled) return;
      busy = true; draw();
      try {
        const r = await callAI(rpRequest('roleplay_feedback'));
        report = r.feedback;
        recordAttempt({ source: 'roleplay', exercise: s.id, topic: ['social', 'work'].includes(s.module) ? 'social-functional' : 'travel-functional', skill: 'speaking', level: s.level, correct: report.task_completed, score: report.conversation_score / 100 });
        store.put('progress', { id: `rl:${s.id}`, status: 'completed', completed_at: new Date().toISOString() });
        logEvent({ type: 'speaking', roleplay: s.id });
      } catch (err) { rpError = rpErrorText(err); }
      busy = false; stuck = false; saveChat(); draw();
      if (report) { window.scrollTo({ top: 0 }); reveal('[data-report-head]'); }
    }),
    on(el, 'click', '[data-new-rp]', () => { chat = null; report = null; stuck = false; draw(); }),
  ];
  return () => { left = true; offs.forEach((o) => o()); stopSpeaking(); tabbarRO?.disconnect(); removeEventListener('resize', setTabbarH); el.style.removeProperty('--rw-tabbar-h'); el.style.removeProperty('--rw-view-pad'); el.style.removeProperty('--rw-foot-h'); };
}
