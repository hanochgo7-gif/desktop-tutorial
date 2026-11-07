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
>
> **Third skeptic round (2026-11-07).** The S-15 sign-off review of `40b402b` approved the integrity part and found
> two ways a fix could fail to reach a learner where b2b669b's did: a release whose page cannot start was never
> replaced by reloading, and with the origin's storage nearly full no update ever installed. Both are fixed in the
> worker (a load of the app hands over to a waiting release; a full origin never fails an install), and the
> worker's comment and security-review 5a now say which paths are hashed as served. See
> [Third skeptic round](#third-skeptic-round-2026-11-07). Nothing measured moved beyond the noise; rows re-measured
> then carry `"revision": "verify3"`.
>
> **Fourth skeptic round (2026-11-07).** Two reviews of `fde78c2` found that on a full origin an update could install
> without its shell or `release.json`, take over and delete the complete old cache (offline lost, from b2b669b too),
> that activation could delete the cache of a newer release still installing, and four minor hand-over problems.
> All are fixed; see [Fourth skeptic round](#fourth-skeptic-round-2026-11-07). The one load that hands over is still
> about 1 s slower than a plain reload and than b2b669b's reload after a deploy (that second is the browser's
> activation). Rows re-measured then carry `"revision": "verify4"`.

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
| a returning learner runs the new release no later than the first path change, or the first load of the app, after the new worker installs (third skeptic round: also when the page cannot start) | yes | scenario u: the first change of screen reloads into the new release (phone); `tests/e2e/perf-boot.mjs` 12/12, including two tabs, no reload mid-lesson or mid-essay, the draft and resume point kept | met |
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

## Third skeptic round (2026-11-07)

One review of `40b402b`: the S-15 security sign-off, which read `sw.js` line by line before any notes and attacked a
fresh build of it (release `61cdec2e3120`) in Chromium against b2b669b. Its verdict, conditions and how each was met
are in docs/qa/security-review.md 5a, "Third skeptic round". Each problem was reproduced first with the reviewer's
own scripts (scratchpad `skeptic3-security/r2/`), then run again on a build of this round (outputs in scratchpad
`refix3/repro/`).

### What changed

- **Worker (`sw.js`).**
  - **A load of the app hands over to a waiting release (K1).** A release whose page cannot start (`boot()` throws,
    or a module fails to evaluate) never changes screen, so it never sent `lucid:activate`, and a waiting fix took
    over only once every tab had closed; the page itself says "Please reload the page". Now a navigation to the app
    while a release waits makes the active worker ask the waiting one to take over, and answer that navigation with
    a page of its own (no content, one inline script under its own nonce CSP, `no-store`) that reloads as soon as the
    waiting worker is no longer waiting. Waiting inside the navigation deadlocks and a redirect loops (Chromium
    activates the waiting worker only when the active one has no request in hand; both tried). If the waiting
    worker has not taken over 5 s after the first ask, the release serves the app again. Other tabs follow at their
    next change of screen, as when one tab switches between screens. The reviewer's `brick.mjs` on this round's
    build (good, bad, fix; max-age 0 and 600): the first reload after the fix is deployed lets the browser find it,
    the second runs it, in the same tab (`refix3/repro/brick-new*.txt`; on `40b402b` five reloads all said "could not
    start"; on b2b669b, network-first, the first reload ran the fix).
  - **A full origin never fails an install (K2).** An update writes a second copy of the release, so with the
    origin's quota nearly used (it is shared with other apps) the writes of the shell, of `unpack()`'s items and of
    the carry-over threw `QuotaExceededError` and failed every install: the learner stayed on the old code for good.
    Now a write that does not fit is skipped and the install stops fetching best-effort files. What did not fit, the
    shell included, is fetched and checked on use once the release takes over, and activation, which deletes the old
    cache, makes room again. Saved lessons that did not fit at install are carried over at activation, after the old
    caches' own files (served by no one by then) are dropped if storage is still full. The reviewer's `quota.mjs`
    (quota 1.5 x usage) on this build: the fix installs, and runs from the second load on, with only its own cache
    left (`refix3/repro/quota-new.txt`; on `40b402b` it never installed).
  - **Wording (K3).** The head comment said every response from the release cache is hashed. The stale-while-
    revalidate files (lessons, centre and pool files, `assets/`, `manifest.webmanifest`, a fetched `privacy.html`)
    share that cache and are served as stored, as at b2b669b; the comment, docs/architecture.md and 5a now say so.
    The reviewer's `swr-poison.mjs` on this build: unchanged (parity with b2b669b), by design for this round
    (5a gives the reason).
- **Tests.** sw.test: "a load of the app while a release waits hands over to it" and "a full origin never fails an
  install" (two quota levels, the second leaving no room even for the shell). Both fail on `40b402b`'s worker; the
  second also fails without the activation-time purge (mutation run). upgrade.mjs U8 (two variants: `boot()`
  throws, a module fails to evaluate; same tab; the fix runs at the second reload; no history entry added) and U9
  (`Storage.overrideQuotaForOrigin` at 1.5 x usage; the next release installs, takes over at a reload, keeps three
  saved lessons, removes the old cache, screens load). All three fail on `40b402b` ("after 3 reloads the page still
  shows could not start", "... stuck", "the next release did not install") and pass on the source and on the built
  tree.

### Re-measured (mobile, 3 runs, medians, one quiet window)

Built tree of this round (release `6a35f1a0edfa`) against the built previous head (`40b402b`, release
`61cdec2e3120`) and `git archive b2b669b` (base), with the same harness, in sequence with nothing else running. Only
the rows these fixes could move: the returning loads (g: the navigation now checks for a waiting release), the
release update (u) and the first-visit precache (f: the install's writes). Raw JSON and logs: scratchpad
`refix3/perf/`.

| row | this round | previous head | base | note |
|---|---:|---:|---:|---|
| warm (g) #/today fresh / stale / push / offline / lie-fi, sample 1 | 467 / 447 / 450 / 427 / 440 | 528 / 497 / 512 / 459 / 527 | 540 / 1403 / 2225 / 518 / 16573 | |
| the same, sample 2 | 558 / 440 / 468 / 440 / 456 | 425 / 475 / 448 / 429 / 454 | | fresh: runs 593, 416, 558 against 415, 425, 452 |
| warm (g) lesson a1-01, sample 1 / sample 2 | 433 / 467 / 451 / 434 / 418; 409 / 411 / 436 / 422 / 436 | 426 / 407 / 481 / 484 / 467; 414 / 476 / 443 / 480 / 465 | 508 / 1350 / 1853 / 517 / 24589 | |
| release update: downloads / installed after / saved lessons | 1 req, 6 KB / 1313 ms / 4 of 4 | 1 req, 6 KB / 1350 ms / 4 of 4 | 84 reqs, 884 KB / 11145 ms / 0 | 0 mixed-release pages in all three |
| returning #/today right after the deploy / Today -> lesson (reloads into the new release) / next #/today | 468 / 1314 / 468 | 482 / 1357 / 487 | 2123 / 2485 / 1272 | |
| precache on welcome: requests / KB / finished | 84 / 595 / 8242 | 84 / 595 / 8189 | | |
| precache on Today: finished | 8198 | 8137 | | |
| cold #/welcome / cold #/today (in f) | 1531 / 1797 | 1505 / 1757 | | with the worker blocked: 1511 / 1750 against 1529 / 1721 |

Every difference is inside the run-to-run spread, in both directions: the worker blocked (which runs none of the
changed code) differs by as much. The handover itself, measured separately (scratchpad `refix3/perf/handover-*.txt`,
page CPU 4x, five runs): a reload while a release waits takes 1373 ms to Lucid's first screen on the new release,
against 283 ms for a plain reload; the previous head's reload stays on the old release (266 ms) and pays the switch
at the next change of screen instead (u above: 1314-1357 ms in both). The time is the browser's: the worker's own
activate handler takes 15 ms, and Chromium marks the new worker activated about 1 s after it is asked to take over
whatever the worker does (the same with a ten-line test worker, `refix3/exp/`). The handover moves that second from the
first change of screen to the load; it does not add one.

### Suites on this round

All green on the source tree, and on the built tree where marked:

- `npm test` 385/385 with `CI=true` and esbuild (0 skipped); validate-content (0 errors, 1 warning as before);
  build-content-index --check;
- run.mjs 57/57 (source and built) and a11y (0 violations);
- every lane suite: shell-components 12/12, lesson-flow 25/25, exercises 12/12, bilingual-text 12/12,
  lesson-content 7/7, first-run-today 14/14, practice-hubs 14/14, games 17/17, real-life-writing 16/16,
  r4-lesson-flow 32/32, r4-exercises 13/13, r4-today-path 14/14, r4-practice-games 19/19, r4-real-life-writing 15/15,
  r4-shell-bilingual 11/11, perf-boot 13/13, perf-runtime 9/9;
- upgrade.mjs 10/10 (source and built: U1-U7 and the new U8 x 2, U9);
- build, then verify: ok (63 modules), against the source.

## Fourth skeptic round (2026-11-07)

Two reviews of `fde78c2`: the S-15 security and contract review of its two new worker mechanisms (the hand-over at a
load of the app, the quota-tolerant install), which rejected it, and a real-learner review of the hand-over on built
trees, which found no blocker. Verdicts, conditions and how each was met are in docs/qa/security-review.md 5a,
"Fourth skeptic round". Each problem was reproduced first with the reviewers' scripts (scratchpad
`skeptic4-handover-security/x/`, `skeptic4-handover/`), then run again on a build of this round (release `b23362933538`; scratchpad
`refix4/x/`, `refix4/s4/`; the final build `1a7cae2732c8` differs only in the hand-over page's give-up, 2 s of wall
time instead of 40 polls).

### What changed

- **Worker (`sw.js`).**
  - **The shell and `release.json` are required again on a full origin (blocker).** The third round made every
    write best effort, so at quota = usage an update installed with 0 or 5 entries, took over at the reload (from
    b2b669b at once) and deleted the old, complete cache: offline Lucid no longer started and the saved lessons were
    gone. Now a shell or `release.json` write that does not fit fails the install, which gives its space back; the
    install ends by checking, in its cache opened again by name, that `release.json` (matching `LISTING`) and every
    shell file are there; and activation deletes older caches only when its own cache passes that check. Modules
    and content beyond the shell stay best effort, so at 1.5 x usage the update still installs (U9). With no room
    even for the shell, the learner stays on the old release, online too, until there is room; b2b669b's
    network-first worker would have fetched new code online in that case, but lost the offline copy
    (learner reviewer's `quota.mjs`, HTTP cache cleared, 1.1 x usage: b2b669b 1 of 5 saved lessons and 1 of 31
    screens offline; this build stays on the old release with 5 of 5 and 31 of 31).
  - **Activation never deletes a newer release's cache (major).** B's activation deleted every other `lucid-`
    cache, also that of C, a release still installing; C then took over with 27 entries and no lessons. Now
    activation purges and deletes nothing while a worker is installing or waiting (that release's activation removes
    the older caches; if its install fails, the next release's does), and an install whose cache was removed while
    it ran fails its final check and is tried again.
  - **A saved lesson the release changed is fetched again after activation.** On a nearly full origin the install
    skips the carry-over, and activation only copied unchanged lessons, so a changed saved lesson was dropped. Now
    activation fetches those again (checked) once the old caches are gone; the fetch runs after the activation (kept
    alive by the next fetch events), so it delays no request.
  - **A hand-over that does not happen costs one page.** With another tab's request in the active worker that the
    network never answers, the browser cannot activate the waiting worker, and a reload showed hand-over pages for
    6.4 s. Now only navigations within 1 s of the first ask get the page (`HANDOVER_MS` 1000), and the page gives up
    after 2 s of wall time (not a count of polls, which a hidden tab's timers would stretch), so its own reload gets
    the app on the old release, which the waiting worker replaces by itself once the request ends.
  - **The hand-over page is the app's colour and speaks.** It had no content: white in light mode (the app's ground
    is 244,248,251) and an empty, silent document for screen readers. It now has the boot frame's ground and ink for
    each colour scheme (a nonce'd style; its CSP gains `style-src 'nonce-…'` only) and `<p role="status">מעדכנים את
    Lucid…</p>`, a status live region in Chromium's accessibility tree. `index.html`'s CSP is unchanged.
- **Docs.** plan.json C-4 now describes the third hand-over point and the install and activation rules;
  architecture §7 ("Full storage", "Updates") and 5a's third-round K2 bullet are corrected.
- **Tests.** sw.test: "a hand-over that does not happen costs one page", "a nearly full origin never fails an
  install over best-effort files" (now also: the shell and `release.json` are stored, and a changed saved lesson is
  fetched again), "with no room for the next release's release.json or shell, its install fails" (room 0, 0.004 and
  0.02, offline restart, then a retry with room), "activation removes the older caches only when its own holds
  release.json and the shell", "activation leaves the cache of a newer release that is installing"; the hand-over
  test also checks the colours against `index.html`, the status line and the CSP. Each fails on `fde78c2`'s worker,
  and each part of the fix is needed by one of them (mutation runs). upgrade.mjs U10 (quota = usage, from this
  release and from b2b669b, offline restart), U11 (an install racing an activation, then offline screens) and U12
  (a stalled request in another tab: at most 2 documents and under 4 s). All four fail on a `fde78c2` tree ("the
  update installed with no room for its shell", "caches [lucid-2026-11-03.1] became [lucid-17565f744f38]", "B's
  activation removed the cache of C", "4 documents before Lucid started") and pass on the source and the built tree.

### The reviewers' scripts on this round's build

| script | `fde78c2` | this round |
|---|---|---|
| `x/quota.mjs` F = 1.0 / 1.004 | new cache 0 / 5 entries takes over, old (150) deleted; offline `ERR_FAILED` / app does not start | no update installs; old cache 150 entries, 3 lessons; offline starts, lessons 200 |
| `x/quota.mjs` F = 1.5 | installs, takes over | installs, takes over, 3 of 3 lessons, offline starts |
| b2b669b -> build, quota = usage | legacy cache (83) deleted at once; offline `ERR_FAILED` | legacy cache kept; offline starts, 3 lessons 200 |
| `x/race.mjs` reload / screen | C takes over with 27 entries, no lessons; offline screens fail | C takes over with 150 entries and 3 lessons; path, progress, writing, games, lesson offline |
| `stall.mjs` (stuck request in tab X) | 6436 ms, 4 documents, old release | 2408 ms, 2 documents, old release (B takes over once the request ends) |
| `x/loop.mjs` hang / no hang | 6335 ms, 3 hand-over pages / 1183 ms | 2261 ms, 1 hand-over page / 1217 ms |
| `quota.mjs` (5 saved, HTTP cache cleared) 1.1 / 1.5 / 2 x | saved 4/5, 4/5, 5/5; offline screens 1, 25, 31 of 31 | no update at 1.1 (old release: 5/5, 31 of 31); 5/5, 26 of 31; 5/5, 31 of 31 |
| `cost.mjs` hand-over frame colour (light / dark) | 255,255,255 / 18,18,18 | 244,248,251 / 11,14,21 (the app's ground) |

### Re-measured (mobile, 3 runs, medians, one quiet window)

The fixes touch the install (its last check), the activation and the hand-over, so the rows re-measured are the
release update (u), the first-visit precache (f), the returning loads (g) and the hand-over load itself. Built tree of
this round against the built previous head (`fde78c2`, release `6a35f1a0edfa`) and b2b669b, in sequence with nothing
else running. Raw JSON and logs: scratchpad `refix4/perf/` (`m4.log`; u on the final build: `final-u1`, `final-u2`).

| row | this round | previous head | base | note |
|---|---:|---:|---:|---|
| release update: downloads / saved lessons | 1 req, 6 KB / 4 of 4 | 1 req, 6 KB / 4 of 4 | 84 reqs, 884 KB / 0 | 0 mixed-release pages in all three |
| returning #/today right after the deploy | 449 [384, 449, 451] | 425 [445, 382, 425] | 2495 | |
| Today -> lesson, reloading into the new release / not (installed after the click) | 1295, 1299 / 99 | 1296, 1317 / 94 | 2482 | which path a run takes depends on whether the install finished before the click, in both |
| next #/today, plain / handing over | 416, 503 / 1260 | 399, 406 / 1371 | 1208 | |
| precache on welcome: requests / KB / finished | 84 / 595 / 8179 | 84 / 595 / 8140 | | |
| precache on Today: finished | 8075 | 8053 | | |
| warm (g) #/today fresh / stale / after-push / offline / lie-fi | 423 / 410 / 385 / 373 / 415 | 380 / 361 / 363 / 387 / 452 | | the previous-head runs overlap (fresh 435, 408, 423 against 380, 370, 399) |
| warm (g) lesson a1-01, same states | 424 / 395 / 341 / 389 / 359 | 380 / 383 / 361 / 356 / 384 | | |
| hand-over load, light: plain reload / with a release waiting / b2b669b after a deploy | 487 / 1557 / 631 | | | `cost.mjs`, 150 ms RTT, 1.6 Mbps, CPU 4x; this machine ran slower than at the review (reviewer: 385 / 1403 / 565) |
| the same, dark | 542 / 1664 / 722 | | | reviewer: 350 / 1412 / 468 |

Differences in u, f and g are inside the run-to-run spread, in both directions; the changed code runs only at an
install's end (13 cache lookups), at activation and while a release waits. The u and g rows were measured on a
build whose hand-over page gave up after 40 polls instead of 2 s of wall time; u was run again on the final build
(`final-u1`, used in after.json, and `final-u2`: the same paths, 1294-1386 ms when the reload happens at the click).

**What the hand-over costs, plainly.** The load that hands over is about 1 s slower than a plain reload and than
b2b669b's reload right after a deploy (1557 against 487 and 631 ms in light mode here). That second is Chromium's: it
activates the waiting worker about 1 s after it is asked, once the active worker has no request in hand. The
statement in the third round that the hand-over "does not add" a second holds only against `40b402b`, which paid it
at the next change of screen; against a plain load and against b2b669b (which at that moment still runs the old code
from its fresh HTTP cache) it is a second more, once per deploy, now on a screen of the app's colour with a status
line. When the browser cannot activate (a request in the active worker that the network never answers), it costs
one hand-over page and about 2 s, then the old release.

### Suites on this round

All green on the source tree, and on the built tree where marked:

- `npm test` 389/389 with `CI=true` and esbuild (0 skipped); validate-content (0 errors, 1 warning as before);
  build-content-index --check; build-route-deps --check;
- run.mjs 57/57 (source and built, release `1a7cae2732c8`) and a11y (0 violations);
- every lane suite: shell-components 12/12, lesson-flow 25/25, exercises 12/12, bilingual-text 12/12,
  lesson-content 7/7, first-run-today 14/14, practice-hubs 14/14, games 17/17, real-life-writing 16/16,
  r4-lesson-flow 32/32, r4-exercises 13/13, r4-today-path 14/14, r4-practice-games 19/19, r4-real-life-writing 15/15,
  r4-shell-bilingual 11/11, perf-boot 13/13, perf-runtime 9/9; screen-errors ok;
- upgrade.mjs 14/14 (source and built: U1-U9 and the new U10 x 2, U11, U12);
- build, then verify: ok (63 modules, maps, hashes, paths, CSP), against the source. `index.html` is unchanged
  since `fde78c2`, and its CSP meta is byte-identical to b2b669b's.

## Fifth skeptic round (2026-11-07)

Two reviews of `9db2cd7`: a line-by-line review of the worker's state machine, which rejected it on the storage edges
and on contract C-4, and an offline and upgrade matrix against b2b669b (61 cells), which asked for one fix (P1) before
shipping. Verdicts, conditions and how each was met are in docs/qa/security-review.md 5a, "Fifth skeptic round". Each
problem was reproduced first with the reviewers' scripts on a `9db2cd7` tree (scratchpad `refix5/b5/out/pre-*`,
`refix5/m5/out/recover-b2-head-1.2.txt`), then run on this round's source and on its build (release `e64c1cd42486`;
scratchpad `refix5/b5/out/`, `refix5/m5/out/`).

### What changed

- **Worker (`sw.js`).**
  - **Room is measured by writing (blocker, majors).** On a real nearly full disk Chromium's `estimate()` reports
    about 1 GiB free while every write fails, and DevTools' quota override is not reported by it either, so no
    decision uses it. Before its first write the install writes and deletes a probe of its shell's size (the shell is
    read into memory first); best-effort files are written next to a "ballast" entry of 1.25 x the shell, deleted
    afterwards, in the install, in a fill-in after activation and for each miss kept later, so they always leave the
    next release room to install. The probe and ballast use the key `https://lucid.invalid/room`.
  - **A failed install gives its own cache back, and only its own (majors).** Every failure (not only a quota error)
    empties and deletes the install's cache; a complete cache of the same release found at the start (the
    registration went away, Cache Storage stayed) is never deleted, and that install writes nothing.
  - **The one-time upgrade bypasses the HTTP cache (blocker).** A failed attempt at 1.02-1.1 x usage had stored the
    new `index.html` and `app.js` in the HTTP cache, from which b2b669b's network-first worker served them next to
    old modules and stored that mix; now the upgrade's requests use `cache: 'no-store'`.
  - **Deleted caches give their space back at once (matrix P1).** Activation empties the old caches through the
    `Cache` objects it holds (Chromium otherwise keeps a deleted cache's space while one is alive), then fetches the
    changed saved lessons again, then the offline list's files the install left out (`fillIn`).
  - **Offline, a missing file may come from the HTTP cache (matrix P2)**, hashed like any other copy.
- **Router (`js/core/router.js`, contract C-4).** The `controllerchange` listener is attached when the module is
  evaluated, not after the first screen and the registration; the first screen reloads too when a release took over
  during the boot, and so does a screen whose modules were loading when one took over.
- **Docs.** plan.json C-4 (install, activation and the boot-time listener), architecture §7 ("Full storage",
  "Updates"), 5a. The earlier rounds' sentences that "the old release's cache is removed when the new one takes over,
  which makes room again" and that files left out are fetched only on use no longer describe this build: the first
  held only once the worker stopped, and left-out files are now also fetched again after activation.
- **Tests.** The sw.test harness counts a replacing put in full, keeps a deleted cache's bytes while a worker that
  opened it runs (unless its entries are deleted), and models the HTTP cache; seven sw.test cases and one router.test
  case, each failing on `9db2cd7` and each needed by one part of the fix (mutation runs); upgrade.mjs U13 (1.02, 1.05,
  1.1 x from b2b669b), U14 (1.2 x, offline right after the upgrade visit), U15 (same-release reinstall at quota =
  usage), U16 (failed-install orphan) and U17 (a takeover during a tab's boot, CPU 4 and 6 x), all failing on a
  `9db2cd7` tree and passing on the source and the built tree.

### The reviewers' scripts on this round

| script | `9db2cd7` | this round |
|---|---|---|
| `legacy.mjs` b2b669b -> head, 1.02 / 1.05 / 1.1 x | 1.05: offline stuck (`router.js` lacks `checkForRelease`); U13: at 1.02 and 1.05 offline does not start, and at all three the old worker serves the new `app.js` | stays on the old release; offline starts, 3/3 lessons, 5/5 screens (1.02 and 1.05 x: 5 runs each); with the probe but without `no-store`, 1.02 x was still stuck in 2 of 3 runs |
| `legacy.mjs` 1.2 x | takes over with 52 entries; offline only `path` of 5 screens (progress, games, expressions, writing "did not load"), also after room returns | takes over; offline 3/3 lessons, 5/5 screens |
| `reinstall.mjs` x 1 / x 1.05 | complete cache and 3 lessons deleted | cache (150 entries, 3 lessons) kept, worker active |
| `orphan.mjs` (quota = A + 1.3 x shell) | B leaves 73 entries; C never installs | B leaves nothing; C installs at the first attempt |
| `tight.mjs` 1.9 MB | no update ever installs; Expressions broken online | 64 entries at first; N1 installs and takes over; Expressions loads |
| `askboot.mjs` 4 / 6 x CPU | 4 of 4 runs mixed, `#/progress` broken | 8 of 8 clean (4 reload at the first change of screen, 4 boot on N1) |
| `recover.mjs` b2b669b -> build, 1.2 x | offline right after the upgrade: does not start, 0/31, 0/5 | 31/31 screens, 5/5 saved lessons (1.5 x too) |

### Re-measured (mobile, 3 runs, medians, two quiet windows)

The fixes touch the install (probe, ballast, the shell read first), the activation (emptying and fill-in) and the
router's boot, so the rows re-measured are the release update (u), the first-visit precache (f), the returning loads
(g) and the hand-over load. Built tree of this round (`e64c1cd42486`) against the built previous head (`9db2cd7`,
release `1a7cae2732c8`) and b2b669b, one at a time with nothing else running. Raw JSON and logs: scratchpad
`refix5/perf/` (`m5.log`; the second window, in the reverse order, `m5b.log`).

| row | this round | previous head | base | note |
|---|---:|---:|---:|---|
| release update: downloads / saved lessons | 1 req, 6 KB / 4 of 4 | 1 req, 6 KB / 4 of 4 | 84 reqs, 884 KB / 0 | 0 mixed-release pages in all three; all requests 5 / 34 KB against 5 / 31 KB (the larger `sw.js`) |
| returning #/today right after the deploy | 408 [462, 408, 366] | 416 [364, 465, 416] | 2401 | |
| Today -> lesson while installing | 87 [1327, 87, 86] | 104 [104, 1298, 78] | 2510 | one run in each reloads into the new release at the click |
| next #/today (two of three hand over) | 1304 [422, 1304, 1322] | 1312 [1312, 426, 1389] | 1201 | |
| cold #/welcome, window 1 / window 2 | 1504 / 1489 | 1467 / 1497 | | window 1 ran this round first, window 2 last; the order, not the build, gives the difference (with the worker blocked: 1474 / 1469 against 1461 / 1492) |
| cold #/today, window 1 / window 2 | 1692 / 1681 | 1677 / 1697 | | |
| precache on welcome: requests / KB / finished | 84 / 595 / 8173, 8183 | 84 / 595 / 8106, 8157 | | 26-67 ms later: the probe and ballast writes, after the page has drawn |
| warm (g) #/today fresh / stale / after-push / offline / lie-fi | 392 / 369 / 370 / 432 / 383 | 357 / 370 / 413 / 369 / 401 | | the runs overlap (offline 432, 363, 432 against 375, 369, 346) |
| warm (g) lesson a1-01, same states | 345 / 418 / 366 / 363 / 450 | 389 / 353 / 435 / 376 / 357 | | |
| hand-over load, light: plain reload / with a release waiting / b2b669b after a deploy | 265, 287 / 1341, 1346 / 485, 446 | 326, 267 / 1308, 1304 / 487, 502 | | `cost.mjs`, two windows |
| the same, dark | 313, 295 / 1370, 1315 / 499, 464 | 338, 249 / 1309, 1361 / 478, 449 | | |

The release update, the returning and warm loads and the cold loads are unchanged within the run-to-run spread. The
precache finishes about 30-70 ms later out of 8.1 s, after the page has drawn. The light hand-over load was about
40 ms slower in both windows (1341 and 1346 against 1308 and 1304 ms), probably the old cache's entries being
deleted while the new page loads; in dark mode and in the u row's hand-over runs there is no consistent
difference. It happens once per deploy, and the hand-over still costs about 1 s against a plain reload and b2b669b,
as the fourth round states.

### Suites on this round

All green on the source tree, and on the built tree (release `e64c1cd42486`) where marked:

- `npm test` 397/397 with `CI=true` and esbuild (0 skipped); validate-content (0 errors, 1 warning as before);
  build-content-index --check; build-route-deps --check;
- run.mjs 57/57 (source and built) and a11y (0 violations);
- every lane suite: shell-components 12/12, lesson-flow 25/25, exercises 12/12, bilingual-text 12/12,
  lesson-content 7/7, first-run-today 14/14, practice-hubs 14/14, games 17/17, real-life-writing 16/16,
  r4-lesson-flow 32/32, r4-exercises 13/13, r4-today-path 14/14, r4-practice-games 19/19, r4-real-life-writing 15/15,
  r4-shell-bilingual 11/11, perf-boot 13/13, perf-runtime 9/9; screen-errors ok;
- upgrade.mjs 21/21 (source and built: U1-U12 and the new U13 x 3, U14, U15, U16, U17);
- build, then verify: ok (63 modules, maps, hashes, paths, CSP), against the source. `index.html` is unchanged,
  and its CSP meta is byte-identical to b2b669b's.
