# MIFTAH sitemap and user journeys

## Sitemap

English is at the root, Hebrew under `/he/`. The same slugs are used in both languages, and every page links to its counterpart (hreflang en / he / x-default).

| Page | EN | HE | Why it exists | Primary buyer question |
|---|---|---|---|---|
| Home | `/` | `/he/` | Explains what MIFTAH does in five seconds, then routes the two audiences | "What is this and is it for me?" |
| Net houses and structures | `/net-houses.html` | `/he/net-houses.html` | The core business today (Q q2). Organised by crop (market research, implication 1). Linkable from a quote (q22). | "Do they build for my crop, and how?" |
| Turnkey farms abroad | `/turnkey-farms.html` | `/he/turnkey-farms.html` | The growth line for investors (q2, q22), stated honestly as delivered with partners (q36) | "Can one partner set up my farm, and what's excluded?" |
| Projects | `/projects.html` | `/he/projects.html` | Evidence: 7 countries abroad, 410,000 m² itemised, the five projects the owners chose (q14) | "Have they done this, at scale, far away?" |
| About | `/about.html` | `/he/about.html` | Named owners, the plant, the crews, values in the client's own words (q23) | "Who exactly am I dealing with?" |
| Discuss your project (contact) | `/contact.html` | `/he/contact.html` | The single conversion page | "How do I start, and will they take my project?" |
| Company profile | `/profile.html` | `/he/profile.html` | One printable page to attach to quotes and hand out in Berlin (q22, q44). Marked `noindex`. | "Give me the summary" |
| Privacy | `/privacy.html` | `/he/privacy.html` | Required by the form | |
| Accessibility statement | `/accessibility.html` | `/he/accessibility.html` | Israeli law (IS 5568) | |
| 404 | `/404.html` | `/he/404.html` | Recovery | |

Not built, on purpose:
- **"How we work":** merged into Net houses (process) and Turnkey farms (stages), so the same content isn't repeated.
- **Separate crop pages:** crop sections live on Net houses. There is not enough verified content per crop yet.
- **Testimonials:** no approval yet (truth ledger O4).
- **Knowledge hub (5 Hebrew SEO articles):** not linked until the owners approve the articles. See MIFTAH_SEO_AND_ANALYTICS.md.

## Navigation

- **Header:** Net houses, Turnkey farms, Projects, About, Contact, the language switch, and the primary CTA "Discuss your project" (it moves into the menu under 1020 px).
- **Footer:** all pages, the company profile, phone, town, privacy and accessibility.
- **Dark CTA band at the end of every content page:** CTA and phone, the minimum sizes, and the Berlin fair.

## Journeys

### 1. Foreign investor (private investor, agri company or entrepreneur, Q q6)

- **Arrives:** a referral (q9), the fair, or a link in an email.
- **Path:** Home hero → route "Turnkey farms abroad" → Turnkey (honest partner note, the 11 stages with deliverables, exclusions, "start with the assessment", minimum 30 ha) → About (owners) → Projects (proof abroad) → Contact.
- **Objections and where they are answered:**

| Objection | Where |
|---|---|
| "Have you ever delivered a whole farm?" | Turnkey: "Our newest line of work", delivered with partners |
| "What's not included?" | Turnkey: Not included |
| "Can I commit in stages?" | Turnkey: Start with the assessment |
| "Far away?" | Projects: map and table; Net houses: Abroad |
| "Price?" | Contact: pricing follows a site review |

- **Next step:** the form, choosing "A private investor" and "A turnkey farm abroad".

### 2. Agricultural company or grower abroad (net houses)

- **Path:** Home → route "Net houses and farm structures" → Net houses (their crop's section, the parts drawing, the process with real photos, "Abroad: local crews trained and managed, components from our plant") → Projects → Contact.
- **Objections:**

| Objection | Where |
|---|---|
| "Designed for my site?" | "Designed for the site, not from a catalogue" |
| "Is the steel any good?" | Galvanized poles made in the plant, checked before shipping |
| "Who maintains it?" | Maintenance section |

### 3. Israeli grower (Hebrew)

- **Arrives:** a recommendation from another kibbutz, or a search ("בית רשת לבננות").
- **Path:** /he/ (the same headline, in Hebrew; the net-houses route is first) → /he/net-houses.html → phone (q31: phone works best) or the form.
- **Objection "Is my plot big enough?":** the minimum of 50 dunam is stated in the facts row, the routes, the CTA band and the form.

### 4. Supplier or fair contact

- **Path:** QR code or link → /profile.html → print or save as PDF.

### 5. Existing client needing maintenance

- **Path:** Net houses → "Maintenance, dismantling and reuse" → Contact, choosing "One stage only".

## Conversion design

| Element | Decision | Source |
|---|---|---|
| Primary CTA | "Discuss your project" / "דברו איתנו על הפרויקט" everywhere (renamed after review cycle 1), with the same name in the header, hero, band, form heading and page title | Creative direction; q21 (avoid "get a quote") |
| Secondary CTA | Office phone, `tel:` link, tracked | q31 |
| Form fields | See the table below | |
| Qualification | Minimum sizes stated before the form, plus a live notice when the size is below the minimum for the chosen country (it doesn't block sending) | q8, q21 |
| Fair | A checkbox to meet at Fruit Logistica | q44 |
| Spam | Honeypot field and a 2.5 s minimum fill time | |

Form fields and why each one is there:

| Field | Required? | Operational purpose |
|---|---|---|
| Name | Required | Address the reply |
| Email | Required | International follow-up across time zones |
| Phone or WhatsApp | Optional | Israeli and many foreign buyers prefer it (q31) |
| Company | Optional | Tells a fund apart from a family farm |
| I am | Required | Routes investor vs. grower (q6) |
| What you need | Required | Net houses / turnkey / one stage |
| Country | Required | Climate, logistics, minimum size |
| Region | Optional | Site visit planning |
| Land size | Required | Qualifies against q8 |
| Land status | Optional | Seriousness |
| Crop | Optional | Net type |
| Timeline | Optional | Priority |
| Message | Optional | |
| Consent | Required | Privacy |

Funding status was considered and left out: it is intrusive for a first contact.

**Live sending is not connected** (no business email exists, truth ledger O1). Until it is, the form validates and then says plainly that online sending isn't connected, offers the summary to copy and shows the phone number. It never shows a false "sent".
