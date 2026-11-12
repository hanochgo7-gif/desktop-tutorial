# MIFTAH truth ledger

Every fact the website is allowed to state, where it comes from, and what it means for the site.
Updated 26 Oct 2026 (review cycle 2).

## Sources

| Code | Source | How it was read |
|---|---|---|
| **Q** | Client questionnaire, `hgpro.io/q/miftah/?k=…` (form `miftah-2026`), answered by Merav and Yiftach together ("שנינו יחד"), submitted 21 Oct 2026 10:53 UTC | Re-fetched on 26 Oct 2026 through the form's own `get_response` call. The answers are identical to the copies saved on 21 and 22 Oct. Question numbers below (q1…q49, m2) are the form's own IDs. |
| **OS** | Old website miftah.co.il (WordPress, uploads from 2015–2016) | Pages saved on 21 Oct 2026: home, about, agri, civil, consult, mgmt, contact, projects 1–6, recommendations |
| **CL** | Client feedback relayed by Hanoch, recorded in `greenhouse-brand/CLAUDE.md` | Working notes |
| **DR** | Google Drive folder from the client (two drone videos) | DJI_0001 and DJI_0024, downloaded 21 Oct 2026 |

Confidence: **High** means the client stated it, or it is published on their own site and not contradicted. **Medium** means it is published on the 2015 site and may be out of date. **Needs confirmation** means it must not go live without approval.

## 1. Company

| # | Fact | Source | Interpretation | Website implication | Confidence |
|---|---|---|---|---|---|
| 1.1 | "חברה שיוזמת, מתכננת ומבצעת פרויקטים בחקלאות החל בתשתיות של הפרויקט וכן בכל תחום המבנים החקלאיים" | Q q1 | They initiate, design and execute agricultural projects, from infrastructure through all agricultural structures | Base of the one-sentence positioning | High |
| 1.2 | Today the work is mostly net-house projects: design, manufacture and sale, installation on site, handover | Q q2 | Net houses are the proven, current core business | Net houses lead the site. This is the main service page. | High |
| 1.3 | Future aim: locating, building and managing farms as turnkey (TPK) projects | Q q2 | A growth line that is not yet the core | Present it as a line of work, without a track record they don't have | High |
| 1.4 | Farm projects abroad are new projects, done in cooperation with Barak of Green Arava; suggestion to link to his site | Q q36 | Turnkey farms abroad are delivered with a partner | Turnkey page says "with partners". The partner is not named until approved (Open question O5). | High (fact) / **Needs confirmation** (naming) |
| 1.5 | "Don't put on the site things we don't do or haven't done" | Q q36, q3 r2 note | A hard content rule | Every service and claim on the site is traced to this ledger | High |
| 1.6 | Specialised for two decades in engineering design, manufacture and management of covering projects, in Israel and abroad | OS about/home (written ~2015) | 20+ years of activity | "20+ years" may be stated. "Leading company in Israel" is not stated: it is a self-claim with no evidence. | Medium |
| 1.7 | Own manufacturing plant: poles, nets, cables and fittings are made, packed and checked before going to site | OS consult | Vertical integration: they make what they build | A real differentiator, stated on the Net houses and How we work pages | High (also confirmed in the 2026 print pack review) |
| 1.8 | Projects totalling "millions of square metres" of agricultural structures | OS about/agri | Scale claim from 2015 | Do not use. There is no current figure to back it. The verified figure abroad is 410,000 m² (§3). | Medium, not used |
| 1.9 | Crews trained for work at height (Ministry of Labour training), insured; several projects run in parallel | OS about/consult | Safety and capacity | Allowed: "crews certified for work at height". Not allowed: insurance amounts. | Medium |
| 1.10 | Office: Kfar Masaryk; phone 04-9854404. The old number 04-9856969 and the old Yehiam address are no longer used. | CL | The OS contact page is out of date | Use only the Kfar Masaryk office and 04-9854404 (+972 4 985 4404) | High |
| 1.11 | Merav's mobile and WhatsApp are not shown on the site | CL | Privacy decision | No personal numbers. The office phone is the only number. | High |
| 1.12 | There is no separate business email for foreign clients | Q q16 | No email address can be published | **Blocker:** the contact form has no confirmed destination (Open question O1) | High |
| 1.13 | Slogan: "מיפתח פרויקטים - חקלאות שיש לה בית" / "Where agriculture feels at home" | CL | Official slogan | Footer, closing band, meta description | High |
| 1.14 | Voice: entrepreneurial; family and personal | Q q34 | Tone of voice | Plain, warm, direct. No corporate superlatives. | High |
| 1.15 | Terminology must be used the same way everywhere | Q q35 | Consistency rule | Glossary in MIFTAH_CONTENT_MASTER.md | High |

## 2. Services and scope (Q q3: who does each stage of a turnkey farm)

| Stage | Q answer | Site |
|---|---|---|
| Soil testing and crop fit | Us | Listed |
| Business plan and budget for the investor | Us | Listed |
| Local licensing and permits | **Not us** ("don't put on the site things we don't do") | Stated as excluded, so expectations are set |
| Farm design (structures, irrigation, roads) | Us | Listed |
| Building structures and net houses | Us | Listed |
| Irrigation systems | Us | Listed |
| Procurement and logistics | Us | Listed |
| Planting and orchard establishment | Us | Listed |
| Hiring and managing local workers | Us | Listed |
| Day-to-day growing and agronomy | Us | Listed |
| Maintenance of structures and systems | Us | Listed |
| Harvest and marketing | Us | Listed |
| Ongoing reporting to owners (budget, progress) | **Not us** | Not promised anywhere |

That gives **11 stages** delivered, with 2 excluded. The site says "11 stages", never 13.

Other services:

| # | Service | Source | Confidence |
|---|---|---|---|
| 2.1 | Net houses for orchards and plantations: banana, apple, persimmon, kiwi, avocado, tobacco "and more". Design, production, installation. | OS agri | High (current: Q q2) |
| 2.2 | Banana net houses: 11% shade net, light and airy. Protects from wind and hail in winter, saves water in summer by reducing evaporation. Large spans; single structures up to 100 dunam (10 ha); includes trellising and support. Original wording: "בתי רשת לבננות מספקים תנאי גידול טובים יותר לבננות. בתי רשת לבננות חסכוניים יותר בהשוואה לבתי רשת אחרים, בעקבות סוג הרשת הקלה והיכולת ליצור מפתחים גדולים בין העמודים." The site uses "better growing conditions" and "light and airy"; it does not repeat the cost comparison, which has no figure behind it. | OS proj1 | High |
| 2.3 | Orchard net houses: 10%–30% nets, mainly against hail and sunburn during flowering and fruit set. A structure that lets nets be folded in winter and spread in summer; automatic systems possible. | OS proj4 | High |
| 2.4 | Loading/shade sheds: wide spans for trucks and carts; net shade % and colour to order; optional open/close system | OS proj2 | High |
| 2.5 | Windbreaks, trellising and support systems | OS about | High |
| 2.6 | Maintenance of structures; dismantling, processing and preparing material for a new structure | OS agri | Medium |
| 2.7 | ~~Services sold separately: needs mapping, design, manufacture, supervision, training, maintenance, execution~~ **Withdrawn 28 Oct 2026 (CL, Hanoch): MIFTAH does full projects only; no consulting, design or supervision-only offer on the site.** | OS consult, CL | Not used |
| 2.8 | Process: needs mapping on site (crop, soil, location, drainage, access, wind regime); design by construction engineers (practical engineers), with load calculation and bill of quantities, fully computerised; manufacture in own plant after quote approval, with QC before shipping; installation (team briefing, logistics, safety), trellising; maintenance as materials weather | OS consult | High |
| 2.9 | Civil shading (pools, sports, playgrounds, schools) is **no longer offered** | Q q4, CL | High. Excluded from the site, including its images. |
| 2.10 | Vegetable net houses, greenhouses for industry | OS home | Low. Not in the current answers, so not promoted. |

## 3. Projects and proof

| # | Fact | Source | Implication | Confidence |
|---|---|---|---|---|
| 3.1 | Five projects to show: kiwi net house at Bar'am with a pergola ("סוכה") trellis; banana net house in the Western Galilee; apple net house in the Golan Heights; cherry net house; avocado net house in Portugal | Q q14 | The Projects page is built around these five | High. **Needs approval** (q13: Yiftach and the client must approve before publishing; probably only photos). |
| 3.2 | Abroad: Mexico 150,000 m², India 80,000 m², Honduras 70,000 m², Spain 60,000 m², Georgia 50,000 m² (total 410,000 m²). Local team management, design and execution. | OS proj5 | Area shown per country; the globe beam heights follow these numbers | Medium (2015 figures; still on the live site) |
| 3.3 | Belarus: a very complex project. Schedule kept, local manufacture, shipping, local crews. Merav suggests keeping it. | OS mgmt, Q q28 | Shown as a project without an area figure | High |
| 3.4 | Tzadik Bino tenders | OS mgmt | Merav doubts it is relevant (q28), so not shown | Excluded |
| 3.5 | Clients willing to recommend: Bar'am, Elrom, Yehiam, Metzuba, Hanita "and more", and the client in Portugal | Q q15 | Names may appear only as clients willing to give references, once approved | **Needs confirmation** (O3) |
| 3.6 | Clients in Portugal came by referral; payers/deciders were a private investor, an agri company and an entrepreneur | Q q9, q6 | Referral-driven trust; audience = these three | High |
| 3.7 | Old recommendation letters exist (Hanita, Yehiam, Sa'ar, Ma'ayanot; a client wrote about a decade of joint work) | OS recs; Q q23 prompt | Quotes need approval (m2: "new recommendations or approval to publish the old ones") | **Needs confirmation** (O4). Not quoted until approved. |
| 3.8 | No certifications or memberships were stated (q27 was marked "to discuss") | Q q27 | No certification logos or claims | High (absence) |

## 4. Clients, markets and conversion

| # | Fact | Source | Implication | Confidence |
|---|---|---|---|---|
| 4.1 | Target markets for the next two years: Portugal, other European countries, Israel, other markets, and Africa | Q q7 | Market section; form country field | High |
| 4.2 | Minimum project size: 50 dunam (5 ha) in Israel, 30 ha abroad | Q q8 | Stated near the form and in the FAQ, so small projects self-filter (q21) | High |
| 4.3 | Time-wasters: projects too small; price-only enquiries | Q q21 | The form asks for area and stage; copy explains that pricing follows a site assessment | High |
| 4.4 | The site must also support price quotes (be attached to a quote) and impress investors into contacting MIFTAH for the full solution "from the start to the end" | Q q22 | Pages must be linkable from a quote (Net houses, Projects, About). The investor path leads to Turnkey farms. | High |
| 4.5 | Why clients stay: "like family"; someone to rely on; "a word is a word"; integrity, reliability, seriousness, quality, professionalism; a tailored solution for each client | Q q23 | About page values. Wording is the client's own. | High |
| 4.6 | What the client gains: peace of mind and time to focus on growing and developing the business | Q q25 | Core benefit line | High |
| 4.7 | Most common investor mistake: trying to do it themselves to save money | Q q39 | Turnkey page "common mistake" content | High |
| 4.8 | Contact today: phone and WhatsApp | Q q31 | Phone is the primary route. There is no company WhatsApp number to show (1.11). | High |
| 4.9 | Languages: English and Hebrew | Q q12, q33 (no further language within a year) | Bilingual site, English first (international) | High |
| 4.10 | Deadlines: an important meeting end of October or mid-November; a large fair in Germany early February (Fruit Logistica, Berlin, 3–5 Feb 2027) | Q q44; fair dates verified 23 Oct 2026 | The site must be presentable by then. A fair note goes on the Contact page. | High |
| 4.11 | Site updates: a combination (sometimes themselves, sometimes through the agency) | Q q43 | A simple content source (one Python content file) plus a README | High |
| 4.12 | Social: Merav and Yiftach have personal pages; no Google Business Profile | Q q45, q46 | No social links in the footer until company pages exist | High |
| 4.13 | Domain miftah.co.il registered with Interspace; hosting at Nethost (Oved) | Q q18 | Deploy target is Nethost or a static host. Canonical `https://www.miftah.co.il`. | High |
| 4.14 | Final content approval: both Merav and Yiftach | Q q19 | Release checklist requires both | High |
| 4.15 | Assets available: logo file, project photos, drone footage and video, recommendations (or approval of old ones) | Q m2 | So far only the drone folder (DR) has arrived. There is no vector logo, so a measured SVG reconstruction is used. | High |

## 5. People

| # | Fact | Source | Implication | Confidence |
|---|---|---|---|---|
| 5.1 | Yiftach Hasfel: co-CEO and owner; practical engineer in construction (Technion); needs mapping, engineering design, development, QC, production supervision, execution. Led the Belarus project. | OS mgmt, CL | Named on the About page | High |
| 5.2 | Merav Eyal Hasfel: co-CEO and owner; BA in business administration; runs the company, finance, marketing and sales | OS mgmt, CL | Named on the About page. The Bino line is dropped (3.4). | High |
| 5.3 | Other 2015 staff (Mor Dadush, Ruti Raviv, Asi Vaknin, Ofer Goldberg) | OS mgmt | Q q29 says "need to ask the employees", so not shown | Excluded |
| 5.4 | Team includes Israelis and agronomy students from developing countries who come to study in Israel | OS mgmt | Mentioned without numbers | Medium |

## 6. Visual and brand rules (CL)

- Only galvanized (silver) steel may appear. Real photos with black, rusty or dark poles are removed, not retouched.
- The logo is used only in `#0E4239`, `#1B6E62` and `#7FC49B`. On dark backgrounds it sits on a white plate.
- AI images are labelled "Illustration" / "הדמיה" and never presented as projects.
- No photos with children, no civil shading, no stock images.
- Of the drone footage, only DJI_0024 is used. DJI_0001 shows dark poles.
- The same drone net-house shot is not repeated.
- The location of the DJI_0024 net house is **not confirmed**, so it is captioned without a place name.

## 6b. External sources (facts about the market, not about MIFTAH)

| # | Fact | Source | Used on the site | Confidence |
|---|---|---|---|---|
| E1 | The Investment Administration's development plan lists net houses for apples, lychee, figs and kiwi among supported items, and net houses for bananas "by key"; for bananas, "grants for irrigation and fertigation and for trellising are approved only if the planting is under an existing or new net house". Support for net houses per the recognized-cost table applies to specific procedures (new farmers, water agreements), so the site says "in certain tracks and on certain conditions" and sends readers to the current procedure. | Ministry of Agriculture, development plan 2023, https://www.gov.il/BlobFolder/reports/developmentplan2023/ar/development_2023.pdf (downloaded and read 29 Oct 2026) | Grant questions on Net houses, Banana and Orchard pages, always with "check the current procedure" | High for 2023; may change yearly |
| E2 | Companies Registrar: "מיפתח הספל פרוייקטים בע״מ", company no. 514770015, incorporated 3 June 2012 (Yehiam, c/o Yiftach Hasfel) | Israeli Companies Registrar, looked up 29 Oct 2026 (audit Team A) | Not used. See D10. | High (registry) |

## 7. Contradictions and decision log

| # | Conflict | Decision | Why |
|---|---|---|---|
| D1 | OS address is Kibbutz Yehiam with 04-9856969; CL says Kfar Masaryk with 04-9854404 | Kfar Masaryk and 04-9854404 | Newer, explicit client instruction |
| D2 | OS lists civil shading as a service; Q q4 says no longer offered | Excluded everywhere | Newer and explicit |
| D3 | OS says "millions of m²"; the only itemised figure is 410,000 m² abroad | Use 410,000 m² abroad only | Specific and verifiable beats vague |
| D4 | Turnkey farms are described as the future direction (q2) and as new partner projects (q36), while the 2026 examples spoke of "11 stages by our own people" | Turnkey page: "delivered with agricultural partners". Never "all by our own people". | q36 forbids claiming what they haven't done alone |
| D5 | Investor page used "five-step partnership path" (not from the client) | The site uses the OS process (needs mapping → design → manufacture → installation and maintenance) for net houses, and the 11 stages from q3 for farms. The 5-step path is dropped until approved (O6). | Prefer the client's own process |
| D6 | Testimonials existed on the OS, but the client asked for approval or new ones (m2, q15) | No quotes. The site offers "References from clients in Israel and Portugal on request". | References exist (q15). Wording is not approved. |
| D7 | "Leading company in Israel" (OS) | Not used | No evidence |
| D8 | Brand name spelling: "מיפתח פרויקטים" (CL) vs "מיפתח פרוייקטים" (OS) | "מיפתח פרויקטים" in Hebrew; "MIFTAH Projects" in English | CL is current. The legal English name is O7. |
| D10 | Start year: the 2015 site says "two decades" (about 1995); the Registrar shows the current company incorporated in 2012 (E2); an agency brief (29 Oct 2026) says "since 2003", with no source | Keep "20+ years" (1.6) and never print a founding year until the owners confirm. Ask whether the experience predates the 2012 company (O11). | Avoids a claim that due diligence could contradict |
| D11 | The same brief describes "management and operation of agricultural properties" for owners abroad, including property in Israel | Not stated anywhere. Farm operation exists only as turnkey stages 8–11 abroad, with partners (§2). Ask the owners (O12). | No source; "don't put on the site things we don't do" (1.5) |
| D9 | The design choice (4 examples) is pending with Merav; this brief asks for a full build now | Build on a scored direction (see MIFTAH_CREATIVE_DIRECTION.md). Tokens are kept swappable, and the four examples stay untouched. | The user explicitly requested the full build on 26 Oct 2026 |

## 7b. Owner text review, Merav Eyal Hasfel (co-CEO), 5 Nov 2026

Source: Merav's review from the text-review page (`/text-review/`), sent to Hanoch on 5 Nov 2026 13:17 (120 of 573 texts reviewed; partial). Her wording is the client's own and now outranks earlier site copy on these points. English was written to match and still needs the native-speaker review (Q q37).

| ID | Fact or decision (Merav) | Replaces | Where |
|---|---|---|---|
| M1 | Planning and building agricultural projects **since 2003** | D10 / O11 (start year unsourced) for this line; the "20+" figure stays consistent with it | Home key facts |
| M2 | **Millions of m²** of agricultural projects and shade solutions worldwide | D3 (410,000 m² abroad only) on the home key facts; other pages still show the 2015 figures until she reviews them | Home key facts |
| M3 | Countries worked in: Portugal, Spain, Mexico, India, Honduras, Georgia, Belarus **and Africa**; show "countries in the world", not the number 7 | 3.1-3.3 list of seven | Home key facts |
| M4 | The Belarus project was **intensive fish farming**: managing the whole project, on schedule, local manufacturing, shipping and installation on site | 3.3 wording | Projects table |
| M5 | Offer described as **agricultural projects**, "one address" from design to construction; **maintenance is removed** from the offer list (ticker) and from the build illustration's last chapter | 2.8 "installation and maintenance" in those places | Home, how-we-build |
| M6 | "Loading sheds" become **shade solutions for work areas** | 2.4 wording | Home, Net houses |
| M7 | Build steps: marking out the site, digging the anchors, **concrete for the poles**, laying cables and raising poles, lifting and sewing the net | How-we-build lead | How-we-build |
| M8 | Hail **falls between the nets through special hail-release fittings**; the net sheds the hail | ch08 wording (2.3) | How-we-build |
| M9 | The net can fold in winter and spread in summer **or the other way round**, as the crop needs; the season chip of that chapter is **autumn** | ch09 wording | How-we-build |
| M10 | Turnkey partners named as **business partners** in the "ways to work with us" block | "agricultural partners" there | Home |
| M11 | The contact page no longer asks callers to ask for Merav by name | contact lead | Contact |

Aligned across the site on 6 Nov 2026 (Hanoch: "align all existing information with the answers"), Hebrew and English:
- M2/M3: projects page description and the "do you work abroad?" answer list the countries in her order with Africa and "millions of m²"; "7 countries" became "countries around the world" (header facts, globe text). The projects table keeps its 2015 figures and label (held, below).
- M1: "more than 20 years" became "since 2003" (about page, its description, turnkey page).
- M4: Belarus is the intensive fish-farming project everywhere (home list, about page, FAQ, globe marker).
- M5: maintenance removed as an offer: process step 4 is "installation and handover", the Net houses steps end at handover, the service block is "dismantling and reuse", the "already have net houses?" answer and the crop selector's service row no longer offer maintenance. Kept: farm upkeep as a stage of a turnkey farm abroad (stage 10 of 11), which is farm operation with partners, not structure maintenance; to confirm with Merav.
- M6: "loading sheds" became "shade solutions for work areas" in every list, title, FAQ, form hint and the structured data.
- M11: the contact aside no longer asks for Merav by name.
- "Farm structures" became "agricultural projects" in general descriptions; pages about a specific crop keep "orchards and bananas".

Held back, waiting for a decision (not applied):
- **Projects table date** (her #350): she changed "figures as of 2015" to 2026, and noted the figures must be updated and Portugal added. The label stays "2015" until the new figures arrive, so the table stays true.
- **Contact form "who are you" cards** (her #406-#413): she replaced the role cards with questions (which settlement, which crop, area, net type, when, interest in farms abroad, invest or grow). These need a form redesign, not a text swap.
- **Minimum project sizes** (her note on #435, "don't state how many dunam we do"): the 50 / 300 dunam minimums appear on several pages and in the form logic; removing them everywhere needs her confirmation.

## 7c. Build illustration rules, Hanoch, 7-8 Nov 2026

- Based on 7 real reference photos Hanoch sent. Poles are ROUND, hot-dip galvanized, each standing on a square precast concrete block (as in reference photo r4).
- Anyone working at height wears a full-body harness with a lanyard clipped to an anchor (the lift basket's anchor point, or a cable on the grid), per the Israeli Work at Height Regulations 2007. Yellow articulated boom lift. White anti-hail net in strips joined with clips.
- New chapter "Hail release" (פורק ברד): hail rolls down the net into the valley between two strips and drops to the ground between the tree rows. **The wording still needs Yiftach's engineering sign-off.**
- Hanoch said he would send a separate photo of the concrete blocks; if it differs from r4, the illustration is updated to match.

## 7d. Merav's project photos, 9 Nov 2026

- Merav sent 19 photos from MIFTAH projects on WhatsApp (Hanoch forwarded two screen recordings). They are on the projects page, in three groups: net houses, installation in the field, shading for work areas.
- At her request: the poles in the old photos are shown as galvanized steel ("these are old photos, from when black material was used"); one net colour on the aerial photo of the green work-area shade; the current logo on the workers' shirts (it replaced the old logo on the shirt in the hat photo). Workers at height are shown with a harness (Hanoch's rule of 8 Nov). The edits were made with an image model and checked one by one.
- This replaces, for these photos, the earlier rule that photos with black steel are removed rather than retouched: the owner asked for the retouch.
- Captions describe only what is visible; no places or crops were named that the photos do not show. The photos were taken from the screen recordings (1194 px wide, or 863 px from the chat, upscaled); the originals would be sharper.

## 7e. Merav's site-editor review, 10 Nov 2026 (`docs/reviews/merav-2026-11-10.txt`)
- Applied as written (Hebrew), with English translations: 34 text edits, among them the rename "חוות מפתח בחו״ל" → "חוות חקלאיות עד מפתח" (menu, page title, cards; the English menu keeps "Turnkey farms" for width), the crop rows, the FAQ answers and the process texts. #217: "פתרונן" corrected to "פתרון". #87 (a season text on a row that moved) was applied to the apple "Season" row.
- Areas: "לבטל את כמויות הדונמים לכולם". Removed the per-project areas from the home list, the map, the projects table and the globe (beam heights equal, no m² total), and "השטחים נכונים ל-2015" (#137). Still on the site, waiting for a decision: the minimums (50 dunam in Israel, 300 abroad) and the structure size (up to 100 dunam in one banana structure).
- Form: labels and hints from #405–#448; an optional role field; country = every country (ISO 3166, CLDR names, Israel, Portugal and Spain first); area and planting date are free text; "new project / existing orchard".
- Photos: the anemone image in the "other crops" tab replaced with our aerial photo (g-air-rows); the cherry illustration redone so the net runs along the rows.
- Needs a decision: #207 says the net house "raises the quality and quantity of the crop" (a yield claim, her wording); her note on #137 asks to show every Israeli site (kibbutzim and villages) on the globe, which needs the list from the owners.

## 7f. Merav's full backup, 11 Nov 2026 (`docs/reviews/merav-2026-11-11-backup.txt`)
- About 70 of the edits marked "sent" in it had never reached us (the editor had marked them sent when the mail window opened). All were applied as written, with English, apart from: spelling kept in full Hebrew spelling (ייצור, הכול, הפנייה, אפיון), the Hebrew gershayim kept (מ״ר, יו״ר), and "לשטח" kept where a site-wide replace for "תכנון השטח" had turned it into "השטח" (#48, #320, #325, #353, #381). Each is answered in the editor.
- #297, #299, #300 (the hail and autumn chapters of the simulation) were not text changes: the picture changed to the next chapter while the previous card was still read. The timing was fixed (the picture follows the card nearest the middle of the screen; 0 mismatches on desktop, laptop and phone).
- Roles: Merav "מנכ״לית", Yiftach "בעלים ויו״ר". Office: קיבוץ כפר מסריק. Slogan in Hebrew without the dash.
- Removed: every project size and minimum (FAQ, contact block, crop tabs, turnkey pages, chips), the Fruit Logistica plans (not final), the cherry tab (cherries are under "מטעים"), the "maintenance" stage. Added: the stage "איתור" first, the step "אישור ויציאה לדרך" before manufacture. Windbreaks moved to their own section on the net-houses page.
- Images: the AI banana tab picture replaced with Merav's aerial photo (g-air-wide); simulation chapters redrawn: harness on the worker at height (ch. 4), the net spread in strips along the rows (ch. 5), long roof strips instead of squares (ch. 8), the net rolled on its cables for winter (ch. 10).
- Waiting for a decision: #94 ("הדליה" → "רשת"?), #101 ("איפה" → "רשת"?), #304 (a visible "AI illustration" sentence, against Hanoch's 7 Nov rule). Waiting for material: factory photos, the 3 role holders, Israeli sites and client approvals, the country in Africa, a music track, a photo for p-site.

## 7g. A new editing round, 12 Nov 2026
- Hanoch asked to reset Merav's editing link to the site as it is, with 0 changes waiting. The editor (and /text-review/) starts a new round (`ROUND` in `src/tools/text_review.py`): on her next visit everything she had in her browser moves to `rounds` in the same storage (kept, and listed in the full backup file), the list and the counter start at 0, no answers or "changed since" marks from earlier rounds are shown, and the welcome screen opens again. Earlier rounds stay in `docs/reviews/` and in 7e and 7f.

## 7h. Full pass over Merav's requests, 12 Nov 2026
Hanoch asked to go over every change Merav asked for, one by one. Source: her full backup of 11 Nov (103 wording fixes, 4 removals, 52 notes, 9 notes on photos and page parts); no newer email from her. Every item was checked against the built pages (script: new wording live / old wording gone / removal done), then the notes by hand.
- Dunam figures: her note "לבטל את כמויות הדונמים לכולם" now covers the banana "up to 100 dunam per structure" lines too. Removed from the banana page (description, lead, spec row), the crop selector, the net-houses table and the FAQ; the FAQ "How large can one banana net house be?" is gone. Only the form's free-text size field keeps its hint ("בדונם או בהקטר"), as she asked (#433).
- "מפני רוח וברד" -> "מפני רוח, ברד ופגעי מזג האויר" everywhere it was left (banana page lead and the net-houses table).
- Photos: the anemones photo she asked to replace (f-flowers) is now the real still miftah-196 (apple orchard in bloom under the net); the site-visit photo (p-site) is now miftah-283 (open farmland before a net house, Hermon behind), as she asked for "שטח חקלאי פתוח לפני הקמת בית רשת". Both from the Drive folder "סטילס מצלמה"; old masters kept in media-src/old/.
- Build illustration (#282-#284, #301): the series made from the real stills on 12 Nov had profile poles driven into the ground. Redone to her notes: every pole round, on a square concrete footing (empty footings with the rebar pin in the poles chapter); the worker in the lift wears a harness clipped to the cable (cables and net chapters); in autumn each strip is rolled on its ridge cable like a sausage, full length.
- Still waiting on the owners: #94, #101, #304 (held), #33 music, #47 factory photo, #341 the African country, #342 list of Israeli sites, #359-#366 client approvals, #374 three role holders, #486 keep or drop the partners paragraph.

## 7i. Hanoch's additions, 12 Nov 2026
- Crops: pears, peaches, nectarines, apricots and lemons added (orchard net houses list, orchard page description, the "where we have built" Israel line, the form's crop suggestions). No region claimed for the new ones.
- Places in Israel where MIFTAH has built: 69 places, on the projects page by region and as points on the globe (zoom in on Israel; each place is also a button). Grouped by regional or local council (Hanoch, 12 Nov 2026; e.g. Kmehin: Ramat HaNegev, Nitzana area); councils and coordinates from OpenStreetMap, filled in by hand where missing (Sa'ar, Betzet: Mateh Asher; El Rom, Yonatan: Golan; Ashdot Ya'akov: Emek HaYarden; Gevim, Nir Am: Sha'ar HaNegev; Dekel, Nirim, Ein HaShlosha: Eshkol; the winery: Katzrin). Names in the list that were not placed, waiting for Hanoch to confirm the spelling: "עמק", "צבר", "קמה", "ניתנה", "טפר מכבי", "יטפת", "יצור", "חוות מתיתיהו", "חוות פיכמן", "מו״פ צפון". Duplicates dropped: ברעם, בית העמק, געתון, גשר הזיו, אבן מנחם, רמת מגשימים, שמיר.
- Greece added as a country we have worked in (globe, map, projects table as "agricultural project", country lists, FAQ). Globe heading now "nine countries".
- Menu: "חוות חקלאיות" / "Agricultural farms"; the page heading stays "חוות חקלאיות עד מפתח".

## 8. Open questions (must be answered before go-live)

| ID | Question | Blocks |
|---|---|---|
| O1 | Which email address (or system) should receive website enquiries? Can we create a lead inbox (e.g., a form service or a Supabase table)? | Live form sending |
| O2 | Approval to show each of the five projects (photos, crop, region) | Project captions |
| O3 | Approval to list Bar'am, Elrom, Yehiam, Metzuba, Hanita as reference clients | Client names |
| O4 | Approval of old recommendation letters, or new quotes in English | Testimonials |
| O5 | Name the turnkey partner (Green Arava) and link to its site? | Partner credit |
| O6 | Do you want a staged partnership path (decision points) on the Turnkey page? | Turnkey page detail |
| O7 | Legal English company name | Footer, structured data |
| O8 | Where is the DJI_0024 net house? Can it be named? | Captions |
| O9 | A vector logo file from the designer | Final logo quality |
| O10 | Company WhatsApp or business mobile for the site? | Second contact route |
| O11 | Real start year and legal entity (E2); does the experience predate the 2012 company? Legal name and company number for the footer and privacy page | "20+ years", legal details |
| O12 | Do you manage or operate farms or land in Israel for owners abroad, and do you want to offer that? | Any "management" service |
| O13 | Office hours (Israel time) and languages you can answer in; reply time to an enquiry | Contact page, success message |
| O14 | Do you maintain structures built by other suppliers? Warranty terms on structure and net? | "Already have net houses?" answer, switching growers |
