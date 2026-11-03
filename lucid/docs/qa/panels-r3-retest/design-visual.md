Simulated review (AI persona), not real user research.

# Panel r3 re-test: visual design lead

## Who I am

I play the design team's visual design lead. I own visual hierarchy, Hebrew and Latin type set together, colour and contrast in light and dark, spacing rhythm, RTL alignment, component consistency, icons and empty states. My test is the one in PRODUCT.md: does Lucid look premium, mature and calm? This is a re-test of my report from a few hours ago (`docs/qa/panels-r3/design-visual.md`), after the team ran `docs/qa/panels-r3/plan.json`.

## What I did

- Served the app locally and drove it with Playwright (Chromium, `locale: he-IL`, service workers blocked, reduced motion).
- Viewports: 390x844 with touch and `isMobile`, and 1440x900 with a mouse. Light and dark. Spot checks at 150% text (390) and in the English UI (1440).
- Onboarding through `#/start` at 390 light, 390 dark and 1440 light. I filled in the name, year 2008, goals, 20 minutes and "basics", accepted the terms, and reached the placement intro.
- Seeded learners at A1, A2 and B2. Then I visited every main route in four conditions (390/1440 x light/dark): today, path, review, practice, vocab, grammar, reading, listening, speaking, writing, writing/free, real-life, a scenario, expressions, conversations, games, progress, profile, settings, help and tutor.
- Lessons: I played `#/lesson/a1-03` (A1, 390 light and 1440 light) and `#/lesson/b2-02` (B2, 390 dark and 1440 light). I went through the intro and the explanation steps, then 4 to 8 exercises, answering wrongly on purpose, and used a second try and "לא יודע/ת".
- I played the word quiz to its results, made a picture match and a memory mismatch (390 light, 1440 dark).
- Review: I added the A1 words, then selected, checked and continued. Then I opened vocab with 172 words and expanded a row.
- Essay editor `#/writing/final-B2`: I chose a topic, typed 62 words, scrolled to the button and ran "בדיקה אוטומטית" (1440 light and dark, 390 light).
- Today "done": I set 10 minutes, did the lesson part to "לעצור כאן", and went back to Today.
- I measured things in the DOM (alignment, widths, font sizes, page heights, sidebar nav overflow, computed styles) and sampled pixel contrast from the screenshots.
- Screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels-retest/design-visual/shots/`. File names below are relative to that folder.
- A note on method: in Chromium, a full-page screenshot drops touch emulation, so the "Enter" keycaps reappear in those images. I judged touch-only behaviour from viewport screenshots only (`crop-mqvp.png` vs `crop-mqfull.png`).

## Verdicts on my earlier findings

| # | Earlier finding | Verdict | Fresh evidence (route, what I saw, file) |
|---|---|---|---|
| 1 | Hebrew glosses repeat full English sentences and come apart in RTL (major) | **fixed** | `#/lesson/a1-03`. The intro Hebrew now reads "אני יודע/ת לבנות משפטי שלילה עם don't ו-doesn't." and the English examples appear once, below it. The explanation's Hebrew paragraph has no English sentences. The listening hint reads "הקשיבו ל-don't: הדובר/ת לא אוכל/ת בשר, אבל כן אוכל/ת דגים." in order. (`L0-a1-03-390-light.png`, `L0-a1-03-1440-light.png`, `L1-a1-03-390-light.png`, `sheet-a1-c1.png`) |
| 2 | Expressions: item number swallowed into the English isolate (major) | **partly** | `#/expressions`, search "chill". The senses are now an `<ol>` (1. (פועל) לנוח, להירגע / 2. (תואר) רגוע, זורם / 3. ...), so the bug is gone. But the glosses are still 3 to 5 lines of cobalt per card ("Brilliant (UK)", "Cheers"), which is still the heaviest colour block on the page. The scenario's Hebrew description is 5 cobalt lines too. (`expr-chill-390.png`, `crop-expr-top.png`, `s390-d.png`) |
| 3 | English inside RTL cards has two or three alignments (major) | **partly** | Fixed on `#/path` (every English line ends at x=1046 at 1440), on Today plan rows and in scenario phrase cards (all left, whatever their length). Still broken in four places. (a) The `#/lesson/b2-02` intro at 1440: one-line can-dos sit right (457 to 1023) and the two-line can-do sits left (starts at 393), in the same card. (b) B2 exercise instructions: "Choose the correct option." is flush right, while the two-line "Your flatmate keeps playing loud music..." is flush left. (c) A vocab row expanded at 1440: the definition "used after a negative to make it stronger" starts at x=85, while the example "I can't cook at all." ends at x=1033. (d) English UI Today: the Hebrew gloss "צ'ק-אין: מזוודה במשקל עודף" floats mid-card (x 456 to 617). (`L0-b2-02-1440-light.png`, `sheet-b2-dark2.png`, `vocab-open-1440-dark.png`, `en-today.png`) |
| 4 | Essay editor: feedback appears ~1,100px above the view (major) | **fixed** | `#/writing/final-B2` at 1440. `aside.essay-side` is `position: sticky`, top 24, bottom 876 in a 900px viewport at scrollY 299. The checks sit beside the text, and a summary line under the button reads "דבר אחד לבדוק: אורך (חסרות 388 מילים). [לרשימה]". At 390 the view moves to the checks panel. (`essay2-1440-light.png`, `essay2-390-light.png`) |
| 5 | Three level-navigation patterns; endless hubs (major) | **partly** | At 390, A2: listening is 3,781px and vocab with 172 words is 2,009px, now compact rows that expand. Games is 1,818px and opens at the learner's level. Reading is still one open list of all 73 texts, 8,198px tall. It is ordered A2, B1, B2, C1, C2, then A1 and Pre-A1 at the bottom, with no accordion. Real-life is 4,885px and conversations 4,115px. (`reading-small.png`, `vocab-filled-390-light.png`, `s390-b.png`) |
| 6 | Primary CTAs glued to the content below (minor) | **fixed** | Today at 390 and 1440 has a clear gap of about 25px between "להתחיל: What are you doing?" and the first plan card. Welcome at 390 has a gap of about 30px above the check list. (`today-390-light-A2.png`, `today-1440-light-A2.png`, `welcome-390-dark.png`) |
| 7 | Welcome headline crushed at desktop (minor) | **fixed** | At 1440 "אנגלית, מהאות הראשונה ועד הטיעון הכי טוב שלכם." sets on 2 lines, and the subhead on 3. (`welcome-1440-light.png`) |
| 8 | Mobile rows squeeze the text column; English content smallest and faintest (minor) | **partly** | The Today plan text column is now 324px of a 358px card, and the time sits under the title. English can-dos are 15px in `--ink-2` (path, Today). The path rows at 390 still give the text 212 to 255px, because the number, the circle and the "הבא" tag take the rest. Real-life "כדאי להתחיל כאן" rows still give 215px, so "Check-in: an overweight bag" wraps to 2 lines. (`crop-path390.png`, `s390-b.png`, DOM widths) |
| 9 | Writing-lab stage cards: orphan numbers, two layouts (minor) | **fixed** | `#/writing` at 390: "4 משימות" is labelled, the round step numerals are distinct from the "A2" chips, there are outline chevrons, and every card has the same layout. (`crop-writing.png`) |
| 10 | Selection controls in four designs (minor) | **partly** | Onboarding goals now show a square check, minutes a round radio, and terms a styled check card aligned to the top. Profile goals use the same cards and the same labels ("טיולים ונסיעות לחו״ל"). Still native: the games "אתגר מהירות" checkbox (13px, vertically centred on a 4-line label, and it stays 13px at 150%) and the essay topic radios. (`ob2b-390-light.png`, `ob-terms-390-light.png`, `s390-c.png`, `crop-t150-games.png`, `essay0-1440-light.png`) |
| 11 | Segmented controls used as filters without structure (minor) | **partly** | The onboarding language control has equal halves. Expressions filters moved into a "סינון" sheet with a label for each row. The settings data buttons have equal widths. New problems in the same family are listed under N1 and N8 below: a collision at 150%, controls that wrap, and the conversations category grid. (`ob1-390-light.png`, `expr-filter-390.png`, `crop-settings-bottom.png`) |
| 12 | Review empty state drops the app shell (minor) | **partly** (accepted) | Kept bare by design (plan.deferred). It now has an icon in a keycap, an h2, the A1-words action and a "להיום" exit, centred. That works. The vocab empty state next to it has no icon and no A1 action, so the two empty states still differ. (`s390-a.png`, panels 1 and 2) |
| 13 | 150% text: icons and controls don't scale (minor) | **partly** | Fixed for the app chrome. At 150% the top-bar icons are 26px with labels "עזרה"/"הגדרות", the title "היום" shows in full, tab labels fit on one line ("לחיים"), and Today minutes is a 2x2 grid. Not fixed in Settings: the "הסברים בעברית" control overlaps "בלחיצה" and "כבוי" (see N1). The games checkbox does not scale either. (`s150.png`, `crop-t150-settings.png`) |
| 14 | Dark mode loses the graphite deck (minor) | **partly** | The deck is now lighter than the ground, with a 1px edge, and it reads as a separate surface. Sampled pixels give deck (22,27,32) on ground (11,15,19), only 1.11:1. The active pill on the deck is 1.18:1. It holds on a good screen but is weak on a dim laptop. (`practice-1440-dark-A2.png`, `today-390-dark-A2.png`) |
| 15 | Speed-bonus rules read like code (minor) | **fixed** | `#/games` has no rules paragraph. Speed is an opt-in card, and the results read "הניקוד: 2 × 10 = 20" left to right. (`sg1.png`, `sg2.png`) |
| 16 | Wrong-answer feedback is loud (minor) | **partly** | Lessons are fixed. The footer is a neutral surface with a 4px red accent bar and a cross icon, constrained to the 704px player at 1440. The wrong option has a cross glyph, and the "Enter" chips are gone on touch. The word game was left out: it still shows a pink box with a red "לא נכון" heading under a pink option. Lessons say "לא בדיוק", so the two now differ in both tone and words. (`P0c-a1-03-1440-light.png`, `sheet-a1-c1.png`, `wq-fb0-390-light.png`) |
| 17 | Small inconsistencies: heading subtitle, rail labels, disclosures, icons, table, Enter on touch (polish) | **fixed** | "בסיסי" now sits under "A2 • Elementary" on the same edge. "Pre-A1" stays on one line (12px). Help and "חובה לכלול (5)" use chevrons. Grammar has a checklist-book icon. The US/UK table is LTR and becomes stacked cards at 390. On touch there is no "Enter" keycap and Help has no "קיצורי מקלדת" item. (`path-1440-light-A2.png`, `en-today.png`, `s390-c.png`, `scn-table-m.png`, `crop-mqvp.png`) |

## New findings

### N1. Settings "הסברים בעברית": labels collide at 150% and wrap at 100% (major)

- **Where:** `#/settings`, 390, text size 150%.
- **What I saw:**
  - The five-segment control renders "חלקי בלחיצהכבוי": the labels "בלחיצה" and "כבוי" overlap and cannot be read.
  - At 100%, "לפי הרמה" already wraps to two lines while the other four stay on one, so the cells have uneven heights.
  - Today got the 2x2 fix (SC-8) but this control did not.
- **Who it hurts:** the people who chose 150% are exactly the ones who need this control to be readable.
- **Evidence:** `crop-t150-settings.png`, `s390-c.png` (panel 3).
- **Suggestion:** below about 30rem, or whenever the labels don't fit, render this as a vertical radio list using the onboarding radio cards. Or use a wrapping grid of equal cells, like the Today minutes control. Add a guard so segmented labels never shrink below their content.

### N2. Multi-line English is right-aligned (ragged start) in Hebrew-led screens (major)

- **Where:** `#/lesson/a1-03` intro and pitfall box (390 and 1440), `#/path` rows at 390, real-life rows at 390.
- **What I saw:**
  - English paragraphs of 2 to 4 lines are set `text-align: right`. An example is "I can make negatives with don't and doesn't: I don't eat meat. She doesn't work on Fridays.": at 390 the lines start at x=60, 60 and 205, and at 1440 "Fridays." sits alone on the right.
  - The same kind of text is left-aligned at B2, because English leads there. So whether a paragraph is right- or left-aligned depends on the level, and at B2 on the line count too (verdict 3).
  - Each line of LTR text should start on the same edge. A ragged start makes A1 readers hunt for the next line.
- **Evidence:** `L0-a1-03-390-light.png`, `L0-a1-03-1440-light.png`, `crop-path390.png`, alignment dump (A1 intro: `ta:right`, lastLineLeft 205 to 236; B2 intro: `ta:start`).
- **Suggestion:** keep "share the Hebrew edge" for English that is guaranteed to be one short line (titles, labels). Any English that can wrap should be a block, left-aligned, with `inline-size: 100%`, sitting under its Hebrew line. Decide this from the role of the text, never from whether it fits on one line.

### N3. Today "done": finished plan items fade below AA (minor)

- **Where:** `#/today` after finishing today's part (10-minute plan), 390 light.
- **What I saw:**
  - `.plan-item.done { opacity: 0.6 }` (css line 327) takes the item's can-do and its note ("I can describe what is happening now.", "החלק של היום הושלם...") to a sampled 2.9:1.
  - The "המשך: What are you doing?" title is at 5.0:1.
  - The blue "התוכנית להיום הושלמה" banner and the dashed "רוצים עוד?" extras are calm and good.
- **Evidence:** `done-today-after-full.png`, pixel sample (144,149,154) on (248,250,252).
- **Suggestion:** drop the opacity. Show "done" with the green check glyph (already there) and `--ink-2`/`--ink-3` text colours, which already pass.

### N4. Sort exercise with sentence-length items is cramped at 390, and its answer list doubles punctuation (minor)

- **Where:** `#/lesson/b2-02`, sort exercise (third/mixed/second conditionals), 390 dark.
- **What I saw:**
  - Two bins of about 160px hold centred sentences that wrap to 5 or 6 lines of two words each ("If I'd saved / more money, I / would have / gone on the / trip.").
  - After "לא יודע/ת", the answer footer lists "If I'd saved more money, I would have gone on the trip., If he hadn't broken his leg...". The sentence's own full stop plus the list comma give ".,".
  - The footer then fills about half the screen and scrolls.
- **Evidence:** `P1c-b2-02-390-dark.png` (4th panel of `sheet-b2-dark.png`).
- **Suggestion:** when items are longer than about 3 words, or the viewport is under 30rem, stack the bins vertically at full width with left-aligned items. Join the answer items as list items, not with commas.

### N5. Desktop sidebar at 1440x900 hides five destinations with no cue (minor)

- **Where:** every shell route at 1440x900, Hebrew and English UI.
- **What I saw:**
  - The deck nav has 13 items and scrolls internally (scrollHeight 866 vs clientHeight 608).
  - "מרכז האזנה / Listening" is cut at the bottom edge. Speaking, writing, the tutor and expressions are below it, and nothing shows that the list scrolls.
  - 1440x900 is a common laptop size.
- **Evidence:** `today-1440-light-A2.png`, `practice-1440-dark-A2.png`, DOM measure.
- **Suggestion:** tighten the item height (the bilingual items are about 58px), or group the labs under one collapsible "מעבדות" heading. At minimum add a fade at the bottom edge of the nav.

### N6. Selected state is almost invisible in dark segmented controls (minor)

- **Where:** `#/settings`, `#/progress` ("השבוע/החודש"), and every segmented control in dark mode.
- **What I saw:**
  - The selected segment (26,31,36) on the track (18,22,27) is 1.09:1, with no edge or shadow. Only the bolder weight tells you what is selected.
  - In light, the white segment has a shadow and a bottom edge, so it reads.
- **Evidence:** `s390-dark-a.png` (Settings panel), pixel samples.
- **Suggestion:** in dark mode give the selected segment a 1px `--key-edge` border plus the key "skirt", or a lighter fill (about 0.30 L), so the state reaches 3:1 as a non-text indicator.

### N7. Segmented controls that wrap into ragged grids (minor)

- **Where:** `#/vocab` at 390 ("172 הכול / 3 לחזרה עכשיו / 172 בלמידה" and then "0 ידועות" alone on row 2), `#/conversations` (9 categories in 3 rows inside one grey track, with a half-width "כל הרמות/לרמה שלי" control under it), and the expressions filter sheet ("לא רשמי מאוד" wraps).
- **What I saw:** a segmented control that wraps stops reading as one control and starts reading as a broken table.
- **Evidence:** `vocab-filled-390-light.png`, `s390-d.png` (conversations), `expr-filter-390.png`.
- **Suggestion:** a segmented control should hold at most 3 or 4 short items. For categories use a horizontally scrolling chip row or a select. For vocab, drop the counts into a second line inside each segment, or use 2x2 cells.

### N8. Two selected-card colours in one onboarding step (polish)

- **Where:** `#/start`, step 2, 390 light.
- **What I saw:** a chosen goal card is tinted blue with a blue check. The chosen minutes card ("רגיל") is tinted grey with a blue radio. These are two selected styles on one screen. The Settings "קצב רגוע" card uses the blue one.
- **Evidence:** `ob2b-390-light.png`, `s390-c.png`.
- **Suggestion:** use one selected treatment for all choice cards (the blue tint plus indicator).

### N9. Player headers and footers differ between lesson, review, game and scenario (polish)

- **Where:** `#/lesson/*`, `#/review`, `#/games/A1/1`, `#/scenario/*` (practice tab), at 390.
- **What I saw:**
  - **Counter placement:**
    - lesson: "5 מתוך 16" centred under the bar
    - review: "1 מתוך 8" inline at the left of the bar
    - game: a score badge plus a centred counter
  - **Footer:**
    - lesson and review: a full-width orange key on its own row
    - scenario practice: a small grey "בדיקה" key at the far left with a hint line
- **Evidence:** `sheet-a1-c1.png`, `srv.png`, `sg1.png`, `scn-tab2-m.png`.
- **Suggestion:** one player-top component (bar, then the counter under it, then an optional score at the inline-end) and one footer layout for every check-then-continue flow.

### N10. Secondary "לא עכשיו / Not now" looks heavier than the action next to it (polish)

- **Where:** `#/today`, the "להוסיף את המילים של A1" card, light, Hebrew and English UI.
- **What I saw:** "לא עכשיו" has a grey fill and a dark border, so it looks pressed or selected. The real action, "להוסיף את המילים של A1", is a plain white key.
- **Evidence:** `today-1440-light-A2.png`, `en-today.png`.
- **Suggestion:** make "לא עכשיו" a ghost or text button, and the add action the normal key.

### N11. Essay editor: an orphan level chip, repeated "בעברית" chips, English category tags (polish)

- **Where:** `#/writing/final-B2` at 1440.
- **What I saw:**
  - A lone "B2" chip floats above the side panel at the top-left (about x 70, y 142), tied to nothing.
  - A "בעברית" chip repeats under the prompt, under each of the 3 topics and under each requirement: 8 or more identical chips.
  - The connector categories in the checks panel are untranslated English tags ("addition", "contrast", "cause") in the Hebrew UI.
  - The topic list still uses native radios (verdict 10).
- **Evidence:** `essay0-1440-light.png`, `essay2-1440-light.png`.
- **Suggestion:** put the level chip into the page meta line. Use one "הכול בעברית" toggle, as the B2 lesson does. Use Hebrew category labels (תוספת / ניגוד / סיבה / רצף / סיכום).

### N12. Games hub at desktop: stage keys float mid-row; memory backs are loud (polish)

- **Where:** `#/games` at 1440 dark, and `#/games/memory/1`.
- **What I saw:**
  - In the level rows (Starter to Advanced), the 1-2-3 stage keys sit at x≈660 to 808. They float in the middle of an 1,088px row with about 600px of empty space beside them.
  - The memory card backs are a dense blue diagonal hatch on all 12 cards. It is the same pattern that marks "placed-out" levels on the rail, and it is the busiest surface in the games.
- **Evidence:** `gh-1440-dark.png`, `sg2.png` (memory), `sg-dark.png`.
- **Suggestion:** pin the stage keys to the inline-end edge, or cap the rows at about 40rem. Give the card backs a quiet keycap surface with a small Lucid mark.

### N13. Practice labs grid: uneven tiles and over-wide recommended cards (polish)

- **Where:** `#/practice` at 1440.
- **What I saw:**
  - The new 2-column grid is the right call. But "משחקי מילים" wraps its description to 2 lines (tile 104px) while "אוצר מילים" beside it is 78px, so row 1 is ragged.
  - The two "מומלץ עכשיו" cards are 1,088px wide, with the chevron about 1,000px from the text.
- **Evidence:** `practice-1440-light-A2.png`.
- **Suggestion:** use `align-items: stretch` on grid rows with a min-height. Cap the recommended cards at the content measure (about 44rem), or put them two across.

## What I liked (keep it)

- **The calm feedback footer.** It has a neutral surface, a 4px accent bar in red, green or amber at the inline-start, an icon, the answer in bold, and "למה?" folded away. It is constrained to the player at 1440. The second-try state "עוד לא. אפשר לתקן בעצמכם" in amber with "להציג את התשובה" is exactly the brand. (`P0c-a1-03-1440-light.png`, `sheet-a1-c2.png`)
- **Hebrew glosses that translate the claim.** The a1-03 intro and explanation now read cleanly in both languages. This was the most important fix. (`L0-a1-03-1440-light.png`)
- **Today.** The rows are wide and the start key has room around it. The "done" state uses a blue banner with "רוצים עוד? לא חובה. כל אחד מאלה עומד בפני עצמו." and dashed optional extras. There is no guilt and no streak. (`done-today-after-full.png`)
- **The sticky essay checks with a one-line summary under the button.** This is a real desktop writing tool now. (`essay2-1440-light.png`)
- **Large text done right in the chrome.** At 150% the top bar is labelled with icons at 26px, the tab labels are short ("לחיים"), and minutes is a 2x2 grid. (`s150.png`)
- **Compact vocab rows** (word, Hebrew and due date in one line, expanding on tap), the **expressions filter sheet** with a label on each row, and the **writing-lab cards** with labelled counts and step numerals.
- **The part-end screen.** "החלק של היום הושלם" sits above an honest "0 מתוך 4 נכונות בניסיון הראשון" and the lesson's words as chips, with "לעצור כאן" as the primary key. It is calm and truthful. (`done-end1.png`)
- **Review now selects, then checks.** It uses the same option cards and footer as lessons. (`srv.png`)
- Everything I praised last time is intact: the keycap identity, the bilingual sidebar labels, the token discipline, the level rail, the honest AI-off copy and Settings' structure.

## Top 3 wishes

1. **Finish the bilingual alignment rule, and base it on role, not length.**
   - Any English that can wrap is a left-aligned LTR block. Only guaranteed one-line labels share the Hebrew edge.
   - Apply this to lesson intros at every level, exercise instructions, vocab details and the English UI glosses.
   - This closes verdict 3 and N2.
2. **Bring the last outliers onto the shared components.**
   - word-game feedback onto the calm footer
   - the games checkbox and essay radios onto the check and radio cards
   - one selected style
   - segmented controls that never collide or wrap (Settings at 150%, vocab, conversations)
   - a visible dark-mode selected state
   - faded "done" items without opacity
3. **One level browser for the remaining long hubs, and a desktop nav that fits.**
   - Reading (8,198px), real-life and conversations should use the grammar/listening accordion opened at the learner's level.
   - The 1440x900 sidebar should show all destinations without a hidden scroll.
