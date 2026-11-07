Simulated review (AI persona), not real user research.

# Panel r3: visual design lead

## Who I am

I play the design team's visual design lead. I own visual hierarchy, Hebrew and Latin typography set together, colour and contrast in light and dark, spacing rhythm, RTL alignment, how consistent the components are, icons, and empty states. My test for Lucid is the one in PRODUCT.md: does it look premium, mature and calm?

## What I did

- Served the app locally and drove it with Playwright, Chromium, `locale: he-IL`.
- Viewports: 390x844 (touch, mobile) and 1440x900. Both in light and dark.
- Spot checks: text size 150% at 390, and the English UI at 1440.
- Onboarding as a new learner through `#/start` at 390 light and dark. I filled in the name, the year (2008), two goals, 20 minutes and "basics", accepted the terms, and arrived at the placement intro.
- Seeded learners at A2 (main pass), A1 (games and the A1 lesson) and B2 (essay editor and B2 lesson). Then visited:
  - welcome, today, path, `#/lesson/a1-03` and `#/lesson/b2-02` (intro, explanation, two exercises with feedback)
  - review: empty, then filled after "להוסיף את המילים של A1"
  - practice, vocab, grammar, reading, listening, speaking, tutor
  - games hub and all three games, played (wrong answers, results screen, picture mismatch, memory flip)
  - real-life and `#/scenario/rl-airport-checkin-overweight`, expressions
  - writing, writing/free, writing/final-B2 (typed a 59-word essay and ran "בדיקה אוטומטית")
  - progress, profile, settings, help
- Measured a few things in the DOM: gaps, column widths, computed font sizes, page heights, horizontal overflow. I also computed WCAG contrast from the OKLCH tokens in `css/app.css`.
- Screenshots are in `/tmp/claude-0/-home-user-desktop-tutorial/f727621b-9425-5af4-aab9-514fbd6eeda1/scratchpad/panels/design-visual/shots/`. File names below are relative to that folder.

## What works (keep it in any redesign)

- **The keyboard metaphor is a real identity.** Keycap buttons have a bottom "skirt". There is one orange Enter-key colour for the primary action, a graphite deck for navigation, and the welcome keyboard shows English and Hebrew legends on the same keys. It is distinctive and adult. There is no mascot and no confetti. (`welcome-390-light.png`, `today-1440-light-A2.png`)
- **Bilingual navigation labels in the desktop sidebar.** Each item has a Hebrew label with a small English label under it ("המסלול / Path"), and the English UI mirrors this. It is quiet bilingual scaffolding. (`practice-1440-light-A2.png`, `today-1440-light-A2-en.png`)
- **Token discipline and contrast.**
  - One cool neutral ramp, one accent, OKLCH tokens with a full dark set.
  - Computed contrast: faint text 5.4:1 on ground and 5.0:1 on locked tiles in light; 6.8 to 7.7:1 in dark.
  - Enter button ink on orange: 7.1:1.
  - No horizontal overflow on any route I measured at 390.
- **The games look calm and crafted.**
  - Answer options are keycaps with number keys.
  - Picture tiles use one consistent line-icon set.
  - The results screen celebrates without shouting: the green tag "השיא הראשון שלך בשלב הזה".
  - (`games_pictures_1-390-light-A1.png`, `wq-results-390-light.png`)
- **Fading Hebrew works visually at B2.** The B2 explanation is English-first with clean LTR tables and a comfortable measure of about 700px. The "עב" on-tap chips are a quiet way to reach Hebrew. (`step1-b2-02-1440-light.png`, `essay-1440-light-checked.png`)
- **Level rail.** The hatched segments for "placed out" levels and the outlined current level read well at a glance. (`path-390-light-A2.png`)
- **Honest AI-off states.** The tutor and free writing explain plainly that AI is not available and list what still works. (`tutor-1440-light-A2.png`)
- **Settings** is the cleanest screen in the app:
  - every control is a segmented control with a one-line help text under it
  - the destructive action is red with a trash icon and is separated from the others
  - (`vp-settings-390-y0.png`)
- **Copy that matches the brand.** "אין רצף שנשבר: יום חופש לא מוחק שום דבר." on onboarding step 2.

## What does not work

### 1. Hebrew glosses repeat whole English example sentences and come apart in RTL (major)

- **Where:** `#/lesson/a1-03` (intro "בסוף השיעור", explanation step, feedback hint), at 390 and 1440, light and dark.
- **What I saw:**
  - Each Hebrew gloss contains the full English examples again, and the English is wrapped as one isolated run that breaks across lines.
  - Line 2 of the first can-do reads "doesn't: I don't eat meat. She doesn't-ו" and line 3 reads ".work on Fridays".
  - The third can-do ends with ".No, she doesn't".
  - The explanation step does the same. Its Hebrew paragraph starts with the three English example sentences, and they then appear again in the English paragraph below.
  - The feedback sheet hint "הקשיבו ל-don't: I don't eat meat – …" also wraps into a broken order.
- **Who it hurts:** these are exactly the A1 learners who rely on the Hebrew line.
- **Evidence:** `crop-a103-cando.png` (2x crop), `lesson_a1-03-1440-light-A2.png`, `step1-a1-03-390-light.png`, `step2-fb-a1-03-390-light.png`.
- **Suggestion:**
  - The Hebrew gloss translates only the claim, for example "אני יודע/ת לבנות שלילה עם don't ו-doesn't".
  - The English examples appear once, on their own LTR line, each sentence isolated separately and never as one long run.

### 2. Expressions: numbering swallowed into the English run (major)

- **Where:** `#/expressions`, at 390 and 1440.
- **What I saw:**
  - The "Chill" gloss renders "(My manager is really chill. 3" because the markup is `<bdi>My manager is really chill. 3</bdi>)`: the item number "3" sits inside the English isolate.
  - "Bummer" reads "What a .משהו מאכזב או מבאס" on line 1.
  - The glosses are 3 to 5 lines of cobalt text, the heaviest block of colour on the page.
- **Evidence:** `vp-expr-390-y1500.png`, `expressions-1440-light-A2.png`, DOM dump of the "Chill" entry.
- **Suggestion:**
  - Split numbered senses into list items.
  - Never let an isolate cross a number or a closing bracket.
  - Put each English usage example on its own LTR line in ink colour, not cobalt.

### 3. English inside RTL cards has two or three alignments at once (major)

- **Where:** `#/path` and `#/today` at 1440, `#/scenario/...`, `#/vocab`, `#/writing/final-B2`.
- **What I saw:**
  - **Path row:** the English title is flush right next to the number, and the English can-do is flush left at x≈70, roughly 850px away on the same row (`path-1440-light-A2.png`).
  - **Today:** "I can describe what is happening now." starts at x=488 while the lines above and below end at x=1057 (`today-1440-light-A2.png`).
  - **Scenario phrase cards:** alignment flips with length. "What's the excess baggage fee?" (one line) sits right; "Is there any flexibility on the weight?" (two lines) sits left (`vp-scn-390-y1000.png`).
  - **Lesson headings:** the a1-03 h1 is flush right, the b2-02 h1 (two lines) is flush left (`lesson_a1-03-390-light-A2.png`, `lesson_b2-02-390-light-A2.png`).
  - **English UI:** the Hebrew gloss floats mid-card (`today-1440-light-A2-en.png`).
- **Cause:** `.legend` is an `inline-grid` with `justify-items: start`, so short English shrink-wraps to the right and long English fills the line and aligns left. At least eight per-component overrides patch this (css lines ~597, 601, 695, 707-708, 738-739, 771, 790, 824).
- **Suggestion:** one rule. Inside a Hebrew card, English blocks are `display:block` with one chosen alignment everywhere. My recommendation: right-aligned to share the Hebrew edge for titles, and left-aligned only inside a dedicated LTR content block such as a reading passage, table or example list.

### 4. Essay editor: feedback appears where you can't see it (major)

- **Where:** `#/writing/final-B2` at 1440.
- **What I saw:**
  - I typed 59 words and pressed "בדיקה אוטומטית". The page was scrolled to y=1092.
  - The checks panel stays at the top-left, about 1,100px above the button. It shows the word-count warning, the argument structure and the connector categories.
  - In view I only had the one-line "הבדיקה לא מצאה בעיות מוכרות." and an empty left column next to the textarea.
  - `essay-side` computes to `position: static`.
- **Evidence:** `essay-1440-light-checked-vp.png`, `essay-1440-light-checked.png`.
- **Suggestion:** make the side panel `position: sticky; top: var(--s5)` at ≥ 64rem, so the checks stay beside the text being revised. At 390 the panel sits below the button, which works (`essay-390-light-checked-vp.png`).

### 5. Three different level-navigation patterns, and some hubs are endless (major)

- **Path:** level tabs.
- **Grammar and speaking:** accordions with the learner's level open (`grammar-1440-light-A2.png`, `speaking-1440-light-A2.png`). This is the best of the three.
- **Listening:** all 132 exercises in one list starting at Pre-A1, even for an A2 learner. 14,486px tall at 390 (`vp-listen-1440-y0.png`).
- **Vocab:** 172 fully expanded cards (definition, example, collocations), 49,121px at 390 (`vocab-filled-390-light.png`, `vocab-y900-390.png`).
- **Games:** 7 level cards × 3 stages, most of them locked tiles, 3,915px at 390 (`games-390-light-A2.png`).
- **Suggestion:**
  - Use the grammar accordion everywhere, opened at the learner's level, with compact rows.
  - Give vocab a compact list (word, Hebrew, due) that expands on tap.
  - Collapse locked game levels into one line ("5 רמות נוספות נפתחות בהמשך").

### 6. Primary CTAs are glued to the content below them (minor)

- **Today:** the "להתחיל: What are you doing?" button bottom is at 348.9px and the plan list top is at 348.9px: zero gap. The orange key looks fused to the first card (`today-390-light-A2.png`, `today-1440-light-A2.png`).
- **Welcome:** the "בואו נתחיל" bottom (444.4px) touches the check list top (444.4px) (`welcome-390-light.png`).
- **Suggestion:** `margin-block-end: var(--s5)` on the start bar and the hero CTA. The rest of the spacing rhythm (quarter-unit steps) is good, which makes these two stand out.

### 7. Welcome headline crushed at desktop (minor)

- **Where:** `#/` at 1440.
- **What I saw:** the h1 column is 287px wide at 54.4px, so "אנגלית, מהאות הראשונה ועד הטיעון הכי טוב שלך." breaks into five lines of 1 to 2 words. Meanwhile the keyboard illustration takes about 640px (`welcome-1440-light.png`).
- **Suggestion:** give the text column at least 30rem, or let the headline span above both columns; a measure of about 12-16 Hebrew words per line for the subhead.

### 8. Mobile list rows squeeze the text column, and English content is the smallest, faintest text (minor)

- **Today plan item at 390:**
  - widths are icon 42 / text 191 / time 43 px in a 358px card
  - the English can-do wraps and the Hebrew note runs to 4-5 lines
- **Real-life rows:** a 215px text column.
- **Text size:** the English can-do on path rows (`.lesson-row .meta`) and on real-life rows is 13px in `--ink-3`. That is the smallest and faintest style in the app, used for the target-language content.
- **Evidence:** `today-390-light-A2.png`, `vp-rl-390-y0.png`, computed sizes.
- **Suggestion:**
  - Below 30rem, move the time or level chip under the title instead of into a side column.
  - Set English outcome lines at `--t-sm` (15px) in `--ink-2`.

### 9. Writing-lab stage cards: orphan numbers and two layouts (minor)

- **Where:** `#/writing` at 390.
- **What I saw:**
  - Stage 1 and stage 9 wrap differently from the others: the number chip moves to its own row above the title, and a bare "4" sits alone on the bottom line.
  - Stages 2 to 8 show an unlabelled "3", "2" or "5" on the left.
  - The stage number uses the same `.tag.level` keycap chip as CEFR levels ("A2"), so "1" and "A2" look like the same kind of thing.
  - There is no chevron, so it is unclear that the stages expand.
- **Evidence:** `vp-writing-390-y0.png`, `writing-390-light-A2.png`.
- **Suggestion:** label the count ("4 משימות"), keep the number chip inline, use a distinct numeral style for steps, and add the outline chevron used elsewhere.

### 10. Selection controls are four different designs (minor)

- **Onboarding goals:** multi-select, but the cards only tint blue when chosen, with no check indicator. The single-choice minutes cards look identical.
- **Profile goals:** native 13px browser checkboxes inside the cards.
- **Onboarding terms:** the native checkbox is centred on a 6-line paragraph.
- **Essay topics:** native radios.
- **Labels also drift:** "טיולים ונסיעות לחו״ל" in onboarding vs "טיולים" in profile; "בגרות, פסיכומטרי ולימודים אקדמיים" vs "מבחנים ולימודים".
- **Evidence:** `ob2b-390-light.png`, `ob4-390-light.png`, `profile-390-light-A2.png`, `writing_final-B2-1440-light-A2.png`.
- **Suggestion:** one keycap-style check indicator (square, multi) and radio indicator (round, single), top-aligned to the first line, and one label set.

### 11. Segmented controls used as filters without structure (minor)

- **Onboarding:** the "שפת הממשק" control spans the full width, but its two segments are content-width, leaving an empty grey track (`start-390-light.png`, `start-1440-light.png`). On the welcome page the same choice is compact.
- **Expressions:** four unlabelled segmented controls stacked in decreasing widths (register, region, level, sort). They form a staircase that looks accidental (`vp-expr-390-y0.png`).
- **Settings, "המידע שלך":** three buttons of three widths step down the page (`vp-settings-390-y2500.png`).
- **Suggestion:** equal-width segments when a control is full width; a small label per filter row (or one "סינון" sheet); a uniform-width button stack for the data actions.

### 12. Review empty state drops the whole app shell (minor)

- **Where:** `#/review` with no due words.
- **What I saw:**
  - No sidebar, no top bar and no tab bar at 390 or at 1440: a blank page with three centred lines at the top.
  - For an A2 learner who placed out of A1 it says "מילים נכנסות לחזרה כשמשלימים שיעור.", while Today offers "להוסיף את המילים של A1".
- **Evidence:** `review-1440-light-A2.png`, `review-390-light-A2.png`.
- **Suggestion:** keep the shell, use the same empty-state layout as other hubs (an icon in a keycap, a title, one line), and offer the A1 words action here too.

### 13. 150% text: icons and controls don't scale with it (minor)

- **What I saw at 390, `text_size: 150`:**
  - the minutes control on Today wraps into 3+1 segments
  - the tab label "אנגלית לחיים" breaks onto two lines
  - the top-bar title truncates to "אנגלית ל…"
  - header and tab icons stay about 16-20px next to 26px titles
- **Evidence:** `today-390-light-A2-t150.png`, `real-life-390-light-A2-t150.png`.
- **Suggestion:** size icons in `em`/`rem`; let segmented controls scroll horizontally or become a select when they don't fit; shorten tab labels at large text ("לחיים").

### 14. Dark mode loses the graphite deck (minor)

- **What I saw:** the dark deck (oklch 0.12) against the dark ground (0.165) is 1.05:1. The sidebar, the mobile tab bar and the welcome keyboard frame melt into the background. In light, the deck contrast is 14.5:1 and it is the signature element.
- **Evidence:** `today-1440-dark-A2.png`, `welcome-390-dark.png`, `vp-today-390-dark-y0.png`.
- **Suggestion:** lift the dark deck to about 0.21-0.23 with a 1px `--key-edge` border, or make the ground darker than the deck. Keep the light theme as it is.

### 15. Speed-bonus rules read like code and scramble on mobile (minor)

- **Where:** `#/games` banner.
- **What I saw:** "בונוס מהירות לכל תשובה נכונה: 3s +5, 6s +3, 10s +1; בהקלדה: 8s +5, 15s +3, 25s +1." At 390 it wraps to "10s +1 :8s +5, 15s +3, 25s +1; בהקלדה." with the period on the far left.
- **Evidence:** `crop-games-banner.png`.
- **Suggestion:** a 3-row mini table, for example "עד 3 שניות · +5", with Hebrew units and one isolate per value.

### 16. Wrong-answer feedback is loud for a calm brand (minor)

- **Where:** lesson feedback, word quiz feedback.
- **What I saw:**
  - The feedback sheet is a full-width pink/red panel with a red heading. At 1440 it spans the whole viewport while the content is 700px wide.
  - In the quiz, the wrong option, the feedback box and the heading are all red.
  - The selected wrong option also keeps a blue number chip inside a red card.
- **Evidence:** `step2-fb-b2-02-1440-light.png`, `wq-feedback-390-light.png`, `step2-fb-a1-03-390-light.png`.
- **Suggestion:** a neutral surface with a red accent bar and icon, constrained to the content width. Keep the red tint only on the chosen option.

### 17. Small inconsistencies in level headings, rail labels, disclosures and icons (polish)

- **Level headings:** in "Elementary • A2" the Hebrew subtitle "בסיסי" is 49px from the heading's right edge (subtitle right 1091px, h2 right 1140px). Same on listening and grammar (`path-1440-light-A2.png`).
- **Rail labels:** "Pre-A1" breaks into "Pre-" / "A1" in the Today side card and in the English UI. CSS line ~754 sets `white-space: normal`, overriding the `nowrap` above it. The labels are 11.2px (`today-1440-light-A2.png`).
- **Disclosures:** Help and "חובה לכלול (5)" use the browser's filled triangles ◀ ▼, while every other disclosure uses the 1.75-stroke outline chevron (`help-390-light-A2.png`).
- **Grammar icon:** Grammar lab uses code braces "{ }", which reads as a developer tool (`practice-1440-light-A2.png`).
- **Table direction:** the US/UK table in scenarios runs RTL (US column first, English description last), while lesson grammar tables run LTR (`scenario_rl-airport-checkin-overweight-1440-light-A2.png` vs `step1-a1-03-390-light.png`).
- **Enter hint on touch:** the "Enter" keycap hint on the lesson buttons also shows on a touch phone with no keyboard (`lesson_a1-03-390-light-A2.png`).

## Top 3 wishes

1. **One bilingual text component.** It would have:
   - one alignment rule for English inside Hebrew layouts
   - a gloss policy: Hebrew translates the claim, English examples appear once on their own LTR line
   - isolation that never crosses numbers, brackets or line ends

   This fixes findings 1-3 and most of what makes some screens feel unfinished.
2. **One level-browser pattern across hubs.** An accordion opened at the learner's level, compact rows, and labelled filters. Use it in listening, reading, vocab, games and expressions, so no hub becomes a 14,000-50,000px scroll.
3. **Desktop and dark mode that hold the brand.**
   - a sticky essay feedback panel
   - a wider welcome headline
   - a 2-column practice grid instead of 1,090px cards holding two short lines
   - a dark graphite deck that is still visibly a deck
