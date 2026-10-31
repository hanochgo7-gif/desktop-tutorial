// Speaking lab: (a) English sounds that change meaning and that Hebrew speakers often merge, with a
// listening drill ("Which did you hear?") and a recognition check ("Say it"); (b) shadowing sentences
// from the lessons in the focused player; (c) an honest note on what speech recognition can and
// cannot judge. Nothing here is an accent score: feedback is about being understood.
import { html, render, on, $, shuffle } from '../core/util.js';
import { tt, t, bi, hebrewSupport } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { icon, mark, levelTag, emptyState } from '../ui/components.js';
import { model, settings, logEvent } from '../core/learner.js';
import { say, canSpeak, canListen, listen, stopSpeaking, micNotice, speechErrorText } from '../core/speech.js';
import { normalize } from '../core/grading.js';
import { gatherExercises, attemptsOn, itemHref, findItem, runPlayer, missingPlayer, hebrewReveal } from '../ui/center.js';

const W = (w, ipa, he) => ({ w, ipa, he });
// Isolates a left-to-right run (IPA, English) inside Hebrew text so the bidi algorithm keeps it intact.
const L = (s) => `\u2066${s}\u2069`;
// Minimal pairs for contrasts Hebrew does not make (one i-sound, no /æ/ or /ʌ/, no th, w often heard as v).
// `words` names each set by example words, so the tabs make sense without knowing IPA (P-23).
export const SOUND_SETS = [
  {
    id: 'ih-ee', label: '/ɪ/ – /iː/', words: 'ship / sheep',
    pairs: [[W('ship', '/ʃɪp/', 'ספינה'), W('sheep', '/ʃiːp/', 'כבשה')], [W('live', '/lɪv/', 'לגור, לחיות'), W('leave', '/liːv/', 'לעזוב')], [W('fill', '/fɪl/', 'למלא'), W('feel', '/fiːl/', 'להרגיש')], [W('bit', '/bɪt/', 'קצת, חתיכה'), W('beat', '/biːt/', 'לנצח, להכות')]],
    tip: { en: 'For /iː/ (sheep) spread your lips as if smiling and hold the sound a little longer; for /ɪ/ (ship) relax your lips and keep it short, slightly towards "e".', he: `ב-${L('/iː/ (sheep)')} מותחים את השפתיים כמו בחיוך ומאריכים מעט את הצליל; ב-${L('/ɪ/ (ship)')} השפתיים רפויות והצליל קצר, קצת לכיוון ״אֶ״.` },
  },
  {
    id: 'ae-uh-e', label: '/æ/ – /ʌ/ – /e/', words: 'cat / cut / bed',
    pairs: [[W('cat', '/kæt/', 'חתול'), W('cut', '/kʌt/', 'לחתוך')], [W('bad', '/bæd/', 'רע'), W('bed', '/bed/', 'מיטה')], [W('hat', '/hæt/', 'כובע'), W('hut', '/hʌt/', 'בקתה')]],
    tip: { en: '/æ/ (cat): drop your jaw and spread your lips, between Hebrew "a" and "e". /ʌ/ (cut): a short, relaxed "a" from the middle of the mouth. /e/ (bed): close to Hebrew "e".', he: `${L('/æ/ (cat)')}: מורידים את הלסת ומותחים את השפתיים, צליל שבין ״אַ״ ל״אֶ״. ${L('/ʌ/ (cut)')}: ״אַ״ קצרה ורפויה מאמצע הפה. ${L('/e/ (bed)')}: קרוב ל״אֶ״ בעברית.` },
  },
  {
    id: 'th-s-t', label: '/θ/ – /s/ – /t/', words: 'think / sink / tank',
    pairs: [[W('think', '/θɪŋk/', 'לחשוב'), W('sink', '/sɪŋk/', 'כיור')], [W('three', '/θriː/', 'שלוש'), W('tree', '/triː/', 'עץ')], [W('thank', '/θæŋk/', 'להודות'), W('tank', '/tæŋk/', 'מכל, טנק')]],
    tip: { en: 'Put the tip of your tongue lightly between your front teeth and blow out gently, with no voice. If the tongue stays behind the teeth, you get /s/ or /t/.', he: `מניחים את קצה הלשון בעדינות בין השיניים הקדמיות ונושפים, בלי קול. אם הלשון נשארת מאחורי השיניים, יוצא ${L('/s/')} או ${L('/t/')}.` },
  },
  {
    id: 'dh-d', label: '/ð/ – /d/', words: 'they / day',
    pairs: [[W('they', '/ðeɪ/', 'הם, הן'), W('day', '/deɪ/', 'יום')], [W('then', '/ðen/', 'אז'), W('den', '/den/', 'מאורה')]],
    tip: { en: 'Same tongue position as /θ/, between the teeth, but with your voice on: you should feel a buzz. Pressing the tongue behind the teeth gives /d/.', he: `אותה תנוחת לשון כמו ב-${L('/θ/')}, בין השיניים, אבל עם קול: מרגישים זמזום. כשהלשון נלחצת מאחורי השיניים, יוצא ${L('/d/')}.` },
  },
  {
    id: 'w-v', label: '/w/ – /v/', words: 'wine / vine',
    pairs: [[W('wine', '/waɪn/', 'יין'), W('vine', '/vaɪn/', 'גפן')], [W('west', '/west/', 'מערב'), W('vest', '/vest/', 'אפוד')], [W('wet', '/wet/', 'רטוב'), W('vet', '/vet/', 'וטרינר')]],
    tip: { en: 'For /w/ round your lips as for a short "oo" and keep your teeth off them; for /v/ your top teeth rest lightly on your bottom lip.', he: `ב-${L('/w/')} מעגלים את השפתיים כמו ל״אוּ״ קצרה, בלי שהשיניים ייגעו בהן; ב-${L('/v/')} השיניים העליונות נוגעות קלות בשפה התחתונה.` },
  },
  {
    id: 'u-uu', label: '/ʊ/ – /uː/', words: 'full / fool',
    pairs: [[W('full', '/fʊl/', 'מלא'), W('fool', '/fuːl/', 'טיפש')], [W('pull', '/pʊl/', 'למשוך'), W('pool', '/puːl/', 'בריכה')]],
    tip: { en: '/uː/ (fool): round your lips tightly and hold the sound longer. /ʊ/ (full): looser lips, a short and relaxed sound.', he: `${L('/uː/ (fool)')}: מעגלים את השפתיים חזק ומאריכים את הצליל. ${L('/ʊ/ (full)')}: שפתיים רפויות יותר, צליל קצר ורגוע.` },
  },
];
const ROUND = 8;
const tokens = (s) => normalize(s).replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean);
const enq = (w) => html`<span lang="en" dir="ltr">“${w}”</span>`;

function newRound(set) {
  const all = set.pairs.flatMap((p, pi) => p.map((_, wi) => ({ pi, wi })));
  let pool = [];
  while (pool.length < ROUND) pool = pool.concat(shuffle(all, Math.random()));
  return { items: pool.slice(0, ROUND), i: 0, right: 0, played: false, picked: null, done: false };
}

// Exact word comparison: the general word matcher forgives one-letter slips in longer words, which
// would accept "tree" for "three" and defeat the point of a minimal pair.
function judge({ transcript = '', alternatives = [] }, target, partner) {
  const alts = [transcript, ...alternatives].filter(Boolean);
  const top = alts[0] || '';
  if (tokens(top).includes(partner) && !tokens(top).includes(target)) return { kind: 'partner', heard: top };
  const hit = alts.find((a) => tokens(a).includes(target));
  if (hit) return { kind: 'match', heard: hit };
  return { kind: 'other', heard: top };
}

export default async function speaking(el, ctx) {
  ctx.setTitle(t('nav.speaking'));
  const [items, ix] = await Promise.all([gatherExercises(['speak']), taxonomyIndex()]);
  const backLabel = tt('חזרה למעבדת הדיבור', 'Back to the Speaking lab');

  if (ctx.query.l && ctx.query.e) {
    const item = findItem(items, ctx.query);
    if (!item) {
      return missingPlayer(el, { back: 'speaking', backLabel, title: tt('המשפט לא נמצא', 'Sentence not found'), body: tt('המשפט הזה לא זמין במכשיר. אולי השיעור שלו עוד לא נטען; נסו לרענן או לבחור משפט אחר.', 'This sentence is not available on this device. Its lesson may not have loaded yet; try reloading or choose another sentence.'), cta: tt('למעבדת הדיבור', 'To the Speaking lab') });
    }
    return runPlayer(el, ctx, { item, back: 'speaking', backLabel, source: 'speaking', skill: 'speaking', errors: ix.error, event: 'speaking' });
  }

  const variant = settings().english_variant;
  let set = SOUND_SETS.find((s) => s.id === ctx.query.sound) || SOUND_SETS[0];
  let hear = newRound(set);
  let speak = { target: set.pairs[0][1].w, status: 'idle' };
  let loggedSay = false;
  let alive = true;
  const wordInfo = (w) => set.pairs.flat().find((x) => x.w === w);
  const partnerOf = (w) => { const p = set.pairs.find((x) => x.some((y) => y.w === w)); return p ? p.find((y) => y.w !== w).w : ''; };
  const refocus = (sel) => $(sel, el)?.focus();

  function drawSet() {
    render($('#sp-set', el), html`<div class="stack">
      <div class="block-tip row" style="align-items:flex-start;flex-wrap:nowrap">${icon('hint', { size: 18 })}<div class="grow">${bi(set.tip, { always: hebrewSupport() !== 'off' })}</div></div>
      <div class="table-wrap"><table class="data">
        <caption class="sr-only">${tt('זוגות מילים', 'Word pairs')} <span lang="en" dir="ltr">${set.label}</span></caption>
        <tbody>${set.pairs.map((p) => html`<tr>${p.map((x) => html`<td><div class="row" style="gap:var(--s2)">
          ${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-word="${x.w}" aria-label="${tt('השמעה', 'Play')}: ${x.w}">${icon('volume', { size: 18 })}</button>` : ''}
          <span lang="en" dir="ltr" style="font-weight:600">${x.w}</span><span class="entry-ipa" lang="en" dir="ltr">${x.ipa}</span><span class="entry-he small" lang="he" dir="rtl">${x.he}</span>
        </div></td>`)}</tr>`)}</tbody>
      </table></div>
    </div>`);
  }

  function drawHear() {
    const box = $('#sp-hear', el);
    const head = html`<div class="row between"><h3 id="sp-hear-h">${tt('איזו מילה שמעתם?', 'Which did you hear?')}</h3>${canSpeak() && !hear.done ? html`<span class="step-count">${t('of', { a: hear.i + 1, b: hear.items.length })}</span>` : ''}</div>`;
    if (!canSpeak()) {
      render(box, html`${head}<p class="banner warn small">${icon('alert', { size: 18 })}<span>${tt('הדפדפן הזה לא יכול להשמיע מילים, ולכן תרגיל ההאזנה לא זמין כאן. הטיפ והזוגות למעלה עדיין רלוונטיים, ואפשר לנסות ב-Chrome, Edge או Safari.', 'This browser cannot play words aloud, so the listening drill is not available here. The tip and pairs above still apply; try Chrome, Edge or Safari.')}</span></p>`);
      return;
    }
    if (hear.done) {
      const all = hear.right === hear.items.length;
      render(box, html`${head}
        <p>${tt(`שמעתם נכון ${hear.right} מתוך ${hear.items.length}.`, `You heard ${hear.right} of ${hear.items.length} correctly.`)}</p>
        <p class="small muted">${all ? tt('האוזן כבר מבחינה בין הצלילים. עכשיו נסו לומר אותם בצד של ״אמרו את זה״.', 'Your ear already tells these sounds apart. Now try saying them in "Say it".') : tt('ההבדל נעשה ברור יותר עם כל סבב. שימו לב לאורך הצליל ולצורת השפתיים.', 'The difference gets clearer with every round. Listen for the length of the sound and the shape of the lips.')}</p>
        <div class="row"><button type="button" class="key enter" data-hear-again>${icon('refresh', { size: 18 })} ${tt('סבב נוסף', 'Another round')}</button></div>`);
      return;
    }
    const it = hear.items[hear.i];
    const pair = set.pairs[it.pi];
    const answered = hear.picked != null;
    const said = pair[it.wi];
    const other = pair[1 - it.wi];
    render(box, html`${head}
      <p class="small muted">${tt('לחצו על השמעה ובחרו את המילה ששמעתם.', 'Press play, then choose the word you heard.')}</p>
      <div class="row">
        <button type="button" class="key ${hear.played ? '' : 'enter'}" data-hear-play>${icon('volume', { size: 18 })} ${hear.played ? tt('להשמיע שוב', 'Play again') : tt('השמעת המילה', 'Play the word')}</button>
        ${hear.played ? html`<button type="button" class="key ghost small" data-hear-slow>${icon('turtle', { size: 18 })} ${tt('לאט', 'Slowly')}</button>` : ''}
      </div>
      <div class="match-grid" role="group" aria-labelledby="sp-hear-h">${pair.map((x, k) => html`<button type="button" class="option ${answered ? (k === it.wi ? 'is-right' : k === hear.picked ? 'is-wrong' : '') : ''}" data-hear-pick="${k}" ${!hear.played || answered ? html`disabled` : ''} style="justify-content:center">
        <span lang="en" dir="ltr" style="font-weight:600;font-size:var(--t-lg)">${x.w}</span></button>`)}</div>
      <div aria-live="polite">${answered
        ? html`<div class="stack-sm"><p class="row small"><span class="tag ${hear.picked === it.wi ? 'ok' : 'bad'}">${icon(hear.picked === it.wi ? 'check' : 'x', { size: 14 })} ${hear.picked === it.wi ? tt('נכון', 'Correct') : tt('לא בדיוק', 'Not quite')}</span>
            <span>${tt('המילה הייתה', 'The word was')} ${enq(said.w)} <span class="entry-ipa" lang="en" dir="ltr">${said.ipa}</span> <span lang="he" dir="rtl" class="entry-he">${said.he}</span>${hear.picked === it.wi ? '' : html`, ${tt('ולא', 'not')} ${enq(other.w)} <span lang="he" dir="rtl" class="entry-he">${other.he}</span>`}.</span></p>
          <div class="row"><span class="xsmall faint">${tt('להשוות:', 'Compare:')}</span>${pair.map((x) => html`<button type="button" class="key ghost small" data-say-word="${x.w}">${icon('volume', { size: 16 })} <span lang="en" dir="ltr">${x.w}</span></button>`)}
            <span class="grow"></span><button type="button" class="key enter" data-hear-next>${hear.i + 1 < hear.items.length ? tt('המילה הבאה', 'Next word') : tt('לתוצאה', 'See the result')}</button></div></div>`
        : !hear.played ? html`<p class="xsmall faint">${tt('הכפתורים נפתחים אחרי שמקשיבים למילה.', 'The answer buttons open once you have heard the word.')}</p>` : ''}</div>`);
  }

  function sayResult() {
    if (speak.status === 'error') return html`<p class="error-text" role="alert">${speak.err}</p>`;
    if (speak.status !== 'result') return '';
    const partner = partnerOf(speak.target);
    const info = wordInfo(speak.target);
    if (speak.kind === 'match') {
      return html`<div class="panel sunk stack-sm"><p class="row small"><span class="tag ok">${icon('check', { size: 14 })} ${tt('הובן', 'Understood')}</span></p>
        <p>${tt('זה נשמע כמו', 'This was heard as')} ${enq(speak.heard)}${tt(', בדיוק המילה שרציתם.', ', the word you meant.')}</p></div>`;
    }
    if (speak.kind === 'partner') {
      return html`<div class="panel sunk stack-sm"><p class="row small"><span class="tag warn">${tt('המילה השנייה בזוג', 'The other word in the pair')}</span></p>
        <p>${tt('זה נשמע כמו', 'This was heard as')} ${enq(speak.heard)}${tt(', כלומר', ', meaning')} <span lang="he" dir="rtl" class="entry-he">${wordInfo(partner)?.he || ''}</span>${tt(' ולא', ' rather than')} <span lang="he" dir="rtl" class="entry-he">${info?.he || ''}</span>.</p>
        <p class="small muted">${tt('הסתכלו שוב בטיפ למעלה ונסו שוב, לאט.', 'Look at the tip above and try again, slowly.')}</p></div>`;
    }
    return html`<div class="panel sunk stack-sm"><p class="row small"><span class="tag">${tt('נשמע אחרת', 'Heard differently')}</span></p>
      <p>${tt('זה נשמע כמו', 'This was heard as')} ${enq(speak.heard)}.</p>
      <p class="small muted">${tt('זיהוי דיבור מתקשה במילים בודדות. נסו שוב ברוגע, או אמרו את המילה בתוך צירוף קצר, למשל', 'Recognition finds single words hard. Try again calmly, or say the word in a short phrase, like')} ${enq(`a ${speak.target}`)}.</p></div>`;
  }

  function drawSay() {
    const listening = speak.status === 'listening';
    render($('#sp-say', el), html`
      <h3 id="sp-say-h">${tt('אמרו את זה', 'Say it')}</h3>
      <p class="small muted">${canListen() ? tt('בחרו מילה, לחצו על ״לומר״ ואמרו אותה פעם אחת. תראו איך היא נשמעה.', 'Choose a word, press Say and say it once. You will see how it was heard.') : tt('בחרו מילה, הקשיבו לה ואמרו אותה בקול.', 'Choose a word, listen to it and say it aloud.')}</p>
      ${!canListen() ? html`<p class="banner warn small">${icon('info', { size: 18 })}<span>${tt('זיהוי דיבור לא זמין בדפדפן הזה (הוא עובד ב-Chrome, Edge ו-Safari), ולכן אין כאן בדיקה של מה שנשמע. תרגיל ההאזנה עובד כרגיל.', 'Speech recognition is not available in this browser (it works in Chrome, Edge and Safari), so there is no check of what was heard here. The listening drill works as usual.')}</span></p>` : ''}
      <div class="seg" role="group" aria-labelledby="sp-say-h">${set.pairs.flat().map((x) => html`<button type="button" data-target="${x.w}" aria-pressed="${x.w === speak.target}" lang="en" dir="ltr">${x.w}</button>`)}</div>
      <div class="row">
        ${canSpeak() ? html`<button type="button" class="key" data-say-word="${speak.target}">${icon('volume', { size: 18 })} ${tt('לשמוע', 'Hear')} ${enq(speak.target)}</button>` : ''}
        ${canListen() ? html`<button type="button" class="key" data-rec aria-pressed="${listening}">${icon(listening ? 'stop' : 'speaking', { size: 18 })} ${listening ? tt('מקשיב… לחצו לעצירה', 'Listening… tap to stop') : html`${tt('לומר', 'Say')} ${enq(speak.target)}`}</button>` : ''}
      </div>
      <div aria-live="polite">${sayResult()}</div>`);
  }

  function shadowRow(item, attempts) {
    const done = attemptsOn(attempts, item).length > 0;
    return html`<li><a class="lesson-row three" href="${itemHref('speaking', item)}">
      ${mark(done ? 'completed' : '')}
      <span class="grow"><span style="display:block;font-weight:500"><span lang="en" dir="ltr">${item.ex.target}</span></span>
        <span class="meta" style="display:block"><span lang="en" dir="ltr">${item.lesson.title_en}</span></span></span>
      ${levelTag(item.lesson.level)}
    </a></li>`;
  }

  function drawShadow() {
    const m = model();
    render($('#sp-shadow-list', el), items.length
      ? html`<ol class="lesson-list" style="list-style:none;padding:0;margin:0">${items.map((x) => shadowRow(x, m.attempts))}</ol>`
      : emptyState({ title: tt('עוד אין משפטים לשאדואינג', 'No shadowing sentences yet'), body: tt('משפטים לחזרה בקול מגיעים עם השיעורים. בינתיים אפשר לתרגל את הצלילים למעלה.', 'Sentences to repeat aloud come with the lessons. Meanwhile, practise the sounds above.') }));
  }

  render(el, html`
    <div class="page-head"><div><h1>${t('nav.speaking')}</h1><p>${tt('צלילים שמשנים משמעות, חזרה בקול אחרי משפטים מהשיעורים, ומשוב על איך שנשמעתם. המטרה: שיבינו אתכם.', 'Sounds that change meaning, repeating sentences from your lessons, and feedback on how you were heard. The goal: being understood.')}</p></div></div>
    <div class="stack-lg">
      <section class="stack" aria-labelledby="sp-pairs">
        <div class="stack-sm"><h2 id="sp-pairs">${tt('צלילים שמשנים משמעות', 'Sounds that change meaning')}</h2>
          <p class="small muted">${tt('זוגות מילים שנשמעים כמעט אותו דבר לאוזן של דוברי עברית, אבל הם מילים שונות לגמרי.', 'Word pairs that sound almost the same to a Hebrew speaker\'s ear, but are completely different words.')}</p></div>
        <div class="seg sound-tabs" role="group" aria-label="${tt('צליל לתרגול', 'Sound to practise')}">${SOUND_SETS.map((s) => html`<button type="button" data-set="${s.id}" aria-pressed="${s.id === set.id}"><span lang="en" dir="ltr" class="tab-words">${s.words}</span><span lang="en" dir="ltr" class="tab-ipa">${s.label}</span></button>`)}</div>
        <div id="sp-set"></div>
        <div class="grid-2" style="align-items:start">
          <div class="panel stack" id="sp-hear"></div>
          <div class="panel stack" id="sp-say"></div>
        </div>
      </section>
      <section class="stack-sm" aria-labelledby="sp-shadow">
        <h2 id="sp-shadow">${tt('שאדואינג: חזרה אחרי משפטים', 'Shadowing')}</h2>
        <p class="small muted">${tt('שומעים משפט מהשיעורים ואומרים אותו מיד אחריו, באותו קצב ובאותה מנגינה.', 'Hear a sentence from your lessons and say it straight after, with the same rhythm and tune.')}</p>
        <div id="sp-shadow-list"></div>
      </section>
      <section class="panel flat stack-sm" aria-labelledby="sp-note">
        <h2 id="sp-note" class="row" style="font-size:var(--t-md)">${icon('info', { size: 18 })} ${tt('הערה כנה על זיהוי דיבור', 'An honest note about speech recognition')}</h2>
        <p class="small muted">${tt('זיהוי הדיבור בדפדפן אומן בעיקר על דוברים ילידיים, ולכן הוא עלול לטעות במבטא ישראלי גם כשאנשים היו מבינים אתכם בלי שום בעיה. המטרה כאן היא שיבינו אתכם, לא להישמע כמו דוברים ילידיים: מבטא הוא חלק ממי שאתם.', 'Browser speech recognition is trained mostly on native speakers, so it can misjudge an Israeli accent even when people would understand you without any trouble. The goal here is to be understood, not to sound native: an accent is part of who you are.')}</p>
        <p class="small muted">${tt('זיהוי הדיבור הוא שירות של הדפדפן, לא של Lucid. בחלק מהדפדפנים, למשל Chrome, הקול נשלח לשירות של יצרן הדפדפן כדי להפוך אותו לטקסט. Lucid מקבל רק את הטקסט ולא מקליט ולא שומר את הקול שלכם.', 'Speech recognition is a service of your browser, not of Lucid. In some browsers, such as Chrome, your voice is sent to the browser maker\'s service to turn it into text. Lucid gets only the text and never records or keeps your voice.')}</p>
      </section>
    </div>`);
  drawSet(); drawHear(); drawSay(); drawShadow();
  ctx.watch(['attempts'], drawShadow);

  function chooseSet(id) {
    set = SOUND_SETS.find((s) => s.id === id) || set;
    hear = newRound(set);
    if (speak.status === 'listening') listen.stop?.();
    speak = { target: set.pairs[0][1].w, status: 'idle' };
    el.querySelectorAll('[data-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.set === set.id)));
    stopSpeaking();
    drawSet(); drawHear(); drawSay();
  }

  function playCurrent(slow = false) {
    const it = hear.items[hear.i];
    say(set.pairs[it.pi][it.wi].w, { slow, variant });
  }

  async function record() {
    if (speak.status === 'listening') { listen.stop?.(); return; }
    stopSpeaking();
    const target = speak.target;
    const partner = partnerOf(target);
    if (!(await micNotice())) {
      speak = { target, status: 'error', err: `${speechErrorText({ code: 'declined' })} ${tt('אפשר עדיין להקשיב ולומר את המילים בקול.', 'You can still listen and say the words aloud.')}` };
      drawSay(); refocus('[data-rec]');
      return;
    }
    if (!alive || speak.target !== target) return;
    speak = { target, status: 'listening' };
    drawSay(); refocus('[data-rec]');
    let next;
    try {
      const r = await listen({ variant });
      next = { target, status: 'result', ...judge(r, target, partner) };
      if (!loggedSay) { loggedSay = true; logEvent({ type: 'speaking', drill: 'say-it', sound: set.id }); }
    } catch (err) {
      next = { target, status: 'error', err: speechErrorText(err) };
    }
    if (!alive || speak.target !== target) return;
    speak = next;
    drawSay(); refocus('[data-rec]');
  }

  const offs = [
    on(el, 'click', '[data-set]', (e, b) => chooseSet(b.dataset.set)),
    on(el, 'click', '[data-say-word]', (e, b) => say(b.dataset.sayWord, { variant })),
    on(el, 'click', '[data-hear-play]', () => { const first = !hear.played; hear.played = true; playCurrent(); if (first) { drawHear(); refocus('[data-hear-play]'); } }),
    on(el, 'click', '[data-hear-slow]', () => playCurrent(true)),
    on(el, 'click', '[data-hear-pick]', (e, b) => {
      if (b.disabled || hear.picked != null) return;
      const it = hear.items[hear.i];
      hear.picked = Number(b.dataset.hearPick);
      if (hear.picked === it.wi) hear.right++;
      drawHear(); refocus('[data-hear-next]');
    }),
    on(el, 'click', '[data-hear-next]', () => {
      hear.i++; hear.picked = null; hear.played = false;
      if (hear.i >= hear.items.length) {
        hear.done = true;
        logEvent({ type: 'speaking', drill: 'minimal-pairs', sound: set.id, right: hear.right, count: hear.items.length });
      }
      drawHear(); refocus(hear.done ? '[data-hear-again]' : '[data-hear-play]');
    }),
    on(el, 'click', '[data-hear-again]', () => { hear = newRound(set); drawHear(); refocus('[data-hear-play]'); }),
    on(el, 'click', '[data-target]', (e, b) => {
      if (speak.status === 'listening') listen.stop?.();
      speak = { target: b.dataset.target, status: 'idle' };
      drawSay(); refocus(`[data-target="${b.dataset.target}"]`);
    }),
    on(el, 'click', '[data-rec]', () => record()),
    hebrewReveal(el),
  ];
  return () => { alive = false; offs.forEach((o) => o()); listen.stop?.(); stopSpeaking(); };
}
