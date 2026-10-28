---
name: HG OS
description: The studio's own CRM, a calm, light, dense working tool in Hebrew where the next action and the money read first.
colors:
  brand: "#2D4BE0"
  brand-hover: "#2440C9"
  brand-soft: "#ECEFFD"
  brand-ink: "#FFFFFF"
  hg-signal: "#FF4F1A"
  money: "#087A4E"
  money-soft: "#E6F4EC"
  warn: "#9A5800"
  warn-soft: "#FDF3E1"
  danger: "#C62E2E"
  danger-soft: "#FCECEC"
  bg: "#F4F5F7"
  surface: "#FFFFFF"
  surface-2: "#F8F9FA"
  surface-3: "#EEF0F3"
  ink: "#16181D"
  ink-2: "#3E4451"
  ink-3: "#5C6372"
  line: "#E2E5EA"
  line-2: "#CBD0D8"
  field-border: "#8A909C"
  rail: "#121317"
  rail-2: "#1F2127"
  rail-3: "#2A2D35"
  rail-ink: "#B9BDC7"
  rail-ink-strong: "#FFFFFF"
  paper: "#FFFFFF"
  paper-ink: "#111111"
  brand-dark: "#7D93FF"
  brand-hover-dark: "#98AAFF"
  brand-soft-dark: "#232B4D"
  brand-ink-dark: "#0E1014"
  money-dark: "#45CC92"
  money-soft-dark: "#17302A"
  warn-dark: "#F2B24C"
  warn-soft-dark: "#36290F"
  danger-dark: "#FF7B7B"
  danger-soft-dark: "#3A1E22"
  bg-dark: "#0E1014"
  surface-dark: "#16191F"
  surface-2-dark: "#1B1F26"
  surface-3-dark: "#232831"
  ink-dark: "#E8EAEF"
  ink-2-dark: "#BAC0CB"
  ink-3-dark: "#9EA5B2"
  line-dark: "#2A2F38"
  line-2-dark: "#3A404B"
  field-border-dark: "#6E7685"
  rail-dark: "#0A0B0E"
  rail-2-dark: "#16181D"
  rail-3-dark: "#20232A"
typography:
  display:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  kpi:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "23px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  headline:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  subtitle:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  button:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  body-sm:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  caption:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  table-head:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.5
  badge:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
  micro:
    fontFamily: "Heebo, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'tnum' 1"
rounded:
  xs: "4px"
  md: "8px"
  lg: "14px"
  pill: "99px"
spacing:
  sp-1: "4px"
  sp-2: "8px"
  sp-3: "12px"
  sp-4: "16px"
  sp-5: "20px"
  sp-6: "24px"
  sp-8: "32px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-primary-hover:
    backgroundColor: "{colors.brand-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-secondary-hover:
    backgroundColor: "{colors.surface-2}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-ghost-hover:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
  button-soft:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "30px"
    padding: "0 10px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#FFFFFF"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 14px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    size: "34px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 10px"
  top-search:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "36px"
    width: "440px"
  rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    width: "224px"
  nav-item:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: "38px"
    padding: "0 10px"
  nav-item-hover:
    backgroundColor: "{colors.rail-2}"
    textColor: "{colors.rail-ink-strong}"
  nav-item-active:
    backgroundColor: "{colors.rail-3}"
    textColor: "{colors.rail-ink-strong}"
  top-bar:
    backgroundColor: "{colors.surface}"
    height: "56px"
    padding: "0 24px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
  panel-head:
    typography: "{typography.subtitle}"
    height: "50px"
    padding: "0 16px"
  kpi-cell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.kpi}"
    padding: "14px 16px"
  act-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "10px 16px"
  task-check:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    size: "20px"
  task-check-done:
    backgroundColor: "{colors.money}"
    textColor: "#FFFFFF"
  table-head:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-3}"
    typography: "{typography.table-head}"
    height: "38px"
    padding: "0 12px"
  table-row:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    height: "46px"
    padding: "0 12px"
  table-row-selected:
    backgroundColor: "{colors.brand-soft}"
  badge:
    backgroundColor: "hsl(220 12% 94%)"
    textColor: "hsl(220 12% 29%)"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    height: "22px"
    padding: "0 8px"
  badge-brand:
    backgroundColor: "hsl(230 70% 94%)"
    textColor: "hsl(230 70% 29%)"
  badge-money:
    backgroundColor: "hsl(152 55% 94%)"
    textColor: "hsl(152 55% 29%)"
  badge-warn:
    backgroundColor: "hsl(36 90% 94%)"
    textColor: "hsl(36 90% 29%)"
  badge-danger:
    backgroundColor: "hsl(0 70% 94%)"
    textColor: "hsl(0 70% 29%)"
  tab:
    textColor: "{colors.ink-3}"
    typography: "{typography.button}"
    padding: "10px 12px"
  tab-active:
    textColor: "{colors.ink}"
  stage-path:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.md}"
    padding: "3px"
  stage-current:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.brand-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "34px"
  stage-won-current:
    backgroundColor: "{colors.money}"
    textColor: "#FFFFFF"
  board-column:
    backgroundColor: "{colors.surface-3}"
    rounded: "{rounded.md}"
    width: "280px"
  deal-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  dialog:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "10px 8px 10px 14px"
  paper:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.xs}"
    padding: "48px 56px"
    width: "820px"
---

# Design System: HG OS

## Overview

**Creative North Star: "The Ink-Framed Desk"**

HG OS is the category-standard CRM played straight, at the finish level of the best of the category. A near-black ink rail frames a light grey room; on it lie white work surfaces, each one a panel of dense rows. The owner opens it between meetings, and the screen answers "what do I do now?" before it shows any number: a greeting, one strip of figures, then the day's actions as rows, each with its due state in the circle at the row's start and call, WhatsApp and log at the row's end.

The system is calm by construction. Ink and grey carry almost everything; one restrained blue marks what can be pressed or what is selected; green, amber and red appear only where they mean money, attention or failure. Structure comes from hairlines, not boxes inside boxes, and shadows are low and soft enough to read as paper on a desk rather than cards floating in space. HG's own orange is a spark, not a theme: it lives on the logo mark and the current page's icon in the rail, nowhere else.

Everything is Hebrew and right-to-left first. Layout is written in logical properties, so the rail sits on the right and rows read from the right; numbers, phones, emails and document numbers are left-to-right islands that stay right-aligned inside RTL text. Light and dark themes are both first-class: they follow the device by default and can be forced either way. It refuses the patched look: no blue record links, no stack of separate cards where a list of rows belongs.

**Key Characteristics:**
- Near-black ink rail on the inline start (right), white top bar, light neutral ground, white panels.
- One blue for actions and selection; green, amber and red only as meaning.
- Heebo throughout on a tight 1.2 scale from a 14px body; tabular numerals for every figure.
- 8px corners, 1px hairlines, low soft shadows; pills for status, circles for task checks.
- Dense rows inside one surface over grids of cards; the next action and the money read first.

## Colors

A neutral grey-and-ink palette with one working blue and three meaning colours, mirrored by a dark theme that keeps every role.

### Primary
- **Working Blue** (brand): primary buttons, focus rings, the active tab underline, selected table rows and pills, the current stage in the stage path, progress and funnel bars, the caret and text selection, and in-progress statuses. Hover deepens to brand-hover. Its soft tint (brand-soft) backs selected rows, active filter chips, the active tab count and the top bar's "ליד חדש" soft button.

### Secondary
- **Collected Green** (money): money and won only. Closed revenue figures, positive deltas, the won column and won stage, done task circles, money-in chart bars, completed onboarding steps.
- **Attention Amber** (warn): "no next step", stuck deals, due today and late today, backup and data warnings, the amber task circle.
- **Overdue Red** (danger): overdue tasks and the red task circle, errors and invalid fields, destructive buttons and menu items, the lost stage, and money-out bars (mixed to 65% with the surface).

### Tertiary
- **HG Signal Orange** (hg-signal, #FF4F1A, from hgpro.io): the logo mark's square and the current nav item's icon in the rail. Nothing else.

### Neutral
- **Desk Grey** (bg): the page ground behind every panel and the sign-in screen.
- **Work White** (surface): panels, top bar, inputs, buttons, table cells, deal cards, dialogs.
- **Shade** (surface-2): table header row, row hover, search field at rest, dialog footer.
- **Well** (surface-3): board columns, segmented control track, stage path track, icon circles, ghost hover, counts.
- **Ink** (ink), **Ink 2** (ink-2) and **Ink 3** (ink-3): primary text and record names; secondary text and icons; labels, meta, placeholders and table headers.
- **Hairline** (line) and **Hairline Strong** (line-2): row dividers and panel borders; button borders, link underlines, scrollbars.
- **Field Edge** (field-border): input borders at rest, the empty task circle and secondary button hover border.
- **Rail Ink** (rail, rail-2, rail-3, rail-ink, rail-ink-strong): the side rail's ground, hover and active fills, and its two text tones.
- **Paper** (paper, paper-ink): printed documents, black on white in every theme.

Dark theme keeps the same roles with the `-dark` values: the ground drops to near-black, the blue lifts to a lighter periwinkle with dark text on it, the rail goes almost to black, and toasts and the bulk-selection bar switch from ink to the raised surface (surface-3) with a hairline-strong border.

### Named Rules
**The One Blue Rule.** Blue means "press this" or "this is selected". It is never decoration and never the colour of a record's name.

**The Meaning-Only Rule.** Green is money and won; amber is "no next step", late or needs attention today; red is overdue, error, destructive or lost. Everything else is ink and grey. Status badge hues come from product data in js/core/model.js: the sky and indigo hue tokens resolve to the brand hue and violet and teal resolve to slate, and green on non-money statuses ("מתאים", "גבוהה", "לקוח") is accepted product data, not precedent for new colour use.

**The Signal Spark Rule.** HG orange appears only on the logo mark and the current nav item's icon in the rail.

## Typography

**Display Font:** Heebo (self-hosted variable woff2, weights 200 to 700, with system-ui fallback)
**Body Font:** Heebo
**Label/Mono Font:** Heebo for labels; the system monospace stack appears only in the code snippet block on the settings page.

**Character:** One humanist sans that is native in Hebrew and Latin, set tight and working: semibold for titles and figures, medium for controls, regular for reading. The scale steps by about 1.2 (12, 13, 14, 16, 19, 23) from a 14px body.

### Hierarchy
- **Display** (600, 23px, 1.25, -0.02em): page titles (the greeting on My Day, "לידים ולקוחות", "עסקאות").
- **KPI** (600, 23px, 1.15, -0.02em, tabular): the figure in each KPI strip cell; drops to 19px at 560px and below.
- **Headline** (600, 19px, 1.25): the record name in a lead or deal hero.
- **Title** (600, 16px, 1.25): section titles, dialog titles, empty-state titles.
- **Subtitle** (600, 14px, 1.25): panel heads and action-row titles.
- **Body** (400, 14px, 1.5): everything read; buttons and nav items use the same size at 500.
- **Body small** (400, 13px, 1.5, tabular): table cells, notices, secondary lines.
- **Label** (500, 13px): field labels, KPI labels, small buttons, segmented controls.
- **Caption** (400, 12px): meta, help text, timestamps, KPI sub-lines. Table headers use it at 600; badges at 500.
- **Micro** (600, 11px, tabular): counts in nav and tab pills, rail group labels.

### Named Rules
**The Tabular Figures Rule.** Every amount, count, percentage and date is set with tabular numerals, and every number, phone or document number is an LTR island right-aligned inside the RTL line.

**The Weight Not Size Rule.** Hierarchy inside a panel comes from weight (600 against 400) and ink tone (ink against ink-3), not from new sizes; the ramp has six steps and a micro step for counts.

## Layout

The shell is a fixed 224px ink rail on the inline start (the right), and a main column with a 56px white top bar that sticks to the top: quick search (up to 440px) at its start, then the save state and the one "ליד חדש" soft button at its end. The view below it is padded 24px top and 32px sides, centred at a maximum of 1480px. Spacing runs on a 4px rhythm (4, 8, 12, 16, 20, 24, 32); 16px is the default gap between panels and grid cells, 20px sits under page heads and the KPI strip.

My Day is a page head, the KPI strip, then a two-column grid: the action list (fluid) and a 320px side column of upcoming tasks and warnings. Record pages use three columns (320px details, fluid timeline, 300px associations); below 1280px the right column wraps under, and below 860px everything stacks. The deal page uses 340px plus fluid. The deals board is a horizontal row of 280px columns.

Breakpoints: 1280px, 1100px (grids halve; My Day goes to one column), 960px (the rail is replaced by a bottom navigation bar with icons, labels and counts, and settings moves into the top bar), 860px, 760px (phone layout), 720px (all grids single), 640px, 560px (top bar buttons become icon only, KPI cells pair two per row, toolbars become a two-column grid). At 760px and below the KPI strip moves under the action list, action rows wrap with their quick actions on a full-width line, board columns become 86vw snap panes, and the leads table becomes two-line rows inside one surface: name and business over next step, status over source. The phone number is hidden there on purpose; call and WhatsApp are one tap away on the lead page. Sources and documents tables become stacked label-and-value blocks.

With a coarse pointer every control grows to a 44px target (small buttons 40px, inputs 44px at 16px text, task circles 28px with an 8px invisible hit area).

### Named Rules
**The Once Per Viewport Rule.** "ליד חדש" appears once on screen: the top bar carries it, and page heads hide their own copy while the top bar shows it.

## Elevation & Depth

Depth is hairline-first with three low, soft shadows. Panels, tables, KPI strip and buttons sit at shadow-1, which is barely more than the 1px hairline that actually draws their edge. Things that float above the page take shadow-2: search results, menus, the bulk-selection bar, a hovered deal card, the printed paper. Dialogs, drawers and toasts take shadow-3 over a 50% ink backdrop. Inside a panel there is no further lift; rows are separated by hairlines and tinted on hover. In dark mode the same three steps become pure black shadows at higher opacity.

### Shadow Vocabulary
- **Rest** (`box-shadow: 0 1px 2px rgba(16,20,30,.05), 0 1px 3px rgba(16,20,30,.04)`): panels, tables, KPI strip, buttons, deal cards at rest.
- **Float** (`box-shadow: 0 4px 12px -2px rgba(16,20,30,.10), 0 2px 4px rgba(16,20,30,.05)`): menus, search results, bulk bar, hovered deal card, paper.
- **Overlay** (`box-shadow: 0 24px 56px -12px rgba(16,20,30,.30), 0 4px 12px rgba(16,20,30,.08)`): dialogs, drawers, toasts.
- **Focus ring** (`box-shadow: 0 0 0 3px` brand at 20%): focused inputs and the top search; other controls use a 2px brand outline offset 2px.

### Named Rules
**The Hairline First Rule.** Edges are drawn by 1px lines; shadows only say "at rest", "floating" or "over everything", never decorate.

## Shapes

One gentle corner (8px) for almost everything: buttons, inputs, panels, tables, KPI strip, deal cards, board columns, menus, notices. Dialogs, drawers and the sign-in card round to 14px so overlays read as a different layer. Pills (99px) are for status badges, filter chips, counts, choice pills and switches. Circles are for avatars, task checks, quick-action buttons, timeline icons and the numbered top-three markers. A 4px corner is kept for inner pieces (segmented control buttons, kbd, funnel and category bars, the paper sheet). Borders are 1px throughout; the only 2px strokes are the active tab underline, the task circle and the focus outline.

## Components

### Buttons
Quiet, solid and short.
- **Shape:** gently curved (8px), 36px tall, 14px side padding; 30px small, 44px large.
- **Primary:** working blue fill, white text, medium weight, a faint blue-tinted shadow; hover deepens the blue. One per region at most.
- **Secondary:** white with a hairline-strong border and rest shadow; hover goes to shade with a field-edge border. Presses move down 1px.
- **Ghost:** no fill or border, ink-2 text; hover fills with well. A ghost in danger text tints danger-soft on hover.
- **Soft:** brand-soft fill with blue text, no border or shadow. The top bar's "ליד חדש" is a small soft button.
- **Danger:** red fill, white text, for destructive confirmation only.
- **Icon buttons:** 34px (28px small) transparent squares, ink-2, well on hover.
- **Focus:** 2px blue outline offset 2px on every control.

### Chips
- **Status badges:** 22px pills, 12px medium text, a pale tint of the status hue behind a dark tint of the same hue (lightness 94% and 29% in light, 21% and 82% in dark). Slate is the default; brand, green, amber and red follow the Meaning-Only Rule.
- **Filter chips:** 28px brand-soft pills with blue text and a small remove button.
- **Choice pills:** 30px outlined pills; checked turns brand-soft with a blue border and blue text.
- **Counts:** 11px semibold tabular numbers in a well pill; the active tab's count turns brand-soft and blue.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** work white on desk grey.
- **Shadow Strategy:** rest shadow, see Elevation & Depth.
- **Border:** 1px hairline.
- **Internal Padding:** 16px body; heads are 50px tall with 16px side padding and a hairline under them.
- **Deal cards** are the one place records are separate cards: 10px by 12px, grab cursor, float shadow on hover, a menu that is half-faded until hover, the amount in tabular semibold, and a red or amber line for overdue or "no next step".

### Inputs / Fields
- **Style:** 36px white field, 1px field-edge border, 8px corners, 10px padding; labels above in 13px medium ink-2; help and errors in 12px.
- **Focus:** the border turns blue and a 3px blue ring at 20% appears.
- **Error / Disabled:** invalid fields take a red border and a red ring on focus; disabled fields go to shade with ink-3 text.
- **Search:** the top bar search sits in shade with a hairline border and turns white on focus.

### Navigation
- **Rail:** 224px near-black column, sticky full height. The HG mark (a 28px orange rounded square with a white H) and "HG OS" sit in a 56px header; 38px nav items in rail-ink at 500 with 18px stroke icons and tabular counts on the inline end. Hover fills rail-2 and turns text white; the current page fills rail-3, text white, and only its icon turns HG orange.
- **Tabs:** 10px by 12px, ink-3 text; the active tab is ink with a 2px blue underline on the shared hairline.
- **Segmented control:** a well track with 3px padding; the active segment is white with rest shadow.
- **Phone:** below 960px a white bottom bar with six items (icon over 11px label, 54px tall), the active item in blue, counts as small ink pills.

### KPI Strip
One surface split by 1px hairline gaps into cells (flexible, about 170px minimum each), never separate cards. Each cell is a button that opens the records behind its number: a 13px ink-3 label, the 23px tabular figure, and a 12px sub-line pinned to the bottom. Money that was won reads in green; everything else is ink. Hover tints the cell shade.

### Action Rows and the Due Circle
My Day and the task list are rows inside one panel: 10px by 16px (12px by 16px for tasks), hairline dividers, shade on hover. The first three action rows carry a small numbered well circle before their title. A task row starts with a 20px circle check: a field-edge ring at rest, a red ring when overdue, an amber ring when due today, a green fill with a white check when done. Rows that are not tasks start with a 32px well icon circle instead. Quick actions (call, WhatsApp, a "תיעוד" log button) sit at the row's end; snooze and edit appear on hover or focus where there is a pointer.

### Record Links
Names of leads and deals are ink with a quiet hairline-strong underline offset 3px; on hover they turn blue and the underline takes the text colour. In tables and action rows the name is ink semibold without underline and turns blue on hover. Blue text is kept for actions ("כל המשימות", "הצגת הלידים").

### Stage Path
A well track holding one segment per stage (34px, at least 96px wide). Passed stages tint 13% blue, the current stage fills blue with white semibold text, a current won stage fills green and a current lost stage fills red.

### Printed Documents
The paper sheet is white with #111 text in every theme, 820px wide, 48px by 56px padding, 4px corners, black 2px rules under the head and above the grand total, and no shadow when printed on A4.

### Named Rules
**The One Strip Rule.** KPIs are a single surface with hairline cells, never a row of separate cards.

**The Due Circle Rule.** The task circle carries the due state: red ring overdue, amber ring due today, green fill when done.

**The Ink Link Rule.** Links to records are ink with a quiet underline; blue text is reserved for actions.

**The Paper Rule.** Printed documents stay black on white in every theme.

## Do's and Don'ts

### Do:
- **Do** frame every screen with the ink rail and the white 56px top bar, and put work on white panels over the desk grey ground.
- **Do** list records as rows inside one panel with 1px hairline dividers and a shade hover.
- **Do** keep blue for primary actions, focus, the active tab and selection, using brand-soft for selected backgrounds.
- **Do** set every figure in tabular numerals and every number, phone or email as an LTR island right-aligned inside RTL.
- **Do** use logical properties (inline start and end) so the layout mirrors correctly in RTL.
- **Do** give every control a 44px target under a coarse pointer and a visible 2px blue focus outline.
- **Do** define both themes for any new colour: one value under :root and one under the dark theme selectors.

### Don't:
- **Don't** use HG orange anywhere except the logo mark and the current nav item's icon.
- **Don't** colour a record name blue at rest; record links are ink with a quiet underline.
- **Don't** split the KPI strip into separate cards.
- **Don't** add green, amber or red for emphasis or decoration; each one has to mean money, attention or failure.
- **Don't** add a second "ליד חדש" button to a screen where the top bar already shows one.
- **Don't** let printed documents follow the dark theme.
- **Don't** add shadows heavier than the float shadow to anything that is not an overlay.
- **Don't** introduce a new corner radius or font size outside the scale.
