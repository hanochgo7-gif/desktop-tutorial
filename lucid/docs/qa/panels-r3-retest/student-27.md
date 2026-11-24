Simulated review (AI persona), not real user research.

# Student panel, round 3 re-test: Omer, 27 (B2, works in English)

## Who I am

Omer, 27, software developer. I read English fine, but I freeze when I speak in meetings and I write work emails slowly. I want the app to respect my time, take me to emails, meetings and stand-ups, and tell me the truth about my level. I tested on a laptop at 1440x900 and on a phone at 390x844. I started in Hebrew and switched to the English UI.

## What I did

1. Onboarding at `#/start` in Hebrew: name Omer, born 1999, goals "עבודה ושיחות מקצועיות" and "ביטחון בשיחה", 20 minutes, "אני די בנוח/ה". Then the placement test, answered as an honest B2: B1 and B2 right with one slip, C1 wrong. It asked 16 questions and placed me at B2.
2. `#/today`, `#/path/B2`, `#/progress`.
3. Lesson `#/lesson/b2-01`. I used "ישר לתרגול", got e2 wrong and left at exercise 6. I came back from `#/path/B2`, tested Enter on the intro, left again and used "להתחיל מההתחלה" with its dialog. Then I did the whole lesson: a first answer of mine that is not on their list at e11, a classic Hebrew-speaker error at e13 with a second try, and the 202-word story at e16.
4. The learn stage examples, `#/settings` in Hebrew, then a switch to the English UI.
5. In English: `#/today`, `#/real-life`, `#/grammar`, `#/practice`, `#/conversations`.
6. Scenarios `#/scenario/rl-work-email-extension` and `#/scenario/rl-work-disagree-politely`. I used select-then-check in Practise and my own words on most turns, with the errors I really make.
7. `#/writing`, then `#/writing/free` in Email mode with three emails: my original email, a correct 22-word email, and an email with no sign-off.
8. `#/speaking`, shadowing `#/speaking?l=b2-08&e=e15`, `#/tutor`, `#/review` (all 8 cards), `#/checkpoint/B2` (75%), then `#/progress`, `#/path/B2` and `#/profile`.
9. Phone, English UI: `#/today` at 10 minutes, `#/path`, and a fresh B2 learner at 10 minutes (Today, then the lesson part). Also the B1 stand-up scenario with my own words, and `#/games` with one word-game question.

The screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/student-27/`. Every file name below is in that folder.

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Evidence now |
|---|---|---|---|
| 1 | "Skip to practice" restarts a lesson in progress and wipes first-try mistakes | **fixed** | With a saved place, the intro has a banner first: "עצרתם בתרגיל 6 מתוך 16. התשובות שכבר נתתם שמורות." The only primary key is "להמשיך מתרגיל 6 מתוך 16" with Enter. The secondary keys are "להסבר" and "להתחיל מההתחלה", and "ישר לתרגול" is gone (`20-intro-fresh.png`). The Path link resumes directly at e6. "להתחיל מההתחלה" opens a dialog: "התשובות שכבר נתתם בניסיון הראשון נשמרות ונספרות בציון". After the restart, with every answer right, the end screen said **84%**, not 100%. It kept my first-try miss on e2 and listed it under "כדאי לשים לב" (`24-restart-confirm.png`, `27-end.png`). |
| 2 | "B2: demonstrated… recorded in your skill profile" but the profile doesn't change | **partly** | The result now says: "75% with no help. Recorded as evidence for B2. Your level by skill updates after one more day of practice." It also has a "Go on to C1" primary key (`92-check-result.png`). Progress rows now say "B2 in a level check, 75%" for Vocabulary, and 100% for Grammar and Listening (`93-progress-after-check.png`). But `#/path/B2` still says "This is your current level / To the B2 level check / Retake the placement test". It shows only "75%" on the check row and no way to C1 (`95-path-b2-after.png`). |
| 3 | Grammar "Not yet assessed" after 30+ answers | **fixed** | "דקדוק: אוספים ראיות: 11 תשובות ב-B2, 80% נכון · יום 1 מתוך 2" (`40-progress-after-lesson.png`). In English, Today's panel says the same: "Collecting evidence: 11 answers at B2, 80% right · day 1 of 2" (`43-today-en.png`). |
| 4 | Email mode promises email feedback the checks don't give | **partly** | Big step. The descriptor is honest now: "No argument checks and no word minimum. The checks look for a greeting, one clear request and a sign-off…". There is a self-check list and a model. A correct 22-word email gets no length or connector warning (`63-email2-short.png`). A missing sign-off is flagged, and so is "I am writing you". "I will be happy if", "didn't got" and "discuss about" are flagged in my original email (`62-email1.png`). **But it still misses both "until" errors in that email.** "…so I can't finish the report until Thursday" is skipped on purpose as a negative. "…send you the first part, with the competitors analysis, until Wednesday" is too far from the verb for the rule to catch. The descriptor itself names "until for by" as its example. "Please advise" is not flagged. |
| 5 | No work-writing path; the Work goal adds only one scenario a day | **not-fixed** (deferred in the plan) | `#/writing` still says "Ten stages… to an independent argumentative essay". "Your stage: 5" offers "AI tools for homework" and "Smartphones in secondary schools", and the B2 final is still the 500-word argumentative essay (`60-writing-hub.png`). The next lesson is still b2-02, so b2-08 "Formal or informal?" isn't pulled forward. The plan marks this as new content, postponed on purpose. |
| 6 | The Speaking lab doesn't train speaking on the spot | **not-fixed** (deferred in the plan) | `#/speaking` is the same: minimal pairs, then shadowing with self-rating (`70-speaking.png`, `71-shadow.png`). There is no timed or untimed "say your stand-up update" drill. |
| 7 | The own-words check praises off-topic or wrong replies | **partly** | In the B2 work scenarios it is now real teaching. "until Friday", "until Wednesday" and "until Thursday" each get "by for a deadline". "I will be happy if" gets "I'd be grateful if", and "cant", "I am agree" and "discuss about" are all flagged. A goal checklist replaces the praise: "Greet or thank James ○" caught my "Hi Dana" (`50-own-0.png`, `51-own-0.png`). Gaps: "I suggest to wait" and "the app crash on old phones" are not flagged (scenario `rl-work-disagree-politely`). In the B1 stand-up, which has no checklist, "Yesterday I finish the login page. Today I will fix the bug until the evening." still gets "Your reply has words that fit this situation: yesterday." (`P8-own-words-phone.png`). |
| 8 | "Next scenario" after a B2 work scenario is an A2 one | **fixed** | After the email scenario: "Next scenario: Meeting: disagreeing politely" (B2). After that one: "Stand-up: a quick status update" (B1). |
| 9 | Real life ignores my goal in its ordering | **fixed** | "Start here" shows the two B2 work scenarios and the B1 stand-up. "At work" is the first category, with the B2 items first (`44-reallife-en.png`). Small leftover: the filter chip row is still "All, Airports, Hotels… At work", so "At work" comes last there. |
| 10 | A 10-minute day gives me 2 exercises | **partly** | A fresh B2 learner at 10 minutes gets "up to exercise 4 of 16", and the part stop came after exactly 4 exercises (`P4-today-10-fresh.png`). That is twice as much as before. But the part is still "about 11 min" for 4 exercises, because it budgets the explanation I skip. I'd do about 6 in that time. |
| 11 | The placement result doesn't show my ceiling, and its offer is confusing | **partly** | There is a new honest line: "ב-C1, הרמה שמעל: 0 מתוך 4 נכונות." The offer is unchanged, though: "אפשר להתחיל ב-C1 במקום, או קודם להראות את B2 בבדיקת רמה קצרה". It still sits right under "הראיתם שליטה עד רמה B2" (`08-placement-result.png`). It doesn't name the gaps either. |
| 12 | The writing task flags "But by the time…, I had" as a run-on | **fixed** | The same sentence in a 202-word story now gets no run-on flag (`29-fb-e16.png`). |
| 13 | The level-check result renders without the app frame | **fixed** | At 1440 the result is a centred column with margins (`92-check-result.png`). There's still no sidebar, but it reads well. |
| 14 | Lesson example sentences change alignment | **fixed** | All 8 `.example` blocks are `direction:ltr; text-align:left` at x=368, whether one line or two (`31-examples.png`). |
| 15 | The self-check list breaks on long items | **fixed** | It is a grid now: each box in its own column, long items wrap beside the box (`29-fb-e16.png`). |
| 16 | The placement bar looks finished early | **fixed** (one new wrinkle) | The counter reads "שאלה 4 מתוך כ-20", and at the last question the bar is at 94% (`07-placement-q16.png`). New: at question 13 the estimate dropped from "כ-20" to "כ-16", and the bar jumped from 55% to 75% in one step. |
| 17 | The English UI still shows Hebrew under almost everything; "1 answers" | **partly** | The sidebar has no Hebrew subtitles now (`43-today-en.png`). The cards on Today, Real life, Conversations and Path still carry Hebrew subtitles at B2 in the English UI, and on Path every can-do line is repeated in Hebrew. The singular bug survives in the new copy: "Collecting evidence: **1 answers** at B2" (Progress, English) and "אוספים ראיות: **1 תשובות**". |
| 18 | Settings for AI that is off on this site | **fixed** | The Feedback card starts with "AI לא פעיל באתר הזה. כל השאר עובד." The correction-amount and writing-feedback segments are greyed (`aria-disabled`), and the AI checkbox is disabled (`41-settings-ai-crop.png`). The tutor now shows its notice first, with no mode chips (`72-tutor.png`). |

## New findings

### N1. The own-words result sits under a green "Spot on" footer that hides part of it (minor)
- **Routes:** `#/scenario/rl-work-email-extension?tab=practise`, and the stand-up on the phone.
- **What I saw:** I picked the best reply, so the sticky footer says "✓ Spot on · Continue". I then wrote my own reply, and the box listed three mistakes ("cant", "until Friday", "I will be happy if"). The green "Spot on" bar stays fixed over that list, and at 1440 it covers the head of the "until Friday" card (`50-own-0.png`). On the phone it covers the result line itself: "Your reply has words that fit this situation: …" is cut off under "Spot on" (`P8-own-words-phone.png`).
- **Why it matters:** the last thing I see next to my own sentence is "Spot on", and that was about the multiple-choice pick.
- **Suggestion:** when the own-words box opens, change the footer to a neutral "Continue". At least, add bottom padding equal to the footer height so the feedback can scroll clear of it.

### N2. The email check skips the most common "until" deadline error (minor; part of #4)
- **Route:** `#/writing/free`, Email.
- **What I saw:** "I can't finish the report until Thursday" (I meant *by*) and "send you the first part, with the competitors analysis, until Wednesday" were not flagged. The descriptor uses "until for by" as its example (`62-email1.png`). The same rule did fire in the scenario box for "can't finish the report until Friday", but only because I typed "cant" without an apostrophe.
- **Suggestion:** widen the window between the verb and "until" (or anchor on "until + weekday/date" after send/finish anywhere in the clause). For negatives, show a soft "If you mean the deadline, use by" note instead of staying silent. In emails the negative "can't … until" is ambiguous, and a hint helps more than silence.

### N3. The lesson story task calls "didn't" a formal-writing mistake (minor)
- **Route:** `#/lesson/b2-01`, exercise 16.
- **What I saw:** the task is "Write a short story or blog post", yet the checks show "קיצור בכתיבה רשמית “didn't” בחיבור רשמי כותבים את הצורה המלאה." (`29-fb-e16.png`). A story or blog post is exactly where contractions belong, and b2-08 teaches register.
- **Suggestion:** apply the contraction rule only to essay, formal-email and academic tasks. For narrative tasks, skip it or reword it to "fine in a story; avoid in a formal essay".

### N4. The "plan done" minutes and the done-lesson minutes are not true numbers (minor)
- **Route:** `#/today`.
- **What I saw:** on the same day, after one lesson, one review, two scenarios and a level check, the banner said "Today's plan is done (about 32 min)", then "about 48 min", then "about 56 min" (`43-today-en.png`, `P1-today-10.png`). The estimate counts every lesson answer at the lesson's pace, so my restart of b2-01 counted exercises 1 to 5 twice. Meanwhile the same completed lesson card showed "16 דק׳" before I started it, then "14 min", "10 min" and "8 min" each time I looked. That number is the day's leftover budget, not the lesson's time.
- **Why it matters:** I asked whether progress tells me something true. A number that changes on its own every reload doesn't.
- **Suggestion:** on a done block, show what was done ("16 exercises, 84% first try") instead of minutes. Don't double-count a restarted lesson's replayed items. Or drop "about N min" from the done banner (Progress already reports measured active minutes).

### N5. In the English UI, Hebrew subtitles float in the middle of English cards (polish)
- **Route:** `#/today` (English UI, 1440).
- **What I saw:** on the left-aligned lesson and scenario cards, the Hebrew subtitle ("זמני סיפור ו-past perfect", "מייל: בקשה להארכת מועד") sits centred under the title, not on the title's edge (`43-today-en.png`).
- **Suggestion:** at B1 and above in the English UI, hide these subtitles (finding 17). If they stay, start-align them with the title.

### N6. Singular and plural in the new copy (polish)
- "1 פסקאות (כדאי 3 לפחות)" in the b2-01 writing checks (`29-fb-e16.png`)
- "1 paragraphs" in the email checks (`64-email3-nosignoff.png`)
- "Collecting evidence: 1 answers at B2" and "אוספים ראיות: 1 תשובות ב-B2" on Progress (`93-progress-after-check.png`, `40-progress-after-lesson.png`)
- **Suggestion:** one plural helper for all count strings: "1 answer / תשובה אחת", "1 paragraph / פסקה אחת".

### N7. After a passed level check, the Path still says nothing changed (minor; part of #2)
- **Route:** `#/path/B2` after passing `#/checkpoint/B2`.
- **What I saw:** the check row shows "75%". The level box still offers "To the B2 level check" and "Retake the placement test", with no "Go on to C1" (`95-path-b2-after.png`). The C1 offer exists only on the one-time result screen.
- **Suggestion:** after a pass, change the Path's level box to "B2 level check passed (75%, 3 Nov). Go on to C1, or keep B2 lessons as review." Do the same on Today's path card.

## What I liked (keep this)

- **Resume is now the obvious path, and a restart doesn't lie.** There's one primary key, "להמשיך מתרגיל 6 מתוך 16", and the restart dialog says that the first try is kept. The 84% end score is honest (`20-intro-fresh.png`, `27-end.png`).
- **A second try on typed answers, with a targeted note.** "עוד לא. אפשר לתקן בעצמכם" plus the Hebrew-speaker explanation for "have known", then "לנסות שוב" or "להציג את התשובה". This is the teacher I wanted (`28-second-try-e13.png`).
- **Own-words feedback in the B2 work scenarios is now useful.** I get L1 error cards with "You could say: by Friday / I'd be grateful if you could…", plus a per-turn goal checklist ("Greet or thank James ○ / Name the problem ✓ / Ask for a new date ✓"). The disclaimer is honest, and selecting before checking feels calm (`50-own-0.png`).
- **Email mode is honest and short-friendly.** It checks the greeting, the request and the sign-off, has no word floor, and gives a model and a self-check list (`63-email2-short.png`).
- **Progress shows the evidence.** "Collecting evidence: 11 answers at B2, 80% right · day 1 of 2", and the level check appears in the skill rows. The level-check result is now truthful about what it changed and gives me "Go on to C1".
- **Real life follows my goal.** Work comes first and the B2 items first, and "Next scenario" stays at my level.
- **AI-off honesty is consistent.** It's in Settings (greyed), the tutor (notice first, no fake chips), roleplay and Practice ("Not active on this site").
- **Calm games.** "Your choice is checked at once", the game waits for Continue, and the speed challenge is off by default.
- **Review selects, then checks**, and its end screen says when each word comes back.

## My top 3 wishes now

1. **Speaking on the spot** (still deferred): a stand-up or "disagree with Tom" prompt, my speech transcript beside the key phrases, then a retry and a comparison. This is still my real problem.
2. **A work-writing strand** (still deferred), and let the Work goal pull b2-08 forward. Meanwhile, make the email check catch "can't finish until Thursday" and "send … until Wednesday".
3. **Make the numbers on Today stable and true**, and let the Path act on a passed level check (C1 offer).
