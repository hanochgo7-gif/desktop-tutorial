# Perf lane "boot": critical path, route prefetch, release handoff, perceived load and shell stability

Lane base: `b2b669b` (the reviewed plan). Items from `docs/perf/plan.json`, lane `boot`. Every number below is an
A/B pair measured in the same time window on this 4-CPU machine while the other three lanes were also running:
the lane base (`git archive b2b669b`) and a snapshot of this lane, run alternately (one run each, three rounds),
median of three, with `node tools/perf.mjs` (mobile profile: 1.6 Mbps, 150 ms RTT, CPU 4x; desktop unshaped).
Absolute values drift with the machine's load (warm loads especially: the same build varies by ±100 ms between
rounds), so read the change, not the absolute value. The scripts used are listed at the end.

## What changed

| Item | Status | Change |
|---|---|---|
| B1 | done | `index.html` preloads `js/core/session.js`, `js/core/placement.js` (and the new `js/core/route-deps.js`), so the modulepreload list equals app.js's static import closure, and preloads `content/curriculum.json` and `content/manifest.json` (`as=fetch crossorigin`). `tests/unit/boot-preload.test.mjs` checks both. |
| B2 | done | `tools/build-route-deps.mjs` generates `js/core/route-deps.js` (each route's modules beyond the boot graph, static import scan, no bundling). `router.go()` adds a modulepreload link per module, once, before `match.load()`; after Today renders, the lesson route's modules preload at idle. `router.test` fails when the map is stale. |
| B3 | done | `router.js` `DATA` map: each route's first content is requested through `content.js` as the route resolves (lesson, taxonomy, scenarios or `scenarioIndex`, writing files or `writingIndex`, slang, pictures, rubric, `center(kind)`, `pool(level)`; Today also the next lesson). The contract C-1 methods are feature-detected; without the content lane the old files are used. content.js keeps one promise per file, so nothing is fetched twice. |
| B6 | done (page side) | `watchRelease`, `checkForRelease`, `releaseOnHide` and the release step in `router.go` (contract C-4). See below. |
| B4 | done | `<html class="booting">`; `app.css` hides `.main` while booting; the first spinner is `.boot-first` (fixed, visible, announced, `pointer-events: none`); `drawShell` and the boot error path remove the class. |
| B5 | done, reshaped | The boot frame (inline `<style>` with the app's colour tokens, `.bootframe` with the key and wordmark, `aria-hidden`), `preload as=style` for app.css, the stylesheet moved into the body after the frame, the module script moved into the head. Reshaped: the module script is `async`, and app.js primes the first route (`primeRoute`: its modules, its content and its view import) as soon as the learner model is ready, then waits for `DOMContentLoaded` before drawing. Reason below. |
| B7 | skipped (implemented, measured, reverted) | See "Skipped". |
| B8 | skipped (measured, not applied) | See "Skipped". |

### B6, the page side of the release handoff (contract C-4)

- `app.js` passes the registration to `watchRelease(reg)` once `navigator.serviceWorker.register()` resolves.
- A `controllerchange` that this tab did not request marks the tab stale, except the first one when no worker
  controlled the page and none was active (the first install claiming the page: nothing to switch).
- `router.go`, on a path change only (never a query-only change), after the old view's cleanup: if the tab is stale
  it flushes the store and reloads; if a worker is waiting and a worker controls the page, it posts
  `{type:'lucid:activate'}`, waits up to 3 s for `controllerchange`, then flushes the store and reloads on the new
  hash. On timeout it carries on normally (and a late switch marks the tab stale, so its next path change reloads).
- Hidden tab: the same, only on a hub (no route parameter, no query, not a bare full-screen route) with no text typed
  into a field. If the tab becomes visible again or moves on during the 3 s, it does not reload then.
- Visible again after more than an hour since the last check: `registration.update()`.
- With the current `sw.js` (skipWaiting on install, before the delivery lane merges) there is never a waiting worker;
  a new release's `clients.claim()` makes every open tab stale, so each reloads once at its next path change instead of
  mixing a new view module into the old boot graph. With the delivery lane's worker the page asks for the switch.

`tests/e2e/perf-boot.mjs` proves it on a throwaway copy of the app served with three successive releases (each
module records its release; a view module evaluated under another release's boot is logged). It uses the delivery
lane's `sw.js` when it is merged (it contains `lucid:activate`) and otherwise the current `sw.js` patched to the C-4
behaviour (code from the release cache, a new worker waits, `lucid:activate` activates it). Checked: no reload during
a lesson in progress or an essay being written (also when hidden), the lesson's resume point and the essay draft
survive the reload triggered by leaving them, the second tab reloads at its next path change, 0 views from another
release in either tab, exactly one reload per release per tab, no reload on a query-only change, a hidden tab on Today
switches at once, and the first install never reloads.

### Why B5 was reshaped (async module script)

With the stylesheet in the body, Chrome blocks the parser at that `<link>` until the CSS arrives, and a deferred
module script runs only after parsing. On a cold phone load every boot module had arrived at about 1.43 s but the
CSS only at 1.63 s, and nothing of the route started before about 1.72 s. In the plan's proto3b layout the boot
therefore still waited for the stylesheet, and on desktop the cold views were 80-90 ms slower than the lane base
(measured, table "B4 B5" below). With `async` the module runs as soon as its graph is ready: the store, the learner
model and the first route's modules and content start while the CSS loads; drawing waits for `DOMContentLoaded`.
A boot error still waits for the document before it writes its message (tested).

## Measured results

### Acceptance, item by item

| Item | Acceptance (plan) | Measured (A/B, same window, median of 3) | Verdict |
|---|---|---|---|
| B1 | welcome and Today each ≥ 120 ms faster | welcome 2078 → 1899 (−179), Today 3686 → 3520 (−166) | met |
| B1 | curriculum.json requestStart ≤ 650 ms on cold Today | 1551-1599 → 485-510 ms (every run, two A/B windows) | met |
| B1 | each preloaded URL requested once | 0 duplicates on every cold load (harness sample, perf-boot e2e). Warm (SW) loads read the two JSON files twice from the worker cache: a Chromium limitation, see Notes | met on cold loads; warm +2 SW cache reads |
| B1 | boot-preload.test passes, and fails on an unpreloaded import | passes; the test builds a fixture with an import added without a preload and checks the drift is reported | met |
| B2 | cold lesson, games, final-B2 each ≥ 250 ms faster than the lane base | −394, −449, −523 (B1 + B2 + B6 vs base; B1 alone gave −166 to −179 on the boot) | met |
| B2 | first-session Today → lesson ≥ 40 % faster | 1912 → 86 ms (−95 %) | met |
| B2 | welcome and Today regress ≤ 30 ms | welcome −169, Today −226 (with B1) | met |
| B2 | stale-map test | `router.test` compares the file with the generator's output | met |
| B3 | integrated: lesson ≤ 2100, expressions ≤ 2200, progress ≤ 1750, checkpoint/A1 ≤ 2300 | whole lane without the content lane: lesson 2427, expressions 2472, progress 1861; checkpoint/A1 needs `content.pool` (content lane) and is not in the base harness's routes | not measurable here (needs the content lane) |
| B3 | lesson, real-life, scenario, final-B2 each ≥ 250 ms faster than without B3 | lesson −72, real-life −208, scenario −215, final-B2 −263 (Today −469, expressions −159, progress −106) | final-B2 met; the others below the bar standalone (with B2 the lesson file already started early) |
| B3 | 0 duplicate content requests; 404 lesson and scenario screens | 0 duplicates (harness samples, e2e); not-found screens shown (perf-boot e2e) | met |
| B6 | new release no later than the first path change; no reload mid-lesson or mid-essay; draft and resume point survive; second tab reloads at its next path change; 0 mixed loads; ≤ 1 reload per release per tab | all checked in `tests/e2e/perf-boot.mjs` (three releases, two tabs, a release probe in every module). Scenario u is the runtime lane's harness addition, not in the base harness | met (e2e) |
| B4 | desktop CLS ≤ 0.01 on all scenario b and c loads | 0.186-0.500 → 0.000 on every cold and warm desktop load | met |
| B4 | mobile CLS 0 | 0.000 everywhere | met |
| B4 | desktop views within +15 ms | whole lane, cold: welcome +45, Today −1, lesson +10, the others −6 to −114; warm: noisy (per-run minima equal or lower, e.g. Today 141 vs 117), see the desktop table | mostly met; cold welcome +45 |
| B4 | a forced boot error still shows its message; axe 0 new violations | perf-boot e2e; a11y suite 0 violations | met |
| B5 | mobile FCP ≤ 700 ms on welcome and Today | 2088 → 648, 1860 → 624 | met |
| B5 | views regress ≤ 30 ms | planned layout: welcome −65, Today +30; reshaped (async): a further welcome −138, Today −327 | met (reshaped) |
| B5 | CLS 0 phone and desktop; dark mode never white; frame colours = tokens | CLS 0; perf-boot e2e screenshots the first frame in light and dark; a unit test compares the frame with the app.css tokens | met |
| B7 | page-load script ≥ 15 ms lower at 4x | 1.7 ms (CDP, 10 loads each); the probe itself 3-18 ms | skipped (reverted) |
| B8 | welcome ≥ 50 ms faster, CLS ≤ 0.01 | −39 ms; phone CLS 0.030 on cold welcome | skipped (not applied) |

Two rows of the whole-lane tables need a word:

- **Today → writing/final-B2 (first session) 101 → 436 ms.** An artefact of the scenario's order. On the base the
  earlier first-session transitions are slow (Today → lesson alone takes 1.9 s), so by the time final-B2 opens the
  worker's precache has put `essay.js` in the HTTP cache. With this lane the same sequence reaches final-B2 about 2 s
  earlier, before the precache has fetched it, so `essay.js` comes from the network. Replayed transition by
  transition (`fb2.mjs`): essay.js 10 ms on the base (HTTP cache) vs 358 ms here (network). Opened straight after
  Today, with nothing cached, final-B2 takes 1616 ms on the base and 700 ms with this lane.
- **Warm loads** vary by ±100-300 ms between rounds of the same build on this machine (base warm real-life 972, 515
  and 423 ms in one window). A separate warm-only A/B of the async change (8 alternating loads per side through each
  tree's own perf.mjs server, CPU 4x): Today 862 → 930, lesson 658 → 662, real-life 717 → 648; none outside the
  spread. Warm rows show +2 requests (the JSON preloads, above) and +1 module (`route-deps.js`); the idle lesson
  preload adds 9 requests after a warm or cold Today (+430 KB raw from the worker cache, after the view).

### Tables

#### Whole lane, phone: lane base → this lane (all items)

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) | reqs base → boot (Δ) | gzKB base → boot (Δ) |
|---|---:|---:|---:|---:|---:|
| cold #/welcome | 2074 → 1767 (-307) | 2088 → 648 (-1440) | 0.000 → 0.000 (+0.000) | 24 → 25 (+1) | 189 → 194 (+5) |
| cold #/today | 3690 → 2971 (-719) | 1860 → 624 (-1236) | 0.000 → 0.000 (+0.000) | 29 → 38 (+9) | 426 → 551 (+125) |
| warm #/today | 442 → 451 (+9) | 272 → 164 (-108) | 0.000 → 0.000 (+0.000) | 29 → 40 (+11) | 1465 → 1900 (+435) |
| cold #/lesson/a1-01 | 3224 → 2427 (-797) | 3232 → 620 (-2612) | 0.000 → 0.000 (+0.000) | 36 → 37 (+1) | 507 → 512 (+5) |
| warm #/lesson/a1-01 | 362 → 407 (+44) | 380 → 152 (-228) | 0.000 → 0.000 (+0.000) | 36 → 39 (+3) | 1693 → 1773 (+80) |
| cold #/real-life | 3550 → 2633 (-917) | 1868 → 628 (-1240) | 0.000 → 0.000 (+0.000) | 28 → 29 (+1) | 363 → 369 (+5) |
| warm #/real-life | 421 → 402 (-19) | 252 → 144 (-108) | 0.000 → 0.000 (+0.000) | 28 → 31 (+3) | 1193 → 1273 (+80) |
| cold #/scenario/rl-airport-checkin-overweight | 3575 → 2695 (-880) | 1872 → 624 (-1248) | 0.000 → 0.000 (+0.000) | 29 → 30 (+1) | 378 → 383 (+5) |
| warm #/scenario/rl-airport-checkin-overweight | 423 → 384 (-39) | 288 → 156 (-132) | 0.000 → 0.000 (+0.000) | 29 → 32 (+3) | 1237 → 1317 (+80) |
| cold #/writing | 2746 → 2189 (-557) | 1880 → 624 (-1256) | 0.000 → 0.000 (+0.000) | 26 → 27 (+1) | 271 → 277 (+5) |
| warm #/writing | 450 → 420 (-30) | 308 → 132 (-176) | 0.000 → 0.000 (+0.000) | 26 → 29 (+3) | 842 → 922 (+80) |
| cold #/writing/final-B2 | 3765 → 2862 (-903) | 1860 → 628 (-1232) | 0.000 → 0.000 (+0.000) | 36 → 37 (+1) | 402 → 408 (+5) |
| warm #/writing/final-B2 | 485 → 512 (+28) | 256 → 180 (-76) | 0.000 → 0.000 (+0.000) | 36 → 39 (+3) | 1238 → 1319 (+80) |
| cold #/games | 2898 → 2042 (-857) | 1872 → 624 (-1248) | 0.000 → 0.000 (+0.000) | 34 → 35 (+1) | 252 → 258 (+5) |
| warm #/games | 363 → 395 (+31) | 252 → 192 (-60) | 0.000 → 0.000 (+0.000) | 34 → 37 (+3) | 726 → 806 (+80) |
| cold #/expressions | 3481 → 2472 (-1008) | 1868 → 616 (-1252) | 0.000 → 0.000 (+0.000) | 32 → 33 (+1) | 327 → 332 (+5) |
| warm #/expressions | 408 → 426 (+18) | 232 → 180 (-52) | 0.000 → 0.000 (+0.000) | 32 → 35 (+3) | 965 → 1045 (+80) |
| cold #/reading | 7185 → 6372 (-812) | 1868 → 652 (-1216) | 0.000 → 0.000 (+0.000) | 106 → 107 (+1) | 1059 → 1064 (+5) |
| warm #/reading | 748 → 738 (-10) | 308 → 160 (-148) | 0.000 → 0.000 (+0.000) | 106 → 109 (+3) | 3746 → 3826 (+80) |
| cold #/progress | 2613 → 1861 (-752) | 1900 → 608 (-1292) | 0.000 → 0.000 (+0.000) | 26 → 27 (+1) | 215 → 220 (+5) |
| warm #/progress | 383 → 399 (+16) | 252 → 152 (-100) | 0.000 → 0.000 (+0.000) | 26 → 29 (+3) | 619 → 699 (+80) |

#### Whole lane, phone, in-app transitions from Today (scenario d)

| mobile | ms base → boot (Δ) |
|---|---:|
| Today -> #/lesson/a1-01 (first session) | 1897 → 84 (-1812) |
| Today -> #/real-life (first session) | 471 → 328 (-143) |
| Today -> #/scenario/rl-airport-checkin-overweight (first session) | 412 → 377 (-35) |
| Today -> #/writing (first session) | 317 → 273 (-44) |
| Today -> #/writing/final-B2 (first session) | 101 → 436 (+335) |
| Today -> #/games (first session) | 345 → 272 (-73) |
| Today -> #/expressions (first session) | 107 → 152 (+45) |
| Today -> #/reading (first session) | 4161 → 4167 (+7) |
| Today -> #/progress (first session) | 62 → 67 (+5) |
| Today -> #/lesson/a1-01 (returning) | 147 → 70 (-77) |
| Today -> #/real-life (returning) | 100 → 79 (-22) |
| Today -> #/scenario/rl-airport-checkin-overweight (returning) | 91 → 70 (-21) |
| Today -> #/writing (returning) | 104 → 103 (0) |
| Today -> #/writing/final-B2 (returning) | 94 → 96 (+2) |
| Today -> #/games (returning) | 97 → 87 (-10) |
| Today -> #/expressions (returning) | 110 → 128 (+18) |
| Today -> #/reading (returning) | 418 → 442 (+24) |
| Today -> #/progress (returning) | 66 → 64 (-2) |

#### Whole lane, desktop

| desktop | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 78 → 122 (+45) | 100 → 88 (-12) | 0.246 → 0.000 (-0.246) |
| cold #/today | 102 → 101 (-1) | 68 → 48 (-20) | 0.500 → 0.000 (-0.500) |
| warm #/today | 153 → 233 (+80) | 108 → 128 (+20) | 0.496 → 0.000 (-0.496) |
| cold #/lesson/a1-01 | 102 → 112 (+10) | 116 → 60 (-56) | 0.246 → 0.000 (-0.246) |
| warm #/lesson/a1-01 | 144 → 123 (-20) | 148 → 64 (-84) | 0.237 → 0.000 (-0.237) |
| cold #/real-life | 101 → 88 (-13) | 80 → 68 (-12) | 0.496 → 0.000 (-0.496) |
| warm #/real-life | 176 → 129 (-47) | 128 → 64 (-64) | 0.496 → 0.000 (-0.496) |
| cold #/scenario/rl-airport-checkin-overweight | 124 → 109 (-15) | 76 → 64 (-12) | 0.500 → 0.000 (-0.500) |
| warm #/scenario/rl-airport-checkin-overweight | 148 → 165 (+16) | 108 → 72 (-36) | 0.496 → 0.000 (-0.496) |
| cold #/writing | 100 → 81 (-19) | 96 → 44 (-52) | 0.500 → 0.000 (-0.500) |
| warm #/writing | 134 → 178 (+44) | 108 → 108 (+0) | 0.483 → 0.000 (-0.483) |
| cold #/writing/final-B2 | 114 → 107 (-7) | 72 → 44 (-28) | 0.500 → 0.000 (-0.500) |
| warm #/writing/final-B2 | 169 → 226 (+56) | 112 → 100 (-12) | 0.483 → 0.000 (-0.483) |
| cold #/games | 100 → 88 (-12) | 72 → 48 (-24) | 0.496 → 0.000 (-0.496) |
| warm #/games | 146 → 240 (+93) | 104 → 124 (+20) | 0.483 → 0.000 (-0.483) |
| cold #/expressions | 114 → 108 (-6) | 80 → 56 (-24) | 0.500 → 0.000 (-0.500) |
| warm #/expressions | 212 → 225 (+12) | 168 → 80 (-88) | 0.433 → 0.000 (-0.433) |
| cold #/reading | 329 → 214 (-114) | 100 → 64 (-36) | 0.496 → 0.000 (-0.496) |
| warm #/reading | 346 → 346 (+0) | 132 → 48 (-84) | 0.496 → 0.000 (-0.496) |
| cold #/progress | 136 → 94 (-42) | 96 → 52 (-44) | 0.483 → 0.000 (-0.483) |
| warm #/progress | 127 → 173 (+46) | 100 → 72 (-28) | 0.496 → 0.000 (-0.496) |

#### B1 alone: lane base → B1

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | reqs base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 2078 → 1899 (-179) | 2096 → 1912 (-184) | 24 → 24 (+0) |
| cold #/today | 3686 → 3520 (-166) | 1864 → 1712 (-152) | 29 → 29 (+0) |
| warm #/today | 431 → 441 (+10) | 264 → 276 (+12) | 29 → 31 (+2) |

#### B2 (built on B1, with B6): lane base → B1 + B2 + B6

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | reqs base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 2141 → 1972 (-169) | 2160 → 1988 (-172) | 24 → 25 (+1) |
| cold #/today | 3751 → 3526 (-226) | 1908 → 1728 (-180) | 29 → 38 (+9) |
| warm #/today | 495 → 540 (+44) | 320 → 356 (+36) | 29 → 40 (+11) |
| cold #/lesson/a1-01 | 3230 → 2837 (-394) | 3260 → 2864 (-396) | 36 → 37 (+1) |
| warm #/lesson/a1-01 | 524 → 562 (+38) | 564 → 592 (+28) | 36 → 39 (+3) |
| cold #/games | 2877 → 2428 (-449) | 1868 → 1728 (-140) | 34 → 35 (+1) |
| warm #/games | 560 → 580 (+20) | 360 → 448 (+88) | 34 → 37 (+3) |
| cold #/writing/final-B2 | 3797 → 3274 (-523) | 1896 → 1748 (-148) | 36 → 37 (+1) |
| warm #/writing/final-B2 | 586 → 500 (-86) | 336 → 352 (+16) | 36 → 39 (+3) |

| mobile | ms base → boot (Δ) |
|---|---:|
| Today -> #/lesson/a1-01 (first session) | 1912 → 86 (-1826) |
| Today -> #/games (first session) | 920 → 679 (-241) |
| Today -> #/writing/final-B2 (first session) | 723 → 500 (-223) |
| Today -> #/lesson/a1-01 (returning) | 135 → 76 (-59) |
| Today -> #/games (returning) | 160 → 110 (-49) |
| Today -> #/writing/final-B2 (returning) | 161 → 148 (-13) |

#### B3 alone: B1 + B2 + B6 → + B3

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | reqs base → boot (Δ) |
|---|---:|---:|---:|
| cold #/today | 3720 → 3251 (-469) | 1880 → 1772 (-108) | 38 → 38 (+0) |
| warm #/today | 603 → 538 (-65) | 380 → 372 (-8) | 40 → 40 (+0) |
| cold #/lesson/a1-01 | 2832 → 2760 (-72) | 2852 → 2780 (-72) | 37 → 37 (+0) |
| warm #/lesson/a1-01 | 589 → 719 (+131) | 608 → 744 (+136) | 39 → 39 (+0) |
| cold #/real-life | 3110 → 2902 (-208) | 1792 → 1764 (-28) | 29 → 29 (+0) |
| warm #/real-life | 586 → 576 (-10) | 436 → 436 (+0) | 31 → 31 (+0) |
| cold #/scenario/rl-airport-checkin-overweight | 3182 → 2967 (-215) | 1760 → 1776 (+16) | 30 → 30 (+0) |
| warm #/scenario/rl-airport-checkin-overweight | 803 → 540 (-263) | 420 → 404 (-16) | 32 → 32 (+0) |
| cold #/writing/final-B2 | 3453 → 3191 (-263) | 1828 → 1804 (-24) | 37 → 37 (+0) |
| warm #/writing/final-B2 | 597 → 718 (+121) | 380 → 420 (+40) | 39 → 39 (+0) |
| cold #/expressions | 2909 → 2749 (-159) | 1776 → 1816 (+40) | 33 → 33 (+0) |
| warm #/expressions | 737 → 568 (-169) | 536 → 420 (-116) | 35 → 35 (+0) |
| cold #/progress | 2282 → 2176 (-106) | 1760 → 1776 (+16) | 27 → 27 (+0) |
| warm #/progress | 548 → 512 (-37) | 392 → 416 (+24) | 29 → 29 (+0) |

#### B4 + B5 as planned (proto3b layout): + B3 → + B4 + B5

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | lcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|---:|
| cold #/welcome | 2116 → 2051 (-65) | 2120 → 720 (-1400) | 2120 → 2068 (-52) | 0.000 → 0.000 (+0.000) |
| cold #/today | 3313 → 3342 (+30) | 1884 → 692 (-1192) | 3352 → 3444 (+92) | 0.000 → 0.000 (+0.000) |
| warm #/today | 743 → 720 (-23) | 576 → 284 (-292) | 784 → 768 (-16) | 0.000 → 0.000 (+0.000) |

| desktop | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 144 → 223 (+79) | 160 → 196 (+36) | 0.237 → 0.000 (-0.237) |
| cold #/today | 154 → 246 (+92) | 116 → 128 (+12) | 0.496 → 0.000 (-0.496) |
| warm #/today | 384 → 370 (-15) | 292 → 148 (-144) | 0.483 → 0.000 (-0.483) |

#### B5 reshaped: planned layout → async module script with the first route primed

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 1989 → 1851 (-138) | 648 → 692 (+44) | 0.000 → 0.000 (+0.000) |
| cold #/today | 3355 → 3028 (-327) | 640 → 664 (+24) | 0.000 → 0.000 (+0.000) |
| warm #/today | 695 → 743 (+48) | 324 → 200 (-124) | 0.000 → 0.000 (+0.000) |
| cold #/lesson/a1-01 | 2731 → 2513 (-218) | 688 → 644 (-44) | 0.000 → 0.000 (+0.000) |
| warm #/lesson/a1-01 | 435 → 652 (+217) | 248 → 228 (-20) | 0.000 → 0.000 (+0.000) |
| cold #/real-life | 3014 → 2723 (-291) | 632 → 644 (+12) | 0.000 → 0.000 (+0.000) |
| warm #/real-life | 515 → 595 (+81) | 212 → 172 (-40) | 0.000 → 0.000 (+0.000) |

| desktop | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 101 → 123 (+23) | 68 → 84 (+16) | 0.000 → 0.000 (+0.000) |
| cold #/today | 166 → 167 (+1) | 76 → 80 (+4) | 0.000 → 0.000 (+0.000) |
| warm #/today | 279 → 294 (+14) | 120 → 140 (+20) | 0.000 → 0.000 (+0.000) |
| cold #/lesson/a1-01 | 223 → 157 (-66) | 132 → 80 (-52) | 0.000 → 0.000 (+0.000) |
| warm #/lesson/a1-01 | 343 → 323 (-20) | 212 → 136 (-76) | 0.000 → 0.000 (+0.000) |
| cold #/real-life | 160 → 251 (+91) | 96 → 120 (+24) | 0.000 → 0.000 (+0.000) |
| warm #/real-life | 288 → 299 (+11) | 164 → 144 (-20) | 0.000 → 0.000 (-0.000) |

#### B8 (not applied): this lane → without the rubik-latin preload

| mobile | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 2094 → 2055 (-39) | 684 → 676 (-8) | 0.000 → 0.030 (+0.030) |
| cold #/today | 3372 → 3373 (+2) | 624 → 660 (+36) | 0.000 → 0.000 (+0.000) |
| warm #/today | 674 → 785 (+112) | 200 → 288 (+88) | 0.000 → 0.000 (+0.000) |

| desktop | view base → boot (Δ) | fcp base → boot (Δ) | cls base → boot (Δ) |
|---|---:|---:|---:|
| cold #/welcome | 148 → 196 (+48) | 96 → 140 (+44) | 0.000 → 0.000 (+0.000) |
| cold #/today | 237 → 230 (-7) | 96 → 136 (+40) | 0.000 → 0.000 (+0.000) |
| warm #/today | 318 → 295 (-23) | 152 → 164 (+12) | 0.000 → 0.000 (+0.000) |

## Skipped

- **B7 (fitTitle in rAF, title size kept in localStorage)**: implemented and tested (CLS 0, shell tests passing), then
  reverted. Premise not reproduced: timing the 18-probe measurement directly on a drawn phone shell at CPU 4x gave
  18.1, 7.3 and 4.7 ms for the first measurement on progress, Today and real-life (3.5, 11, 2.7 ms on repeats), and
  CDP ScriptDuration for a page load with the size kept vs measured afresh (same build, alternating, 10 loads each)
  differed by 1.7 ms (7.8 vs 9.5 ms). The acceptance is ≥ 15 ms of page-load script time; the gain is under it,
  and the change would add a stored key. The harness A/B (B5 → B7, warm script −16, −20 and +22 ms on Today,
  progress and real-life) is within noise.
- **B8 (drop the rubik-latin preload)**: measured on a snapshot, not applied. Cold welcome −39 ms on the phone (the
  bar is −50), mobile CLS on cold welcome 0.030 (the bar is 0.01), desktop cold welcome +48 ms. The plan says revert
  in that case.

## Test runs (final tree, from lucid/)

`npm test` 316/316; `node tools/validate-content.mjs` exit 0; `tests/e2e/run.mjs` 56/56; `tests/e2e/a11y.mjs` 0
violations; every lane suite passed (shell-components 12, lesson-flow 25, exercises 12, bilingual-text 12,
lesson-content 7, first-run-today 13, practice-hubs 10, games 17, real-life-writing 14, r4-lesson-flow 32,
r4-exercises 13, r4-today-path 14, r4-practice-games 19, r4-shell-bilingual 11, perf-boot 12), except one run of
r4-real-life-writing at 13/15 while perf runs loaded the machine: the two RW-12 390 checks read the filter sheet's
grid right after it opens, before app.js's `fitSegs` frame. Re-run alone three times: 15/15 each. Earlier in the
session run.mjs failed RL6 once under the same load and passed 5 of 5 alone and in the final full run.

## Notes for the lead and the other lanes

- **Preloaded JSON on warm loads (B1)**: Chromium does not reuse a `<link rel=preload as=fetch>` response that a
  service worker served ("A preload for … is found, but is not used because it is a cross-world service worker
  resource mismatch", reproduced with a minimal page and a pass-through worker). On every warm load
  `curriculum.json` and `manifest.json` are therefore read twice from the worker's cache (2 extra SW-served requests,
  a console warning, no network). Cold loads have 0 duplicates. The harness's warm rows show it as +2 requests.
  Nothing in this lane can avoid it without an inline script (CSP); it costs a cache read, not a download.
- **Contract C-1**: the router calls `content.scenarioIndex?.()`, `content.writingIndex?.()`, `content.scenario?.(id)`,
  `content.writingTask?.(id)`, `content.center?.(kind)` and `content.pool?.(level)` when present. If the content lane's
  Today no longer reads `assignments`, nothing changes here (`writingIndex` replaces both writing files in the prefetch).
- **Contract C-3**: app.js calls `util.warmIntl?.()` once in `requestIdleCallback` after the first route renders.
- **Contract C-6**: `js/core/route-deps.js` is generated by `node tools/build-route-deps.mjs` (C-12: re-run it after
  merging, before `build-manifest`). The deploy build must keep module paths.
- **Contract C-7**: index.html still has exactly one `<link rel="stylesheet" href="css/app.css">`, now at the start of
  the body. If D9 inlines it there, the frame stays harmless (it is hidden by the class, not by the stylesheet's arrival).
- **Generated file**: `content/manifest.json` was regenerated (`node tools/build-manifest.mjs`) because a module was
  added (`js/core/route-deps.js`). Re-run after merging (C-12).
- The first-session idle preload of the lesson modules adds about 9 requests (about 120 KB gz) after a cold Today; they
  are the modules the precache downloads anyway, and the first lesson then opens in about 0.1 s.

## How it was measured

Scripts under the session scratchpad (`perf-lanes/boot/`): `ab.sh` (alternating perf.mjs runs, one run each, ports
9510/9511), `cmp.mjs` and `mdtable.mjs` (medians), `samples.mjs` (curriculum.json start and duplicates from the
harness's per-resource sample), `dups.mjs` (duplicates on a cold and a warm load), `warm.mjs` (warm loads through
both trees' perf.mjs servers, alternating, 8 each), `b7probe.mjs` and `b7time.mjs` (B7), `desk.mjs` and
`cssblock.mjs` (the parser blocking on the body stylesheet).
