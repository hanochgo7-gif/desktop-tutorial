// AI tutor: eight teaching modes. It knows the learner's level, goals, weak topics and recurring
// mistakes, gives hints before answers, and never writes the learner's work for them.
import { html, raw, render, on, $, uid } from '../core/util.js';
import { tt, t, hebrewSupport } from '../core/i18n.js';
import { taxonomyIndex, content } from '../core/content.js';
import { icon, toast, confirmDialog } from '../ui/components.js';
import { model, settings, profile } from '../core/learner.js';
import { store } from '../core/store.js';
import { callAI, configured, auth } from '../core/api.js';
import { CONFIG } from '../../config.js';
import { canListen, listen, speechErrorText } from '../core/speech.js';

export const MODES = [
  ['beginner', 'מתחילים', 'Beginner', 'הסברים פשוטים, הרבה עברית, צעד אחד בכל פעם', 'Simple explanations, plenty of Hebrew, one step at a time'],
  ['conversation', 'שיחה', 'Conversation', 'לדבר על מה שמעניין אתכם, עם טיפ קטן בסוף', 'Talk about what interests you, with a small tip at the end'],
  ['grammar', 'דקדוק', 'Grammar', 'כלל, דוגמאות מנוגדות, ותרגול קצר', 'A rule, contrasting examples, and a short practice'],
  ['vocabulary', 'אוצר מילים', 'Vocabulary', 'משמעות, צירופים, משלב, ושאלות היזכרות', 'Meaning, collocations, register, and recall questions'],
  ['writing', 'מאמן כתיבה', 'Writing coach', 'תכנון, טיוטה ותיקון, בלי לכתוב בשבילכם', 'Planning, drafting and revising, without writing it for you'],
  ['debate', 'מאמן דיבייט', 'Debate coach', 'עמדה נגדית, ראיות, כשלים לוגיים', 'An opposing view, evidence, logical fallacies'],
  ['travel', 'שותף לטיול', 'Travel companion', 'הכנה למצבים אמיתיים בחו״ל', 'Getting ready for real situations abroad'],
  ['pronunciation', 'מאמן הגייה', 'Pronunciation coach', 'צלילים, הטעמה וזוגות מינימליים', 'Sounds, stress and minimal pairs'],
];

// Minimal, safe formatting for tutor replies: escape, then **bold** and line breaks.
function formatReply(text) {
  const esc = String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  return esc.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

export default async function tutor(el, ctx) {
  ctx.setTitle(t('nav.tutor'));
  const [tx, curriculum] = await Promise.all([taxonomyIndex(), content.curriculum()]);
  const aiReady = configured() && CONFIG.aiEnabled && auth.signedIn && settings().ai_consent;
  const lastLevel = model().courseLevel;
  let mode = ctx.query.mode || (['PreA1', 'A1'].includes(lastLevel) ? 'beginner' : 'conversation');
  let session = store.all('chats').filter((c) => c.kind === 'tutor' && c.mode === mode).sort((a, b) => (a.at < b.at ? 1 : -1))[0] || null;
  let busy = false; let error = '';

  function learnerContext() {
    const m = model();
    const lessonTitles = new Map(curriculum.levels.flatMap((l) => l.lessons.map((x) => [x.id, x.title_en])));
    const recent = store.all('progress').filter((p) => p.status === 'completed' && lessonTitles.has(p.id)).sort((a, b) => (a.completed_at < b.completed_at ? 1 : -1)).slice(0, 5).map((p) => lessonTitles.get(p.id));
    return {
      goals: profile()?.goals || [],
      weak_topics: m.weak.map((w) => tx.topic.get(w.topic)?.name_en || w.topic).slice(0, 8),
      recurring_errors: m.recurring.map((e) => tx.error.get(e.error_type)?.name_en || e.error_type).slice(0, 8),
      recent_lessons: recent,
    };
  }

  // Saved tutor conversations other than the one on screen ("New conversation" keeps the old one).
  const others = () => store.all('chats').filter((c) => c.kind === 'tutor' && c.id !== session?.id);
  function savedRow() {
    const n = others().length;
    return n ? html`<p class="xsmall faint row" style="margin-top:var(--s2);max-width:52rem">${tt(n === 1 ? 'עוד שיחה שמורה אחת עם המורה.' : `עוד ${n} שיחות שמורות עם המורה.`, `${n} more saved tutor conversation${n === 1 ? '' : 's'}.`)}<button type="button" class="key ghost small" data-delete-all>${icon('trash', { size: 14 })} ${tt('מחיקת כולן', 'Delete all')}</button></p>` : '';
  }

  function draw() {
    const msgs = session?.messages || [];
    render(el, html`
      <div class="page-head"><div><h1>${t('nav.tutor')}</h1><p>${tt('מורה שמלמד: שואל, נותן רמזים, ומתקן את מה שחשוב. הוא יודע מה הרמה שלכם ובמה כדאי להתמקד.', 'A tutor who teaches: asks, gives hints, and corrects what matters. It knows your level and what to focus on.')}</p></div></div>
      <div class="seg" role="group" aria-label="${tt('מצב המורה', 'Tutor mode')}" style="margin-block-end:var(--s3)">${MODES.map(([id, he, en]) => html`<button type="button" data-mode="${id}" aria-pressed="${mode === id}">${tt(he, en)}</button>`)}</div>
      <p class="small muted" style="margin-block-end:var(--s4)">${(() => { const x = MODES.find((m) => m[0] === mode); return tt(x[3], x[4]); })()}</p>
      ${mode === 'pronunciation' ? html`<p class="banner small" style="max-width:52rem;margin-block-end:var(--s4)" data-pron-note>${icon('info', { size: 18 })}<span>${tt('המורה קורא טקסט ולא שומע אתכם: גם כשמכתיבים בקול, מגיע אליו רק הטקסט שזוהה. כדי לבדוק איך הצלילים שלכם נשמעים:', 'The tutor reads text and can\'t hear you: when you dictate, it only gets the recognised text. To check how your sounds come across:')} <a href="#/speaking">${t('nav.speaking')}</a></span></p>` : ''}
      ${!aiReady ? html`<div class="panel stack" style="max-width:44rem">
          <p class="banner">${icon('info', { size: 18 })}<span>${!configured() || !CONFIG.aiEnabled ? tt('המורה מבוסס AI ופועל רק בשרת שבו הוגדר שירות ה-AI. בשרת הזה הוא עוד לא הוגדר, ולכן הוא לא זמין: אנחנו לא מציגים שיחה מזויפת.', 'The tutor runs on AI and works only on a server where the AI service is configured. It is not configured here, so the tutor is unavailable: we do not show a fake conversation.') : !auth.signedIn ? tt('כדי לדבר עם המורה צריך להיכנס לחשבון.', 'Sign in to talk with the tutor.') : tt('המורה דורש הפעלה של ״משוב AI״ בהגדרות.', 'The tutor needs "AI feedback" turned on in Settings.')}</span></p>
          <p class="small">${tt('בלי AI עדיין יש:', 'Without AI you still have:')}</p>
          <ul class="small stack-sm" style="margin:0;padding-inline-start:1.2rem"><li><a href="#/grammar">${t('nav.grammar')}</a> ${tt('– הסברים ותרגול לכל נושא', '– explanations and practice for every topic')}</li><li><a href="#/writing">${t('nav.writing')}</a> ${tt('– בדיקות כתיבה אוטומטיות', '– automatic writing checks')}</li><li><a href="#/real-life">${t('nav.reallife')}</a> ${tt('– תרגול שיחה מובנה', '– scripted conversation practice')}</li></ul>
          <div class="row">${configured() && !auth.signedIn ? html`<a class="key enter" href="#/account?mode=signin">${tt('כניסה', 'Sign in')}</a>` : ''}${configured() && auth.signedIn && !settings().ai_consent ? html`<a class="key enter" href="#/settings">${tt('להגדרות', 'Settings')}</a>` : ''}</div>${session ? html`<p class="xsmall faint row">${tt('יש שיחה שמורה במצב הזה.', 'There is a saved conversation in this mode.')}<button type="button" class="key ghost small" data-delete>${icon('trash', { size: 14 })} ${tt('מחיקה', 'Delete')}</button></p>` : ''}${savedRow()}</div>`
      : html`<div class="chat" style="max-width:52rem">
          <div class="chat-log" id="log" aria-live="polite">${!msgs.length ? html`<p class="small faint" style="margin:auto;text-align:center">${tt('אפשר לשאול כל דבר על אנגלית, או לבקש תרגול.', 'Ask anything about English, or ask for practice.')}</p>` : ''}
            ${msgs.map((m) => html`<div class="msg ${m.role === 'user' ? 'me' : 'them'}" dir="auto">${m.role === 'assistant' ? html`<span class="who">Lucid</span>` : ''}${m.role === 'assistant' ? raw(formatReply(m.text)) : m.text}</div>`)}
            ${busy ? html`<div class="msg them"><span class="spinner" aria-label="${tt('המורה כותב', 'The tutor is writing')}" style="width:1rem;height:1rem"></span></div>` : ''}</div>
          <form class="chat-input" data-send><label class="sr-only" for="tin">${tt('ההודעה שלך', 'Your message')}</label><textarea class="input" id="tin" rows="1" maxlength="2000" dir="auto" placeholder="${tt('כתבו הודעה…', 'Write a message…')}" ${busy ? html`disabled` : ''}></textarea>${canListen() ? html`<button type="button" class="key icon-only" data-dictate aria-label="${tt('לומר בקול', 'Say it')}">${icon('speaking')}</button>` : ''}<button class="key enter icon-only" type="submit" aria-label="${tt('שליחה', 'Send')}" ${busy ? html`disabled` : ''}>${icon('send')}</button></form>
        </div>
        ${error ? html`<p class="error-text" role="alert">${error}</p>` : ''}
        <div class="row" style="margin-top:var(--s3);max-width:52rem"><span class="xsmall faint grow">${tt('משוב AI יכול לטעות. אם משהו נראה לא נכון, בדקו אותו.', 'AI feedback can be wrong. If something looks off, check it.')}</span>${msgs.length ? html`<button type="button" class="key ghost small" data-delete>${icon('trash', { size: 16 })} ${tt('מחיקת השיחה', 'Delete conversation')}</button><button type="button" class="key ghost small" data-new>${icon('plus', { size: 16 })} ${tt('שיחה חדשה', 'New conversation')}</button>` : ''}</div>
        ${savedRow()}`}`);
    const log = $('#log', el); if (log) log.scrollTop = log.scrollHeight;
  }

  async function send(text) {
    const message = text.trim();
    if (!message || busy) return;
    session ||= { id: uid('tutor'), kind: 'tutor', mode, at: new Date().toISOString(), messages: [] };
    const history = session.messages.slice(-30);
    session.messages.push({ role: 'user', text: message });
    busy = true; error = ''; draw();
    try {
      const s = settings();
      const r = await callAI({ task: 'tutor_turn', mode, corrections: s.corrections, level: model().courseLevel, hebrew_support: hebrewSupport(), learner: learnerContext(), history, message });
      session.messages.push({ role: 'assistant', text: r.reply });
    } catch (e) {
      session.messages.pop();
      error = e.network ? tt('אין חיבור. ההודעה לא נשלחה.', 'No connection. The message was not sent.') : e.message;
      $('#tin', el) && ($('#tin', el).value = message);
    }
    busy = false;
    session.messages = session.messages.slice(-40);
    store.put('chats', { ...session });
    draw();
    $('#tin', el)?.focus();
  }

  draw();
  const offs = [
    on(el, 'click', '[data-mode]', (e, b) => { mode = b.dataset.mode; session = store.all('chats').filter((c) => c.kind === 'tutor' && c.mode === mode).sort((a, b2) => (a.at < b2.at ? 1 : -1))[0] || null; error = ''; draw(); }),
    on(el, 'submit', '[data-send]', (e) => { e.preventDefault(); send($('#tin', el).value); }),
    on(el, 'keydown', '#tin', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(e.target.value); } }),
    on(el, 'click', '[data-new]', () => { session = null; draw(); }),
    on(el, 'click', '[data-delete]', async () => {
      if (!session || busy) return;
      const ok = await confirmDialog({ title: tt('למחוק את השיחה?', 'Delete this conversation?'), body: tt('השיחה תימחק מהמכשיר, ואם יש לכם חשבון, גם מהשרת בסנכרון הבא.', 'It is removed from this device and, if you have an account, from the server at the next sync.'), confirm: tt('מחיקה', 'Delete'), danger: true });
      if (!ok) return;
      store.remove('chats', session.id);
      session = null; error = '';
      draw();
      toast(tt('השיחה נמחקה', 'Conversation deleted'));
    }),
    on(el, 'click', '[data-delete-all]', async () => {
      const list = others();
      if (!list.length || busy) return;
      const ok = await confirmDialog({ title: tt('למחוק את כל השיחות השמורות?', 'Delete all saved conversations?'), body: tt(`${list.length === 1 ? 'שיחה אחת' : `${list.length} שיחות`} עם המורה ${list.length === 1 ? 'תימחק' : 'יימחקו'} מהמכשיר, ואם יש לכם חשבון, גם מהשרת בסנכרון הבא. השיחה שעל המסך נשארת.`, `${list.length} tutor conversation${list.length === 1 ? '' : 's'} will be removed from this device and, if you have an account, from the server at the next sync. The conversation on screen stays.`), confirm: tt('מחיקה', 'Delete'), danger: true });
      if (!ok) return;
      list.forEach((c) => store.remove('chats', c.id));
      draw();
      toast(tt('השיחות נמחקו', 'Conversations deleted'));
    }),
    on(el, 'click', '[data-dictate]', async () => { try { const r = await listen(); $('#tin', el).value = r.transcript; } catch (err) { toast(speechErrorText(err)); } }),
  ];
  return () => offs.forEach((o) => o());
}
