# Product

<!-- impeccable:product-schema 1 -->

> Source note: the owner's brief asked for no questions, so the interview step was replaced by inference from
> the brief and Lucid's research reports (docs/research). Facts marked *(inferred)* were not confirmed by the owner.

## Platform

web

## Stack

Delegated *(inferred from repository convention)*: static ES-module single-page app with no build step, hosted
on GitHub Pages like the rest of this repository (see `crm/`). Optional Supabase (auth, Postgres with RLS,
one edge function for AI). Rationale in `docs/architecture.md`.

## Users

Hebrew-speaking learners aged 16 and over, from complete beginners who cannot read the Latin alphabet to
advanced learners who need to write academic arguments in English. Typical situations *(inferred)*: a high-school
student preparing for Bagrut or university English, a university student who must read and write in English, a
working adult who needs English for their job, and a traveller who needs practical English for a trip soon.
They study on a phone in short sessions and on a laptop for longer writing work.

## Product Purpose

Take a learner from absolute zero to independent, confident English, ending in C1-C2 argumentative writing,
while giving them a separate practical track for travel and social English they can use immediately.
Success is demonstrated ability (skill by skill, measured by evidence and delayed retention), not time on app.

## Positioning

The only learning path designed for Hebrew speakers that runs all the way from the alphabet to research-based
argumentative writing, with feedback that teaches the learner to find and fix their own mistakes instead of
rewriting their work, and that reports honestly what they can and cannot yet do.

## Operating Context

Daily sessions of 10-50 minutes built from a plan: due reviews, the next lesson, targeted practice of
recurring mistakes, and a speaking or writing task. Longer writing sessions in an essay editor with drafts and
revisions. Short bursts of travel phrases before or during a trip. Bilingual reading: Hebrew (right-to-left)
interface and explanations around English (left-to-right) learning content, fading to English as level rises.

## Capabilities and Constraints

- 75 lessons Pre-A1 to C2, 30 real-life scenarios, 50 expressions, writing lab with 10 stages, placement test.
- Works without an account or server (device-only); accounts, sync and AI features need Supabase configuration.
- AI features (writing evaluation, roleplay, tutor) run only server-side and need an Anthropic API key.
- Speech uses the browser's speech synthesis and recognition; availability varies by browser.
- Levels are "Lucid estimates aligned to CEFR descriptors", never certified levels.
- Users must be 16+. 16-17-year-olds get protective defaults.

## Brand Commitments

Name: Lucid *(inferred; chosen for this build)*. Voice: mature, calm, precise and warm; never childish, never
guilt-inducing. No mascot. No loss-framed streaks, no global leaderboards, no XP for time spent.

## Evidence on Hand

Research reports in `docs/research/` (competitors, user reviews, learning science, Hebrew-L1 transfer, UX,
writing). No real testimonials, learner outcomes, efficacy studies, prices or user counts exist; none may be
invented or implied.

## Product Principles

1. Demonstrated ability over activity: progress is what the learner can now do, shown per skill with its evidence.
2. Teach, don't tell: hints before answers, the learner fixes their own mistakes, AI never writes their work.
3. Respect the adult: clear explanations, honest feedback, no manipulative engagement mechanics.
4. Hebrew as scaffolding, English as the destination: support fades deliberately as proficiency grows.
5. Useful today: every session ends with something the learner can use in real life.

## Accessibility & Inclusion

WCAG 2.2 AA. Full keyboard use, screen-reader labels in both languages, correct `lang`/`dir` on every mixed
Hebrew-English element, reduced motion respected, no time pressure except opt-in timed writing, large touch
targets, attention-friendly sessions (short steps, visible progress, easy pause and resume).
