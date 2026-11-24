Simulated review (AI persona), not real user research.

# Teacher panel, round 3: adult EFL teacher, beginner path (Pre-A1 to A2)

## Who I am

An adult EFL teacher with 15 years of classes for Hebrew-speaking adults: community centres and workplace courses. I know the usual Hebrew L1 interference: th, w/v, short and long vowels, adjective order, articles, present simple vs progressive, "I am agree", the missing present-tense be, and prepositions. I judged whether an adult beginner would make progress, feel respected and know what to do next. I also judged whether the app teaches the traps my learners fall into, and whether its feedback reaches the mistake the learner actually made.

## What I did

All screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/teacher-adult-efl/` (named below by file). Phone 390x844, Hebrew UI, he-IL.

1. `#/` welcome, then `#/start` as an adult zero beginner: name "Miri", year 1979, goals work and travel, 20 min, "אני לא יודע/ת אנגלית בכלל", terms. This led straight to lesson `pa1-01` (01-06b).
2. `pa1-01` (alphabet) in full: the learn page, all 13 exercises, one deliberate E/I listening error, the end screen, then Today (`pa1-01-*`, `pa101-after-today`).
3. `pa1-02` (letter sounds) with typical Hebrew-speaker errors: ship for sheep, vet for wet, "I tink so, tanks!" for the th item, and "I don't know" on sit/seat. I saw the part-end screen and the "nearly there" Today card (`pa102-*`, `pa102b-*`, `zero-today-after-part`). I took zoomed shots of two explanation boxes (`z-pa102-ae`, `z-pa101-spell`).
4. A fresh A1 learner through the test hook. I did lessons `a1-02`, `a1-07`, `a1-11` and `a2-02`, typing classic L1 errors: "Sara is study…", "I'm the student…", "We usually have a lunch…", "She lives in small flat…", "I have new phone.", "She has eyes blue.", "They are questions easy.", "The kids are want…", "Omer usually is going…", "She works from home this week." I also typed "My mom teaches…" (`a102-*`, `a107-*`, `a111-*`, `a202-*`).
5. `#/review` the same day, then three days later with the clock moved forward: 8 cards (`rev-*`).
6. `#/real-life` hub. Scenarios `rl-work-first-day-intro` (A2) and `rl-hotel-checkin-basics` (A1): prepare, model dialogue, practise, my own replies and the AI tab (`rl-*`).
7. Games: `#/games`, word quiz `#/games/A1/1`, `#/games/pictures/1`, `#/games/memory/1`. I also read `content/pictures.json` (`games-hub`, `game-*`).
8. `#/speaking`, `#/path`, `#/progress`, `#/checkpoint/A1`, `#/grammar`. Then the targeted drills from "טעויות שחוזרות": `#/drill?error=article` and `#/drill?error=word-order` (`m-*`, `drill-*`, `novoice-speaking`).
9. I read the lesson JSON for all 40 Pre-A1 to A2 lessons, to count pitfall types and wrong-answer feedback.

## What worked for me (keep this)

- **The pitfall content is what I would write myself, and it is accurate.** It says that vav is read as v, so Y comes out as "vai" and wet sounds like vet. It says Hebrew has one "i", so ship/sheep and live/leave merge, and that Hebrew has no th, so think comes out as "tink" or "sink". It covers the missing present-tense be ("She teacher"), "ben 25 shanim" leading to "I'm 25 years", bevakasha vs please, slicha vs excuse me / sorry, and na'im lehakir leading to "Nice to know you". Every Pre-A1 to A2 lesson has 2 to 5 of these, with mouth instructions in Hebrew ("קצה הלשון בין השיניים, ונושפים אוויר בלי קול").
- **When feedback is authored for an error, it is excellent and speaks to Hebrew speakers.** For "She has eyes blue." the feedback was: "בעברית שם התואר בא אחרי שם העצם ('עיניים כחולות'). באנגלית הוא בא לפניו: blue eyes." For "She works from home this week.": "בעברית צורה אחת מתאימה לשני המצבים. באנגלית this week = מצב זמני → הווה מתמשך". For "She lives in small flat…": "בעברית אין כאן מילה ל-a, אבל באנגלית חייבים" (`a107-s08-e9-v`).
- **Listening options with contrast feedback.** When I picked Kinji for Kenji, the feedback was "האות השנייה היא E (אִי), לא I (אַיי)", and the transcript appears after answering (`pa1-01-s04-e5-v`). The pa1-02 items ship/sheep/shop, wet/vet/bet and tree/free/three are the minimal pairs I would choose.
- **Speaking lab.** It covers ship/sheep, cat/cut/bed, think/sink/tank, they/day, wine/vine and full/fool, each with a Hebrew meaning. "איזו מילה שמעתם?" trains the ear first, and the answers open only after listening.
- **Respect for adults.** "לא יכול/ה לדבר כרגע" is always offered, speaking is "לא מקבל ציון", and a refused-placement learner gets "נתחיל מהאותיות. בלי מבחן." There is no streak: "יום חופש לא מוחק כלום". After 66% the lesson ends with "כמעט שם … לתרגל את 4 הטעויות · כ-5 דק׳", not a fail screen (`a107-end`).
- **Real-life scenarios are adult and Israeli.** One is set in a Tel Aviv hi-tech company with half the team in London. The options get L1-aware feedback ("Hello. I am QA engineer." → "לפני מקצוע צריך a או an"), the phrase notes are precise ("looking forward to + -ing", "I worked vs I have worked"), and there is a US/UK table with the first-floor note. The AI tab says honestly "שיחה חופשית עם AI עוד לא זמינה באתר הזה" and points to scripted practice (`rl-work-first-day-intro-turn0-own`, `rl-work-first-day-intro-roleplay`).
- **Progress talks a teacher's language.** "טעויות שחוזרות" is listed by error type with a count and a trend (4× סדר מילים, 3× a / an / the), and topics show mastery. I would plan a class from this screen.

## What did not work (findings)

### 1. Bidi breaks the pairing of sound symbols and example words in Hebrew pronunciation text (major)
- **Route:** `#/lesson/pa1-02` learn page, "שימו לב (דוברי עברית)", fourth box. Also `#/lesson/pa1-01` learn page, the spelling tip, and the `pa1-02` end screen.
- **What I saw:** The Hebrew line "באנגלית יש /æ/ (cat), /ʌ/ (cut) ו-/e/ (bet)." renders as "…‎(cat), /ʌ/ (cut) /æ/ … e/ (bet)/-ו": /æ/ is detached from (cat), and "ו-/e/" is split around (bet) (`z-pa102-ae.png`). In pa1-01 the tip "Anna = A, double N, A" is broken into "double: Anna = A," and ".double N, A" on two lines, with Hebrew in between (`z-pa101-spell.png`). The pa1-02 end-screen line "th: לשון בין השיניים (think, this). w: … (vet)." also reads out of order (`pa102b-end.png`).
- **Why it matters:** In a pronunciation lesson, the link between symbol and word is the content. A beginner can easily map /æ/ to "cut".
- **Suggestion:** Isolate each "symbol (word)" pair as one LTR unit (`<bdi dir="ltr">/æ/ (cat)</bdi>`), with the Hebrew prefix ו- outside it. Better still, show sound/word pairs as small LTR chips or a mini-table, not inline in a Hebrew sentence. Keep spelled sequences ("A, double N, A") in one isolate that does not wrap.

### 2. At Pre-A1 the screen favours the English that a zero beginner cannot read (major)
- **Route:** `#/lesson/pa1-01` (learn page and exercises).
- **What I saw:** Exercise prompts put the Hebrew in small blue type on top and the English in large bold black: "Match each letter to its name, written in Hebrew letters." (`pa1-01-s00-e1-q.png`). The learn page repeats every explanation paragraph in both languages and is 5,825px tall on a phone (`pa1-01-learn.png`). The example notes are English only: "double = two of the same letter", "capital I, and capital T and A for the city", "we say the letter names" (`c-learn-4.png`). Settings offers only auto/full/partial/minimal/off. There is no Hebrew-first mode where the English meta-text is optional.
- **Why it matters:** My zero-level adults read Hebrew first. A big block of unreadable English on screen 1 tells them "this is not for me", and the notes they need are the ones they cannot read.
- **Suggestion:** Under "auto" at Pre-A1 to A1, make the Hebrew instruction the main prompt at prompt size. Put the English instruction and the English copy of each explanation paragraph behind a "באנגלית" tap (the reverse of the existing fold at "partial"). Translate the example notes into Hebrew.

### 3. The Hebrew-speaker pitfalls are hidden at the bottom, cannot be heard, and are never linked to mistakes (major)
- **Route:** `#/lesson/pa1-02` learn page; `#/drill?error=article`; lesson verdicts.
- **What I saw:**
  - "שימו לב (דוברי עברית)" starts at about y=3,187px of a 6,867px page, after the examples. Its boxes use the same yellow as ordinary warnings (`c-pa102-pit.png`). "ישר לתרגול" skips it entirely.
  - The pitfall boxes have no play button, although the examples above them do. "wet and vet can sound the same" has no way to hear wet and vet.
  - When I typed "I tink so, tanks!" (the other typical th substitution), the verdict was only "התשובה הנכונה: I think so, thanks!" (`pa102b-s04-e11-v.png`).
  - The targeted drill for articles opens straight on an item with no reminder of the rule (`drill-error-article.png`).
  - Pitfalls appear nowhere else in the app (only `lesson.js` renders `hebrew_pitfalls`).
- **Why it matters:** These pitfalls are Lucid's most distinctive content, yet a learner sees each one once, if they scroll that far.
- **Suggestion:**
  - Move the pitfalls up, right after the rule, with their own style and the label "מלכודת לדוברי עברית".
  - Add ▶ buttons for each word pair mentioned in a pitfall.
  - When an answer's error type matches a lesson pitfall, show that pitfall in the verdict's "למה?".
  - Show the matching pitfall as a one-card primer before a targeted drill.
  - Add a reference page "מלכודות לדוברי עברית", grouped by error type and linked from "טעויות שחוזרות".

### 4. The "word order" drill is a grab-bag that includes untaught A2 grammar (major)
- **Route:** `#/progress` → "4× סדר מילים" → `#/drill?error=word-order`.
- **What I saw:** My word-order mistakes were all adjective position in a1-11 ("They are questions easy.", "She has eyes blue."). The 8 drill items were:
  - "I like very much football"
  - "pick it up" (phrasal verbs, lesson a2-13, not studied)
  - an "any" question
  - a "When…" question in the present continuous
  - "The test was easy" made negative (a2-03, not studied)
  - "When Kenji arrived?" (a2-06, not studied)
  - "Maya (usually…)"
  - a Where question

  None was about adjective position. The end screen still repeated the generic note "באנגלית התואר לפני שם העצם (a big house)" (`drill-wo-end.png`).
- **Why it matters:** For a Hebrew speaker, adjective order and question inversion are different interference problems. Mixing them, and adding grammar the learner has not met, turns targeted practice into a test they fail.
- **Suggestion:**
  - Split word-order into sub-types: adjective-noun, question inversion, adverb or frequency position, phrasal-verb object.
  - Tag items with a sub-type and choose by the sub-type the learner actually missed.
  - Draw only from lessons the learner has done.

### 5. "Now in your own words" in scenarios misses the L1 errors the app already knows (major)
- **Route:** `#/scenario/rl-work-first-day-intro` and `#/scenario/rl-hotel-checkin-basics`, Practise, turn 1, "עכשיו בניסוח שלכם".
- **What I saw:** I typed "Hi, I am Miri. I am agree to work with you. Nice to know you." The result was "לא מצאנו את המילים שציפינו להן, אבל זה לא אומר שהתשובה לא טובה". Nothing was said about "I am agree" (`js/core/writing-analyzer.js` has exactly this rule) or "Nice to know you" (a pa1-03 pitfall) (`rl-work-first-day-intro-turn0-own.png`). In the hotel scenario, "I want room please. I have reservation." got only "בתשובה שלכם יש מילים שמתאימות למצב: reservation". The missing "a" was not flagged, although the scripted option's own feedback on the same screen teaches it ("חסר a, ו-I want נשמע ישיר מדי"). The reply box is a single-line input, so a two-sentence reply is cut off from view.
- **Why it matters:** This is where adults transfer what they practised into their own production, and it is where the Hebrew patterns come back. The check is honest about only matching keywords, but the app already holds the rules.
- **Suggestion:** Run the analyzer's L1 rules, plus a short list of the pitfall patterns ("I am agree", "nice to know you", "I am student", "I want room", "explain me"), on own replies. Label the result "ייתכן שזו טעות נפוצה של דוברי עברית". Make the field a 2 to 3 line textarea.

### 6. A wrong correction gets only the model answer: no targeted feedback and no second try (major)
- **Route:** `#/lesson/a1-02` e12, `#/lesson/a1-07` e7 and e8, `#/lesson/a2-02` e10.
- **What I saw:**
  - "Sara is study English every evening." (the classic "be + base verb") got only "לא בדיוק · התשובה הנכונה: Sara studies English every evening." (`a102-s11-e12-v.png`).
  - "I'm the student at Tel Aviv University." got only "התשובה הנכונה: I am a student…".
  - "Omer usually is going to the gym after work." got only the answer.
  - The explanation sits behind a closed "למה?".
  - In the Pre-A1 to A2 lesson files, 57 of 66 "find and fix" items have no `wrong_feedback`. The verdict footer offers only "המשך". The item returns once at the end, but the learner is never asked to try again with a nudge, although these items have a hint ("חסרה מילה קטנה לפני המקצוע").
- **Why it matters:** "Teach, don't tell" is a product principle. In class I would say "look at the word before student", not read out the answer. Adults who changed the wrong word do not learn which word was wrong.
- **Suggestion:**
  - On the first wrong answer to a find-and-fix item, show the existing hint and allow one more try. Reveal the answer after the second try.
  - Highlight the changed words against the model (a word diff already exists for dictation).
  - Seed `wrong_feedback` for the frequent Hebrew patterns: be + base verb, "the" instead of a/an, adverb before the verb ("usually is").

### 7. Listening items play silently when the device has no English voice, and the answers still unlock (major)
- **Route:** `#/speaking`, "איזו מילה שמעתם?" (bit/beat). The same Play buttons appear in lesson listening items (pa1-02 e1 sheep/ship).
- **What I saw:** In my browser, `speechSynthesis.getVoices()` returned 0 voices. When I pressed "השמעת המילה", no sound played. The button changed to "להשמיע שוב" and both answer buttons, bit and beat, were enabled. No notice appeared (`novoice-speaking.png`). In `speech.js`, when no English voice is listed, the utterance goes to the browser's default voice. I could not test what that sounds like on real phones.
- **Why it matters:** A minimal-pair item answered without hearing anything records a false result, and the learner thinks the problem is their ear.
- **Suggestion:**
  - Detect "no en-* voice" and show a short banner with how to install an English voice.
  - In discrimination items, do not score answers given when nothing could be played.
  - For the roughly 30 core minimal pairs, ship short recorded human audio. Synthetic voices are least reliable exactly on vowel length.

### 8. Review distractors come from a tiny pool and give the answer away by part of speech (minor)
- **Route:** `#/review`, 3 days after the lessons (clock moved forward), 8 cards.
- **What I saw:** All 8 cards drew their wrong options from the same six words: לסיים, להעדיף, מתולתל/ת, לבשל, לטוס, שקט/ה. For "teach" the options were ללמד / לסיים / להעדיף / מתולתל/ת; for "noisy" they were רועש/ת / לסיים / שקט/ה / מתולתל/ת (`rev-c0-v.png`, `rev-c1-v.png`, `rev-c2-v.png`). In Hebrew, an infinitive starts with ל- and an adjective carries /ת, so the part of speech removes options without any knowledge of the word.
- **Suggestion:** Choose distractors of the same part of speech from the learner's own learned words, and rotate them. For adults, move to production cards (Hebrew → type the English word) earlier.

### 9. The lesson-end "כדאי לשים לב" box gives the wrong diagnosis (minor)
- **Route:** `#/lesson/pa1-01`, end screen.
- **What I saw:** My only error was a listening confusion between the letter names E and I (e5). The end screen showed the tag "איות" with "האיות באנגלית לא תמיד תואם את ההגייה, ולכן כדאי לתרגל מילים נפוצות" and "אם זה יחזור, Lucid יוסיף תרגול ממוקד" (`pa1-01-end.png`). The item's `option_errors` label it "spelling", so the generic spelling note is shown.
- **Suggestion:** Summarise the item's own feedback instead ("E = אִי, I = אַיי"), and add an error type for letter-name and sound discrimination, so the follow-up practice is not generic spelling.

### 10. US spelling is marked wrong (minor)
- **Route:** `#/lesson/a1-02` e11 ("My mum teach English at a high school.").
- **What I saw:** "My mom teaches English at a high school." got "לא בדיוק · התשובה הנכונה: My mum teaches English at a high school." There was no hint that the grammar fix was right and only mom/mum differed (`a102-s10-e11-v.png`). The default `english_variant` is "any", and `grading.js` has no US/UK equivalence.
- **Why it matters:** Many Israeli adults learned American spelling. They will think their -s correction was wrong.
- **Suggestion:** Add a small US/UK equivalence list to grading (mom/mum, color/colour, favorite/favourite, apartment/flat, center/centre), or return "almost" with "mom (US) = mum (UK)".

### 11. Two top Hebrew-speaker errors have no pitfall at the beginner levels (minor)
- **Route:** lesson content, Pre-A1 to A2.
- **What I saw:** "I am agree" is first taught in `b1-10`, although my learners produce it from week one (I produced it myself in the A2 work scenario above). Across all 75 lessons there are no pitfall boxes of type "preposition" at all. The Pre-A1 to A2 pitfalls count as follows: pron-vowel 16, copula-omission 16, pron-th 11, word-order 11, article 10, pron-w-v 9, preposition 0. Exercises do touch verb + preposition (a2-01 "waiting for the bus", a2-13 "look for"), but nothing explains the transfer: מחכה ל → wait to, מקשיב ל → listen music, מסביר לי → explain me, מתחתן עם → married with, מגיע ל → arrive to.
- **Suggestion:** Add an "agree is a verb" pitfall in an A1 opinion or "like" lesson. Add verb + preposition pitfalls in a1-04 (listen to), a2-01 (wait for), a2-13 and a2-15 (arrive in/at), with a matching `wrong_feedback` entry each.

### 12. Picture-game vocabulary follows the available icons, not adult needs (minor)
- **Route:** `#/games/pictures/1`, `#/games/memory/1`, `content/pictures.json`.
- **What I saw:** Level 1, "בסיס יומיומי", includes balloon, rabbit, heart, star, present and cherries (`game-pic-1.png`: bird, cake, banana, star). Level 3, labelled A2 to B1, includes anchor, telescope, microscope, magnet, satellite, clover, seedling, wheat, spanner and tornado. The file's own note says the pictures are Lucide icons. Survival words such as water, bread, money, passport, doctor and receipt do not appear in any set.
- **Suggestion:** Build the sets from the lesson vocabulary and scenario phrase lists first, and use icons where they exist. Label a word's level by how frequent and useful it is, not by the icon set.

### 13. The word quiz rewards speed (minor)
- **Route:** `#/games`, word quiz description.
- **What I saw:** "בונוס מהירות לכל תשובה נכונה: 3s +5, 6s +3, 10s +1; בהקלדה: 8s +5, 15s +3, 25s +1". PRODUCT.md commits to "no time pressure except opt-in timed writing".
- **Why it matters:** Adults who read slowly, or who type English on a Hebrew keyboard, lose points for being careful.
- **Suggestion:** Remove the speed bonus, or make it an opt-in "אתגר מהירות" switch that is off by default.

### 14. The learner's own name is not used in spelling practice (polish)
- **Route:** `#/lesson/pa1-01` e12, e13.
- **What I saw:** Onboarding asked for my name ("Miri"), but the speaking item is "My name is Maya. M-A-Y-A." (`pa1-01-s11-e12-q.png`). The first real-life use of spelling for an adult is their own name, on the phone or at a reception desk.
- **Suggestion:** When a Latin-letter name or surname is known (or one is typed in e13), offer "Now spell your own name" with the learner's name.

## My top 3 wishes

1. **Make the Hebrew-speaker pitfalls a thread that runs through the app, not a box at the bottom.** Put them near the top of the lesson and give each one a play button for its word pairs. Link them from every matching wrong answer, from targeted drills and from "טעויות שחוזרות", and collect them in one "מלכודות לדוברי עברית" page. Add the missing ones: "I agree" at A1, and verb + preposition.
2. **Feedback that diagnoses the learner's own sentence.** Give a second try with the hint before the answer in find-and-fix items. Run the L1 error patterns on find-and-fix answers and on "own words" scenario replies. Split "word order" into its real sub-types for drills, draw drill items only from lessons already studied, and accept US spelling.
3. **A true zero-beginner experience.** Show Hebrew-first instructions, with the English meta-text one tap away and the example notes in Hebrew. Fix the bidi of sound symbols and spelled letters. Make sure pronunciation audio is reliable: warn when no English voice exists, and use recorded audio for the core minimal pairs.
