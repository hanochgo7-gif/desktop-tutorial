# MIFTAH creative direction

## The three directions that were tested

All three were built as real HTML prototypes between 21 and 25 Oct 2026 and screenshotted again on 26 Oct 2026, at 1440×900 and 390×844 (`scratchpad/dirs/`).

| | Direction | Built as | Core idea |
|---|---|---|---|
| A | Cinematic project storytelling | Example א (`v1`) | Full-screen real drone video, very large thin type, few words |
| B | International engineering editorial | Example ב (`v2`) and the English investor page ("Partner brief") | A feasibility-file structure: an annotated net-house section drawing, tables, cited evidence, a staged engagement |
| C | Integrated project intelligence | Example ד (`v4`), the 3D WebGL globe and the scroll-driven 3D build simulation | Audience toggle, interactive "farm lab", spatial visualisations |

## Independent reviews

Two reviewers each worked alone from the screenshots and the verified brief. Neither saw the other's scores or ours.

- **Creative director** (scores for brand, distinctiveness, credibility, clarity, narrative, assets, conversion, mobile, a11y/performance, consistency):
  - A: 7, 4, 6, 7, 6, 7, 6, 6, 6, 8
  - B: 8, 8, 9, 8, 9, 6, 8, 6, 8, 9
  - C: 3, 5, 4, 7, 5, 3, 7, 5, 3, 4
- **Business strategist** (credibility, 5-second clarity, narrative, conversion, fit for both audiences):
  - A: 6, 7, 6, 5, 5
  - B: 7, 6, 7, 6, 7
  - B investor page: 8, 9, 9, 8, 5
  - C: 4, 8, 5, 6, 8
  - Globe: 5, 5, 4, 3, 3
  - Build simulation: 3, 4, 4, 2, 3

## Weighted scorecard

| Criterion | Weight | Why this weight | A | B | C |
|---|---|---|---|---|---|
| International credibility | 15% | The site exists to make a foreign buyer trust a company they don't know (q22) | 6 | 8.5 | 4 |
| Fit with the actual brand | 12% | Logo colours, family voice, engineering trade | 7 | 8 | 3 |
| Clarity of value proposition | 12% | The five-second test | 7 | 8.5 | 7.5 |
| Business narrative | 12% | Investors must want the full solution (q22) | 6 | 9 | 5 |
| Conversion potential | 12% | Qualified enquiries only (q21) | 5.5 | 8 | 6.5 |
| Distinctiveness | 10% | Must not read as a template | 4 | 8 | 5 |
| Use of real campaign assets | 10% | Real footage is the strongest proof available | 7 | 6 | 3 |
| Mobile usability | 7% | Fair visitors read on phones | 6 | 6 | 5 |
| Accessibility and performance feasibility | 5% | Legal (IS 5568) and speed | 6 | 8 | 3 |
| Consistency across pages | 5% | About 8 page types, two languages | 8 | 9 | 4 |
| **Weighted total (out of 100)** | | | **61.8** | **79.7** | **47.4** |

Scores are the mean of the two reviewers where both scored a criterion. Where only one did, that reviewer's score is used.

## Decision: B as the backbone, A's footage, C's routing idea

Working name: **"Engineering dossier, shot on site."**

| Kept | From | Why |
|---|---|---|
| Real DJI_0024 drone footage as the opening shot, with a solid scrim and normal-weight type | A | It cannot be faked or bought. It shows a real MIFTAH net house at real scale, with a truck in the frame for reference. |
| A narrative that reads like a feasibility file: problem, scope, how work starts, evidence, track record | B | Both reviewers rated it the strongest commercial argument |
| An annotated cross-section drawing of a net house as the signature | B | It belongs to MIFTAH's trade only. It carries real data (net shade %, galvanized poles, folding nets) and needs no photo or AI image. |
| Two routes on the home page: growers and agri companies (net houses) vs. investors (turnkey farms abroad) | C | The two audiences ask different questions (Q q6, q30) |

| Rejected | Why |
|---|---|
| The 3D globe and the 3D build simulation as site components | Both reviewers: tech-demo genre, heavy (two WebGL scenes), hard to make accessible. The globe's default view hid Mexico and Honduras. They are replaced by a flat SVG map (about 18 KB of path data) and an SVG drawing that builds itself. The 3D pieces remain as separate presentation tools outside the site. |
| AI illustrations and the orbit-dive video | An investor seeing labelled illustrations next to project claims stops trusting the real ones (both reviewers) |
| Yellow accent, stickers, highlighter swipe, rounded-card kit (C) | Consumer-startup tells; yellow is not a brand colour |
| Very thin display type over video (A) | Fails contrast; looks like a template |
| A numbered monospace label above every section (B) | A generic-AI tell. Numbering is used only where the content is a real sequence (the four process steps, the 11 farm stages). |
| Testimonials, client names, "11 stages by our own people" | Not approved, or false (Truth ledger D4, D6) |

## Deliberate visual risk

The home page has no hero stat counter and no card grid. The second thing a visitor sees, after the footage, is a **technical drawing**: a section through a net house, labelled like a shop drawing, which draws itself once as it enters the screen (ground, then poles, cables, net). That is unusual for a sales site. It is justified because the buyer is buying engineering, and the drawing answers "what exactly do you build?" faster than any photo.

## Headline options (judged against the positioning)

| Option | Verdict |
|---|---|
| "Farms, engineered." | Abstract. Strategist: takes a moment to understand. Rejected. |
| "From bare land to first harvest." | Implies turnkey farms are the core, which is not true today (q2). Rejected. |
| "Protected orchards, from drawing to handover." | Good, but "protected" is vague. |
| **"We design, make and build net houses for orchards."** | Says what, how (the three verbs are the real value chain, Q q2) and for whom. Chosen. |
| Hebrew: **"אנחנו מתכננים, מייצרים ומקימים בתי רשת למטעים."** | Same sentence. Chosen. |

Primary CTA (after review cycle 1): **"Discuss your project"** / **"דברו איתנו על הפרויקט"**. The first wording, "Request a project review", was read by the buyer reviewer as an audit or a paid service. The new wording still matches the real sales process (needs mapping on site comes first, OS consult) and avoids "Get a quote", which invites the price-only enquiries the client wants to avoid (q21).
