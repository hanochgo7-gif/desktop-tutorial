# Persona review, round 2: teen beginner and low-confidence speaker

> **This is a simulated persona review (round 2).** An AI played two invented personas and drove the app with
> Playwright. No real people took part. None of the reactions below are user data or research findings about real
> learners; they are a structured heuristic walkthrough from two points of view. Severities are reviewer judgement.

- **Date:** 2026-10-31
- **Build:** clean working tree at `f8a202c` ("Close remaining fix items; fix log"), served from `http://127.0.0.1:8801/`
- **Personas:** (1) Noa, 16, high-school student in Be'er Sheva, absolute beginner, embarrassed about English, phone
  only, Hebrew interface. (2) Avi, 41, around A2, understands more than he can say, freezes when speaking; phone and
  laptop.
- **Reviewer key:** `teen-beginner-low-confidence`
- **Round 1 report:** `round1-teen-beginner-low-confidence.md`. Fix log: `../fix-log.md` (rows P-01 to P-23; the
  mapping is in the verification table).

## Method

- Chromium (Playwright) with `locale: he-IL`, `timezoneId: Asia/Jerusalem` and reduced motion, at **390x844**
  (phone), **320x640** where layout matters (welcome, lesson exercise, verdict, speaking item) and **1440x900**
  (desktop). The welcome screen was also measured at 360.
- Speech recognition was replaced by a scripted fake so each persona could "say" specific things, including
  realistic recogniser mistakes ("my name is Maya Maya", "sky diving no I have not") and a network error. Speech
  synthesis had no voices in headless Chromium, so audio playback itself was not judged.
- Accounts and AI used a mock adapted from `installMockServer` in `tests/e2e/run.mjs`. The roleplay feedback mock
  was set to a "goal not reached" report (58/100) with one strength, to see how a disappointing result is presented.
  AI text is canned, so only flow, presentation and honesty were judged.
- Return visits used Playwright's clock (Noa: two days later, Monday 16:30; Avi: the next evening). Learner data was
  carried between scripts with the store's own `snapshot()` / `replaceAll()`.
- Offline: the service worker was allowed, the app loaded once online, then the context was taken offline.
- An unwritten lesson was simulated for Avi (b1-01 removed from `content/manifest.json` and its file returning 404),
  because every lesson is now in the manifest.
- Routes visited: `#/welcome`, `#/start` (all steps, plus a 15-year-old's attempt and a second tab), `#/lesson/pa1-01`
  (two full runs: 68% then 100%), `#/lesson/pa1-02` and `pa1-06` offline, `#/lesson/pa1-08` (one exercise),
  `#/today` (day 1, after failing, return visit, after passing, offline, desktop), `#/path`, `#/review?mode=exit`,
  `#/progress`, `#/profile`, `#/settings`, `#/help`, `privacy.html`, `#/placement`, `#/lesson/b1-01` (real and
  simulated-missing), `#/speaking` (sound tabs, "Which did you hear?", "Say it", shadowing), `#/real-life`,
  `#/scenario/rl-hotel-checkin-basics` (prepare, practise, own words by dictation, roleplay without and with an
  account, "I'm stuck", report, phone and desktop), `#/account` (sign-up from the roleplay tab), `#/conversations`,
  `#/tutor?mode=pronunciation`, `#/practice`.
- Scripts: `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas-r2/teen-beginner-low-confidence/`
  (`noa1-4.mjs`, `avi1-4.mjs`, `bidi-*.mjs`, logs `*.log`). Screenshots are in its `shots/` folder and are referred to
  below as `shots/...`. No file under the app was changed except this report.

---

## Step 1: verification of round 1 findings

Each finding was re-tested in the app, not taken from the fix log.

| R1 | Fix log | Finding (short) | Verdict | What was observed in round 2 |
|---|---|---|---|---|
| N1 | P-01 | Welcome screen overflows sideways on phones | **Resolved** | `scrollWidth` equals the viewport at 390, 360 and 320; headline, language switch and "Get started" are fully visible. `shots/noa-01-welcome-390.png`, `shots/noa-01-welcome-320.png`. |
| N2 | P-02, P-27, P-57 | Speech recognition graded in lessons; no "can't speak now" | **Resolved** | Speaking items show "What was recognised" with the target in its own spelling, "not a score or an accent check", optional self-rating, and a "Can't speak right now" button. The mismatch "my name is Maya Maya" gave no verdict, no error type (`error_type: null`, `score: null`) and no re-queue; the summary says speaking and writing do not count. `shots/noa-15-e11-before.png`, `shots/noa-15c-e11-heard.png`, `shots/noa-42-e12-heard-mismatch.png`, `shots/noa-20-lesson-summary.png`. |
| N3 | P-03 | Answer-feedback footer cramped and covering content | **Resolved** | Below 40rem the verdict is full width with a full-width Continue under it; result and right answer first, explanation folded behind "Why?". At 320 nothing overflows. Opening "Why?" still covers part of the options (the footer scrolls within 45dvh), which is acceptable. `shots/noa-13-e2-verdict-wrong.png`, `shots/noa-13b-e4-why-open.png`, `shots/noa-62-320-verdict-wrong.png`, `shots/noa-63-desk-verdict-wrong.png`. |
| N4 | P-04 | "Strictest privacy by default" for under-18s had nothing behind it | **Resolved** | Onboarding, Profile and the policy now say exactly what differs under 18 (the server refuses marketing consent; Lucid sends no marketing to anyone; every other default is the same). `shots/noa-04-ob-step4.png`, `shots/noa-34-profile-full.png`. |
| N5 | P-05 | Voice processing not disclosed | **Resolved** | A one-time notice before the first microphone use ("Not now" / "Use the microphone") explains that the browser's speech service may receive the audio and Lucid keeps only text; onboarding step 4 and a new "Microphone and voice" policy section say the same. `shots/noa-15b-mic-notice.png`, `shots/noa-37-privacy-full.png`. |
| N6 | P-06 | Exercise total grows with each mistake; failing % on the path | **Partly resolved** | In the lesson the total stays fixed and retries are counted apart ("3 מתוך 13 · 1 לחזרה", then "חוזרים 1 מתוך 3"); the path shows "בתהליך" instead of a %. **Remains:** Today's continue button and plan still count retries in the total: "להמשיך: Have you ever...? (6/18)" and "up to exercise 14 of 18" while the player says "6 מתוך 16 · 2 לחזרה". `shots/avi-50-today-return.png`, `shots/avi-51-after-primary.png`, `shots/noa-31-path.png`. |
| N7 | P-07 | Plan time does not match lesson length | **Partly resolved** | Today now states the real length and plans a part: "The whole lesson is about 15 minutes, so today we do part of it: up to exercise 8 of 13". **Remains:** the lesson player never marks that point. On the return visit Noa went from exercise 8 straight on to 13 with no "that's today's part" stop, so a 10-minute plan still becomes 15-20 minutes unless she counts. `shots/noa-40-today-return.png`; log `noa3.log` (steps 7-12). |
| N8 | P-08 | "That is what I meant – count it" on multiple-choice review cards | **Resolved** | A wrong pick on a multiple-choice card shows no override. `shots/noa-46-review-mcq-wrong.png`. |
| N9 | P-09 | Letter names differing only by niqqud, no audio on tiles | **Resolved** | Pointed Hebrew is larger, each letter tile has a play button, and the names carry "(כמו day)" / "(כמו my)" hints. `shots/noa-12-e1-match.png`, `shots/crop-e1-tiles.png`. |
| N10 | P-10 | Age gate shows the threshold first and lets a refused user pick another year | **Partly resolved** | The year is asked neutrally ("only the year is stored"); a 15-year-old gets a separate, kind refusal screen, and returning to `#/start` in the same tab stays refused. **Remains:** the refusal is kept in `sessionStorage`, which is per tab, so opening Lucid in a new tab shows the form again. The policy says a refused person "cannot try again with another year in the same browser session", which is not what happens. `shots/noa-02-ob-step1.png`, `shots/noa-03-age15-refused.png`; log `noa1.log`. |
| N11 | P-11 | Privacy page has no contact route | **Partly resolved** | The page now has a "Contact" section, but it is a clearly marked "to be filled in before public launch" placeholder that says real users must not be invited until it is filled. The gap is disclosed honestly; there is still no way for Noa or a parent to reach the operator. |
| N12 | P-12 | Step counters read backwards in RTL | **Resolved** | Counters are in words everywhere checked: onboarding "1 מתוך 4", lessons "2 מתוך 13", review "1 מתוך 8", the listening drill "1 מתוך 8", scenario practice. `shots/noa-02-ob-step1.png`, `shots/noa-46-review-mcq-wrong.png`. |
| N13 | P-13 | Key-point check icons on their own line | **Resolved** | Icons sit on the same line as their key point. `shots/noa-20-lesson-summary.png`. |
| A1 | P-14, P-26, P-61 | Day one's Start opens an unwritten lesson with a misleading message | **Resolved** | With b1-01 simulated as missing, Today skips to the next ready lesson and says why ("'Have you ever...?' is still in preparation, so this is the next lesson that is ready"); the path row reads "בהכנה", is not a link, and "Next" moves to lesson 2; opening the lesson directly gives an honest "still being written" screen with a button to the next ready lesson. Offline, a lesson that is not on the device says it may be a connection problem and offers "Try again". `shots/avi-10-unwritten-today.png`, `shots/avi-11-unwritten-path.png`, `shots/avi-12-unwritten-lesson.png`, `shots/noa-52-offline-lesson6.png`. |
| A2 | P-15 | Shadowing graded like a test | **Resolved** | After a partial repeat the footer is green, "Speaking practice recorded – not scored", with no "Not quite" or "Correct answer"; the attempt is stored with `score: null`; the diff keeps "haven't" and "it's". `shots/avi-25-shadow-heard.png`, `shots/avi-26-shadow-done.png`. |
| A3 | P-16 | Roleplay report all scores and corrections | **Resolved** (client side) | The report leads with the outcome in words (EN + HE), then "What worked" with a quoted strength, then alternatives and practice; the numbers sit in a closed "Scores" disclosure that says they do not set the level. The page opens at the top with focus on "Your feedback". Conversations shows "עוד לא" instead of "58/100". Capping alternatives by level is server-side and could not be checked against the mock. `shots/avi-42b-report-full.png`, `shots/avi-55-report-desktop.png`, `shots/avi-43-conversations.png`. |
| A4 | P-17 | No on-demand help in the roleplay; Hebrew hints switched off by course level | **Resolved** | "נתקעתי: עזרה" shows the goal and the scene's phrases with Hebrew, each copyable into the box, with no AI call. "Hebrew tips when I get stuck" is on by default for this A1 scene, and every roleplay request sent `hebrew_support: "partial"` although his course level is B1. `shots/avi-40-roleplay-stuck.png`, `shots/avi-41-roleplay-hint.png`; log `avi3.log`. (See new finding R2-7 about the copied phrases.) |
| A5 | P-18 | Speaking and writing levels shown without evidence | **Resolved** | Placement result, Today and Progress say speaking and writing were "not tested" / "not yet assessed", and "Lucid does not assess speaking level yet". `shots/avi-04b-placement-result-full.png`, `shots/avi-05b-today-full.png`. |
| A6 | P-19 | English punctuation flips inside Hebrew (Today button, legend, roleplay hint) | **Resolved** for the reported spots | "להתחיל: Have you ever...?" reads correctly; the duplicate legend line is gone; the hint "K-O-H-E-N." keeps its full stop at the end (on a phone the name still breaks across lines at a hyphen, polish). A wider bracket problem is reported as new finding R2-1. `shots/avi-05b-today-full.png`, `shots/avi-41-roleplay-hint.png`. |
| A7 | P-20 | Pronunciation coach has a microphone but cannot hear | **Resolved** | The mode says the tutor reads text and does not hear you, and links to the Speaking lab. `shots/avi-46-tutor-pron.png`. |
| A8 | P-21 | Correction setting not sent to conversations | **Resolved** | Every roleplay request carries `corrections`; the task panel names the current setting ("רגיל", then "רק מה שחוסם הבנה" after changing it) and says you will not be corrected mid-conversation. `shots/avi-38-roleplay-task.png`, `shots/avi-45-roleplay-task-light.png`. |
| A9 | P-22 | After sign-up from a scenario, lands on Today | **Resolved** | After creating an account from the roleplay tab he returned to `#/scenario/rl-hotel-checkin-basics?tab=roleplay`. (The entry link is labelled only "כניסה", see R2-9.) `shots/avi-35-roleplay-noaccount.png`, `shots/avi-37-after-signup.png`. |
| A10 | P-23 | Sound tabs labelled with IPA only; tips English-only at B1 | **Partly resolved** | Tabs now lead with example words ("ship / sheep", IPA in small print) and the mouth-position tips show Hebrew by default. **Remains:** in the shadowing player, the articulation note ("In the question, have is weak and quick: /həv/...") is still English with Hebrew behind "עב" at course level B1. `shots/avi-20-speaking-top.png`, `shots/avi-25-shadow-heard.png`. |

**Summary:** 18 resolved, 5 partly resolved (N6, N7, N10, N11, A10), 0 not resolved, 0 regressed. A3 is counted as
resolved; only its server-side cap on alternatives could not be checked against the mock.

---

## Step 2: fresh sessions, new findings

### R2-1. English with brackets inside Hebrew explanations is scrambled (major)
- **Persona / route / size:** Noa; lesson summary key points (`#/lesson/pa1-01`), exercise feedback
  (`#/lesson/pa1-08`, the ordinal-numbers gap), and any Hebrew text that quotes English with brackets; 390x844.
- **Observed:** the isolation that keeps English runs intact inside Hebrew (`isolateLatin()` in `js/core/i18n.js`)
  cuts an English run before a closing bracket that belongs to it, or starts it after an opening bracket that belongs
  to it. The bracket is then mirrored and moved by the bidi algorithm. Examples as rendered:
  - pa1-01 key point "שתי אותיות זהות ברצף = double (A, double N, A)." shows as "(double (A, double N, A = ברצף."
    on both the failed and the passed summary;
  - pa1-08 feedback "לסדר משתמשים ב-third (3rd), לא ב-three." shows with "(third (3rd" and the parentheses facing
    the wrong way;
  - "on + יום (on Monday), at + שעה (at six o'clock)..." and "ל-fif (fifteen, fifty)" come out in a jumbled order.
  A scan of all content with the same function found **275 Hebrew strings in 59 files** whose English isolate has
  unbalanced brackets, **30 of them in the Pre-A1 lessons** Noa does first.
  `shots/noa-20-lesson-summary.png`, `shots/crop-keypoint.png`, `shots/noa-71-bidi-in-lesson-feedback.png`,
  `shots/noa-70-bidi-brackets.png` (five real content strings rendered with the app's own function); scan script
  `bidi-scan.mjs`.
- **Why it matters for Noa:** she reads the Hebrew line first and relies on it to see which English word goes where.
  At her level a reversed "(3rd" or "at six) שעה" is not a cosmetic glitch; it hides the rule being explained, on
  the very screens meant to help after a mistake.
- **Recommendation:** in `englishSpan()`, keep bracket pairs together: if the run contains an opening bracket whose
  closer is also in the run, start the isolate at that bracket; if it contains a closer whose opener is in the run,
  end after it; never leave one bracket of a pair inside the isolate and the other outside. Add unit cases for the
  four strings above, and have the content validator flag any Hebrew string whose isolates have unbalanced brackets
  so the 275 cases are checked again after the fix.

### R2-2. After "Nearly there", the "practise only what I missed" path is lost once she leaves (major)
- **Persona / route / size:** Noa; `#/lesson/pa1-01` summary, then `#/today` the same day and two days later; 390x844.
- **Observed:** her first run ended at 68% ("Nearly there") with "Practise the 4 I missed · about 4 min" as the main
  button and "Later" beside it. She tapped "Later" (natural after 15 minutes on a 10-minute plan). The saved list of
  missed exercises is never offered again: Today's main button says "Start: The English alphabet" and plans "today we
  do part of it: up to exercise 8 of 13", and the lesson intro shows no "You missed 4" option. Two days later she was
  sent through the whole lesson from exercise 1, including the exercises she had right. The same Today screen, shown
  minutes after she finished all 13 exercises, also described the lesson as not yet started.
  `shots/noa-20-lesson-summary.png`, `shots/noa-30-today-full.png`, `shots/noa-38-lesson-intro-again.png`,
  `shots/noa-40-today-return.png`; logs `noa2.log`, `noa3.log`.
- **Why it matters for Noa:** failing the first lesson narrowly is a likely outcome for an absolute beginner (the
  simulated runs in both rounds ended at 58% and 68%). Being sent back to the start, with no sign that her right answers were kept, is the
  "moving finish line" that round 1 warned about, and it lands on day two, when she is deciding whether to keep going.
- **Recommendation:** when `progress.missed` exists, make Today's main action "Practise the 4 you missed · about 4
  min" (linking to `?stage=missed`) and describe the lesson as "nearly done", and add the same choice to the lesson
  intro. Keep "Practise everything again" as the secondary option.

### R2-3. Progress recommends AI writing feedback to a Pre-A1 learner with AI off and no account (minor)
- **Persona / route / size:** Noa; `#/progress`; 390x844.
- **Observed:** after one lesson, "Recommendations for next week" contains only "Write in the Writing lab and get
  feedback: two assessed texts on different days give writing a level". Noa has AI feedback off, no account, and the
  server is in device-only mode; she cannot get assessed texts at all. The same page lists level checks for all seven
  levels, Pre-A1 to C2, each with a "לבדיקה" link. The rule in `js/views/progress.js` adds the writing
  recommendation whenever writing has no level, regardless of level or AI availability. `shots/noa-33-progress-full.png`.
- **Why it matters for Noa:** the only advice the app gives her is something she cannot do, and C2 checks sit next to
  her first lesson. For an embarrassed beginner this reads as "this app is not for people like me".
- **Recommendation:** show the writing recommendation only when AI feedback is available and consented, and from A1
  or so; otherwise recommend the next lesson or the review. Show only the current level's check (and the ones below
  it), with higher levels behind "Show all levels".

### R2-4. The "Why?" panel can show a generic, above-level error explanation (minor)
- **Persona / route / size:** Noa; `#/lesson/pa1-08` (ordinal numbers, typing "three" for "third"); 390x844.
- **Observed:** the specific feedback is good ("For order, use third (3rd), not three"), but "Why?" then adds the
  generic card for the error type "word choice / collocation": "there are fixed collocations: make a decision, do
  homework, strong coffee", which has nothing to do with ordinal numbers and uses B1 vocabulary in a Pre-A1 lesson.
  `shots/noa-71-bidi-in-lesson-feedback.png`.
- **Why it matters for Noa:** she opens "Why?" to understand her mistake and gets an unrelated rule in words she does
  not know.
- **Recommendation:** when an exercise has its own explanation, show only that under "Why?" and drop the generic
  error-type card, or show the card only when its examples match the lesson's level and topic.

### R2-5. The Speaking lab's shadowing list is one flat list of 79 sentences (minor)
- **Persona / route / size:** Avi; `#/speaking`; 390x844 (13.9 screens long) and 1440x900.
- **Observed:** below the sound pairs, "Shadowing" lists every lesson speaking sentence from Pre-A1 to C2 in one
  ordered list (79 rows) with no level grouping, no "recommended for your level" mark and no suggested next sentence,
  unlike the Reading and Listening centres, which use the level-grouping helpers in `js/ui/center.js`. `shots/avi-20b-speaking-full.png`, `shots/avi-27-speaking-desktop.png`.
- **Why it matters for Avi:** shadowing is his safest way to start speaking, but he has to scroll past dozens of
  Pre-A1 lines or guess which B1/A2 sentence suits him. A low-confidence user is likely to give up on the list.
- **Recommendation:** group the list by level with the helpers already in `js/ui/center.js` (`groupByLevel`,
  `recommendedLevel`, `nextSuggestion`), open his level, collapse the others, and put one "Next sentence for you"
  button at the top of the section.

### R2-6. Lesson explanations default to English-on-tap for a learner who demonstrated A2 (minor)
- **Persona / route / size:** Avi; `#/lesson/b1-01` (explanation, feedback) and the shadowing player; 390x844.
- **Observed:** placement said "you showed control up to A2, we'll start at B1". Hebrew support follows the course
  level, so in his first lesson every explanation block, every feedback line and the shadowing articulation note is
  English with a small "עב" button (the setting's "by level" rule: Hebrew on tap at B1-B2). Changing it means finding
  "Hebrew explanations" in Settings. `shots/avi-14-b1-learn.png`, `shots/avi-15-b1-e3-wrong.png`,
  `shots/avi-25-shadow-heard.png`.
- **Why it matters for Avi:** he reads A2 English. Taking in a new tense from B1-level English, while low on
  confidence, makes the first lesson feel like a test of reading. The roleplay already derives Hebrew help from the
  scene and the learner (P-17), so the lesson player is now the odd one out.
- **Recommendation:** after placement, base "auto" Hebrew support on the demonstrated level (A2 gives "partial"), or
  ask once on the first lesson above the demonstrated level: "Show Hebrew explanations too?" (with a link to the
  setting).

### R2-7. "I'm stuck" phrases are copied with someone else's name (minor)
- **Persona / route / size:** Avi; AI roleplay, `#/scenario/rl-hotel-checkin-basics?tab=roleplay`; 390x844.
- **Observed:** the first help phrase is "Hi, I'd like to check in. My name is Dana Cohen." Tapping it copies the
  whole sentence into the reply box; Avi, frozen, sent it unchanged and checked in as Dana Cohen. The (mocked) report
  then quoted that sentence back to him under "What worked". The panel does say "then change it as you like", but the
  name is not marked as something to change. `shots/avi-40-roleplay-stuck.png`, `shots/avi-41-roleplay-hint.png`,
  `shots/avi-42b-report-full.png`.
- **Why it matters for Avi:** "I'm stuck" is used exactly when he cannot think. A sentence that needs editing before
  it is true sets him up for a confusing exchange (the partner then asks him to spell "Cohen").
- **Recommendation:** mark slots in help phrases ("My name is ___") and select the slot after copying, or fill it
  from the profile name when there is one.

### R2-8. The "What was recognised" panel marks missed words like spelling errors (polish)
- **Persona / route / size:** Noa and Avi; lesson speaking items and shadowing; 390x844.
- **Observed:** words the recogniser did not return are shown in red with a wavy underline, the usual spell-check
  "error" look. In "My name is Maya. M-A-Y-A." the spelled letters are red even when said correctly, because
  recognisers rarely return spelled letters; in Avi's shadowing half the sentence is red. The note under it ("not a
  score or an accent check") is good but small. `shots/noa-42-e12-heard-mismatch.png`, `shots/avi-25-shadow-heard.png`.
- **Why it matters:** both personas read red as "wrong". The fix for N2/A2 removed the verdict; the colour still
  carries it.
- **Recommendation:** use a neutral style for words that were not caught (grey with a dotted underline, "not caught"
  in the legend), and when the target spells letters out, add "Recognition often can't show spelled letters".

### R2-9. The roleplay's no-account state offers only "Sign in" (polish)
- **Persona / route / size:** Avi; roleplay tab without an account; 390x844.
- **Observed:** "To talk with AI you need to sign in to an account" with buttons "To scripted practice" and "כניסה"
  (Sign in). Avi has no account; sign-up is behind "I don't have an account" on the next screen (the return route is
  kept, which works). `shots/avi-35-roleplay-noaccount.png`, `shots/avi-36-signup.png`.
- **Recommendation:** label the link "Create an account or sign in" and open the account screen in sign-up mode when
  the device has never signed in.

### R2-10. Report strengths and practice points are English-only (polish)
- **Persona / route / size:** Avi; roleplay report; 390x844 and 1440x900.
- **Observed:** the outcome summary has a Hebrew version, but "What worked" and "What to practise" have none, and the
  practice bullets are left-aligned under right-aligned Hebrew headings. `shots/avi-42b-report-full.png`,
  `shots/avi-55-report-desktop.png`.
- **Why it matters for Avi:** the strengths are the part meant to build his confidence; in an A1 scene with Hebrew
  tips on, they should be as easy to read as the summary.
- **Recommendation:** add `strengths_he` (or a translation on tap) for scenes at A2 and below, and align the lists
  with their headings.

### R2-11. Offline, an unsaved lesson is a dead end with no offline alternative (polish)
- **Persona / route / size:** Noa on the bus; `#/lesson/pa1-06` offline; 390x844.
- **Observed:** the message is honest ("could not load the lesson; maybe no connection") with "Try again" and "To the
  path". It does not mention what does work offline (the review, lessons already opened) or that lessons can be saved
  in Settings before a trip. `shots/noa-52-offline-lesson6.png`. (Today, the next lesson and the review did work
  offline: `shots/noa-50-offline-today.png`, `shots/noa-51-offline-lesson2.png`, `shots/noa-55-offline-review.png`.)
- **Recommendation:** add "Review your words (works offline)" and a line "Next time, save lessons in Settings before
  you go offline".

---

## What now works well

**For Noa**
- The first screen fits every phone width, onboarding takes four short steps with counters in words, the age
  question is neutral and a refusal is kind and stores nothing.
- The under-18 note and the policy now say only what is true, and the microphone is explained before first use, with
  "Not now" and self-marking as real alternatives.
- No streaks, XP, leaderboards or guilt dialogs. The weekly goal ("1 of 5 days. A day off erases nothing.") is the
  only count she sees, and it is framed kindly.
- Speaking is now safe for an embarrassed beginner: "Can't speak right now" skips with no penalty, nothing spoken is
  scored, and nothing from recognition becomes a "mistake".
- Wrong answers explain the specific confusion in Hebrew ("Y is 'why'; you heard 'jay', which rhymes with day"), the
  verdict is readable on a 320px phone, and letter tiles can be played aloud.
- The next lesson and the review worked offline after one online visit.

**For Avi**
- Placement is calm ("no score and no failing", "'I don't know' beats guessing"), honest per skill, and never rates
  his speaking or writing.
- Shadowing and "Say it" never judge him: "Speaking practice recorded – not scored", and minimal-pair feedback says
  what the word was heard as and what it means ("ship, meaning ספינה, not כבשה"), with a tip to try again slowly.
- The roleplay has a way out he controls ("I'm stuck", Hebrew tips on for an easy scene), promises no corrections
  mid-conversation, and its report leads with the outcome in words and something he did well, with scores folded away.
- Signing up from the roleplay brings him back to the roleplay; the tutor's pronunciation mode says honestly that it
  cannot hear him.
- An unwritten lesson (simulated) is handled honestly everywhere: Today skips it and says why, the path labels it
  "בהכנה", and the dead end offers the next ready lesson.

---

## Overall verdict per persona (simulated)

**Noa — would likely keep using Lucid, with two risks.** The things that would have stopped her in round 1 (a
broken first screen, being graded on her voice, a misleading privacy promise) are fixed, and there is no pressure
mechanic to push her away. What could still stop her: failing lesson 1 narrowly and, after "Later", being sent back
to the start of the lesson instead of to the four she missed (R2-2), and Hebrew explanations with scrambled brackets
on the screens meant to help her (R2-1). The 10-minute plan that does not tell her when today's part is done (N7)
adds to the feeling of falling behind.

**Avi — would likely keep using Lucid, mainly for the speaking lab and scenarios.** Nothing he does aloud is graded,
the roleplay gives him help on demand and leads its report with what worked, and his first "Start" no longer fails.
What could stop him: English-only explanations in his first B1 lessons when he demonstrated A2 (R2-6), a long flat
shadowing list with no "start here" (R2-5), and red-marked words in the recognition panel that still read as errors
(R2-8).

## The 5 most important fixes for these personas

1. **Keep bracket pairs inside the English isolate** (R2-1): fix `englishSpan()`, add unit cases, and add a content
   validator check; 275 strings are affected.
2. **Offer "practise the ones you missed" again after leaving** (R2-2): from Today and the lesson intro whenever
   `progress.missed` exists.
3. **Mark the end of today's part in the lesson player** (N7 residual), and count Today's totals without retries (N6
   residual).
4. **Hebrew support from the demonstrated level after placement** (R2-6, A10 residual), including the shadowing
   articulation note.
5. **Group shadowing by level with a "next sentence for you"** (R2-5), and make unrecognised words neutral rather
   than red (R2-8).
