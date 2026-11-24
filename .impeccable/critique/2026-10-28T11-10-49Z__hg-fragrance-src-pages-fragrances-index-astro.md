---
target: the fragrances collection page (/fragrances)
total_score: 22
max_score: 32
na_heuristics: 7,10
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/desktop-tutorial/hg-fragrance/src/pages/fragrances/index.astro"
target_fingerprint: "sha256:7c53b36fcd8e11f76cc9992b52a80bcd9b7533b0f0ae6ed7bcd9b47d185b2235"
target_path: /home/user/desktop-tutorial/hg-fragrance/src/pages/fragrances/index.astro
timestamp: 2026-10-28T11-10-49Z
slug: hg-fragrance-src-pages-fragrances-index-astro
---
Method: dual-agent (A: design review · B: browser evidence). Detector run afterwards, once the engine download was approved: 0 findings in index.astro, FragrancePicker.astro, Purchase.astro, BagDrawer.astro.

## Design Health Score (22/32, 69%, Acceptable; heuristics 7 and 10 n/a on a Persuade surface)
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | On desktop a tile click only changes its border; the panel starts below the fold (y≈917–960) and nothing scrolls |
| 2 | Match System / Real World | 3 | Natural language, but nothing says what any fragrance smells like; picker numbering reads N°02, N°03, N°01, N°04 |
| 3 | User Control and Freedom | 3 | Reload/deep link keep the choice; Esc closes the bag and returns focus |
| 4 | Consistency and Standards | 3 | Same picker navigates on the PDP but switches in place here; 768: FILM nav link 0.4px from the logo |
| 5 | Error Prevention | 3 | Size preselected; Checkout styled as primary while checkout is off |
| 6 | Recognition Rather Than Recall | 2 | One panel at a time; comparing means click, scroll, read, remember |
| 7 | Flexibility and Efficiency | n/a | Persuade surface with four products |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained; empty right half on desktop first screen; "100 ml · 50 ml" repeats the size picker |
| 9 | Error Recovery | 3 | Clear demo-checkout message |
| 10 | Help and Documentation | n/a | Collection page; details linked to the PDP |

## Design Specificity Verdict
Idea authored for HG (four identical flacons differing only by juice colour, seasonal accent borders, per-scent lines); the surrounding template is category-default dark luxury e-commerce. The strongest idea sits in a small picker; the fashion portraits are hover-only.
Deterministic: browser evidence 0 console errors, 0 failed requests, 0 contrast failures (min 5.45:1), no overflow down to 320px, CLS < 0.01, alts present, visible focus at every stop. Detector: 0 findings. No overlay.

## Priority Issues
1. [P1] Selection not visible on desktop/tablet: panel below the fold, no scroll. Fix: picker and panel side by side on wide screens (use the empty right half); otherwise a gentle reduced-motion-aware scroll. /impeccable layout
2. [P1] No olfactory information: catalogue notes for three fragrances are never shown; Unforgettable has none. Fix: notes line in the panel and a short descriptor under each tile; Unforgettable notes from the owner, never invented. /impeccable clarify
3. [P1] Portraits hover-only, never on touch; 0.9s crossfade shows a ghosted double exposure. Fix: portrait as main image on touch with packshot inset or swipe; shorter crossfade. /impeccable adapt
4. [P2] Mobile purchase distance (~900px from tiles to Add to bag); the fixed DEMO SITE badge covers the button at the viewport bottom (115x33 at 390). Fix: sticky purchase bar like the PDP; move the badge when it shows. /impeccable adapt
5. [P2] Flat add-to-bag ending: no "Added" acknowledgement, Checkout primary to a dead end, demo disclaimer three times. /impeccable polish

## Persona Red Flags
Jordan: no basis to choose; default is the third tile (N°01); no price on the first screen; all-caps "THE FRAGRANCE, THE FLACON AND DELIVERY" reads as a heading.
Riley: deep link #nocturne scrolls the picker out of view (796px); Back leaves the page; tile names shrink to 10.96px at 390 / 8.9px at 320; h1 spans nowrap will clip longer translations.
Casey: tile names ~11px, season hidden; DEMO SITE badge in the thumb zone; bag controls under 44px, close X top-right.

## Minor Observations
Tiles are links acting as tabs (Space scrolls, arrows do nothing, no announcement on switch); 1px focus outline (AA ok); Nocturne Extrait at the same price as the EdPs; empty-bag hint "Unforgettable is waiting where you left it" outdated; season label 9.9px; tablet logo off-centre, 960px-tall packshot with empty right half; tile gap 7.6px at 390.

## Questions to Consider
Why show one flacon at a time if the idea is four lights? Where is the discovery set? Should the default follow the current season?
