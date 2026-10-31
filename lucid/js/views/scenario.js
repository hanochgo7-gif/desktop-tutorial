// One real-life scenario: prepare (phrases), listen (model dialogue), practise (scripted turns that
// work with no AI), and roleplay with an AI partner plus an end-of-conversation report.
import { html, render, on, $, shuffle, uid } from '../core/util.js';
import { tt, bi, legend, hebrewSupport } from '../core/i18n.js';
import { content } from '../core/content.js';
import { icon, levelTag, emptyState, toast } from '../ui/components.js';
import { say, canSpeak, canListen, listen, stopSpeaking, speechErrorText } from '../core/speech.js';
import { recordAttempt, settings, logEvent, profile } from '../core/learner.js';
import { store } from '../core/store.js';
import { callAI, configured, auth } from '../core/api.js';
import { CONFIG } from '../../config.js';
import { normalize } from '../core/grading.js';

const TABS = [['prepare', 'הכנה', 'Prepare'], ['listen', 'שיחה לדוגמה', 'Model dialogue'], ['practise', 'תרגול', 'Practise'], ['roleplay', 'שיחה עם AI', 'AI roleplay']];
const REGISTER = { polite: ['מנומס', 'polite', 'cobalt'], neutral: ['ניטרלי', 'neutral', ''], casual: ['יום-יומי', 'casual', 'warn'] };

export default async function scenarioView(el, ctx) {
  const data = await content.scenarios();
  const s = data?.scenarios?.find((x) => x.id === ctx.params.id);
  if (!s) { render(el, emptyState({ title: tt('התרחיש לא נמצא', 'Scenario not found'), action: html`<a class="key enter" href="#/real-life">${tt('לכל התרחישים', 'All scenarios')}</a>` })); return; }
  ctx.setTitle(s.title_en);
  let tab = ctx.query.tab || 'prepare';
  const variant = settings().english_variant === 'any' ? undefined : settings().english_variant;
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
  // practise state
  let ti = 0; let picked = null; let typed = ''; let typedResult = null;
  const turnOrder = s.practice.map((t) => ({ ...t, options: shuffle(t.options, t.partner.length / 100) }));
  // roleplay state
  let chat = null; let busy = false; let report = null; let rpError = '';

  const head = () => html`<div class="page-head"><div><p class="small faint"><a href="#/real-life">${tt('אנגלית לחיים', 'Real life')}</a></p><h1>${legend(s.title_en, s.title_he)}</h1><div class="row" style="margin-top:var(--s2)">${levelTag(s.level)}<span class="small muted">${tt('את/ה מדבר/ת עם:', 'You are talking to:')} <span lang="en" dir="ltr">${s.partner_role}</span></span></div></div></div>
    <div class="seg" role="group" style="margin-block-end:var(--s5)">${TABS.map(([id, he, en]) => html`<button type="button" data-tab="${id}" aria-pressed="${tab === id}">${tt(he, en)}</button>`)}</div>`;

  const prepare = () => html`<div class="stack-lg" style="max-width:52rem">
    <div class="panel stack-sm"><h2 class="small">${tt('המצב', 'The situation')}</h2>${bi(s.situation, { always: true })}<h2 class="small" style="margin-top:var(--s3)">${tt('המטרה שלך', 'Your goal')}</h2>${bi(s.goal, { always: true })}</div>
    <section class="stack-sm"><h2 class="small">${tt('משפטים שימושיים', 'Useful phrases')}</h2>
      <div class="examples">${s.phrases.map((p) => html`<div class="example">${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${p.en}" aria-label="${tt('השמעה', 'Play')}">${icon('volume', { size: 18 })}</button>` : ''}
        <div class="grow">${legend(p.en, p.he)}${p.note ? html`<div class="note" dir="auto">${p.note}</div>` : ''}</div>
        <span class="row">${REGISTER[p.register] ? html`<span class="tag ${REGISTER[p.register][2]}">${tt(REGISTER[p.register][0], REGISTER[p.register][1])}</span>` : ''}${p.variant ? html`<span class="tag">${p.variant}</span>` : ''}</span></div>`)}</div></section>
    ${s.variants?.length ? html`<section class="stack-sm"><h2 class="small">${tt('אמריקאית מול בריטית', 'American vs British')}</h2><div class="table-wrap"><table class="data"><thead><tr><th>US</th><th>UK</th><th></th></tr></thead><tbody>${s.variants.map((v) => html`<tr><td lang="en">${v.us}</td><td lang="en">${v.uk}</td><td dir="auto" class="faint">${v.note || ''}</td></tr>`)}</tbody></table></div></section>` : ''}
    ${s.culture?.length ? html`<section class="stack-sm"><h2 class="small">${tt('טיפים תרבותיים', 'Culture tips')}</h2>${s.culture.map((c) => html`<div class="block-tip">${bi(c, { always: hebrewSupport() !== 'off' })}</div>`)}</section>` : ''}
    <div class="row"><button type="button" class="key enter" data-tab="listen">${tt('לשיחה לדוגמה', 'To the model dialogue')}</button></div></div>`;

  const listenTab = () => html`<div class="stack" style="max-width:46rem">
    ${canSpeak() ? html`<div class="row"><button type="button" class="key" data-play-all>${icon('play', { size: 18 })} ${tt('להשמיע את כל השיחה', 'Play the whole conversation')}</button></div>` : ''}
    <div class="chat" style="height:auto;min-height:0"><div class="chat-log">${s.model_dialogue.map((l) => html`<div class="msg ${l.speaker === 'you' ? 'me' : 'them'}" lang="en" dir="ltr"><span class="who">${l.speaker === 'you' ? tt('את/ה', 'You') : s.partner_role}</span>${l.text}${canSpeak() ? html` <button type="button" class="key ghost small icon-only" data-say-text="${l.text}" aria-label="${tt('השמעה', 'Play')}" style="vertical-align:middle;min-height:1.8rem;width:1.8rem">${icon('volume', { size: 14 })}</button>` : ''}</div>`)}</div></div>
    <div class="row"><button type="button" class="key enter" data-tab="practise">${tt('לתרגל את זה', 'Practise it')}</button></div></div>`;

  const practiseTab = () => {
    if (ti >= turnOrder.length) {
      return html`<div class="stack" style="max-width:46rem"><h2>${tt('סיימתם את התרגול', 'Practice complete')}</h2><p class="muted">${tt('עכשיו אפשר לנסות שיחה חופשית', 'Now try a free conversation')} ${aiReady ? '' : tt('(עם AI, כשהוא מוגדר), או לחזור על התרגול.', '(with AI, when it is set up), or practise again.')}</p>
        <div class="row"><button type="button" class="key enter" data-tab="roleplay">${tt('לשיחה עם AI', 'To AI roleplay')}</button><button type="button" class="key" data-restart>${tt('שוב', 'Again')}</button></div></div>`;
    }
    const t = turnOrder[ti];
    const chosen = picked != null ? t.options[picked] : null;
    return html`<div class="stack" style="max-width:46rem">
      <p class="small faint num">${ti + 1} / ${turnOrder.length}</p>
      <div class="msg them" lang="en" dir="ltr" style="max-width:100%"><span class="who">${s.partner_role}</span>${t.partner} ${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-text="${t.partner}" aria-label="${tt('השמעה', 'Play')}" style="vertical-align:middle;min-height:1.8rem;width:1.8rem">${icon('volume', { size: 14 })}</button>` : ''}</div>
      <h2 class="small">${tt('מה הכי טבעי לענות?', 'What is the most natural reply?')}</h2>
      <div class="options">${t.options.map((o, i) => html`<button type="button" class="option ${picked != null && o.verdict === 'best' ? 'is-right' : ''} ${picked === i && o.verdict !== 'best' ? 'is-wrong' : ''}" data-opt="${i}" ${picked != null ? html`disabled` : ''} lang="en" dir="ltr"><span class="k">${i + 1}</span>${o.text}</button>`)}</div>
      ${chosen ? html`<div class="explain stack-sm"><p><strong>${chosen.verdict === 'best' ? tt('בדיוק', 'Spot on') : chosen.verdict === 'ok' ? tt('עובד, אבל יש טבעי יותר', 'It works, but there is a more natural way') : tt('לא מתאים כאן', 'Not right here')}</strong></p>${bi(chosen.feedback, { always: hebrewSupport() !== 'off' })}
        ${t.options.filter((o) => o !== chosen).map((o) => html`<p class="xsmall faint"><span lang="en" dir="ltr">“${o.text}”</span>: ${bi(o.feedback)}</p>`)}</div>
        <div class="panel flat stack-sm"><h3 class="small">${tt('עכשיו בניסוח שלכם', 'Now in your own words')}</h3>
          <div class="row"><input class="input grow" data-own lang="en" dir="ltr" value="${typed}" placeholder="${tt('כתבו או אמרו תשובה משלכם', 'Type or say your own reply')}" autocomplete="off">${canListen() ? html`<button type="button" class="key icon-only" data-dictate aria-label="${tt('לומר בקול', 'Say it')}">${icon('speaking')}</button>` : ''}<button type="button" class="key" data-own-check>${tt('בדיקה', 'Check')}</button></div>
          ${typedResult ? html`<p class="small">${typedResult.hits.length >= Math.min(2, typedResult.total) ? tt('נשמע טוב. השוו לדוגמאות:', 'Sounds good. Compare with these:') : tt('נסו להשתמש במילים כמו:', 'Try using words like:')} ${typedResult.total ? html`<span lang="en" dir="ltr" class="faint">${t.keywords.join(', ')}</span>` : ''}</p><ul class="small" style="margin:0;padding-inline-start:1.2rem">${t.model_replies.map((r) => html`<li lang="en" dir="ltr">${r}</li>`)}</ul>` : ''}
        </div>
        <div class="row"><span class="grow"></span><button type="button" class="key enter" data-next-turn>${tt('המשך', 'Continue')}</button></div>` : ''}
    </div>`;
  };

  const roleplayTab = () => {
    if (!aiReady) {
      const why = !configured() || !CONFIG.aiEnabled ? tt('שיחה חופשית עם AI דורשת שרת עם הגדרת AI. בשרת הזה היא עוד לא הוגדרה.', 'Free conversation with AI needs a server with AI configured. It is not configured on this server.')
        : !auth.signedIn ? tt('כדי לדבר עם AI צריך להיכנס לחשבון.', 'Sign in to talk with the AI.') : tt('צריך להפעיל ״משוב AI״ בהגדרות.', 'Turn on "AI feedback" in Settings.');
      return html`<div class="stack" style="max-width:40rem"><p class="banner">${icon('info', { size: 18 })}<span>${why}</span></p><p class="small muted">${tt('בינתיים, התרגול המובנה עובד במלואו ונותן משוב על כל תשובה.', 'Meanwhile, the scripted practice works fully and gives feedback on every reply.')}</p>
        <div class="row"><button type="button" class="key enter" data-tab="practise">${tt('לתרגול המובנה', 'To scripted practice')}</button>${configured() && !auth.signedIn ? html`<a class="key" href="#/account?mode=signin&next=${encodeURIComponent(`scenario/${s.id}?tab=roleplay`)}">${tt('כניסה', 'Sign in')}</a>` : ''}${configured() && auth.signedIn && !settings().ai_consent ? html`<a class="key" href="#/settings">${tt('להגדרות', 'Settings')}</a>` : ''}</div></div>`;
    }
    if (report) return reportView();
    if (!chat) {
      return html`<div class="stack" style="max-width:42rem"><div class="panel stack-sm"><h2 class="small">${tt('המשימה', 'Your task')}</h2>${bi(s.goal, { always: true })}<p class="small muted">${tt('ה-AI ישחק את הצד השני. לא יתקנו אתכם באמצע: בסוף מקבלים משוב מפורט.', 'The AI plays the other person. You will not be corrected mid-conversation: you get detailed feedback at the end.')}</p><p class="xsmall faint">${tt('משוב AI יכול לטעות.', 'AI feedback can be wrong.')}</p></div>
        <div class="row"><button type="button" class="key enter" data-start-rp>${tt('להתחיל שיחה', 'Start the conversation')}</button></div></div>`;
    }
    return html`<div class="stack" style="max-width:46rem">
      <div class="chat"><div class="chat-log" id="rplog">${chat.turns.map((t) => html`<div class="msg ${t.role === 'learner' ? 'me' : 'them'}" lang="en" dir="ltr"><span class="who">${t.role === 'learner' ? tt('את/ה', 'You') : s.roleplay.persona.split(/[,.]/)[0]}</span>${t.text}</div>${t.hint_he ? html`<p class="hint-box xsmall" lang="he" dir="rtl">${icon('hint', { size: 14 })} ${t.hint_he}</p>` : ''}`)}${busy ? html`<div class="msg them"><span class="spinner" aria-label="${tt('ממתין לתשובה', 'Waiting for a reply')}" style="width:1rem;height:1rem"></span></div>` : ''}</div>
        <form class="chat-input" data-rp-send><label class="sr-only" for="rpin">${tt('התשובה שלך', 'Your reply')}</label><textarea class="input" id="rpin" rows="1" lang="en" dir="ltr" maxlength="1200" placeholder="${tt('כתבו באנגלית…', 'Write in English…')}" ${busy || chat.done ? html`disabled` : ''}></textarea>${canListen() ? html`<button type="button" class="key icon-only" data-rp-dictate aria-label="${tt('לומר בקול', 'Say it')}" ${busy ? html`disabled` : ''}>${icon('speaking')}</button>` : ''}<button class="key enter icon-only" type="submit" aria-label="${tt('שליחה', 'Send')}" ${busy || chat.done ? html`disabled` : ''}>${icon('send')}</button></form></div>
      ${rpError ? html`<p class="error-text" role="alert">${rpError}</p>` : ''}
      <div class="row"><span class="grow small faint">${chat.done ? tt('השיחה הסתיימה.', 'The conversation is over.') : ''}</span><button type="button" class="key ${chat.done ? 'enter' : ''}" data-end-rp ${busy || chat.turns.filter((t) => t.role === 'learner').length < 1 ? html`disabled` : ''}>${tt('לסיים ולקבל משוב', 'Finish and get feedback')}</button></div></div>`;
  };

  const reportView = () => {
    const f = report;
    const row = (k, he, en) => html`<div class="rubric-row"><span>${tt(he, en)}</span><span class="band num">${f[k].score}/100</span><details><summary class="xsmall">${tt('פירוט', 'Details')}</summary><ul style="margin:0;padding-inline-start:1.1rem">${f[k].comments.map((c) => html`<li dir="auto">${c}</li>`)}</ul></details></div>`;
    return html`<div class="stack-lg" style="max-width:46rem">
      <div class="row between"><h2>${tt('המשוב שלך', 'Your feedback')}</h2><span class="tag level" style="font-size:var(--t-lg)">${f.conversation_score}/100</span></div>
      <p>${f.task_completed ? html`<span class="tag ok">${tt('המשימה הושגה', 'Goal achieved')}</span>` : html`<span class="tag warn">${tt('המשימה עוד לא הושגה', 'Goal not reached yet')}</span>`}</p>
      <p dir="auto">${f.summary}</p>${f.summary_he ? html`<p lang="he" dir="rtl" class="muted">${f.summary_he}</p>` : ''}
      <div class="rubric">${row('grammar', 'דקדוק', 'Grammar')}${row('vocabulary', 'אוצר מילים', 'Vocabulary')}${row('naturalness', 'טבעיות', 'Naturalness')}</div>
      ${f.better_alternatives.length ? html`<section class="stack-sm"><h3 class="small">${tt('ניסוחים טבעיים יותר', 'More natural ways to say it')}</h3>${f.better_alternatives.map((a) => html`<div class="error-card style"><p class="small"><span class="quote" lang="en" dir="ltr">${a.you_said}</span></p><p lang="en" dir="ltr"><strong>${a.more_natural}</strong></p><p class="small muted" dir="auto">${a.why}</p></div>`)}</section>` : ''}
      ${f.practice.length ? html`<section class="stack-sm"><h3 class="small">${tt('מה לתרגל', 'What to practise')}</h3><ul class="small" style="margin:0;padding-inline-start:1.2rem">${f.practice.map((p) => html`<li dir="auto">${p}</li>`)}</ul></section>` : ''}
      <p class="xsmall faint">${tt('משוב AI יכול לטעות.', 'AI feedback can be wrong.')}</p>
      <div class="row"><button type="button" class="key enter" data-new-rp>${tt('שיחה חדשה', 'New conversation')}</button><a class="key" href="#/real-life">${tt('לתרחישים', 'All scenarios')}</a></div></div>`;
  };

  function draw() {
    const body = { prepare, listen: listenTab, practise: practiseTab, roleplay: roleplayTab }[tab]();
    render(el, html`${head()}${body}`);
    const log = $('#rplog', el); if (log) log.scrollTop = log.scrollHeight;
  }

  const scenarioPayload = () => ({ title: s.title_en, partner_role: s.partner_role, persona: s.roleplay.persona, complication: s.roleplay.complication, goal: s.goal.en, level: s.level, variant: settings().english_variant });
  const history = () => chat.turns.slice(1).map((t) => ({ role: t.role, text: t.text }));
  const support = () => hebrewSupport();

  async function sendTurn(text) {
    if (!text.trim() || busy) return;
    chat.turns.push({ role: 'learner', text: text.trim() });
    busy = true; rpError = ''; draw();
    try {
      const r = await callAI({ task: 'roleplay_turn', hebrew_support: support(), scenario: scenarioPayload(), opening_line: s.roleplay.opening_line, history: history() });
      chat.turns.push({ role: 'partner', text: r.reply, hint_he: r.hint_he });
      if (r.scene_complete) chat.done = true;
      if (canSpeak()) say(r.reply, { variant });
    } catch (e) {
      chat.turns.pop();
      rpError = e.code === 'rate_limited' || e.status === 429 ? e.message : e.network ? tt('אין חיבור. ההודעה לא נשלחה.', 'No connection. The message was not sent.') : e.message;
    }
    busy = false; saveChat(); draw();
    $('#rpin', el)?.focus();
  }
  function saveChat() { store.put('chats', { id: chat.id, kind: 'roleplay', scenario: s.id, turns: chat.turns.slice(-40), report, done: Boolean(chat.done), at: chat.at }); }

  draw();
  const offs = [
    on(el, 'click', '[data-tab]', (e, b) => { stopSpeaking(); tab = b.dataset.tab; draw(); }),
    on(el, 'click', '[data-say-text]', (e, b) => say(b.dataset.sayText, { variant })),
    on(el, 'click', '[data-play-all]', async () => { for (const l of s.model_dialogue) { const ok = await say(l.text, { variant }); if (!ok) break; } }),
    on(el, 'click', '[data-opt]', (e, b) => {
      if (picked != null) return;
      picked = Number(b.dataset.opt);
      const v = turnOrder[ti].options[picked].verdict;
      recordAttempt({ source: 'scenario', exercise: `${s.id}:${ti}`, topic: s.module === 'social' ? 'social-functional' : 'travel-functional', skill: 'speaking', level: s.level, correct: v === 'best', score: v === 'best' ? 1 : v === 'ok' ? 0.5 : 0, error_type: v === 'best' ? null : turnOrder[ti].options[picked].error_type || null, response: turnOrder[ti].options[picked].text });
      draw();
    }),
    on(el, 'click', '[data-own-check]', () => {
      typed = $('[data-own]', el).value;
      const n = normalize(typed);
      const kw = turnOrder[ti].keywords;
      typedResult = { hits: kw.filter((k) => n.includes(normalize(k))), total: kw.length };
      draw();
    }),
    on(el, 'click', '[data-dictate]', async () => { try { const r = await listen({ variant }); typed = r.transcript; draw(); $('[data-own-check]', el)?.click(); } catch (e) { toast(speechErrorText(e)); } }),
    on(el, 'click', '[data-next-turn]', () => { ti++; picked = null; typed = ''; typedResult = null; if (ti >= turnOrder.length) { store.put('progress', { id: `rl:${s.id}`, status: 'completed', completed_at: new Date().toISOString() }); logEvent({ type: 'speaking', scenario: s.id }); } draw(); }),
    on(el, 'click', '[data-restart]', () => { ti = 0; picked = null; typed = ''; typedResult = null; draw(); }),
    on(el, 'click', '[data-start-rp]', () => { chat = { id: uid('rp'), at: new Date().toISOString(), turns: [{ role: 'partner', text: s.roleplay.opening_line }] }; draw(); if (canSpeak()) say(s.roleplay.opening_line, { variant }); $('#rpin', el)?.focus(); }),
    on(el, 'submit', '[data-rp-send]', (e) => { e.preventDefault(); sendTurn($('#rpin', el).value); }),
    on(el, 'keydown', '#rpin', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendTurn(e.target.value); } }),
    on(el, 'click', '[data-rp-dictate]', async () => { try { const r = await listen({ variant }); $('#rpin', el).value = r.transcript; } catch (e) { toast(speechErrorText(e)); } }),
    on(el, 'click', '[data-end-rp]', async (e, b) => {
      if (b.disabled) return;
      busy = true; draw();
      try {
        const r = await callAI({ task: 'roleplay_feedback', hebrew_support: support(), scenario: scenarioPayload(), opening_line: s.roleplay.opening_line, history: history() });
        report = r.feedback;
        recordAttempt({ source: 'roleplay', exercise: s.id, topic: s.module === 'social' ? 'social-functional' : 'travel-functional', skill: 'speaking', level: s.level, correct: report.task_completed, score: report.conversation_score / 100 });
        store.put('progress', { id: `rl:${s.id}`, status: 'completed', completed_at: new Date().toISOString() });
        logEvent({ type: 'speaking', roleplay: s.id });
      } catch (err) { rpError = err.message; }
      busy = false; saveChat(); draw();
    }),
    on(el, 'click', '[data-new-rp]', () => { chat = null; report = null; draw(); }),
  ];
  return () => { offs.forEach((o) => o()); stopSpeaking(); };
}
