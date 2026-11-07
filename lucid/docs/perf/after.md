# Lucid performance after the four perf lanes

The after-measurement of the integrated tree, against [baseline.md](baseline.md) and the targets in
[plan.json](plan.json). Lane reports: [runtime](runtime.md), [content](content.md), [boot](boot.md),
[delivery](delivery.md). The headline run's harness output is [after.json](after.json).

## Summary

> **Skeptic round (2026-11-07).** After this measurement, a skeptic review found problems on the integrated tree; the
> fixes and their re-measurement are in [Skeptic round](#skeptic-round-2026-11-07) below. In short: a tab still
> running the production release (2026-11-03.1) no longer breaks when the deploy lands; the boot frame can no longer
> cover a page drawn by the old app.js; the worker checks what it serves and refuses to install without
> `release.json` over an older cache; the IPA font is precached again; and the first-visit precache now finishes at
> **8.1 s** (was 10.8 s; baseline 9.45 s; target 8.5 s: **met**), with 84 requests instead of 145. Rows re-measured
> then carry `"revision": "skeptic-round"` in after.json.
>
> **Second skeptic round (2026-11-07).** Three more reviews (upgrades and releases, the S-15 security sign-off, test
> integrity and numbers) found a header-forgery hole and an offline break in the worker, a loosened e2e error
> pattern, and stale numbers here. The fixes and a same-window re-measurement are in
> [Second skeptic round](#second-skeptic-round-2026-11-07). They cost nothing measurable; the release update now
> downloads 6 KB instead of 3 (128-bit hashes in release.json), which misses its "≤ 5 KB" allowance. Corrected
> below: script time is up about 55-60 ms against the base, not 35-40; checkpoint and reading make 35 and 34 cold
> requests; heavy TBT is met only in the headline windows. Rows re-measured then carry `"revision": "verify2"`.

- **Cold loads on the phone are 26-70 % faster.** These are the deployed (minified) tree's numbers.
  - Cold welcome: 2050 → 1511 ms, with first paint 2072 → 632 ms.
  - Cold Today: 3695 → 1701 ms.
  - Reading: 7172 → 2295 ms. Level check A1: 7320 → 2095 ms.
  - Every other route is now 1525-2124 ms.
  - Each of those routes now meets its plan target. The misses: welcome (1511 against 1450), the drill (2499 against
    2300), and the request-count limits for the level check and the drill.
- **Returning visits no longer wait on the network.**
  - Coming back after more than 10 minutes: Today 1269 → 417 ms.
  - After a push to main: 2099 → 491 ms.
  - On lie-fi: 16471 → 551 ms.
  - A saved lesson opens in 433-496 ms in every state (baseline: up to 24 s on lie-fi).
  - What remains is CPU time. In this window it sits above the plan's absolute 390-500 ms targets, but at or below
    the time the base app needs for a fresh warm load.
- **A release now downloads 3.4 KB, not 884 KB, and keeps every saved lesson** (4 of 4; baseline 0). Since the
  second skeptic round it is 6 KB (`release.json` carries 128-bit hashes). No page ran
  modules from two releases.
  - Upgrading from the worker live in production (RELEASE `2026-11-03.1`) loses none of a heavy learner's 7247
    records, keeps all 5 saved lessons, gives the same Today plan, and works offline.
- **The heavy-history learner's warm Today is 43 % faster than the base app in the same window** (666 vs 1178 ms).
- **Desktop CLS is 0 everywhere** (baseline 0.19-0.50).
- **Minify gate (D7): passed.** Built vs source, alternating 3+3: cold welcome −303 ms, cold Today −265 ms (both need
  ≥ 200). Production keeps the build step that pages.yml already runs.
- **Inline-CSS gate (D9): failed.** Built with `--inline-css` vs built without it: welcome −14 ms, Today −14 ms
  (both need ≥ 120), and first paint is 16-40 ms later. pages.yml stays without the flag.
- **Not met:**
  - ~~the precache now finishes later (10.8 s against 9.45 s on welcome; target 8.5 s; a regression)~~: fixed in
    the skeptic round (8.1 s, 84 requests);
  - first-session Today → reading takes 730-891 ms (target 300);
  - cold Today is 261 KB gz (target 180);
  - some CPU-bound transition and interaction targets miss in the slower measurement window. The same-window base
    and the earlier window show these are not regressions. Details below.

## Method

- **Tree.** The integrated head is `6eedfa3` on `claude/lucid-english-platform`. Its app files are byte-identical to
  `ae2546d` and `e4f5910`: the commits since then touch only `tools/perf.mjs`.
  - Built tree: exactly what pages.yml does. `git archive HEAD lucid` was extracted into the scratchpad and committed
    in a scratch git repository (verify.mjs reads the source from git HEAD; that commit is `36f08c9`, the "commit"
    in after.json). Then `npm ci --prefix tools/build --no-audit --no-fund && node tools/build/build.mjs && node
    tools/build/verify.mjs`.
  - Result: `verify: ok (62 modules, maps, hashes, paths, CSP)`, release `6e01c455e024`. The source tree's release is
    `747e8249f190`.
  - The CSP meta has the same sha-256 in b2b669b, in HEAD's source and in the built tree.
- **Harness.** `node tools/perf.mjs`, 3 runs, median, `--compare docs/perf/baseline.json`.
  - mobile: 1.6 Mbps, 150 ms RTT, server-shaped and shared by the page and the worker; CPU 4x; 390x844.
  - desktop: unshaped, 1440x900.
  - Chromium 153.0.8010.12, h2.
- **Machine.** 4 CPUs, only this measurement running (no other agent, no parallel servers or browsers), every
  harness run sequential.
  - The container was replaced at about 00:40 UTC, so there are two measurement windows:
    - **Window 1** (2026-11-06 22:26 → 11-07 00:32 UTC): the full built and source runs, heavy learner, the base
      app (`git archive b2b669b`), one route per session for scenario d, and a first pair of gates.
    - **Window 2** (01:03 → 02:02): the **headline run** (built tree, every scenario a-g and u, both profiles →
      after.json), scenario u on the source, the gates again, and same-window base comparisons (heavy learner,
      interactions, desktop, scenario b and g, `games/A1/1`).
  - Network-bound rows reproduce across the windows within about 3 %: cold welcome 1458 / 1511, cold Today 1665 /
    1701, cold reading 2264 / 2295.
  - CPU-bound rows do not. In window 2 the machine was 25-35 % slower than in window 1. On the same base app (light
    learner), warm fresh Today took 360 ms in window 1, 482 in window 2, and 378-428 in the baseline. Heavy warm Today
    took 869 ms in window 1, 1178 in window 2, and 1066 in the baseline.
  - So the CPU-bound rows below give the headline value, the window-1 value, and the base app in the same window. A
    row is "met" only when the headline value meets it; the notes say where window 1 meets it.
- **Scenario u** in window 1 measured a failed install: the harness changed only sw.js, so the new worker refused
  `release.json` (by design, D5). `e4f5910` fixed the harness, so window 1's u is discarded.
  - In window 2 the new worker was already waiting when the learner left Today, so the change of screen reloaded the
    page into the new release (contract C-4). The harness lost its page context at that reload.
  - `6eedfa3` makes the harness time that click to the lesson in the reloaded page.
- **One route per session.** Scenario d runs every route in one page, so a route can find what an earlier route
  loaded, or meet the precache still running. That is the shared-page ordering artefact in the runtime and boot
  lane notes. Each d route was therefore also measured alone in a session (`--scenarios d --routes <route>`, mobile,
  3 runs), on the built tree and on the base app, in window 1.
- **Raw JSON** is in the scratchpad, `perf-integ/runs/`.
  - Headline: `q2-built-full.json`, copied to `after.json`.
  - Window 1: `built-full`, `src-full`, `built-heavy`, `src-heavy`, `base-heavy`, `base-gu`, `base-ab`,
    `built-d1-<n>`, `base-d1-<n>`, `gates/`.
  - Window 2: `q2-src-u`, `q2-gates/`, `q3-*-heavy`, `q3-*-e`, `q4-*-desk`, `q4-*-game`, `q5-*-bg`.

## Gates

### D7: deploy-time minify (pages.yml), kept

Mobile, alternating source then built, 3 rounds of one run each (`--scenarios a,b --runs 1`), median.

| | source | built | change | gate |
|---|---:|---:|---:|---|
| cold #/welcome view (window 2) | 1805 (1800, 1805, 1818) | 1502 (1536, 1496, 1502) | **−303** | ≥ 200 faster: met |
| cold #/today view (window 2) | 1957 (1970, 1957, 1951) | 1691 (1691, 1681, 1699) | **−265** | ≥ 200 faster: met |
| cold #/welcome view (window 1, rotated with D9) | 1755 | 1458 | −297 | met |
| cold #/today view (window 1) | 1922 | 1645 | −278 | met |
| cold Today gz KB | 359 | 261 | −98 | |
| precache on welcome, KB / finished | 714 / 11493 ms | 632 / 10802 ms | −82 KB / −691 ms | |
| warm Today (worker active) | 438 | 422 | −16 | |

The other D7 criteria were also checked:

- JS is 327 KB gz (target ≤ 330; source 448). CSS is 22.0 KB gz (≤ 23; source 37.2).
- `E2E_ROOT=<built> tests/e2e/run.mjs`: 57/57, the same as the source.
- Build time 0.5 s.

**Verdict: keep the minify step** (it is already in pages.yml; no change needed).

### D9: inline the CSS (`build.mjs --inline-css`), stays off

Mobile, alternating built then built with `--inline-css` (window 2), 3 rounds of one run each.

| | built | inline | change | gate |
|---|---:|---:|---:|---|
| cold #/welcome view | 1513 (1513, 1480, 1517) | 1499 (1495, 1499, 1500) | −14 | ≥ 120 faster: **not met** |
| cold #/today view | 1701 (1701, 1700, 1703) | 1687 (1723, 1687, 1677) | −14 | ≥ 120 faster: **not met** |
| cold welcome / Today FCP | 636 / 640 | 676 / 656 | +40 / +16 | |
| warm Today (worker active) | 402 | 406 | +4 | regress ≤ 20: met |
| cold Today gz KB | 261 | 283 | +22 | |

Window 1 agrees: welcome +6 ms, Today −3 ms, FCP +32 and +28 ms.

The inline tree also passes verify.mjs, and its CSP is unchanged. With B5's async module script and the preloaded
stylesheet, the CSS is no longer on the critical path, so inlining only adds 22 KB gz to index.html and delays the first paint.

**Verdict: do not pass `--inline-css` in pages.yml.**

## Targets

"Headline" is the built tree in window 2 (after.json). "W1" is the built tree in window 1. "Base, same window" is
`git archive b2b669b` measured right before or after the built tree. All values are mobile medians in ms unless
marked otherwise.

### 1. Cold first visit #/welcome (scenario a)

| measure | baseline | headline | W1 | target | verdict |
|---|---:|---:|---:|---|---|
| view | 2050 | 1511 | 1458 | ≤ 1450 | **not met** (61 over; 8 over in W1) |
| FCP | 2072 | 632 | 612 | ≤ 700 | met |
| CLS | 0 | 0 | 0 | 0 | met |
| TBT | 0 | 9 | 0 | ≤ 50 | met |

### 2. Cold #/today, onboarded A1 learner (scenario b)

| measure | baseline | headline | W1 | target | verdict |
|---|---:|---:|---:|---|---|
| view | 3695 | 1701 | 1665 | ≤ 1950 | met |
| FCP | 1868 | 616 | 612 | ≤ 700 | met |
| KB gz on the wire | 426 | 261 | 261 | ≤ 180 | **not met** |
| TBT | 26 | 50 | 5 | ≤ 60 | met |

Where the 261 KB go: about 170 KB is JS and CSS (38 requests: the boot graph, the preloaded route modules and the
next lesson). The content itself is small (the index files).

### 3. Other cold routes (scenario c)

| route | baseline | headline | W1 | target | verdict |
|---|---:|---:|---:|---|---|
| lesson/a1-01 | 3159 | 2065 | 1980 | ≤ 2100 | met |
| real-life | 3527 | 1748 | 1697 | ≤ 1850 | met |
| scenario | 3563 | 1815 | 1781 | ≤ 1900 | met |
| writing | 2766 | 1525 | 1494 | ≤ 2050 | met |
| writing/final-B2 | 3739 | 2108 | 2032 | ≤ 2600 | met |
| games | 2885 | 1744 | 1705 | ≤ 1850 | met |
| expressions | 3495 | 2124 | 2092 | ≤ 2200 | met |
| reading | 7172, 106 reqs | 2295, 33 reqs (34 since compat.js: 2307 in verify2) | 2264, 33 | ≤ 2400, ≤ 35 reqs | met |
| progress | 2610 | 1636 | 1583 | ≤ 1750 | met |
| checkpoint/A1 | 7320, 107 reqs, 1065 KB | 2095, 34 reqs, 260 KB (35 since compat.js: 2090, 262 KB in verify2) | 2052, 34, 260 | ≤ 2300, ≤ 30 reqs, ≤ 300 KB | time and KB met; **requests not met** (35) |
| drill?topic=present-simple | 7381 (base, runtime lane), 107 reqs | 2499, 36 reqs | 2468, 36 | ≤ 2300, ≤ 30 reqs | **not met** (time and requests) |

The drill loads the A1 and A2 pool files (343 KB gz, against 260 for the level check), because a drill draws up to
one level above the learner.

### 4. Warm repeat visit with the worker active, by HTTP-cache state (scenario g)

| state | baseline Today / lesson | headline Today / lesson | W1 Today / lesson | base, window 2: Today / lesson | target | verdict |
|---|---:|---:|---:|---:|---|---|
| fresh | 378-428 / 346 | 452 / 459 | 306 / 309 | 482 / 416 | Today ≤ 390, lesson ≤ 400 | **not met** in the headline; met in W1 |
| stale (> 10 min) | 1269-1284 / 1234-1243 | 417 / 433 | 308 / 315 | 1332 / 1305 | ≤ 450 / ≤ 400 | Today met; lesson **not met** in the headline (met in W1) |
| after a push (new ETags) | 2099-2111 / 1726-1810 | 491 / 496 | 343 / 300 | 2145 / 1806 | ≤ 450 / ≤ 400 | **not met** in the headline; met in W1 |
| offline | 398 / – | 483 / 454 | 296 / 304 | 476 / 415 | ≤ 420 / ≤ 400 | **not met** in the headline; met in W1 |
| lie-fi (15 s holds) | 16471 / 24412 | 551 / 437 | 369 / 294 | 16488 / 24481 | ≤ 500 / ≤ 400 | **not met** in the headline; met in W1 |

A third sample of the built tree (window 2, `q5-built-bg`, run right after the same-window base) gave:

- Today: 402 fresh, 393 stale, 383 after a push, 366 offline, 402 lie-fi.
- Lesson: 408, 355, 353, 378, 426.

The network penalty is gone in every state. A stale load makes 2-3 conditional requests (the browser's sw.js check
and stale-while-revalidate for the lesson), and after a push the browser downloads 11 KB (sw.js) instead of 428. What
is left is CPU time: in every state it is at or below the base app's own fresh warm load in the same window. The
absolute targets are met in window 1 and missed in the slower window 2.

### 5. Returning learner after a new release (scenario u: only sw.js changes, new ETags everywhere)

| measure | baseline | headline | target | verdict |
|---|---:|---:|---|---|
| next #/today after the release | 1115 (base W1: 1117) | 492 (runs 494, 492, 402; source 420) | ≤ 420 | **not met** in the headline (the same-window base fresh warm Today is 482) |
| returning #/today right after the deploy | 2355 (base W1) | 422 | | |
| what the update downloads | 84 reqs, 884 KB | 1 precache request, 3.4 KB (`release.json`), plus the changed sw.js itself (4.0 KB gz, fetched by the browser's update check); 23 KB in all, page loads included (base: 1433 KB). Second skeptic round: `release.json` is 6 KB (128-bit hashes), 28 KB in all | changed files + ≤ 5 KB | met in the headline; **not met** since the second skeptic round (6 KB) |
| saved lessons kept | 0 of 4 | 4 of 4 (100 %) | 100 % | met |
| new worker installed after (from navigation start) | 11.0 s (base W1) | 1.3 s | | |
| pages that ran modules from two releases | 0 | 0 | 0 | met |

Today → lesson while the new worker installs takes 1311 ms in the headline (base W1: 2524). On the phone the new
worker is already waiting when the learner leaves Today, so B6 (contract C-4) reloads into the new release at that
change of screen. Without a reload, the transition takes 83 ms. On desktop the worker is not yet waiting at the
click: the transition takes 26 ms and the new release takes over at the next change of screen.

### 6. First-session transitions from Today while the worker installs (scenario d)

"Alone" means one route per session (W1, built vs base in the same window). "Shared" means the headline's one-page
sequence.

| route | baseline | alone: built / base | shared: headline / W1 | target | verdict |
|---|---:|---:|---:|---|---|
| lesson/a1-01 | 1911 | 84 / 1909 | 135 / 80 | ≤ 800 | met |
| reading | 4157 | 730 / 6262 | 891 / 875 | ≤ 300 | **not met** |
| checkpoint/A1 | 6286 | 478 / 6254 | 451 / 445 | ≤ 700 | met |
| writing | 297 | 235 / 286 | 260 / 236 | ≤ 350 | met |
| games | 409 | 388 / 985 | 93 / 73 | ≤ 550 | met |
| real-life | 453 | 252 / 1122 | 258 / 252 | ≤ 300 | met |

Other routes, alone, built / base:

- scenario 315 / 1190;
- final-B2 448 / 2038;
- expressions 539 / 1888;
- progress 236 / 284;
- drill 982 / 6295.

The baseline figures of 95 ms (final-B2) and 112 ms (expressions) were measured after Reading had loaded everything,
and they are not comparable. Reading has to fetch its 90 KB gz centre file while the 632 KB precache shares the link.

### 7. Returning transitions (scenario d)

| route | baseline | headline | W1 shared | alone, W1: built / base | target |
|---|---:|---:|---:|---:|---|
| lesson | 120 | 110 | 77 | 73 / 104 | ≤ 120 |
| real-life | 82 | 98 | 87 | 100 / 100 | ≤ 120 |
| scenario | 74 | **131** | 73 | 94 / 105 | ≤ 120 |
| writing | 101 | 81 (0 long tasks) | 69 | 71 / 100 | ≤ 120, 0 long tasks |
| final-B2 | 92 | 95 | 78 | **121** / 182 | ≤ 120 |
| games | 94 | 93 | 74 | 85 / 122 | ≤ 120 |
| expressions | 117 | **123** | 89 | 118 / 181 | ≤ 120 |
| reading | 382 | **112** | 96 | **118** / 412 | ≤ 100 |
| progress | 66 | 67 (0 long tasks) | 55 | 65 / 102 | ≤ 120, 0 long tasks |
| checkpoint/A1 | 391 (review) | 66 | 49 | 73 / 395 | ≤ 150 |
| drill | – | 67 | 52 | 98 / 373 | ≤ 120 |

**Verdict: not met.**

- The headline misses on scenario (+11), expressions (+3) and reading (+12).
- Window 1's shared run meets every row, but the alone runs miss final-B2 and reading.
- Progress and writing have 0 long tasks: met.
- No route is slower than the base app in the same window.

### 8. First-visit service-worker precache (scenario f)

| measure | baseline | headline | target | verdict |
|---|---:|---:|---|---|
| KB on the wire (welcome) | 884 | 632; skeptic round 592 | ≤ 700 | met |
| requests | 84 | 145; skeptic round 84 | ≤ 160 | met |
| finished, after the welcome navigation | 9452 ms (base W1: 9400) | 10843 ms (W1 10769; source 11329-11493); **skeptic round 8136** (previous head, same window: 10797) | ≤ 8500 | **met** in the skeptic round (was a regression, +1.4 s) |
| finished, first visit on #/today | 11055 | 10690; skeptic round 8041 (same window: 10726) | | −27 % |

The first view never waits for the precache: SW-blocked welcome and Today give the same view times. In the headline
the app was ready offline about 1.4 s later than before on a first welcome visit: 61 more requests, the per-item
scenario and task files that contract C-2 adds to the offline list (the time was not in the bytes). The skeptic round
writes those 66 files from their three source files (one request each) in the worker, each checked against its hash;
see below.

### 9. Heavy-history learner (180 days, about 5.3k attempts, 700 cards), warm, CPU 4x

| measure | baseline | headline (q3) | base, window 2 | W1 | base, W1 | target | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| warm Today view | 1066 | 666 | 1178 | 604 | 869 | ≤ 750 | met |
| warm Today TBT | 377 | 158 | 273 | 110 | 167 | ≤ 160 | met in the headline and W1; **not met** in the later windows (185-189; base 286-343) |
| warm Today longest task | 247 | 118 | 265 | 103 | 184 | ≤ 120 | met in the headline and W1; borderline later (117-126; base 260-274) |
| review → Today | 319-360 | 57-62 | 195-201 | 45-47 | 142-188 | ≤ 160 | met |
| Today → progress (returning) | 194-224 | 169 | 161 | 109 | 131 | ≤ 130 | **not met** in the headline (met in W1) |
| Today → reading TBT | 94 | 0 | 59 | 0 | 39 | ≤ 10 | met |
| Today → vocab (returning) | 169 | 184, longest 98 | 181, longest 109 | 118, longest 63 | 137, longest 79 | ≤ 100, longest ≤ 60 | **not met** |

Vocab: the first `Intl.Collator` and `RelativeTimeFormat` are built on the first vocab open (see the runtime lane
notes). It is no faster than the base app in either window.

### 10. Interactions (scenario e)

| measure | baseline | headline | window 2: built / base | W1 | target | verdict |
|---|---:|---:|---:|---:|---|---|
| lesson Check → verdict, INP | 40, 40 | 52, 48 | 52 / 47, 56 / 48 | 41, 40 | ≤ 45, INP ≤ 48 | **not met** in the headline (met in W1) |
| last match pair → verdict | 71 | 93 | 101 / 97 | 73 | ≤ 75 | **not met** in the headline (met in W1) |
| word-quiz round start (Today → games/A1/1), longest task | 85-98 | first session 53, returning 51 (base 143 / 111) | | | no task > 50 | **not met** (1-3 ms over) |

In the headline windows built and base were within 1-6 ms of each other. The first skeptic-round window did not
reproduce that for the match pair: built 95-129 (median about 103) against base 79-103 (about 86), +17 ms. Measured
again alternated in the second round (base, built, base, built; 6 runs each), it is built 81, 82, 86, 89, 121, 132
(median 87.5) against base 82, 85, 90, 92, 92, 105 (median 91): no regression in the median, but 2 of the 6 built
runs are above 120 ms, so the built tree has the wider spread. Check → verdict was 61 / 59 built against 49 / 63
base. These rows move with the machine more than with the change; the ≤ 75 target is not met by either tree.

### 11. Essay typing, 300 words

| measure | baseline | headline | window 2: built / base | W1 (built / source) | target | verdict |
|---|---:|---:|---:|---:|---|---|
| per-key median | 8 | 11 | 11.5 / 11.8 | 7.6 / 7.6 | ≤ 10 | **not met** in the headline (met in W1) |
| p95 | 20 | 22 | 22.2 / 22.3 | 18.2 / 18.4 | ≤ 22 | met |
| INP | 24 | 32 | 32 / 40 | 32 / 32 | ≤ 30 | **not met** (32 in both windows; base 40 in window 2) |
| slow events | 0 | 0 | 0 / 0 | 0 | 0 | met |

### 12. Desktop

| measure | baseline | headline | target | verdict |
|---|---:|---:|---|---|
| CLS, every cold and warm load (a, b, c, f, g, u) | 0.186-0.500 | 0.000 on every row | ≤ 0.01 | met |
| view times | 66-274 | 88-138 | within +15 ms of baseline | met against the same-window base; not against the baseline document |

Against the base app in the same window (q4), built is at most +5 ms on every row (cold expressions 137 vs 132; cold
welcome 89 vs 93; cold Today 111 vs 132; warm rows 93-124 vs 152-327). Against the baseline document's absolute values
the headline is +22 ms on cold welcome and +25 ms on cold Today. That difference is the machine: the same base app
measured 93 and 132 in window 2.

### 13. Release freshness

| measure | target | measured | verdict |
|---|---|---|---|
| a returning learner runs the new release no later than the first path change after the new worker installs | yes | scenario u: the first change of screen reloads into the new release (phone); `tests/e2e/perf-boot.mjs` 12/12, including two tabs, no reload mid-lesson or mid-essay, the draft and resume point kept | met |
| page loads that mix modules from two releases | 0 | 0 in scenario u (both documents), 0 in perf-boot with two tabs | met |

### 14. Guardrails (on the integrated head)

| check | result |
|---|---|
| `npm test` | 367/367 (skeptic round: 378/378, 0 skipped) |
| `node tools/validate-content.mjs` | 0 errors (1 warning, as before) |
| `node tools/build-content-index.mjs --check` | current |
| `tests/e2e/run.mjs` on the built tree (`E2E_ROOT`) | 57/57 (includes OF2, the offline sweep) |
| `tests/e2e/a11y.mjs` | 0 violations (29 routes + welcome and onboarding x 5 configurations) |
| `tests/e2e/perf-boot.mjs` | 12/12 |
| upgrade from the production worker (`2026-11-03.1`, b2b669b) to the built tree and to the source, heavy learner, 5 saved lessons | 7247 of 7247 records unchanged, 5 of 5 lessons carried into the new cache, Today's plan identical, offline Today, lessons, progress and vocab open (a harness run; it checked the data, not the page code: see the skeptic round, where `tests/e2e/upgrade.mjs` now covers it) |
| CSP meta byte-identical to b2b669b | yes (same sha-256 in source and built); so no new connect-src origin |
| the other lane e2e suites, the full e2e on the source, and a separate console-error sweep | not re-run in this step (the integration step ran them); not measured here |

## Regressions (worse than the baseline beyond noise)

- ~~**Precache finish on a first welcome visit: 9.45 → 10.84 s (+1.4 s; base W1 9.40 s).**~~ Fixed in the skeptic
  round: 8.14 s, 84 requests, 592 KB.
- **Page-load script time (Chrome ScriptDuration until the page settles) is up about 55-60 ms at 4x** (corrected
  in the second skeptic round; this section first said 35-40).
  - W1: base 26 / 27 / 18 ms (welcome, Today, warm Today) against built 64 / 71 / 62, source 63 / 62 / 60.
  - Same window, second skeptic round: base 31 / 38 / 31 against built 92 / 94 / 83 (+61 / +56 / +52; warm Today
    about 2.7x the base). The first skeptic round's window gave 86-98 / 93-95 / 86-94 against 31-34 / 35-39 /
    23-24, about 3.6x on warm Today.
  - The first skeptic round's fixes (compat.js among them) added about 8 ms (16c6dbf built 90 / 85 / 85 against
    98 / 93 / 94 in one window). The second round's added nothing measurable (fe6b9af built 88 / 103 / 87 against
    92 / 94 / 83).
  - The cause is the app, not the minify step. Candidates: priming the first route at boot, the idle preload of the
    lesson route's modules after Today, and the Intl warm-up.
  - Views are much faster than the base all the same, so it is not visible as a delay.
- **Cold Today makes 38 requests instead of 29** (preloads, route modules, the next lesson), for fewer bytes
  (261 vs 426 KB gz). Not a time regression on this link profile.
- **Not regressions, though the comparison against the baseline document reads so:**
  - Warm loads, interactions and desktop views. The base app measured the same or slower in the same window.
  - First-session Today → final-B2 (95 → 328) and Today → expressions (112 → 615). This is the shared-page ordering
    artefact; alone, they go 2038 → 448 and 1888 → 539.

## What remains

1. ~~**Precache count.**~~ Done in the skeptic round: the per-item files are written from their source files in the
   worker (8.1 s, 84 requests).
2. **First-session reading (730-891 ms, target 300).** Its 90 KB centre file competes with the precache. C9
   (list-only reading file) was deferred by the content lane; worth re-gating now that cold reading is 2.3 s.
3. **Cold Today bytes (261 KB, target 180).** Most of it is code. The route-module preloads that B2 adds for the
   lesson could wait until after the view on a cold load.
4. **Drill and level-check request counts (36 and 34 against 30), and drill time (2499 against 2300).** The drill
   loads two pool files.
5. **Vocab open for a heavy learner (184 ms, longest task 98).** The first `Intl.Collator` and `RelativeTimeFormat`
   construction still lands on the first open. Warm them earlier, or build them off the vocab path.
6. **The release reload costs about 1.3 s on the phone** at the first change of screen after a release has
   installed. This is by design (no mixed releases). The next Today is a normal warm load.
7. **CPU-bound absolute targets** (warm 390-500 ms, transitions ≤ 100-120 ms, interactions ≤ 45-75 ms): met in window
   1 and missed in the slower window 2. They should be confirmed on a quiet machine of the baseline's speed; in both
   windows the integrated tree is at or below the base app.
8. **D8** (lucid-verify.yml) still needs its first run on GitHub (the delivery lane could not push; nor does this
   step).

## Skeptic round (2026-11-07)

A skeptic review of the integrated head (`16c6dbf`) reported 15 problems. Each was reproduced first; this section
says what changed and re-measures what the changes could move.

### What changed

- **A tab open on the production release when the deploy lands** (2026-11-03.1, b2b669b). Its worker serves code
  network-first and its page has no release handoff, so such a tab keeps its core modules and imports this
  release's screens. That happens from the network as soon as the HTTP cache expires (reproduced without any new
  worker: 11 of 31 screens failed), and from the new release cache once the new worker has taken over.
  - Fix: `js/core/compat.js`. The screens take the functions added since (C-1, C-3: `withItemCount`, `CENTERS`,
    `collatorEn`, `relTime`, `groupDigits`) from it, and it adds the C-1 methods to an old `content` object, built
    on the same files. On a page that started on this release, it hands over the core modules' own functions,
    unchanged.
  - Tests: `tests/unit/compat.test.mjs` checks both cases, and checks that no module an old page can load imports a
    name the old modules lack (the fixture lists release 2026-11-03.1's exports).
  - `tests/e2e/upgrade.mjs` (U1-U4) walks all 31 screens in a tab on the old release in three cases: the old worker
    fetches the new screens; a second tab installs the new worker; a reload within ten minutes. It then checks the
    records, the essay draft and the saved lessons offline. It passes on the source and on the built tree, and
    lucid-verify.yml now runs it.
- **The boot frame after a reload within ten minutes** (new index.html, old app.js and app.css from the HTTP cache).
  The inline style now hides the frame once `#view` holds anything but its first spinner (`:has()`), and in any case
  after 20 s. Checked by U3 and by `boot-preload.test.mjs`.
- **The worker** (`sw.js`; see docs/qa/security-review.md 5a):
  - every entry it serves from the release cache is checked against `release.json` once per worker lifetime, and an
    entry that does not match is never served;
  - `release.json` must match `LISTING`, a SHA-256 of its hash list that only sw.js carries;
  - a file missed at install is kept only once it matches its hash;
  - when `release.json` cannot be loaded and an older Lucid cache exists, the install fails instead of going ahead
    unchecked (no saved lesson is dropped);
  - the IPA font `fonts/rubik-latin-ext.woff2` is in the shell again, as it was in b2b669b (19 KB);
  - the 66 per-item scenario and task files are written from their three source files, each checked against its hash,
    with one request per source file instead of one per item. An update that changes a few items still fetches only
    those.
  - `tools/build-manifest.mjs` writes `LISTING` and hashes the three source files.
- **Router.** A hidden tab on a hub no longer reloads while any text field holds a value (email and password
  included). The drill's prefetch levels are a named function, compared with `pool.drillLevels` for every level and
  for none.
- **Tests and CI.**
  - OF1, OF2 and the layout sweep now match error stems, look for "not found" inside `.empty` blocks, and require
    each screen's own content. OF2 now fails when the content precache is removed (checked). (Corrected in the
    second skeptic round: the stem written here, `לא נטענ`, ends in a regular nun and missed the router's own
    "המסך לא נטען"; it is now `לא נטע[ןנ]`, shared in `tests/e2e/screen-errors.mjs`.)
  - PERF-C5's second variant is called "task files unreachable", and a real offline variant runs through the worker.
  - PL4 waits for `document.fonts.ready` before it looks up the folds. Cause of the flake (reproduced by holding the
    IPA font for 1.5 s): lesson.js measures and draws the learn step again once its fonts arrive (pre-existing, in
    b2b669b too).
  - lucid-verify.yml installs esbuild before `npm test`, and the build tests fail rather than skip in CI.
- **Not changed, with evidence.**
  - The curriculum and manifest preloads. The duplicate is real: on a page the worker controls, Chromium does not
    hand the preload to `fetch()`, which is 2 more requests and 66 KB read twice from the cache. Measured
    alternating on the source tree, mobile, 2 x 3 runs:
    - warm Today: 407 / 407 ms with the preloads, 400 / 386 without;
    - cold Today: 1999 / 1959 with, 2133 / 2129 without.
    The preloads save about 150 ms on a first visit and cost about 10 ms on a return, so they stay. The index.html
    comment now says so.
  - The S-15 sign-off. It still needs the lead (security-review.md 5a). The integration cannot give it.

### Re-measured (built tree, mobile, 3 runs, same window)

The built tree of this round (release `709b1a90e06c`) against the built previous head (`16c6dbf`, release
`6e01c455e024`, the headline's tree). The runs alternated, with no other work on the machine. Medians.

| row | this round | previous head | note |
|---|---:|---:|---|
| cold #/welcome view | 1508 | 1506 | |
| cold #/today view | 1709 | 1715 | 39 vs 38 requests (compat.js) |
| precache on welcome: requests / KB / finished | 84 / 592 / **8136** | 145 / 632 / 10797 | target ≤ 8500: **met** (baseline 9452) |
| precache on Today: finished | 8041 | 10726 | |
| worker controls the page (welcome) | 8232 | 10811 | |
| warm #/today, fresh: sample 1 / sample 2 | 459 / 398 | 437 / 439 | |
| warm #/today, stale | 405 / 391 | 443 / 431 | |
| warm #/today, after a push | 437 / 418 | 437 / 427 | |
| warm #/today, offline | 428 / 431 | 410 / 425 | |
| warm #/today, lie-fi | 512 / 414 | 434 / 392 | |
| warm lesson a1-01 (g fresh / stale / push / offline / lie-fi, sample 2) | 409 / 398 / 398 / 401 / 378 | 397 / 377 / 390 / 405 / 365 | |
| warm (c) lesson / real-life / scenario / writing / expressions, sample 1 | 444 / 487 / 509 / 445 / 568 | 498 / 499 / 454 / 388 / 483 | |
| the same, sample 2 | 392 / 441 / 433 / 403 / 471 | 424 / 406 / 432 / 407 / 496 | |
| cold (c) lesson / real-life / scenario / writing / expressions | 2068 / 1777 / 1811 / 1580 / 2156 | 2062 / 1751 / 1794 / 1546 / 2139 | +1 request each (compat.js) |
| release update: downloads / installed after | 1 request, 3 KB / 1280 ms | 1 request, 3 KB / 1273 ms | saved lessons 4 of 4 on both |
| release update: next #/today | 447 | 461 | 0 mixed-release pages on both |
| returning Today -> scenario / expressions / real-life / writing / progress / lesson | 151 / 142 / 97 / 83 / 71 / 70 | 133 / 128 / 126 / 112 / 80 / 83 | |

The precache gain is the only change beyond noise. Warm loads, where the worker now hashes each entry once per
lifetime, move by -40 to +85 ms between the two samples in both directions: no cost shows above the noise. Cold
loads are 6-34 ms slower, inside the run-to-run spread; they make one more request, compat.js (1 KB). Raw JSON and
logs: scratchpad `integ2/measure/` (`cur-*` this round, `prev-*` the previous head).

### Suites on this round

All green on the source tree, and on the built tree where marked:

- `npm test` 378/378, 0 skipped;
- validate-content (0 errors, 1 warning as before) and build-content-index --check;
- run.mjs 57/57 (source and built) and a11y (0 violations);
- every lane suite: shell-components, lesson-flow, exercises, bilingual-text, lesson-content, first-run-today,
  practice-hubs, games, real-life-writing, r4-lesson-flow, r4-exercises, r4-today-path, r4-practice-games,
  r4-real-life-writing, r4-shell-bilingual, perf-boot 12/12, perf-runtime 9/9;
- upgrade.mjs 4/4 (source and built);
- build, then verify: ok (63 modules), against a clean source copy. Run in place, verify also lists the
  git-ignored `.impeccable/` folder, which a checkout does not have.

## Second skeptic round (2026-11-07)

Three reviews of `fe6b9af`: real-learner upgrades and releases (with injected edge faults), the S-15 security
sign-off (docs/qa/security-review.md 5a records its verdict and how each condition was met), and test integrity and
numbers. Each problem was reproduced first, with the reviewers' own scripts.

### What changed

- **Worker (`sw.js`).**
  - Only bodies are trusted: every response the release cache stores or serves is built by the worker, with
    status 200 and the content type of its extension as the only header. A genuine shell stored with a forged
    `Refresh` header by same-origin script sent every online load to the forged target and rode into the next
    release; it no longer does (reproduced before, clean after; sw.test and upgrade.mjs U5).
  - Every response from the release cache is hashed as it is served, built from the bytes just hashed. The
    once-per-lifetime check let a body rewritten after the check run on reloads until the worker stopped (reproduced
    before, clean after).
  - Requests for `release.json` go to the network, and an entry with no hash is never deleted. One top-level
    navigation to `release.json` (a link from any site) had deleted the cached copy, and offline Lucid then failed to
    start after a worker restart (reproduced before, fixed after; sw.test and U6).
  - No install without `release.json`, a first one included, and the install waits at most 20 s for it. A first visit
    whose `release.json` dropped had installed a worker that took control and then served nothing from its cache
    (offline the next open failed, and every request went to the network). Now nothing installs and the next visit
    tries again (U7). As with b2b669b when one of its 13 shell files dropped, such a first visit gives no offline
    until the next online one.
  - A miss that still does not match its hash past every cache is never handed to the page as a module, stylesheet
    or content file; the request fails, and the router shows its "did not load" screen. With an edge stale even for
    `?r=`, a page of the new release had run the previous release's today.js. Reproduced again after the fix:
    Today shows "המסך לא נטען" until the edge serves the release's bytes, and no old module runs. With the next
    release already on the server, the page moves to it at the next change of screen and the screen loads
    (perf-boot, last B6 check). A navigation still gets the page as the network gave it.
  - Per-file hashes are 128-bit (32 hex digits; `HASH_LEN` in sw.js and tools/build-manifest.mjs), up from 48-bit.
    `release.json`: 15.7 KB raw, 6.1 KB gz (was 11.0 and 3.5).
- **Tests.**
  - The e2e broken-screen pattern is shared (`tests/e2e/screen-errors.mjs`) and is `לא נטע[ןנ]`. The first round's
    `לא נטענ` missed the router's own "המסך לא נטען": perf-boot B3 passed with `lesson.js` importing a missing
    module (reproduced). It now fails there, and B3 also requires the lesson view's own "השיעור לא נמצא".
    `tests/unit/e2e-screen-errors.test.mjs` checks the pattern against the router's messages and every "לא נטע…"
    message in `js/`.
  - sw.test: the per-item hash check of `unpack()` (an item whose hash is not that of its cut is fetched by itself,
    the cut bytes never stored), stored headers, `release.json` requests, a first install without `release.json`
    (error, no connection, no answer), a miss of another release, and hashing on every response. Each fails with
    its fix reverted (mutation runs: serve stored headers, copy stored headers, handle `release.json`, delete
    unhashed entries, install without `release.json`, no timeout, pass a mismatch on, a per-lifetime memo, no item
    check, 12-digit hashes).
  - upgrade.mjs U5-U7 (in CI on the built site) fail on `fe6b9af` and pass now; perf-boot's new B6 check fails
    with the old miss handling. perf-boot's `waitingWorker` now polls in the page: Playwright's `waitForFunction`
    returned at once for its async predicate.
  - `tools/perf.mjs --worker-restart`: scenario g with the worker stopped before the returning load, so that load
    starts a new worker lifetime (by default g runs in the lifetime of the install, where the previous worker hashed
    nothing).
- **Not changed, with evidence.** The one extra reload a returning learner gets at the first change of screen after
  the deploy (about 150 ms, boot.md B6) stays. The page booted from the old network-first worker and the HTTP
  cache, which can still hold release 2026-11-03.1's files for up to ten minutes (the reason compat.js exists). It
  cannot tell whether its own modules are the new worker's release, and the reload is what guarantees that they are.
  It happens once per tab and loses nothing (U2-U4).

### Re-measured (mobile, 3 runs, medians, one quiet window)

Built tree of this round (release `61cdec2e3120`) against the built previous head (`fe6b9af`, release
`709b1a90e06c`) and `git archive b2b669b` (base), with this harness; runs in sequence, nothing else on the machine.
Raw JSON and logs: scratchpad `verify2/perf/`.

| row | this round | previous head | base | note |
|---|---:|---:|---:|---|
| cold #/welcome view / script ms | 1511 / 92 | 1494 / 88 | 2107 / 31 | |
| cold #/today view / script ms / reqs | 1696 / 94 / 39 | 1707 / 103 / 39 | 3764 / 38 / 29 | |
| warm #/today (b) view / script ms | 441 / 83 | 519 / 87 | 551 / 31 | |
| cold #/reading view / reqs | 2307 / 34 | | 7242 / 106 | target ≤ 2400, ≤ 35 reqs: met |
| cold #/checkpoint/A1 view / reqs / KB gz | 2090 / 35 / 262 | | 7381 / 107 / 1065 | requests not met (≤ 30) |
| precache on welcome: requests / KB / finished | 84 / 595 / 8136 | 84 / 592 / 8108 | | +3 KB: release.json |
| precache on Today: finished | 8101 | 8044 | | |
| release update: downloads / all requests / installed after | 1 req, 6 KB / 5 reqs, 28 KB / 1327 ms | (1 req, 3 KB / 1280 ms, first round) | | saved lessons 4 of 4; next #/today 467; 0 mixed-release pages |
| warm (g) #/today fresh / stale / push / offline / lie-fi, sample 1 | 479 / 447 / 458 / 475 / 459 | 451 / 411 / 425 / 406 / 442 | 551 / 1416 / 2200 / 515 / 16583 | in the install's worker lifetime |
| the same, sample 2 | 511 / 522 / 490 / 577 / 533 | 528 / 514 / 524 / 581 / 523 | | |
| warm (g) lesson a1-01, sample 1 / sample 2 | 533 / 438 / 434 / 409 / 440; 482 / 513 / 500 / 488 / 507 | 410 / 425 / 404 / 396 / 391; 517 / 438 / 520 / 592 / 532 | 439 / 1350 / 1882 / 458 / 24546 | |
| warm (g) #/today after a worker restart, two samples | 458 / 491 / 468 / 480 / 477; 519 / 491 / 483 / 475 / 468 | 499 / 486 / 453 / 512 / 499; 468 / 500 / 511 / 516 / 488 | | `--worker-restart` |
| warm (g) lesson after a worker restart, two samples | 460 / 453 / 437 / 467 / 463; 429 / 467 / 399 / 467 / 443 | 447 / 481 / 434 / 409 / 412; 463 / 443 / 484 / 444 / 453 | | |
| returning Today -> lesson / real-life / scenario / writing / expressions / progress | 114 / 102 / 103 / 83 / 141 / 73 | 109 / 102 / 96 / 93 / 189 / 79 | | |
| heavy learner, warm #/today view / TBT / longest | 751 / 185 / 125 | 767 / 189 / 126 | 1209 / 286 / 274 | TBT target ≤ 160 not met in this window |
| last match pair -> verdict, 6 runs (2 alternated pairs) | median 87.5 (81-132) | | median 91 (82-105) | |
| lesson Check -> verdict, two samples | 61 / 59 | | 49 / 63 | |
| essay per-key median / p95 / msPerKey, two samples | 12.5, 13.4 / 22.5, 23.2 / 9.1, 9.8 | | 13.1, 13.0 / 22.9, 22.9 / 9.4, 9.4 | |

Hashing every response costs nothing that shows above the noise. In the install's lifetime, where the previous head
hashed nothing, sample 1 reads +13 to +123 ms and sample 2 -104 to +75 ms, in both directions. After a worker restart,
where both hash every response, the two trees are within the run-to-run spread. The page's script time does not
move. The worker is not CPU-throttled in this harness (the 4x rate applies to the page), so on a slow phone its
hashing takes longer than here. It runs off the page's main thread, on about 0.8 MB per full load of Today.

### Suites on this round

All green on the source tree, and on the built tree where marked:

- `npm test` 383/383 with `CI=true` and esbuild (0 skipped); validate-content (0 errors, 1 warning as before);
  build-content-index --check;
- run.mjs 57/57 (source and built) and a11y (0 violations);
- every lane suite: shell-components, lesson-flow, exercises, bilingual-text, lesson-content, first-run-today,
  practice-hubs (14/14 on a re-run; the first run timed out once on PERF-C10, a suite that blocks the worker, while
  the reviewers' browser scripts ran beside it), games, real-life-writing, r4-lesson-flow, r4-exercises,
  r4-today-path, r4-practice-games, r4-real-life-writing, r4-shell-bilingual, perf-boot 13/13, perf-runtime 9/9;
- upgrade.mjs 7/7 (source and built);
- build, then verify: ok (63 modules), against the source.
