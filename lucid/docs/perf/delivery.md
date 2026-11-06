# Perf lane "delivery": service worker, release hashing, deploy build, CI

Lane base: `b2b669b` (the reviewed plan). Items D1-D9 of `docs/perf/plan.json`. Every number below is an A/B
measured in the same time window on this machine (4 CPUs shared with the other lanes, load average 5-8), base and
this lane alternating, one run each per round, **3 rounds, median**, mobile profile (1.6 Mbps, 150 ms RTT, CPU 4x).
Absolute values drift with the load; read the change, not the level.

## Method

The base harness (`tools/perf.mjs`, runtime lane) has no returning-visit or release-update scenario yet (R1 adds
them), and it counts precache requests by `Cache-Control: no-cache`, which the new revalidating precache does not send
(`cache: 'no-cache'` sends `max-age=0`). So the numbers come from a scratch copy of the harness
(`scratchpad/perf-lanes/delivery/perf-d.mjs`, not committed) with:

- `--app <dir>`: the tree to serve (the base extracted with `git archive b2b669b lucid`, and a copy of this lane);
- precache requests counted by `no-cache` **or** `max-age=0`;
- server options: `max-age` (0 = every HTTP-cache entry is stale, "more than 10 minutes later"), an ETag epoch (a push
  to main: every ETag changes, bytes do not), and lie-fi (every request hangs 30 s);
- scenario g: onboarded A1 learner, cold Today, worker installed, lesson a1-01 opened once, then Today and the lesson
  are opened again in a state: fresh (HTTP cache fresh), stale (`max-age=0`), push (stale and new ETags), offline
  (`context.setOffline`), lie-fi (stale and every request hangs);
- scenario u: the same learner saves 4 lessons, then a release that changes only `sw.js` is deployed (this lane:
  a comment appended and `build-manifest` re-run; base: `RELEASE` bumped by hand, as base requires) with new ETags
  everywhere; the learner opens Today, goes to a lesson while the new worker installs, closes every tab and opens
  Today again after a gap (4 s; see "Activation on the next open" below).

## Results (mobile, A/B, median of 3)

### Returning visits (D2, D6)

| state | route | base | delivery | change |
|---|---|---:|---:|---:|
| fresh | Today | 498 | 503 | +5 (noise) |
| fresh | lesson a1-01 | 469 | 370 | -99 |
| stale (> 10 min) | Today | 1059 (29 requests) | 496 (1) | -563 |
| stale (> 10 min) | lesson a1-01 | 1315 (37 requests) | 468 (2) | -847 |
| after a push (stale, new ETags) | Today | 1995 (426 KB, 29 requests) | 474 (7.7 KB, 1) | -1521 |
| after a push (stale, new ETags) | lesson a1-01 | 2820 (507 KB, 36) | 523 (16 KB, 2) | -2297 |
| offline | Today | 563 | 511 | -52 |
| offline | lesson a1-01 | 508 | 437 | -71 |
| lie-fi (stale, every request hangs) | Today | 16591 | 646 | -15945 |
| lie-fi (stale, every request hangs) | lesson a1-01 | 24589 | 544 | -24045 |

Push and lie-fi were measured in a second window (the first run of g kept a fresh HTTP cache for those two
states, so base never went to the network; corrected to `max-age=0`). In that window and the gate window, a fresh
warm Today on this lane measured 463-654 ms, so absolute values here sit about 100 ms above the baseline's 378-428 ms
level from machine load. The one request left on a stale Today is the browser's own check of `sw.js`; on the lesson, the lesson file
(stale-while-revalidate, by design).

### First visit and precache (D4)

| | base | delivery | change |
|---|---:|---:|---:|
| precache on #/welcome: requests | 84 | 79 | -5 |
| precache on #/welcome: KB on the wire | 884 | 647 | -27% |
| precache on #/welcome: finished at | 9518 ms | 8732 ms | -786 |
| precache on #/today: KB on the wire | 884 | 417 | -53% |
| precache on #/today: finished at | 11146 ms | 9635 ms | -1511 |
| first session Today -> lesson a1-01 | 1978 ms | 1231 ms | **-38%** |
| cold #/welcome view | 2128 | 2131 | +3 |
| cold #/today view | 3768 | 3910 | +142 (see note) |
| warm #/today view (worker active) | 474 | 451 | -23 |
| offline sweep, 13 screens, no lesson saved (e2e OF2) | 13/13 | 13/13 | |

Cold Today: the precache starts after the view in both trees (start 3923 vs 4066 ms, `beforeView` 0, no overlapping
page requests), and the cold path runs the same code, so the +142 ms is run-to-run noise (this lane's three runs:
3716, 3910, 3958; base: 3725, 3768, 3788). In the gate window below, the same unminified tree measured 3771-3940.

### Release update (D3, D5): a release that changes only `sw.js`

| | base | delivery |
|---|---:|---:|
| requests for the update | 85 | **2** (`sw.js`, `release.json`) |
| KB on the wire | 885 | **6.1** |
| saved lessons kept (of 4) | 1 (only the one re-opened) | **4** |
| Today view while the update installs | 592 | 530 |
| Today -> lesson during the install | 161 ms | **129 ms** |
| next open of Today (all tabs closed, 4 s gap) | 561 | 455 |
| Lucid caches left | 1 | 1 |

Activation on the next open: if the learner reopens the app within about half a second of closing the last tab, the
waiting worker is activated during that navigation, and that Today took 917-1139 ms in 3 runs (base 493-690). With a
4 s gap it is 432-466 ms. Once the boot lane's B6 sends `lucid:activate` between two screens, the new release is
already active before the tabs close and this case disappears.

### Deploy build (D7) and CSS inlining (D9)

Sizes (gzip -6): JS 438.3 -> **322.9 KB** (61 modules; target 330), CSS 36.9 -> **22.1 KB** (target 23), content
1357 -> 1310 KB. Build time 0.4-0.7 s (target 10 s). Built tree: `verify.mjs` ok; full e2e (`E2E_ROOT`, run.mjs)
**57/57**, the same as the source; pixel diff of 15 routes at 390 px (welcome, today, path, practice, review, vocab,
games, real-life, a scenario, expressions, writing, progress, settings, lesson a1-01, reading): **0 differing
pixels** on every route. A forced error after build+verify in the pages.yml command restored the source: 0 `.map`
files left, `git status` clean.

Gate A/B, same window, 3 rounds, median (unminified = this lane's source tree; D7 = built; D9 = built with
`--inline-css`):

| | unminified | D7 built | D7 change | D9 inline | D9 vs D7 |
|---|---:|---:|---:|---:|---:|
| cold #/welcome view | 2188 | 1821 | **-367** | 1892 | +71 |
| cold #/welcome FCP | 2204 | 1824 | -380 | 1912 | +88 |
| cold #/today view | 3862 | 3466 | **-396** | 3499 | +33 |
| cold #/today FCP | 1896 | 1632 | -264 | 1640 | +8 |
| cold #/today KB gz | 426 | 363 | -64 | 363 | 0 |
| precache on #/welcome, KB | 647 | 561 | -86 | 583 | +22 |
| precache on #/welcome, finished | 8856 | 8293 | -563 | 8306 | +13 |
| warm Today, worker active (fresh) | 654 | 511 | -143 | 463 | -48 (noisy: 395-579) |

D7 passes its gate on this tree (both cold loads at least 200 ms faster); the plan asks the lead to confirm it on the
integrated tree. D9 fails its gate (needs 120 ms faster than D7 on both cold loads; measured slower), so it stays
off.

## What changed

- **D1** `tools/build-manifest.mjs` exports `computeManifest`, `computeRelease` and `buildManifest(root)` and writes
  `release.json` (`{release, hashes}`: 12-hex sha256 prefixes of the 70 precached files plus the shell, all 75
  lessons, centre and pool files when they exist, and every font; 154 entries, 6.3 KB raw, 2.2 KB gz) and the
  `RELEASE` line of `sw.js`: a hash of all hashes plus `sw.js` with that line blanked. `content/manifest.json` keeps
  `{version, lessons, offline}` and its size (726 B gz). The offline list follows contract C-2 (index and split files
  in, the replaced source files out when their index exists, centre and pool files never). `offline-manifest.test`
  recomputes all three and checks, on a temporary copy, that a 1-byte edit to a module, a lesson, `css/app.css`,
  `index.html` or the logic of `sw.js` makes the release stale until the tool is re-run, and that the release then
  changes.
- **D2, D6** `sw.js`: pages (one `./` entry, `index.html` and `./?query` matched to it), `config.js`, `js/`, `css/`,
  `vendor/`, `fonts/` and non-lesson `content/` come from the release cache first; a miss goes to the network and is
  kept (a navigation to a page outside the app is passed through, not kept). Lessons, centre and pool files stay
  stale-while-revalidate.
- **D3** `skipWaiting` only when no worker is active, on the one-time upgrade from the hand-numbered caches
  (`lucid-v1`, `lucid-YYYY-MM-DD.N`), or on `{type:'lucid:activate'}` (contract C-4). Activation keeps
  `clients.claim()`.
- **D4** precache with `cache: 'no-cache'` (304s reuse what the page loaded), shell first, then code (`js/`,
  `vendor/`), then content; `rubik-latin-ext.woff2` left to load on demand; no concurrency limit.
- **D5** install reads `release.json` (checked against `RELEASE`, retried once with `?r=`), copies every file whose
  bytes in an older Lucid cache hash to the new value, fetches the rest and checks each against its hash (one retry
  with `?r=<hash>`, then the install fails and the active release stays). Lessons, centre and pool files in older
  caches whose bytes still match move over; changed saved lessons are fetched again (best effort). Activation repeats
  the carry-over for lessons saved while the new worker waited. Reshaped from the plan: copies are checked by hashing
  the **cached bytes**, not by trusting the old `release.json`. Lessons are refreshed in the background
  (stale-while-revalidate), so an old cache can hold bytes from a later deploy; after a revert the old and new hashes
  could match while the cached bytes do not. Hashing about 3 MB in the worker during a background install is cheap,
  and it also lets the first upgrade from today's hand-numbered caches keep saved lessons and skip unchanged files.
- **D7** `tools/build/` (esbuild 0.25.10, exact, with lockfile): `build.mjs` minifies `js/**`, `vendor/*.mjs` and
  `config.js` in place (ESM, esnext, legal comments inline, external maps), strips whitespace and comments from
  `css/app.css` (with a map), compacts `content/**/*.json` and re-runs `buildManifest` on the built bytes.
  `verify.mjs` checks parse, imports (and that they equal the source's), maps, hashes, paths and the CSP. pages.yml
  runs both before its "Exclude" step and restores the source on any failure.
  Reshaped: CSS syntax minification is **off**. It rewrote `oklch(1 0 0 / 0.07)` as `#ffffff12` (rounded alpha) and
  changed 274 pixels of the active tab on 12 of 15 routes. Whitespace-only minification gives 22.1 KB gz instead of
  22.0 KB, and 0 differing pixels.
- **D8** `.github/workflows/lucid-verify.yml`: on pushes touching `lucid/**` and on dispatch: npm ci, the pinned
  Playwright 1.63.0 Chromium (runner only), unit tests, content validation, a built copy plus `verify.mjs`, then
  `tests/e2e/run.mjs` with `E2E_ROOT` on the built copy. It does not gate pages.yml.
- **D9** `build.mjs --inline-css` replaces exactly `<link rel="stylesheet" href="css/app.css">` with a `<style>` of
  the built CSS (font URLs rewritten to `fonts/`), and does nothing if the tag is missing or repeated.
  **Dropped by its gate** (cold welcome +71 ms and cold Today +33 ms against D7): pages.yml does not pass the flag.
  The code and its test stay, so the lead can re-run the gate on the integrated tree, where B5 moves the module
  script into the head.
- `tests/e2e/run.mjs`: `E2E_ROOT` (default: the repository) and check OF2 (offline sweep: 13 screens, no lesson
  saved, plus an offline reload).
- Docs: `docs/architecture.md` §7 rewritten and ADR-1 amended; `docs/qa/security-review.md` §5a (S-15 re-review
  and the S-03 interaction); `docs/qa/fix-log.md` S-15 note.

## Acceptance status

| item | status | measured |
|---|---|---|
| D1 | done | offline-manifest.test fails after a 1-byte edit to a module, a lesson, css, index.html or the logic of sw.js and passes after the rebuild; hashes match the served bytes (sw.test serves the real files and the install verifies all of them; verify.mjs on the built tree); sw.js RELEASE equals release.json; manifest.json 726 B gz |
| D2 | done | stale Today 1059 -> 496, lesson 1315 -> 468; after a push 1995 -> 474 and 2820 -> 523; lie-fi 16591 -> 646 and 24589 -> 544; offline 563 -> 511; fresh 498 -> 503. Against the plan's absolute targets (450/500/400) the levels sit about 100 ms high from machine load (fresh measured 463-654 in the same windows); the relative gain matches the prototype's. sw.test: cache hit, miss to network and kept, navigation fallback. Security sign-off pending (security-review.md §5a) |
| D3 | done | sw.test: first install activates; with an active worker the new one waits until `lucid:activate`; the legacy upgrade activates. Scenario u: the new worker stayed waiting through the session (0 mixed-release loads by construction: the page keeps its release's cache until every tab closes or it asks) |
| D4 | partial | precache 884 -> 647 KB (<= 700), 84 -> 79 requests (<= 160), finished 9518 -> 8732 ms (target 8.5 s: missed by about 230 ms on this tree; 8293 ms with D7); first session Today -> lesson 1978 -> 1231 ms (-38%, target -25%); offline sweep 13/13 (OF2); sw.test covers no-cache |
| D5 | done | scenario u: 85 requests / 885 KB -> 2 / 6.1 KB; saved lessons 1/4 -> 4/4; Today -> lesson during the install 161 -> 129 ms; next open of Today 561 -> 455 ms (target 420; noise level as above; see "Activation on the next open" for an immediate reopen); sw.test copy, fetch, mismatch -> retry -> fail, carry-over (also at activation and from the legacy caches) |
| D6 | done | after a push, opening Today downloaded 7.7 KB (`sw.js` only; 0 content requests) against 426 KB on base; sw.test routing cases |
| D7 | done (gate passed here; lead to confirm on the integrated tree) | cold welcome -367 ms, cold Today -396 ms; JS 322.9 KB gz, CSS 22.1 KB gz; e2e on the built tree 57/57 (= source); pixel diff 0 on 15 routes; build 0.4-0.7 s; forced-error fallback tested |
| D8 | partial | lucid-verify.yml written and YAML-checked; its steps were run locally (unit, validate, build of a copy, verify --source, e2e with E2E_ROOT: 57/57). Not run on GitHub: this lane does not push, so the workflow_dispatch run and the deliberately broken import run on a scratch branch are for the lead (the broken-import refusal is covered by build.test) |
| D9 | skipped (gate failed) | see the gate table |

## Not done, and why

- **D8 on GitHub**: needs a push; not done from this worktree.
- **D4's 8.5 s precache finish**: 8.7 s on this tree. The content lane's index files (C-2) take
  `real-life/scenarios.json` (131 KB gz) and the writing sources out of the precache, and D7 takes 86 KB off;
  together they should bring it under the target on the integrated tree.
- **`content/manifest.json` <= 1 KB gz after C-2**: 726 B here, but with the content lane's split files in the
  offline list it would be about 1.2 KB gz (simulated with the current scenario and task ids). Contract C-5 keeps the
  list in manifest.json, so the unit guard allows 1.5 KB; moving `offline` to release.json would need a contract
  change.
- **Absolute targets in a loaded window**: every target that is an absolute millisecond figure (fresh 390, stale and
  push 450, lie-fi 500, next open 420) reads about 100 ms high here because the same-window fresh baseline did too.
  The lead's sequential re-measure decides those.
- **Security sign-off for reversing S-15**: written up in security-review.md §5a; needs the lead's sign-off.
- **Tools note for the runtime lane**: the base harness counts precache requests by `Cache-Control: no-cache`;
  with D4 the worker sends `max-age=0`, so scenario f in `tools/perf.mjs` reports 0 precache requests for this lane
  until it also matches `max-age=0`.
