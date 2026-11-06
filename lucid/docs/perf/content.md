# Perf lane "content": generated content files and their consumers

Lane of the speed programme in [plan.json](plan.json) (key `content`). Base commit b2b669b. Everything here is
measured A/B in the same time window on this machine (other lanes ran in parallel, so absolute numbers drift;
compare the two columns of a row, not a row with [baseline.md](baseline.md)).

## What changed

| Item | Change |
|---|---|
| C1 | `tools/build-content-index.mjs` cuts the sources into `content/real-life/index.json` + `scenario/<id>.json`, `content/writing/index.json` + `task/<id>.json`, `content/centers/{read,listen,speak}.json` and `content/pool/<level>.json` (deterministic; `--check`; drift is an error in `npm run validate` and in `tests/unit/content-index.test.mjs`). `content.js` gains `scenarioIndex()`, `scenario(id)`, `writingIndex()`, `writingTask(id)`, `center(name)`, `pool(level)` (contract C-1). The first four fall back to the full source file when their own file cannot be loaded (offline with an older cache: the full files are what today's worker precaches), and `scenario`/`writingTask` resolve to null on a 404. `center`/`pool` reject, and their callers fall back to the lesson files. |
| C2 | Today and the lesson end read the two index files instead of `scenarios.json`, `exercises.json` and `assignments.json`; Today starts the next lesson's fetch alongside the lists. Writing rows go to the learner model through `withItemCount` (an empty array of length `n_items`), so `adaptive.writingMinutes` gives the same minutes with or without the runtime lane's R9. |
| C3 | Real life, Conversations, Practice, onboarding and profile list from the index (`n_practice` for the saved-place tag); the scenario screen loads its own file and the index after its first draw (for "Next scenario"). |
| C4 | `gatherExercises` reads the centre file(s) for the requested types, keeps the manifest's lessons, the same rank (`curriculum index * 100 + exercise index`) and order; if a centre file cannot be loaded it uses the lesson files on the device, as before. |
| C10 | `exercisePool(levels)` reads `pool/<level>.json` for the levels needed (a level check: its level; a drill: up to one level above the learner's), memoised per level, ordered as `content.allLessons()` ordered them; offline fallback to the lesson files of that level. Pool files store each lesson's topics and Hebrew pitfalls once (`{lessons, items}`), which keeps the largest file at 55.6 KB gz instead of 60.9 KB with the per-row layout of the plan. |
| C5 | The Writing lab lists from the writing index (`n_items`); the essay loads its own task file plus the index. A final task's topic packs come from their assignments' files: the chosen topic's before the first draw, the others after it, a newly chosen topic's before its redraw. |
| C6 | `attemptsOn` groups the attempts by lesson and exercise once per attempts array (WeakMap) instead of filtering every attempt per row. |
| C7 | Today's first `loadLesson` only sets the lesson, so a load draws once (`performance.mark('today:draw')`); later lesson/pace loads still redraw. Day checks in today.js and lesson.js use `util.dayOf` when present (contract C-3). |
| C8 | Word-count grouping in writing.js and essay.js uses `util.groupDigits` when present, else the same integer grouping without Intl (non-integers still use `toLocaleString`). |

Generated sizes (gzip -9): real-life index 5.9 KB (≤ 8), largest scenario file 5.7 KB (≤ 6), writing index
2.6 KB (≤ 3), largest pool file 55.6 KB (≤ 60), centre files read 89.7, listen 36.3, speak 20.1 KB.

## Measured before / after

Method: `tools/perf.mjs` from the base commit, copied to the scratchpad with two changes only (the app directory
from `PERF_APP`, and the view selector `'checkpoint/': '[data-begin]'`; the drill uses the default selector, which
did not resolve on either side, so only its requests and bytes are reported). Mobile profile (1.6 Mbps, 150 ms RTT,
CPU 4x), h2. Base = `git archive b2b669b`, tree = this lane. Three rounds, each round one base run then one tree run,
back to back; median of 3 per side. Machine load was 5-7 (other lanes running), which inflates warm times on both
sides.

### Cold and warm loads (scenarios b, c)

| route | view base | view tree | change | reqs base → tree | gz KB base → tree |
|---|---:|---:|---:|---|---|
| cold #/today | 3687 | 2513 | −1174 | 29 → 28 | 426 → 228 |
| warm #/today | 642 | 456 | −186 | 29 → 28 | 1465 → 662 (decoded) |
| cold #/real-life | 3605 | 2919 | −686 | 28 → 28 | 363 → 243 |
| cold #/scenario/rl-airport-checkin-overweight | 3643 | 3083 | −560 | 29 → 30 | 378 → 262 |
| (second set) cold scenario | 3591 | 2961 | −630 | | |
| cold #/writing | 2805 | 2326 | −479 | 26 → 25 | 271 → 194 |
| cold #/writing/final-B2 | 3776 | 3351 | −425 | 36 → 35 | 402 → 326 |
| (second set) cold final-B2 / warm final-B2 | 3757 / 488 | 3302 / 442 | −455 / −46 | | |
| cold #/reading | 7240 | 3756 | −3484 | 106 → 32 | 1059 → 369 |
| warm #/reading | 906 | 663 | −243 | 106 → 32 | |
| cold #/listening | 7366 | 3546 | −3820 | 106 → 32 | 1060 → 317 |
| cold #/checkpoint/A1 | 7346 | 3674 | −3672 | 107 → 33 | 1065 → 336 |
| warm #/checkpoint/A1 | 970 | 666 | −304 | 107 → 33 | |
| cold #/drill?topic=present-simple | (no view) | (no view) | | 107 → 35 | 1064 → 419 |
| cold #/lesson/a1-01 | 3236 | 3274 | +38 (noise) | 36 → 36 | 507 → 337 |
| (second set) cold / warm lesson | 3173 / 410 | 3180 / 364 | +7 / −46 | | |

The first set's warm lesson (475 → 566), warm scenario (580 → 614) and warm final-B2 (634 → 691) were re-run as a
second set of 3 + 3 in a quieter window: 410 → 364, 436 → 407 and 488 → 442, so no warm regression.

### In-app transitions from Today (scenario d)

Each of these was run with that route alone in the session (the harness reuses one page for all routes, so a route
measured after Reading finds every lesson already in memory on the base).

| transition | ms base | ms tree | reqs base → tree | gz KB base → tree |
|---|---:|---:|---|---|
| Today → reading, first session | 6340 | 3267 | 81 → 8 | 860 → 176 |
| Today → reading, returning | 965 | 257 | 81 → 8 | |
| Today → checkpoint/A1, first session | 6320 | 2779 | 82 → 9 | 866 → 143 |
| Today → checkpoint/A1, returning | 918 | 159 | 82 → 9 | |
| Today → drill (A1 topic), first session | 6319 | 3237 | 82 → 11 | 866 → 227 |
| Today → drill (A1 topic), returning | 529 | 187 | 82 → 11 | |
| Today → writing, first session | 317 | 260 | 1 → 1 | |
| Today → writing, returning | 116 (tbt 32) | 90 (tbt 2) | | |
| Today → writing/final-B2, first session | 2059 | 2134 | 10 → 10 | 130 → 131 |
| Today → writing/final-B2, returning | 221 | 248 | | |
| Today → scenario (not the planned one), first session | 1249 | 1607 | 5 → 6 | 65 → 69 |
| Today → scenario (not the planned one), returning | 128 | 177 | 5 → 6 | |

### CPU (C6)

The base harness has no heavy learner (R1 adds it), so C6 was measured with a Node micro-benchmark of one hub
render's attempt lookups (done count, per-level counts, rows, next suggestion) over 5,300 attempts, unthrottled,
median of 15: Reading (73 items) 18.6 → 0.35 ms; Listening (132 items) 33.6 → 0.43 ms. At 4x that is about 75 →
1.5 ms and 135 → 2 ms of main thread on the phone.

### Against the acceptance

- C1: met (sizes above; drift and determinism tests; validate passes).
- C2 standalone: cold Today 2513 ms (≤ 2600) and 228 KB gz (≤ 240); cold lesson 337 KB gz (≤ 340). Plan snapshot test
  for 5 learners passes. Integrated targets (≤ 1950 ms, ≤ 180 KB) depend on the boot and delivery lanes.
- C3: cold real-life −686 ms and cold scenario −560 / −630 ms (≥ 600 asked; the scenario's first set is 40 ms short,
  the second set meets it). Grep test passes.
- C4: cold reading 3756 ms (≤ 3100 asked: not met standalone), 32 requests (≤ 35), 369 KB gz (≤ 380); listening
  3546 ms (≤ 3000: not met). First-session Today → reading 3267 ms (≤ 300: not met; the 90 KB centre file competes
  with the 884 KB precache, which D4 trims, and B3 starts it at route resolve). Returning 257 ms (≤ 100: not met).
  Item list and order equal the old path (unit), offline e2e passes.
- C10: cold checkpoint/A1 3674 ms (≤ 3300: not met), 33 requests (≤ 30: not met), 336 KB gz (≤ 300: not met). The
  pool file is 50.6 KB of it; the rest is code, CSS and fonts (285 KB, 32 requests) that the delivery minify and boot
  font items address. First-session Today → checkpoint 2779 ms (≤ 700: not met standalone, same contention as
  reading); returning 159 ms (≤ 150: 9 ms over). Pool equality and seeded-set tests pass; offline e2e passes.
- C5: Today → writing first session 260 ms (≤ 350), Today → final-B2 first session 2134 ms in an isolated session
  (the plan's 95 ms base figure is from a session where Reading had run first; isolated, the base is 2059 ms, so
  +75 ms, within run-to-run spread of this window); returning 248 vs 221. Writing e2e checks pass.
- C6: unit equivalence passes; TBT acceptance needs R1's heavy learner (micro-benchmark above instead).
- C7: one draw per Today load (e2e). Heavy-learner targets need R1-R4.
- C8: returning Today → writing 90 ms with 1 long task and TBT 2 ms (base 116 ms, TBT 32); ≤ 75 ms not met in this
  loaded window. Labels identical (unit).

### Measured regression, and what removes it

Opening a scenario that Today did not plan, right after Today, costs one more request after the view module loads
(first session +358 ms, returning +49 ms), because Today no longer holds every scenario. Today now loads the scenario
and writing task its plan offers at idle, so the planned one opens without waiting; for any other scenario the boot
lane's B3 (`content.scenario?.(id)` started at route resolve, contract C-1) overlaps the fetch with the module load.


## Skipped or reshaped

- C9 (P2, gated: list-only reading file, passage loaded on open): not done. With C4 the reading list costs one 90 KB gz
  file; a list-only file would save most of it on the list, but every passage open would then need its lesson file
  (about 20 KB gz, one more round trip, under the same precache contention that makes the first-session list 3.3 s),
  and offline every row whose lesson is not saved would have to be marked "not on this device". The gate asks for a
  first-session passage open ≤ 400 ms, which the measured contention makes unlikely without D4, and the offline
  behaviour would get worse than C4's (where every listed text opens from the cached centre file). Revisit after D4
  and B3 are merged, if cold reading is still over 2400 ms.
- C10 file layout reshaped: the plan's per-row `[{lesson, level, topics, pitfalls, ex}]` measured 60.7 and 60.9 KB gz
  (A2, B1: over the 60 KB limit) and 456 KB raw for A1; storing each lesson's topics and pitfalls once
  (`{lessons, items}`) gives 55.6 KB gz at most and 222 KB raw for A1, with the same items (unit test).
- C2: rows reach the learner model through `withItemCount`, so the plan's minutes are right whether or not R9 is
  merged (tested both ways: removing it fails the snapshot test).
- C8: the fallback when `util.groupDigits` is absent is the same integer grouping (not `toLocaleString`, as the plan
  wrote), so the gain does not wait for the runtime lane; non-integers still use Intl.
- Offline (contract C-2): until the delivery lane lists the index and per-item files for precaching, they are cached
  on first use; when one cannot be loaded, content.js falls back to the full file that today's worker precaches.


## Tests

Unit: `tests/unit/content-index.test.mjs` (new: drift, determinism, URL-safe ids, rows equal sources, sizes, grep,
content.js memo and fallbacks, Today plan for 5 seeded learners), `tests/unit/pool.test.mjs` (new: per-level pool equals
the lesson-file pool, seeded level checks and drills equal the base code over all lessons and the fallback, offline
fallback), `tests/unit/center.test.mjs` (centre items, order and ranks equal the lesson path; attemptsOn equals the
filter on 5,300 attempts), `tests/unit/work-content.test.mjs` (groupDigits equals toLocaleString('en-US')).

E2E checks added to the lane's suites: `practice-hubs.mjs` (PERF-C4 online and offline, PERF-C10 online and offline),
`first-run-today.mjs` (PERF-C7 one draw), `real-life-writing.mjs` (PERF-C3 scenario files and not-found, PERF-C5
final-task pack online, on reopening and offline).

Final run on the lane's last code commit (cbcd0cf), on ports 9451-9487: `npm test` 323/323; `node tools/validate-content.mjs`
0 errors; run.mjs 56/56; a11y 0 violations (29 routes + welcome and onboarding x 5 configurations); shell-components
12/12, lesson-flow 25/25, exercises 12/12, bilingual-text 12/12, lesson-content 7/7, first-run-today 14/14,
practice-hubs 14/14, games 17/17, real-life-writing 16/16, r4-lesson-flow 32/32, r4-exercises 13/13, r4-today-path
14/14, r4-practice-games 19/19, r4-real-life-writing 15/15, r4-shell-bilingual 11/11. No flakes seen.

