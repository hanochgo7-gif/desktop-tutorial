# MIFTAH website V3: redesign working document

27 Oct 2026. Brief: turn a competent but generic site into a digital experience that only MIFTAH could own, without inventing facts.

The source of truth is the client questionnaire, as recorded in `MIFTAH_TRUTH_LEDGER.md`. References like (q23) are questionnaire IDs; (2.2) is a ledger row.

The "teams" below are simulated review roles used as a decision mechanism. They are not real people, not user research and not conversion data. Teams C (personas) and F (brutal critique) were run as an independent reviewer that had not built the site.

---

## Stage 2. Questionnaire analysis (working document)

| # | Topic | What the questionnaire says |
|---|---|---|
| 1 | Identity and vision | A family company that "initiates, designs and executes" agricultural projects (q1). Today the core is net houses: design, manufacture in its own plant, installation, handover (q2, 1.7). The growth line is turnkey farms abroad, with partners (q2, q36). |
| 2 | Site goals, in order | (1) Impress investors and growers enough to contact MIFTAH for the full job "from start to end" (q22). (2) Support quotes: pages that can be attached to a price quote (q22). (3) Filter out projects that are too small and price-only enquiries (q21, q8). (4) Be presentable for a meeting in Oct/Nov and for Fruit Logistica, 3–5 Feb 2027 (q44). |
| 3 | Audiences | **Primary:** private investors, agri companies and entrepreneurs abroad, who reached MIFTAH by referral (q6, q9). Israeli growers and kibbutzim (HE). **Secondary:** partners, and suppliers at the fair. |
| 4 | Needs, fears, objections | Will it protect my crop (hail, sun, wind)? Can a company far away deliver on my land? Who actually does the work? What will it cost and how long will it take? Is my plot big enough? Can I trust them without knowing anyone? Investors' typical mistake: trying to do it themselves to save money (q39). |
| 5 | Core services | Net houses for orchards and bananas (2.1–2.3); loading sheds, windbreaks, trellising (2.4, 2.5); maintenance, dismantling and reuse (2.6); single stages (2.7). Turnkey farms abroad: 11 stages, with 2 excluded (q3). |
| 6 | Real differentiation | Own plant: poles, nets, cables and fittings made and checked before they ship (1.7). One company from needs mapping to maintenance (2.8). Proven abroad: 410,000 m² in five countries by 2015, plus Portugal and Belarus (3.2, 3.3). Local crews trained and managed on site (3.2). A family company whose clients stay for years: "a word is a word" (q23). |
| 7 | Brand feel | Entrepreneurial, family, personal (q34). Plain and warm, no superlatives. Slogan: "Where agriculture feels at home" (1.13). |
| 8 | Main action | Start a conversation about a project ("Discuss your project"), or phone the office. Phone works best today (q31). |
| 9 | Proof available | Real drone footage (DJI_0024); four 2015 process photos plus two site photos, all galvanized steel; itemised areas abroad; named owners and roles; five selected projects by crop and region (q14, pending approval); references available on request (q15). |
| 10 | Gaps and assumptions | No enquiry inbox (O1). No approved quotes or client names (O3, O4). No per-project photos (O2). No photos of the plant or the owners. Avocado net type not stated, so it is not stated on the site. 2015 figures are dated as such. |

### Requirement → site map

| Requirement (source) | Where it lives in V3 |
|---|---|
| Say what MIFTAH does in seconds (q1, q2) | Home hero: H1 plus one sentence. The net visibly spreads over the real drone footage. |
| Net houses lead, turnkey second (q2) | Hero wording; crop selector before the investor route; nav order |
| Turnkey only "with partners", no invented track record (q36, D4) | Turnkey teaser and page wording kept |
| Impress investors and serve as a quote attachment (q22) | Crop selector with specs per crop; proof section; the 3D page; printable profile |
| Filter small and price-only enquiries (q21, q8) | Minimum sizes in the crop selector, FAQ and form; form step 1 asks about the project first |
| Values in the client's own words (q23) | "Who you deal with" section |
| Peace of mind (q25) | Hero lead and closing |
| Phone first (q31) | Phone button in the header (mobile), phone action bar, closing section |
| EN + HE (q12, q33) | Every page in both languages, RTL tuned |
| Fair, Feb 2027 (q44) | Closing section and contact form |
| No stock, galvanized only, AI labelled (CL) | Kept. The 3D page and globe carry "Illustration / הדמיה". |

---

## Stage 3. Diagnosis of the V2 site

Severity 1–10. The type column separates the kind of fix each problem needs: D = design, S = strategy, C = content, T = technical, O = needs the owners.

| # | Problem | Type | Severity | UX | Trust | Business | Effort | Fix |
|---|---|---|---|---|---|---|---|---|
| 1 | Home follows the stock B2B sequence: video hero, a row of 4 big numbers, two text columns, a boxed drawing, 4 small photos, a map, a dark CTA band | D | 8 | med | med | high | M | New structure built around the decision; remove the numbers row |
| 2 | No single ownable visual idea carried through the site; the drawing, 3D and globe live in silos | D/S | 8 | med | med | high | M | "Under the net" concept: the net and pole line as the visual system |
| 3 | The story follows MIFTAH's org chart, not the buyer's decision (crop → protection → structure → proof → process → people → contact) | S | 7 | high | med | high | M | Reorder; add the crop selector |
| 4 | Visual rhythm is flat: same width, same left alignment, small type at desktop, pale palette, nothing commands attention | D | 7 | med | low | med | M | New type scale, dark and light alternation, full-bleed moments |
| 5 | The hero is the familiar "video + heading + two buttons" | D | 7 | low | low | med | S | Net spreads over the footage; a specific claim; a reason to scroll |
| 6 | Proof is thin and the numbers are undated or buried | C/O | 7 | – | high | high | S (code) / owners | Proof section with dated figures; "references on request" made prominent; the rest needs O2–O4 |
| 7 | The form has no inbox | O/T | 9 | high | high | high | owners | Honest notice, phone first. Needs O1. |
| 8 | Form: 13 fields on one long page, contact details before the project | UX | 6 | high | – | med | M | Two steps: project first, then contact. Prefill from the crop selector. |
| 9 | Mobile is a stacked desktop: long text runs, small photos, process as 4 tall blocks | UX/D | 6 | high | – | med | M | Swipeable process, crop chips, shorter mobile copy, action bar |
| 10 | The same dark CTA band ends every page | D | 5 | low | – | low | S | Redesigned closing section, varied per page |
| 11 | Mono uppercase labels and middle-dot strings read as template chrome | D | 4 | – | – | – | S | Sentence case; mono only for real data |
| 12 | The 3D page is long (10 full screens) | UX | 5 | med | – | low | S | Shorter steps (75 vh), progress, step-jump rail |

**The five that matter most:**
1. The template structure (#1, D).
2. No ownable visual idea (#2, D/S).
3. The story doesn't follow the buyer's decision (#3, S).
4. Thin, undated proof (#6, C/O).
5. A dead enquiry path plus a long form (#7, #8, O/UX).

The independent review in stage 3b adds its own findings.

---

## Stage 4. Three creative directions

| | A. Under the net | B. Crop first | C. The site is the build |
|---|---|---|---|
| Idea | The white net is MIFTAH's material. The site is seen from under it. The net spreads over the real drone footage; a pole-and-cable line is the section divider; specs read like a drawing. | The visitor's crop is the entry point. "What do you grow?" reconfigures the page: net, structure, protection, a matching project, minimum size, a pre-filled enquiry. | The scroll-driven 3D build is the home page. The visitor builds a net house from bare soil to a protected orchard, and the story is told in steps. |
| Feeling | Protected, calm, engineered, specific | Personal, practical, fast | Spectacle, capability |
| Visual principle | Net texture over deep green and real photography; silver pole lines; big confident type | Big type, choices, answers in numbers | Full-screen 3D, cards over the scene |
| Home structure | Hero under the net → crop selector → proof abroad → how it's built → who you deal with → investors → contact | Crop chooser hero → answer panel → proof → process → contact | 3D hero (10 steps) → services → proof → contact |
| Type and colour | Plex Sans heavy and large; Plex Mono for specs; forest, net white, galvanized silver, mint | Plex; paper and forest | Plex; sky and soil from the 3D scene |
| Media and motion | Real drone video; the net draws once on load; the drawing reacts to the crop | Drawings per crop | three.js on the main page |
| Business upside | Shows the product's purpose (protection) instantly; ownable; carries through every page | Best self-qualification and lead quality | Memorable; shows the process |
| Risk | Texture overuse; must stay subtle | Lacks per-crop photos; the hero looks like a SaaS chooser | Heavy on phones; delays key information; reads as an AI demo; misleading if mistaken for a real project |

Prototypes: A and B heroes were built (`public/_proto/a.html`, `b.html`) and screenshotted at 1440 and 390. C exists as `how-we-build.html`.

**Decision:**
- **A is the concept.** Its hero is ownable and explains the product.
- **B's crop selector becomes the second section.** It is the strongest decision tool, but as a hero it looked like a SaaS form.
- **C stays a dedicated page,** linked from the process section, not the home hero. Team F: "the 3D as a hero is a capability demo"; Team E: on phones it would cost 600 KB before any message.
