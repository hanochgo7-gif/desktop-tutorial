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

---

## Stage 5. Site architecture (home, in the order of the buyer's decision)

| # | Section | Purpose and question it answers | Who | Leads to | Action |
|---|---|---|---|---|---|
| 1 | Hero "A roof of net over your crop." The net spreads over the real drone footage. | What is this and is it for me? The product is shown as what it does: covers the crop. | Everyone | Crop selector | Discuss your project; Which net for your crop?; investor link |
| 2 | Which net house for your crop? (tabs: bananas, apples, cherries, kiwi, avocado, other) | Does it fit my crop? The net, protection, structure and season, a matching project, and the minimum size. The drawing changes with the crop. | Growers, agri companies | Proof | "Discuss a project for this crop" pre-fills the form |
| 3 | Net houses on three continents (dark, map) | Can they deliver far away and at scale? 410,000 m² by 2015, Portugal, Belarus, how work abroad is run | Foreign buyers, investors | Process | All projects (globe) |
| 4 | From bare soil to a closed net house (4 real photos; swipeable on phones) | Do they really do the work? | Everyone | Owners | Watch it in 3D |
| 5 | You deal with the owners | Who exactly am I dealing with? Named owners, peace of mind (q25), values (q23), references on request | Everyone | Investors | About |
| 6 | Investing in a farm abroad? (dark) | Is there a full path for an investor? 11 stages, with partners, from 30 ha, the most common mistake (q39) | Investors | Closing | Turnkey farms |
| 7 | Closing "Tell us about your land." | What do I do now? | Everyone | Contact | Discuss, call |

Removed from V2: the numbers row, "Two ways to work with us", the separate boxed drawing (now inside the selector), and the values block (merged into "owners").
Other pages:
- **Net houses:** the crop selector, the "Abroad" band moved up, sheds and service, the parts drawing next to the 3D link, the photo band. The repeated steps are gone.
- **Turnkey:** the filler section is gone; stages and "what stays with you" are larger.
- **Projects:** the globe (scroll-safe), country table, selected projects as cards. The repeated photos are gone.
- **About:** the repeated values are gone.
- **Contact:**
  - A two-step form.
  - The honest "not connected" line comes first.
  - A partner route.
  - ?crop= pre-fill.

## Stage 6. What was built (code)

- `build.py`:
  - `p_index` rewritten.
  - New `crop_selector()`.
  - The section drawing has crop layers (trees, banana plants, kiwi pergola, folding).
  - Drawings get unique IDs per instance.
  - Two-step form markup.
  - Globe embed made scroll-safe, with an anonymised kiwi project.
- `content.py`: `HOME3`, `CROPS`, form step labels and the partner role. Every row is commented with its ledger reference.
- `site.css`:
  - Larger type scale; deep field colour.
  - Hero canopy (a fine net mesh plus a sagging edge cable). It slides in on the compositor and stays static with reduced motion.
  - Typographic crop tabs; crop-specific drawing states.
  - Dark proof section with the map recoloured.
  - Swipeable steps on phones.
  - Investor phases.
  - Net texture on the closing band.
  - Two-step form styles.
  - The pole-and-cable divider, used once.
- `site.js`: crop tabs (ARIA tabs, arrow keys, RTL-aware); form steps (validation per step, Back keeps answers, focus moves to the step heading); ?crop= pre-fill; the scrollable step row gets keyboard focus.

## Stage 3b and 7. What the simulated teams said, and what was done

Team C (six simulated personas) and Team F (brutal critique) reviewed the first V3 build. An acceptance panel then ran tests 1–10 on the live V3. These are simulations, not research or conversion data.

| Finding | Source | Decision |
|---|---|---|
| The globe swallows the mouse wheel | Team F, measured | **Fixed.** Wheel zoom only with Ctrl/Cmd in the embed; vertical swipes scroll the page. |
| "Most investors' costliest mistake" goes beyond the ledger ("most common") | Team F | **Fixed** |
| The biggest number on the site is dated 2015 ("nothing since") | Spanish grower persona | **Fixed.** The headline is now three continents; the figure and its date are in the copy. |
| The pole divider is everywhere and reads as a perforated edge | Team F | **Fixed.** Used once. |
| The 4 steps appear three times | Team F | **Fixed.** Removed from Net houses; Home keeps them, and the 3D page is the deep version. |
| Crop selector duplicated on Home and Net houses | Team F (remove from Home) vs kibbutz persona (the most useful element) | **Kept on both.** Net houses is the page attached to quotes (q22) and must stand alone; Home is where growers start. |
| Space-nebula globe reads as an AI demo | Team F | **Embed:** plain deep green. The full-screen globe keeps the owner-requested look. |
| Repeated photos on Projects and About; values block repeated | Team F | **Fixed.** Removed. |
| Footer title block is decoration | Team F | **Removed** |
| No partner route | Partner persona | **Added:** "A potential partner" in the form, and a partners block on Contact. Capacity figures need the owners. |
| Weak headline contrast on phones; "not connected" notice placement | Phone persona, acceptance panel | **Fixed.** Scrim retuned; the one-line notice comes before the form. |
| Bar'am named before approval | Acceptance panel | **Fixed.** Shown as "Upper Galilee" everywhere, including the globe. |
| Peace of mind (q25) missing | Acceptance panel | **Fixed.** In the owners section. |
| No photos per project, plant or owners; no testimonials, email or inbox; capacity figures; partner name; price signal; post-2015 projects | All panels | **Owners.** Code can't supply these; see `MIFTAH_TRUTH_LEDGER.md` §8. |
| The visual system still carries V2 palette, type and photos | Acceptance panel | **Partly accepted.** Palette and type are brand rules (logo colours; Hebrew/Latin family). The real lever is photography, which is an owner action. |
| 3D page: toy-like for a professional, but the clearest explanation for a non-farmer | Personas 3 and 4 disagree | **Kept.** Shortened to 80 vh steps; the hint disappears once the scene runs; labelled "Illustration". |

## Stage 7. Acceptance tests (run on the live V3 and locally)

| Test | Result |
|---|---|
| 1. Genericness | The industry reads clearly without the logo (footage, "roof of net", crop drawings, m² map). The visual identity is weaker than the content. |
| 2. Five seconds | Passes in EN and HE, desktop and phone: what, value and next step. Investors get a secondary link. |
| 3. Skeptical customer | Missing photos per project, testimonials, plant, portraits, email and a working form (owner items). References on request helps. |
| 4. Partner | Execution capacity and long-term thinking are signalled. A partner route now exists; capacity figures are missing. |
| 5. Mobile | No horizontal scroll at 390 on all 26 page/language checks; phone action bar; crop tabs wrap; map in two panels. The 140-check width suite passes (360–1920 px). |
| 6. Performance and accessibility | Live Lighthouse mobile 99–100 in every category, LCP ≤1.8 s, CLS ≤0.03. axe: 0 violations in 40 runs. One H1 per page. Keyboard: arrow-key tabs, RTL-aware. Reduced motion respected. No JS errors in 44 page loads. Strict CSP. |
| 7. Differentiation | Three strong memorable elements (the net over the footage, the crop selector with changing drawing, the 3D build) plus "you deal with the owners". Not five. |
| 8. Brief fit | All requirement-map rows implemented except those documented as owner gaps. q25 was missing and is now added. |
| 9. Action | Home → Kiwi → CTA → contact?crop=kiwi pre-filled → step 1 → step 2 → honest unconnected result with Call and a copyable summary. Form tests: 23/23. |
| 10. Self-critique | 10 problems found; the code ones are fixed (see the table above). The owner ones remain. |

Other checks: html-validate clean; linkinator 115 links, 0 broken; keyboard suite 16/16; form suite 23/23.

## Stage 8. Score (acceptance panel; V2 partly from screenshots)

| Criterion | V2 | V3 (as tested) | Notes |
|---|---|---|---|
| Uniqueness and differentiation (20) | 7 | 12 | New: the net over the footage, the crop drawing selector, the owners voice. Palette, type and photos carried over. |
| Brief and strategy fit (20) | 13 | 16 | Decision-ordered story, pre-filled form. Minus q25 and Bar'am, both since fixed. |
| Visual and creative quality (20) | 10 | 13 | Bigger type and dark/light rhythm. Dated photos; split layout repeated. |
| UX and hierarchy (15) | 9 | 12 | Crop to a two-step form. The late offline notice has since been moved up. |
| Trust and decision support (10) | 5 | 6 | Limited by owner material |
| Mobile and accessibility (10) | 6 (est.) | 9 | |
| Technical and performance (5) | 3 | 5 | |
| **Total** | **53** | **73** | |

The three code defects the panel found (Bar'am, q25, notice placement) were fixed after scoring; no new score was run. **90 is not claimed.**

The remaining gap is mostly owner material, which code can't supply:
- photos of real projects, the plant and the owners,
- approved client names and quotes,
- an inbox,
- capacity figures,
- post-2015 projects.

Without them, trust (10) and differentiation (20) stay capped. The score is an internal decision aid, not an objective certification.
