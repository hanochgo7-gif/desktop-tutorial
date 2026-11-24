# Team D — UX/UI research for a mature, focused learning product

Prepared for Lucid (English for Hebrew-speaking learners aged 16+, Pre-A1 to C1–C2 plus a Real-Life English track). Accessed and compiled 2026-10-30.

## Method and limitations

**What we did.** Every claim below is tied to a numbered source that was opened in this session: the publisher's page, the standard itself, an institutional record (PubMed, ERIC/Fachportal, UvA DARE, arXiv) or the company's own design writing. Search snippets were used only to find pages. We grouped sources by evidence type:

- **Normative standard.** WCAG 2.2 is testable and binding where the law points to it.
- **Regulator guidance.** The ICO children's code, the European Commission's DSA Article 28 guidelines and the FTC staff report are authoritative but partly voluntary.
- **Expert guidance.** W3C COGA (a W3C Note), W3C i18n articles, and the Apple, Material and Wikimedia design systems are consensus practice, not experiments.
- **Peer-reviewed empirical work.** Meta-analyses, experiments and critical reviews.
- **Practitioner and company writing.** Duolingo, Headspace, Linear, Notion, Brilliant and Babbel. This is self-reported, often optimised for engagement rather than learning, and never independently audited.

**Limitations.**

1. **Inaccessible sources.**
   - Several primary sources could not be opened from this environment: EUR-Lex (bot protection), the Springer and PNAS full texts, the ACM DL, Brilliant's design essay on uxdesign.cc (HTTP 403), and Material Design 2/3 pages (JavaScript-only).
   - We used opened secondary or record pages instead and say so where we do.
   - Material bidirectionality guidance is cited from the archived but still published Material 1 site, which says it is no longer maintained.
2. **Uneven evidence on product principles.** Company design writing tells us what teams *intended* and what moved *their* metrics. It does not show that a principle improves *learning*. Most effect numbers from companies are relative engagement changes from undisclosed A/B tests.
3. **Transfer from other fields.** Much of the attention, notification and gamification evidence comes from lab tasks, undergraduates or general (non-L2) learning. Transfer to a self-paced adult or teen L2 web app is plausible but untested.
4. **Fast-moving law.** Laws on cancellation and minors are changing. The status below is as of the sources' dates (latest May 2026). Israeli accessibility and privacy law was checked only through the W3C WAI policy register, last updated in 2017. Israeli counsel must confirm the current standard (IS 5568 version) and obligations.
5. **Search budget.** The session's web-search budget ran out late in the work. A few planned lookups were not done: the W3C Hebrew layout gap analysis, an open copy of Di Geronimo et al. (2020) on mobile dark patterns, and the BDA style guide PDF. They are flagged where relevant.

---

## 1. Design principles from Apple, Duolingo, Headspace, Notion, Linear, Brilliant and Babbel

### Evidence summary

**Apple (Human Interface Guidelines).**
- **Eight principles.** Apple's current HIG names Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft and Delight [1].
  - Under Simplicity: "Simplicity isn't minimalism. Aim for a focused, useful experience that keeps the important things close by and lets the others fall away."
  - Also under Simplicity: "Choose exactly the words you need to convey a concept or label a control" [1].
  - Under Familiarity, consistency: "Consistency helps people learn more quickly, and gives them confidence that new interactions will work the way they expect" [1].
  - Responsibility: "Act in people's best interest… Earn their trust by prioritizing safety and privacy" [1].
- **Onboarding.**
  - Onboarding should be "fast, fun, and optional". It should not require people "to memorize a lot of information", because "if you try to teach too much, people can feel overwhelmed" [2].
  - "Teach through interactivity" [2].
  - "Postpone nonessential setup flows" and "Prefer letting people experience your app or game before prompting them for ratings or purchases" [2].
- **Feedback.**
  - Match the level of interruption to the importance of the information. Alerts "can lose their impact if you use them too often" [3].
  - Give feedback through several channels (colour, text, sound, haptics) so it reaches people who silence the device or use VoiceOver [3].

**Duolingo.**
- **Product principles (2024).**
  - "Take the long view", defined as doing "whatever is best for the user, even if it will take some time to get there".
  - "Build for the global user": less tech-savvy, older and other-language users.
  - "If it can be better, make it better" [4].
- **Streak redesign (2020).**
  - The streak was decoupled from the daily goal, so one lesson extends it. Duolingo reports relative gains of +3.3% Day-14 retention, +1% daily active learners and +10.5% learners on a streak.
  - Duolingo also notes that fewer learners now reach their daily goals [5].
- **Streak write-up (2022).**
  - Explicitly names **loss aversion** as a mechanism.
  - Acknowledges that breaking a streak "can feel demotivating" and that fear of losing one may deter starting.
  - Reports +0.38% relative daily active learners from allowing two equipped Streak Freezes [6].
- **Notification engineering.**
  - Duolingo's peer-reviewed KDD paper optimises which reminder to send. The reward is "a lesson within two hours of the notification".
  - It reports +0.5% DAU and +2% new-user retention.
  - It documents a **novelty effect**: reminders lose impact the more recently a user has seen them [7][8].
- **Limitation.** All Duolingo outcomes are engagement metrics, not proficiency.

**Headspace.**
- **Design analysis of a Headspace talk** (Vicki Tan and Christine Cha, "Design for Change") [9]:
  - Metaphor rather than literal emotion.
  - Soft characters designed to "avoid any sharp edges".
  - Onboarding rebuilt after a 38% drop-off between start and end of onboarding: easily exited intro screens, GIFs instead of an instructional video, one question dropped (how often users planned to meditate), the first meditation moved out of onboarding, and scientific facts removed to avoid overwhelming users.
  - Reported result: a 10% relative increase in week-two engagement (self-reported by the company via a secondary write-up).
- **Headspace designer interview** [10]:
  - "Our goal isn't to have people come on and spend five hours on Headspace."
  - Habits start small: "it's a one minute meditation".
  - Business targets are met by "increasing the warmth and the value of an experience" rather than pressure.

**Notion.**
- **Design as core, explored widely.** Zhao treats design as central ("Design means everything here") and the team explores many permutations ("go crazy with permutations") [11].
- **Restraint.** The new-user home screen stays minimal despite a powerful product [11].
- **Blocks.** The data model is "Everything you see in Notion is a block". Changing a block's type "only changes the type attribute", so content is never lost when it is transformed [12].

**Linear.**
- **The Linear Method's principles** include:
  - "Aim for clarity", including "Don't invent terms if possible".
  - "Say no to busy work. A tool should work for you, not the other way around".
  - "Simple first, then powerful" [13].
- **2026 refresh, "A calmer interface"** [14]:
  - "Don't compete for attention you haven't earned".
  - Navigation recedes (dimmer sidebar) so the task area leads.
  - Fewer and smaller icons, softened borders: "Structure should be felt not seen".
  - Consistent placement of header actions.
- **2024 redesign** [15]:
  - Moved theme generation from HSL to the LCH colour space (which the authors call "one of the closest color spaces to the human eye"), needing three variables (base colour, accent colour, contrast) instead of 98.
  - A contrast variable lets them "automatically include super high-contrast themes for users who need it for accessibility reasons".

**Brilliant.**
- **Current positioning** [16][17]:
  - Homepage [16]: "You learn with Koji on a shared interactive canvas"; "Koji tracks what you've mastered and what you've missed, then builds your learning plan around the gaps"; "Unlike other AI chatbots and homework help tools, Koji never just gives you the answer."
  - App Store listing [17]: "Brilliant doesn't give you answers. It guides you through problems and to your own a-ha moments."
- **No outcome data.** Neither page cites outcome studies. Brilliant's design-leadership essay could not be opened (HTTP 403).

**Babbel.**
- **Three pillars (2020)** [18]:
  - Conversation-first content.
  - Courses made by hand by about 150 language experts.
  - User-oriented design. The article concedes Babbel "isn't as playful: It doesn't have the game aspect that might make other apps more entertaining", which a Babbel staff member calls "a clear decision from our side". The stated aim: "We want our learners to put away their phone and experience success with their new language in real life."
- **Earlier design analysis (2018)** [19]:
  - Babbel's VP of product design: "The app experience needs to be almost entirely intuitive" and "Anything in the UX/UI that distracts from the learning experience could potentially reduce efficacy."
  - The same piece describes a per-lesson score, a light game element. So Babbel's own stance has shifted over time.

**Learning-science anchors for these principles.**
- **Gamification** [20]. Sailer & Homner's meta-analysis of gamified learning finds small positive effects:
  - cognitive g = 0.49 [0.30, 0.69], k = 19;
  - motivational g = 0.36 [0.18, 0.54], k = 16;
  - behavioural g = 0.25 [0.04, 0.46], k = 9.
  - Only the cognitive effect stayed stable in high-rigour studies.
  - Game fiction and social interaction significantly moderated behavioural outcomes; combining competition with collaboration appeared effective.
  - These are general-education studies, mostly short; none isolates L2 learning.
- **Rewards and intrinsic motivation** [21]. Deci, Koestner & Ryan's meta-analysis of 128 studies:
  - Expected rewards undermine free-choice intrinsic motivation: engagement-contingent d = −0.40, completion-contingent d = −0.36, performance-contingent d = −0.28.
  - Verbal positive feedback *enhanced* it (d = 0.33 free-choice; d = 0.31 self-reported interest).
  - Tangible rewards were more detrimental for children than for college students [21]. Lucid's 16–17-year-olds fall between those groups.
- **Feedback** [22]. Wisniewski, Zierer & Hattie's meta-analysis (435 studies, 994 effect sizes, about 61,000 participants) gives overall d = 0.48 (random effects, after excluding 35 extreme values):
  - high-information feedback d = 0.99 (k = 42). In this paper "high-information" means corrective task information **plus** information on self-regulation (monitoring attention, emotions or motivation);
  - corrective feedback ("right or wrong" plus the correct answer) d = 0.46 (k = 238);
  - reinforcement or punishment (pleasant or aversive consequences carrying minimal task information) d = 0.24 (k = 39).
  - Heterogeneity is very high (I² ≈ 86%) and the funnel plot is asymmetric (driven by journal articles, not dissertations).
  - The studies are general education, not L2-specific.
- **Active learning** [23]. Freeman et al.'s meta-analysis of 225 undergraduate STEM studies:
  - Exam scores were 0.47 SD higher under active learning.
  - Failure rates were 21.8% vs 33.8% under lecturing.
- **L2 anxiety** [24]. Teimouri, Goetze & Plonsky meta-analysed L2 anxiety (105 samples, N = 19,933) and found r = −.36 with achievement. This is correlational, not causal. (The publisher lists an erratum for this article.)

### Strength of evidence

| Claim | Type | Strength |
|---|---|---|
| The product principles themselves | Company opinion and practitioner writing | Low as proof, useful as craft heuristics |
| Duolingo's numbers | Self-reported relative A/B results; one peer-reviewed engineering paper [7] | Valid for engagement only |
| Gamification [20] and rewards [21] | Meta-analyses | Moderate. Small, heterogeneous effects, mostly short studies. Reward effects come from lab free-choice paradigms. |
| Feedback [22] | Meta-analysis | Moderate, with a large spread |
| Active learning [23] | Meta-analysis | Strong for STEM classrooms; transfer to L2 apps is not shown |
| Anxiety [24] | Correlational meta-analysis | Moderate for association only |

### What it means for Lucid

Taken together, the sources point to one stance: **a calm, focused tool that teaches by doing, gives informative feedback, and earns return visits through felt progress rather than loss-aversion mechanics.** Lucid should:

- **Keep chrome quiet during lessons.** Navigation recedes and the exercise leads [1][14][19].
- **Use plain, uninvented names** for features [1][13].
- **Teach through interaction from the first minute** [2][16][23].
- **Make feedback explanatory rather than celebratory.** Corrective and high-information feedback outperform reinforcement/punishment-type feedback [22], and expected rewards can undermine motivation [21].
- **Use game elements sparingly and never as the main motivator.** Benefits are small and their motivational and behavioural effects are unstable [20].
- **Keep anxiety low.** This matters especially for beginners [24], and it matches Headspace's and Babbel's "warmth over pressure" positions [10][18].
- **Not copy Duolingo's streak economy.** Duolingo itself names loss aversion as the engine and admits it deters some learners [6].

---

## 2. WCAG 2.2 AA requirements most relevant to a learning web app

### Evidence summary

**Status and scope.**
- WCAG 2.2 became a W3C Recommendation on 5 October 2023. The current dated version is 12 December 2024 [25][26].
- It adds nine success criteria and removes 4.1.1 Parsing [25].
- **Israel.** The W3C WAI policy register lists Israel's Equal Rights of Persons with Disabilities Act (1998, amended) as requiring WCAG 2.0 Level AA for public and private sectors. That entry was last updated in 2017 [31].

**Criteria that matter most for Lucid.** Text is quoted or summarised from [25][26] unless noted.

- **2.4.7 Focus Visible (AA).** A visible keyboard focus indicator is required [26].
- **2.4.11 Focus Not Obscured (Minimum) (AA).** A focused component must not be *entirely* hidden by author-created content [25]. The Understanding document names "sticky footers, sticky headers, and non-modal dialogs" as typical culprits, says a cookie banner fails "if it entirely obscures a component receiving focus", and discusses user-opened chat windows [67].
- **2.4.13 Focus Appearance (AAA).** The indicator area must be at least a 2 CSS px perimeter, with at least a 3:1 change in contrast [25].
- **2.5.8 Target Size (Minimum) (AA).** Targets must be at least 24×24 CSS px, or meet the spacing, equivalent, inline, user-agent or essential exceptions [25].
  - Apple's platform guidance is stricter: default control size 44×44 pt (minimum 28×28 pt on iOS), with about 12 pt padding around bezelled controls [30].
- **2.5.7 Dragging Movements (AA).** Anything done by dragging must also be possible with a single pointer without dragging [25]. This is directly relevant to word-order, matching and sorting exercises.
- **1.4.3 Contrast (Minimum) (AA)** is 4.5:1 for text and 3:1 for large text. **1.4.11 Non-text Contrast** is 3:1 for UI components and meaningful graphics [26].
- **1.4.1 Use of Color (A).** Colour must not be the only means of conveying information. Failure F81 covers "identifying required or error fields using color differences only". Where people must know "whether an outline is green for valid or red for invalid", "an additional visual indicator will be required regardless of the contrast ratio between those colors" [29].
- **1.4.10 Reflow (AA).** No two-dimensional scrolling at 320 CSS px [26].
- **1.4.12 Text Spacing (AA).** Content must survive line height 1.5×, paragraph spacing 2×, letter spacing 0.12× and word spacing 0.16× [26].
- **2.2.1 Timing Adjustable (A).** Each time limit must be:
  - turn-off-able; or
  - adjustable to at least 10× the default; or
  - extendable with a warning and at least 20 s to respond, at least ten times; or
  - longer than 20 hours; or
  - real-time or essential [26].

  The Understanding document does **not** say timed tests are automatically "essential". Its only test example is a third party granting double time [27].
- **2.2.2 Pause, Stop, Hide (A).** Auto-moving content lasting more than 5 s must be pausable [26].
- **3.1.2 Language of Parts (AA).** The language of each passage or phrase must be programmatically determinable [26]. In a Hebrew interface teaching English, this is what makes a screen reader switch voices correctly.
- **3.2.6 Consistent Help (A).** Help mechanisms repeated across pages must keep the same relative order [25]. These are human contact details, a contact mechanism, self-help, or an automated contact such as a chatbot.
- **3.3.7 Redundant Entry (A).** Information already given in the same process must be auto-populated or selectable [25].
- **3.3.8 Accessible Authentication (Minimum) (AA)** [26][28].
  - No cognitive function test, which the definition describes as a task "to remember, manipulate, or transcribe information".
  - Login must support password managers and paste: copy and paste "can be relied on to avoid transcription".
  - Blocking paste fails "unless an alternative is provided" (failure F109). The Understanding document also shows split one-digit code fields where paste "only fills in one digit" as a transcription barrier.
  - Listed sufficient techniques include G218 (email link authentication) and H100 (properly marked-up email and password inputs). WebAuthn and OAuth appear only as "potential future technique" entries, not as sufficient techniques. A passkey login involves no cognitive function test, so it can still meet the criterion, but that is our reading rather than a listed technique.
  - Puzzle and maths CAPTCHAs are "not excepted" and need an alternative. Object-recognition tests are an AA exception only [28].
- **4.1.3 Status Messages (AA).** Status messages such as "Correct" or "Saved" must be programmatically determinable without moving focus [26].

**Apple additions** [30]:
- Let people enlarge text by at least 200%.
- "Minimize use of time-boxed interface elements… Prefer dismissing views with an explicit action."
- Avoid autoplaying audio or video without controls.
- Convey information with more than colour.

### Strength of evidence

WCAG is a **normative, testable standard**. Conformance is checkable, but it sets a floor rather than an optimum. Apple's numbers are platform guidance. The Israeli legal baseline (WCAG 2.0 AA) comes from a 2017 register entry and needs legal confirmation.

### What it means for Lucid

- **Target WCAG 2.2 AA in full**, plus selected AAA criteria that are cheap and high-value for learners: 2.4.13 Focus Appearance and 2.3.3 Animation from Interactions.
- **Design exercises for keyboard and switch use**, with a non-drag path for every interaction.
- **Untimed by default.** Treat timing as an opt-in training mode, not an assessment requirement.
- **Wrap every English string in correct language markup**, because that is how assistive technology users *hear* English correctly inside a Hebrew interface.
- **Use passkeys and email links rather than memorised passwords**, especially since many users are teenagers on shared or school devices.

---

## 3. Cognitive accessibility (W3C COGA) and ADHD-friendly design

### Evidence summary

**COGA.** *Making Content Usable for People with Cognitive and Learning Disabilities* is a W3C Working Group **Note** (29 April 2021). It is supplemental to WCAG, and following it "is not required for conformance" [32]. It sets eight objectives with design patterns. The most relevant to Lucid:

- **Help users focus.**
  - "Limit Interruptions" [32].
  - "Make Short Critical Paths": "only the minimally necessary steps"; optional steps are separated and never forced [32].
  - "Avoid Too Much Content": "Provide users with five or less main choices on each screen and remove unnecessary content" [32].
- **Avoid mistakes and correct them.**
  - "Avoid Data Loss and Timeouts": "Avoid timeouts and let the user save their work as they go" [32].
  - "Provide Feedback": "easily-recognizable success or failure feedback with every user action", including step status [32].
  - "Let Users Go Back" and "Make it Easy to Undo" [32].
- **Do not rely on memory.** Logins without puzzles or memorisation; do not make users calculate or memorise information [32].
- **Help.** "Make It Easy to Find Help" from every place a user gets stuck. "Provide Reminders", but "Reminders must be set only at the user's request" and users control frequency and type [32].
- **Adaptation** [32].
  - "Let Users Control When the Content Moves or Changes."
  - "Support Simplification": a simple application typically has "3 to 6 functions", and users can return to the full version.
  - "Support a Personalized and Familiar Interface": font, size, spacing and contrast, plus rollback to a familiar interface.
- **ADHD persona "Yuki"** [32]:
  - She is distracted by "banners automatically flying by" and by "advertisements appearing between chunks of text".
  - She relies on "an option on my computer to say I want less movement".
  - She needs "a clear pathway and a way to return to the place where she was working", and copes with an app that "saved her work in stages".
  - She "starts to lose focus after a few minutes" of instructional video, so videos "broken down into segments with clear headings" help.
  - COGA's "Finding People to Include" section lists people with "dyslexia, dyscalculia, or AD(H)D" among those to recruit for usability testing.
  - Personas are illustrative composites, not research data.

**ADHD-specific research.**
- **Critical review** [33]. Spiel, Hornecker, Williams & Good (CHI 2022) reviewed ADHD technology research. Most systems aim to "mitigate" ADHD traits seen as disruptive to neurotypical norms, and little work co-designs with people with ADHD. This is a caution against "fixing" learners rather than designing flexible tools.
- **Video learning** [34]. An eye-tracking think-aloud study with 16 participants with ADHD (arXiv preprint, September 2026, not yet peer reviewed) found that video lectures' "static visuals, dense information, and long duration pose attentional challenges".
- **Notifications** [35]. In a two-week within-subject experiment with 221 undergraduates (one week alerts on and phone in reach, one week alerts off and phone away), alerts on raised self-reported inattention and hyperactivity. Inattention in turn predicted lower productivity and psychological well-being. The sample came from a general participant pool, not a clinical ADHD sample, and the outcomes were self-reported.
- **Attention cost** [36]. In a lab study of 166 college students on the Sustained Attention to Response Task, receiving a call or text notification increased attention errors even when participants did not look at or answer it (Stothart, Mitchum & Yehnert, 2015, reported via the APS write-up).

**Reading support.**
- **Dyslexia Scotland (2025)** [37]:
  - "There is no one-size-fits-all 'dyslexia-friendly' font."
  - At least 12 pt, 1.5× line spacing, 50–75 characters per line, left-aligned with no full justification.
  - Let readers choose larger text and tinted backgrounds.
- **Specialised fonts.** A single-subject alternating-treatment study of 12 elementary-age students with dyslexia (11 completed all probes) found "no improvement in reading rate or accuracy" with OpenDyslexic compared with Arial or Times New Roman; OpenDyslexic scores were in fact lower [38]. Participants were children, so transfer to 16+ learners is assumed, not tested.

### Strength of evidence

- **COGA** is expert consensus with user research behind it, but it is non-normative and has no effect sizes.
- **ADHD design evidence** is thin. One critical review [33], one small preprint [34], and two general-population attention experiments [35][36], which are self-report and lab respectively. No study we opened tested a language-learning UI with learners with ADHD.
- **Font evidence** is small-N but consistent with the charity guidance [37][38].

### What it means for Lucid

- **Default to focus**: one task per screen, five or fewer primary choices, and no moving or autoplaying elements.
- **Save everything continuously.** Show step progress in every lesson.
- **Offer a "Simplified" mode** and reading preferences (size, spacing, line length, background tint).
- **Do not ship or market a "dyslexia font" or an "ADHD mode" as a fix.** Instead, offer adjustable presentation and recruit learners with ADHD and dyslexia into usability testing and co-design [32][33][38].

---

## 4. Right-to-left and bidirectional UI (Hebrew interface teaching English)

### Evidence summary

**Markup (W3C Internationalization).**
- **Document direction** [39].
  - Set `dir="rtl"` on the `<html>` element. Do not use CSS for base direction, because direction belongs in markup.
  - `lang` does **not** set direction.
  - Use `dir="auto"` for unknown or user-generated content, and `<bdi>` to isolate inserted text.
  - Put `dir="auto"` on inputs, with `dirname` to submit the direction.
- **Inline text** [40].
  - "Tightly wrap every opposite-direction phrase in markup that sets its base direction."
  - Use `dir="auto"` or `bdi` when direction is unknown at runtime.
  - Use Unicode control characters only where markup is impossible, such as `<title>` or attribute values. Prefer the isolates (RLI, LRI, FSI with PDI) over the older embeddings [40][42].
- **The bidi algorithm** [41].
  - Text is stored in logical order and displayed in visual order.
  - Neutrals (punctuation, spaces) take the base direction when they sit between runs of opposite direction. That is why a trailing "!" or a number lands on the "wrong" side.
  - Digits are weak and run left-to-right.
  - Adjacent same-direction items can merge, and "the bidi algorithm can't figure this out on its own".
- **CSS logical properties** [46]. Properties map to flow-relative `start`/`end` rather than physical `left`/`right`, so one stylesheet serves both directions.

**What mirrors and what does not.**

| Element | Guidance | Source |
|---|---|---|
| Navigation order, back/forward (a back button points **right** in RTL) | Mirror | [43][45] |
| Progress bars, sliders, step sequences | Mirror | [43][44][45] |
| Icons that show forward motion or text direction | Mirror | [43][45] |
| Checkboxes | Sit to the right of their labels | [43] |
| Media playback controls and media progress ("the direction of the tape, not the direction of time") | Do **not** mirror | [43][44] |
| Clocks and circular time icons | Do not mirror | [43][45] |
| Digits within a number, phone numbers | Never reverse | [43][45] |
| Untranslated text and URLs | Keep in their own direction | [43][44] |
| Charts and graphs | Do not mirror (Material lists them as unmirrored; Wikimedia says not to mirror them "if mirroring could impact data interpretation") | [43][44] |
| Checkmarks, logos, universal signs | Do not flip | [45] |
| Photographs and illustrations | Do not flip | [45] |
| Question-mark (help) icon | Wikimedia: "Use the LTR version of certain icons in RTL languages when appropriate, such as the question mark in Hebrew versus Arabic". It does not spell out the rule per language; treat the Hebrew form as LTR only after checking with Hebrew readers | [44] |

**Typography and alignment (Apple)** [45]:
- Align a paragraph of three or more lines "based on its language, not on the current context".
- Use one consistent alignment for all items in a list.
- Increase RTL font size by about 2 pt to balance Hebrew next to all-caps Latin.
- "Reverse the order of numerals that show progress or a counting direction; never flip the numerals themselves."

**Tension to resolve.** Material lists charts as unmirrored, and Wikimedia says not to mirror them where that could impact data interpretation [43][44]. Apple says sequences that show progress or counting direction should be reversed [45]. For Lucid's progress analytics (time-series), this is a real design decision that should be tested with Hebrew readers.

### Strength of evidence

These are expert guidance and standards-body articles: consensus, not experiments. They agree closely on the core rules. Material 1 is no longer maintained, but its rules match Apple's and Wikimedia's current guidance. We did not open W3C's Hebrew-specific layout requirements because of the search budget, so Hebrew-specific typographic issues (niqqud, geresh/gershayim, emphasis without italics) are unverified here.

### What it means for Lucid

Lucid's UI chrome is RTL Hebrew, but its learning content is mostly LTR English. Every exercise is therefore a bidi island.

- **Engineering.** Get the markup right (`lang`/`dir` on every English block and inline phrase) and ban physical CSS properties.
- **Mirroring.** Mirror navigation and lesson progress, but keep audio scrubbers, English sentence-building areas, numbers and media controls unmirrored.

---

## 5. Dark mode

### Evidence summary

**Apple** [47].
- "Avoid offering an app-specific appearance setting". It makes people adjust more than one setting, and "they may think your app is broken".
- Contrast "no lower than 4.5:1", and "strive for a contrast ratio of 7:1, especially in small text" for custom colours.
- Use semantic colours that adapt. Dark colours "aren't necessarily inversions" of light ones.
- Test with Increase Contrast and Reduce Transparency. Soften white image backgrounds. Dimmer "base" surfaces recede and brighter "elevated" ones advance.

**Material** [49]. Dark themes use dark grey rather than black surfaces so shadows remain visible. Higher surfaces are lighter (elevation overlays, now a tonal surface system).

**Research summary (Nielsen Norman Group, 2020)** [48]:
- **Piepenbrock et al. (2013).** Light mode (positive polarity) gave better visual acuity and proofreading for both younger and older adults, with no difference in fatigue. The advantage grew as font size shrank.
- **Dobres et al. (2017).** No polarity effect in daytime glanceable reading; light mode was better at night.
- **Myopia link.** A 7-person study linked light mode to choroid thinning, a myopia marker.
- **Cloudy ocular media.** In Legge et al. (1985), seven participants with cloudy ocular media (for example cataracts) read faster in dark mode. NN/g notes that these older studies used CRT displays, which may have biased results against light mode.
- **Recommendation.** NN/g does not recommend dark mode as the general default, but recommends letting users switch, especially for long-form reading.

### Strength of evidence

- The performance evidence is **experimental but old, small and lab-based**. The myopia finding rests on n = 7. It is reported second-hand through NN/g; the primary papers were not opened.
- Platform guidance is consensus.
- Apple's "no in-app setting" rule is written for native apps where the OS setting is one tap away. On the web, users often cannot set appearance per site. This is a judgement call, not an evidence conflict.

### What it means for Lucid

- **Follow the OS preference by default.**
- **Offer a three-way override** (System / Light / Dark) in Settings.
- **Treat dark mode as a fully tested theme**, not an inversion.
- **Keep light mode available for proofreading-heavy work** such as the writing lab, given the positive-polarity proofreading advantage [48].

---

## 6. Reduced motion

### Evidence summary

**Apple Motion** [50]:
- "Don't add motion for the sake of adding motion. Gratuitous or excessive animation can distract people and may make them feel disconnected or physically uncomfortable."
- "Make motion optional" and do not use it as the only carrier of information.
- "Aim for brevity and precision in feedback animations."
- "Generally avoid adding motion to UI interactions that occur frequently."
- "Let people cancel motion… don't make people wait for an animation to complete."

**Apple Accessibility** [30]. When Reduce Motion is on, reduce automatic and repetitive animation. Replace x/y/z transitions with fades, and avoid animating depth and blurs.

**WCAG 2.3.3 Animation from Interactions (AAA)** [51].
- Motion triggered by interaction must be possible to disable, because of vestibular reactions and distraction.
- Parallax and scroll-triggered movement are in scope. Colour and opacity changes are excluded; an erratum removed the blur exclusion.
- Techniques: C39 (CSS `prefers-reduced-motion`), SCR40 (JavaScript), and a site-level preference.

**MDN** [52]. `prefers-reduced-motion: reduce` has been Baseline since January 2020. The canonical example *replaces* a scaling animation with a gentle opacity "dissolve" rather than removing all feedback.

### Strength of evidence

Standard plus platform guidance. The vestibular rationale is accepted consensus. We did not open prevalence data on vestibular disorders.

### What it means for Lucid

- **Use motion as brief, informative feedback only.**
- **Honour the OS setting and offer an in-app toggle.**
- **Never use motion as the reward itself.** In particular, no blocking celebration animations between exercises.

---

## 7. Ethical engagement vs dark patterns, and easy cancellation

### Evidence summary

**FTC staff report** [53]. *Bringing Dark Patterns to Light*, September 2022.

- **Four groups of dark patterns:**
  1. design elements that induce false beliefs;
  2. elements that hide or delay disclosure of material information;
  3. elements that lead to unauthorised charges;
  4. elements that obscure or subvert privacy choices.
- **Taxonomy (Appendix A) includes:**
  - baseless countdown timers and false limited-time messages;
  - false low-stock and high-demand messages;
  - roadblocks to cancellation and immortal accounts;
  - drip pricing and hidden subscription (forced continuity);
  - intermediate currency (example: "'coins' or 'acorns' in kids' apps");
  - false hierarchy (for example, "Keep My Subscription" as a bright button with "Cancel" as a pale grey link);
  - auto-play;
  - nagging (only "Yes" or "Not Now", with no permanent decline);
  - confirmshaming ("No, I don't want to save money");
  - preselection.
- **Cancellation.** Under ROSCA, "negative option sellers should provide cancellation mechanisms that are at least as easy to use as the method the consumer used to buy". That means cancelling through the same medium, and not imposing "new offers or similar attempts to save the account that impose unreasonable delays" [53].
- **A children's learning site as the example.** The report's cancellation example is ABCmouse. According to the FTC's complaint, consumers allegedly had to click through several pages of promotions and links that led away from the cancellation path, and the first screen did not mention cancellation at all. The report quotes a workshop panelist calling this "sludge", "a high friction experience that… causes people to become fatigued and give up" [53].
- **Targeted audiences.** Companies targeting audiences such as "children, older adults, or native speakers of other languages" must consider how those groups perceive their design choices [53]. Lucid's audience is both teenagers and second-language readers.

**Prevalence.** A crawl of about 11K shopping sites (about 53K product pages) found 1,818 dark-pattern instances of 15 types in 7 categories. 183 sites used outright deceptive practices [54].

**US rule status.**
- The FTC finalised a modernised Negative Option Rule with "click to cancel". A federal panel struck it down in 2025 on procedural grounds.
- The Commission started a new negative-option rulemaking in 2026 and had not confirmed whether it will revive click-to-cancel [55]. This is as of 14 April 2026.
- ROSCA's "simple mechanism" requirement still applies [53].

**EU.**
- **Withdrawal button.** Directive (EU) 2023/2673 requires a "withdraw from contract here" function for contracts concluded through an online interface that carry a withdrawal right, applying from 19 June 2026 [56]. The function must be:
  - continuously available during the withdrawal period;
  - prominent;
  - followed by a "confirm withdrawal" step;
  - acknowledged on a durable medium.

  This summary comes from a law-firm source; the Official Journal text could not be opened.
- **Digital Fairness Act.** The Commission's Digital Fairness Fitness Check (October 2024) led to a Digital Fairness Act that is "currently under preparation". It targets dark patterns, addictive design, unfair personalisation and digital-contract problems, with a focus on minors [57].
- **EDPB.** The EDPB has published final guidelines (03/2022, v2.0, dated 24 February 2023) on deceptive design patterns *in social media platform interfaces* under the GDPR [58]. Lucid is not a social media platform, so these are indirect guidance. Only the landing page was opened.
- **DSA Article 28 guidelines** (14 July 2025, voluntary, for online platforms accessible to minors) [59]:
  - "Disabling by default features that contribute to excessive use", naming **communication** streaks, ephemeral content, read receipts, autoplay and push notifications. The text targets social "communication streaks", not solo learning streaks; applying it to a learning streak is our extrapolation;
  - "removing persuasive design features aimed predominantly at engagement";
  - "putting safeguards around AI chatbots integrated into online platforms";
  - preventing exploitation of children's lack of commercial literacy, including through "certain virtual currencies or loot-boxes".

**Counter-evidence from industry.** Duolingo's own data shows streak mechanics raise engagement [5][6]. The ethical question is whether a loss-aversion engine aimed at teenagers is in their "best interests" (see §9). The data does not show whether streaks improve *learning*.

### Strength of evidence

- **The FTC report** is regulator guidance plus enforcement history: authoritative for US practice, but a staff report, not a rule.
- **Mathur et al.** is peer-reviewed measurement.
- **EU instruments** range from binding (the CRD amendment, via national transposition) to voluntary (the DSA guidelines).
- **Click-to-cancel** is legally in flux, but the direction of travel is consistent across jurisdictions.

### What it means for Lucid

A premium subscription product for teens and second-language readers should do the following:

- **Cancel in the same place and with the same effort as sign-up.**
- **Show the full price up front.**
- **Use no virtual currency, fake urgency or confirmshaming.**
- **Treat streak-like features as opt-in, flexible and never purchasable.** This also turns compliance into a brand promise ("calm, honest premium") that sets Lucid apart from gamified competitors.

---

## 8. Notification ethics

### Evidence summary

**Apple** [60].
- "You need to get permission before sending any notification."
- Provide an in-app settings screen to change the choice.
- "Don't use notifications to send marketing or promotional content unless people explicitly agree."
- "Build trust by accurately representing the urgency of each notification."
- Use Time Sensitive only for events "happening now or will happen within an hour", and never for marketing.

**COGA** [32]. Reminders "must be set only at the user's request". Users control "when reminders are sent, the frequency and type", and interruptions should be easy to control.

**Attention costs.**
- Alerts on vs off raised self-reported inattention and hyperactivity over a week [35].
- Notifications impaired a sustained-attention task even when ignored [36].

**Industry optimisation.**
- Duolingo's reminder bandit optimises for a lesson within two hours and found that reminder templates lose effect with repetition (novelty decay) [7][8].
- The gains were +0.5% DAU and +2% new-user retention over a strong baseline [7]. That is real, but small relative to the attention cost imposed on every recipient.

**Minors.**
- The ICO lists notifications among "sticky" features that can make it "difficult for children to disengage" [63].
- The DSA guidelines recommend push notifications off by default for minors on in-scope platforms [59].

### Strength of evidence

- **Attention harms**: experimental and quasi-experimental [35][36], but short-term, general-population and partly self-reported.
- **Platform and regulator guidance**: consensus.
- **Industry results**: peer-reviewed engineering work showing small engagement gains [7].

### What it means for Lucid

- **Learner-initiated reminders only, at a learner-chosen time**, with at most one per day.
- **No guilt, no marketing pushes without separate opt-in**, and no notifications during a lesson.
- **Reminders back off when ignored.** Default to off for under-18s unless the learner sets one.

---

## 9. Designing for learners aged 16–17 (ICO Age Appropriate Design Code; EU DSA)

### Evidence summary

**Scope** [62][66].
- The ICO children's code applies where a service is "likely to be accessed by children under the age of 18".
- This includes "non-UK companies who process the personal data of UK children".
- It has 15 standards, including:
  - best interests of the child;
  - DPIAs;
  - age-appropriate application;
  - transparency;
  - detrimental use of data;
  - "high privacy" default settings;
  - data minimisation;
  - geolocation off by default;
  - profiling "off" by default "unless you can demonstrate a compelling reason";
  - nudge techniques;
  - online tools for exercising rights [61][62].

**Detrimental use** [63].
- Reward loops, continuous scrolling, notifications and autoplay are named as sticky features.
- "Designing in data-driven features which make it difficult for children to disengage with your service is likely to breach" fairness.
- Recommends "pause buttons which allow children to take a break at any time without losing their progress".

**Nudges** [64].
- Do not use nudges to obtain unnecessary data or weaken privacy, including making one option "much less cumbersome or time consuming than the alternative".
- Pro-privacy and wellbeing nudges are encouraged.
- **For ages 16–17 ("approaching adulthood"):**
  - high-privacy design by default;
  - "explanations of functionality and inherent risk";
  - options presented "in ways that encourage conscious decision making";
  - "Suggest wellbeing enhancing behaviours (such as taking breaks)" and provide "mid-level pause and save features".

**Age assurance** [65].
- Options listed are self-declaration, artificial-intelligence estimation, third-party age verification services, account-holder confirmation, technical measures and hard identifiers. The ICO recommends that you "avoid giving users no choice but to provide hard identifiers" unless the risks really warrant it.
- A service may instead "apply the standards to all your users".

**EU DSA Article 28 guidelines** [59]. Engagement features off by default for minors, accounts private by default, and safeguards on integrated AI chatbots.

### Strength of evidence

- **ICO code**: a UK regulator's code of practice and authoritative for UK users; it applies to Lucid only if UK children use it.
- **DSA guidelines**: voluntary, and scoped to "online platforms". Whether Lucid is one depends on whether it hosts and publicly shares user content, which needs legal review.
- **Israel**: no opened source covered Israeli rules on minors' data. Counsel must check, for example, the Privacy Protection Law and its recent amendments.
- **Neither instrument is empirical evidence about learning.** Both are precautionary codes.

### What it means for Lucid

The ICO explicitly allows applying the standards to everyone [65], and Lucid's positioning is a calm, mature product. The simplest and most defensible approach is therefore **one high-privacy, low-pressure default experience for all users**, with extra restrictions for self-declared under-18s. Adaptive learning involves profiling learner performance. It must be justified as core to the service (a "compelling reason") in a DPIA. Marketing and advertising profiling stays off.

---

## Implementation decisions for Lucid

Each decision is concrete, testable and linked to the evidence above. A source marked "(heuristic)" means the exact number is a Lucid design choice consistent with the cited guidance, not a value the source specifies.

### A. Focus, structure and tone

**D1. One primary action per lesson screen; five or fewer primary choices per screen anywhere.** This applies to global navigation items, home-screen tiles and settings top level.
- *Test:* a UI audit script counts primary-styled buttons per route (≤1 in lesson routes) and top-level navigation items (≤5).
- *Evidence:* [32] ("five or less main choices on each screen"), [1], [19].

**D2. Lesson focus mode.** Inside a lesson or review session, hide global navigation, streak or progress widgets, promotions and non-urgent banners. Show only:
- a step indicator ("4 / 12");
- Exit;
- Help;
- the exercise.

*Test:* an E2E check that no element with `data-region="global-nav"` and no toast is rendered in `/lesson/*` routes. *Evidence:* [14], [19], [32], [3].

**D3. Simple first, then powerful (progressive disclosure).**
- Advanced controls sit behind "More options" or "Advanced" and are never shown on first run: SRS interval tuning, keyboard shortcuts, CEFR descriptor detail, export.
- Offer a **Simplified view** setting that reduces the app to at most 6 functions (Learn, Review, Write, Talk, Progress, Help) with one-tap return to full view.
- *Evidence:* [13], [11], [32] ("3 to 6 functions").

**D4. Plain, uninvented feature names.** Use "Lessons", "Review", "Writing", "Conversations", "Tutor", "Progress". No branded jargon. Hebrew UI copy is limited to 1 idea per sentence, with sentence-length lint ≤ 20 words. *Evidence:* [13], [1], [32] ("Use Clear Words"); [4] ("build for the global user").

**D5. Onboarding ≤ 4 screens before the first real exercise.** The sequence is:
1. Hebrew/English interface choice.
2. Goal (core path / Real-Life English / both).
3. "Start from zero" **or** "Take placement test (≈15 min, untimed, can pause)".
4. A first interactive exercise.

Account creation, notification permission and payment come *after* the first completed lesson. Intro screens are skippable, and a skipped tutorial is never re-shown but stays findable in Help. *Test:* a funnel instrumentation check confirms the first exercise renders after ≤4 screens. *Evidence:* [2], [9], [32] ("Make Short Critical Paths").

**D6. Warm, calm visual language.**
- Low-saturation warm neutrals, softened borders, few small icons.
- No mascots that express disappointment or guilt.
- Theme tokens are generated from 3 inputs (base, accent, contrast) so that high-contrast themes are automatic.
- *Evidence:* [14], [15], [9], [24].

### B. Feedback, rewards and motivation

**D7. Every answer gets high-information feedback within 300 ms (heuristic).** Feedback says:
- what was right;
- what to change;
- the correct form;
- a one-line rule or example, with "Why?" to expand.

Praise-only messages ("Great!") are never shown alone.
- *Test:* the content schema requires an `explanation` field on every exercise item, and CI fails if it is missing.
- *Evidence:* [22] (corrective feedback d = 0.46 and high-information feedback d = 0.99, vs reinforcement/punishment d = 0.24), [21] (verbal positive feedback enhanced intrinsic motivation, d = 0.33).
- *Evidence caveat (verification 2026-10-30):* the format above (right/wrong + correct form + rule) matches [22]'s **corrective** category (d = 0.46). The d = 0.99 "high-information" category also includes self-regulation information (monitoring attention, emotion or motivation), which D7 does not specify. So the d = 0.99 figure does not directly support D7 as written, and the meta-analysis is not L2-specific.

**D8. Feedback is multi-modal and accessible.**
- Each result shows an **icon (✓ / ✕ shape) + text label + colour**.
- It is announced through an `aria-live="polite"` region without moving focus.
- Optional sound is off by default; optional haptic is used on mobile.
- *Test:* axe plus a unit test asserting the live-region text on submit, and a colour-blindness simulation snapshot.
- *Evidence:* [29] (1.4.1), [26] (4.1.3), [3].

**D9. Rewards are informational, not contingent tokens.**
- Progress is shown as **can-do statements mastered**, words retained and writing criteria improved.
- No points for time spent or lessons opened.
- No lives/hearts that block learning after mistakes.
- *Evidence:* [21] (engagement- and completion-contingent rewards d = −0.40 / −0.36), [20] (small, unstable motivational and behavioural effects), [24].

**D10. Light gamification only, and collaborative before competitive.** Allowed:
- progress visualisation;
- personal bests;
- an optional, private, opt-in "study buddy" or small-group goal.

There are **no public leaderboards or leagues by default**. *Evidence:* [20] (game fiction and social interaction moderated behavioural outcomes, and competition combined with collaboration appeared effective; motivational and behavioural effects were less stable in high-rigour studies), [63], [59].

**D11. AI tutor and roleplay use a hint ladder; they do not hand over answers.** On an error the tutor offers:
1. a metalinguistic hint;
2. a targeted clue or partial answer;
3. the full answer with explanation.

The learner can jump straight to step 3 with one tap, so learner agency is preserved.
- *Test:* a tutor policy unit test checks that the first response to an incorrect attempt contains no full model answer unless the learner asked.
- *Evidence:* [17], [16], [22].

### C. WCAG 2.2 AA (with selected AAA) — acceptance criteria

**D12. Contrast.**
- Body text ≥ 7:1 in light and dark themes, as the design target. The hard floor is 4.5:1, or 3:1 for large text.
- UI components, focus indicators and chart marks ≥ 3:1.
- *Test:* automated contrast check over all colour tokens in all themes (light, dark, high-contrast).
- *Evidence:* [26] (1.4.3, 1.4.11), [47] (strive for 7:1 for custom colours), [30].

**D13. Focus.**
- Every focusable element shows a ≥ 2 CSS px outline offset from the element, with ≥ 3:1 contrast against adjacent colours (AAA 2.4.13 as the default).
- Sticky headers, footers, toasts and chat launchers must never cover the focused element. Set `scroll-padding-block` equal to sticky region heights.
- *Test:* a Playwright keyboard walk on every route asserts the focused element's bounding box is not fully intersected by fixed elements.
- *Evidence:* [25] (2.4.11, 2.4.13), [67] (sticky headers/footers, cookie banners, chat windows), [26] (2.4.7).

**D14. Target size.**
- All interactive targets are ≥ 44×44 CSS px, including answer tiles, audio buttons and navigation icons.
- There is ≥ 8 px spacing between adjacent answer tiles (heuristic).
- The hard floor is 24×24 with the spacing exception. Inline text links are exempt.
- *Test:* a DOM audit of computed sizes.
- *Evidence:* [25] (2.5.8), [30] (44×44 pt default; spacing guidance).

**D15. No drag-only interactions.** Every word-order, matching and sorting exercise supports tap-to-select then tap-to-place, plus keyboard (arrow keys + Enter). *Test:* each exercise type has an E2E test completed using only clicks and only the keyboard. *Evidence:* [25] (2.5.7).

**D16. Untimed by default.**
- Lessons, reviews, the placement test and the writing lab have **no time limits**.
- Any timed practice mode is opt-in and labelled. It can be turned off or extended to ≥ 10× from the same screen.
- Logged-in sessions do not time out in under 20 hours. Otherwise, warn ≥ 20 s before expiry and offer one-click extend.
- *Evidence:* [26] (2.2.1), [27] (timed tests are not automatically "essential"), [30], [24].

**D17. Never lose work.**
- Exercise answers persist on submit.
- Writing-lab drafts autosave at most 2 s after typing stops (heuristic) and on blur.
- Leaving any flow mid-way returns the learner to the same step.
- *Test:* E2E reload mid-lesson and mid-essay; state is restored.
- *Evidence:* [32] ("Avoid Data Loss and Timeouts"), [63] (pause without losing progress).

**D18. Consistent help.**
- A "Help" control (AI tutor, help centre, human contact) sits in the same relative position in the header, at the inline-end, on every page including lessons and checkout.
- The human contact route is reachable in ≤ 2 activations.
- *Test:* a snapshot test of header order across routes.
- *Evidence:* [25] (3.2.6), [32].

**D19. Accessible authentication.**
- Sign-in uses **passkeys (WebAuthn)** or an **email magic link / one-time code**.
- Code fields are a single input with `autocomplete="one-time-code"` and paste allowed.
- Passwords, if offered, support managers (`autocomplete="current-password"` / `"new-password"`). Paste is never blocked.
- No puzzle or maths CAPTCHAs; use invisible risk scoring or rate limiting instead.
- *Evidence:* [26][28] (3.3.8; G218 email-link technique; F109 paste-blocking failure), [32]. Note: [28] lists WebAuthn only as a "potential future technique", so passkeys conform by involving no cognitive function test rather than by a listed sufficient technique.

**D20. Redundant entry.** The placement level, goals, name and email entered once are pre-filled everywhere later, including checkout, profile and tutor context. The learner is never asked to re-state their level. *Evidence:* [25] (3.3.7).

**D21. Language of parts.**
- The Hebrew UI uses `<html lang="he" dir="rtl">`.
- Every English block uses `lang="en" dir="ltr"`, and every inline English phrase in Hebrew text is wrapped in `<span lang="en" dir="ltr">` or `<bdi lang="en">`.
- *Test:* a lint rule flags Latin-script text nodes inside `lang="he"` elements that have no `lang="en"` ancestor.
- *Evidence:* [26] (3.1.2), [39], [40].

**D22. Reflow, zoom and spacing.**
- Layouts work at 320 CSS px with no horizontal scroll, except data tables and charts.
- Text scales to 200% without loss.
- Content survives the 1.4.12 spacing overrides.
- *Test:* a visual regression run at 320 px, at 200% zoom and with a text-spacing bookmarklet stylesheet.
- *Evidence:* [26], [30].

**D23. Conformance target and statement.**
- WCAG 2.2 AA plus 2.4.13 and 2.3.3 (AAA).
- Publish a Hebrew/English accessibility statement with a contact route.
- Verify Israeli requirements with counsel. The register lists WCAG 2.0 AA, which 2.2 AA exceeds.
- *Evidence:* [25], [31].

### D. Cognitive accessibility and ADHD-friendly defaults

**D24. Chunking.**
- Lessons are split into steps with a visible step counter.
- Audio and video segments are ≤ 2 minutes (heuristic) and each has a heading, transcript and a "skip if known" option.
- Reading passages have section headings and a 1-sentence summary at the top.
- *Evidence:* [32] (Break Media into Chunks; persona Yuki), [34].

**D25. Pause and resume anywhere.**
- A persistent "Pause" sits in lesson chrome and saves state.
- A "Resume where you left off" card is the first item on Home.
- *Evidence:* [63], [64], [32].

**D26. No unsolicited interruptions.**
- No modals, tooltips, upsells, rating prompts or "new feature" popovers during lessons.
- Rating or upgrade prompts appear at most once per 30 days (heuristic) and only on Home after a completed session.
- *Evidence:* [32] ("Limit Interruptions"), [2], [10], [53] (nagging).

**D27. Reading preferences.**
- Settings offer text size (100–200%), line spacing (1.5 default), maximum line length (default 70 characters / about 66ch, range 50–75), background tint (off-white default, cream, none) and a font choice.
- The default font is a plain, well-hinted Hebrew + Latin family. Specialised "dyslexia" fonts may be offered but **never as default or as a promise**.
- *Evidence:* [37], [38], [26] (1.4.12), [32] (personalisation).

**D28. Inclusive research.**
- Every usability round includes at least 1 participant with ADHD and at least 1 with dyslexia (heuristic quota), plus at least 1 screen-reader user.
- Feature framing avoids deficit language: no "ADHD mode", instead "Focus settings".
- *Evidence:* [32] (testing guidance), [33].

### E. RTL and bidi

**D29. Logical CSS only.**
- Stylelint bans physical properties and values: `margin-left/right`, `padding-left/right`, `left/right`, `float: left/right`, `text-align: left/right`, `border-left/right`. Use `*-inline-start/end`, `inset-inline-*` and `text-align: start/end`.
- *Test:* CI lint, plus Playwright screenshot pairs (`dir=rtl` vs `dir=ltr`) for every component.
- *Evidence:* [39], [46].

**D30. Mirroring map.**

| Element | In Hebrew UI |
|---|---|
| Navigation, back/next arrows | Mirror (back points right) |
| Lesson progress bar and step sequence | Mirror (fills from the right) |
| Sliders | Mirror |
| Breadcrumbs | Mirror |
| **Audio/video playback controls and scrubber** | **Do not mirror** |
| Clocks and timers | Do not mirror |
| Checkmarks and logos | Do not mirror |
| Question-mark (help) icon | LTR form, pending a check with Hebrew readers ([44] mentions Hebrew vs Arabic but gives no explicit rule) |
| Digits and phone numbers | Do not mirror |
| Photographs and illustrations | Do not mirror |

*Evidence:* [43], [44], [45].

**D31. English exercise zones are LTR islands.**
- Sentence builders, word tiles, gap-fills, transcripts, the writing editor and roleplay transcripts are `dir="ltr" lang="en"`, with tile order left-to-right even in the Hebrew UI.
- Instructions around them stay Hebrew RTL.
- The tutor chat input uses `dir="auto"` with `dirname`, because learners may type in Hebrew or English.
- *Evidence:* [39], [40], [41].

**D32. Bidi safety for dynamic strings.**
- All interpolated values in Hebrew strings are isolated with `<bdi>` in HTML, or FSI…PDI in `title`/attribute strings: usernames, English words, numbers with units, URLs.
- Never use RLE/LRE embeddings.
- *Test:* unit tests render strings with trailing punctuation and leading numbers and assert visual order.
- *Evidence:* [40], [41], [42].

**D33. Mixed-script typography.**
- Hebrew paragraphs are right-aligned and English paragraphs left-aligned, aligned by language for blocks of 3 or more lines.
- Lists use one alignment.
- Avoid all-caps Latin in the UI. Where Latin and Hebrew sit side by side, the Hebrew optical size is tuned (about +2 pt where needed).
- *Evidence:* [45].

**D34. Progress charts.**
- Time-series charts keep a left-to-right time axis (unmirrored), with Hebrew labels and a text summary ("This week: 42 words reviewed, up 8 from last week").
- **Open question:** validate with 5+ Hebrew-speaking users against an RTL-axis variant, because the guidance conflicts.
- *Evidence:* [43], [44] vs [45].

### F. Dark mode and theming

**D35. Theme behaviour.**
- The default follows `prefers-color-scheme`.
- Settings offer System / Light / Dark, with System as default. A high-contrast variant is generated from the contrast token, and `forced-colors` is supported.
- *Evidence:* [47], [48], [15].

**D36. Dark palette rules.**
- Surfaces are dark grey (no pure #000 for large surfaces); elevated surfaces are lighter.
- Accents are desaturated for dark (validated by contrast tests rather than inversion).
- Photo and illustration assets with white backgrounds are dimmed slightly in dark mode.
- Both themes are tested at every release.
- *Evidence:* [47], [49].

### G. Motion

**D37. Motion budget.**
- UI transitions are ≤ 200 ms (heuristic) and are never blocking: input is accepted during animation.
- No parallax, no scroll-triggered movement, no auto-advancing carousels.
- No autoplaying audio or video. Audio plays only on tap, apart from a learner-enabled "autoplay prompt audio" option.
- *Evidence:* [50], [30], [26] (2.2.2).

**D38. Reduced motion.**
- Under `prefers-reduced-motion: reduce`, or an in-app "Reduce motion" toggle, all transform and translate animations are replaced by ≤ 150 ms opacity fades or none.
- Celebration effects are disabled.
- Correctness is still conveyed by icon and text.
- *Test:* E2E runs with emulated reduced motion and asserts no CSS transform animations.
- *Evidence:* [51] (2.3.3; C39, SCR40, user setting), [52], [30].

**D39. Celebrations are brief and skippable.** End-of-lesson summary animation is ≤ 1 s, can be skipped with any input, and never sits between exercises. *Evidence:* [50] ("Let people cancel motion"), [19].

### H. Ethical engagement, pricing and cancellation

**D40. Rhythm, not streak.**
- Lucid offers an **opt-in weekly study rhythm**, for example "3 sessions/week", rather than a daily streak.
- It is off by default for all users and never enabled by default for under-18s.
- Missing a week shows neutral copy ("Welcome back — pick up where you left off"). There is no loss-framed messaging ("You'll lose…"), no paid or currency-based repair, and two "rest" weeks per quarter are automatic (heuristic).
- *Evidence:* [6] (loss aversion acknowledged; Duolingo cites a University of Pennsylvania/UCLA study that slack "helps people stay persistent", reported second-hand), [5], [59] (*communication* streaks off by default for minors; applying this to a solo learning streak is our extrapolation), [63] (reward loops named as sticky features).

**D41. No virtual currency, ever.** All prices are in real currency (ILS, VAT included) at first display. *Evidence:* [53] (intermediate currency; drip pricing), [59].

**D42. No fake urgency or scarcity.** Countdown timers, "only X left", "N people are learning now" and false discounts are banned. A promotion must have a real end date stated in plain text. *Test:* a content lint on marketing strings and a design review checklist. *Evidence:* [53], [54].

**D43. Symmetric choices.**
- Accept and decline buttons share the same size and style tier.
- Decline labels are neutral ("No thanks").
- "Not now" is used only when a permanent "Don't ask again" is also offered. The same permission prompt is never shown more than twice.
- No pre-checked marketing or add-on boxes.
- *Evidence:* [53] (false hierarchy, confirmshaming, nagging, preselection), [64].

**D44. Cancellation as easy as sign-up.**
- Settings → Subscription → "Cancel subscription" → one confirmation screen showing the end date → done. That is ≤ 3 activations from Settings, on the same web and app surface used to subscribe.
- An optional "Pause instead" button may sit *on the same confirmation screen*, but no extra interstitials.
- Email confirmation is sent immediately.
- During any statutory withdrawal period, a "Withdraw from contract here" function is continuously available in the account area, with a "Confirm withdrawal" step and a durable-medium acknowledgement.
- *Test:* E2E counts activations for cancel ≤ activations for subscribe.
- *Evidence:* [53] (ROSCA "at least as easy"; no save offers that cause unreasonable delay), [55], [56].

**D45. Honest trials and renewals.**
- Trial-to-paid conversion requires an explicit, unchecked consent.
- A reminder email and in-app notice goes out ≥ 3 days before the first charge and before each annual renewal (heuristic).
- The full price, billing interval and cancellation path are shown on the checkout screen.
- *Evidence:* [53] (hidden subscription/forced continuity; express informed consent), [55].

**D46. Account deletion and data export in-app.** Self-service deletion and export are available from Settings, with no support ticket needed. *Evidence:* [53] ("immortal accounts"), [62] (online tools).

### I. Notifications

**D47. Permission only after intent.**
- The browser or OS notification permission is requested **only** after the learner turns on a reminder in Settings or the post-lesson "Remind me?" card.
- It is never requested on first load.
- *Evidence:* [60], [32], [2].

**D48. Reminder defaults.**
- At most 1 learning reminder per day, at the learner-chosen time.
- Quiet hours 21:00–08:00 local by default (heuristic), enforced for under-18s.
- No reminders while a lesson is open.
- Interruption level is passive/active only, never time-sensitive.
- *Evidence:* [60], [35], [36], [32].

**D49. Back-off.**
- After 5 consecutive ignored reminders (heuristic), reminders pause automatically and one in-app question asks whether to keep, change or stop them.
- No escalation in tone or frequency, and no guilt or mascot-shaming copy.
- *Evidence:* [7] (novelty decay; optimisation target is engagement), [32], [53] (nagging).

**D50. Marketing is separate.** Marketing email and push use a separate, default-off opt-in. The notification settings screen offers per-category toggles (reminders, writing feedback ready, account/billing, product news). *Evidence:* [60], [62].

### J. Learners aged 16–17

**D51. Neutral age question at sign-up.** Ask for birth year from a neutral list, with no "18+" pre-selected and no nudge to lie. Self-declaration is acceptable for this risk level; hard ID is never required. *Evidence:* [64], [65].

**D52. One high-privacy baseline for everyone.**
- No geolocation.
- No public profile.
- No third-party advertising or marketing profiling.
- No social features that expose a learner to strangers.
- Data minimised to what learning requires.
- Adaptive-engine profiling is documented in a DPIA as core to the service.
- *Evidence:* [62], [65] (apply the standards to all users), [59].

**D53. Additional under-18 defaults.** For self-declared under-18s:
- streak/rhythm, push reminders and marketing are **off and not pre-suggested**;
- after 45 minutes of continuous study (heuristic), a gentle optional break suggestion appears, with Pause & Save;
- privacy and AI-tutor explanations are written for 16–17 readers ("what this does, what it stores, risks");
- AI roleplay scenarios are filtered for age-appropriateness.

*Evidence:* [64] (16–17 recommendations), [63], [59] (AI chatbot safeguards).

**D54. Explain AI and data in context.** At first use of the writing lab, tutor and roleplay, a 2–3 sentence Hebrew explanation covers what is analysed, what is stored and for how long, and how to delete it, with a link to the full policy. *Evidence:* [62] (transparency), [64].

---

## What not to build

1. **Daily streaks with loss-framed copy, paid or currency-based streak repair, or streak "wagers".** Their engine is loss aversion [6]. For minors, the DSA guidelines flag *communication* streaks (an extrapolation to learning streaks) [59], and the ICO names reward loops as sticky features [63]. Their benefits are measured in engagement, not learning [5].
2. **Virtual currencies (gems, coins), lives or hearts that block learning after mistakes, and loot-box-style rewards.** These are dark patterns [53] and flagged for minors [59]. They punish errors in a domain where anxiety correlates with lower achievement [24], and they conflict with informative feedback [22].
3. **Public leaderboards or leagues with demotion by default.** Motivational benefits are unstable [20], and competitive pressure conflicts with best-interests duties for teens [62].
4. **XP or points for time spent, or "engagement-contingent" rewards** [21].
5. **Fake urgency or scarcity**: countdown timers, "only X left", live "learners online now" counters, or false discounts [53][54].
6. **Retention mazes, phone-only cancellation, or save-offer interstitials blocking cancellation** [53][55][56]. Also hidden auto-renewal [53].
7. **Confirmshaming, nagging permission prompts without a permanent "no", and pre-checked boxes** [53][64].
8. **Autoplaying audio or video, auto-advancing carousels, parallax and scroll-jacking, and auto-chaining "next lesson starts in 3…"** [26][30][50][51][53].
9. **Default timers on exercises, the placement test or writing tasks** [26][27][32].
10. **Drag-only exercises** [25].
11. **Blocking paste, split OTP boxes that reject paste, puzzle CAPTCHAs, or password complexity rules that force memorisation** [28].
12. **Notification permission on first launch, more than one reminder per day by default, guilt-trip or mascot-shaming notifications, or marketing via the reminder channel** [32][35][36][60].
13. **Mirrored media controls, mirrored English content or word tiles, reversed digits, and physical left/right CSS** [39][43][44][45].
14. **An app-specific dark mode that ignores the OS by default, or a dark theme made by colour inversion** [47][49].
15. **A "dyslexia font" as the default or as a marketing promise, or an "ADHD mode" framed as a fix** [33][37][38].
16. **Celebration animations that block input or sit between exercises** [50].
17. **Unsourced efficacy claims** in marketing (for example "Nx more effective") without a citable study, which would be a "false belief" design pattern [53].
18. **Copying any competitor's visual identity, mascot or mechanics.** This report extracts principles only.

---

## Sources

All sources accessed 2026-10-30.

| # | Reference | URL opened | Evidence type |
|---|---|---|---|
| 1 | Apple Inc. (n.d., current). *Design principles*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/design-principles.json (data feed of developer.apple.com/design/human-interface-guidelines/design-principles) | Guidance (platform) |
| 2 | Apple Inc. (n.d., current). *Onboarding*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/onboarding.json | Guidance |
| 3 | Apple Inc. (n.d., current). *Feedback*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/feedback.json | Guidance |
| 4 | Kansu, C. (2024, Feb 21). *3 principles our VP of Product swears by*. Duolingo Blog. | https://blog.duolingo.com/product-principles | Opinion (company) |
| 5 | Yu, A. (2020, Nov 19). *Improving the streak: Forming habits one lesson at a time*. Duolingo Blog. | https://blog.duolingo.com/improving-the-streak | Opinion / self-reported A/B results |
| 6 | Mansur, O. (2022, Jan 31). *The habit-building research behind your Duolingo streak*. Duolingo Blog. | https://blog.duolingo.com/how-duolingo-streak-builds-habit | Opinion / self-reported data |
| 7 | Yancey, K. P., & Settles, B. (2020). A sleeping, recovering bandit algorithm for optimizing recurring notifications. *Proc. KDD '20*. doi:10.1145/3394486.3403351 | https://research.duolingo.com/papers/yancey.kdd20.pdf | Experiment (peer-reviewed, industry) |
| 8 | Yancey, K., & Settles, B. (2020, Sep 3). *"Hi, it's Duo": Meet the AI behind the meme*. Duolingo Blog. | https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/ | Opinion (company) |
| 9 | Bilham, J. (2021, May 10). *Case study: How Headspace designs for mindfulness*. Raw.Studio (analysis of Vicki Tan and Christine Cha's Headspace "Design for Change" talk). | https://raw.studio/blog/how-headspace-designs-for-mindfulness/ | Design analysis (secondary) |
| 10 | Bruton, L. (2022, Apr 12). *Design and wellbeing with Headspace's Raleigh Tomlinson*. UX Design Institute. | https://uxdesigninstitute.com/blog/?p=6500 | Opinion (practitioner interview) |
| 11 | DeAmicis, C. (2019, Mar 6). *Design on a deadline: How Notion pulled itself back from the brink of failure*. Figma Blog. | https://figma.com/blog/design-on-a-deadline-how-notion-pulled-itself-back-from-the-brink-of-failure/ | Design analysis / interview |
| 12 | Teton-Landis, J. (2021, May 18). *The data model behind Notion's flexibility*. Notion Blog. | https://www.notion.com/blog/data-model-behind-notion | Opinion (company engineering) |
| 13 | Linear (n.d., current). *Principles & Practices — Linear Method*. | https://linear.app/method/introduction | Opinion (company) |
| 14 | Aufmann, C., & Heckel, M. (2026, Mar 12). *A calmer interface for a product in motion*. Linear Now. | https://linear.app/now/behind-the-latest-design-refresh | Opinion (company design writing) |
| 15 | Saarinen, K., Gillet, Y.-E., Eldh, A., & Cascino, R. (2024, Mar 28). *How we redesigned the Linear UI (part II)*. Linear Now. | https://linear.app/now/how-we-redesigned-the-linear-ui | Opinion (company design writing) |
| 16 | Brilliant.org (n.d., current). Homepage. | https://brilliant.org/ | Opinion (company marketing) |
| 17 | Brilliant Worldwide, Inc. (n.d., current). *Brilliant: Learn Math & Coding* (App Store listing). | https://apps.apple.com/app/brilliant-learn-by-doing/id913335252 | Opinion (company marketing) |
| 18 | Bohn, T. (2020, Jun 30). *The secret behind Babbel: Our language learning approach is built on 3 pillars*. Babbel Magazine. | https://babbel.com/en/magazine/secret-behind-babbel | Opinion (company) |
| 19 | Schenker, M. (2018, Jan 22). *How Babbel turns language learning into a lesson in great UX design*. Adobe XD Ideas. | https://xd.adobe.com/ideas/principles/app-design/simple-intuitive-gamified-babbel-language-learning-great-ux-design | Design analysis with practitioner quotes |
| 20 | Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educational Psychology Review, 32*(1), 77–112. doi:10.1007/s10648-019-09498-w | https://www.fachportal-paedagogik.de/literatur/vollanzeige.html?FId=eric_ej1245270 (ERIC record; Springer page redirected to login) | Meta-analysis |
| 21 | Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin, 125*(6), 627–668. | https://pubmed.ncbi.nlm.nih.gov/10589297/ | Meta-analysis |
| 22 | Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A meta-analysis of educational feedback research. *Frontiers in Psychology, 10*, 3087. | https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2019.03087/full | Meta-analysis |
| 23 | Freeman, S., et al. (2014). Active learning increases student performance in science, engineering, and mathematics. *PNAS, 111*(23), 8410–8415. | https://pubmed.ncbi.nlm.nih.gov/24821756/ | Meta-analysis |
| 24 | Teimouri, Y., Goetze, J., & Plonsky, L. (2019). Second language anxiety and achievement: A meta-analysis. *Studies in Second Language Acquisition, 41*(2), 363–387. | https://www.cambridge.org/core/product/identifier/S0272263118000311/type/journal_article | Meta-analysis (correlational) |
| 25 | W3C WAI (2023, updated). *What's New in WCAG 2.2*. | https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/ | Framework / standard summary |
| 26 | W3C (2024, Dec 12). *Web Content Accessibility Guidelines (WCAG) 2.2*. W3C Recommendation. | https://www.w3.org/TR/WCAG22/ | Standard (normative) |
| 27 | W3C WAI (n.d.). *Understanding SC 2.2.1 Timing Adjustable*. | https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html | Guidance (informative) |
| 28 | W3C WAI (n.d.). *Understanding SC 3.3.8 Accessible Authentication (Minimum)*. | https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html | Guidance (informative) |
| 29 | W3C WAI (n.d.). *Understanding SC 1.4.1 Use of Color*. | https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html | Guidance (informative) |
| 30 | Apple Inc. (n.d., current). *Accessibility*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/accessibility.json | Guidance |
| 31 | W3C WAI (2017, last updated). *Web Accessibility Laws & Policies: Israel*. | https://www.w3.org/WAI/policies/israel/ | Framework (policy register) |
| 32 | W3C Cognitive and Learning Disabilities Accessibility Task Force (COGA TF), with the APA and AG Working Groups (2021, Apr 29). *Making Content Usable for People with Cognitive and Learning Disabilities*. W3C Working Group Note. | https://www.w3.org/TR/coga-usable/ | Guidance (expert consensus, non-normative) |
| 33 | Spiel, K., Hornecker, E., Williams, R. M., & Good, J. (2022). ADHD and technology research – investigated by neurodivergent readers. *Proc. CHI '22*, Article 547. doi:10.1145/3491102.3517592 | https://dare.uva.nl/id/b5158a6b-ee52-48a7-b4be-772d430bad4a | Review (critical literature review) |
| 34 | Zhu, H., Zhang, W., Wang, R., & Zhao, Y. (2026, Sep 8). "It's like drinking from a fire hose": Understanding and characterizing video learning experiences for individuals with ADHD. arXiv:2609.09443 (preprint). | https://arxiv.org/abs/2609.09443 | Experiment / qualitative study (preprint, N = 16) |
| 35 | Kushlev, K., Proulx, J., & Dunn, E. W. (2016). "Silence your phones": Smartphone notifications increase inattention and hyperactivity symptoms. *Proc. CHI '16*, 1011–1020. doi:10.1145/2858036.2858359 | https://www.interruptions.net/literature/Kushlev-CHI16.pdf | Experiment (within-subject field; N = 221 undergraduates, general participant pool) |
| 36 | Association for Psychological Science (2015). *You're a distracted driver even when you ignore that text* (report on Stothart, Mitchum & Yehnert, 2015, *JEP: Human Perception and Performance, 41*(4), 893). | https://www.psychologicalscience.org/news/motr/youre-distracted-even-when-you-ignore-that-text.html | Experiment (reported via secondary source) |
| 37 | Dyslexia Scotland (2025, Sep 12). *Dyslexia-friendly typed formats*. | https://dyslexiascotland.org.uk/dyslexia-friendly-typed-formats | Guidance (charity) |
| 38 | Wery, J. J., & Diliberto, J. A. (2016/2017). The effect of a specialized dyslexia font, OpenDyslexic, on reading rate and accuracy. *Annals of Dyslexia, 67*(2), 114–127. | https://pmc.ncbi.nlm.nih.gov/articles/PMC5629233/ | Experiment (single-subject alternating treatment, N = 12 elementary-age students, 11 completed) |
| 39 | W3C Internationalization (n.d.). *Structural markup and right-to-left text in HTML*. | https://www.w3.org/International/questions/qa-html-dir | Guidance (standards body) |
| 40 | W3C Internationalization (n.d.). *Inline markup and bidirectional text in HTML*. | https://www.w3.org/International/articles/inline-bidi-markup/ | Guidance (standards body) |
| 41 | W3C Internationalization (n.d.). *Unicode Bidirectional Algorithm basics*. | https://www.w3.org/International/articles/inline-bidi-markup/uba-basics | Guidance (standards body) |
| 42 | W3C Internationalization (n.d.). *How to use Unicode controls for bidi text*. | https://www.w3.org/International/questions/qa-bidi-unicode-controls | Guidance (standards body) |
| 43 | Google (n.d., archived edition). *Bidirectionality*. Material Design (v1, no longer maintained). | https://m1.material.io/usability/bidirectionality.html | Guidance (design system) |
| 44 | Wikimedia Foundation (n.d., current). *Bidirectionality*. Codex Design System style guide. | https://doc.wikimedia.org/codex/main/style-guide/bidirectionality.html | Guidance (design system) |
| 45 | Apple Inc. (n.d., current). *Right to left*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/right-to-left.json | Guidance |
| 46 | MDN Web Docs (n.d., current). *Basic concepts of logical properties and values*. | https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values/Basic_concepts_of_logical_properties_and_values | Guidance (technical documentation) |
| 47 | Apple Inc. (n.d., current). *Dark Mode*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/dark-mode.json | Guidance |
| 48 | Budiu, R. (2020, Feb 2). *Dark mode vs. light mode: Which is better?* Nielsen Norman Group. | https://www.nngroup.com/articles/dark-mode/ | Review (practitioner summary of experiments) |
| 49 | Material Components for Android (n.d., current). *Dark theme* (docs/theming/Dark.md). | https://github.com/material-components/material-components-android/blob/master/docs/theming/Dark.md | Guidance (design system docs) |
| 50 | Apple Inc. (n.d., current). *Motion*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/motion.json | Guidance |
| 51 | W3C WAI (n.d.). *Understanding SC 2.3.3 Animation from Interactions*. | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | Guidance (informative) |
| 52 | MDN Web Docs (n.d., current). *prefers-reduced-motion*. | https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion | Guidance (technical documentation) |
| 53 | Federal Trade Commission (2022, Sept). *Bringing Dark Patterns to Light*. Staff Report. | https://www.ftc.gov/system/files/ftc_gov/pdf/P214800%20Dark%20Patterns%20Report%209.14.2022%20-%20FINAL.pdf (landing page https://www.ftc.gov/reports/bringing-dark-patterns-light also opened) | Guidance (regulator staff report) |
| 54 | Mathur, A., Acar, G., Friedman, M. J., Lucherini, E., Mayer, J., Chetty, M., & Narayanan, A. (2019). Dark patterns at scale: Findings from a crawl of 11K shopping websites. *Proc. ACM HCI, 3*(CSCW), Art. 81. | https://arxiv.org/abs/1907.07032 | Experiment / measurement study |
| 55 | National Consumers League (2026, Apr 14). *NCL urges FTC to revive Click to Cancel in new proceeding*. | https://nclnet.org/ncl-urges-ftc-to-revive-click-to-cancel-in-new-proceeding/ | Opinion (advocacy; used for regulatory status) |
| 56 | Greenberg Traurig LLP (2026, May 19). *EU consumer law: New withdrawal button requirements for online contracts*. GT Alert. | https://www.gtlaw.com/en/insights/2026/5/eu-consumer-law-new-withdrawal-button-requirements-for-online-contracts | Guidance (legal commentary; secondary to Directive (EU) 2023/2673) |
| 57 | European Commission (n.d., current). *Review of EU consumer law* (Digital Fairness Fitness Check; Digital Fairness Act). | https://commission.europa.eu/law/law-topic/consumer-protection-law/review-eu-consumer-law_en | Framework (policy) |
| 58 | European Data Protection Board (2023, Feb 24). *Guidelines 03/2022 on deceptive design patterns in social media platform interfaces: how to recognise and avoid them*, v2.0 (final). | https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en | Guidance (regulator; landing page only) |
| 59 | European Commission (2025, Jul 14). *Commission publishes guidelines on the protection of minors* (DSA Art. 28). | https://digital-strategy.ec.europa.eu/en/library/commission-publishes-guidelines-protection-minors | Guidance (regulator, voluntary) |
| 60 | Apple Inc. (n.d., current). *Managing notifications*. Human Interface Guidelines. | https://developer.apple.com/tutorials/data/design/human-interface-guidelines/managing-notifications.json | Guidance |
| 61 | Information Commissioner's Office (n.d., current). *Age appropriate design: a code of practice for online services*. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/ | Framework (regulator code of practice) |
| 62 | ICO (n.d., current). *Code standards*. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/code-standards/ | Framework (regulator code of practice) |
| 63 | ICO (n.d., current). *5. Detrimental use of data*. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/5-detrimental-use-of-data/ | Framework (regulator code of practice) |
| 64 | ICO (n.d., current). *13. Nudge techniques*. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/ | Framework (regulator code of practice) |
| 65 | ICO (n.d., current). *3. Age appropriate application*. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/3-age-appropriate-application/ | Framework (regulator code of practice) |
| 66 | ICO (n.d., current). *Introduction to the children's code*. | https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/introduction-to-the-childrens-code/ | Guidance (regulator) |
| 67 | W3C WAI (n.d.). *Understanding SC 2.4.11 Focus Not Obscured (Minimum)*. (Added during verification, 2026-10-30.) | https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | Guidance (informative) |

**Sources sought but not opened, and therefore not cited for claims:**
- Material Design 2/3 bidirectionality pages (JavaScript-only)
- Brilliant's "interactive play" essay on uxdesign.cc (HTTP 403)
- Springer and PNAS full texts (redirect/403; records used instead)
- EUR-Lex text of Directive (EU) 2023/2673 (bot protection)
- Di Geronimo et al. (2020), ACM DL (403)
- Stern et al. (2024), *J. Attention Disorders* (403)
- BDA Dyslexia Style Guide (404)
- W3C Hebrew layout gap analysis (404 at the tried URL; search budget exhausted)

---

## Verification log (2026-10-30)

Adversarial re-check of every numbered source. Each one was re-opened with WebFetch in this session; for the three PDFs that WebFetch returned as binary ([7], [35] and the FTC report [53]), the downloaded PDF text was extracted locally and searched. For long pages (COGA [32], Frontiers [22]) the same page was also fetched and searched as text to confirm exact quotations. Status keys: **confirmed** (claim and bibliographic details match), **corrected** (partially supported; wording, quotation, numbers or reference fixed in place), **unsupported** (claim removed or marked unverified), **dead/blocked**.

| # | Status | Notes |
|---|---|---|
| 1 | confirmed | Eight principles; all four quotations found under Simplicity, Familiarity and Responsibility. |
| 2 | confirmed | "fast, fun, and optional", "Teach through interactivity", "Postpone nonessential setup flows", ratings/purchases quote. |
| 3 | confirmed | Significance-to-delivery guidance; "Alerts can lose their impact if you use them too often…"; colour/text/sound/haptics for silenced devices and VoiceOver. |
| 4 | corrected | Quotes confirmed. Title was wrong: actual title is "3 principles our VP of Product swears by". |
| 5 | confirmed | +3.3% D14 retention, +1% DAL, +10.5% learners on a streak; fewer learners reach daily goals. Full title added. |
| 6 | corrected | Loss aversion, "demotivating", fear deterring starts, +0.38% from two equipped Freezes all confirmed. Title was wrong: "The habit-building research behind your Duolingo streak". |
| 7 | confirmed | KDD '20, doi:10.1145/3394486.3403351; reward = lesson within two hours; +0.5% DAU, +2% new-user retention "over a strong baseline"; novelty effect and recency penalty. |
| 8 | confirmed | Novelty wearing off. Note: the two-hour window is in [7], not in this post. |
| 9 | corrected | "No sharp edges" was not a quotation (actual: "avoid any sharp edges"). "Fewer questions" overstated: one question was dropped. Talk authors added. 38% drop-off and 10% week-two engagement confirmed. |
| 10 | confirmed | "five hours" and "warmth and the value" quotes confirmed; "one minute meditation" wording substituted. |
| 11 | confirmed | Ivan Zhao quotes and minimal new-user home screen. |
| 12 | confirmed | Block quotes verbatim. |
| 13 | corrected | Actual wording is "Don't invent terms if possible". Other quotes confirmed. |
| 14 | confirmed | Authors, date (12 Mar 2026), all principles and quotes. |
| 15 | corrected | 3 vs 98 variables and contrast-variable quote confirmed. "Perceptually uniform" was our gloss; replaced with the authors' own description and the full quote. |
| 16 | corrected | "Doesn't give you answers" quote is from [17], not the homepage; homepage quotes (Koji, canvas, gaps, "never just gives you the answer") now attributed precisely. No outcome studies cited (confirmed). |
| 17 | corrected | Quote confirmed. App title corrected to "Brilliant: Learn Math & Coding" (seller Brilliant Worldwide, Inc). |
| 18 | corrected | **"deliberately avoids game-like features" does not appear in the source.** Replaced with the real quotations ("isn't as playful…", "a clear decision from our side", "put away their phone…"). 150 experts and hand-made courses confirmed. |
| 19 | confirmed | Scott Weiss quotes and per-lesson score confirmed. |
| 20 | corrected | g values, CIs and k confirmed (ERIC record). Moderator wording fixed: game fiction and social interaction moderated behavioural outcomes; competition + collaboration "appeared effective". |
| 21 | confirmed | 128 studies; d = −0.40/−0.36/−0.28; positive feedback d = 0.33/0.31. Children-vs-college moderator added. |
| 22 | corrected | 435 studies, d = 0.48, 0.99, 0.46, I² 86.47%, funnel asymmetry confirmed. The d = 0.24 category is "reinforcement or punishment", not "praise, rewards or punishment"; "high-information" includes self-regulation information. D7 caveat added. |
| 23 | confirmed | 225 studies; 0.47 SD; failure 21.8% vs 33.8% (Fig. 1 caption). |
| 24 | confirmed | 105 samples, N = 19,933, r = −.36. Erratum noted. |
| 25 | corrected | Recommendation date, nine new SC, 4.1.1 removal, 2.4.13, 2.5.7, 2.5.8, 3.2.6, 3.3.7, 3.3.8 confirmed. The 2.4.11 examples (sticky headers, cookie bars, chat) are not on this page; re-sourced to [67]. |
| 26 | confirmed | Dated 12 Dec 2024; normative text for 1.4.3, 1.4.10, 1.4.11, 1.4.12, 2.2.1, 2.2.2, 2.4.7, 2.5.8, 3.1.2, 3.3.8, 4.1.3 and the cognitive-function-test definition. |
| 27 | confirmed | No statement that tests are automatically essential; only test example is "granting double time on a test". |
| 28 | corrected | Paste/password-manager guidance, G218, F109, CAPTCHA "not excepted", object-recognition AA exception confirmed. **WebAuthn is listed only as a "potential future technique", not as sufficient**; split-digit fields are shown as a barrier, not a numbered failure. |
| 29 | corrected | The phrase "only by changing the color" is not in the source; replaced with F81 and the verbatim "regardless of the contrast ratio" passage. |
| 30 | confirmed | 44×44 pt default, 28×28 pt minimum, ~12 pt bezel padding, 200% text, time-boxed elements, autoplay, Reduce Motion, colour-alone, contrast table. |
| 31 | confirmed | WCAG 2.0 AA, public and private sectors, entry updated 4 April 2017. No IS 5568 mention (already flagged). |
| 32 | corrected | W3C Group Note, 29 Apr 2021, "not required for conformance", 8 objectives, all pattern names, "minimally necessary steps", "save their work as they go", "easily-recognizable", "Reminders must be set only at the user's request", "3 to 6 functions", persona Yuki and AD(H)D recruitment confirmed. Quote fixed: "five or less main choices on each screen" (not "five or fewer… per screen"); "starts to lose focus after a few minutes". |
| 33 | confirmed | CHI '22, Article 547, doi:10.1145/3491102.3517592; "mitigate" and co-construction findings. |
| 34 | confirmed | arXiv:2609.09443 v1, 8 Sep 2026, authors as cited, N = 16, eye-tracking retrospective think-aloud; quotation verbatim. Preprint status retained. |
| 35 | corrected | CHI '16, doi confirmed, p. 1011 start, N = 221, two-week within-subject, self-report. Sample is undergraduates from a general participant pool, not "adults" broadly. |
| 36 | confirmed | Stothart, Mitchum & Yehnert (2015), JEP:HPP 41(4), 893; 166 college students; SART; errors increased without interaction. Secondary source, as stated. |
| 37 | confirmed | Dated 12 Sep 2025; font quote, 12 pt, 1.5 spacing, 50–75 characters, left-aligned, larger text and tints. |
| 38 | corrected | Bibliographic details confirmed (online 2016, 67(2) 114–127). Participants were elementary-age (12 recruited, 11 completed); OpenDyslexic scored lower. Age-transfer caveat added. |
| 39 | confirmed | `dir="rtl"` on html, no CSS for base direction, lang ≠ direction, `dir="auto"`, bdi, inputs, `dirname`. |
| 40 | confirmed | "tightly wrap every opposite-direction phrase…", runtime `dir="auto"`/bdi, controls only where markup impossible, isolates over embeddings. |
| 41 | confirmed | Logical vs visual order, neutrals take base direction, digits weak LTR, "The bidi algorithm can't figure this out on its own". "Merge" is our paraphrase. |
| 42 | confirmed | Prefer RLI/LRI over RLE/LRE; title element/attribute use. |
| 43 | corrected | "No longer maintained", mirroring lists, "direction of the tape, not the direction of time" confirmed. **"could distort data" is not in this source**; wording replaced. |
| 44 | corrected | Progress/steps mirror, media and time-based progress do not, URLs unaltered, charts "if mirroring could impact data interpretation" confirmed. The source mentions the question-mark *icon* "in Hebrew versus Arabic" without a per-language rule; the "Hebrew question mark uses LTR form" claim was reworded and D30 flagged for user testing. |
| 45 | confirmed | Paragraph alignment by language (3+ lines), list alignment, +2 pt for Arabic/Hebrew next to all-caps Latin, numerals rule, no flipping of checkmarks, logos, photos; back button points right. |
| 46 | confirmed | Flow-relative `start`/`end` mappings for different writing modes. |
| 47 | confirmed | All quotations verbatim. |
| 48 | confirmed | Budiu, 2 Feb 2020; Piepenbrock 2013 (two papers), Dobres 2017, Aleman et al. 2018 (n = 7), Legge et al. 1985; recommendations. Legge/CRT caveat added. |
| 49 | confirmed | Dark grey for shadow visibility; elevation overlays; replaced by tonal surface colour system. |
| 50 | confirmed | Quotations verbatim (one begins "In apps, generally avoid…"). |
| 51 | confirmed | Intent, parallax, colour/opacity exclusions, erratum to not exclude blurring, C39, SCR40, user-preference technique. |
| 52 | confirmed | Baseline widely available since January 2020; `pulse` (scale) replaced by `dissolve` (opacity). |
| 53 | confirmed | Staff report, Sept 2022; four categories; Appendix A items and examples; ROSCA "at least as easy"; "unreasonable delays"; ABCmouse; "sludge" quote; children/older adults/native speakers of other languages (PDF text searched). |
| 54 | confirmed | ~11K sites, ~53K pages, 1,818 instances, 15 types, 7 categories, 183 deceptive sites; PACM HCI 3(CSCW) Art. 81. |
| 55 | confirmed | 14 Apr 2026; rule struck down in 2025 on procedural grounds; FTC "has not yet confirmed" it will revive click-to-cancel. |
| 56 | confirmed | 19 May 2026; Directive (EU) 2023/2673; applies 19 June 2026; label, continuous availability, prominence, "confirm withdrawal", durable-medium receipt. |
| 57 | confirmed | Fitness Check October 2024 (page gives both 3 and 4 Oct); DFA "currently under preparation"; listed problem areas and minors. |
| 58 | corrected | Date and v2.0 final confirmed. Scope is social media platform interfaces; title and §7 wording corrected. |
| 59 | corrected | 14 Jul 2025, voluntary, Art. 28(1). **The streak item refers to "communication streaks"**, not learning streaks; §7, D40 and What-not-to-build #1 now flag the extrapolation. Virtual currency wording aligned with the source. |
| 60 | confirmed | Permission, in-app settings, marketing only with explicit agreement, urgency, Time Sensitive "within an hour", interruption levels. |
| 61 | confirmed | Statutory code of practice, 15 standards. |
| 62 | confirmed | All 15 standards; profiling, geolocation, high-privacy defaults and online tools text. |
| 63 | confirmed | Sticky features, "likely to breach" fairness, pause buttons quote. |
| 64 | confirmed | "much less cumbersome or time consuming"; all five 16–17 recommendations verbatim. |
| 65 | corrected | Quotes confirmed; the list of age-assurance options was incomplete (account-holder confirmation and technical measures added). |
| 66 | confirmed | "likely to be accessed by children under the age of 18"; "non-UK companies who process the personal data of UK children". |
| 67 | confirmed (new) | Added to source the 2.4.11 examples (sticky headers/footers, non-modal dialogs, cookie banner, chat window). |

**Counts:** 67 sources checked (66 original + 1 added); 46 confirmed; 21 corrected; 0 unsupported claims left in place (the one unsupported quotation, from [18], was replaced with verbatim text); 0 dead or blocked. **Decisions whose evidence was weakened:** D7 (d = 0.99 refers to feedback that includes self-regulation information), D40 and What-not-to-build #1 (DSA streak item concerns communication streaks), D30 (question-mark icon row now needs a user check), D19 (WebAuthn is not a listed sufficient technique; conformance rests on the absence of a cognitive test).
