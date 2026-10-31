// Deterministic writing checks that work without AI. They are signals, not a grade: patterns can
// miss errors and occasionally flag correct English, so the UI labels them "automatic checks".
// Rules that often flag correct academic prose (comma splices, if + will) are not run at C1-C2, a/an is
// decided by sound, and a title line or a closing reference list is not treated as essay text.
import { countWords } from './grading.js';

const FORMAL_LEVELS = new Set(['B2', 'C1', 'C2']);

// Common learner errors. Each: pattern, error type, short title and why (EN/HE), and a suggestion.
const PATTERNS = [
  { re: /(^|[.!?]\s+|\s)i(?=\s|'m|'ve|'ll|'d)/g, type: 'capitalization', title: 'Capital I', he_title: 'I גדולה', en: 'The pronoun I is always a capital letter.', he: 'הכינוי I נכתב תמיד באות גדולה.', fix: (m) => m.replace(/i$/, 'I') },
  { re: /\b(I|we|they|you)\s+(am|are|'m|'re)\s+agree\b/gi, type: 'word-choice', title: 'agree is a verb', he_title: 'agree הוא פועל', en: 'Say "I agree", not "I am agree".', he: 'אומרים I agree, בלי am.' },
  { re: /\b(informations|advices|furnitures|equipments|homeworks|knowledges|evidences|feedbacks|luggages|baggages)\b/gi, type: 'countability', title: 'Uncountable noun', he_title: 'שם עצם לא ספיר', en: 'This noun is uncountable in English: no -s.', he: 'שם העצם הזה לא ספיר באנגלית, ולכן אין לו s.' },
  { re: /\bmore\s+(better|worse|bigger|smaller|easier|harder|faster|cheaper|older|younger|happier|larger|higher|lower)\b/gi, type: 'comparison-form', title: 'Double comparative', he_title: 'יתרון כפול', en: 'Use either more or -er, not both.', he: 'משתמשים או ב-more או בסיומת -er, לא בשניהם.' },
  { re: /\bdepends?\s+(in|of|from)\b/gi, type: 'preposition', title: 'depend on', he_title: 'depend on', en: 'The preposition is on: depends on.', he: 'אחרי depend באה on.' },
  { re: /\bdiscuss(es|ed|ing)?\s+about\b/gi, type: 'preposition', title: 'discuss (no about)', he_title: 'discuss בלי about', en: 'discuss takes a direct object: discuss the problem.', he: 'אחרי discuss לא באה about.' },
  { re: /\bexplain(s|ed)?\s+(me|him|her|us|them)\b/gi, type: 'word-order', title: 'explain to someone', he_title: 'explain to', en: 'Say "explain it to me", not "explain me".', he: 'אומרים explain to me.' },
  { re: /\b(I|he|she|we|they)\s+(have|has)\s+\d+\s+years\b/gi, type: 'false-friend', title: 'Age with be', he_title: 'גיל עם be', en: 'Age uses be: I am 20 (years old).', he: 'גיל מבטאים עם be: I am 20.' },
  { re: /\bthe\s+people\s+is\b/gi, type: 'agreement', title: 'people is plural', he_title: 'people ברבים', en: 'people is plural: the people are.', he: 'people היא מילה ברבים: the people are.' },
  { re: /\bin the other hand\b/gi, type: 'word-choice', title: 'on the other hand', he_title: 'on the other hand', en: 'The expression is "on the other hand".', he: 'הביטוי הוא on the other hand.' },
  { re: /\bon my opinion\b/gi, type: 'preposition', title: 'in my opinion', he_title: 'in my opinion', en: 'The expression is "in my opinion".', he: 'הביטוי הוא in my opinion.' },
  { re: /\bvery much\s+(people|things|cars|time|money|places)\b/gi, type: 'word-choice', title: 'many / a lot of', he_title: 'many / a lot of', en: 'Use many or a lot of before a noun.', he: 'לפני שם עצם משתמשים ב-many או a lot of.' },
  { re: /\bmake(s|ing)?\s+(my |the |our |your )?homework\b/gi, type: 'word-choice', title: 'do homework', he_title: 'do homework', en: 'The collocation is "do homework".', he: 'הצירוף הוא do homework.' },
  { re: /\b(open|close)(s|d|ed)?\s+the\s+(light|lights|tv|television|computer)\b/gi, type: 'false-friend', title: 'turn on / turn off', he_title: 'turn on / off', en: 'Lights and devices are turned on or off.', he: 'אור ומכשירים מדליקים ומכבים עם turn on / turn off.' },
  { re: /\bdid(n't| not)\s+(went|saw|ate|took|came|made|got|gave|bought|wrote|said|told|thought|found|knew|left|felt|had|was|were)\b/gi, type: 'verb-form', title: 'did + base verb', he_title: 'did + צורת בסיס', en: 'After did / didn\'t use the base verb: didn\'t go.', he: 'אחרי did באה צורת הבסיס של הפועל: didn\'t go.' },
  { re: /\b(can|must|should|could|might|may|will|would)\s+to\s+\w+/gi, type: 'modal-use', title: 'modal + base verb', he_title: 'מודאלי + פועל בסיס', en: 'No "to" after can, must, should: you should go.', he: 'אחרי can, must, should לא באה to.' },
  { re: /\bif\s+(\w+\s+){1,3}will\s+\w+/gi, type: 'conditional-form', notAfter: /\b(unclear|clear|whether|wonder\w*|know\w*|knew|ask\w*|see|sure|doubt\w*|uncertain|certain|question|decide\w*|check\w*|tell|find out|predict\w*)\s+$/i, lowPrecision: true, title: 'No will after if', he_title: 'בלי will אחרי if', en: 'In real conditions use the present after if: If it rains, we will stay.', he: 'אחרי if משתמשים בהווה: If it rains.' },
  // a or an is decided by sound, not spelling (an MBA, a unanimous vote); see articleFor below.
  { re: /\b(a|an)\s+([A-Za-z][\w'-]*)/gi, type: 'article', article: true },
  { re: /,\s+(I|he|she|it|we|they|this|that|there)\s+(am|is|are|was|were|have|has|had|will|can|do|does|did|think|believe|want|need)\b/g, type: 'punctuation', leadInOk: true, lowPrecision: true, title: 'Possible run-on sentence', he_title: 'ייתכן משפט רץ', en: 'Two full sentences joined by a comma: use a full stop, or a connector like and / because.', he: 'שני משפטים שלמים מחוברים בפסיק: כדאי נקודה, או מילת קישור כמו and / because.' },
  { re: /\s+[,.!?;:](?=\s|$)/g, type: 'punctuation', title: 'Space before punctuation', he_title: 'רווח לפני סימן פיסוק', en: 'No space before a punctuation mark.', he: 'באנגלית אין רווח לפני סימן פיסוק.' },
];

const FORMAL_PATTERNS = [
  { re: /\b(don't|doesn't|didn't|can't|won't|isn't|aren't|wasn't|weren't|it's|I'm|we're|they're|you're|I've|we've|I'd|that's|there's|let's|wouldn't|shouldn't|couldn't)\b/gi, type: 'register', title: 'Contraction in formal writing', he_title: 'קיצור בכתיבה רשמית', en: 'In formal essays write the full form: do not, it is.', he: 'בחיבור רשמי כותבים את הצורה המלאה: do not, it is.' },
  { re: /\b(gonna|wanna|gotta|kinda|sorta|stuff|guys|kids|awesome|cool|okay|ok|lots of|a lot of|really|totally|pretty much|nowadays)\b/gi, type: 'register', title: 'Informal word', he_title: 'מילה לא רשמית', en: 'Too informal for an academic text: choose a more precise, formal word.', he: 'לא רשמי מדי לטקסט אקדמי: בחרו מילה מדויקת ורשמית יותר.' },
  { re: /\b(I think|I feel|in my opinion)\b/gi, type: 'register', title: 'Personal hedge', he_title: 'ניסוח אישי', en: 'Acceptable, but academic arguments usually state the claim and support it: "This essay argues that…".', he: 'מותר, אבל בטיעון אקדמי מציגים את הטענה ותומכים בה.' },
];

const CONNECTORS = {
  addition: ['and', 'also', 'moreover', 'furthermore', 'in addition', 'besides', 'what is more'],
  contrast: ['but', 'however', 'although', 'though', 'whereas', 'while', 'on the other hand', 'nevertheless', 'nonetheless', 'yet', 'despite', 'in spite of', 'conversely'],
  cause: ['because', 'since', 'as a result of', 'due to', 'owing to'],
  result: ['so', 'therefore', 'thus', 'consequently', 'as a result', 'hence'],
  example: ['for example', 'for instance', 'such as', 'in particular', 'to illustrate'],
  sequence: ['first', 'firstly', 'second', 'secondly', 'then', 'next', 'after that', 'finally', 'lastly'],
  conclusion: ['in conclusion', 'to conclude', 'to sum up', 'overall', 'in summary', 'all in all'],
};

const SIGNALS = {
  thesis: /\b(I (strongly )?(believe|argue|maintain|contend) that|in my (view|opinion)|this (essay|paper) (will )?(argue|argues|contend|contends|maintain|maintains|demonstrate|demonstrates|show|shows)|I would argue|the (central|main) (argument|claim) (of this|here) is)\b/i,
  counter: /\b(some (people )?(argue|claim|believe|say|maintain)|opponents|critics|supporters of|it (could|might|may) be argued|admittedly|one (could|might) object|proponents|others (argue|believe|claim))\b/i,
  rebuttal: /\b(however|nevertheless|nonetheless|yet this|this (view|argument|claim) (overlooks|ignores|fails|neglects)|while this (may|might) be true|but this|on closer (inspection|examination))\b/i,
  evidence: /\b(for (example|instance)|such as|according to|research|stud(y|ies)|survey|data|statistics|evidence|\d+(\.\d+)?\s?(%|per ?cent)|in \d{4})\b/i,
  conclusion: /\b(in conclusion|to conclude|to sum up|in summary|overall|all in all|ultimately)\b/i,
  hedging: /\b(may|might|could|arguably|tends? to|likely|unlikely|suggests?|appears? to|seems? to|to some extent|in some cases)\b/i,
};

const SUBORDINATE = /^(if|when|whenever|although|though|because|while|whilst|after|before|since|unless|as|once|until|even if|even though|whether|where|wherever)\b/i;
// A comma after a sentence-initial linker, adverb or short prepositional phrase is correct
// ("However, this does...", "In 2022, there were...", "According to the report, it is...").
const LINKER = /^(however|moreover|furthermore|therefore|thus|hence|consequently|nevertheless|nonetheless|conversely|meanwhile|instead|otherwise|similarly|likewise|indeed|still|besides|admittedly|ultimately|overall|today|yesterday|now|then|finally|first|second|third|lastly|next|also|in (fact|addition|contrast|short|sum|summary|conclusion|particular|general|practice|theory|turn|other words|the end|my (view|opinion)|this (case|sense|way|respect))|for (example|instance)|as a result|of course|on the other hand|at the same time|by contrast|on balance|\w+ly)$/i;
const PREP_PHRASE = /^(in|on|at|by|for|with|during|after|before|despite|across|among|between|within|without|under|over|from|according to|throughout|unlike|like|compared (to|with)|in the case of)\s/i;
const FINITE = /\b(am|is|are|was|were|be|been|has|have|had|do|does|did|will|would|can|could|should|must|may|might)\b/i;
const leadInOk = (lead) => SUBORDINATE.test(lead) || LINKER.test(lead) || (PREP_PHRASE.test(lead) && countWords(lead) <= 7 && !FINITE.test(lead));
// Low-precision rules are not run above B2, where they mostly flag correct academic prose (persona panel P-74).
const ADVANCED = new Set(['C1', 'C2']);

// a or an by sound: initialisms read letter by letter (an MBA, a UN report), yoo- and w- sounds take a
// (a unanimous vote, a utilitarian view, a one-off), silent h takes an. null = not sure, never flagged.
const AN_LETTER = /^[AEFHILMNORSX]/;
export function articleFor(word) {
  if (/^[A-Z]{2,3}s?$/.test(word)) return AN_LETTER.test(word) ? 'an' : 'a';
  if (/^[A-Z]{4,}/.test(word)) return null; // NATO, UNESCO: read as words or letters; not checked
  const w = word.toLowerCase();
  if (/^(\d|x-|hist|herb|hotel)/.test(w)) return null;
  if (/^(one\b|one-|once|un(i(?![mnd])|anim)|use|usu|usa|uti|ura|ure|uro|eu|ewe|ubiq|uk\b)/.test(w)) return 'a';
  if (/^(hour|honest|honou?r|heir)/.test(w)) return 'an';
  return /^[aeiou]/.test(w) ? 'an' : 'a';
}
const ARTICLE = {
  an: { title: 'an before a vowel sound', he_title: 'an לפני תנועה', en: 'Use an before a vowel sound: an apple, an idea, an MBA.', he: 'לפני צליל תנועה כותבים an.' },
  a: { title: 'a before a consonant sound', he_title: 'a לפני עיצור', en: 'Use a before a consonant sound: a book, a university, a one-day trip.', he: 'לפני צליל עיצור כותבים a.' },
};

// Sentences never cross a line break. A short line with no end punctuation that is followed by more text
// (a title or heading) is not a sentence.
const isHeading = (line, i, lines) => i < lines.length - 1 && !/[.!?:;,"”)]$/.test(line) && countWords(line) <= 15;
function linesOf(text) {
  const lines = String(text).split(/\n+/).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return lines.map((l, i) => ({ text: l, heading: isHeading(l, i, lines) }));
}
const sentencesOf = (text) => linesOf(text).filter((l) => !l.heading).flatMap((l) => l.text.split(/(?<=[.!?])\s+(?=[A-Z"'“])/)).map((s) => s.trim()).filter((s) => /[A-Za-z]/.test(s));
const sentenceStart = (raw, i) => Math.max(raw.lastIndexOf('.', i - 1), raw.lastIndexOf('!', i - 1), raw.lastIndexOf('?', i - 1), raw.lastIndexOf('\n', i - 1), -1) + 1;

// A reference list at the end ("References", "Bibliography", "Works cited") is not part of the essay: it is
// not counted toward the word range and not checked (persona panel P-78). Only a heading in the last 60% of
// the text counts.
const REF_HEAD = /\n[ \t]*(references|reference list|bibliography|works cited|sources)[ \t]*:?[ \t]*(?=\n)/gi;
export function splitReferences(text) {
  const all = String(text || '');
  let at = -1;
  for (const m of all.matchAll(REF_HEAD)) at = m.index;
  return at < 0 || at < all.length * 0.4 ? { body: all, references: '' } : { body: all.slice(0, at), references: all.slice(at + 1) };
}

export function analyzeWriting(text, { level = 'B1', minWords = 0, maxWords = null, mustInclude = [], formal = null } = {}) {
  const { body, references } = splitReferences(text);
  const raw = body;
  const refWords = references ? countWords(references) : 0;
  const words = countWords(raw);
  const sentences = sentencesOf(raw);
  const headings = new Set(linesOf(raw).filter((l) => l.heading).map((l) => l.text));
  const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !headings.has(p.replace(/\s+/g, ' ')));
  const advanced = ADVANCED.has(level);
  const lower = (raw.toLowerCase().match(/[a-z']+/g) || []);
  const types = new Set(lower);
  const lens = sentences.map((s) => countWords(s));
  const isFormal = formal ?? FORMAL_LEVELS.has(level);

  const checks = [];
  const refNote = refWords ? { en: `; the reference list (${refWords} words) is not counted`, he: `; רשימת המקורות (${refWords} מילים) לא נספרת` } : { en: '', he: '' };
  if (minWords) checks.push({ id: 'length', ok: words >= minWords && (!maxWords || words <= maxWords * 1.1), en: maxWords ? `${words} words (target ${minWords}-${maxWords}${refNote.en})` : `${words} words (at least ${minWords}${refNote.en})`, he: maxWords ? `${words} מילים (יעד ${minWords}-${maxWords}${refNote.he})` : `${words} מילים (לפחות ${minWords}${refNote.he})` });
  for (const w of mustInclude) {
    const ok = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(raw);
    checks.push({ id: `must:${w}`, ok, en: `Uses "${w}"`, he: `משתמש/ת ב-"${w}"` });
  }
  const capsOk = sentences.length === 0 || sentences.every((s) => /^["'“(]?[A-Z0-9]/.test(s));
  checks.push({ id: 'caps', ok: capsOk, en: 'Every sentence starts with a capital letter', he: 'כל משפט מתחיל באות גדולה' });
  const endOk = !raw.trim() || /[.!?"”)]$/.test(raw.trim());
  checks.push({ id: 'end', ok: endOk, en: 'The text ends with punctuation', he: 'הטקסט מסתיים בסימן פיסוק' });
  if (words >= 150) checks.push({ id: 'paragraphs', ok: paragraphs.length >= 3, en: `${paragraphs.length} paragraph(s) (aim for 3 or more)`, he: `${paragraphs.length} פסקאות (כדאי 3 לפחות)` });

  const issues = [];
  const seen = new Set();
  // Whether a match is a false alarm: a comma after a fronted clause or linker ("If it rains, we will
  // stay"), if + will in an indirect question ("It is unclear if this will last"), or the right article.
  const skip = (p, m) => {
    if (p.leadInOk && leadInOk(raw.slice(sentenceStart(raw, m.index), m.index).trim())) return true;
    if (p.notAfter && p.notAfter.test(raw.slice(Math.max(0, m.index - 30), m.index))) return true;
    if (p.article) { const want = articleFor(m[2]); return !want || want === m[1].toLowerCase(); }
    return false;
  };
  for (const p of [...PATTERNS, ...(isFormal ? FORMAL_PATTERNS : [])]) {
    if (p.lowPrecision && advanced) continue;
    p.re.lastIndex = 0;
    let m;
    let count = 0;
    while ((m = p.re.exec(raw)) && count < 3) {
      if (m.index === p.re.lastIndex) p.re.lastIndex++;
      if (skip(p, m)) continue;
      const match = m[0].trim();
      const msg = p.article ? ARTICLE[articleFor(m[2])] : p;
      const key = `${p.type}:${match.toLowerCase()}`;
      if (!seen.has(key)) { seen.add(key); issues.push({ type: p.type, title: msg.title, he_title: msg.he_title, en: msg.en, he: msg.he, match, index: m.index }); }
      count++;
    }
  }
  const longest = advanced ? 55 : 40;
  lens.forEach((n, i) => { if (n > longest) issues.push({ type: 'punctuation', title: 'Very long sentence', he_title: 'משפט ארוך מאוד', en: `A ${n}-word sentence: consider splitting it for clarity.`, he: `משפט של ${n} מילים: שקלו לפצל אותו.`, match: sentences[i].slice(0, 60) + '…' }); });
  const starts = sentences.map((s) => (s.match(/^[A-Za-z']+/) || [''])[0].toLowerCase()).filter(Boolean);
  const startCounts = starts.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
  for (const [w, n] of startCounts) if (n >= 4 && n / sentences.length >= 0.5 && !['the', 'a'].includes(w)) issues.push({ type: 'cohesion', title: 'Repeated sentence opening', he_title: 'פתיחה חוזרת', en: `${n} sentences start with "${w}". Vary how sentences begin.`, he: `${n} משפטים מתחילים ב-"${w}". כדאי לגוון.`, match: w });

  const connectors = {};
  for (const [cat, list] of Object.entries(CONNECTORS)) {
    const found = list.filter((c) => new RegExp(`\\b${c}\\b`, 'i').test(raw));
    if (found.length) connectors[cat] = found;
  }
  const structure = Object.fromEntries(Object.entries(SIGNALS).map(([k, re]) => [k, re.test(raw)]));

  return {
    stats: {
      words, reference_words: refWords, sentences: sentences.length, paragraphs: paragraphs.length,
      avg_sentence: sentences.length ? +(words / sentences.length).toFixed(1) : 0,
      longest_sentence: lens.length ? Math.max(...lens) : 0,
      unique_words: types.size,
      lexical_variety: lower.length ? +(types.size / Math.sqrt(lower.length)).toFixed(2) : 0, // Guiraud index: less length-sensitive than raw type-token ratio
    },
    checks,
    issues: issues.sort((a, b) => (a.index ?? 1e9) - (b.index ?? 1e9)),
    connectors,
    structure,
    passedRequired: checks.filter((c) => c.id === 'length' || c.id.startsWith('must:')).every((c) => c.ok),
  };
}
