// Deterministic writing checks that work without AI. They are signals, not a grade: patterns can
// miss errors and occasionally flag correct English, so the UI labels them "automatic checks".
// Rules that often flag correct academic prose (comma splices, if + will) are not run at C1-C2, a/an is
// decided by sound, and a title line or a closing reference list is not treated as essay text. An email or
// message gets no argument checks, and its sign-off is not checked as a sentence.
import { countWords } from './grading.js';

const FORMAL_LEVELS = new Set(['B2', 'C1', 'C2']);

// Common learner errors. Each: pattern, error type, short title and why (EN/HE), and a suggestion.
const PATTERNS = [
  // Only the "i" is quoted, not the full stop and space before it (RW-2, student-58).
  { re: /(?<=^|[.!?]\s+|\s)i(?=\s|'m|'ve|'ll|'d)/g, type: 'capitalization', title: 'Capital I', he_title: 'I גדולה', en: 'The pronoun I is always a capital letter.', he: 'הכינוי I נכתב תמיד באות גדולה.' },
  { re: /\b(I|we|they|you)\s+(am|are|'m|'re)\s+agree\b/gi, type: 'word-choice', title: 'agree is a verb', he_title: 'agree הוא פועל', en: 'Say "I agree", not "I am agree".', he: 'אומרים I agree, בלי am.', ex: (m) => `${m[1]} agree` },
  { re: /\b(informations|advices|furnitures|equipments|homeworks|knowledges|evidences|feedbacks|luggages|baggages)\b/gi, type: 'countability', title: 'Uncountable noun', he_title: 'שם עצם שאי אפשר לספור', en: 'This noun is uncountable in English: no -s.', he: 'באנגלית אי אפשר לספור את שם העצם הזה, ולכן אין לו s.' },
  { re: /\bmore\s+(better|worse|bigger|smaller|easier|harder|faster|cheaper|older|younger|happier|larger|higher|lower)\b/gi, type: 'comparison-form', title: 'Double comparative', he_title: 'השוואה כפולה', en: 'Use either more or -er, not both.', he: 'משתמשים או ב-more או בסיומת er, לא בשניהם.' },
  { re: /\bdepends?\s+(in|of|from)\b/gi, type: 'preposition', title: 'depend on', he_title: 'depend on', en: 'The preposition is on: depends on.', he: 'אחרי depend באה on.' },
  { re: /\bdiscuss(es|ed|ing)?\s+about\b/gi, type: 'preposition', title: 'discuss (no about)', he_title: 'discuss בלי about', en: 'discuss takes a direct object: discuss the problem.', he: 'אחרי discuss לא באה about.' },
  { re: /\bexplain(s|ed)?\s+(me|him|her|us|them)\b/gi, type: 'word-order', title: 'explain to someone', he_title: 'explain to', en: 'Say "explain it to me", not "explain me".', he: 'אומרים explain to me.' },
  { re: /\b(I|he|she|we|they)\s+(have|has)\s+\d+\s+years\b/gi, type: 'false-friend', title: 'Age with be', he_title: 'גיל עם be', en: 'Age uses be: I am 20 (years old).', he: 'גיל מבטאים עם be: I am 20.' },
  // "people was", "the old people is" (RW-2, teacher-bagrut).
  { re: /\bpeople\s+(is|was|has|does|doesn't|wasn't|isn't)\b/gi, type: 'agreement', title: 'people is plural', he_title: 'people ברבים', en: (m) => `people is plural: people ${PLURAL_BE[m[1].toLowerCase()]}.`, he: (m) => `people היא מילה ברבים: people ${PLURAL_BE[m[1].toLowerCase()]}.` },
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
  { re: /,[ \t]+(I|he|she|it|we|they|this|that|there)\s+(am|is|are|was|were|have|has|had|will|can|do|does|did|think|believe|want|need)\b/g, type: 'punctuation', leadInOk: true, lowPrecision: true, title: 'Possible run-on sentence', he_title: 'ייתכן משפט רץ', en: 'Two full sentences joined by a comma: use a full stop, or a connector like and / because.', he: 'שני משפטים שלמים מחוברים בפסיק: כדאי נקודה, או מילת קישור כמו and / because.' },
  // A soft comma-splice note from B2 (RW-1): a full clause with be or an auxiliary, a comma, then a second clause
  // whose subject is a noun with a relative clause ("This is a concern, a student who copies does not practise").
  // The pronoun case stays with the rule above, which is not run at C1-C2 (P-74).
  { re: /,[ \t]+(?:a|the|this|that|every|each|my|our|their|his|her)\s+[a-z]+\s+(?:who|that|which)\s+[a-z]+\s+(?:am|is|are|was|were|has|have|had|will|can|does|do|did|should|must)\b/g, type: 'punctuation', soft: true, spliceLead: true, minLevel: 'B2', pick: (m) => m[0].replace(/^,\s*/, ''), title: 'Possible run-on sentence', he_title: 'ייתכן משפט רץ', en: 'This may be two full sentences joined by a comma: check whether a full stop or a connector fits better.', he: 'ייתכן שאלה שני משפטים שלמים שמחוברים בפסיק: בדקו אם מתאימה נקודה או מילת קישור.' },
  { re: /\s+[,.!?;:](?=\s|$)/g, type: 'punctuation', title: 'Space before punctuation', he_title: 'רווח לפני סימן פיסוק', en: 'No space before a punctuation mark.', he: 'באנגלית אין רווח לפני סימן פיסוק.' },
];

// ---------- errors typical of Hebrew speakers (RW-2) ----------
// Each rule names the error and the right form in one line, in both languages. Rules are deliberately narrow
// (word lists, a look at the words around the match), so correct English is rarely flagged: every rule has
// false-positive cases in tests/unit/writing-analyzer.test.mjs. minLevel: not run below that course level.
const LEVELS = ['PreA1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const PLURAL_BE = { is: 'are', was: 'were', has: 'have', does: 'do', "doesn't": "don't", "wasn't": "weren't", "isn't": "aren't" };
// Base verbs that are wrong after he / she / it, a singular noun or every / each. Verbs whose past form is the
// same (cost, put, let, read, cut, set, hit, hurt, quit, shut, spread) are left out: "it cost" can be right.
const BASE = 'need|want|like|love|hate|know|think|believe|feel|seem|look|sound|mean|make|take|give|get|go|come|do|don\'t|have|say|tell|ask|help|work|live|study|play|try|use|show|include|require|become|depend|keep|pay|run|send|write|leave|bring|offer|provide|create|allow|lose|win|support|teach|learn|spend|grow|deserve|matter|agree|understand|start|finish|change|affect|cause|reduce|increase|improve|prefer|enjoy|remember|forget|speak|talk|call|buy|sell|cook|eat|drink|sleep|drive|walk|travel|visit|watch|see|hear|find|happen|exist|contain|involve|explain|prove|suggest|argue|claim|lead|stay|wait|open|close|plan|hope|wish|carry|fly|cry|apply|worry|study';
const s3 = (v) => {
  const w = v.toLowerCase();
  if (w === "don't") return "doesn't";
  if (w === 'have') return 'has';
  if (/(s|x|z|ch|sh|o)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
};
// What stops a pronoun + base verb from being an error: a question or negative auxiliary, a modal, a causative
// or perception verb ("make it work", "let her go", "saw it happen"), "to", a joined subject ("he and she
// need"), or a subjunctive ("I suggest that he go").
const NOT_3SG = /(\b(do|does|did|don't|doesn't|didn't|can|can't|cannot|could|couldn't|will|won't|would|wouldn't|should|shouldn't|must|mustn't|may|might|shall|let|lets|let's|make|makes|made|making|help|helps|helped|helping|watch|watched|watching|see|saw|seen|seeing|hear|heard|feel|felt|have|has|had|having|to|not|and|or|nor|than|as|beside|besides|with|for|about|from|of|on|in|at|by|without|into|onto|like|behind|after|before|around|near|under|over|through|against|between|among)\s+$)|(\b(suggest\w*|recommend\w*|insist\w*|demand\w*|requir\w*|request\w*|propos\w*|essential|important|vital|necessary|crucial|urge\w*|ask\w*)\s+(that\s+)?$)/i;
const AUX_AFTER = '(?!\\s+(is|are|was|were|has|have|had|will|would|can|could|should|must|may|might)\\b)';
const COMPOUND_AFTER = `${AUX_AFTER}(?!\\s*[,.;:!?)]|\\s+(?:with|of|for|in|on|at|about|from|by|into|than|and|or)\\b)`;
// Before "every" / "each" or a noun subject: a question auxiliary, a causative, or a preposition (the noun then
// belongs to a phrase: "Many cities around the world have ...").
const NOT_SUBJECT = /\b(do|does|did|will|would|can|could|should|must|may|might|make|makes|made|making|let|lets|help|helps|helped|have|has|had|to|in|around|of|from|at|across|throughout|on|for|with|by|near|over|under|between|among|than|like|about|into|without|within|beside|behind)\s+$/i;
const SING_NOUN = 'student|teacher|person|child|man|woman|school|city|country|study|report|paper|article|author|writer|researcher|manager|user|worker|employee|doctor|parent|system|app|website|book|survey|society|world|internet|technology|program|programme|company';
// Family and people nouns ("My brother live in Haifa", RW-2) are rarely the first half of a compound noun, so,
// unlike the nouns above, they are flagged before a preposition too. Collective nouns (family, team) are left out,
// since "My family live in Haifa" is correct British English.
// Before a person noun also: a perception verb ("I saw my dad leave") or a joined subject ("Dana and my brother live").
const NOT_PERSON_SUBJECT = new RegExp(`(?:${NOT_SUBJECT.source.replace(/\\s\+\$$/, '')}|\\b(?:see|saw|seen|seeing|watch|watched|watching|hear|heard|hearing|feel|felt|notice|noticed|and|or|nor))\\s+$`, 'i');
const PERSON_NOUN = 'friend|boss|brother|sister|cousin|mother|father|mom|mum|dad|son|daughter|husband|wife|uncle|aunt|grandmother|grandfather|grandma|grandpa|neighbour|neighbor|partner|boyfriend|girlfriend|colleague|classmate|roommate|baby|kid';
// The -s forms of the base verbs, for "people says" (have and do are covered by the "people has / does" rule).
const PEOPLE_BASE = Object.fromEntries(BASE.split('|').filter((v) => !['have', 'do', "don't"].includes(v)).map((v) => [s3(v), v]));
const PEOPLE_S = Object.keys(PEOPLE_BASE).join('|');
// Base and -s verbs after a past time (have and has are left to the present-perfect rules).
const PAST_BASE = [...BASE.split('|').filter((v) => !['have', 'do'].includes(v)), 'finish', 'fix', 'crash', 'send', 'call', 'meet', 'start', 'arrive', 'talk', 'check', 'test', 'deploy', 'push', 'update', 'review', 'fail', ...Object.keys(PEOPLE_BASE)].filter((v, i, a) => a.indexOf(v) === i).join('|');
const pastOfPresent = (v) => { const w = v.toLowerCase(); if (w === "don't" || w === "doesn't") return "didn't"; const base = PEOPLE_BASE[w] || (BASE.split('|').includes(w) ? w : w.replace(/(?<=(ch|sh|ss|x|o))es$|s$/, '')); return pastSimple(base); };
const SING_PRONOUN = 'everyone|everybody|someone|somebody|nobody|no one|anyone|everything|something|nothing';
const DEADLINE = 'the evening|this evening|the afternoon|this afternoon|the morning|today|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tomorrow|tonight|noon|midday|midnight|the end of (?:the )?(?:day|week|month|year)|next (?:week|month|Monday|Tuesday|Wednesday|Thursday|Friday)|\\d{1,2}(?::\\d\\d)?\\s?(?:am|pm|a\\.m\\.|p\\.m\\.|o\'clock)|(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\\s\\d{1,2})?|the \\d{1,2}(?:st|nd|rd|th)';
const PARTICIPLE = '\\w+ed|found|made|seen|been|done|gone|written|taken|given|shown|known|said|told|got|gotten|bought|built|come|become|begun|left|lost|met|paid|run|sent|spent|won|had|grown|risen|fallen|chosen|spoken|broken|driven|eaten|drunk|thought|brought|taught|caught|felt|kept|heard|held|sold';
const PAST_TIME = '(?<!since\\s|until\\s|till\\s)(?:yesterday|(?<!the\\s)last (?:year|week|month|night|summer|winter|spring|autumn|weekend|Monday|Tuesday|Wednesday|Thursday|Friday)|in (?:19|20)\\d\\d|(?:\\d+|two|three|four|five|six|seven|eight|nine|ten|a few|several|many) (?:years?|months?|weeks?|days?|hours?) ago|an? (?:year|month|week|day|hour) ago)';
// RW-4: a past time at the start of a clause, and the base and -s verbs that are wrong after it.
const PAST_TIME_HEAD = '(?<!since\\s|until\\s|till\\s)(?:yesterday|last (?:year|week|month|night|summer|winter|spring|autumn|weekend|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|time)|(?:\\d+|two|three|four|five|six|seven|eight|nine|ten|a few|several) (?:years?|months?|weeks?|days?|hours?) ago|an? (?:year|month|week|day|hour) ago)';
const ADJ = 'important|good|great|big|small|new|nice|bad|serious|clear|strong|interesting|difficult|easy|simple|useful|long|short|different|real|major|huge|common|key|central|special|beautiful|old|young|hard|high|low|excellent|wonderful|terrible|perfect|fair|valid|convincing|novel|original|fresh|careful|detailed|critical|essential|significant|popular|famous|modern|safe|dangerous|cheap|expensive|healthy|quick|slow|positive|negative|better|true|bright|smart|honest|hard-working|friendly';
const COUNT_NOUN = 'thing|problem|idea|question|way|place|job|reading|issue|result|example|solution|decision|step|point|role|part|choice|chance|opportunity|mistake|car|house|city|country|person|man|woman|student|teacher|friend|book|day|change|difference|impact|effect|opinion|argument|claim|goal|plan|story|film|movie|game|test|exam|trip|meeting|factor|answer|method|source|view|approach|conclusion';
const JOB = 'student|teacher|doctor|engineer|nurse|volunteer|manager|developer|designer|programmer|lawyer|soldier|waiter|waitress|driver|tourist|farmer|singer|writer|cook|chef|pilot|scientist|researcher|journalist|accountant|secretary|cashier|mechanic|electrician|plumber|photographer|architect|dentist|pharmacist';
// The noun ends its phrase: punctuation or a small word follows ("an important thing to do", "a new reading of").
const PHRASE_END = '(?=\\s*$|\\s*[.,;:!?)]|\\s+(?:of|for|to|and|but|that|which|who|because|in|on|at|with|about|from|than|if|when|so|or|please|I|we|you|they|he|she|it|the|a|an|this|is|are|was|were|now|today|here|there)\\b)';
const withArticle = (phrase) => { const first = phrase.split(/\s+/)[0]; return `${articleFor(first) || 'a'} ${phrase}`; };
const cap = (w) => w.replace(/(^|\s)([a-z])/g, (x, sp, c) => sp + c.toUpperCase());
// Words that end in -s but are singular, and verbs that often follow "this" ("this shows that ...").
const SINGULAR_S = new Set(['news', 'means', 'series', 'species', 'perhaps', 'always', 'yes', 'whereas', 'thus', 'has', 'was', 'does', 'is', 'sometimes', 'nowadays', 'afterwards', 'towards', 'besides', 'unless', 'chaos', 'bias', 'gas', 'bus', 'lens', 'canvas', 'atlas', 'christmas', 'plus', 'versus', 'us', 'its', 'his', 'hers', 'ours', 'yours', 'theirs', 'this', 'less']);
const VERB_S = new Set(['means', 'shows', 'seems', 'makes', 'helps', 'gives', 'leads', 'explains', 'proves', 'depends', 'requires', 'includes', 'allows', 'creates', 'raises', 'reflects', 'affects', 'happens', 'matters', 'works', 'looks', 'sounds', 'feels', 'applies', 'implies', 'indicates', 'demonstrates', 'illustrates', 'highlights', 'remains', 'becomes', 'comes', 'goes', 'takes', 'needs', 'costs', 'saves', 'causes', 'changes', 'puts', 'gets', 'keeps', 'lets', 'says', 'tells', 'brings', 'continues', 'contains', 'involves', 'reduces', 'increases', 'improves', 'supports', 'provides', 'offers', 'ensures', 'presents', 'represents', 'describes', 'argues', 'claims', 'states', 'concludes', 'suggests', 'sets', 'turns', 'starts', 'ends', 'runs', 'follows', 'opens', 'closes', 'moves', 'uses', 'wants', 'lasts', 'fits', 'holds', 'hurts', 'leaves', 'lacks', 'limits', 'adds', 'appears', 'assumes', 'belongs', 'calls', 'counts', 'deserves', 'differs', 'enables', 'explores', 'focuses', 'gains', 'happens', 'ignores', 'lowers', 'misses', 'needs', 'occurs', 'overlooks', 'points', 'produces', 'questions', 'reads', 'reveals', 'risks', 'serves', 'solves', 'stands', 'stays', 'stems', 'strikes', 'tends', 'tests', 'touches', 'treats', 'undermines', 'weakens', 'strengthens', 'contradicts', 'reinforces', 'answers', 'asks', 'builds', 'catches', 'charges', 'cuts', 'deals', 'drives', 'earns', 'feeds', 'finds', 'grows', 'hides', 'invites', 'joins', 'kills', 'knows', 'learns', 'lies', 'lives', 'loses', 'meets', 'pays', 'plays', 'pulls', 'pushes', 'raises', 'reaches', 'rests', 'rises', 'sends', 'shapes', 'shifts', 'signals', 'speaks', 'spends', 'stops', 'teaches', 'thinks', 'tries', 'wins', 'works', 'writes']);
const PLURAL_NEXT = new Set(['are', 'were', 'have', 'do', "don't", 'can', 'could', 'will', 'would', 'should', 'must', 'may', 'might', 'help', 'make', 'give', 'show', 'need', 'cost', 'allow', 'let', 'mean', 'seem', 'look', 'work', 'take', 'cause', 'become']);
const NOT_AFTER_THIS_S = new Set(['that', 'the', 'a', 'an', 'to', 'us', 'me', 'you', 'him', 'her', 'them', 'it', 'our', 'their', 'his', 'its', 'my', 'your', 'this', 'these', 'those', 'some', 'many', 'more', 'less', 'no', 'not', 'up', 'out', 'on', 'in', 'for', 'with', 'about', 'into', 'from', 'how', 'why', 'what', 'whether', 'if', 'as', 'by', 'at', 'so', 'clear', 'possible', 'sense', 'people', 'students', 'everyone']);
// Words that are not names after "I live in" or "my name is" ("I live in peace", "my name is not ...").
const NOT_NAME = new Set(['a', 'an', 'the', 'my', 'our', 'his', 'her', 'their', 'this', 'that', 'these', 'those', 'here', 'there', 'peace', 'fear', 'hope', 'poverty', 'comfort', 'it', 'home', 'work', 'school', 'town', 'one', 'two', 'not', 'also', 'still', 'just', 'written', 'spelled', 'spelt', 'on', 'in', 'very', 'same', 'different', 'nowhere', 'everywhere', 'harmony', 'debt', 'luxury', 'isolation', 'danger', 'hiding', 'apartment', 'apartments', 'flat', 'flats', 'house', 'houses', 'village', 'city', 'country', 'building', 'dorm', 'dorms', 'dormitory', 'kibbutz', 'moshav', 'north', 'south', 'east', 'west', 'centre', 'center', 'suburbs', 'area', 'neighbourhood', 'neighborhood', 'street', 'place', 'what', 'which', 'where', 'and', 'but', 'so', 'too', 'now', 'today', 'abroad', 'downtown', 'rented', 'student', 'shared', 'big', 'small', 'old', 'new', 'nice', 'quiet', 'such', 'both', 'two', 'all', 'is', 'was', 'unknown', 'far', 'away', 'overseas', 'another', 'other', 'out', 'over', 'outside', 'inside', 'near', 'around', 'tents', 'tent', 'rent', 'hotels', 'hotel']);

const PAST = { seen: 'saw', been: 'was', done: 'did', gone: 'went', written: 'wrote', taken: 'took', given: 'gave', shown: 'showed', known: 'knew', gotten: 'got', begun: 'began', become: 'became', come: 'came', run: 'ran', grown: 'grew', risen: 'rose', fallen: 'fell', chosen: 'chose', spoken: 'spoke', broken: 'broke', driven: 'drove', eaten: 'ate', drunk: 'drank' };
const pastOf = (participle) => PAST[participle.toLowerCase()] || participle;
const PLURAL = { child: 'children', man: 'men', woman: 'women', person: 'people', study: 'studies' };
const AUX_WORDS = new Set(['am', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'can', 'could', 'should', 'must', 'may', 'might', 'shall']);
const PAST_VERB = new Set(['went', 'did', 'saw', 'had', 'made', 'took', 'came', 'got', 'said', 'felt', 'thought', 'knew']);
// The opener (a negative word or a question word), then the auxiliary, then the subject: "Rarely do we …",
// "Never have I …", "Why should we …", "Where did you …".
function inverted(opener, subj, next = '') {
  const s = subj === 'I' ? 'I' : subj.toLowerCase();
  const n = next.toLowerCase();
  if (AUX_WORDS.has(n)) return `${opener} ${n} ${s} …`;
  if (PAST_VERB.has(n) || /ed$/.test(n)) return `${opener} did ${s} …`;
  const aux = n === 'does' || /^(he|she|it|this|the government)$/.test(s) ? 'does' : 'do';
  return `${opener} ${aux} ${s}${n && !['do', 'does'].includes(n) ? ` ${n}` : ''} …`;
}

// ---- r4 RW-1 word lists ----
// Irregular verbs (base → past) for the over-regularised past ("goed" → went). The wrong forms are generated:
// base + d after an e, base + ed, and a doubled final consonant (runned, swimmed). A form that is itself a word
// (seed, sited, wined, singed, waked) is left out.
const IRREG = { go: 'went', eat: 'ate', buy: 'bought', sleep: 'slept', see: 'saw', take: 'took', make: 'made', come: 'came', write: 'wrote', think: 'thought', bring: 'brought', teach: 'taught', catch: 'caught', run: 'ran', swim: 'swam', begin: 'began', know: 'knew', build: 'built', give: 'gave', get: 'got', say: 'said', tell: 'told', find: 'found', feel: 'felt', leave: 'left', lose: 'lost', pay: 'paid', send: 'sent', spend: 'spent', win: 'won', break: 'broke', choose: 'chose', drive: 'drove', fall: 'fell', fly: 'flew', forget: 'forgot', grow: 'grew', keep: 'kept', meet: 'met', ride: 'rode', sit: 'sat', speak: 'spoke', stand: 'stood', steal: 'stole', throw: 'threw', understand: 'understood', wear: 'wore', draw: 'drew', drink: 'drank', feed: 'fed', fight: 'fought', hide: 'hid', hold: 'held', sell: 'sold', shoot: 'shot', bite: 'bit', blow: 'blew', dig: 'dug', hear: 'heard', mean: 'meant', rise: 'rose', shake: 'shook', sink: 'sank', become: 'became', forgive: 'forgave', freeze: 'froze', read: 'read', cut: 'cut', hit: 'hit', hurt: 'hurt', shut: 'shut', set: 'set', let: 'let', lend: 'lent', deal: 'dealt', do: 'did', have: 'had', sweep: 'swept' };
const NOT_OVER_REG = new Set(['seed', 'sited', 'wined', 'singed', 'waked', 'hanged', 'leaded', 'costed', 'putted', 'lighted', 'bended', 'teared', 'founded', 'wounded', 'reed']);
const wrongPast = (b) => (b.endsWith('e') ? [`${b}d`] : [`${b}ed`, ...(/(^|[^aeiou])[aeiou][bdgklmnprt]$/.test(b) && !/^(open|visit|listen|happen|offer|enter|answer)$/.test(b) ? [`${b}${b.slice(-1)}ed`] : [])]);
const OVER_REG = Object.fromEntries(Object.entries(IRREG).flatMap(([b, p]) => wrongPast(b).filter((w) => !NOT_OVER_REG.has(w)).map((w) => [w, p])));
const pastSimple = (v) => { const w = v.toLowerCase(); return { mean: 'meant' }[w] || IRREG[w] || (w.endsWith('e') ? `${w}d` : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ied` : `${w}ed`); };
const PAST_TOPICS = ['past-simple-irregular', 'past-simple-regular', 'past-simple-questions', 'past-be', 'past-continuous'];
const PLURAL_VERB = { was: 'were', is: 'are', has: 'have', shows: 'show', suggests: 'suggest', indicates: 'indicate', proves: 'prove', "wasn't": "weren't", "isn't": "aren't", "hasn't": "haven't", "doesn't": "don't" };
const PREP_AFTER_NOUN = new Set(['in', 'at', 'on', 'for', 'with', 'of', 'from', 'and', 'or', 'like', 'about', 'during', 'without']);
const THIS_NOUN = new Set([...`${COUNT_NOUN}|${SING_NOUN}|${PERSON_NOUN}|tool|shoe|phone|app|rule|word|computer|class|lesson|course|subject|program|website|device|picture|photo|document|file|book|song|movie|show|car|house|room`.split('|')]);
// A word that ends in -s but is not a plural count noun, for the plural rules ("the news was", "a great success").
const ing = (v) => { const w = v.toLowerCase(); if (/ie$/.test(w)) return `${w.slice(0, -2)}ying`; if (/[^e]e$/.test(w) && w !== 'be') return `${w.slice(0, -1)}ing`; if (/^[^aeiou]*[aeiou][bdgmnprt]$/.test(w)) return `${w}${w.slice(-1)}ing`; return `${w}ing`; };
// Words before a job noun that already make it right or are not modifiers ("I am a QA engineer", "I am not ...").
const NOT_JOB_MOD = new Set(['a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'its', 'this', 'that', 'one', 'no', 'not', 'also', 'still', 'now', 'just', 'always', 'never', 'really', 'already', 'another', 'every', 'each', 'some', 'any', 'both', 'to', 'going', 'being', 'like', 'as', 'with', 'for', 'and', 'or', 'with', 'proud', 'happy', 'glad', 'sure', 'here', 'there', 'working', 'studying', 'married', 'friends', 'friend', 'talking', 'meeting', 'the']);
const notPluralNoun = (w) => /^[A-Z]/.test(w) || SINGULAR_S.has(w.toLowerCase()) || /(ss|us|is|ics|ous|'s)$/i.test(w);

// Each rule has a one-line explanation in both languages and, in ex, the right form for the words it found, which
// the UI shows on its own left-to-right line (so an English example never splits a Hebrew sentence).
export const L1_PATTERNS = [
  // Third person -s: "it need", "she want", "every school need", "the study show", "everyone know".
  { re: new RegExp(`\\b(he|she|it)\\s+(${BASE})\\b${AUX_AFTER}`, 'gi'), type: 'agreement', l1: true, notAfter: NOT_3SG, skipPair: /^it like$/i, title: 'Verb after he / she / it', he_title: 'פועל אחרי he / she / it', en: 'After he, she or it, the verb takes -s.', he: 'אחרי he, she או it מוסיפים s לפועל.', ex: (m) => `${m[1]} ${s3(m[2])}` },
  { re: new RegExp(`\\b(every|each)\\s+([a-z]+)\\s+(${BASE})\\b${COMPOUND_AFTER}`, 'gi'), type: 'agreement', l1: true, notAfter: NOT_SUBJECT, title: 'every / each + verb with -s', he_title: 'every / each ופועל עם s', en: 'every and each take a singular verb, with -s.', he: 'אחרי every או each הפועל ביחיד, עם s.', ex: (m) => `${m[1]} ${m[2]} ${s3(m[3])}` },
  { re: new RegExp(`\\b(a|an|the|this|that|my|his|her|our|your|their|its|one)\\s+(${SING_NOUN})\\s+(${BASE})\\b${COMPOUND_AFTER}`, 'gi'), type: 'agreement', l1: true, notAfter: NOT_SUBJECT, title: 'Singular subject, verb with -s', he_title: 'נושא ביחיד, פועל עם s', en: 'A singular subject takes a verb with -s.', he: 'נושא ביחיד מקבל פועל עם s.', ex: (m) => `${m[1]} ${m[2]} ${s3(m[3])}` },
  { re: new RegExp(`\\b(a|the|this|that|my|his|her|our|your|their|one)\\s+(${PERSON_NOUN})\\s+(${BASE})\\b${AUX_AFTER}(?!\\s*[-'])`, 'gi'), type: 'agreement', l1: true, notAfter: NOT_PERSON_SUBJECT, title: 'Singular subject, verb with -s', he_title: 'נושא ביחיד, פועל עם s', en: 'A singular subject takes a verb with -s.', he: 'נושא ביחיד מקבל פועל עם s.', ex: (m) => `${m[1]} ${m[2]} ${s3(m[3])}` },
  // people + verb with -s: "Some people says" (next to "people was" above, RW-2).
  { re: new RegExp(`\\bpeople\\s+(${PEOPLE_S})\\b(?!')`, 'gi'), type: 'agreement', l1: true, title: 'people + verb without -s', he_title: 'people ופועל בלי s', en: 'people is plural, so the verb has no -s.', he: 'people היא מילה ברבים, ולכן הפועל בלי s.', ex: (m) => `people ${PEOPLE_BASE[m[1].toLowerCase()]}` },
  { re: new RegExp(`\\b(${SING_PRONOUN})\\s+(${BASE})\\b${AUX_AFTER}`, 'gi'), type: 'agreement', l1: true, notAfter: NOT_3SG, skipPair: / like$/i, title: 'everyone + verb with -s', he_title: 'everyone ופועל עם s', en: 'Words like everyone and nobody are singular in English, so the verb takes -s.', he: 'מילים כמו everyone ו-nobody הן ביחיד באנגלית, ולכן הפועל מקבל s.', ex: (m) => `${m[1]} ${s3(m[2])}` },
  { re: /(?<=^|[.!?]\s+|\n)([A-Z][a-z]+ing)\s+(give|make|take|mean|cause|allow|teach|require|become|keep|bring|provide|create|improve|reduce|seem|lead|let)\b/g, type: 'agreement', l1: true, skipWord: /^(During|Being|Having|Including|Regarding|Concerning|According|Following|Considering|Something|Nothing|Everything|Anything|Morning|Evening|Spring|King|Thing|Building|Notwithstanding|Pending|Excluding)$/, title: 'An -ing subject is singular', he_title: 'נושא עם ing הוא ביחיד', en: 'An -ing subject is singular, so the verb takes -s.', he: 'נושא שהוא פעולה (ing) נחשב ליחיד, ולכן הפועל מקבל s.', ex: (m) => `${m[1]} ${s3(m[2])}` },
  // Spelling Hebrew speakers carry over from chat: alot, dont, doesnt, didnt, cant.
  { re: /\b(alot|dont|doesnt|didnt|cant|isnt|arent|wasnt|werent|havent|hasnt|couldnt|wouldnt|shouldnt)\b/gi, type: 'spelling', l1: true, title: 'Spelling', he_title: 'כתיב', en: (m) => (/^alot$/i.test(m[1]) ? 'Two words.' : 'With an apostrophe.'), he: (m) => (/^alot$/i.test(m[1]) ? 'כותבים בשתי מילים.' : 'כותבים עם אפוסטרוף.'), ex: (m) => (/^alot$/i.test(m[1]) ? 'a lot' : m[1].replace(/nt$/i, "n't")) },
  // their / there before a noun ("there CV", "on there own"); "their is" for "there is".
  { re: /\bthere\s+(CV|cv|house|home|car|cars|family|friends?|parents|children|kids|job|jobs|lives|own|money|phones?|homework|teachers?|names?|room|rooms|opinions?|country|city|company|boss|team|ideas?|dog|mother|father|mom|mum|dad|work)\b/g, type: 'word-choice', l1: true, notAfter: /\b(is|are|was|were|isn't|aren't|wasn't|weren't|be|been|being|will|would|could|might|may|can|not|any|no|'s)\s+$/i, title: 'their or there', he_title: 'their או there', en: 'their means belonging to them; there is a place, or there is / there are.', he: 'their פירושו ״שלהם״. there פירושו ״שם״, או ״יש״ ב-there is / there are.', ex: (m) => `their ${m[1]}` },
  { re: /\btheir\s+(is|are|was|were)\b/gi, type: 'word-choice', l1: true, title: 'there is / there are', he_title: 'there is / there are', en: '"There is" and "there are" say that something exists; their means belonging to them.', he: '״יש״ באנגלית הוא there is / there are, ו-their פירושו ״שלהם״.', ex: (m) => `there ${m[1]}` },
  // for + base verb for a purpose: "for find a job" (כדי למצוא).
  { re: /\bfor\s+(find|get|buy|make|learn|see|do|go|have|improve|meet|save|earn|keep|take|build|read|write|understand|know|become|visit|practise|say|tell|give|bring|spend|choose|prepare|check|finish|ask|apply|pass|reach|feel|avoid|reduce|increase|protect|stay|live|speak)\b(?!\s*[-'])/gi, type: 'verb-form', l1: true, title: 'to + verb for a purpose', he_title: 'כדי ל... = to', en: 'To say why (in order to), use to + verb, not for.', he: 'כדי להגיד ״כדי ל...״ כותבים to ואחריו פועל, לא for.', ex: (m) => `to ${m[1].toLowerCase()}` },
  // Although ..., but ... (אף על פי ש... אבל).
  { re: /\b(although|even though|though)\s+[^.!?;,]{3,},\s*but\b/gi, type: 'conjunction', l1: true, minLevel: 'A2', pick: (m) => `${m[1]} …, but`, title: 'Although … but', he_title: 'Although בלי but', en: 'Use although or but, not both.', he: 'באנגלית בוחרים אחד: although או but, לא את שניהם.', ex: 'Although it is cheap, it is slow.' },
  // until for a deadline (עד = by): "fix the bug until Thursday", "send you the first part, with the analysis, until
  // Wednesday" (anywhere in the clause, which runs to . ! ? or ;, RW-4). "won't be ready until Friday" and "can't
  // finish until Thursday" (not before) are right, so a negative is skipped; a verb of lasting in between ("sent it
  // and waited until Friday") ends the search.
  { re: new RegExp(`\\b(finish(?:ed)?|send|sent|submit|fix|deliver|complete|return|pay|hand in|prepare|done|ready|reply|answer|confirm|decide|book|order)\\b(?:(?!n't|\\bnot\\b|\\bnever\\b|\\b(?:wait|stay|remain|work|live|sleep|open|closed|last)\\w*\\b)[^.!?;\\n])*?\\buntil\\s+(${DEADLINE})\\b`, 'gi'), type: 'preposition', l1: true, minLevel: 'A2', notAfter: /(n't|\bnot|\bnever|\bno)\s+(?:be\s+|been\s+|get\s+)?$/i, pick: (m) => `until ${m[2]}`, title: 'by for a deadline', he_title: 'by למועד אחרון', en: 'For a deadline (no later than), use by. until means the whole time up to then.', he: 'למועד אחרון (לא יאוחר מ-) כותבים by. המילה until פירושה ״כל הזמן עד אז״.', ex: (m) => `by ${m[2]}` },
  // In an email, "I can't finish the report until Thursday" may mean a deadline: a soft note, not an error (RW-4).
  { re: new RegExp(`\\b(?:can't|cannot|won't|will not|couldn't|wouldn't)\\s+(?:be\\s+able\\s+to\\s+)?(finish|send|submit|fix|deliver|complete|return|pay|hand in|prepare|reply|answer|confirm)\\b[^.!?;\\n]*?\\buntil\\s+(${DEADLINE})\\b`, 'gi'), type: 'preposition', l1: true, soft: true, kinds: ['email'], minLevel: 'A2', pick: (m) => `until ${m[2]}`, title: 'until or by?', he_title: 'until או by?', en: 'If you mean a deadline (no later than), write by.', he: 'אם הכוונה למועד אחרון, כותבים by.', ex: (m) => `by ${m[2]}` },
  // "Please advise" is stiff in an everyday email: a soft register note (RW-4).
  { re: /\bplease advise\b/gi, type: 'register', l1: true, soft: true, minLevel: 'A2', title: '"Please advise" is stiff', he_title: 'Please advise רשמי ונוקשה', en: '"Please advise" sounds stiff and old-fashioned. Ask the question itself:', he: 'Please advise נשמע נוקשה ומיושן. עדיף לשאול את השאלה עצמה:', ex: 'Could you let me know what you think?' },
  // A past time with a present verb: "Yesterday I finish the report", "Last week she go home" (RW-4). The time phrase
  // comes first, and nothing that opens a new clause (I, that, who ...) stands between it and the subject.
  { re: new RegExp(`(?<![A-Za-z])(${PAST_TIME_HEAD})\\b,?((?:(?!\\b(?:I|we|he|she|they|you|that|who|which|when|because|and|but)\\b)[^.!?;\\n]){0,30}?)\\s(I|we|he|she|they|you)\\s+(${PAST_BASE})\\b(?!['’-])`, 'gi'), type: 'tense', l1: true, minLevel: 'A2', topics: PAST_TOPICS, pick: (m) => `${m[3]} ${m[4]}`, title: 'Past time, past verb', he_title: 'זמן עבר, פועל בעבר', en: 'The time is in the past (yesterday, last week, two days ago), so the verb is in the past simple.', he: 'הזמן כבר עבר (yesterday, last week, two days ago), ולכן הפועל ב-past simple.', ex: (m) => `${m[3]} ${pastOfPresent(m[4])}` },
  // Email formulas translated word for word.
  { re: /\bI(?:\s+will|'ll)\s+be\s+(happy|glad)\s+if\s+(you|we)\b/gi, type: 'word-choice', l1: true, minLevel: 'A2', title: "I'd be grateful if", he_title: 'אשמח אם', en: '"I will be happy if" is a word-for-word translation from Hebrew. A polite request:', he: 'זה תרגום מילולי של ״אשמח אם״. כך מבקשים בנימוס:', ex: "I'd be grateful if you could… / Could you…?" },
  // "Nice to know you" for נעים להכיר (but "It's nice to know you care" is right).
  { re: /\b(nice|glad|happy)\s+to\s+know\s+you\b(?=\s*[.,!?]|\s*$|\s+(?:too|all|both)\b)/gi, type: 'word-choice', l1: true, title: 'Nice to meet you', he_title: 'נעים להכיר', en: 'When you meet someone, say "Nice to meet you". "Nice to know you" is a word-for-word translation from Hebrew.', he: 'כשפוגשים מישהו בפעם הראשונה אומרים Nice to meet you. הצירוף Nice to know you הוא תרגום מילולי של ״נעים להכיר״.', ex: (m) => `${m[1]} to meet you` },
  { re: /\b(I am|I'm)\s+writ(ing|e)\s+you\b/gi, type: 'preposition', l1: true, minLevel: 'A2', title: 'writing to you', he_title: 'writing to you', en: 'write takes to before the person.', he: 'אחרי write באה to לפני האדם.', ex: (m) => `${m[1]} writing to you` },
  // A finished past time with the present perfect: "has found in 2021", "In 2021, Okafor has found".
  { re: new RegExp(`\\b(have|has|'ve)\\s+(${PARTICIPLE})\\b([^.!?;,()\\n]{0,40}?\\b${PAST_TIME})`, 'gi'), type: 'tense', l1: true, minLevel: 'A2', notAfter: /\b(would|could|should|might|must|may|will|to)\s+(not\s+)?$/i, title: 'Past time: past simple', he_title: 'זמן שהסתיים: past simple', en: 'With a finished time (yesterday, in 2021, two years ago), use the past simple.', he: 'עם זמן שהסתיים (yesterday, in 2021, two years ago) משתמשים ב-past simple.', ex: (m) => `${pastOf(m[2])}${m[3]}` },
  { re: new RegExp(`(?<=^|[.!?]\\s+|\\n)((?:In (?:19|20)\\d\\d|Yesterday|Last (?:year|week|month|night)|\\d+ (?:years?|months?|weeks?|days?) ago),?\\s+[^.!?;\\n]{0,40}?)\\b(?:have|has)\\s+(${PARTICIPLE})\\b`, 'g'), type: 'tense', l1: true, minLevel: 'A2', title: 'Past time: past simple', he_title: 'זמן שהסתיים: past simple', en: 'With a finished time (yesterday, in 2021, two years ago), use the past simple.', he: 'עם זמן שהסתיים (yesterday, in 2021, two years ago) משתמשים ב-past simple.', ex: (m) => `${m[1]}${pastOf(m[2])}` },
  // A negative opener without inversion: "Rarely we see" (Rarely do we see), "Never I have seen" (Never have I seen).
  { re: /(?<=^|[.!?]\s+|\n)(Rarely|Seldom|Never|Hardly ever|Only then|Under no circumstances|Nowhere|Not once|At no time)\s+(we|I|you|they|he|she|it|people|this|the|students|governments?)\b(?!\s*,)(?:\s+([a-z']+))?/g, type: 'word-order', l1: true, minLevel: 'B1', pick: (m) => `${m[1]} ${m[2]}`, title: 'Inversion after Rarely / Never', he_title: 'היפוך אחרי Rarely / Never', en: 'After a negative opener, the auxiliary comes before the subject.', he: 'אחרי מילת שלילה בפתיחת משפט, פועל העזר בא לפני הנושא.', ex: (m) => inverted(m[1], m[2], m[3]) },
  // A question in statement order: "Why we should pay for this?".
  { re: /(?<=^|[.!?]\s+|\n|["“])(Why|What|Where|When|How|Who|Which)\s+(we|I|you|they|he|she|it|people|this|the government|students)\s+(should|can|could|will|would|must|are|is|have|has|need|want|think|go|went|do|did|does)\b[^.!?\n]*\?/g, type: 'word-order', l1: true, pick: (m) => `${m[1]} ${m[2]} ${m[3]}…?`, title: 'Question word order', he_title: 'סדר מילים בשאלה', en: 'In a question, the auxiliary (or do / does / did) comes before the subject.', he: 'בשאלה, פועל העזר (או do / does / did) בא לפני הנושא.', ex: (m) => `${inverted(m[1], m[2], m[3])}?` },
  // A missing a / an: "it is very important thing", "offers new reading of", "I am student", "I have reservation".
  { re: new RegExp(`\\b(?:is|was|am|are|be|been|have|has|had|want|wants|need|needs|offer|offers|offered|make|makes|made|get|gets|got|became|become|becomes|found|take|takes|took|give|gives|gave|it's|that's|there's|what's|such)\\s+((?:very\\s+|really\\s+|quite\\s+|so\\s+)?(?:${ADJ})\\s+(?:${COUNT_NOUN}))\\b${PHRASE_END}`, 'gi'), type: 'article', l1: true, pick: (m) => m[1], title: 'a / an before a singular noun', he_title: 'a / an לפני שם עצם ביחיד', en: 'A singular countable noun needs a, an or the.', he: 'לפני שם עצם שאפשר לספור (a car, a job) ביחיד צריך a, an או the.', ex: (m) => withArticle(m[1]) },
  { re: new RegExp(`\\b(?:I am|I'm|I was|he is|she is|he's|she's|he was|she was|you are|you're|my (?:mother|father|sister|brother|friend|wife|husband|partner) is)\\s+(${JOB})\\b${PHRASE_END}`, 'gi'), type: 'article', l1: true, pick: (m) => m[0].trim(), title: 'a / an before a job', he_title: 'a / an לפני מקצוע', en: 'Jobs and roles take a or an.', he: 'לפני מקצוע או תפקיד כותבים a או an.', ex: (m) => m[0].trim().replace(new RegExp(`${m[1]}$`), withArticle(m[1])) },
  { re: new RegExp(`\\b(?:I am|I'm|I was|he is|she is|he's|she's|he was|she was|you are|you're)\\s+((?:[A-Za-z][\\w-]*\\s+){1,2})(${JOB})\\b${PHRASE_END}`, 'g'), type: 'article', l1: true, jobMods: true, pick: (m) => m[0].trim(), title: 'a / an before a job', he_title: 'a / an לפני מקצוע', en: 'Jobs and roles take a or an.', he: 'לפני מקצוע או תפקיד כותבים a או an.', ex: (m) => m[0].trim().replace(`${m[1]}${m[2]}`, withArticle(`${m[1]}${m[2]}`)) },
  // suggest + to + verb: "I suggest to wait" (suggest waiting / suggest that we wait) (RW-4).
  { re: /\b(suggest|suggests|suggested|suggesting|recommend|recommends|recommended)\s+to\s+(?!(?:me|you|him|her|us|them|the|a|an|my|our|your|their|his|its|this|that|everyone|anyone|someone|management|[A-Z][a-z]+)\b)([a-z]+)\b/g, type: 'verb-form', l1: true, minLevel: 'A2', title: 'suggest + -ing', he_title: 'suggest עם ing', en: 'After suggest (and recommend), use -ing or a that clause, not to + verb.', he: 'אחרי suggest (וגם recommend) באה צורת ing או that, לא to ופועל.', ex: (m) => `${m[1]} ${ing(m[2])} / ${m[1]} that we ${m[2]}` },
  // the app / the system + a bare verb: "the app crash" (crashed in a past story, crashes now) (RW-4).
  { re: new RegExp(`\\b(the|our|my|this|that|their|your)\\s+(app|system|server|website|site|database|page|program|computer|laptop|phone|build|update|printer|network|payment|screen|code|test)\\s+(crash|stop|fail|freeze|break|load|restart|die|hang|work|go down|show|send|open|close|delete|lose|need|run)\\b${AUX_AFTER}(?!\\s+(?:of|for|with|and)\\b)(?!\\s+(?:report|log|rate|button|page|screen)s?\\b)`, 'gi'), type: 'agreement', l1: true, minLevel: 'A2', narrative: true, notAfter: NOT_PERSON_SUBJECT, title: 'the app + verb', he_title: 'the app ופועל', en: (m, x) => (x.past ? 'In a story about the past, the verb is in the past simple.' : 'A singular subject takes a verb with -s.'), he: (m, x) => (x.past ? 'בסיפור על מה שקרה, הפועל ב-past simple.' : 'נושא ביחיד מקבל פועל עם s.'), ex: (m, x) => `${m[1]} ${m[2]} ${x.past ? (m[3].toLowerCase() === 'go down' ? 'went down' : pastSimple(m[3]).replace(/^stoped$/, 'stopped')) : (m[3].toLowerCase() === 'go down' ? 'goes down' : s3(m[3]))}` },
  { re: /\b(?:I|we)\s+(?:have|want|need|had|booked|made|would like|'d like)\s+(reservation|booking|ticket|question|problem|appointment|suggestion|request|complaint)\b(?=\s*[.,!?]|\s*$|\s+(?:please|for|from|about|with|under|on|in|at)\b)/gi, type: 'article', l1: true, pick: (m) => m[0].trim(), title: 'a / an before a singular noun', he_title: 'a / an לפני שם עצם ביחיד', en: 'A singular countable noun needs a, an or the.', he: 'לפני שם עצם שאפשר לספור (a car, a job) ביחיד צריך a, an או the.', ex: (m) => m[0].trim().replace(new RegExp(`${m[1]}$`), withArticle(m[1])) },
  // "I want room, please" (but "We have room for two" is right: room = space).
  { re: /\b(?:I|we)\s+(?:want|need|would like|'d like|booked)\s+(room)\b(?=\s*[.,!?]|\s*$|\s+please\b)/gi, type: 'article', l1: true, pick: (m) => m[0].trim(), title: 'a / an before a singular noun', he_title: 'a / an לפני שם עצם ביחיד', en: 'A singular countable noun needs a, an or the.', he: 'לפני שם עצם שאפשר לספור (a car, a job) ביחיד צריך a, an או the.', ex: (m) => m[0].trim().replace(/room$/, 'a room') },
  // this / these with the wrong number: "this tools", "these kind of".
  { re: /\bthis\s+([a-z]+s)\b(?:\s+([a-z']+))?/gi, type: 'agreement', l1: true, thisPlural: true, pick: (m) => m[0].split(/\s+/).slice(0, 2).join(' '), title: 'this / these', he_title: 'this / these', en: 'this goes with a singular noun, these with a plural one.', he: 'this בא עם שם עצם ביחיד, ו-these עם רבים.', ex: (m) => `these ${m[1]}` },
  { re: /\b(these|those)\s+(tool|problem|idea|thing|book|person|kind|type|sort|way|reason|example|question|issue|app|rule|result|study|change|word|day|year|student|child|man|woman|method|source|argument|claim|factor|point)\b(?!['’-])(?!\s+[a-z]+s\b)/gi, type: 'agreement', l1: true, title: 'this / these', he_title: 'this / these', en: 'these and those go with a plural noun.', he: 'these ו-those באים עם שם עצם ברבים.', ex: (m) => `${m[1]} ${PLURAL[m[2].toLowerCase()] || `${m[2]}s`}${/^(kind|type|sort)$/i.test(m[2]) ? ' of' : ''}` },
  // ---- r4 RW-1: the errors Lucid's own lessons teach (a2-05's checklist warns "לא goed ולא buyed") ----
  // An irregular verb with a regular -ed: "goed", "eated", "buyed", "sleeped". Real words that look like one ("seed",
  // "singed", "ringed", "four-leaved") are not in the list or are skipped by the look-behind.
  { re: new RegExp(`(?<![-\\w])(${Object.keys(OVER_REG).join('|')})\\b(?!['’-])`, 'gi'), type: 'verb-form', l1: true, minLevel: 'A1', max: 6, topics: PAST_TOPICS, title: 'Irregular past', he_title: 'עבר של פועל חריג', en: (m) => `This verb is irregular, so its past form has no -ed: ${OVER_REG[m[1].toLowerCase()]}.`, he: 'זה פועל חריג, ולכן בעבר אין לו ed.', ex: (m) => OVER_REG[m[1].toLowerCase()] },
  // we / you / they / a plural noun + was: "we was very tired", "my parents was".
  { re: /\b(we|you|they)\s+(was|wasn't)\b/gi, type: 'agreement', l1: true, minLevel: 'A1', notAfter: /\b(thank|if|as)\s+$/i, topics: PAST_TOPICS, title: 'we / they + were', he_title: 'we / they עם were', en: 'With we, you, they and plural nouns the past of be is were.', he: 'אחרי we, you, they ושם עצם ברבים, העבר של be הוא were.', ex: (m) => `${m[1]} ${m[2].toLowerCase() === 'was' ? 'were' : "weren't"}` },
  { re: /\b(the|my|our|your|their|his|her|these|those|some|many|all|both|most)\s+([a-z]+s)\s+(was|wasn't)\b/g, type: 'agreement', l1: true, minLevel: 'A1', pluralNoun: 2, deferTo: { re: /^(results|findings|figures|statistics)$/i, group: 2, minLevel: 'A2' }, notAfter: /\b(what|which|whom?|whose)\b[^.!?]*$|\b(of|in|on|for|with|from|about|by|to|among|between|at|than|like)\s+$/i, topics: PAST_TOPICS, title: 'Plural subject + were', he_title: 'נושא ברבים עם were', en: 'With a plural noun the past of be is were.', he: 'אחרי שם עצם ברבים, העבר של be הוא were.', ex: (m) => `${m[1]} ${m[2]} ${m[3] === 'was' ? 'were' : "weren't"}` },
  // a / an + adjective + plural noun: "a new shoes", "an interesting ideas".
  { re: new RegExp(`\\b(a|an)\\s+((?:very\\s+|really\\s+)?(?:${ADJ}))\\s+([a-z]+s)\\b(?=\\s*[.,;:!?)]|\\s*$|\\s+(?:and|or|but|are|were|for|in|on|at|with|to|that|which|who|from|of|because|so|I|we|he|she|they|it|the|a|today|yesterday)\\b)`, 'gi'), type: 'agreement', l1: true, minLevel: 'A1', pluralNoun: 3, topics: ['articles', 'articles-a-an', 'plurals', 'adjectives-basic', 'countable-uncountable'], title: 'a / an + plural noun', he_title: 'a / an עם רבים', en: 'a and an go with one thing only: a new shoe, or new shoes.', he: 'a ו-an באים רק לפני דבר אחד: a new shoe, או new shoes בלי a.', ex: (m) => `${m[2]} ${m[3]}` },
  // results / findings + a singular verb: "The results was clear".
  { re: /\b(results|findings|figures|statistics)\s+(was|is|has|shows|suggests|indicates|proves|wasn't|isn't|hasn't|doesn't)\b/gi, type: 'agreement', l1: true, minLevel: 'A2', notAfter: /\b(of|in|on|for|with|from|about|the\s+\w+\s+of)\s+$/i, topics: ['research-writing', 'present-simple-third-person', 'synthesis-citation'], title: 'Plural subject, plural verb', he_title: 'נושא ברבים, פועל ברבים', en: (m) => `${m[1]} is plural: ${m[1]} ${PLURAL_VERB[m[2].toLowerCase()]}.`, he: (m) => `${m[1]} היא מילה ברבים: ${m[1]} ${PLURAL_VERB[m[2].toLowerCase()]}.`, ex: (m) => `${m[1]} ${PLURAL_VERB[m[2].toLowerCase()]}` },
  // The number of + plural noun takes a singular verb: "The number of students increase" (increases).
  { re: new RegExp(`\\b(the number of\\s+(?:[a-z]+\\s+)?[a-z]+s)\\s+(are|were|have|${BASE})\\b(?!['’-])`, 'gi'), type: 'agreement', l1: true, minLevel: 'A2', topics: ['present-simple-third-person', 'research-writing', 'quantifiers'], title: 'The number of … + verb with -s', he_title: 'The number of ופועל ביחיד', en: '"The number" is the subject, and it is singular: the number of students increases.', he: 'הנושא הוא the number, והוא ביחיד: the number of students increases.', ex: (m) => `${m[1]} ${{ are: 'is', were: 'was', have: 'has' }[m[2].toLowerCase()] || s3(m[2])}` },
  // research is uncountable: "Researches show", "many researches" (but "She researches the topic" is a verb).
  { re: /\b(?:(?:many|some|several|the|these|those|recent|previous|other|new|different|various|few|more)\s+researches|researches(?=\s+(?:show|shows|suggest|suggests|indicate|indicates|found|find|have|has|prove|proves|are|were|say|says|claim|claims|confirm|confirms|point)\b))\b/gi, type: 'countability', l1: true, minLevel: 'A2', topics: ['countable-uncountable', 'research-writing'], title: 'research is uncountable', he_title: 'research בלי s', en: 'research is uncountable: research shows, or studies show.', he: 'research היא מילה שאי אפשר לספור, ולכן בלי s: research shows, או studies show.', ex: 'research shows / studies show' },
  // it is + base verb: "It is depend on the weather" (It depends).
  { re: /\b(it|he|she|this|that)\s+(is|was|'s)\s+(depend|seem|matter|exist|belong|include|require|contain|consist|happen|involve|affect|want|know|agree|understand|believe|prefer|need)\b(?![-'’])/gi, type: 'verb-form', l1: true, minLevel: 'A1', topics: ['present-simple', 'present-simple-third-person', 'present-simple-questions-negatives'], title: 'is + verb', he_title: 'is מיותר לפני פועל', en: 'Use the verb alone, not is + verb: it depends.', he: 'משתמשים בפועל לבד, בלי is: it depends.', ex: (m) => (m[2].toLowerCase() === 'was' ? `${m[1]} ${pastSimple(m[3])}` : `${m[1]} ${s3(m[3])}`) },
  // Since / Because …, so … (מכיוון ש... אז).
  { re: /(?<=^|[.!?]\s+|\n)(Since|Because)\s+[^.!?;,]{3,},\s*so\b(?!\s+(?:many|much|few|little|far|long|often|that)\b)/g, type: 'conjunction', l1: true, minLevel: 'A2', topics: ['connectors-basic', 'connectors-contrast', 'cohesion-devices'], pick: (m) => `${m[1]} …, so`, title: 'Because / Since … so', he_title: 'Because / Since בלי so', en: 'Use because (or since) or so, not both.', he: 'באנגלית בוחרים אחד: because (או since) או so, לא את שניהם.', ex: 'Because it was late, we left. / It was late, so we left.' },
  // A name in lower case after "my name is" or "I live in": "my name is yosef", "i live in holon".
  { re: /\b(?:[Mm]y name is|[Mm]y name's|[Ii] live in|[Ii]'m from|[Ii] am from|[Ii] come from|[Ii] was born in|[Ww]e live in)\s+([a-z][a-z'-]+)(?:\s+([a-z][a-z'-]+)(?=\s*[.,!?]|\s*$))?/g, type: 'capitalization', l1: true, name: true, pick: (m) => [m[1], m[2]].filter(Boolean).join(' '), title: 'Capital letter for names', he_title: 'אות גדולה בשמות', en: 'Names of people and places start with a capital letter.', he: 'שמות של אנשים ומקומות מתחילים באות גדולה.', ex: (m) => cap([m[1], m[2]].filter(Boolean).join(' ')) },
];

const METHODS = /\b(participants|respondents|interviewees|subjects|completed|were asked|were given|were interviewed|questionnaire|the sample)\b/i;
// From stage 8 (critical thinking), sweeping claims are highlighted for the learner to check, not as errors.
const CLAIMS = { re: /\b(all|every|never|always|everyone|everybody|nobody|no one|nothing|everything|proves?|proved|proven)\b/gi, type: 'claim', soft: true, max: 6, notAfter: /\b(not|almost|nearly|virtually|hardly|at|after|above|of|for|all in)\s+$/i, notBefore: /^(?:all\s+in\s+all\b|(?:every|all|each)\s+(?:the\s+)?(?:year|day|week|month|morning|evening|night|time|summer|winter|weekend|hour|minute|semester|term|session|lesson)s?\b)/i, claim: true, title: 'Sweeping claim?', he_title: 'טענה גורפת?', en: 'A sweeping word: is it true in every case? Support it with evidence, or limit it (most, often, in this study).', he: 'מילה גורפת: האם זה נכון בכל מקרה? תמכו בראיות, או סייגו (most, often, in this study).' };

// The full form of a contraction, for formal writing: can't is "cannot", not "can not" (RW-12).
const FULL = { "can't": 'cannot', "won't": 'will not', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "aren't": 'are not', "wasn't": 'was not', "weren't": 'were not', "it's": 'it is', "i'm": 'I am', "we're": 'we are', "they're": 'they are', "you're": 'you are', "i've": 'I have', "we've": 'we have', "i'd": 'I would', "that's": 'that is', "there's": 'there is', "let's": 'let us', "wouldn't": 'would not', "shouldn't": 'should not', "couldn't": 'could not' };
export const fullForm = (w) => { const f = FULL[String(w).toLowerCase()] || w; return /^[A-Z]/.test(w) && !/^I\b/.test(f) ? f[0].toUpperCase() + f.slice(1) : f; };
const FORMAL_PATTERNS = [
  { re: /\b(don't|doesn't|didn't|can't|won't|isn't|aren't|wasn't|weren't|it's|I'm|we're|they're|you're|I've|we've|I'd|that's|there's|let's|wouldn't|shouldn't|couldn't)\b/gi, type: 'register', title: 'Contraction in formal writing', he_title: 'קיצור בכתיבה רשמית', en: 'In formal essays write the full form.', he: 'בחיבור רשמי כותבים את הצורה המלאה.', ex: (m) => fullForm(m[1]) },
  { re: /\b(gonna|wanna|gotta|kinda|sorta|stuff|guys|kids|awesome|cool|okay|ok|lots of|a lot of|really|totally|pretty much|nowadays)\b/gi, type: 'register', title: 'Informal word', he_title: 'מילה לא רשמית', en: 'Too informal for an academic text: choose a more precise, formal word.', he: 'לא רשמי מדי לטקסט אקדמי: בחרו מילה מדויקת ורשמית יותר.' },
  { re: /\b(I think|I feel|in my opinion)\b/gi, type: 'register', title: 'Personal hedge', he_title: 'ניסוח אישי', en: 'Acceptable, but academic arguments usually state the claim and support it: "This essay argues that…".', he: 'מותר, אבל בטיעון אקדמי מציגים את הטענה ותומכים בה.' },
];

// "yet", "next", "first" and "second" are linkers only where they join ideas ("Yet it failed", ", yet it",
// "Next, ...", "First, ..."), not in "not yet", "next week" or "the first time" (persona panel Y6).
const LINKER_ONLY_AT = {
  yet: /(^|[.!?;:]\s+|,\s*|\n\s*|\band\s+)yet\b(?!\s*[.!?]|\s*$)/i,
  next: /(^|[.!?]\s+|\n\s*)next\s*,/i,
  first: /(^|[.!?]\s+|\n\s*)first\s*,/i,
  second: /(^|[.!?]\s+|\n\s*)second\s*,/i,
};
const CONNECTORS = {
  addition: ['and', 'also', 'moreover', 'furthermore', 'in addition', 'besides', 'what is more'],
  contrast: ['but', 'however', 'although', 'though', 'whereas', 'while', 'on the other hand', 'nevertheless', 'nonetheless', 'yet', 'despite', 'in spite of', 'conversely'],
  cause: ['because', 'since', 'as a result of', 'due to', 'owing to'],
  result: ['so', 'therefore', 'thus', 'consequently', 'as a result', 'hence'],
  example: ['for example', 'for instance', 'such as', 'in particular', 'to illustrate'],
  sequence: ['first', 'firstly', 'second', 'secondly', 'then', 'next', 'after that', 'finally', 'lastly'],
  conclusion: ['in conclusion', 'to conclude', 'to sum up', 'overall', 'in summary', 'all in all'],
};

// Several patterns read as one: exec() returns the match that starts first.
const earliest = (...res) => ({ exec: (text) => res.map((re) => re.exec(text)).filter(Boolean).sort((a, b) => a.index - b.index)[0] || null });
const SIGNALS = {
  thesis: /\b(I (strongly )?(believe|argue|maintain|contend|think)( that)?|in my (view|opinion)|this (essay|paper) (will )?(argue|argues|contend|contends|maintain|maintains|demonstrate|demonstrates|show|shows)|I would argue|the (central|main) (argument|claim) (of this|here) is)\b/i,
  counter: /\b(some (people )?(argue|claim|believe|say|maintain)|opponents|critics|supporters of|it (could|might|may) be argued|admittedly|one (could|might) object|proponents|others (argue|believe|claim))\b|\b[A-Z][\w'’-]+(?: (?:and|&) [A-Z][\w'’-]+| et al\.)? \((?:19|20)\d{2}\) (argues|argue|claims|claim|insists|maintains|contends|believes|objects)\b/i,
  rebuttal: earliest(/\bhowever\b(?=[^.!?]*?\b(?:overlook\w*|ignor\w*|fail\w*|neglect\w*|miss\w*|but|yet|not|outweigh\w*|wrong|flaw\w*|weak\w*|cannot|unconvincing|misleading|exaggerat\w*|less)\b|[^.!?]*?n't\b)/i, /\b(nevertheless|nonetheless|yet this|this (view|argument|claim) (overlooks|ignores|fails|neglects)|while this (may|might) be true|but this|on closer (inspection|examination))\b/i),
  // An author-year citation is evidence too: "(Merrow, 2025)", "Ferrant and Oyelaran (2024) suggest" (RW-6).
  // The words match in any case ("For example," opens a sentence); a citation needs its capital, so it has its own
  // case-sensitive pattern, and the earlier of the two matches is the one shown.
  evidence: earliest(
    /\b(for (example|instance)|such as|according to|research|stud(y|ies)|survey|data|statistics|evidence|\d+(\.\d+)?\s?(%|per ?cent)|in \d{4})\b/i,
    /\([A-Z][^()]{1,100}?,? (?:19|20)\d{2}[a-z]?\)|\b[A-Z][\w'’-]+(?: (?:and|&) [A-Z][\w'’-]+| et al\.)? \((?:19|20)\d{2}\)/,
  ),
  conclusion: /\b(in conclusion|to conclude|to sum up|in summary|overall|all in all|ultimately)\b/i,
  hedging: /\b(may|might|could|arguably|tends? to|likely|unlikely|suggests?|appears? to|seems? to|to some extent|in some cases)\b/i,
};

// From stage 8 a bare "research shows" is not evidence (RW-3): a citation, an attributed source ("according to the
// City Office", "Okafor found"), a figure, or an example. The most informative match is the one shown.
const CITATION = /\([A-Z][^()]{1,100}?,? (?:19|20)\d{2}[a-z]?\)|\b[A-Z][\w'’-]+(?: (?:and|&) [A-Z][\w'’-]+| et al\.)? \((?:19|20)\d{2}\)/;
const ATTRIBUTED = /\b[Aa]ccording to (?:the |a |an )?[A-Z][\w'’-]*|\b(?:study|survey|report|review|paper|analysis|research)\s+(?:by|from)\s+(?:the\s+)?[A-Z][\w'’-]*|\b(?!(?:The|This|That|These|Those|A|An|It|They|We|I|He|She|Research|Studies|Study|Survey|Data|Evidence|One|Some|Many|Most|Recent|New|Our|My|Their|Such|Experts?|Scientists|Researchers|People|Everyone)\b)[A-Z][a-z][\w'’-]*(?:['’]s\s+(?:study|survey|report|research|data|review|team))?(?:\s+(?:and|&)\s+[A-Z][\w'’-]+|\s+et al\.)?\s+(?:found|finds|showed|shows|reported|reports|concluded|concludes|estimated|estimates|demonstrated|demonstrates|observed|observes|noted|notes|recorded|records)\b/;
const FIGURE = /(?<![\w.])\d+(?:[.,]\d+)?\s?(?:%|per ?cent\b)|(?<![\w.])\d{2,}(?:,\d{3})*\s+(?:people|students|respondents|participants|homes|residents|cases|schools|users|workers|patients|children|adults)\b/i;
const EXAMPLE = /\b(for (example|instance)|such as)\b/i;
const STRICT_EVIDENCE = { exec: (t) => [CITATION, ATTRIBUTED, FIGURE, EXAMPLE].map((re) => re.exec(t)).find(Boolean) || null };
const BARE_RESEARCH = /\b(research|stud(?:y|ies)|surveys?|experts)\b/i;
const BARE_NOTE = { type: 'evidence', soft: true, title: 'Research, no source', he_title: 'מוזכר מחקר, בלי מקור', en: 'Research is mentioned, but not its source: say who found it and when (author, year), or give the figure.', he: 'מוזכר מחקר, אבל לא המקור שלו: כתבו מי מצא ומתי (author, year), או תנו את המספר.' };
function bareResearch(raw) {
  const out = [];
  const seen = new Set();
  for (const s of sentencesOf(raw)) {
    const m = BARE_RESEARCH.exec(s);
    if (!m || STRICT_EVIDENCE.exec(s) || seen.has(m[1].toLowerCase()) || out.length >= 3) continue;
    seen.add(m[1].toLowerCase());
    out.push({ ...BARE_NOTE, match: m[1], index: raw.indexOf(s) + m.index });
  }
  return out;
}

// "by the time" and the other multi-word subordinators open a clause too ("By the time it started, I had ...");
// one leading coordinator is skipped first ("But by the time ..., I had", RW-2, student-27).
const SUBORDINATE = /^(?:(?:and|but|so|or|yet)\s+)?(if|when|whenever|although|though|because|while|whilst|after|before|since|unless|as|once|until|even if|even though|whether|where|wherever|by the time|as soon as|as long as|now that|so that|in case|given that|provided that|the moment|every time)\b/i;
// A comma after a sentence-initial linker, adverb or short prepositional phrase is correct
// ("However, this does...", "In 2022, there were...", "According to the report, it is...").
const LINKER = /^(however|moreover|furthermore|therefore|thus|hence|consequently|nevertheless|nonetheless|conversely|meanwhile|instead|otherwise|similarly|likewise|indeed|still|besides|admittedly|ultimately|overall|today|yesterday|tomorrow|now|then|finally|first|second|third|lastly|next|also|nowadays|anyway|so|yes|no|well|sadly|in (fact|addition|contrast|short|brief|sum|summary|conclusion|particular|general|practice|theory|turn|other words|the end|the meantime|my (view|opinion|experience)|this (case|sense|way|respect))|for (example|instance)|as a result|of course|on the other hand|on the one hand|at the same time|by contrast|on balance|on the whole|by and large|as a rule|after all|above all|even so|that said|having said that|at (first|last)|first of all|all in all|to (sum up|conclude|summari[sz]e|begin( with)?|start with|be (fair|honest)|my mind|some extent|put it simply)|put (simply|briefly|another way)|simply put|(last|next|this|that|every) (year|month|week|weekend|summer|winter|spring|autumn|time|morning|evening|night)|(a|one|two|three|a few|many|several|\d+) (years?|months?|weeks?|days?) (ago|later)|these days|for (this|that|these|those) reasons?|\w+ly)$/i;
const PREP_PHRASE = /^(in|on|at|by|for|with|during|after|before|despite|across|among|between|within|without|under|over|from|according to|throughout|unlike|like|compared (to|with)|in the case of)\s/i;
const FINITE = /\b(am|is|are|was|were|be|been|has|have|had|do|does|did|will|would|can|could|should|must|may|might)\b/i;
const leadInOk = (lead) => SUBORDINATE.test(lead) || LINKER.test(lead) || (PREP_PHRASE.test(lead) && countWords(lead) <= 7 && !FINITE.test(lead));
// Low-precision rules are not run above B2, where they mostly flag correct academic prose (persona panel P-74).
const ADVANCED = new Set(['C1', 'C2']);

// a or an by sound: initialisms read letter by letter (an MBA, a UN report), yoo- and w- sounds take a
// (a unanimous vote, a utilitarian view, a one-off), silent h takes an. null = not sure, never flagged.
const AN_LETTER = /^[AEFHILMNORSX]/;
export function articleFor(word) {
  // Three capitals with a vowel in the middle may be read as a word (a SIM card, an SAT score): not checked.
  if (/^[B-DF-HJ-NP-TV-Z][AEIOU][B-DF-HJ-NP-TV-Z]s?$/.test(word)) return null;
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

// An email or message ends with a sign-off ("Best,\nDana", "Thanks!\nTal"): it is not a sentence, so it is not
// checked for punctuation and does not count as the text's last sentence (persona panel Y6).
const SIGN_OFF = /^(best( wishes| regards)?|kind regards|warm regards|regards|many thanks|thanks( again| a lot| so much)?|thank you( so much)?|cheers|sincerely|yours( sincerely| faithfully| truly)?|all the best|love|take care|see you( soon)?|speak soon|talk soon)\s*[,.!]?$/i;
export function splitSignOff(text) {
  const all = String(text || '').replace(/\s+$/, '');
  const lines = all.split('\n');
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
    if (!SIGN_OFF.test(lines[i].trim())) continue;
    const after = lines.slice(i + 1).map((l) => l.trim()).filter(Boolean);
    if (after.length <= 2 && after.every((l) => countWords(l) <= 4)) return { body: lines.slice(0, i).join('\n'), signOff: lines.slice(i).join('\n').trim() };
  }
  return { body: all, signOff: '' };
}
const GREETING = /^(hi|hello|hey|dear|good (morning|afternoon|evening)|greetings|to whom it may concern)\b/i;
const REQUEST = /\?|\b(please|could you|would you|can you|could we|can we|would it be possible|I would be grateful|I'd be grateful|I would appreciate|I'd appreciate|let me know|I would like to ask|may I ask)\b/i;
// Text types that are not argued: an email or a message gets no argument checks (persona panel Y6).
export const NOT_ARGUED = new Set(['email', 'message']);

// Runs the pattern rules over the text. A match is skipped when it is a known false alarm: a comma after a
// fronted clause or linker ("If it rains, we will stay"), if + will in an indirect question ("It is unclear if
// this will last"), the right article, or a word around it that makes it correct (notAfter, notBefore).
function findIssues(raw, patterns, { level = 'B1', kind = null } = {}) {
  const advanced = ADVANCED.has(level);
  const li = Math.max(0, LEVELS.indexOf(level));
  const issues = [];
  const seen = new Set();
  // A story about the past: a past time or a past form of be or do anywhere in the text (RW-4).
  const ctx = { past: /\b(yesterday|last (?:night|week|month|year|time|weekend)|ago|was|were|did|didn't)\b/i.test(raw) };
  const skip = (p, m) => {
    if (p.leadInOk && leadInOk(raw.slice(sentenceStart(raw, m.index), m.index).trim())) return true;
    if (p.spliceLead) {
      const lead = raw.slice(sentenceStart(raw, m.index), m.index).trim();
      const part = lead.split(/[:;/(]/).pop().trim();
      return leadInOk(part) || /^however\b/i.test(part) || !FINITE.test(part) || countWords(part) < 3 || part.includes(',');
    }
    // One error, one item (RW-1): "the results was" is the "results + plural verb" rule's from A2, not this one's too.
    if (p.deferTo && li >= LEVELS.indexOf(p.deferTo.minLevel) && p.deferTo.re.test(m[p.deferTo.group])) return true;
    if (p.notAfter && p.notAfter.test(raw.slice(Math.max(0, m.index - 30), m.index))) return true;
    if (p.notBefore && p.notBefore.test(raw.slice(m.index))) return true;
    if (p.skipWord && p.skipWord.test(m[1])) return true;
    if (p.skipPair && p.skipPair.test(`${m[1]} ${m[2]}`)) return true;
    if (p.article) { const want = articleFor(m[2]); return !want || want === m[1].toLowerCase(); }
    if (p.thisPlural) {
      const w = m[1].toLowerCase();
      // Flagged only when what follows shows a plural ("this tools are", "this tools.").
      if (SINGULAR_S.has(w) || VERB_S.has(w) || /(ss|us|is|ics|ous|'s)$/.test(w)) return true;
      if (!m[2]) return !/^\s*([.,;:!?)]|$)/.test(raw.slice(m.index + m[0].length));
      const next = m[2].toLowerCase();
      if (PLURAL_NEXT.has(next)) return false;
      // Mid-sentence ("this tools in the university", RW-1): a preposition follows a known count noun in the plural,
      // which is not also a verb ("This results in", "This refers to" stay clean).
      return !(PREP_AFTER_NOUN.has(next) && THIS_NOUN.has(w.replace(/(?<=[^aeiou])ies$/, 'y').replace(/(?<=(ch|sh|x))es$|s$/, '')) && !(w === 'results' && /^(in|from)$/.test(next)));
    }
    if (p.name) return NOT_NAME.has(m[1].toLowerCase()) || (m[2] && NOT_NAME.has(m[2].toLowerCase()));
    if (p.pluralNoun) return notPluralNoun(m[p.pluralNoun]);
    if (p.claim) {
      // "he learns nothing": nothing as the object of a verb is not a claim about every case (RW-3).
      if (/^nothing$/i.test(m[1]) && /[a-z']+\s+$/.test(raw.slice(Math.max(0, m.index - 20), m.index))) return true;
      // A methods sentence describes what was done: "All participants completed every task."
      const end = raw.slice(m.index).search(/[.!?\n]/);
      const sentence = raw.slice(sentenceStart(raw, m.index), end < 0 ? raw.length : m.index + end);
      if (METHODS.test(sentence)) return true;
    }
    if (p.jobMods) return m[1].trim().split(/\s+/).some((w) => NOT_JOB_MOD.has(w.toLowerCase()) || /ly$/i.test(w));
    return false;
  };
  for (const p of patterns) {
    if (p.lowPrecision && advanced) continue;
    if (p.minLevel && li < LEVELS.indexOf(p.minLevel)) continue;
    if (p.kinds && !p.kinds.includes(kind)) continue;
    p.re.lastIndex = 0;
    let m;
    let count = 0;
    while ((m = p.re.exec(raw)) && count < (p.max || 3)) {
      if (m.index === p.re.lastIndex) p.re.lastIndex++;
      if (skip(p, m)) continue;
      const match = (p.pick ? p.pick(m) : m[0]).trim();
      const msg = p.article ? ARTICLE[articleFor(m[2])] : p;
      const key = `${p.type}:${match.toLowerCase()}`;
      const say = (x) => (typeof x === 'function' ? x(m, ctx) : x);
      if (!seen.has(key)) { seen.add(key); issues.push({ type: p.type, title: msg.title, he_title: msg.he_title, en: say(msg.en), he: say(msg.he), ...(p.ex ? { ex: say(p.ex) } : {}), match, index: m.index, ...(p.l1 ? { l1: true } : {}), ...(p.soft ? { soft: true } : {}), ...(p.topics || TOPIC_OF[msg.title] ? { topics: p.topics || TOPIC_OF[msg.title] } : {}) }); }
      count++;
    }
  }
  return issues;
}

// The Hebrew-speaker rules alone, for a short reply in a learner's own words (a scenario turn, RW-3).
export function l1Issues(text, { level = 'B1', kind = null } = {}) {
  return findIssues(String(text || ''), [...PATTERNS.filter((p) => !p.lowPrecision && !p.article && p.type !== 'punctuation'), ...L1_PATTERNS], { level, kind }).sort((a, b) => a.index - b.index);
}

// The lesson topics each older rule belongs to, so a lesson's own rules come first (RW-1). The newer rules carry
// their topics on the rule itself.
const THIRD = ['present-simple', 'present-simple-third-person', 'present-simple-questions-negatives', 'present-simple-vs-continuous'];
const TOPIC_OF = {
  'Verb after he / she / it': THIRD, 'every / each + verb with -s': [...THIRD, 'quantifiers'], 'Singular subject, verb with -s': THIRD, 'people + verb without -s': THIRD, 'everyone + verb with -s': THIRD, 'An -ing subject is singular': [...THIRD, 'gerund-infinitive'],
  'did + base verb': ['past-simple-questions', 'past-simple-irregular', 'past-simple-regular'],
  'Past time: past simple': ['present-perfect', 'present-perfect-vs-past', ...PAST_TOPICS],
  'Although … but': ['connectors-contrast', 'connectors-basic', 'cohesion-devices'],
  'a / an before a singular noun': ['articles', 'articles-a-an', 'countable-uncountable'], 'a / an before a job': ['articles', 'articles-a-an', 'personal-info'],
  'an before a vowel sound': ['articles', 'articles-a-an'], 'a before a consonant sound': ['articles', 'articles-a-an'],
  'this / these': ['demonstratives', 'plurals'], 'Uncountable noun': ['countable-uncountable', 'quantifiers', 'some-any'],
  'Double comparative': ['comparatives', 'superlatives'], 'No will after if': ['conditionals-0-1', 'conditionals-2'],
  'modal + base verb': ['modal-can', 'modals-obligation-advice'], 'Inversion after Rarely / Never': ['inversion-cleft'],
  'Question word order': ['wh-questions', 'past-simple-questions', 'present-simple-questions-negatives'],
  'Contraction in formal writing': ['register', 'style-nuance'], 'Informal word': ['register', 'style-nuance'],
};
export function analyzeWriting(text, { level = 'B1', minWords = 0, maxWords = null, mustInclude = [], formal = null, kind = null, stage = 0, sources = null, topic = null } = {}) {
  const { body, references } = splitReferences(text);
  const raw = splitSignOff(body).body;
  const refWords = references ? countWords(references) : 0;
  const words = countWords(body); // a sign-off is not checked, but its words count
  const sentences = sentencesOf(raw);
  const headings = new Set(linesOf(raw).filter((l) => l.heading).map((l) => l.text));
  const paragraphs = raw.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p && !headings.has(p.replace(/\s+/g, ' ')));
  const advanced = ADVANCED.has(level);
  const lower = (raw.toLowerCase().match(/[a-z']+/g) || []);
  const types = new Set(lower);
  const lens = sentences.map((s) => countWords(s));
  const isFormal = !NOT_ARGUED.has(kind) && (formal ?? FORMAL_LEVELS.has(level));

  const checks = [];
  const refNote = refWords ? { en: `; the reference list (${refWords} words) is not counted`, he: `; רשימת המקורות (${refWords} מילים) לא נספרת` } : { en: '', he: '' };
  if (minWords) checks.push({ id: 'length', ok: words >= minWords && (!maxWords || words <= maxWords * 1.1), en: maxWords ? `${words} words (target ${minWords}-${maxWords}${refNote.en})` : `${words} words (at least ${minWords}${refNote.en})`, he: maxWords ? `${words} מילים (יעד ${minWords}-${maxWords}${refNote.he})` : `${words} מילים (לפחות ${minWords}${refNote.he})` });
  for (const w of mustInclude) {
    const ok = new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(raw);
    checks.push({ id: `must:${w}`, ok, en: `Uses "${w}"`, he: `הטקסט משתמש ב-״${w}״` });
  }
  const capsOk = sentences.length === 0 || sentences.every((s) => /^["'“(]?[A-Z0-9]/.test(s));
  checks.push({ id: 'caps', ok: capsOk, en: 'Every sentence starts with a capital letter', he: 'כל משפט מתחיל באות גדולה' });
  const endOk = !raw.trim() || /[.!?"”)]$/.test(raw.trim());
  checks.push({ id: 'end', ok: endOk, en: 'The text ends with punctuation', he: 'הטקסט מסתיים בסימן פיסוק' });
  // An email opens with a greeting, makes one clear request and ends with a sign-off (RW-8). The sign-off is the
  // closing line before the name ("Best,", "Thanks,"), found by splitSignOff.
  if (kind === 'email' && raw.trim()) {
    const first = String(body).trim().split('\n')[0].trim();
    checks.push({ id: 'greeting', ok: GREETING.test(first), en: 'Opens with a greeting, such as "Hi Tom" or "Dear Ms Levi"', he: 'פותחים בפנייה, כמו Hi Tom או Dear Ms Levi' });
    checks.push({ id: 'request', ok: REQUEST.test(raw), en: 'Makes a clear request: a question, or "please" or "could you"', he: 'יש בקשה ברורה: שאלה, או please או could you' });
    checks.push({ id: 'signoff', ok: Boolean(splitSignOff(body).signOff), en: 'Ends with a sign-off and your name, such as "Best" or "Kind regards"', he: 'מסיימים בברכת סיום ובשם, כמו Best או Kind regards' });
  }
  if (words >= 150) checks.push({ id: 'paragraphs', ok: paragraphs.length >= 3, en: `${paragraphs.length === 1 ? '1 paragraph' : `${paragraphs.length} paragraphs`} (aim for 3 or more)`, he: `${paragraphs.length === 1 ? 'פסקה אחת' : `${paragraphs.length} פסקאות`} (כדאי 3 לפחות)` });

  const issues = findIssues(raw, [...PATTERNS, ...L1_PATTERNS, ...(isFormal ? FORMAL_PATTERNS : []), ...(stage >= 8 ? [CLAIMS] : [])], { level, kind });
  const longest = advanced ? 55 : 40;
  lens.forEach((n, i) => { if (n > longest) issues.push({ type: 'punctuation', title: 'Very long sentence', he_title: 'משפט ארוך מאוד', en: `A ${n}-word sentence: consider splitting it for clarity.`, he: `משפט של ${n} מילים: שקלו לפצל אותו.`, match: sentences[i].slice(0, 60) + '…' }); });
  const starts = sentences.map((s) => (s.match(/^[A-Za-z']+/) || [''])[0].toLowerCase()).filter(Boolean);
  const startCounts = starts.reduce((m, w) => m.set(w, (m.get(w) || 0) + 1), new Map());
  for (const [w, n] of startCounts) if (n >= 4 && n / sentences.length >= 0.5 && !['the', 'a'].includes(w)) issues.push({ type: 'cohesion', title: 'Repeated sentence opening', he_title: 'פתיחה חוזרת', en: `${n} sentences start with "${w}". Vary how sentences begin.`, he: `${n} משפטים מתחילים ב-״${w}״. כדאי לגוון.`, match: w });

  const connectors = {};
  for (const [cat, list] of Object.entries(CONNECTORS)) {
    const found = list.filter((c) => (LINKER_ONLY_AT[c] || new RegExp(`\\b${c}\\b`, 'i')).test(raw));
    if (found.length) connectors[cat] = found;
  }
  const signals = stage >= 8 ? { ...SIGNALS, evidence: STRICT_EVIDENCE } : SIGNALS;
  const found = NOT_ARGUED.has(kind) ? {} : Object.fromEntries(Object.entries(signals).map(([k, re]) => [k, re.exec(raw)?.[0] || null]));
  if (stage >= 8 && !NOT_ARGUED.has(kind)) issues.push(...bareResearch(raw));
  const structure = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, Boolean(v)]));
  // The phrase behind each tick, so the learner can judge it (RW-6).
  const structureMatch = Object.fromEntries(Object.entries(found).filter(([, v]) => v));
  const sourceUse = sources?.length ? checkSources(raw, sources) : null;
  if (sourceUse) issues.push(...sourceUse.issues);

  return {
    stats: {
      words, reference_words: refWords, sentences: sentences.length, paragraphs: paragraphs.length,
      avg_sentence: sentences.length ? +(words / sentences.length).toFixed(1) : 0,
      longest_sentence: lens.length ? Math.max(...lens) : 0,
      unique_words: types.size,
      lexical_variety: lower.length ? +(types.size / Math.sqrt(lower.length)).toFixed(2) : 0, // Guiraud index: less length-sensitive than raw type-token ratio
    },
    checks,
    issues: topicFirst(issues.sort((a, b) => (a.index ?? 1e9) - (b.index ?? 1e9)), topic),
    connectors,
    structure,
    structureMatch,
    sources: sourceUse ? { cited: sourceUse.cited, uncited: sourceUse.uncited, other: sourceUse.other, overlaps: sourceUse.issues.length } : null,
    passedRequired: checks.filter((c) => c.id === 'length' || c.id.startsWith('must:')).every((c) => c.ok),
  };
}

// The lesson's own topic rules first (RW-1). topic is a lesson topic id or a list of them; each matching issue is
// marked topic: true, and the order is otherwise kept.
function topicFirst(issues, topic) {
  const want = new Set([].concat(topic || []).filter(Boolean));
  if (!want.size) return issues;
  issues.forEach((i) => { if (i.topics?.some((t) => want.has(t))) i.topic = true; });
  return [...issues.filter((i) => i.topic), ...issues.filter((i) => !i.topic)];
}

// What the automatic checks found, for the status line under the editor and the heading of the checks panel
// (RW-2, RW-4; r4 RW-2). One list of items: failed checks (length first, with the missing words counted), each
// distinct issue title, each kind of note (sweeping words, research with no source ...) and uncited sources. n is
// that list's length, so "3 shown and N more" always adds up. It never says "no problems" while a check fails, and
// it says what is checked, not that the text is correct. items keeps each label apart, so the UI can isolate each
// English label on its own and keep the Hebrew commas outside them.
export function checkSummary(a, { minWords = 0, maxWords = null } = {}) {
  if (!a) return null;
  const words = a.stats.words;
  const short = minWords && words < minWords ? minWords - words : 0;
  const over = maxWords && words > maxWords * 1.1 ? words - maxWords : 0;
  const LABEL = {
    length: short ? [`אורך (חסרות ${short === 1 ? 'מילה אחת' : `${short} מילים`})`, `length (${short} word${short === 1 ? '' : 's'} short)`] : [`אורך (${over} מילים מעל היעד)`, `length (${over} words over)`],
    caps: ['אות גדולה בתחילת משפט', 'capital letters'],
    end: ['סימן פיסוק בסוף', 'final punctuation'],
    paragraphs: ['פסקאות', 'paragraphs'],
    greeting: ['פנייה בהתחלה', 'a greeting'],
    request: ['בקשה ברורה', 'a clear request'],
    signoff: ['ברכת סיום', 'a sign-off'],
  };
  const failed = a.checks.filter((c) => !c.ok).map((c) => ({ id: c.id, label: LABEL[c.id] || (c.id.startsWith('must:') ? [`חובה לכלול ${c.id.slice(5)}`, `must include ${c.id.slice(5)}`] : [c.he, c.en]) }));
  const errors = a.issues.filter((i) => !i.soft);
  const soft = a.issues.filter((i) => i.soft);
  const titles = [...new Map(errors.map((i) => [i.title, [i.he_title, i.title]])).values()];
  // A kind of note counts once, with how many there are: "מילים גורפות (2)".
  const NOTE = { 'Sweeping claim?': [(n) => (n === 1 ? 'מילה גורפת אחת' : `${n} מילים גורפות`), (n) => `${n} sweeping word${n === 1 ? '' : 's'}`] };
  const noteKinds = [...soft.reduce((m, i) => m.set(i.title, [...(m.get(i.title) || []), i]), new Map())].map(([title, list]) => (NOTE[title] ? [NOTE[title][0](list.length), NOTE[title][1](list.length)] : [list[0].he_title, list[0].title]));
  const uncited = a.sources?.uncited?.length || 0;
  const sourceItem = uncited ? [[uncited === 1 ? 'מקור אחד שלא צוטט' : `${uncited} מקורות שלא צוטטו`, `${uncited} source${uncited === 1 ? '' : 's'} not cited`]] : [];
  const items = [...failed.map((f) => f.label), ...titles, ...noteKinds, ...sourceItem];
  const n = items.length;
  const shown = items.slice(0, 3);
  const more = n - shown.length;
  const countHe = n === 1 ? 'דבר אחד לבדוק' : `${n} דברים לבדוק`;
  return {
    n, short, over, failed: failed.map((f) => f.id), errors: errors.length, notes: soft.length,
    items: items.map(([he, en]) => ({ he, en })), more,
    he: n ? `${countHe}: ${shown.map((x) => x[0]).join(', ')}${more ? ` ועוד ${more}` : ''}.` : 'לא מצאנו אף אחד מהדברים שאנחנו בודקים.',
    en: n ? `${n} thing${n === 1 ? '' : 's'} to check: ${shown.map((x) => x[1]).join(', ')}${more ? ` and ${more} more` : ''}.` : 'None of the things we check for came up.',
    head_he: n ? (n === 1 ? 'יש דבר אחד לבדוק' : `יש ${n} דברים לבדוק`) : 'לא מצאנו אף אחד מהדברים שאנחנו בודקים',
    head_en: n ? `${n} thing${n === 1 ? '' : 's'} to check` : 'None of the things we check for came up',
  };
}

// ---------- source-based tasks (RW-6) ----------
// A source in a task's pack: its label ("Source A"), author and year, from its title ("Source B · Opinion column
// (fictional): Dana Merrow (2025), ..."), and the words that identify it in a citation: a person's surname, or the
// words of an organisation's name that no other source in the pack shares.
const ORG_END = /(Office|Panel|Unit|Works|Systems|Association|Observatory|Weekly|Times|Courier|Council|Agency|Institute|Ministry|Bureau)$/;
export function parseSources(pack = []) {
  const parsed = pack.map((src, i) => {
    const title = String(src.title || '');
    const label = (title.split(' · ')[0] || `Source ${String.fromCharCode(65 + i)}`).trim();
    const m = title.match(/:\s*(.+?)\s*\(((?:19|20)\d{2})\)/);
    const author = m ? m[1].trim() : '';
    const year = m ? m[2] : '';
    const listed = /^[A-Z][\w'’-]+,\s*[A-Z]\./.test(author) ? author.split(',')[0] : null; // "Varga, E., Nandi, P., & Holm, J."
    const person = !listed && /^(Dr\s+)?[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/.test(author) && !ORG_END.test(author) ? author.split(/\s+/).pop() : null;
    const words = author.split(/\s+/).map((w) => w.replace(/['’]s?$/, '')).filter((w) => /^[A-Z]/.test(w) && w.length >= 4);
    return { label, letter: label.slice(-1), author, year, name: author ? `${author} (${year})` : label, keys: listed || person ? [listed || person] : words, org: !listed && !person, text: String(src.text || '') };
  });
  const all = parsed.map((p) => p.keys);
  parsed.forEach((p, i) => { if (!p.org) return; const others = new Set(all.filter((k, j) => j !== i).flat()); const own = p.keys.filter((k) => !others.has(k)); if (own.length) p.keys = own; });
  return parsed;
}
// Citations in the draft: "(Merrow, 2025)", "(Halvarden City Planning Office 2025)", "Merrow (2025)".
const CITE_PAREN = /\(([^()]{2,120}?),?\s+((?:19|20)\d{2})[a-z]?(?:,\s*pp?\.\s*\d+(?:-\d+)?)?\)/g;
const CITE_NARR = /\b([A-Z][\w'’-]+(?:\s+(?:[A-Z][\w'’-]+|of|for|and|&|et al\.))*)\s+\(((?:19|20)\d{2})[a-z]?\)/g;
export function citationsIn(text) {
  const out = [];
  for (const re of [CITE_PAREN, CITE_NARR]) for (const m of String(text).matchAll(re)) out.push({ author: m[1], year: m[2], text: m[0], index: m.index });
  return out;
}
const tokensOf = (t) => [...String(t).matchAll(/[A-Za-z0-9%]+(?:['’][A-Za-z]+)?/g)].map((m) => ({ w: m[0].toLowerCase().replace('’', "'"), i: m.index, e: m.index + m[0].length }));
const COPY_N = 7;
const FUNCTION_WORD = new Set(['the', 'a', 'an', 'of', 'on', 'in', 'at', 'to', 'and', 'or', 'for', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'it', 'its', 'this', 'that', 'as', 'be']);
// Which sources are cited, which are not, and every run of 7 or more words that matches a source word for word,
// unless it is in quotation marks with that source cited in the same sentence.
export function checkSources(raw, pack) {
  const srcs = parseSources(pack);
  const cites = citationsIn(raw);
  const citedBy = (src, list = cites) => list.some((c) => c.year === src.year && src.keys.some((k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(c.author)));
  const cited = srcs.filter((x) => citedBy(x)).map((x) => ({ label: x.label, name: x.name }));
  const uncited = srcs.filter((x) => !citedBy(x)).map((x) => ({ label: x.label, name: x.name }));
  const other = cites.filter((c) => !srcs.some((x) => citedBy(x, [c]))).map((c) => c.text);
  const draft = tokensOf(raw);
  const issues = [];
  for (const src of srcs) {
    const grams = new Set();
    const st = tokensOf(src.text).map((t) => t.w);
    for (let i = 0; i + COPY_N <= st.length; i++) grams.add(st.slice(i, i + COPY_N).join(' '));
    const covered = new Array(draft.length).fill(false);
    // A place or a name the learner must use ("on the northern edge of Orrin Fields") is not copying: a run whose
    // content words are at least half names, capitalised mid-sentence in the source, is skipped (RW-3).
    const names = new Set([...src.text.matchAll(/(?<=[a-z,;:'’)]\s+)[A-Z][\w'’-]*/g)].map((x) => x[0].toLowerCase().replace(/['’]s$/, '')));
    const mostlyNames = (ts) => { const content = ts.filter((t) => !FUNCTION_WORD.has(t.w)); return content.length > 0 && content.filter((t) => names.has(t.w.replace(/'s$/, ''))).length * 2 >= content.length; };
    for (let i = 0; i + COPY_N <= draft.length; i++) { const g = draft.slice(i, i + COPY_N); if (grams.has(g.map((t) => t.w).join(' ')) && !mostlyNames(g)) for (let j = i; j < i + COPY_N; j++) covered[j] = true; }
    for (let i = 0; i < draft.length; i++) {
      if (!covered[i]) continue;
      // A run stops at the end of a sentence, so each copied sentence is named on its own.
      let j = i; while (j + 1 < draft.length && covered[j + 1] && !/[.!?\n]/.test(raw.slice(draft[j].e, draft[j + 1].i))) j++;
      const from = draft[i].i; const to = draft[j].e;
      const start = sentenceStart(raw, from);
      const endM = /[.!?\n]/.exec(raw.slice(to)); const end = endM ? to + endM.index + 1 : raw.length;
      const sentence = raw.slice(start, end);
      const quoted = ((raw.slice(start, from).match(/["“”]/g) || []).length % 2) === 1;
      if (!(quoted && citedBy(src, citationsIn(sentence)))) {
        const phrase = raw.slice(from, to);
        const words = phrase.split(/\s+/);
        issues.push({ type: 'source', source: src.label, title: `Matches ${src.label} almost word for word`, he_title: `תואם ל${src.label.replace(/^Source\b/, 'מקור')}`, en: `This matches ${src.label} almost word for word: quote it and name the source, or put it in your own words.`, he: `תואם כמעט מילה במילה ל${src.label.replace(/^Source\b/, 'מקור')}: צטטו וציינו מקור, או נסחו מחדש.`, match: words.length > 14 ? `${words.slice(0, 12).join(' ')} …` : phrase, index: from });
      }
      i = j;
    }
  }
  return { cited, uncited, other: [...new Set(other)], issues };
}
