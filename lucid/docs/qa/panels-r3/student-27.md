Simulated review (AI persona), not real user research.

# Student panel, round 3: Omer, 27 (B2, works in English)

## Who I am

Omer, 27, software developer. I read English documentation all day without trouble, but I freeze when I have to speak in meetings and I write work emails slowly. I want a tool that respects my time, goes straight to what I need (emails, meetings, stand-ups) and tells me the truth about my level. I used a laptop at 1440x900 and a phone at 390x844.

## What I did

1. Opened `#/` and went through onboarding at `#/start` in Hebrew: name Omer, born 1999, goals "עבודה ושיחות מקצועיות" + "ביטחון בשיחה", 20 minutes, starting point "אני די בנוח/ה: קורא/ת וכותב/ת לא רע".
2. Did the placement test honestly as a B2 learner: everything right up to B1 apart from a slip, most of B2 right (wrong on "is said to employ"), C1 mostly wrong or "לא יודע/ת" (3 of 8 right), never reached C2. It asked 20 questions and placed me at B2.
3. Looked at `#/today`, `#/path`, `#/path/B2` and `#/progress`.
4. Did lesson `#/lesson/b2-01` (narrative tenses) through to the end, including the 180-280-word writing task. Started `#/lesson/b2-02`, left after 3 exercises and came back through the Path.
5. Switched the interface to English in `#/settings`. Everything below this point was in English.
6. Did the two B2 workplace scenarios in Real life: `#/scenario/rl-work-disagree-politely` and `#/scenario/rl-work-email-extension`. I went through the Prepare, Model dialogue, Practise and AI roleplay tabs, and in Practise I picked the best reply and then wrote my own words.
7. Writing lab, `#/writing` and `#/writing/free`: wrote a work email in "Email" mode, ran the checks, and looked at the AI feedback and Versions tabs.
8. Speaking lab, `#/speaking`: minimal pairs and shadowing (`#/speaking?l=b2-08&e=e15`). Then the tutor (`#/tutor`), `#/conversations`, `#/practice` and `#/review`.
9. Took the B2 level check, `#/checkpoint/B2`: 13 of 16, 81%. Then looked at `#/progress`, `#/profile`, `#/path/B2` and `#/grammar` again.
10. Phone (390x844), English UI, B2: `#/today` with a 10-minute plan, lesson `b2-08` (Formal or informal?), the stand-up scenario, free writing (email) and `#/progress`.

The screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/student-27/`. Every file name below is in that folder.

## What worked for me (keep this)

- **The placement test respects me.** 20 questions, "לא יודע/ת" is always there, and nothing is graded during the test. The result says exactly what was measured: "הראית שליטה עד רמה B2, בשתי סדרות של שאלות". It also says what was *not* measured: "דיבור / כתיבה: לא נבדק במבחן הזה". The striped "first estimate" bar on Progress is an honest touch (`08-placement-result.png`, `13-progress-initial.png`).
- **"ישר לתרגול / Skip to practice"** on every lesson intro. The explanation is long and dense, which is fine at B2 (`20-lesson-screen1.png`), but I can skip it.
- **Feedback aimed at Hebrew speakers.** I typed "I have known Amir for ten years when we started our company." The answer was specific: "Have known connects to now. The ten years ended at a past moment… so step back from it: had known." (`21-fb-e13.png`). The scenario explains "'suggest' doesn't take 'to'". This is the kind of teaching I can't get from a generic app.
- **It accepts other correct answers.** "By the time we reached the stadium, the match had already started." was accepted. When "I went to Rome last summer and really loved it." was not on the list, the screen said "לא אחת מהתשובות שלנו" and offered "גם התשובה שלי נכונה" (`21-fb-e11.png`). That treats me as an adult.
- **The workplace scenario content is real.** A product manager pushing a Monday launch while payments crash on older phones. Useful phrases are tagged by register. The US/UK note that "table a topic" means opposite things is gold. The culture tips are good too (`50-prepare.png`).
- **Honesty about AI being off.** The tutor says "we do not show a fake conversation" and points me to other tools. Roleplay says that it is unavailable and sends me to the scripted practice (`80-tutor.png`, `50-roleplay.png`). The own-words check says "This check only looks for key words. It does not check grammar…".
- **No guilt.** "A day off erases nothing." There are no streaks, and the plan is split into parts with "Your place is saved".
- **Email mode in free writing** caught "didn't got" and "discuss about", with one-line explanations (`62-email-checks.png`). Versions are saved.
- **Shadowing with stress marking on work sentences**, for example "I was WONdering if it would be POSSible to MOVE our MEETing…" (`71-shadow.png`).
- **At B2, Today offers to switch the interface to English** ("ממשק באנגלית הוא עוד תרגול יומיומי"). That is a good nudge (`10-today.png`).

## What did not work (findings)

### 1. "Skip to practice" silently restarts a lesson in progress and wipes my first-try mistakes (major)
- **Route:** `#/lesson/b2-02` (and `b2-01`), entered from `#/path`.
- **What I saw:** I left b2-02 after exercise 3. When I came back from the Path, the intro shows two orange buttons. One is a small "להמשיך מאיפה שעצרתי" inside a banner ("עצרתם באמצע: 4 מתוך 16"). The other is the footer primary "בואו נלמד" with the **Enter** key hint, next to "ישר לתרגול" (`32-lesson2-intro-with-resume.png`). In b2-01 I had got e2, e11 and e13 wrong. I then went back in through "ישר לתרגול", which restarted at exercise 1 with no warning. The completion screen said "ענית נכון בניסיון הראשון על 100% מהתרגילים" (`21-end-17.png`). That is not my first try.
- **Why it matters:** the lesson score is supposed to be evidence. Here, re-entering the lesson the "wrong" way rewrites it, and the two primary-looking buttons make that easy to do by accident.
- **Suggestion:** when a saved place exists, make "Continue where I left off" the single primary button and bind Enter to it. Rename the secondary to "Start practice again from exercise 1" and confirm before discarding the place. Keep the first-run first-try marks, or label a redo as "second attempt".

### 2. "B2: demonstrated" in the level check, but nothing in my skill profile changes (major)
- **Routes:** `#/checkpoint/B2` → `#/progress`, `#/today`, `#/path/B2`.
- **What I saw:** 81% with no help. The headline says "B2: demonstrated. 81% with no help. This is recorded in your skill profile." (`92-check-result.png`). On Progress, "Level by skill" is unchanged: Grammar "Not yet assessed", and Vocabulary, Reading and Listening still show the striped placement estimate (`93-progress-after-check.png`). Only the Level checks list shows "B2 81%". The Path still says "Your current level" B2, next lesson b2-02, and offers "Start from B2 / Test myself / Retake the placement test". There is no offer to move to C1 (`95-path-b2-after.png`).
- **Why it matters:** the screen promises something that the profile doesn't show. A learner who proves a level wants to know what it changed.
- **Suggestion:** show the level check as evidence in each skill row it covered, for example "Grammar: B2 shown in level check (81%, 2 Nov)". On the result screen, say what happens next: "Writing task still needed for full B2", and "Move on to C1 / keep B2 lessons as review".

### 3. "Not yet assessed" for grammar is not true after 30+ grammar answers (major)
- **Routes:** `#/progress`, `#/today` (Level by skill panel), placement result.
- **What I saw:** in placement I answered 5 grammar questions, and the result said "דקדוק: אין מספיק תשובות" (`08-placement-result.png`). Progress then said "דקדוק: עוד לא נבדק" (`13-progress-initial.png`). After a full grammar lesson at 100% and 3 more exercises, it still says "Grammar: Not yet assessed" (`44-progress-en.png`, `42-today-en.png`). The Grammar lab meanwhile says "Narrative tenses and past perfect: Practising, 16 answers" (`96-grammar.png`). The rule in the small print (6+ answers, 75%, 2 different days) explains it, but the label says the opposite of what happened.
- **Suggestion:** replace "Not yet assessed" with the real state, for example "Collecting evidence: 31 answers at B2, 94% right. Needs a second day." Use the same words on the placement result ("5 answers, 1 of 2 at B2: not enough to set a level") so the two screens agree.

### 4. Email mode promises email feedback that the automatic checks don't give (major)
- **Route:** `#/writing/free`, kind "Email".
- **What I saw:** choosing Email shows "No argument checks. Feedback looks at the email's purpose, its reader, and how it opens and closes." With AI off, the checks were word count, capitals, end punctuation, connectors ("result so") and two grammar hits (`62-email-checks.png`). Nothing was said about greeting, sign-off, the request or the reader. It missed the two errors Hebrew speakers make most in work emails, and I made both: "I can't finish the report **until** Thursday… send you the first part **until** Wednesday" (עד, should be *by*) and "I **will be happy if** we can move the deadline" (אשמח אם). On the phone, a correct 23-word email got "⚠ 23 words (at least 30)" and "No connectors found" (`P5-bottom.png`). A short email is a good email.
- **Suggestion:** without AI, add deterministic email checks: greeting and sign-off present, one clear request (a question or "could you / would it be possible"), a date with "by", and flags for "until + deadline", "I will be happy if", "I am writing you" and "please advise". Drop the 30-word floor and the connector count for emails and messages. Add a short model email and a self-check list, like the lesson writing task has. Until then, change the descriptor so that it doesn't promise purpose or reader feedback.

### 5. There is no work-writing path: "Work" only adds one scenario a day (major)
- **Routes:** `#/start` step 2, `#/writing`, `#/path/B2`.
- **What I saw:** the only writing goal in onboarding is "כתיבה אקדמית וטיעונית" (`03-ob-step2.png`). The Writing lab is "Ten stages from the first sentence to an independent argumentative essay". My stage 5 tasks are "AI tools for homework" and "Smartphones in secondary schools", and the B2 final is a 500-word argumentative essay (`60-writing-hub.png`). The placement result told me "C1 and C2 lessons are about academic argument… so we'll start at B2". But B2 ends with "Building an argument" and an argumentative essay too. The one lesson that serves my need, b2-08 "Formal or informal?", is number 8 of 10. There are 6 work scenarios in total and only 2 are at B2 (`43-reallife-en.png`).
- **Suggestion:** add a "Work emails and messages" writing strand (request, decline, follow up, status update, escalate) at B1 to C1, with the checks from finding 4. Let the "work" goal pull b2-08 forward on Today. Let a non-academic learner swap the B2 final task for a work task (for example a 250-word incident summary or proposal email).

### 6. The Speaking lab doesn't touch my real problem: speaking on the spot (major for this learner)
- **Routes:** `#/speaking`, `#/tutor`, `#/conversations`.
- **What I saw:** the lab offers minimal pairs (ship/sheep and so on) first, then shadowing of one sentence per lesson with "I said it clearly / I need more practice" self-rating (`70-speaking.png`, `71-shadow.png`). The tutor and the AI roleplay are off. In the scenarios, the microphone is only a dictation button for the own-words box. Nothing makes me produce 30 to 60 seconds of my own speech: a stand-up update, disagreeing with Tom, explaining a bug.
- **Suggestion:** a no-AI "Speak on the spot" drill built from the work scenarios. Show a prompt and a 10-second prep timer, then speak for 45 seconds (timing opt-in, per the brand). Show the browser transcript next to the scenario's key phrases. The learner gets a self-review: "used: my concern is ✓, what if we ✓; fillers: 6", then retries and compares the two attempts. This works with speech recognition only and gives no grade, which keeps the honesty rule.

### 7. The own-words check praises replies that are off-topic or wrong (minor)
- **Routes:** `#/scenario/rl-work-email-extension?tab=practise`, `#/scenario/rl-work-disagree-politely?tab=practise`.
- **What I saw:** my reply began "Hi Dana…" in an email to James. Dana is the person who is late with the figures. The reply also said "until Friday", although the deadline is Thursday. The answer was a neutral "We did not find the words we expected" (`51-own-0.png`). On another turn, the partner was asking me to copy Dana in, and I replied about sending "the first part until Wednesday, is it ok?". The screen still said "Your reply has a question back, which keeps the conversation going." (`51-own-2.png`). "…fix the bug until Thursday?" got "Your reply has words that fit this situation: first, percent" (`50-own-3.png`). The disclaimer is honest, but the positive sentence is the one I remember.
- **Suggestion:** reuse the writing analyzer's patterns in this box: "until" with a deadline, "suggest to" and "discuss about" (it already catches the last one in free writing). Turn the scenario goal into a 3-item checklist per turn ("named the problem / gave a new date / offered something") instead of praising keywords.

### 8. "Next scenario" after a B2 work scenario is an A2 one (minor)
- **Routes:** the end of Practise in both B2 work scenarios.
- **What I saw:** "Practice complete. You chose the most natural reply 5 times out of 5… Next scenario: First day: meeting your new team". That scenario is A2, "Below your level" (`50-practise-end.png`, `51-practise-end.png`). The B1 "Stand-up" and "Checking what a task really involves" were still not done.
- **Suggestion:** within the same module, prefer the closest level at or below mine (B2, then B1), and only fall back to lower levels after that.

### 9. Real life ignores my goal in its ordering (minor)
- **Route:** `#/real-life`.
- **What I saw:** "Start here" correctly suggests the work scenarios. Below it, the categories are always in the order Airports, Hotels, Emergencies… and "At work" comes last. Inside "At work", the two A2 scenarios are shown first and the B2 ones are hidden behind "Show all 6" (`43-reallife-en.png`). `#/conversations` has the same order.
- **Suggestion:** put the goal's category first, and sort each category by fit to my level (at level, then just below, then far below).

### 10. A 10-minute day gives me 2 exercises (minor)
- **Route:** `#/today` with a 10-minute plan (phone).
- **What I saw:** "The whole lesson takes about 25 min, so today is a part: up to exercise 2 of 16." (`P1-today.png`). At 20 minutes it was "עד תרגיל 8 מתוך 16, כ-16 דקות" (`10-today.png`). I always press "Skip to practice", and the 16 exercises of b2-01 did not take me anything like 25 minutes, but the plan still budgets for the explanation.
- **Suggestion:** if the learner usually skips the explanation, budget practice only, about 6 exercises in 10 minutes. Or say "up to exercise 6 if you skip the explanation".

### 11. The placement result doesn't say where my ceiling is, and its offer is confusing (minor)
- **Route:** the end of `#/placement`.
- **What I saw:** I got 3 of 8 at C1 (I missed inversion, cleft sentences and "undermined"). The result says nothing about C1 except the offer "מרגישים מוכנים ליותר? אפשר להתחיל ב-C1 במקום, או קודם להראות את B2 בבדיקת רמה קצרה" (`08-placement-result.png`). The sentence just above it reads "הראית שליטה עד רמה B2". Being asked to "show B2" one line after I was told I showed it reads as a contradiction.
- **Suggestion:** add one honest line: "At C1: 3 of 8. Inversion and cleft sentences were the gaps." Reword the offer to "Want to skip B2 lessons? Pass the B2 level check (16 questions) and go straight to C1."

### 12. The writing task flags the lesson's own target structure as a run-on (minor)
- **Route:** `#/lesson/b2-01`, exercise 16 (write).
- **What I saw:** "ייתכן משפט רץ ', I had' שני משפטים שלמים מחוברים בפסיק" (`21-fb-e16.png`). It was flagged on "But by the time the meeting started, I had written down every step". That is a correct "by the time" sentence, the exact pattern the lesson teaches. The flag appears when the sentence starts with "But" in front of the subordinate clause.
- **Suggestion:** skip one leading coordinator (but, and, so) before the subordinator test, and add "by the time" to the subordinators.

### 13. The level check result renders without the app frame (minor)
- **Route:** `#/checkpoint/B2`, result screen.
- **What I saw:** at 1440x900 the result has no sidebar and no page margin. The headline "B2: demonstrated" and the cards start at the very left edge of the window (`92-check-result.png`).
- **Suggestion:** render the result inside the normal page layout (or the player layout with its gutters), like the lesson completion screen (`21-end-17.png`).

### 14. Lesson example sentences change alignment in the Hebrew UI (polish)
- **Route:** `#/lesson/b2-01`, learn stage, "דוגמאות".
- **What I saw:** example sentences that wrap are left-aligned, and one-line sentences are right-aligned ("When I got home, I realised I had left my keys at the office." sits on the right). Their notes are left-aligned (`20-crop-examples.png`). The column looks ragged.
- **Suggestion:** give the English line of `.example` `dir="ltr"` and `text-align:left` (start) as a block, like the note under it.

### 15. The write-task self-check list breaks on long items (polish)
- **Route:** `#/lesson/b2-01`, exercise 16 after "בדיקה".
- **What I saw:** under "בדקו את עצמכם", the long second item has its checkbox alone on one line and its English text on the next, full width. The other items are right-aligned English with the checkbox on the right (`21-fb-e16.png`).
- **Suggestion:** use a grid with the checkbox in a fixed column, and give the English text a left-to-right block.

### 16. The placement progress bar looks finished early (polish)
- **Route:** `#/placement`.
- **What I saw:** at question 19 of 20 the bar is already about 95% full. It looked nearly complete from question 16 (`09-placement-q19.png`, `07-placement-q16.png`). The counter shows "19" with no total.
- **Suggestion:** say "about 20 questions" in the intro, and make the bar show the remaining blocks, not a fixed 18.

### 17. The English UI still shows Hebrew under almost everything (polish)
- **Routes:** `#/today`, `#/real-life`, sidebar.
- **What I saw:** with English UI and Hebrew support "By level" ("on tap at B1 and B2"), every nav item ("Today / היום"), lesson card ("If I had known… / תנאי שלישי ומעורב") and scenario card still shows a Hebrew subtitle (`42-today-en.png`, `43-reallife-en.png`).
- **Suggestion:** follow the Hebrew-support setting here as in lessons: hide the subtitles at B1+ when the UI is English, and show them on tap or hover. Also, "1 answers" in the Grammar lab (`96-grammar.png`) should be "1 answer".

### 18. Settings for AI that is off on this site (polish)
- **Route:** `#/settings`.
- **What I saw:** "כמה תיקונים בשיחה ובמורה" and "משוב על כתיבה" are fully active, even though AI is off and the AI row says "(משוב AI עוד לא זמין באתר הזה.)" (`40-settings-he.png`).
- **Suggestion:** grey these two groups out, with the same note.

## My top 3 wishes

1. **A work-communication strand.** Emails, Slack messages and stand-up updates at B1 to C1, with deterministic email checks (greeting and sign-off, a clear request, "by" not "until", "I'd be grateful if" not "I will be happy if") and a model text plus a self-check list. Let the "work" goal bring b2-08 and these tasks into Today.
2. **Speaking on the spot without AI.** Timed, opt-in prompts from the work scenarios (stand-up, disagreeing with Tom). Show the browser transcript beside the key phrases and the filler count, give a self-review, retry, and compare the attempts. My problem is freezing, not "ship/sheep".
3. **Progress that tells the truth and acts on it.** Use "collecting evidence (31 answers, 94%, 1 of 2 days)" instead of "Not yet assessed". Show a passed level check in the skill profile, with an offer to move to C1. A lesson re-entry must never rewrite my first-try record.
