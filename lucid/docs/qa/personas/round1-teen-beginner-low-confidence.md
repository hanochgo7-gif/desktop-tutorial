# Persona review, round 1: teen beginner and low-confidence speaker

> **This is a simulated persona review.** An AI played two invented personas and drove the app with Playwright.
> No real people took part. None of the reactions below are user data or research findings about real learners;
> they are a structured heuristic walkthrough from two points of view. Treat severities as reviewer judgement.

- **Date:** 2026-10-30
- **Build:** working tree at `7d1dc53` (served from `http://127.0.0.1:8799/`)
- **Personas:** (1) Noa, 16, Be'er Sheva, absolute beginner, phone only, Hebrew interface, embarrassed about English.
  (2) Avi, 41, roughly A2, understands more than he can say, freezes when speaking; phone and laptop.
- **Reviewer key:** `teen-beginner-low-confidence`

## Method

- Chromium (Playwright) with `locale: he-IL` and reduced motion, at **390x844** (phone) and **1440x900** (desktop);
  the welcome screen was also measured at 360x780 and 320x640.
- Speech recognition was replaced by a scripted fake (`window.SpeechRecognition`) so each persona could "say"
  specific things, including realistic recogniser mistakes. Speech synthesis had no voices in headless Chromium,
  so audio playback itself was not judged.
- Accounts and AI used the mock from `tests/e2e/run.mjs` (`installMockServer`, adapted): AI answers are canned, so
  only the flow, presentation and honesty of the UI were judged, not the AI text.
- Return visits used Playwright's clock (`page.clock`) to move 1-2 days forward.
- Routes visited: `#/welcome`, `#/start` (all 4 steps, plus an under-16 attempt), `#/lesson/pa1-01` (intro,
  explanation, 13 exercises with right, wrong, hint and "I don't know" answers, retries, summary, then a passing
  second attempt), `#/today` (day 1 and return visit), `#/review`, `#/path`, `#/path/A2` (level move),
  `#/practice`, `#/vocab`, `#/speaking` (minimal pairs: hear and say; shadowing), `#/real-life`,
  `#/scenario/rl-hotel-checkin-basics` (prepare, model dialogue, practise, AI roleplay), `#/conversations`,
  `#/tutor` (pronunciation coach), `#/account?mode=signup`, `#/placement`, `#/progress`, `#/profile`,
  `#/settings`, `#/help`, `privacy.html`.
- Screenshots: `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/personas/teen-beginner-low-confidence/shots/`
  (referred to below as `shots/`). Scripts are in the parent folder.
- Out of scope by instruction: missing lessons (A1, B1, B2, C1, C2) and writing-lab exercises are known work in
  progress. Only how the app *handles* them is reported.

---

## Persona 1: Noa, 16, absolute beginner (phone, Hebrew UI)

**Starting point:** knows a few letters from brands (OK, USB), cannot read English sentences. **Goals:** Bagrut
and "everyday English". **Constraints:** 10 minutes a day after school, phone only, often in public (bus, home
with siblings), embarrassed to speak aloud, reads Hebrew without niqqud. **Path taken:** welcome, onboarding
(born 2010, "I don't know any English", AI feedback left off), lesson 1 straight away, failed it at 58%, looked
around (Today, Path, Review, Progress, Profile, Settings, Help), came back the same day and passed with 96%,
returned two days later for Today and spaced review.

### N1. Welcome screen overflows sideways on every phone width (major)
- **Route / size:** `#/welcome`, 390x844 (also 360 and 320).
- **Observed:** the page lays out at 513px on a 390px screen (`scrollWidth` 513 at 390, 360 and 320). The
  headline, lede and language toggle are cut off and the page pans sideways. Cause: the decorative keyboard keys
  have a 2.3rem minimum width (`.kc { width: clamp(2.3rem, 6vw, 3.4rem) }`), so 10 keys, gaps and padding need
  about 465px. Desktop is fine. The e2e overflow test never checks `welcome` or `start`.
  `shots/noa-01-welcome-phone.png`, `shots/probe-welcome-320.png`, `shots/noa-01b-welcome-phone-full.png`.
- **Why it matters for Noa:** it is the first screen she sees, on the only device she uses. A clipped, wobbling
  page reads as "broken" before she has tried anything.
- **Recommendation:** let the keys shrink with the viewport (for example `width: clamp(1.4rem, 7.4vw, 3.4rem)`
  and a smaller gap under 30rem), or scale or hide the keyboard on narrow screens. Add `welcome` and `start` (with
  no profile) to the overflow check in `tests/e2e/run.mjs`.

### N2. Speech-recognition results are graded in lessons, and there is no "can't speak now" (major)
- **Route / size:** `#/lesson/pa1-01`, 390x844.
- **Observed:** on exercise e12 ("My name is Maya. M, A, Y, A.") the recogniser returned "my name is Maya Maya",
  which is a plausible result when letters are spelled aloud. The app showed **"Not quite"**, a "Correct answer"
  line and a red error tag **"w and v"** (a pronunciation error she did not make), put the item back in the queue,
  and counted it in the lesson score. The lesson ended at 58% ("Nearly there"). The made-up "w and v" error then
  appears under "Worth watching" on the lesson summary (even after she later passes) and as a "recurring mistake"
  on Progress. The only way past a speaking item without speaking is "I don't know", which is also recorded as
  wrong and re-queued. This contradicts the app's own position (`js/core/speech.js`: recognition "never produces
  a grade on its own"; the panel itself says "This is not an accent score"). It is also inconsistent across
  browsers: where recognition is missing, the same item is self-rated and ungraded.
  `shots/noa-ex-e12-heard.png`, `shots/noa-ex-e12-verdict.png`, `shots/noa-20-lesson-review.png`,
  `shots/noa-40-lesson-passed.png`, `shots/noa-30-progress-phone-full.png`.
- **Why it matters for Noa:** she studies on a bus or near family and does not want to speak aloud. When she does,
  a recogniser mistake turns into "Not quite" plus a wrong diagnosis on her first day. Both push an embarrassed
  beginner away from speaking.
- **Recommendation:** make `speak` items ungraded in lessons (show the recognised words, offer "Try again" or
  "Continue", record the attempt with `score: null`). Never attach an `error_type` from recognition alone, and
  leave speaking items out of the pass score. Add a "Can't speak right now" button that skips the item with no
  penalty and no re-queue (and offers to save it for later).

### N3. The answer-feedback footer is cramped and covers the content on phones (major)
- **Route / size:** lesson player, and the single-exercise player used by the Speaking lab, at 390x844.
- **Observed:** the verdict text is squeezed into a column about 200px wide next to the Continue button. With the
  Hebrew and English explanations, the footer grows to 280-350px (a third to 40% of the screen). On speaking
  items it covers the "What was recognised" panel and its "not an accent score" note, which is the most
  reassuring text on the screen. On desktop the Continue button sits far from the text (minor eye travel).
  `shots/noa-ex-e2-verdict.png`, `shots/noa-ex-e12-verdict.png`, `shots/avi-27-shadow-verdict.png`,
  `shots/noa-53-verdict-wrong-desktop.png`.
- **Why it matters for Noa:** every answer passes through this footer. Narrow, tall blocks of mixed-direction text
  are hard to read for a beginner, and the important part (what the right answer was) gets lost.
- **Recommendation:** below about 40rem, give `.verdict` the full width (`flex-basis: 100%`) and put a full-width
  Continue button underneath. Show the title and the correct answer first, and fold longer explanations behind a
  "Why?" toggle or limit them to two lines.

### N4. "Strictest privacy by default" for under-18s has nothing behind it (major)
- **Route / size:** `#/start` step 4, `#/profile`, `privacy.html`, at 390x844.
- **Observed:** Noa (16) sees "Because you are under 18: no marketing, and the strictest privacy settings by
  default", and the same claim appears on Profile and in the policy. In the code, onboarding saves the same
  settings for everyone (`marketing: false`, AI consent unticked); the only rule specific to minors is the
  database forcing `marketing_opt_in` off, and there is no marketing feature to turn on. Nothing observable
  differs from an adult account. `shots/noa-06-ob-step4-privacy-phone.png`, `shots/noa-30-profile-phone.png`.
- **Why it matters for Noa:** it is a privacy promise made specifically to a minor. Honesty is a stated brand
  commitment, and a parent or teacher reading this would assume extra protections exist.
- **Recommendation:** either implement real defaults for 16-17 and name them in plain words (for example: AI
  feedback needs a separate confirmation, sign-up is not suggested, or shorter retention of chats), or reword the
  claim to what is true ("No ads and no marketing, for everyone. AI is off unless you turn it on.").

### N5. Voice processing is not disclosed (major)
- **Route / size:** `#/speaking`, lesson `speak` items, scenario dictation, `privacy.html`.
- **Observed:** speaking features use the browser's speech recognition. In Chrome this is an online service run by
  the browser vendor; the app's own error message says recognition "needs an internet connection in this
  browser". The policy and onboarding never mention the microphone or voice, and the policy says "Without an
  account, none of this leaves the device". `shots/noa-55b-privacy-page-phone-full.png`.
- **Why it matters for Noa:** her voice is personal data, and she is a minor. The "strictest privacy" promise
  (N4) makes this gap more visible.
- **Recommendation:** add a short "Microphone and voice" section to the policy, and show a one-time notice before
  the first microphone use: the browser's speech service (for example Google in Chrome, Apple in Safari) processes
  the audio, and Lucid does not store recordings. Offer the existing self-rating path as an alternative for anyone
  who prefers not to use the microphone.

### N6. The exercise count grows with every mistake, and a failing score stays on the path (minor)
- **Route / size:** `#/lesson/pa1-01`, `#/path`, at 390x844.
- **Observed:** the counter went 1/13, 2/13, 3/14, 6/15, 8/16, 9/17, 13/18: each wrong answer adds an item to the
  end. After the failed attempt, the path row shows an amber "58%" badge next to lesson 1.
  `shots/noa-12-ex-e1-before.png`, `shots/noa-ex-e12-verdict.png`, `shots/noa-30-path-phone.png`.
- **Why it matters for Noa:** the finish line moves away each time she gets something wrong, which feels like a
  penalty, and the failing number stays visible on her main map.
- **Recommendation:** keep the first-pass total fixed and show retries as a separate short step ("2 to revisit").
  On the path, show "in progress" until the lesson is passed, and show the best score only after that.

### N7. The daily plan's time does not match lesson length (minor)
- **Route / size:** `#/today` vs lesson intro, at 390x844.
- **Observed:** Noa chose 10 minutes a day. Today budgets the lesson at 5-10 minutes (`budget[10].learn = 5`), but
  every Pre-A1 lesson is 15-20 minutes, and the intro says "about 15 minutes". The plan says "about 10 minutes".
  `shots/noa-30-today-phone.png`, `shots/noa-42-today-return.png`, `shots/noa-10-lesson-intro-viewport.png`.
- **Why it matters for Noa:** she has homework, and a "10-minute" plan that takes 20 makes her stop halfway and
  feel behind.
- **Recommendation:** show the real lesson length in the plan and say plainly "first half today, you'll continue
  tomorrow" (resume already works well), or split long lessons into parts for the 10-minute plan.

### N8. Review lets a multiple-choice miss be marked correct (minor)
- **Route / size:** `#/review`, 390x844.
- **Observed:** after Noa picked "אות קטנה" for "name" in a multiple-choice card, the footer offered "That is what
  I meant – count it". The condition (`kind === 'meaning'` with an answer given) covers multiple-choice picks as
  well as typed Hebrew. `shots/noa-44-review-verdict-1.png`.
- **Why it matters for Noa:** it invites her to overrule an objectively wrong pick, which weakens the honest
  memory data that scheduling depends on.
- **Recommendation:** show the override only for typed answers.

### N9. Letter names that differ only by niqqud, with no audio on the tiles (minor)
- **Route / size:** `#/lesson/pa1-01` exercise e1, 390x844.
- **Observed:** the match exercise pairs A with "אֵיי" and I with "אַיי", and G with "ג'י" and J with "ג'יי".
  The A/I pair is told apart only by small vowel points at body-text size, and the tiles have no play button.
  `shots/noa-12-ex-e1-before.png`.
- **Why it matters for Noa:** Israeli teens rarely read niqqud, so this tests eyesight rather than knowledge.
- **Recommendation:** enlarge pointed Hebrew in exercises, add a play button to letter tiles, or add a hint ("A,
  as in day").

### N10. The age gate states the threshold before the question and lets a refused user just pick another year (minor)
- **Route / size:** `#/start` step 1, 390x844.
- **Observed:** the help text "Lucid is for ages 16 and up" is shown under the year field before anything is
  chosen. A 15-year-old gets a polite inline error and can then change the year in the same form. Age is
  calculated from the year only, so someone born in December 2010 counts as 16 today.
  `shots/noa-02-ob-step1-phone.png`, `shots/noa-03-ob-age15-refused-phone.png`.
- **Why it matters for Noa:** this does not affect her, but it affects her younger classmates. A self-declared
  gate that shows the answer first and invites a retry is weak, and the app makes a point of being 16+.
- **Recommendation:** ask for the year neutrally (state the age rule after a refusal), and end a refusal on a
  separate, kind screen rather than an editable form. Keep year-only storage, but document the one-year
  imprecision as a deliberate trade-off.

### N11. The privacy page has no contact route (minor)
- **Route / size:** `privacy.html`, 390x844.
- **Observed:** "The site operator's contact details will be added here before public launch."
  `shots/noa-55b-privacy-page-phone-full.png`.
- **Why it matters for Noa:** a 16-year-old, or her parent, has nowhere to send a question or a deletion request
  other than the in-app button.
- **Recommendation:** add a contact address before any real users (and especially minors) are invited.

### N12. Step counters read backwards in RTL (polish)
- **Route / size:** onboarding, lesson player, scenario practice, at 390 and 1440.
- **Observed:** "4 / 1" in onboarding, "13 / 2" and "17 / 12" in lessons, "4 / 1" in scenario practice. Review
  shows "2/9" in the other order. `shots/noa-02-ob-step1-phone.png`, `shots/noa-ex-e12-verdict.png`,
  `shots/avi-34-practise-poor.png`, `shots/noa-44-review-verdict-1.png`.
- **Recommendation:** use words ("1 מתוך 4") or wrap the numbers in a `dir="ltr"` span everywhere, consistently.

### N13. Key-point check icons sit on their own line on phones (polish)
- **Route / size:** lesson summary, 390x844.
- **Observed:** each check icon wraps onto a separate line above its key point. `shots/noa-20-lesson-review.png`,
  `shots/noa-40-lesson-passed.png`.
- **Recommendation:** use `flex-wrap: nowrap` for that row (the speaking-lab tip already does this).

### What works well for Noa
- No streaks, leaderboards or XP; "a day off erases nothing" is repeated where it counts. Leaving a lesson has no
  guilt dialog, and Today offers "Continue where you left off" with the exact exercise.
- The age refusal is polite. Only the birth year is stored, AI feedback is opt-in and unticked, and export and
  delete are one tap away in Settings.
- Content is suitable for a 16-year-old (the beach-bar scene uses a lemonade, the slang list is clean), and both
  AI prompts tell the model to keep things appropriate for a 16-year-old.
- Starting from zero skips the test and goes straight into lesson 1, with Hebrew explanations, a letter table and
  "Watch out (Hebrew speakers)" notes.
- Wrong answers explain *why* in Hebrew ("Y is 'why'. You heard 'jay'..."). "I don't know" and hints are always
  available. The review summary is calm ("4 of 9 correct. Words you missed come back sooner").
- Hebrew and English are mostly bidi-correct (titles, can-do lines, the IPA in the speaking tips).

---

## Persona 2: Avi, 41, low-confidence speaker around A2 (phone and laptop)

**Starting point:** reads and understands simple English (A2) but freezes when he has to answer out loud.
**Goals:** conversation, travel, work. **Constraints:** 20 minutes in the evening, worried about sounding foolish,
cares about how mistakes are framed. **Path taken:** onboarding ("I know some basics", AI on), placement test
(right at A1 and A2, "I don't know" on half the B1 items), Today, the first planned lesson, Path, Speaking lab
(minimal pairs, "Say it", shadowing), a real-life scenario (prepare, model dialogue, scripted practice, his own
words by dictation), account sign-up and the AI roleplay (mocked), the conversations list, the tutor's
pronunciation mode (mocked), Settings, a level move to A2, and a return visit the next evening.

### A1. Day one's "Start" button leads to an unwritten lesson with a misleading message (major)
- **Route / size:** `#/today` to `#/lesson/b1-01`, at 390x844 and 1440x900; `#/path`.
- **Observed:** placement put Avi at B1 ("You showed control up to A2. We'll start at B1"). Today's main button
  "Start: Have you ever...?" (16 of his 20 minutes) opens a dead end: "This lesson is not available on this
  device yet. Try reloading, or go back to your path." On Path, unwritten rows differ only by a dashed border,
  with no text and nothing for screen readers, and the first one still has the "Next" tag.
  `shots/avi-10-today-phone.png`, `shots/avi-11-start-lesson-phone.png`, `shots/avi-12-path-phone.png`.
  (Note: `content/lessons/b1-01.json` appeared in the working tree after this run, as the content team is still
  writing. This particular lesson may now load, but the handling below applies to every lesson that is not yet
  written.)
- **Why it matters for Avi:** his very first action fails, and the message suggests something is wrong with his
  device, so he blames himself or the app. He only found the way out (Path, "Start from A2") by exploring, which a
  low-confidence user may not do.
- **Recommendation:** have the next-lesson logic and the Today plan skip unwritten lessons (fall back to the
  nearest written lesson, or to review of the previous level). Label unwritten rows "Coming soon" in text and
  ARIA, and do not tag them "Next". On the dead-end screen, say "This lesson is still being written" and offer one
  concrete alternative, such as "Start from A2" or a matching real-life scenario.

### A2. Shadowing is graded like a test (major)
- **Route / size:** `#/speaking?l=…&e=…` (shadowing player), 390x844.
- **Observed:** Avi repeated about 60% of "What are you doing at the moment? I'm making dinner." The recognised
  words appear in green and red with a fair note ("not an accent score"). Pressing Check then turns the footer red
  with "**Not quite**" and "**Correct answer:** What are you doing at the moment? I'm making dinner." (the sentence
  he was looking at the whole time), and the attempt is stored as an incorrect speaking answer. The diff also shows
  the expanded, lower-case form "i am" instead of the "I'm" on screen. `shots/avi-26-shadow-heard.png`,
  `shots/avi-27-shadow-verdict.png`.
- **Why it matters for Avi:** shadowing is repetition practice and his safest way to start speaking. A red "Not
  quite" right after the lab promised "the goal is to be understood" confirms exactly the fear that makes him
  freeze.
- **Recommendation:** in the Speaking lab, show the recognised words with neutral actions ("Try again", "Next
  sentence") and no right or wrong verdict and no "Correct answer". Record the attempt as practice
  (`score: null`). Keep the target's own spelling in the diff.

### A3. The roleplay report is all scores and corrections (major)
- **Route / size:** `#/scenario/rl-hotel-checkin-basics?tab=roleplay`, 390x844 (mocked AI).
- **Observed:** the report leads with "58/100", "Goal not reached yet" and three /100 sub-scores, followed by
  "More natural ways to say it" (the prompt asks for 3-6). The `RoleplayFeedback` schema has no strengths field
  (writing feedback does), so nothing he did well can ever appear. The report also renders scrolled down, with the
  score heading hidden under the top bar. The conversations list repeats "58/100" next to the scenario.
  `shots/avi-42-roleplay-report.png`, `shots/avi-43-conversations.png`.
- **Why it matters for Avi:** he cares most about how feedback feels. A first conversation scored like an exam,
  with only corrections, makes it less likely he will try a second one.
- **Recommendation:** add `strengths` (one or two quoted things that worked) to the schema and prompt, and show it
  first. Lead with the outcome in words ("You checked in and got your room number; next time, ask about
  breakfast"). Move the numbers into Details, or drop the sub-scores for A1-A2 scenes, and cap the alternatives at
  two or three at those levels. Scroll to the top and focus the heading when the report appears.

### A4. No "I'm stuck" help in the roleplay, and Hebrew hints are switched off by course level (minor)
- **Route / size:** AI roleplay, 390x844.
- **Observed:** the chat has a text box, a dictation button, Send and "Finish and get feedback", but no help on
  request. Hebrew hints only appear when the AI decides the learner is stuck, and the server prompt allows them
  only when Hebrew support is full or partial. Avi's support comes from his course level (B1), so the request sent
  `hebrew_support: "minimal"` even in an A1 scene. The hint box also breaks English inside Hebrew (see A6).
  `shots/avi-41-roleplay-turn3.png`.
- **Why it matters for Avi:** freezing is exactly the moment he needs a way out that he controls, without waiting
  for the AI to judge him stuck.
- **Recommendation:** add an "I'm stuck" button that returns a short Hebrew hint or a sentence starter (not
  counted against him). Base the hint policy on the scenario level or his speaking level, not the course level.

### A5. Speaking and writing levels shown without any evidence (minor)
- **Route / size:** `#/today`, `#/progress`, 390x844.
- **Observed:** straight after placement, the skill profile shows Speaking A2 and Writing A2. Progress lists their
  source as "Speaking: placement test (0)" and "Writing: placement test (0)". `skillLevels()` falls back to the
  overall placement level when a skill had no items, yet the same card says "'—' means not enough evidence yet".
  `shots/avi-10-today-phone.png`, `shots/avi-58-progress-phone-full.png`.
- **Why it matters for Avi:** he has never spoken in the app, yet it rates his speaking. That undercuts the trust
  the "demonstrated ability" promise is meant to build.
- **Recommendation:** use only `placement.skills[skill]`, and show "—" for speaking and writing until there is
  real evidence.

### A6. English punctuation flips inside Hebrew in a few places (minor)
- **Route / size:** `#/today`, `#/path`, the lesson dead end, the roleplay hint box, at 390 and 1440.
- **Observed:** the Today button reads "להתחיל: ?...Have you ever" (the English title is not isolated). When a
  lesson's Hebrew title is the English text, the blue line shows "?...Have you ever". In the roleplay, the Hebrew
  hint's "K-O-H-E-N." wraps with the full stop moved. `shots/crop-avi-today.png`,
  `shots/avi-11-start-lesson-phone.png`, `shots/avi-41-roleplay-turn3.png`.
- **Recommendation:** wrap `m.next.title_en` in `<bdi dir="ltr">` in the Today start button. Skip the Hebrew
  legend line when it equals the English, or isolate it. Pass `hint_he` through `isolateLatin()` like other Hebrew
  content.

### A7. The tutor's "Pronunciation coach" has a microphone but cannot hear (minor)
- **Route / size:** `#/tutor`, pronunciation mode, 390x844 (mocked AI).
- **Observed:** the mode reads "Sounds, stress and minimal pairs" and the composer has a microphone button. Avi
  dictated "how do I say think" and only the text reached the tutor. The server prompt knows it "cannot hear the
  learner", but the UI never says so. `shots/avi-50-tutor-pron.png`, `shots/avi-51-tutor-pron-reply.png`.
- **Why it matters for Avi:** he will assume the coach is judging how he sounds, either trusting feedback it cannot
  give or feeling judged by it.
- **Recommendation:** add one line under this mode: "The tutor reads text and can't hear you. To check your
  sounds, use the Speaking lab", with a link.

### A8. The correction-intensity setting does not reach conversations (minor)
- **Route / size:** `#/settings` vs roleplay.
- **Observed:** Settings offers "How much correction in conversations and the tutor". The tutor request includes
  `corrections`; roleplay requests do not (keys sent: task, hebrew_support, scenario, opening_line, history).
  Roleplay never corrects during the conversation anyway. `shots/avi-53-settings-feedback-phone.png`.
- **Why it matters for Avi:** he might pick "Only what blocks meaning" to protect himself and expect a gentler
  end-of-conversation report, but nothing changes.
- **Recommendation:** either let the setting shape the roleplay report (number of alternatives, tone), or relabel it
  "in the tutor" and add "Conversations never interrupt you; feedback comes at the end."

### A9. After signing up from a scenario, Avi lands on Today (polish)
- **Route / size:** `#/scenario/…?tab=roleplay` to `#/account?mode=signup`, 390x844.
- **Observed:** after creating the account he was sent to Today rather than back to the roleplay he was trying to
  open. `shots/avi-36-roleplay-noaccount.png`, `shots/avi-37-signup.png`.
- **Recommendation:** return to the originating route after sign-in or sign-up.

### A10. Speaking-lab sounds are labelled with IPA only, and the tip is English-only at B1 (polish)
- **Route / size:** `#/speaking`, 390 and 1440.
- **Observed:** the sound tabs read "/ɪ/ – /iː/", "/æ/ – /ʌ/ – /e/" and so on. Because his course level is B1, the
  mouth-position tip shows in English, with Hebrew behind a small "עב" button. `shots/avi-20-speaking-top-phone.png`,
  `shots/avi-20-speaking-top-desktop.png`.
- **Recommendation:** label the tabs with example pairs ("ship / sheep"), and show articulation tips in Hebrew by
  default in the Speaking lab, whatever the course level.

### What works well for Avi
- Placement sets the right tone: "There is no score and no failing", "'I don't know' beats guessing". The result
  is honest per skill, and "Start from A2" on Path (with a clear confirmation) fixed his level in two taps.
- The minimal-pair "Say it" feedback is kind and specific ("Heard as 'ship', meaning ספינה, not כבשה. Look at the
  tip and try again, slowly"). It suggests saying the word inside a short phrase when single words fail, and none
  of it is graded. The honest note on recognition and accents is excellent.
- Scripted scenario practice works without AI. Every option gets a reason in Hebrew and English, and "Now in your
  own words" accepts dictation without auto-sending, so he can check before committing.
- The roleplay promises no corrections mid-conversation, says "AI feedback can be wrong", and the tutor and
  roleplay states are honest when AI is unavailable or he is not signed in.
- Slow playback, speech-speed and text-size settings, and a model dialogue he can play line by line, give him
  low-pressure ways in.

---

## The 5 most important fixes

1. **Stop grading speech recognition** (N2, A2): `speak` items in lessons and shadowing should show what was
   recognised with neutral next steps, never "Not quite" or "Correct answer", never an error type taken from
   recognition, and never count toward the lesson score. Add "Can't speak right now" with no penalty.
2. **Handle unwritten lessons gracefully** (A1): skip them when choosing the next lesson and building Today's
   plan, label them "Coming soon" on Path, and replace "not available on this device, try reloading" with an
   honest message and a concrete alternative.
3. **Fix the welcome screen on phones** (N1): the keyboard forces a 513px layout at 320-390px. Make the keys
   shrink or hide the keyboard, and add `welcome` and `start` to the e2e overflow test.
4. **Make the under-18 privacy promise true, and disclose voice processing** (N4, N5): implement and list real
   protective defaults for 16-17 (or reword the claim), add a microphone and voice section to the policy, and show
   a notice before first microphone use.
5. **Make feedback readable and kind on phones** (N3, A3, N6): a full-width verdict with the button below and
   explanations folded; strengths first in the roleplay report, with numbers secondary; a fixed exercise total, with
   retries shown separately.
