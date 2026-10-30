# Deliverable 3: User review analysis

Team B, compiled 2026-10-30. Companion files: `data/review-coding.json` (coded sample, verified quotes),
`data/keyword-themes.json` (keyword cross-check over the whole corpus), `B-web-reviews.md` (Trustpilot,
independent reviews and communities, fact-checked).

## 1. What was collected

| Source | How | Volume | Dates |
|---|---|---|---|
| Apple App Store | Apple customer-review RSS, 500 most recent per storefront, US, GB, IL, IN (`tools/research/collect-reviews.mjs`) | 12,516 reviews | 2010-07 to 2026-10-29 |
| Google Play | `google-play-scraper`: newest 200 (en-US), newest 60 each of 1★, 2★, 3★ (en-US), newest 100 Hebrew (iw-IL) | 3,627 reviews | to 2026-10-29 |
| Trustpilot | Company pages and 1-2★ filtered pages, read through WebFetch | 12 companies plus Loora, about 330 reviews read | to 2026-10-30 |
| Independent reviews and communities | Reputable reviews, Hacker News, Hebrew-language articles | see `B-web-reviews.md` | see report |

Apps: Duolingo, Babbel, Busuu, Memrise, ELSA Speak, Rosetta Stone, LingQ, Speak, Praktika, Quizlet, British
Council LearnEnglish Grammar, British Council English, Cambly, Loora. 16,143 unique store reviews in total.

**Coded sample.** For qualitative coding, each app was sampled reproducibly (`tools/research/sample-reviews.mjs`):
up to 24 reviews rated 1-2★, 12 rated 3★ and 24 rated 4-5★ (English, at least 80 characters, from 2025-05-01,
or from 2023-01-01 for four low-volume apps), plus up to 10 Hebrew reviews. 878 reviews were coded against a
fixed codebook of 24 complaint and 15 praise codes, plus "abandon" and "is learning English". Counts were
computed by `tools/research/aggregate-coding.mjs`, not by a model. All 265 quotes the coders selected were
checked mechanically to be verbatim substrings of the review; 265 of 265 passed. Each quote below carries its
store, country, rating, date and review id, so it can be found in the public feed.

## 2. Limitations (read before using any number)

- **The sample is stratified by rating**, so counts describe the sample, not how common a complaint is among all
  users. Use them to compare themes within and across apps, not as prevalence.
- **Most reviewers of the general apps learn languages other than English.** Only 6 of 210 coded Duolingo,
  Babbel and Busuu reviews are evidently from English learners. English-learner conclusions rest mainly on the
  English-only apps (ELSA, Loora, Cambly, British Council) and on the Hebrew-language reviews.
- **Hebrew reviews for Babbel (mostly 2017-2019) and Busuu (2019-2020) are old** and describe older app versions.
  Duolingo's Hebrew reviews are recent.
- **Reddit could not be read** from this environment (both direct requests and the fetch tool are blocked). No
  Reddit content is cited.
- **App stores and Trustpilot are both biased samples:** app stores toward short, emotional reviews and rating
  prompts timed after a good moment (the AI-tutor apps' 5★ reviews cluster on users' first days); Trustpilot
  toward billing and customer-service disputes, and companies that invite reviews score higher.
- Coding was done by research agents against the codebook, then aggregated deterministically. Coding is a
  judgement; the quotes let anyone audit it.

## 3. Competitor review matrix (coded sample)

`n` = reviews coded; `1-2★` = how many of them were rated 1 or 2. Codes are counted per review.

| App | n | 1-2★ | Top complaint codes | Top praise codes | Says they quit | Evident English learners |
|---|---|---|---|---|---|---|
| Duolingo | 70 | 26 | ads 10, UI frustration 9, limits 8, bugs 7, gamification excess 6 | effective 15, engaging 15, habit 5 | 3 | 3 |
| Babbel | 70 | 26 | bugs 9, limits 8, UI frustration 7, level mismatch 6, price 5 | effective 9, engaging 6, structure 4 | 1 | 2 |
| Busuu | 70 | 24 | ads 12, level mismatch 7, limits 5, poor explanations 5, bugs 4 | effective 15, value 8, real-life 7 | 2 | 1 |
| Memrise | 70 | 27 | removed features 11, bugs 9, support 8, unnatural conversation 6, price 5 | effective 7, engaging 5, value 4 | 4 | 3 |
| Rosetta Stone | 70 | 24 | speech recognition 21, bugs 14, poor explanations 10, price 9, UI frustration 8 | effective 11, engaging 8, value 6 | 4 | 2 |
| Quizlet | 70 | 25 | limits 17, price 13, bugs 11, UI frustration 8, progress loss 7 | effective 11, engaging 9, clean UI 7 | 2 | 1 |
| ELSA Speak | 69 | 27 | bugs 12, support 10, UI frustration 9, billing 9, removed features 8 | effective 9, pronunciation feedback 8, speaking practice 5 | 6 | 29 |
| Speak | 62 | 25 | limits 12, price 7, speech recognition 7, billing 6, unnatural conversation 4 | effective 10, engaging 7, speaking practice 6 | 7 | 3 |
| Praktika | 70 | 29 | billing 13, bugs 11, unnatural conversation 8, UI frustration 6, level mismatch 6 | AI conversation 6, effective 4, personalisation 4 | 9 | 4 |
| Loora | 45 | 14 | limits 8, bugs 4, UI frustration 3, price 3, account 2 | speaking practice 10, AI conversation 10, engaging 9 | 1 | 22 |
| LingQ | 70 | 24 | UI frustration 12, bugs 11, support 10, content errors 9, limits 6 | effective 12, engaging 8, value 5 | 5 | 1 |
| BC LearnEnglish Grammar | 51 | 16 | ads 12, bugs 11, poor explanations 6, UI frustration 2, weak feedback 2 | engaging 5, effective 3, clean UI 3 | 0 | 39 |
| BC English (new app) | 30 | 24 | account 19, bugs 10, billing 2 | speaking practice 1 | 2 | 3 |
| Cambly | 61 | 25 | bugs 10, UI frustration 9, price 7, support 5, account 4 | human tutors 12, speaking practice 6, clean UI 3 | 3 | 38 |

Trustpilot (from `B-web-reviews.md`, scores as displayed on 2026-10-30): Duolingo 1.5 (8,242 reviews),
Babbel 4.4 (33,321; invites reviews), Busuu 4.2 (19,913; invites), Rosetta Stone 2.0 (6,974), Memrise 1.6 (142),
ELSA 2.3 (33), Praktika 3.6 (1,397; invites), Cambly 2.0 (264), Preply 4.4 (26,015; invites), Quizlet 1.4 (662),
LingQ 2.8 (22), Loora 4.1 (133; invites). Speak had no usable profile.

## 4. Repeated patterns (several apps and sources)

A pattern counts as **repeated** when a code appears in at least 10% of an app's coded reviews in five or more
apps, or across several companies on Trustpilot. Everything else is reported as app-specific.

1. **Reliability.** Bugs reach the 10% line in 11 of 14 apps (crashes, freezes, answers not accepted, lost
   progress). UI frustration reaches it in 7 apps.
2. **Paywalls inside the learning loop.** Limits (energy, hearts, lessons locked after one, features moved to a
   higher tier) reach 10% in 5 apps. Example: "they stop you from being able to use the speak (voice) feature
   after one lesson" (Speak, App Store US, 1★, 2026-04-20, id 13978925046).
3. **Billing that feels like a trap.** On Trustpilot this is the strongest signal: free trials silently
   converting to annual charges, hard cancellation, refunds refused or deflected to Apple or Google, at 10 of 12
   companies. In the stores, billing is the top complaint for Praktika (13 of 70): "My reminder arrived the day
   after the free trial ended, and Apple refused to grant a refund." (Praktika, App Store US, 1★, 2026-03-20,
   id 13867889935).
4. **Support that cannot be reached.** Repeated on Trustpilot at 8 or more companies, and in the stores for
   ELSA, Memrise and LingQ (8-10 each).
5. **Monetisation inside paid experiences.** "I've already paid so stop ramming upselling into the experience."
   (Duolingo, App Store GB, 2★, 2026-10-22, id 14698420323). Busuu users report unskippable ads before lessons
   (12 of 70): "Now it makes me watch ads BEFORE the lessons to unlock them. The problem is that the ads are
   unskippable." (Busuu, App Store US, 1★, 2026-09-05, id 14513757735).

## 5. App-specific findings that matter for Lucid

- **Speech recognition can sink an app.** It is Rosetta Stone's largest complaint (21 of 70), clustered on
  phones with Bluetooth headsets: "I know I am saying certain things right, Spanish for example because it's my
  2nd language, yet it keeps telling me I got it wrong." (App Store US, 2★, 2025-10-16, id 13273897793). Speak
  shows the same code (7 of 62).
- **Unearned praise and unreliable scoring erode trust in AI and pronunciation apps.** ELSA reviewers report
  the same pronunciation scored "excellent" then "incorrect", and mis-transcription treated as the learner's
  error: "the app repeatedly transcribed it as 'state capital of Texas' and then incorrectly indicated that it
  was not a landmark" (App Store US, 1★, 2026-04-03, id 13918885785). Coders noted the same pattern for Praktika
  and Loora (praise after nonsense; a misheard word marked correct without showing what was heard).
- **AI that is forced, robotic or shallow is disliked.** Praktika: "The way it talks is robotic and I don't know
  if I'll end up sounding like Siri." (App Store US, 2★, 2026-04-09, id 13940281881). Memrise: "The AI
  conversations are frustrating and leave me feeling stupid even after succeeding in all the exercises leading up
  to them." (Google Play US, 1★, 2026-07-02). Six Memrise reviews ask to switch AI chat off.
- **Gamification clutter crowds out learning.** "I spend more time clicking and opening chests, clicking buttons
  just to close everything and move to the next lesson than on the lessons itself." (Duolingo, App Store IL,
  1★, 2026-09-22, id 14581417965).
- **Explanations and adult tone are what Babbel's fans praise.** "Not only is grammar explained but there are
  enough examples in context to make it understandable." (App Store GB, 5★, 2025-06-25, id 12814634006); "less
  time wasted on kiddy characters, and better explanations for deeper understanding of grammar" (App Store US,
  5★, 2026-10-13, id 14661446251).
- **Level cliffs and untaught vocabulary.** Busuu users report an A1-to-A2 jump (7 of 70 level mismatch);
  Duolingo: "post update new lessons assume you know words you were never taught" (App Store IL, 1★,
  2026-04-06, id 13928644726) and "Good for VERY VERY BASIC vocabulary" (App Store IL, 3★, 2025-11-15).
- **Onboarding failure outweighs everything.** In the new British Council English app, 19 of 30 sampled reviews
  are about being unable to sign up or log in: "No sign up option. That's awful. Means the app is not for new
  users." (Google Play US, 1★, 2023-10-14).
- **Removing what users relied on.** Memrise's top code is removed features (11 of 70): "I used to be able to
  start at any level. Now I need to start from beginner." (App Store US, 1★, 2025-10-05, id 13228060801).
- **What people value in speaking products** is real speaking time and confidence (Loora and Speak speaking
  practice 10 and 6; Cambly human tutors 12): "This feature aids in language comprehension and helps build
  confidence in speaking." (Cambly, App Store US, 4★, 2023-11-10, id 10571324955).

## 6. Hebrew speakers learning English

The evidence is small (Hebrew reviews are a minority, and some are old) but consistent:

- **No Hebrew scaffolding stops beginners at the door.** Duolingo: "רציתי לילמוד אנגלית וכשאני מתחילה לילמוד הוא
  שואל אותי שאלות באנגלית ואני אפילו לא יכולה לקרוא את השאלה" ("I wanted to learn English and when I start
  learning it asks me questions in English and I can't even read the question"; App Store IL, 1★, 2026-03-21,
  id 13872151249). Babbel:
  "אני רוצה ללמוד אנגלית אבל אין לי איך כי האפליקצייה לא מתורגמת לעברית" ("I want to learn English but I have no
  way to, because the app isn't translated into Hebrew"; Google Play IL, 3★, 2019-01-23). Two of ten Memrise
  Hebrew reviews are 1★ only because Hebrew cannot be the base language. ELSA lets learners choose Hebrew as their
  native language but then reports no Hebrew translation (coders' note).
- **Hebrew-speaking learners value practical speaking and vocabulary tools:** "שיטה נהדרת לתרגל דיבור באנגלית"
  ("A great method for practicing speaking in English"; Loora, Google Play IL, 5★, 2026-04-07), and a Quizlet
  review describing fast vocabulary memorisation for school tests.
- **Price is judged against Israeli private tutoring** (a LingQ Hebrew reviewer compares the price with "about two
  private lessons").

## 7. Keyword cross-check (whole corpus)

Over all 15,340 English-language store reviews, keyword patterns (`tools/research/theme-keywords.mjs`, no negation
handling, so approximate) agree with the coded sample on the direction of the main themes: price and billing words
lead the negative reviews of most apps; speech-recognition words lead Rosetta Stone's (90 negative reviews);
billing and cancellation words lead Praktika's (114); ads lead the British Council grammar app's (45). The keyword
counts are a sanity check only and are not used as findings on their own.

## 8. What users love, and why they leave (synthesis)

They stay for: a feeling of real progress; short sessions that fit the day; clear explanations with examples;
practical, real-life language; real speaking practice; a calm, adult experience.

They leave over: billing they did not expect and cannot undo; paywalls and ads inside the lesson loop; bugs and
lost progress; feedback they cannot trust (unearned praise, wrong rejections); reaching a ceiling with no path to
advanced English; and, for Hebrew speakers at the start, an app they cannot read.

## 9. Product decisions taken from this analysis

| Finding | Decision in Lucid |
|---|---|
| Beginners blocked without Hebrew | Hebrew interface and explanations from day one, fading by level; a no-test path for complete beginners |
| Billing traps, hard cancellation | No dark patterns: no trial auto-conversion, cancellation as easy as sign-up, visible data export and deletion (pricing itself is outside this build) |
| Paywalls and ads inside the loop | No ads; nothing interrupts a lesson; no hearts or energy |
| Unreliable speech scoring | Recognition never produces a pass/fail on its own: Lucid shows what was heard, explains it is not an accent score, and falls back to self-assessment where recognition is unavailable |
| Unearned praise from AI | Calibrated rubric bands, minimal-edit corrections verified against the learner's text, no generic praise, "AI feedback can be wrong" with a report button |
| Forced or robotic AI | AI is optional and never replaces the core course; every AI feature has a non-AI path |
| Gamification clutter, streak guilt | No chests, gems, leagues or streak loss; a weekly goal with free days |
| Level cliffs, untaught words | Curriculum map of 75 lessons with explicit coverage; vocabulary enters review only after it is taught; placement and level checks |
| Onboarding failures | Device-only mode needs no account; the account is optional and additive |
| Removed features, broken trust | Content and progress are exportable at any time |
