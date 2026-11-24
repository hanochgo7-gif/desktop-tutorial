# Lucid performance

Measured by `node tools/perf.mjs` on 2026-11-06 (commit 35fd6e3, Chromium 153.0.8010.12, h2, 3 runs, median). mobile: 1.6 Mbps down, 150 ms RTT (server-shaped, shared by the page and the service worker), CPU 4x, 390x844 @2x, touch. desktop: unshaped, 1440x900. Times in ms from navigation start (loads) or from the input (interactions); KB = 1024 bytes; gzKB = bytes on the wire for the page, rawKB = decoded, netKB = everything the server sent (page and service worker). See the top of tools/perf.mjs for each metric.

## mobile


### a. Cold first visit

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/welcome | 2050 | 2072 | 2072 | 0 | 0.000 | 24 | 189 | 533 | 300 | 0 | 27 |


### b. Today for an onboarded A1 learner

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/today | 3695 | 1868 | 3716 | 26 | 0.000 | 29 | 426 | 1465 | 537 | 1 | 29 |
| warm #/today | 378 | 228 | 384 | 15 | 0.000 | 29 | 1465 | 1465 | 0 | 1 | 19 |


### c. Routes, cold and warm

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/lesson/a1-01 | 3159 | 3172 | 3172 | 0 | 0.000 | 36 | 507 | 1693 | 887 | 1 | 39 |
| warm #/lesson/a1-01 | 346 | 352 | 352 | 0 | 0.000 | 36 | 1693 | 1693 | 0 | 1 | 29 |
| cold #/real-life | 3527 | 1856 | 3548 | 20 | 0.000 | 28 | 363 | 1193 | 474 | 1 | 45 |
| warm #/real-life | 369 | 224 | 380 | 8 | 0.000 | 28 | 1193 | 1193 | 0 | 1 | 28 |
| cold #/scenario/rl-airport-checkin-overweight | 3563 | 1864 | 3580 | 8 | 0.000 | 29 | 378 | 1237 | 489 | 1 | 40 |
| warm #/scenario/rl-airport-checkin-overweight | 354 | 228 | 376 | 5 | 0.000 | 29 | 1237 | 1237 | 0 | 1 | 28 |
| cold #/writing | 2766 | 1912 | 2776 | 57 | 0.000 | 26 | 271 | 842 | 382 | 2 | 25 |
| warm #/writing | 362 | 248 | 380 | 38 | 0.000 | 26 | 842 | 842 | 0 | 1 | 21 |
| cold #/writing/final-B2 | 3739 | 1864 | 3748 | 53 | 0.000 | 36 | 402 | 1238 | 513 | 1 | 44 |
| warm #/writing/final-B2 | 441 | 248 | 464 | 49 | 0.000 | 36 | 1238 | 1238 | 0 | 1 | 32 |
| cold #/games | 2885 | 1872 | 2908 | 1 | 0.000 | 34 | 252 | 726 | 363 | 1 | 36 |
| warm #/games | 331 | 240 | 356 | 0 | 0.000 | 34 | 726 | 726 | 0 | 0 | 23 |
| cold #/expressions | 3495 | 1872 | 3508 | 68 | 0.000 | 32 | 327 | 965 | 438 | 1 | 36 |
| warm #/expressions | 415 | 240 | 432 | 42 | 0.000 | 32 | 965 | 965 | 0 | 1 | 26 |
| cold #/reading | 7172 | 1884 | 7180 | 12 | 0.000 | 106 | 1059 | 3746 | 1170 | 2 | 66 |
| warm #/reading | 676 | 236 | 688 | 15 | 0.000 | 106 | 3746 | 3746 | 0 | 2 | 30 |
| cold #/progress | 2610 | 1864 | 2624 | 51 | 0.000 | 26 | 215 | 619 | 326 | 1 | 24 |
| warm #/progress | 340 | 224 | 356 | 37 | 0.000 | 26 | 619 | 619 | 0 | 1 | 17 |


### d. In-app transitions from Today (click -> content painted)

|  | ms | longTasks | tbt | reqs | gzKB |
|---|---:|---:|---:|---:|---:|
| Today -> #/lesson/a1-01 (first session) | 1911 | 1 | 12 | 8 | 119 |
| Today -> #/real-life (first session) | 453 | 0 | 0 | 2 | 8 |
| Today -> #/scenario/rl-airport-checkin-overweight (first session) | 408 | 0 | 0 | 1 | 14 |
| Today -> #/writing (first session) | 297 | 1 | 26 | 1 | 5 |
| Today -> #/writing/final-B2 (first session) | 95 | 0 | 0 | 2 | 36 |
| Today -> #/games (first session) | 409 | 0 | 0 | 8 | 46 |
| Today -> #/expressions (first session) | 112 | 0 | 0 | 3 | 202 |
| Today -> #/reading (first session) | 4157 | 0 | 0 | 74 | 2900 |
| Today -> #/progress (first session) | 70 | 0 | 0 | 1 | 14 |
| Today -> #/lesson/a1-01 (returning) | 120 | 1 | 5 | 8 | 355 |
| Today -> #/real-life (returning) | 82 | 0 | 0 | 2 | 20 |
| Today -> #/scenario/rl-airport-checkin-overweight (returning) | 74 | 0 | 0 | 1 | 44 |
| Today -> #/writing (returning) | 101 | 1 | 22 | 1 | 12 |
| Today -> #/writing/final-B2 (returning) | 92 | 0 | 0 | 2 | 116 |
| Today -> #/games (returning) | 94 | 0 | 0 | 8 | 137 |
| Today -> #/expressions (returning) | 117 | 0 | 0 | 3 | 202 |
| Today -> #/reading (returning) | 382 | 0 | 0 | 74 | 2900 |
| Today -> #/progress (returning) | 66 | 0 | 0 | 1 | 14 |


### e. Interactions (input -> result painted)

|  | ms | inp | longTasks | tbt |
|---|---:|---:|---:|---:|
| lesson: Skip to practice -> first exercise | 55 | 56 | 0 | 0 |
| lesson: Check -> verdict (choice) | 40 | 40 | 0 | 0 |
| lesson: last match pair -> verdict | 71 | 72 | 0 | 0 |
| lesson: Next -> next exercise | 41 | 40 | 0 | 0 |
| word quiz: answer -> verdict | 39 | 40 | 0 | 0 |
| word quiz: Next -> next question | 33 | 32 | 0 | 0 |
| memory: card flip | 37 | 40 | 0 | 0 |

|  | median | p95 | max | msPerKey | longTasks | tbt | longest | slowEvents | inp |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| essay: 300 words typed (per keystroke) | 8 | 20 | 25 | 5.8 | 0 | 0 | 0 | 0 | 24 |


### f. Service worker install

|  | reqs | wireKB | rawKB | startMs | endMs | activatedMs | view | overlapReqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SW precache on the first visit (#/welcome) | 84 | 884 | 2804 | 2203 | 9452 | 9459 | 2050 | 0 |
| SW precache on the first visit (#/today) | 84 | 884 | 2804 | 3842 | 11055 | 11063 | 3695 | 0 |

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/welcome, SW blocked | 2055 | 2064 | 2064 | 0 | 0.000 | 24 | 189 | 533 | 189 | 0 | 25 |
| cold #/today, SW blocked | 3696 | 1856 | 3704 | 23 | 0.000 | 29 | 426 | 1465 | 426 | 1 | 28 |


## desktop


### a. Cold first visit

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/welcome | 66 | 80 | 80 | 0 | 0.000 | 24 | 189 | 533 | 1074 | 0 | 4 |


### b. Today for an onboarded A1 learner

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/today | 99 | 68 | 112 | 0 | 0.186 | 29 | 426 | 1465 | 1312 | 0 | 4 |
| warm #/today | 125 | 84 | 136 | 0 | 0.496 | 29 | 1465 | 1465 | 0 | 0 | 4 |


### c. Routes, cold and warm

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/lesson/a1-01 | 101 | 104 | 104 | 0 | 0.237 | 36 | 507 | 1693 | 1392 | 0 | 6 |
| warm #/lesson/a1-01 | 123 | 140 | 140 | 0 | 0.237 | 36 | 1693 | 1693 | 0 | 0 | 6 |
| cold #/real-life | 91 | 64 | 112 | 0 | 0.500 | 28 | 363 | 1193 | 1249 | 0 | 6 |
| warm #/real-life | 121 | 88 | 144 | 0 | 0.496 | 28 | 1193 | 1193 | 0 | 0 | 7 |
| cold #/scenario/rl-airport-checkin-overweight | 90 | 68 | 104 | 0 | 0.500 | 29 | 378 | 1237 | 1263 | 0 | 6 |
| warm #/scenario/rl-airport-checkin-overweight | 130 | 88 | 148 | 0 | 0.496 | 29 | 1237 | 1237 | 0 | 0 | 6 |
| cold #/writing | 80 | 60 | 96 | 0 | 0.186 | 26 | 271 | 842 | 1156 | 0 | 4 |
| warm #/writing | 113 | 96 | 124 | 0 | 0.462 | 26 | 842 | 842 | 0 | 0 | 4 |
| cold #/writing/final-B2 | 113 | 68 | 128 | 0 | 0.500 | 36 | 402 | 1238 | 1288 | 0 | 6 |
| warm #/writing/final-B2 | 147 | 96 | 176 | 0 | 0.496 | 36 | 1238 | 1238 | 0 | 0 | 7 |
| cold #/games | 88 | 64 | 104 | 0 | 0.500 | 34 | 252 | 726 | 1137 | 0 | 4 |
| warm #/games | 113 | 88 | 124 | 0 | 0.496 | 34 | 726 | 726 | 0 | 0 | 4 |
| cold #/expressions | 106 | 76 | 124 | 0 | 0.500 | 32 | 327 | 965 | 1212 | 0 | 6 |
| warm #/expressions | 136 | 84 | 148 | 0 | 0.496 | 32 | 965 | 965 | 0 | 0 | 7 |
| cold #/reading | 175 | 68 | 192 | 0 | 0.500 | 106 | 1059 | 3746 | 1944 | 0 | 7 |
| warm #/reading | 274 | 88 | 292 | 0 | 0.496 | 106 | 3746 | 3746 | 0 | 0 | 7 |
| cold #/progress | 90 | 68 | 108 | 0 | 0.500 | 26 | 215 | 619 | 1100 | 0 | 4 |
| warm #/progress | 122 | 96 | 140 | 0 | 0.496 | 26 | 619 | 619 | 0 | 0 | 4 |


### d. In-app transitions from Today (click -> content painted)

|  | ms | longTasks | tbt | reqs | gzKB |
|---|---:|---:|---:|---:|---:|
| Today -> #/lesson/a1-01 (first session) | 47 | 0 | 0 | 9 | 385 |
| Today -> #/real-life (first session) | 27 | 0 | 0 | 2 | 20 |
| Today -> #/scenario/rl-airport-checkin-overweight (first session) | 27 | 0 | 0 | 1 | 44 |
| Today -> #/writing (first session) | 26 | 0 | 0 | 1 | 12 |
| Today -> #/writing/final-B2 (first session) | 28 | 0 | 0 | 2 | 116 |
| Today -> #/games (first session) | 46 | 0 | 0 | 8 | 137 |
| Today -> #/expressions (first session) | 37 | 0 | 0 | 3 | 202 |
| Today -> #/reading (first session) | 195 | 0 | 0 | 74 | 2900 |
| Today -> #/progress (first session) | 27 | 0 | 0 | 1 | 14 |
| Today -> #/lesson/a1-01 (returning) | 51 | 0 | 0 | 9 | 385 |
| Today -> #/real-life (returning) | 32 | 0 | 0 | 2 | 20 |
| Today -> #/scenario/rl-airport-checkin-overweight (returning) | 28 | 0 | 0 | 1 | 44 |
| Today -> #/writing (returning) | 27 | 0 | 0 | 1 | 12 |
| Today -> #/writing/final-B2 (returning) | 29 | 0 | 0 | 2 | 116 |
| Today -> #/games (returning) | 42 | 0 | 0 | 8 | 137 |
| Today -> #/expressions (returning) | 34 | 0 | 0 | 3 | 202 |
| Today -> #/reading (returning) | 178 | 0 | 0 | 74 | 2900 |
| Today -> #/progress (returning) | 23 | 0 | 0 | 1 | 14 |


### e. Interactions (input -> result painted)

|  | ms | inp | longTasks | tbt |
|---|---:|---:|---:|---:|
| lesson: Skip to practice -> first exercise | 14 | 16 | 0 | 0 |
| lesson: Check -> verdict (choice) | 15 | 16 | 0 | 0 |
| lesson: last match pair -> verdict | 14 | 16 | 0 | 0 |
| lesson: Next -> next exercise | 15 | 16 | 0 | 0 |
| word quiz: answer -> verdict | 15 | 16 | 0 | 0 |
| word quiz: Next -> next question | 15 | 16 | 0 | 0 |
| memory: card flip | 15 | 16 | 0 | 0 |

|  | median | p95 | max | msPerKey | longTasks | tbt | longest | slowEvents | inp |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| essay: 300 words typed (per keystroke) | 3 | 17 | 18 | 2.1 | 0 | 0 | 0 | 0 | 24 |


### f. Service worker install

|  | reqs | wireKB | rawKB | startMs | endMs | activatedMs | view | overlapReqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| SW precache on the first visit (#/welcome) | 84 | 884 | 2804 | 74 | 187 | 195 | 66 | 0 |
| SW precache on the first visit (#/today) | 84 | 884 | 2804 | 107 | 222 | 229 | 99 | 0 |

|  | view | fcp | lcp | tbt | cls | reqs | gzKB | rawKB | netKB | longTasks | script |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| cold #/welcome, SW blocked | 70 | 80 | 80 | 0 | 0.251 | 24 | 189 | 533 | 189 | 0 | 5 |
| cold #/today, SW blocked | 97 | 68 | 108 | 0 | 0.186 | 29 | 426 | 1465 | 426 | 0 | 4 |


## Reading the baseline

- Phone cold loads are bound by the network, not the CPU. TBT stays under 70 ms everywhere, and every interaction is painted within 75 ms. Cold Today paints its shell at about 1.9 s (FCP), but the plan only shows at 3.7 s. The cold Today waterfall (`rows[].sample.resources` in baseline.json) shows why: `session.js` and `placement.js` load in a second wave of modules, then `today.js`, and then `real-life/scenarios.json` (131 KB gz), `writing/exercises.json` and `writing/assignments.json` all load before the plan renders.
- `#/reading` is the outlier: 106 requests and 1.06 MB gz cold (7.2 s), and it fetches every lesson file (74 requests, 2.9 MB decoded) even on an in-app transition.
- The service worker precaches 84 files (884 KB gz, 2.8 MB decoded). On the phone link this takes about 7 s after the first view. It starts after the view, so the first view loses nothing (compare the "SW blocked" rows). Navigation during those 7 s shares the link with it, though: the first-session Today -> lesson transition takes 1.9 s, against 0.12 s for a returning learner.
- Warm loads make no network requests (the HTTP cache is fresh and the worker serves the rest) and show the view in 0.33-0.45 s on the phone (0.68 s for reading).
- Desktop CLS reaches 0.19-0.50 on the shell routes, while the phone shows 0. This is worth checking: something in the desktop shell shifts after the first paint.
