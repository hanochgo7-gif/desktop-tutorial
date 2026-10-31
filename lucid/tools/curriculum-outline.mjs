// Source of truth for the lesson sequence. Writes content/curriculum.json.
// Each lesson: id, level, title (en/he), topics (taxonomy ids), can-do objective, and
// coverage notes for authors. Lesson files live in content/lessons/<id>.json.
import { writeFileSync } from 'node:fs';

const L = (id, title_en, title_he, topics, can_do, cover, extra = {}) => ({ id, title_en, title_he, topics, can_do, cover, ...extra });
// Bilingual text: Hebrew instructions are given up to B1 (research C3, S1: English-first from B2).
const B = (en, he) => (he ? { en, he } : { en });

// Level final writing tasks. `task` is the one-line summary shown on the path; `instructions`, `topics` and
// `required_elements` are the full brief in the Writing lab (persona panel P-75). A topic with `assignment`
// uses that assignment's labelled, fictional source pack. No topic needs real-world facts the learner has
// to look up, except a C2 question of the learner's own, whose sources the learner checks.
const FINALS = {
  PreA1: {
    task: 'Introduce yourself in 5-6 simple sentences (name, age, country, job or studies, one thing you like).', task_he: 'הציגו את עצמכם ב-5-6 משפטים פשוטים באנגלית: שם, גיל, ארץ, עבודה או לימודים, ודבר אחד שאתם אוהבים.',
    min_words: 25, max_words: 70, stage: 1, kind: 'paragraph',
    instructions: B('Write 5-6 short sentences about yourself for a new friend who speaks English. Start every sentence with a capital letter and end it with a full stop.', 'כתבו 5-6 משפטים קצרים באנגלית על עצמכם, לחבר חדש שמדבר אנגלית. כל משפט מתחיל באות גדולה ונגמר בנקודה.'),
    required_elements: [B('your name', 'השם שלכם'), B('your age', 'הגיל שלכם'), B('where you are from', 'מאיפה אתם'), B('your job or your studies', 'העבודה או הלימודים שלכם'), B('one thing you like', 'דבר אחד שאתם אוהבים')],
  },
  A1: {
    task: 'Write a short introduction about yourself and your daily life (60-80 words).', task_he: 'כתבו באנגלית היכרות קצרה על עצמכם ועל סדר היום שלכם (60-80 מילים).',
    min_words: 60, max_words: 100, stage: 1, kind: 'paragraph',
    instructions: B('Write to a new online language partner. Introduce yourself, then describe a normal weekday: your morning, your day and your evening. Use the present simple, and words like always, usually and sometimes.', 'כתבו לשותף חדש ללימוד שפה באינטרנט. הציגו את עצמכם, ואז תארו יום חול רגיל: הבוקר, היום והערב. השתמשו ב-present simple ובמילים כמו always, usually ו-sometimes.'),
    required_elements: [B('who you are: your name, where you live, your work or studies', 'מי אתם: שם, איפה אתם גרים, עבודה או לימודים'), B('your morning, your day and your evening, in order', 'הבוקר, היום והערב שלכם, לפי הסדר'), B('at least two of always, usually, sometimes, never', 'לפחות שתיים מהמילים always, usually, sometimes, never'), B('and, but or because to join ideas', 'and, but או because כדי לחבר רעיונות')],
  },
  A2: {
    task: 'Write a structured description of a personal experience (100-130 words) with a beginning, middle and end.', task_he: 'תארו באנגלית חוויה אישית (100-130 מילים) עם התחלה, אמצע וסוף.',
    min_words: 100, max_words: 160, stage: 2, kind: 'paragraph',
    instructions: B('Choose one topic and tell the story in the past simple, for a friend who was not there. Plan three short paragraphs: the beginning (when, where and who), the middle (what happened, in order) and the end (how it finished and how you felt).', 'בחרו נושא אחד וספרו את הסיפור בעבר (past simple), לחבר שלא היה שם. תכננו שלוש פסקאות קצרות: התחלה (מתי, איפה ומי), אמצע (מה קרה, לפי הסדר) וסוף (איך זה נגמר ומה הרגשתם).'),
    topics: [B('A trip or a day out you remember', 'טיול או יום כיף שאתם זוכרים'), B('Your first day at a new school or job', 'היום הראשון שלכם בבית ספר חדש או בעבודה חדשה'), B('A celebration or a family event', 'חגיגה או אירוע משפחתי')],
    required_elements: [B('a beginning that says when and where', 'התחלה שאומרת מתי ואיפה'), B('events in order, with first, then, after that or finally', 'אירועים לפי הסדר, עם first, then, after that או finally'), B('verbs in the past simple', 'פעלים ב-past simple'), B('an ending that says how you felt', 'סוף שאומר מה הרגשתם')],
  },
  B1: {
    task: 'Write a 300-word opinion essay with an introduction, supporting arguments and a conclusion.', task_he: 'כתבו באנגלית חיבור דעה של כ-300 מילים: פתיחה, נימוקים תומכים וסיכום.',
    min_words: 250, max_words: 380, stage: 3, kind: 'essay', audience: 'readers of a school or community website',
    instructions: B('Choose one question and write an opinion essay of about 300 words for the readers of a school or community website. Give your opinion clearly in the introduction, give two or three reasons in separate paragraphs, each with an example, and end with a conclusion that repeats your opinion in new words. Use examples from your own life and experience; do not invent numbers.', 'בחרו שאלה אחת וכתבו חיבור דעה של כ-300 מילים לקוראים של אתר בית ספר או אתר קהילתי. הציגו את הדעה שלכם בבירור בפתיחה, תנו שניים-שלושה נימוקים בפסקאות נפרדות, עם דוגמה לכל נימוק, וסיימו בסיכום שחוזר על הדעה שלכם במילים אחרות. השתמשו בדוגמאות מהחיים ומהניסיון שלכם, ואל תמציאו מספרים.'),
    topics: [B('Should secondary schools start later in the morning?', 'האם בתי ספר תיכוניים צריכים להתחיל מאוחר יותר בבוקר?'), B('Is it better to live in a big city or in a small town?', 'האם עדיף לגור בעיר גדולה או ביישוב קטן?'), B('Should every student learn to cook at school?', 'האם כל תלמיד צריך ללמוד לבשל בבית הספר?')],
    required_elements: [B('an introduction that gives your opinion', 'פתיחה שמציגה את הדעה שלכם'), B('two or three reasons, one paragraph each', 'שניים-שלושה נימוקים, כל אחד בפסקה משלו'), B('an example for each reason', 'דוגמה לכל נימוק'), B('linking words such as because, for example and however', 'מילות קישור כמו because, for example ו-however'), B('a conclusion that repeats your opinion in new words', 'סיכום שחוזר על הדעה שלכם במילים אחרות')],
  },
  B2: {
    task: 'Write a 500-word argumentative essay with a clear thesis, at least three supporting arguments, evidence, a counterargument, a rebuttal and a strong conclusion.',
    min_words: 450, max_words: 600, stage: 6, kind: 'essay', audience: 'a general reader, such as the readers of a news website',
    instructions: B('Choose one question and write an argumentative essay of 450-600 words for a general reader, such as the readers of a news website. State a clear, debatable thesis in the introduction. Develop at least three supporting arguments, each with evidence or a precise example and an explanation of how it supports the thesis. Present the strongest opposing view fairly, then answer it with reasons: refute it, concede part of it and show why your position still outweighs it, or qualify your thesis. End with a conclusion that adds no new arguments. Use reasoning and examples you can describe precisely; do not invent statistics.'),
    topics: [B('Should supermarkets be required to give unsold food to charities instead of throwing it away?'), B('Should zoos still exist?'), B('Should online games show players how much time and money they have spent?')],
    required_elements: [B('a clear, debatable thesis in the introduction'), B('at least three supporting arguments, each with evidence or an example and its link to the thesis'), B('the strongest opposing view, stated fairly'), B('a rebuttal with reasons: refute, concede and outweigh, or qualify'), B('a conclusion that adds no new arguments')],
  },
  C1: {
    task: 'Write an 800-1,000-word analytical argumentative essay.',
    min_words: 750, max_words: 1100, stage: 8, kind: 'essay', audience: 'an educated, non-specialist reader',
    instructions: B('Choose one question and write an analytical argumentative essay of 800-1,000 words for an educated, non-specialist reader. Analyse the question before you answer it: define the key terms, separate the issues, and state a precise, qualified thesis. Support each reason with evidence or a worked example, and explain the reasoning that links them. Engage with the strongest opposing view in its best form, and identify at least one weakness, hidden assumption or logical flaw in a common argument on the issue. Use formal register and calibrated hedging. The first two questions need reasoning and examples, not research. If you use outside facts, name their source in the text: Lucid cannot check outside sources. A reference list, if you add one, does not count toward the word range.'),
    topics: [B('Is it fair to judge people from the past by today\'s moral standards?'), B('Should employers be allowed to look at job applicants\' social media?'), { en: 'Should cities facing housing shortages build homes on part of their parkland? Use the fictional Halvarden source pack (the same as assignment wa-05; choose another question if you have written that one).', assignment: 'wa-05' }],
    required_elements: [B('a precise, qualified thesis, with the key terms defined'), B('at least three reasons, each with evidence or a worked example and the reasoning that links them'), B('the strongest opposing view in its best form, answered with reasons'), B('at least one weakness, hidden assumption or logical flaw in a common argument, explained'), B('formal register and calibrated hedging'), B('a conclusion that adds no new arguments')],
  },
  C2: {
    task: 'Produce a 1,500-2,000-word research-based argumentative paper.',
    min_words: 1400, max_words: 2200, stage: 10, kind: 'research', audience: 'an educated, non-specialist reader',
    instructions: B('Choose one research question and write a research-based argumentative paper of 1,500-2,000 words for an educated, non-specialist reader. The first three questions come with a source pack of fictional, labelled sources (the same packs as assignments wa-08, wa-09 and wa-10); if you have already written one of those assignments, choose another question. Or research a question of your own with real sources. Evaluate your sources before you cite them, synthesise them by idea, distinguish association from cause, engage with the strongest counterarguments (including one that partly persuades you) and refine your thesis accordingly. Cite by author and year and add a reference list; the reference list does not count toward the word range. With real sources, say briefly in the paper how you checked each one; with the fictional pack, say what you would check in real research. Lucid\'s feedback does not read your sources, so it cannot check whether they exist or say what you report.'),
    topics: [
      { en: 'Should governments set a legal minimum age of 16 for social media accounts? (source pack of assignment wa-08)', assignment: 'wa-08' },
      { en: 'Should public money pay for crewed space exploration? (source pack of assignment wa-09)', assignment: 'wa-09' },
      { en: 'Who should pay for a university degree? (source pack of assignment wa-10)', assignment: 'wa-10' },
      B('A research question of your own, with real sources that you check yourself'),
    ],
    required_elements: [B('a specific, defensible thesis that goes beyond yes or no'), B('an evaluation of the reliability of at least two sources'), B('a synthesis of at least three sources, organised by idea, that tells association from cause'), B('the strongest counterarguments, at least one partly conceded, with the thesis refined accordingly'), B('author-year citation throughout and a reference list'), B('how you checked each real source, or what you would check about each fictional one'), B('a conclusion that states implications and limits without new arguments')],
  },
};

const LEVELS = {
  PreA1: {
    unit_en: 'Foundations', unit_he: 'יסודות',
    final: FINALS.PreA1,
    lessons: [
      L('pa1-01', 'The English alphabet', 'האלפבית האנגלי', ['alphabet'], 'I can say and recognise the 26 letters and spell my name.', 'Letter names vs sounds; capital and small letters (Hebrew has no capitals); spelling a name aloud; letters Hebrew speakers confuse (b/p/v, e/i, g/j, a/e/i names).'),
      L('pa1-02', 'Letter sounds', 'צלילי האותיות', ['phonics'], 'I can read simple short words by their sounds.', 'Short vowels a e i o u in CVC words (cat, bed, sit, hot, cup); consonant sounds absent in Hebrew: th (think/this), w vs v; ship/sheep contrast; silent e (made, time).'),
      L('pa1-03', 'Hello and goodbye', 'שלום ולהתראות', ['greetings'], 'I can greet people, say my name and say goodbye.', 'Hi/Hello/Good morning/afternoon/evening; Goodbye/Bye/See you; My name is...; Nice to meet you; How are you? I\'m fine, thanks. And you?; Excuse me / Sorry / Thank you / Please.'),
      L('pa1-04', 'Numbers 0-100', 'מספרים 0-100', ['numbers'], 'I can understand and say numbers, my age and my phone number.', '0-20, tens, 21-100; thirteen vs thirty stress; How old are you? I\'m 25 (not *I have 25 years / *I am 25 years); phone numbers digit by digit ("oh"/"zero").'),
      L('pa1-05', 'I am, you are: the verb be', 'הפועל be', ['pronouns-subject', 'be-present'], 'I can make simple sentences with am, is and are.', 'I, you, he, she, it, we, they; am/is/are and contractions; copula is required (Hebrew omits it: *She teacher); it for things and animals.'),
      L('pa1-06', 'Questions and negatives with be', 'שאלות ושלילה עם be', ['be-negative-questions'], 'I can ask and answer yes/no questions with be.', 'Are you...? Is he...? inversion; short answers Yes, I am / No, I\'m not; negatives isn\'t / aren\'t; question intonation alone is not enough.'),
      L('pa1-07', 'Colours and things around me', 'צבעים וחפצים', ['colors-objects', 'articles-a-an', 'demonstratives'], 'I can name everyday objects and their colours.', 'a vs an (sound-based: an apple, a university); this/that/these/those; colours; adjective before noun (a red car, not *a car red); What is this? It\'s a...'),
      L('pa1-08', 'Days, months and time', 'ימים, חודשים ושעה', ['time-dates'], 'I can say the day, the date and the time.', 'Days and months with capital letters; ordinal numbers for dates; What time is it? It\'s seven o\'clock / half past / quarter to; in/on/at preview kept light.'),
      L('pa1-09', 'Where are you from?', 'מאיפה אתה?', ['personal-info'], 'I can talk about my country, nationality and job.', 'Countries and nationalities (Israel/Israeli, capital letters); I\'m a student / an engineer (article with jobs!); Where are you from? What do you do?'),
      L('pa1-10', 'My first sentences', 'המשפטים הראשונים שלי', ['word-order-basic'], 'I can introduce myself in simple sentences.', 'Subject-verb-object; I like..., I have..., I live in...; capital I; full stop; checkpoint: build a 5-sentence self-introduction.', { final: true }),
    ],
  },
  A1: {
    unit_en: 'Everyday life', unit_he: 'חיי היום-יום',
    final: FINALS.A1,
    lessons: [
      L('a1-01', 'Present simple: I, you, we, they', 'הווה פשוט: I, you, we, they', ['present-simple'], 'I can describe habits and facts.', 'Form and use for routines and facts; common verbs (live, work, study, like, eat, drink, go); time expressions every day, on Mondays.'),
      L('a1-02', 'Present simple: he, she, it', 'הווה פשוט: he, she, it', ['present-simple-third-person'], 'I can talk about other people\'s routines.', '-s/-es/-ies spelling; has, does, goes; pronunciation /s/ /z/ /ɪz/; the frequent omission of -s.'),
      L('a1-03', 'Do you...? I don\'t...', 'שאלות ושלילה בהווה פשוט', ['present-simple-questions-negatives'], 'I can ask and answer questions about routines.', 'do/does + base verb; don\'t/doesn\'t; *Does she works; short answers; question intonation.'),
      L('a1-04', 'My day', 'היום שלי', ['adverbs-frequency', 'daily-life-vocab'], 'I can describe my daily routine.', 'Routine verbs (wake up, get dressed, have breakfast, commute); always/usually/often/sometimes/never and their position (before main verb, after be).'),
      L('a1-05', 'Family and possessives', 'משפחה ושייכות', ['possessives'], 'I can talk about my family.', 'Family words; my/your/his/her/our/their; \'s (my brother\'s car); have got (UK) vs have.'),
      L('a1-06', 'One and many: plurals', 'יחיד ורבים', ['plurals'], 'I can use singular and plural nouns correctly.', '-s/-es/-ies; irregular (man/men, woman/women, child/children, person/people, foot/feet); people is plural.'),
      L('a1-07', 'a, an, the', 'a, an, the', ['articles'], 'I can choose a, an, the or no article in simple sentences.', 'First mention a/an, known the; jobs take a/an; no article with general plurals and meals; *I am student; the in Hebrew = ה but a/an has no Hebrew word.'),
      L('a1-08', 'Food and drink', 'אוכל ושתייה', ['there-is-are', 'some-any', 'daily-life-vocab'], 'I can talk about food and what is in my kitchen.', 'Food vocabulary; There is/There are (not *There is three apples / *Have bread); some in positives, any in questions/negatives; I\'d like...'),
      L('a1-09', 'Places in town', 'מקומות בעיר', ['prepositions-place'], 'I can say where places are.', 'Town vocabulary; in/on/at/next to/between/opposite/behind/in front of; Where is the bank? It\'s next to...'),
      L('a1-10', 'In, on, at: time', 'מילות יחס של זמן', ['prepositions-time'], 'I can talk about when things happen.', 'at + clock times, at night, at the weekend (UK); on + days/dates; in + months/years/seasons/parts of day; no preposition with every/next/last.'),
      L('a1-11', 'Describing people and things', 'תיאור אנשים ודברים', ['adjectives-basic'], 'I can describe people, places and things.', 'Common adjectives and opposites; adjective before noun; adjectives don\'t take plural -s (*greens apples); very/really/quite.'),
      L('a1-12', 'Can and can\'t', 'can ו-can\'t', ['modal-can'], 'I can talk about abilities and make simple requests.', 'can + base verb (no to, no -s); can\'t pronunciation (US/UK); Can you help me? Can I have...? polite requests.'),
      L('a1-13', 'Questions, questions', 'מילות שאלה', ['wh-questions'], 'I can ask for information with question words.', 'what, where, when, who, why, how, how much/many, which, whose; word order wh + do/does + subject + verb; subject questions (Who lives here?).'),
      L('a1-14', 'Reading short messages', 'קריאת הודעות קצרות', ['pronouns-object'], 'I can understand short emails and messages.', 'Object pronouns me/you/him/her/it/us/them; short authentic-style texts (email, text message, notice); scanning for information.'),
      L('a1-15', 'Writing about me', 'כותבים על עצמי', ['connectors-basic', 'sentence-basics'], 'I can write a short text about myself and my daily life.', 'and/but/because/so; capital letters and full stops; avoiding run-ons; planning 3 mini-paragraphs; final assessment task.', { final: true }),
    ],
  },
  A2: {
    unit_en: 'Experiences and plans', unit_he: 'חוויות ותוכניות',
    final: FINALS.A2,
    lessons: [
      L('a2-01', 'What are you doing?', 'מה אתה עושה עכשיו?', ['present-continuous'], 'I can describe what is happening now.', 'am/is/are + -ing; spelling (making, running, lying); now, at the moment, today; questions and negatives.'),
      L('a2-02', 'Usually vs right now', 'בדרך כלל מול עכשיו', ['present-simple-vs-continuous'], 'I can choose between present simple and continuous.', 'Habit vs now; temporary situations; stative verbs (like, want, know, need, believe) not usually in -ing; Hebrew has one present tense.'),
      L('a2-03', 'Was and were', 'was ו-were', ['past-be'], 'I can talk about where I was and how things were.', 'was/were, wasn\'t/weren\'t; Where were you yesterday?; born: I was born in...; there was/there were.'),
      L('a2-04', 'Past simple: regular verbs', 'עבר פשוט: פעלים רגילים', ['past-simple-regular'], 'I can talk about finished past actions.', '-ed spelling; pronunciation /t/ /d/ /ɪd/; time expressions yesterday, last week, two days ago.'),
      L('a2-05', 'Past simple: irregular verbs', 'עבר פשוט: פעלים חריגים', ['past-simple-irregular'], 'I can use the most common irregular past forms.', 'Top ~40 irregular verbs grouped by pattern (go/went, see/saw, buy/bought, take/took...); mnemonic groups; *goed.'),
      L('a2-06', 'Did you...?', 'שאלות ושלילה בעבר', ['past-simple-questions'], 'I can ask and answer questions about the past.', 'did + base verb (*Did you went); didn\'t; Wh + did; short answers; telling what happened.'),
      L('a2-07', 'Going to and will', 'going to ו-will', ['future-going-to-will'], 'I can talk about plans, predictions and offers.', 'going to for plans/evidence; will for decisions now, offers, promises, predictions; \'ll; won\'t.'),
      L('a2-08', 'Plans and arrangements', 'תוכניות וסידורים', ['future-arrangements'], 'I can talk about my arrangements and make plans.', 'Present continuous for fixed arrangements (I\'m meeting Dana at 6); diary language; asking about plans.'),
      L('a2-09', 'Bigger, better, more interesting', 'השוואות', ['comparatives'], 'I can compare people, places and things.', '-er/more; irregular better/worse/further; than; (not) as...as; *more bigger; much/a bit + comparative.'),
      L('a2-10', 'The best and the worst', 'הכי', ['superlatives'], 'I can talk about extremes.', 'the -est/the most; irregular best/worst; in/of after superlatives; ever with present perfect preview (the best film I\'ve ever seen) as a chunk.'),
      L('a2-11', 'How much? How many?', 'כמה?', ['countable-uncountable', 'quantifiers'], 'I can talk about quantities.', 'Countable vs uncountable (information, advice, money, furniture, news); much/many/a lot of/a few/a little/some/any; How much/How many.'),
      L('a2-12', 'Must, have to, should', 'חובה ועצה', ['modals-obligation-advice'], 'I can talk about rules, obligations and give advice.', 'must vs have to; don\'t have to vs mustn\'t (critical contrast); should/shouldn\'t for advice; base verb after modals.'),
      L('a2-13', 'Common phrasal verbs', 'פעלים מורכבים', ['phrasal-verbs-basic'], 'I can understand and use common phrasal verbs.', '~20 high-frequency phrasal verbs (get up, look for, turn on/off, give up, find out, pick up, put on, take off...); separable vs not, kept simple.'),
      L('a2-14', 'Let\'s...: suggestions and invitations', 'הצעות והזמנות', ['functional-suggestions'], 'I can make, accept and decline suggestions and invitations.', 'Let\'s / Why don\'t we / How about + -ing / Would you like to...?; accepting/declining politely; giving reasons.'),
      L('a2-15', 'Telling a story', 'מספרים סיפור', ['connectors-sequence', 'paragraph-basics'], 'I can write a short story about a personal experience.', 'first, then, after that, finally, when; topic sentence; past tense consistency; final assessment task.', { final: true }),
    ],
  },
  B1: {
    unit_en: 'Opinions and reasons', unit_he: 'דעות ונימוקים',
    final: FINALS.B1,
    lessons: [
      L('b1-01', 'Have you ever...?', 'Have you ever...?', ['present-perfect'], 'I can talk about life experiences.', 'have/has + past participle; ever/never; been vs gone; past participles of common irregulars; Hebrew has no equivalent tense.'),
      L('b1-02', 'Present perfect or past simple?', 'Present perfect או עבר פשוט?', ['present-perfect-vs-past'], 'I can choose correctly between present perfect and past simple.', 'Finished time = past simple (*I have seen him yesterday); unfinished time; for vs since; just/already/yet; How long have you...?'),
      L('b1-03', 'While it was raining', 'עבר מתמשך', ['past-continuous'], 'I can tell stories with background and events.', 'was/were + -ing; when vs while; interrupted actions; setting a scene.'),
      L('b1-04', 'If it rains...', 'אם יירד גשם...', ['conditionals-0-1'], 'I can talk about real possibilities and consequences.', 'Zero conditional for facts; first conditional (if + present, will); *If it will rain; unless, as soon as, when.'),
      L('b1-05', 'If I had a million dollars', 'אילו היה לי', ['conditionals-2'], 'I can talk about imaginary situations.', 'if + past simple, would + base; If I were you (advice); first vs second conditional meaning.'),
      L('b1-06', 'It was made in...: the passive', 'סביל', ['passive-intro'], 'I can describe processes and facts using the passive.', 'be + past participle (present/past); by-agent when needed; when to use passive; *It was build.'),
      L('b1-07', 'She said that...', 'דיבור עקיף', ['reported-speech-intro'], 'I can report what people said.', 'said vs told (told + person); backshift basics; pronoun and time changes (today -> that day); say/tell patterns.'),
      L('b1-08', 'The person who...', 'משפטי זיקה', ['relative-clauses'], 'I can join ideas with relative clauses.', 'who/which/that/where/whose; defining clauses; no resumptive pronoun (*the book that I read it — Hebrew transfer); omitting object relative pronoun.'),
      L('b1-09', 'Enjoy doing, want to do', 'enjoy doing / want to do', ['gerund-infinitive'], 'I can use the correct verb pattern after common verbs.', 'verb + -ing (enjoy, finish, mind, avoid, suggest); verb + to (want, decide, hope, plan, need); after prepositions -ing; like/love/hate both.'),
      L('b1-10', 'In my opinion', 'לדעתי', ['opinion-language'], 'I can give my opinion and support it with reasons.', 'I believe / In my view / It seems to me; because/since/as/therefore/so; giving examples (for example, such as); agreeing and disagreeing politely.'),
      L('b1-11', 'Pros and cons', 'יתרונות וחסרונות', ['connectors-contrast'], 'I can discuss advantages and disadvantages.', 'however/although/but/on the other hand/whereas/despite (preview); punctuation with however; balanced paragraphs.'),
      L('b1-12', 'Writing an opinion essay', 'כתיבת חיבור דעה', ['essay-structure-basic'], 'I can write a structured opinion essay.', 'Read a short article; introduction with clear opinion; body paragraphs (topic sentence, reason, example); conclusion; final assessment.', { final: true }),
    ],
  },
  B2: {
    unit_en: 'Arguments and nuance', unit_he: 'טיעונים ודקויות',
    final: FINALS.B2,
    lessons: [
      L('b2-01', 'Narrative tenses and the past perfect', 'זמני סיפור ו-past perfect', ['past-perfect'], 'I can sequence past events precisely in a narrative.', 'past perfect simple and continuous; by the time, before, after, already; narrative tense control.'),
      L('b2-02', 'If I had known: third and mixed conditionals', 'תנאי שלישי ומעורב', ['conditionals-3-mixed'], 'I can speculate about the past and its consequences.', 'If + past perfect, would have + pp; mixed conditionals; I wish / If only; regrets and criticism.'),
      L('b2-03', 'It is said that...: advanced passive', 'סביל מתקדם', ['passive-advanced'], 'I can use passive forms for formal and impersonal writing.', 'passive with modals (should be done), continuous/perfect passive, have/get something done, It is believed/said that..., He is thought to...'),
      L('b2-04', 'He denied taking it: reporting', 'פעלי דיווח', ['reported-speech-advanced'], 'I can report questions, commands and attitudes accurately.', 'Reported questions (word order!), commands (told me to), reporting verbs with patterns (suggest -ing / that, deny -ing, admit, warn, refuse to, accuse of).'),
      L('b2-05', 'Furthermore, nevertheless, whereas', 'לכידות', ['cohesion-devices'], 'I can link ideas clearly across sentences and paragraphs.', 'Addition, contrast, concession, cause, result connectors; referencing (this, such, the former/latter); avoiding connector overuse; punctuation.'),
      L('b2-06', 'Words that go together', 'צירופי מילים', ['collocations'], 'I can use natural word combinations.', 'make/do/take/have collocations; adjective+noun (heavy rain, strong coffee); verb+noun (raise a question, reach a decision); Hebrew literal-translation traps.'),
      L('b2-07', 'Idioms in context', 'ניבים בהקשר', ['idioms'], 'I can understand and appropriately use common idioms.', '~15 high-utility idioms with register notes (a piece of cake, on the fence, the bottom line...); when idioms are inappropriate (academic writing).'),
      L('b2-08', 'Formal or informal?', 'רשמי או לא רשמי?', ['register'], 'I can adapt my language to formal and informal situations.', 'Contractions, phrasal verbs vs Latinate verbs, hedged requests; formal email vs message; rewriting between registers.'),
      L('b2-09', 'Reading critically', 'קריאה ביקורתית', ['critical-reading'], 'I can distinguish fact from opinion and recognise bias.', 'Fact vs opinion; loaded language; selective evidence; comparing two viewpoints on one issue; author purpose.'),
      L('b2-10', 'Building an argument', 'בניית טיעון', ['argument-structure'], 'I can build an argumentative essay with thesis, evidence, counterargument and rebuttal.', 'Thesis statement; PEEL/claim-evidence-reasoning paragraphs; fair counterargument; logical rebuttal; strong conclusion; final assessment.', { final: true }),
    ],
  },
  C1: {
    unit_en: 'Academic argument', unit_he: 'טיעון אקדמי',
    final: FINALS.C1,
    lessons: [
      L('c1-01', 'Academic vocabulary and nominalisation', 'אוצר מילים אקדמי ונומינליזציה', ['nominalisation'], 'I can use academic vocabulary and nominalisation to write concisely and formally.', 'Academic word families (analyse/analysis/analytical); turning verbs into nouns (decide -> the decision to); avoiding over-nominalisation.'),
      L('c1-02', 'Sophisticated sentence structures', 'מבנים תחביריים מתקדמים', ['inversion-cleft'], 'I can use inversion, cleft sentences and participle clauses for emphasis and flow.', 'Not only... but also, Rarely/Seldom/Only then inversion; It is X that..., What... is...; participle clauses (Having considered...); dangling participles.'),
      L('c1-03', 'Hedging and stance', 'הסתייגות ועמדה', ['hedging'], 'I can express degrees of certainty and my stance precisely.', 'may/might/could, tends to, appears to, arguably, to some extent; boosters (clearly, undeniably) and their risks; over-hedging.'),
      L('c1-04', 'A thesis worth arguing', 'תזה ששווה להתווכח איתה', ['thesis-advanced'], 'I can write a sophisticated, arguable thesis and structure a complex argument.', 'Descriptive vs analytical thesis; qualified claims; thesis that previews structure; outlining complex arguments; paragraph-level logic.'),
      L('c1-05', 'Evaluating evidence and sources', 'הערכת ראיות ומקורות', ['source-evaluation'], 'I can judge how reliable and relevant evidence is.', 'Types of evidence; correlation vs causation; sample size; lateral reading/SIFT; integrating evidence with reasoning (not just dropping quotes).'),
      L('c1-06', 'Logical fallacies', 'כשלים לוגיים', ['fallacies'], 'I can identify fallacies and weaknesses in arguments, including my own.', 'Straw man, ad hominem, false dilemma, slippery slope, hasty generalisation, appeal to authority/popularity, post hoc; repairing a flawed argument.'),
      L('c1-07', 'Rhetoric and persuasion', 'רטוריקה ושכנוע', ['rhetoric'], 'I can use rhetorical techniques deliberately and ethically.', 'Ethos/pathos/logos; tricolon, antithesis, rhetorical questions, concession; tone control; persuasion vs manipulation.'),
      L('c1-08', 'Concise, precise, edited', 'תמציתי, מדויק וערוך', ['concision-editing'], 'I can edit my writing for concision, precision, cohesion and coherence.', 'Cutting redundancy; precise verbs; paragraph unity; given-new information flow; proofreading checklist; final assessment.', { final: true }),
    ],
  },
  C2: {
    unit_en: 'Mastery', unit_he: 'שליטה',
    final: FINALS.C2,
    lessons: [
      L('c2-01', 'Style and connotation', 'סגנון וקונוטציה', ['style-nuance'], 'I can make deliberate stylistic choices and control connotation.', 'Near-synonyms with different connotations (frugal/stingy, assertive/aggressive); register shifts for effect; sentence rhythm; voice.'),
      L('c2-02', 'Irony and implicature', 'אירוניה ומשמעות מרומזת', ['irony-implicature'], 'I can recognise and use irony, understatement and implied meaning.', 'Verbal irony, understatement, litotes, implicature; reading between the lines in editorials and essays; risks of irony in academic writing.'),
      L('c2-03', 'Synthesising sources', 'סינתזה של מקורות', ['synthesis-citation'], 'I can synthesise multiple sources into my own argument and cite them properly.', 'Summary vs synthesis; source matrix; integrating quotes/paraphrase; reporting verbs nuance (claims, contends, concedes); citation basics (APA/MLA style awareness); avoiding plagiarism.'),
      L('c2-04', 'Argument architecture', 'ארכיטקטורת טיעון', ['argument-architecture'], 'I can construct and dismantle complex, qualified arguments.', 'Qualified theses; concession-rebuttal chains; steelmanning; anticipating objections; Toulmin warrants and qualifiers.'),
      L('c2-05', 'Research-based writing', 'כתיבה מבוססת מחקר', ['research-writing'], 'I can plan, draft and edit an independent research-based paper.', 'Research question; scope; structure of a research paper; advanced editing passes (argument, paragraph, sentence, word); final assessment.', { final: true }),
    ],
  },
};

const out = { version: 1, levels: [] };
for (const [level, def] of Object.entries(LEVELS)) {
  out.levels.push({
    id: level, unit_en: def.unit_en, unit_he: def.unit_he, final_assessment: def.final,
    lessons: def.lessons.map((l, i) => ({ ...l, level, order: i + 1 })),
  });
}
const n = out.levels.reduce((a, l) => a + l.lessons.length, 0);
writeFileSync(new URL('../content/curriculum.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('lessons', n, out.levels.map((l) => `${l.id}:${l.lessons.length}`).join(' '));
