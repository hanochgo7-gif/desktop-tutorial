// Speaking lab: (a) English sounds that change meaning and that Hebrew speakers often merge, with a
// listening drill ("Which did you hear?") and a recognition check ("Say it"); (b) shadowing sentences
// from the lessons in the focused player; (c) an honest note on what speech recognition can and
// cannot judge. Nothing here is an accent score: feedback is about being understood.
import { html, render, on, $, shuffle } from '../core/util.js';
import { tt, t, bi, hebrewSupport, legend, isolateLatin, uiLang } from '../core/i18n.js';
import { taxonomyIndex } from '../core/content.js';
import { icon, mark, levelTag, emptyState, LEVEL_LABEL } from '../ui/components.js';
import { model, settings, logEvent } from '../core/learner.js';
import { say, canSpeak, canListen, listen, stopSpeaking, micNotice, speechErrorText } from '../core/speech.js';
import * as speechMod from '../core/speech.js';
import { normalize } from '../core/grading.js';
import { gatherExercises, attemptsOn, itemHref, findItem, runPlayer, missingPlayer, hebrewReveal, groupByLevel, recommendedLevel, nextSuggestion } from '../ui/center.js';
import { levelIndex } from '../core/adaptive.js';

const W = (w, ipa, he) => ({ w, ipa, he });
// Isolates a left-to-right run (IPA, English) inside Hebrew text so the bidi algorithm keeps it intact.
const L = (s) => `\u2066${s}\u2069`;
// Minimal pairs for contrasts Hebrew does not make (one i-sound, no /æ/ or /ʌ/, no th, w often heard as v).
// `words` names each set by example words, so the tabs make sense without knowing IPA (P-23).
export const SOUND_SETS = [
  {
    id: 'ih-ee', label: '/ɪ/ – /iː/', words: 'ship / sheep',
    pairs: [[W('ship', '/ʃɪp/', 'ספינה'), W('sheep', '/ʃiːp/', 'כבשה')], [W('live', '/lɪv/', 'לגור, לחיות'), W('leave', '/liːv/', 'לעזוב')], [W('fill', '/fɪl/', 'למלא'), W('feel', '/fiːl/', 'להרגיש')], [W('bit', '/bɪt/', 'קצת, חתיכה'), W('beat', '/biːt/', 'לנצח, להכות')]],
    tip: { en: 'For /iː/ (sheep) spread your lips as if smiling and hold the sound a little longer; for /ɪ/ (ship) relax your lips and keep it short, slightly towards "e".', he: `מותחים את השפתיים כמו בחיוך ומאריכים מעט את הצליל: ${L('sheep /iː/')}. השפתיים רפויות והצליל קצר, קצת לכיוון ״אֶ״: ${L('ship /ɪ/')}.` },
  },
  {
    id: 'ae-uh-e', label: '/æ/ – /ʌ/ – /e/', words: 'cat / cut / bed',
    pairs: [[W('cat', '/kæt/', 'חתול'), W('cut', '/kʌt/', 'לחתוך')], [W('bad', '/bæd/', 'רע'), W('bed', '/bed/', 'מיטה')], [W('hat', '/hæt/', 'כובע'), W('hut', '/hʌt/', 'בקתה')]],
    tip: { en: '/æ/ (cat): drop your jaw and spread your lips, between Hebrew "a" and "e". /ʌ/ (cut): a short, relaxed "a" from the middle of the mouth. /e/ (bed): close to Hebrew "e".', he: `מורידים את הלסת ומותחים את השפתיים, צליל שבין ״אַ״ ל״אֶ״: ${L('cat /æ/')}. ״אַ״ קצרה ורפויה מאמצע הפה: ${L('cut /ʌ/')}. קרוב ל״אֶ״ בעברית: ${L('bed /e/')}.` },
  },
  {
    id: 'th-s-t', label: '/θ/ – /s/ – /t/', words: 'think / sink / tank',
    pairs: [[W('think', '/θɪŋk/', 'לחשוב'), W('sink', '/sɪŋk/', 'כיור')], [W('three', '/θriː/', 'שלוש'), W('tree', '/triː/', 'עץ')], [W('thank', '/θæŋk/', 'להודות'), W('tank', '/tæŋk/', 'מכל, טנק')]],
    tip: { en: 'Put the tip of your tongue lightly between your front teeth and blow out gently, with no voice. If the tongue stays behind the teeth, you get /s/ or /t/.', he: `מניחים את קצה הלשון בעדינות בין השיניים הקדמיות ונושפים, בלי קול: ${L('think /θ/')}. אם הלשון נשארת מאחורי השיניים, יוצא ${L('sink /s/')} או ${L('tank /t/')}.` },
  },
  {
    id: 'dh-d', label: '/ð/ – /d/', words: 'they / day',
    pairs: [[W('they', '/ðeɪ/', 'הם, הן'), W('day', '/deɪ/', 'יום')], [W('then', '/ðen/', 'אז'), W('den', '/den/', 'מאורה')]],
    tip: { en: 'Same tongue position as /θ/, between the teeth, but with your voice on: you should feel a buzz. Pressing the tongue behind the teeth gives /d/.', he: `הלשון בין השיניים, כמו ב-${L('think')}, אבל עם קול: מרגישים זמזום, ${L('they /ð/')}. כשהלשון נלחצת מאחורי השיניים, יוצא ${L('day /d/')}.` },
  },
  {
    id: 'w-v', label: '/w/ – /v/', words: 'wine / vine',
    pairs: [[W('wine', '/waɪn/', 'יין'), W('vine', '/vaɪn/', 'גפן')], [W('west', '/west/', 'מערב'), W('vest', '/vest/', 'אפוד')], [W('wet', '/wet/', 'רטוב'), W('vet', '/vet/', 'וטרינר')]],
    tip: { en: 'For /w/ round your lips as for a short "oo" and keep your teeth off them; for /v/ your top teeth rest lightly on your bottom lip.', he: `מעגלים את השפתיים כמו ל״אוּ״ קצרה, בלי שהשיניים ייגעו בהן: ${L('wine /w/')}. השיניים העליונות נוגעות קלות בשפה התחתונה: ${L('vine /v/')}.` },
  },
  {
    id: 'u-uu', label: '/ʊ/ – /uː/', words: 'full / fool',
    pairs: [[W('full', '/fʊl/', 'מלא'), W('fool', '/fuːl/', 'טיפש')], [W('pull', '/pʊl/', 'למשוך'), W('pool', '/puːl/', 'בריכה')]],
    tip: { en: '/uː/ (fool): round your lips tightly and hold the sound longer. /ʊ/ (full): looser lips, a short and relaxed sound.', he: `מעגלים את השפתיים חזק ומאריכים את הצליל: ${L('fool /uː/')}. שפתיים רפויות יותר, צליל קצר ורגוע: ${L('full /ʊ/')}.` },
  },
];
const ROUND = 8;
// UX r4 PG-14: at Pre-A1 and A1 the phonetic symbols are behind "להצגת IPA" (kept for the session). Without them a
// tip names each sound by its example word: "/iː/ (sheep)" and "sheep /iː/" read "sheep", and a sound on its own
// ("you get /s/") reads its word from the set's tab ("you get “sink”").
const IPA_KEY = 'lucid-speaking-ipa';
export function withoutIpa(text, set) {
  let out = String(text || '');
  // The set's own sounds first, then any other set's (the /ð/ tip names /θ/, the think sound).
  for (const x of [set, ...SOUND_SETS.filter((y) => y !== set)]) {
    const words = x.words.split(' / ');
    x.label.split(' – ').forEach((sound, i) => {
      const w = words[i];
      out = out.split(`${sound} (${w})`).join(w).split(`${w} ${sound}`).join(w).split(sound).join(`“${w}”`);
    });
  }
  return out;
}
const tokens = (s) => normalize(s).replace(/[^a-z'\s]/g, ' ').split(/\s+/).filter(Boolean);
const enq = (w) => html`<span lang="en" dir="ltr">“${w}”</span>`;

function newRound(set) {
  const all = set.pairs.flatMap((p, pi) => p.map((_, wi) => ({ pi, wi })));
  let pool = [];
  while (pool.length < ROUND) pool = pool.concat(shuffle(all, Math.random()));
  return { items: pool.slice(0, ROUND), i: 0, right: 0, played: false, picked: null, done: false };
}

// Whether the device has an English voice (PH-8). speech.js may offer hasEnglishVoice() (the shell lane adds it);
// otherwise the voice list is read here, once it has loaded.
async function englishVoice() {
  if (typeof speechMod.hasEnglishVoice === 'function') return Boolean(await speechMod.hasEnglishVoice());
  const synth = globalThis.speechSynthesis;
  if (!synth) return false;
  let list = synth.getVoices();
  if (!list.length) {
    list = await new Promise((resolve) => {
      const t = setTimeout(() => resolve(synth.getVoices()), 1500);
      synth.addEventListener?.('voiceschanged', () => { clearTimeout(t); resolve(synth.getVoices()); }, { once: true });
    });
  }
  return list.some((v) => /^en\b/i.test(String(v.lang || '').replace('_', '-')));
}

// Plays a word and resolves true once speech has actually started: the shell's 'lucid:speech' start event when
// speech.js sends one, or the browser reporting that it is speaking. False when it failed or stayed silent.
function playAndConfirm(word, opts) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      document.removeEventListener('lucid:speech', onSpeech);
      clearInterval(poll); clearTimeout(timer);
      resolve(ok);
    };
    const onSpeech = (e) => { const st = e.detail?.state; if (st === 'start') finish(true); else if (st === 'error' || st === 'silent') finish(false); };
    document.addEventListener('lucid:speech', onSpeech);
    const poll = setInterval(() => { if (globalThis.speechSynthesis?.speaking) finish(true); }, 80);
    const timer = setTimeout(() => finish(false), 2000);
    say(word, opts).then((ok) => finish(Boolean(ok)), () => finish(false));
  });
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
  const backLabel = tt('למעבדת הדיבור', 'Back to the Speaking lab');

  if (ctx.query.l && ctx.query.e) {
    const item = findItem(items, ctx.query);
    if (!item) {
      return missingPlayer(el, { back: 'speaking', backLabel, title: tt('המשפט לא נמצא', 'Sentence not found'), body: tt('המשפט הזה לא זמין במכשיר. אולי השיעור שלו עוד לא נטען; נסו לרענן או לבחור משפט אחר.', 'This sentence is not available on this device. Its lesson may not have loaded yet; try reloading or choose another sentence.'), cta: tt('למעבדת הדיבור', 'To the Speaking lab') });
    }
    return runPlayer(el, ctx, { item, back: 'speaking', backLabel, source: 'speaking', skill: 'speaking', errors: ix.error, event: 'speaking' });
  }

  const variant = settings().english_variant;
  const beginner = levelIndex(model().courseLevel) <= levelIndex('A1');
  const ipaKept = () => { try { return sessionStorage.getItem(IPA_KEY) === '1'; } catch { return false; } };
  let showIpa = !beginner || ipaKept();
  let set = SOUND_SETS.find((s) => s.id === ctx.query.sound) || SOUND_SETS[0];
  let hear = newRound(set);
  let speak = { target: set.pairs[0][1].w, status: 'idle' };
  let loggedSay = false;
  let alive = true;
  let voiceOk = null; // null while checking; false: no English voice on this device (PH-8)
  const wordInfo = (w) => set.pairs.flat().find((x) => x.w === w);
  const partnerOf = (w) => { const p = set.pairs.find((x) => x.some((y) => y.w === w)); return p ? p.find((y) => y.w !== w).w : ''; };
  const refocus = (sel) => $(sel, el)?.focus();

  function drawSet() {
    const tip = showIpa ? set.tip : { en: withoutIpa(set.tip.en, set), he: withoutIpa(set.tip.he, set) };
    render($('#sp-set', el), html`<div class="stack">
      <div class="block-tip row" style="align-items:flex-start;flex-wrap:nowrap">${icon('hint', { size: 18 })}<div class="grow">${bi(tip, { always: hebrewSupport() !== 'off' })}</div></div>
      ${beginner ? html`<div><button type="button" class="key ghost small" data-ipa aria-pressed="${showIpa ? 'true' : 'false'}">${showIpa ? tt('להסתרת IPA', 'Hide IPA') : tt('להצגת IPA', 'Show IPA')}</button></div>` : ''}
      <div class="table-wrap"><table class="data">
        <caption class="sr-only">${tt('זוגות מילים', 'Word pairs')} <span lang="en" dir="ltr">${showIpa ? set.label : set.words}</span></caption>
        <tbody>${set.pairs.map((p) => html`<tr>${p.map((x) => html`<td><div class="row" style="gap:var(--s2)">
          ${canSpeak() ? html`<button type="button" class="key ghost small icon-only" data-say-word="${x.w}" aria-label="${tt('השמעה', 'Play')}: ${x.w}">${icon('volume', { size: 18 })}</button>` : ''}
          <span lang="en" dir="ltr" style="font-weight:600">${x.w}</span><span class="entry-ipa" lang="en" dir="ltr">${x.ipa}</span><span class="entry-he small" lang="he" dir="rtl">${isolateLatin(x.he)}</span>
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
    // No English voice on this device (PH-8): the words would play silently or in another language, so the answers
    // stay closed and nothing is recorded.
    const noVoice = voiceOk === false;
    const voiceBanner = noVoice ? html`<p class="banner warn small" data-no-voice>${icon('alert', { size: 18 })}<span>${isolateLatin(tt('בדפדפן הזה אין קול באנגלית, ולכן המילים לא יושמעו. כפתורי התשובה נשארים סגורים ושום תוצאה לא נשמרת. אפשר להוסיף קול אנגלי בהגדרות השפה של המכשיר, או לנסות ב-Chrome, Edge או Safari.', 'This browser has no English voice, so the words cannot play. The answer buttons stay closed and nothing is recorded. You can add an English voice in your device\'s language settings, or try Chrome, Edge or Safari.'))}</span></p>` : '';
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
    render(box, html`${head}${voiceBanner}
      <p class="small muted">${tt('לחצו על השמעה ובחרו את המילה ששמעתם.', 'Press play, then choose the word you heard.')}</p>
      ${noVoice ? '' : html`<div class="row">
        <button type="button" class="key ${hear.played ? '' : 'enter'}" data-hear-play ${hear.starting ? html`aria-busy="true"` : ''}>${icon('volume', { size: 18 })} ${hear.played ? tt('להשמיע שוב', 'Play again') : tt('השמעת המילה', 'Play the word')}</button>
        ${hear.played ? html`<button type="button" class="key ghost small" data-hear-slow>${icon('turtle', { size: 18 })} ${tt('לאט', 'Slowly')}</button>` : ''}
      </div>`}
      ${hear.silent && !hear.played ? html`<p class="small error-text" role="status" data-hear-silent>${tt('המילה לא הושמעה. בדקו את עוצמת הקול ומצב שקט, ונסו שוב.', 'The word did not play. Check the volume and silent mode, then try again.')}</p>` : ''}
      <div class="match-grid" role="group" aria-labelledby="sp-hear-h">${pair.map((x, k) => html`<button type="button" class="option ${answered ? (k === it.wi ? 'is-right' : k === hear.picked ? 'is-wrong' : '') : ''}" data-hear-pick="${k}" ${noVoice || !hear.played || answered ? html`disabled` : ''} style="justify-content:center">
        <span lang="en" dir="ltr" style="font-weight:600;font-size:var(--t-lg)">${x.w}</span></button>`)}</div>
      <div aria-live="polite">${answered
        ? html`<div class="stack-sm"><p class="row small"><span class="tag ${hear.picked === it.wi ? 'ok' : 'bad'}">${icon(hear.picked === it.wi ? 'check' : 'x', { size: 14 })} ${hear.picked === it.wi ? tt('נכון', 'Correct') : tt('לא בדיוק', 'Not quite')}</span>
            <span>${tt('המילה הייתה', 'The word was')} ${enq(said.w)} <span class="entry-ipa" lang="en" dir="ltr">${said.ipa}</span> <span lang="he" dir="rtl" class="entry-he">${said.he}</span>${hear.picked === it.wi ? '' : html`, ${tt('ולא', 'not')} ${enq(other.w)} <span lang="he" dir="rtl" class="entry-he">${other.he}</span>`}.</span></p>
          <div class="row"><span class="xsmall faint">${tt('להשוות:', 'Compare:')}</span>${pair.map((x) => html`<button type="button" class="key ghost small" data-say-word="${x.w}">${icon('volume', { size: 16 })} <span lang="en" dir="ltr">${x.w}</span></button>`)}
            <span class="grow"></span><button type="button" class="key enter" data-hear-next>${hear.i + 1 < hear.items.length ? tt('המילה הבאה', 'Next word') : tt('לתוצאה', 'See the result')}</button></div></div>`
        : !hear.played && !noVoice ? html`<p class="xsmall faint">${tt('הכפתורים נפתחים אחרי שמקשיבים למילה.', 'The answer buttons open once you have heard the word.')}</p>` : ''}</div>`);
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
      <div class="seg" role="group" aria-labelledby="sp-say-h">${set.pairs.flat().map((x) => html`<button type="button" data-target="${x.w}" aria-pressed="${String(x.w === speak.target)}" lang="en" dir="ltr">${x.w}</button>`)}</div>
      <div class="row">
        ${canSpeak() ? html`<button type="button" class="key" data-say-word="${speak.target}">${icon('volume', { size: 18 })} ${tt('לשמוע', 'Hear')} ${enq(speak.target)}</button>` : ''}
        ${canListen() ? html`<button type="button" class="key" data-rec aria-pressed="${String(listening)}">${icon(listening ? 'stop' : 'speaking', { size: 18 })} ${listening ? tt('מקשיב… לחצו לעצירה', 'Listening… tap to stop') : html`${tt('לומר', 'Say')} ${enq(speak.target)}`}</button>` : ''}
      </div>
      <div aria-live="polite">${sayResult()}</div>`);
  }

  function shadowRow(item, attempts) {
    const done = attemptsOn(attempts, item).length > 0;
    return html`<li><a class="lesson-row three" href="${itemHref('speaking', item)}">
      ${mark(done ? 'completed' : '')}
      <span class="grow"><span class="shadow-sentence" lang="en" dir="ltr">${item.ex.target}</span>
        <span class="meta" style="display:block">${uiLang() === 'he' && item.lesson.title_he ? isolateLatin(item.lesson.title_he) : html`<span lang="en" dir="ltr">${item.lesson.title_en}</span>`}</span></span>
      ${levelTag(item.lesson.level)}
    </a></li>`;
  }

  // Shadowing sentences grouped by level, as in the Reading and Listening centres (R2-05): the learner's level
  // (or the nearest level below with sentences) is open, the others are folded, and one button picks the next
  // sentence not practised yet at or below the level.
  function drawShadow() {
    const m = model();
    if (!items.length) {
      render($('#sp-shadow-list', el), emptyState({ title: tt('עוד אין משפטים לומר אחרי הדובר', 'No shadowing sentences yet'), body: tt('משפטים לומר בקול אחרי הדובר מגיעים עם השיעורים. בינתיים אפשר לתרגל את הצלילים למעלה.', 'Sentences to repeat aloud come with the lessons. Meanwhile, practise the sounds above.') }));
      return;
    }
    const groups = groupByLevel(items);
    const rec = recommendedLevel(groups, m.courseLevel);
    const next = nextSuggestion(items, m.attempts, m.courseLevel, m.progress);
    const ci = levelIndex(m.courseLevel);
    const open = new Set([...el.querySelectorAll('#sp-shadow-list details[open]')].map((d) => d.dataset.level));
    const isOpen = (lv) => (open.size ? open.has(lv) : lv === rec);
    render($('#sp-shadow-list', el), html`
      ${next ? html`<div class="row shadow-next"><a class="key enter" href="${itemHref('speaking', next)}" data-next-shadow>${icon('play', { size: 18 })} ${tt('המשפט הבא בשבילך', 'Next sentence for you')}</a><span class="small muted" lang="en" dir="ltr">${next.ex.target}</span></div>` : ''}
      ${groups.map((g) => {
        const doneN = g.items.filter((x) => attemptsOn(m.attempts, x).length).length;
        const meta = ix.level.get(g.level);
        return html`<details class="level-fold" data-level="${g.level}" ${isOpen(g.level) ? 'open' : ''}>
          <summary><span class="level-fold-title">${LEVEL_LABEL[g.level]}${meta ? html` · ${legend(meta.name_en, meta.name_he)}` : ''}</span>
            <span class="level-fold-meta small faint">${g.level === rec ? html`<span class="tag cobalt">${tt('מומלץ לרמה שלכם', 'Recommended for your level')}</span> ` : levelIndex(g.level) > ci ? html`<span>${tt('מעל הרמה הנוכחית', 'Above your level')} · </span>` : ''}<span class="num">${tt(`${doneN} מתוך ${g.items.length}`, `${doneN} of ${g.items.length}`)}</span></span></summary>
          <ol class="lesson-list" style="list-style:none;padding:0;margin:0">${g.items.map((x) => shadowRow(x, m.attempts))}</ol>
        </details>`;
      })}`);
  }

  render(el, html`
    <div class="page-head"><div><h1>${t('nav.speaking')}</h1><p>${tt('צלילים שמשנים משמעות, משפטים מהשיעורים שאומרים בקול אחרי הדובר, ומשוב על איך שנשמעתם. המטרה: שיבינו אתכם.', 'Sounds that change meaning, repeating sentences from your lessons, and feedback on how you were heard. The goal: being understood.')}</p></div></div>
    <div class="stack-lg${showIpa ? '' : ' sp-ipa-off'}" id="sp-root">
      <section class="stack" aria-labelledby="sp-pairs">
        <div class="stack-sm"><h2 id="sp-pairs">${tt('צלילים שמשנים משמעות', 'Sounds that change meaning')}</h2>
          <p class="small muted">${tt('זוגות מילים שנשמעים כמעט אותו דבר לאוזן של דוברי עברית, אבל הם מילים שונות לגמרי.', 'Word pairs that sound almost the same to a Hebrew speaker\'s ear, but are completely different words.')}</p></div>
        <div class="seg sound-tabs" role="group" aria-label="${tt('צליל לתרגול', 'Sound to practise')}">${SOUND_SETS.map((s) => html`<button type="button" data-set="${s.id}" aria-pressed="${String(s.id === set.id)}"><span lang="en" dir="ltr" class="tab-words">${s.words}</span><span lang="en" dir="ltr" class="tab-ipa">${s.label}</span></button>`)}</div>
        <div id="sp-set"></div>
        <div class="grid-2" style="align-items:start">
          <div class="panel stack" id="sp-hear"></div>
          <div class="panel stack" id="sp-say"></div>
        </div>
      </section>
      <section class="stack-sm" aria-labelledby="sp-shadow">
        <h2 id="sp-shadow">${isolateLatin(tt('חוזרים אחרי הדובר (shadowing)', 'Shadowing: repeat after the speaker'))}</h2>
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
  if (canSpeak()) englishVoice().then((ok) => { voiceOk = ok; if (alive && !ok) drawHear(); }).catch(() => {});
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
    on(el, 'click', '[data-ipa]', () => {
      showIpa = !showIpa;
      try { sessionStorage.setItem(IPA_KEY, showIpa ? '1' : '0'); } catch { /* storage blocked */ }
      $('#sp-root', el)?.classList.toggle('sp-ipa-off', !showIpa);
      drawSet(); drawHear();
      refocus('[data-ipa]');
    }),
    on(el, 'click', '[data-set]', (e, b) => chooseSet(b.dataset.set)),
    on(el, 'click', '[data-say-word]', (e, b) => say(b.dataset.sayWord, { variant })),
    // The answers open only once the word has really started playing (PH-8), never on the press alone.
    on(el, 'click', '[data-hear-play]', async () => {
      if (hear.starting || voiceOk === false) return;
      const round = hear; const at = hear.i;
      const it = hear.items[hear.i];
      hear.starting = true; hear.silent = false;
      const ok = await playAndConfirm(set.pairs[it.pi][it.wi].w, { variant });
      if (!alive || hear !== round || hear.i !== at) return;
      hear.starting = false;
      if (ok && hear.played) return;
      if (ok) hear.played = true; else hear.silent = true;
      drawHear(); refocus('[data-hear-play]');
    }),
    on(el, 'click', '[data-hear-slow]', () => playCurrent(true)),
    on(el, 'click', '[data-hear-pick]', (e, b) => {
      if (b.disabled || hear.picked != null) return;
      const it = hear.items[hear.i];
      hear.picked = Number(b.dataset.hearPick);
      if (hear.picked === it.wi) hear.right++;
      drawHear(); refocus('[data-hear-next]');
    }),
    on(el, 'click', '[data-hear-next]', () => {
      hear.i++; hear.picked = null; hear.played = false; hear.silent = false;
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
