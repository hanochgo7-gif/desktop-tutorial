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
| 2.7 | Services sold separately: needs mapping, design, manufacture, supervision, training, maintenance, execution | OS consult | High |
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
| D9 | The design choice (4 examples) is pending with Merav; this brief asks for a full build now | Build on a scored direction (see MIFTAH_CREATIVE_DIRECTION.md). Tokens are kept swappable, and the four examples stay untouched. | The user explicitly requested the full build on 26 Oct 2026 |

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
