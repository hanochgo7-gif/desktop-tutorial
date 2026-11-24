# Persona panels: summary (simulated)

> **These are simulated reviews.** An AI played eight learner personas and drove the real app in a browser
> (Playwright, phone and desktop sizes, screenshots inspected). They are a structured way to find usability,
> learning-design and honesty problems before real users see the product. They are **not** user research, and
> nothing here shows how real learners would behave or what they would learn.

## Personas

| Persona | Profile | Main focus |
|---|---|---|
| Noa, 16 | absolute beginner, phone, Hebrew UI, embarrassed about English | first session, minors' privacy, no pressure mechanics |
| Avi, 41 | low-confidence speaker around A2 | speaking lab, shadowing, scenarios, AI roleplay, tone of feedback |
| Maya, 18 | Bagrut preparation, around B1 | exam-relevant reading and writing, a clear sense of progress |
| Daniel, 23 | ADHD, around A2-B1 | clutter, short sessions, resuming, 150% text, reduced motion |
| Yael, 25 | junior product manager, B1-B2 | workplace English, 15-20 minutes a day on a phone |
| Moshe, 35 | family trip to London and New York, A2 | travel situations, casual expressions, offline |
| Tamar, 22 | first-year university student, B2 | academic and argumentative writing, AI feedback (mocked) |
| Eitan, 30 | advanced, C1, English UI | C2 precision, research writing, honesty about what the app can judge |

AI features were exercised against mocked endpoints (no live model), so the panels judged their flow, presentation
and honesty, not the quality of AI feedback.

## Round 1

85 findings: 1 blocker, 38 major, 38 minor, 8 polish. Reports: `personas/round1-*.md`.
All were fixed or partly fixed in file-disjoint fix lanes with tests; the outcome of each is in `fix-log.md`.

## Round 2

The same personas first re-tested every round 1 finding in the app (not trusting the fix log), then ran a fresh
first session and return visit.

- Re-tests: 92 round 1 findings: 71 resolved, 21 partly resolved, 0 not resolved, 0 regressed.
- New findings: 43: 6 major, 21 minor, 16 polish.
- Reports: `personas/round2-*.md`. Fixes for round 2 are listed in `fix-log-r2.md`.

### Verdicts (simulated judgement)

| Persona | Would they keep using Lucid? | What could stop them |
|---|---|---|
| Noa, 16, absolute beginner (simulated) | Likely yes. The round 1 blockers (broken first screen, graded voice, misleading under-18 privacy promise) are fixed, speaking is optional and unscored, and there are no streaks, XP or leaderboards; the weekly goal is framed kindly. | Failing lesson 1 narrowly and, after 'Later', being sent back to the start instead of the 4 missed exercises (R2-2); scrambled bracketed English in the Hebrew explanations she depends on (R2-1); a 10-minute plan that never tells her when today's part is done (N7 residual). |
| Avi, 41, low-confidence A2 speaker (simulated) | Likely yes, mainly for the Speaking lab and scenarios: nothing spoken is graded, minimal-pair feedback is kind and specific, the roleplay has an 'I'm stuck' help and Hebrew tips, and the report leads with the outcome and a strength with scores folded away. | English-only explanations in his first B1 lessons although he demonstrated A2 (R2-6); a flat 79-sentence shadowing list with no starting point (R2-5); red-marked unrecognised words that still read as errors (R2-8); help phrases that carry another person's name (R2-7). |
| Maya (18, B1, Bagrut) | Yes. She gets a believable starting point, a reading centre at her level, goal-shaped reading and writing blocks, a writing lab with explained limits and located AI feedback, offline study on the bus, and a Progress page that explains every number. | No blockers. Risks: skill levels inflated by immediate retries (N1) could mislead her about exam readiness and erode trust; plans undersell writing time (N5); some English task text is still right-aligned (N7). |
| Daniel (23, A2-B1, ADHD) | Probably at 100-115% text. Resuming is solid, Today has one Continue button, misses become a short 'practise the 5 I missed', and 'Can't speak right now' removes a trap. At his preferred 150% he is at real risk of quitting. | At 130-150% the Path 'Next' lesson and Real Life 'Start here' cards collapse to one or two letters per line (N2) and the skill panel breaks (N3). Lessons run past 'today's part' with no stop point after an 8.6-screen explanation counted as about 3 minutes (D3). Today's lesson total grows after mistakes (N6). Simulation note: the A2 placement landed him at B2; 'Start at B1 instead' is only the secondary button. |
| Yael (25, junior PM, B1-B2, workplace English, phone commute) | Probably for a few weeks, with growing doubts (simulated judgement). The B2 lessons are adult and well explained, progress is now recorded correctly, and the placement result's one-tap 'Start at B2' removes the round 1 trap. | 1) There is still no workplace content: no work scenarios or expressions, and Free writing judges her emails as argumentative essays and sends them to AI as kind 'essay' (Y6). 2) The daily plan includes a 4-minute 'Targeted practice: Social conversation' block that opens an empty page, shrinks the lesson to 2 exercises and keeps the plan from ever finishing (N1), and the player gives no 'today's part is done' stop for her commute (N5). 3) By default she still lands on the C1 academic track unless she notices 'Start at B2' (Y2). |
| Moshe (35, A2, family trip to London and New York, phone, possibly offline) | Likely, until the trip (simulated judgement). Today names an airport scenario every day, scripted practice gives exactly the 'don't embarrass yourself' feedback he wanted, recognition failures no longer cost him a lesson, and 'Save all lessons' makes everything work offline. | 1) After he picks a less natural reply, the plan's 'Targeted practice: Travel and service situations' leads to 'No exercises for this topic yet' every day, and the plan can never be finished (N1). 2) After 'Nearly there' (which reads '70%… you need 70%', N3), returning later sends him through the whole 25-minute lesson instead of the 4 missed exercises (N2). 3) Smaller: 'Offline use' must be found in Settings, the phone shows no offline state (M1 remainder), Today ticks a scenario he never opened (N4), and all three emergency scenarios are B1. |
| Tamar (22, B2, Hebrew UI, university) | Yes, likely (simulated judgement, not user data). The writing lab now fits seminar-paper practice: real prompts, a trustworthy hint ladder, a diff that shows her revision, closure on the final draft, phone and offline use, and B2 revision without losing her C1 course. | Nothing blocks her. Risks: Today and Progress name 'argument structure' and 'daily life' as weak topics, contradicting the AI feedback (N1). The B2-C2 final briefs are English-only in her Hebrew UI (T6). The B2 check still flags 'To sum up, I believe' as a run-on (T5). |
| Eitan (30, C1, English UI, research writing) | Likely for the Writing lab, at risk for the daily plan (simulated judgement). The honesty he tests is now mostly present: no C2 from multiple choice, no levels for unmeasured skills, a clear statement that feedback cannot verify sources, model answers with self-judging, and a C2 paper that can be submitted in full with references and no false alarms. | An A1 dictation presented as 'Targeted practice… not secure yet' after reviewing academic vocabulary (N1). 'Find and fix' items still reject valid phrasings such as 'to a certain extent' with no way to count them (E2). A placement headline says 'C1-C2' after he missed 3 of 4 C2 items (N2). |

### Major new findings in round 2

- R2-01 (Noa): English with brackets inside Hebrew explanations is scrambled
- R2-02 (Noa): After 'Nearly there', the 'practise only what I missed' path is lost once she leaves
- R2-12 (Daniel (observed); Maya (affected)): Retries and 'missed' redos count as skill evidence, so a lesson he nearly failed shows Grammar B2
- R2-13 (Daniel): At 130-150% text, Path and Real Life rows squeeze titles to a few letters per line
- R2-24 (Both (Yael and Moshe)): Today's 'Targeted practice' block for travel or social situations opens an empty page
- R2-37 (Both (Eitan and Tamar)): Wrong topics are marked weak, so Today sends advanced learners to drills they don't need

## What the panels cannot tell us

- Whether learners actually learn, retain or improve; that needs real learners and delayed tests (see `../research/04-methodology.md` and the roadmap).
- How Hebrew speakers really perceive the tone, the Hebrew copy and the level of challenge; native-speaker review and real-user testing are still needed.
- How the AI features perform with a live model; these were only run against mocks.
