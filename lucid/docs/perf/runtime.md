# Perf lane "runtime": harness, learner model, store and Intl

Lane base: b2b669b. Plan: `docs/perf/plan.json`, lane `runtime` (R1-R9). Every change keeps the learner's output
identical; the speed-ups are in how the same answers are computed.

## What changed

| Item | Files | Change |
|---|---|---|
| R1 | `tools/perf.mjs`, `tools/perf/seed-heavy.mjs` | `--learner heavy` (180 days, 32 lessons, about 5.2-5.3k attempts, 1.2k events, 700 cards; pinned PRNG for every choice and id, history anchored to the start of today, built through the app's own modules), `--http-maxage N`, `--etag-epoch`, `--net offline\|lie-fi` (warm loads), scenario g (returning Today and saved lesson: fresh, stale, after-push, offline, lie-fi), scenario u (a release that changes only sw.js: what the new worker downloads, saved lessons before and in the new release's cache after, Today -> lesson while it installs, modules loaded before and after a controllerchange in one page), view selectors and default routes `checkpoint/A1` and `drill?topic=<first A1 topic>`, back-to-Today rows and a `longest` column in d, `#/vocab` and `#/review` in d for the heavy learner, and a visibility probe that checks only in requestAnimationFrame (no check per DOM mutation). Learner and network state are recorded in the JSON `meta`. Defaults reproduce the baseline's meaning; g and u run only when named. |
| R9 | `js/core/adaptive.js` | `writingMinutes` counts `task.n_items ?? task.items?.length` (contract C-11), so writing-index rows give the same minutes as full tasks. Audit: `pickScenario`, `pickWritingTask`, `todayPlan` and `dailyPlan` read only id, level, stage, module and the word-range fields, which the index rows keep. |
| R2 | `js/core/adaptive.js` | `skillLevels` sorts the attempts and takes first tries once for all skills (was 8 sorts of every attempt); the plan's kind rotation compares ISO timestamps with `<` instead of `localeCompare` (no ICU collator on Today). |
| R3 | `js/core/util.js`, `js/core/learner.js` | `util.isCanonicalIso` and `util.dayOf` (contract C-3): a canonical `toISOString()` string (shape, hour < 24 and a real calendar date checked) is sliced; anything else goes through `todayKey(new Date(x))` as before. Every day check in learner.js uses it; `weekActivity` compares canonical timestamps with the week start as strings. |
| R4 | `js/core/store.js` | `openStore` keeps the probe read's rows and passes them to `store.load(preloaded)`: IndexedDB is read once at boot (was twice). Same fallback to memory when the probe throws. `openStore({ persistent })` takes a backend factory for tests. |
| R5 | `js/core/wordgame.js` | Round building memoises each Hebrew meaning's senses (`shareSense`); the exported `senses()` still returns a new Set. |
| R6 | `js/views/progress.js`, `js/views/slang.js`, `js/core/util.js` | Progress's week chart takes narrow weekday names from a table for `he` and `en` (other languages still ask Intl) and counts the week's answers in one pass. `util.collatorEn()`, `util.relTime(lang)`, `util.groupDigits(n)` and `util.warmIntl()` (contract C-3); expressions sort with the shared collator. Nothing is re-sorted after the first frame. |
| R7 | `js/core/adaptive.js` | `periodReport` compares canonical timestamps with ISO bounds computed once (only for whole-millisecond bounds), sorts once and builds both mastery reports from the sorted list. |
| R8 | `js/views/vocab.js` | `relativeDue` uses the shared formatter for the UI language (optional third argument for tests), and the list sorts with the shared collator (`byWord`). |

Tests: `tests/unit/writing-minutes.test.mjs` (R9: every writing exercise and assignment as an index row, plus the picks and the plan), `tests/unit/model-equivalence.test.mjs` (R2, R3, R7: the pre-change code verbatim against the new code on the heavy seed built in a memory store, the light learner, and a widened, shuffled set with level checks, assessed essays, non-canonical timestamps and records exactly on the period bounds; 10,000 random canonical strings and the non-canonical cases for `dayOf`; mutations of the new code are caught), `tests/unit/store-sync.test.mjs` (R4: one `load` per `openStore`, empty database, failing probe, no IndexedDB), `tests/unit/wordgame.test.mjs` (R5: a cold and a warm memo give the same rounds), `tests/unit/intl-tables.test.mjs` (R6, R8: weekday tables against Intl for a whole year, `groupDigits` for 0..10^7 and edge values, `relativeDue` against the old per-row formatter for 1,000+ offsets in he and en, the vocab and expressions orders against `localeCompare`), and the lane e2e `tests/e2e/perf-runtime.mjs` (Chromium's own ICU: heavy learner seeded, one IndexedDB `getAll` at boot, the vocab list's first frame in the old order with the old next-review labels and no reordering later, expressions in the old order, Progress weekday names and per-day counts in Hebrew and English, `dayOf` and `groupDigits` in the browser, a word-game round). Outside the tests: 630 seeded word-game rounds (every level and stage, 30 seeds) are identical between the base and the new `wordgame.js`, 3698 ms -> 150 ms of round building unthrottled in Node.

## How it was measured

This machine (4 CPUs) ran other lanes at the same time: the load average was 5-6 throughout, so CPU-bound absolute numbers are well above the baseline's. Every number below is an A/B in the same window: `bh` = the base app (b2b669b) with this lane's harness copied in, `lane` = this branch, run back to back and alternating (scratch driver `ab.mjs`, `--runs 1` per side per round), medians over the rounds. `lane+warm` = this branch plus the boot lane's side of contract C-3 (`util.warmIntl?.()` in requestIdleCallback after the first route renders), patched into a scratch copy of `js/app.js` only for measurement. CPU profiles: the review's `prof.mjs` (unshaped network, CPU 4x, warm worker, heavy seed), 2 runs x 2 loads per side, alternating. The lead re-measures everything sequentially after the merge.

## Results (mobile profile, CPU 4x)

### Heavy learner (R2, R3, R4, R7, R8)

| Measure (median) | base | lane | change | target |
|---|---:|---:|---:|---|
| warm #/today, view ms (5 rounds) | 1473 | 1119 | -354 ms (-24%) | ≤ 900 with R2, ≤ 850 with R3 (base 1066 on a quiet machine) |
| warm #/today, TBT ms (5 rounds) | 294 | 132 | -55% | ≤ 200 |
| warm #/today, view ms (3 rounds, earlier window) | 1575 | 1173 | -26% | |
| cold #/today, view ms (5 rounds) | 4644 | 4358 | -6% | |
| prof.mjs warm Today view, 2 x 4 loads | 1475 / 1436 | 1093 / 1032 | -26% to -28% | |
| prof.mjs warm Today TBT | 566 / 543 | 264 / 274 | -50% | |
| prof.mjs `model()` total ms | 243 | 93 | -62% | |
| prof.mjs `skillLevels` total ms | 174 | 48 | -72% | |
| prof.mjs `dayStatus` total ms | 105 | 37 | -65% | |
| prof.mjs `byTime` self ms | 51-61 | 12-14 | | |
| prof.mjs `todayKey` self ms | 64-70 | 22-25 | all of it under `today.js:284` | ≤ 5 (todayKey + dayOf) |
| review -> Today, first session / returning (5 rounds) | 202 / 193 | 105 / 146 | -48% / -24% | ≤ 170 (base 319-360) |
| Today -> progress, returning (5 rounds) | 212 | 140 | -34% | ≤ 130 (base 194-224) |
| Today -> progress, returning, longest task | 121 | 64 | | ≤ 80 |
| Today -> progress, returning (lane+warm run) | 166 | 143 | -14%; longest 97 -> 56 | |
| Today -> vocab, returning, lane alone (5 rounds) | 228 | 233 | +2% (noise) | ≤ 100 (base 169) |
| Today -> vocab, returning, lane+warm (5 rounds) | 280 | 184 | -34%; TBT 124 -> 41; longest 141 -> 87 | longest ≤ 60 |
| every route -> Today, returning (5 rounds) | 177-203 | 113-146 | -24% to -45% | |
| Today -> expressions, returning, lane / lane+warm | 273 / 193 | 221 / 207 | within noise | |
| Today -> games/A1/1, returning (5 rounds) | 271 | 287 | TBT 16 -> 0, longest 66 -> 0 | |

### Light learner (R5, R6)

| Measure (median of 5 rounds) | base | lane | lane+warm (its own base) | target |
|---|---:|---:|---:|---|
| Today -> progress, returning, ms | 155 | 116 (-25%) | 163 -> 84 (-48%) | ≤ 80% of base |
| Today -> progress, returning, long tasks | 1 (60 ms) | 0 | 1 -> 0 | 0 |
| Today -> progress, first session, ms | 338 | 275 | 347 -> 266 | |
| Today -> games/A1/1, returning, ms | 508 | 280 | 263 -> 282 | ≥ 40 ms faster (base 259) |
| Today -> games/A1/1, returning, TBT / longest | 67 / 117 | 8 / 58 | 49 / 99 -> 3 / 53 | no task over 50 ms |
| Today -> expressions, returning, ms | 269 | 301 | 257 -> 307 | ≥ 15 ms faster |

### Harness (R1), on the unchanged base

| Check | Result | Acceptance |
|---|---|---|
| Light a-f, mobile, cold views (network-bound) | cold welcome 2043 (2050), cold Today 3692 (3695), lesson 3220 (3159), real-life 3510 (3527), scenario 3574 (3563), writing 2749 (2766), final-B2 3772 (3739), games 2931 (2885), expressions 3494 (3495), reading 7286 (7172), progress 2637 (2610), SW blocked 2072 / 3685 (2055 / 3696) | within ±5%: met (-1% to +2%) |
| Light a-f, warm mobile views, interactions, desktop (CPU-bound) | 20-170% above the baseline, including rows the probe does not touch (desktop "SW blocked") | not met in this window: machine load |
| Old harness vs new harness on the same base app, alternating, 3 rounds | mobile cold Today 3819 vs 3871, warm Today 680 vs 672; desktop cold Today 197 vs 193, warm 288 vs 371 (spread 211-383 vs 323-428) | the harness change does not shift the numbers beyond noise |
| Probe cost: layout passes and layout ms in the 1.5 s after a click (Today -> 6 light routes and 4 heavy routes), no probe / old probe / new probe | layout count identical for all three on every route (for example heavy vocab 6 / 6 / 6, progress 6 / 6 / 6); layout ms differ by -8 to +8 ms between runs of the same variant | ≤ 5 ms of forced layout: no extra layout pass measured |
| Cold #/checkpoint/A1 | 7336 ms, 107 requests, 1065 KB gz | 7320 ±10%: met |
| Cold #/drill?topic=present-simple | 7381 ms, 107 requests, 1064 KB gz | (new row) |
| Heavy warm Today | 1473 (5 rounds), 1575 (3 rounds); the review's prof.mjs in the same window: 1436-1475 | 1066 ±10%: not reproduced on the loaded machine; the harness agrees with the review's tool |
| Scenario g on the base (3 runs) | fresh Today 544, stale 1411, after-push 2328, offline 668, lie-fi 16517; lesson fresh 546, stale 1414, after-push 2046, offline 490, lie-fi 24544. Requests and bytes match the review prototype exactly (stale 30 requests, all 304; after-push 30 requests, 428 KB; lesson after-push 37 requests, 28 of them 304, 128 KB) | stale 1269 ±10% and after-push 2099 ±10%: +11% each, just outside; fresh (pure CPU, 0-1 requests) is +43% (381), so the excess is the machine load; lie-fi 16517 vs 16471 (+0.3%) |
| Scenario u on the base (3 runs) | the new worker downloads 84 requests, 884 KB on the wire (124 requests, 1433 KB in all, page included); saved lessons 4 before, 0 in the new release's cache; returning Today 2102, Today -> lesson while installing 2480, next Today 1362; mixed-release pages 0 (the page loaded all its modules before the new worker took over) | matches the plan's base figures (884 KB, 0% of saved lessons kept) |

## Not met, partly met, or not measurable here

- **R1 baseline reproduction for CPU-bound rows** (and scenario g's stale and after-push rows, +11%): not checkable while other lanes loaded the CPU. The cold, network-bound rows reproduce within ±2%, and the old and new harness agree on the same base app in the same window.
- **R2/R3 absolute targets (≤ 900, ≤ 850 ms)**: the base itself measured 1473 here instead of 1066. The gain is -354 ms (-24%), more than the plan's expected -216 ms (1066 -> 850); scaled to the baseline machine it would be about 810 ms.
- **R3 todayKey self time ≤ 5 ms**: what is left (22-25 ms) is all under `today.js:284`, which the content lane owns and switches to `util.dayOf` under contract C-3.
- **R4 "≥ 80 ms faster than R2+R3"**: not isolated; R2, R3 and R4 were measured together. The single read is checked by the unit test and by the e2e (one `getAll` at boot, two on the base).
- **R5**: TBT and the longest task fall (67 -> 8, 117 -> 58 light; 16 -> 0 heavy), but one 53-58 ms task remains on the light learner's games route, which is not round building. The ≥ 40 ms gain showed in one A/B (508 -> 280) and not in the other (263 -> 282).
- **R6 expressions ≥ 15 ms faster**: not measured; the expressions transition varied by ±60 ms between rounds and showed no change. Its cost is elsewhere (fetching and rendering the list); the collator is one object either way.
- **R8 vocab ≤ 100 ms**: with this lane alone the vocab open does not get faster: R2 removed the `localeCompare` from Today, so the first ICU collator load (and the first RelativeTimeFormat) now happens on the first vocab open instead of on every Today (profile: `collatorEn` 25.5 ms and `relTime` 28 ms first-use construction, against `localeCompare` sort 18.8 ms and `relativeDue` 17.5 ms on the base). With the boot lane's `warmIntl` call it is -34% (280 -> 184), TBT 124 -> 41; the longest task (87 ms) is still above 60.

## Skipped

Nothing was skipped. Every item's premise was checked in the code first (the sorts in `skillLevels`, the per-record `toISOString`, the double `getAll`, the per-comparison `senses()`, the per-row `RelativeTimeFormat` and per-comparison collator, the `n_items` field) and held.

## Suites run on the final tree

`npm test` (all unit tests), `node tools/validate-content.mjs` (0 errors), `tests/e2e/run.mjs` (56/56; one earlier
full run failed RL6, the Profile's under-18 text, which passed alone and in the next full run: a timing flake in a view
this lane does not touch), `tests/e2e/a11y.mjs` (0 violations), `tests/e2e/perf-runtime.mjs` (9/9) and every lane suite
(shell-components, lesson-flow, exercises, bilingual-text, lesson-content, first-run-today, practice-hubs, games,
real-life-writing, r4-lesson-flow, r4-exercises, r4-today-path, r4-practice-games, r4-real-life-writing,
r4-shell-bilingual): all pass. `node tools/build-manifest.mjs` leaves the generated files unchanged (no new precached
file). index.html, the CSP, i18n.js, css/app.css and the stored data format are untouched.
