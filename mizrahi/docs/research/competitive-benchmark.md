# Competitive benchmark: construction-company websites
For the new site of **י. מזרחי בניה ושות׳** (60 years; private houses, residential buildings, public buildings)

Research date: 28 Oct 2026.

**Method and limits.** Each site was read with a text-extraction fetch (WebFetch). For the Israeli sites I also downloaded the raw homepage HTML with curl and pulled out the font files, the most frequent hex colours and the JS libraries (GSAP, Swiper, Lottie, Elementor and so on). **I did not take screenshots.** So the "design language" notes rest on page source and page structure, not on seeing the page. Where a notes says "dominant colours", it means the hex values that appear most often in the HTML or CSS. Everything else is only what the fetched pages showed. Where a fetch failed, I say so.

**Failed or partial fetches:**
- Shikun & Binui: shikunbinui.co.il returned HTTP 503, and its TLS certificate does not match the host. shikunbinui.com/he-il returned HTTP 403.
- Mace (macegroup.com): HTTP 403.
- housecontractor.co.il: the HTML downloaded, but the text extraction came back empty.
- kolzchut.org.il pages: HTTP 403.
- gov.il pages: HTTP 403 to curl. They are cited below only by URLs that came up in search results.

---

## Part A: Israeli sites

### 1. Denya Group, formerly Danya Cebus (large)
- **URL:** https://www.denya-group.com/ (danya-cebus.co.il now 301-redirects here). Also read: /safety/ and /activity-areas/מבני-ציבור/.
- **Experience and heritage:**
  - Animated stat counters: **91 "שנות איכות"**, 110 "פרויקטים בביצוע", 2,270 "עובדים", 54,618 "יחידות דיור מאוכלסות". Each counter is paired with a strip of project photos.
  - A milestones timeline from **1934 to 2025**, with a photo and short entry per milestone and "הקודם / הבא" navigation.
- **Projects:**
  - The homepage has a "פרויקטים נבחרים" carousel. Each slide shows a title, a short description with hard numbers (for example, 486 apartments on 40 and 46 floors, or about 7,000 parking spaces) and a category tag.
  - Activity-area pages, such as public buildings, stack about 11 projects vertically. Each has a bullet list of stats and a gallery of 4 to 7 photos (facades, lobbies, drone shots).
  - There are no filters.
  - **Failure seen:** every stat on the public-buildings page came through as **"0"** in the extracted text. The numbers are JS-animated counters, so crawlers, link previews and users without JS see zeros.
- **Trust devices:**
  - The safety page is headed "עובדים בבטיחות, בונים באחריות". It states **ISO 45001** and says safety investigation reports are published every week.
  - It also describes a real-time safety monitoring system, a "Safety School" and an environmental department.
  - The site has an ethics code, an integrity page, investor relations and an accessibility statement.
  - No client logos. No contractor class or registry number on the homepage.
- **Design language (from page source):**
  - WordPress with a custom theme. Libraries: **GSAP, Lenis (smooth scroll) and Lottie**.
  - Font: Open Sans, Light to ExtraBold.
  - Dominant colours: **red #C71618** and a dark maroon **#6E3333**, on greys. A gold accent (#C89953) appears once.
  - The hero is a full video with play/pause and the cue "גללו למטה לעוד מידע אודותינו".
- **Path to contact:**
  - The header has "יצירת קשר" and a "כניסת מורשים" dropdown with supplier, tenant and partner portals.
  - The footer shows the head-office phone 03-5383838 and an Or Yehuda address.
  - No form on the homepage and no WhatsApp.
- **Worth learning:**
  - One big, specific heritage number plus a dated timeline.
  - Project blurbs that lead with hard quantities.
  - A dedicated safety page that names an actual standard.
- **Avoid or don't copy:**
  - Red-and-maroon corporate palette with a video hero and a counter wall. That is Denya's signature.
  - Numbers that render only through JS.
  - Category copy that doesn't match the page: the public-buildings intro talks about industry and offices.

### 2. Minrav Group (large)
- **URL:** https://www.minrav.co.il/ plus a project page (/project/aleh-negev/) and a category page (/project-category/public-building/).
- **Experience and heritage:**
  - Hero headline "**בונים את העתיד**", with the line "**מאז 1969**" under it. Body copy: "קבוצת מנרב מובילה את ענף הנדל״ן, הבנייה והתשתיות מאז 1969".
  - It claims "57 שנות ניסיון" in one place and "כשישה עשורים" in another, which is slightly inconsistent.
  - Key figures: 6 subsidiaries, 8 fields of activity, a ₪6.5bn order backlog, and 600+ completed projects.
- **Projects:**
  - The homepage has a filterable grid (All, National Projects, Public Buildings, Offices and Trade, Residential, and so on) with "טען עוד" to load more. Each card shows a photo, a name and a category.
  - Project page: a "פרטי הפרויקט" box with **מיקום / מזמין / סטטוס** (for example: Ofakim / Adi Negev Association / הסתיים).
  - Below that are a two-paragraph "תיאור הפרויקט", a gallery grid (two images per row with occasional full-width ones, plus "טען עוד") and "פרויקטי הדגל שלנו" cards.
  - Floor area appears only inside the prose (about 17,000 sqm). There is no year field and no architect field.
- **Trust devices:**
  - A text section "הבטיחות מעל הכל" with no certification named.
  - A "financial stability" section and press clippings (Calcalist, Bizportal) with dates.
  - The footer links to an awards and certificates page. No logos or contractor class on the homepage.
- **Design language (from page source):**
  - WordPress with a custom theme, using Swiper and Lottie.
  - Dominant colours: **navy #0B2072**, a light pink #ffe5e4 and greys. Rotating project photos fill the hero.
- **Path to contact:**
  - "כתבו לנו" appears near the top and again before the footer.
  - The form asks for name, email, phone, **department dropdown** and message, with a marketing-consent checkbox. Microcopy: "כתבו לנו ונשוב אליכם בהקדם."
  - Phone 074-7759222 in the footer. No WhatsApp.
- **Worth learning:**
  - The project-details box (location, client, status) is the cleanest pattern among the large firms.
  - The same contact form on every project page.
  - "Since 1969" set as a typographic element in the hero.
- **Avoid or don't copy:**
  - "בונים את העתיד" is Minrav's line, and it is generic anyway.
  - Inconsistent years claims.
  - Area hidden in prose instead of a field.

### 3. Ashtrom Group (large)
- **URL:** https://www.ashtrom.co.il/
- **Experience and heritage:**
  - Hero "**העוצמה שלנו, המציאות שלכם**". The copy begins "במשך יותר מ-60 שנה, קבוצת אשטרום בונה את המציאות היומיומית של כולנו" and lists everyday places the group has built (neighbourhoods, roads, offices, homes).
  - Key figures: 60+ years ("החל משנת 1963"), 8 arms, about 1,500 employees, and equity. The employee and equity figures also extracted as "0" or placeholders, so they are JS-rendered.
  - A **decade-by-decade timeline from 1963 to 2033**, each decade with a theme: pioneering and establishment, residential development, immigrant absorption and neighbourhoods, national infrastructure, and so on.
- **Projects:** A carousel of 11 featured projects. Each has a separate desktop and mobile banner, a title, a location and "לפרויקט".
- **Trust devices:**
  - TA-90 index listing, ESG pages and a live share-price box.
  - No ISO, safety certification, client logos or contractor class on the homepage.
- **Design language (from page source):**
  - Next.js with self-hosted fonts (the family name is hidden behind a CSS variable) and Swiper.
  - Dominant colours: **black #000000, blue #2768A3, a deep blue #10059f** and greys.
- **Path to contact:** No phone, form or WhatsApp on the homepage. There is only a footer link to "צרו קשר". The site is aimed at investors and recruits.
- **Worth learning:**
  - Each decade gets a theme rather than just a list of dates. That is a strong way to tell a 60-year story.
  - "We built the places you use every day" is an emotional framing of heritage.
- **Avoid or don't copy:**
  - Ashtrom's line "60+ שנה … בונה את המציאות" is very close to what Mizrahi would say ("60 years"). Write it differently.
  - Hiding the contact route.
  - Investor-first information architecture.

### 4. Electra Construction (large)
- **URL:** https://www.electra-construction.co.il/ plus a project page (/פרויקטים/בנייה_למגורים/המגדל_בפארק_גבעתיים).
- **Experience and heritage:**
  - Only a vague "חברת בנייה מנוסה עם מאות פרויקטים בארץ".
  - No founding year and no counts.
- **Projects:**
  - The hero is "חברת בנייה עם מענה מקיף לכל התחומים" over six category image tiles.
  - Six featured cards. Each has a thumbnail, a one-line scope with numbers (for example, "28 floors, 140 units") and "קרא עוד ›".
  - Project page labels: **לקוח, מזמין, אדריכל**. Size is given inside "תיאור פרויקט:" (above-ground 26,000 sqm and underground 13,000 sqm). No status or year.
- **Trust devices:**
  - A "LIFE CYCLE" diagram of business areas.
  - A "לקוחות" page exists in the menu.
  - No ISO, safety, class or registry details shown.
- **Design language (from CSS):**
  - Fonts: **Open Sans Hebrew**, plus "reforma" as a display face.
  - Dominant colours: **warm light grey #efeeed**, sky blue **#009bee** and navy #264975. Uses the Slick carousel.
  - Credits TBWA and idus BRANDWISE.
  - Notable accessibility skip links at the very top, including "stop animations".
- **Path to contact:**
  - The form block is headed in English, "LET'S CONSIDER IT", with "תמיד כאן בשבילך". The submit button reads "DONE ›".
  - No phone or WhatsApp visible.
- **Worth learning:**
  - The architect is credited on project pages. Architects are a referral channel.
  - A "stop animations" control.
- **Avoid or don't copy:**
  - English headings on a Hebrew site.
  - The submit label "DONE".
  - No years or numbers at all.

### 5. Shikun & Binui (large): not reviewed
shikunbinui.co.il returned 503 with a certificate mismatch, and shikunbinui.com/he-il returned 403. Nothing to report.

### 6. Dov Grau (דב גראו), family boutique: private homes, multi-unit housing, development
- **URL:** https://dov-grau.co.il/ plus /בנייה-פרטית/
- **Experience and heritage:**
  - Top banner: "חברת בנייה משפחתית".
  - Hero H1: "**40 שנות ניסיון ומאות פרויקטים בבנייה איכותית ויוקרתית דואגים בשבילכם לכל הבירוקרטיה עד לקבלת המפתח**".
  - About text: "חברת בוטיק משפחתית וחמה", founded in 1985 by Dov Grau, who still heads it.
- **Projects:**
  - Three projects under "פרויקטים בשיווק". Each has a short description and "קרא עוד".
  - No categories, dates, areas or locations as fields.
- **Private-homes page:**
  - Headings include H1 "בניית בית פרטי ווילות יוקרה בסטנדרט גבוה", "מהי בנייה עד המפתח? ולמה אצלנו?" and "אתם יכולים לבנות עלינו!"
  - The process is described in prose: "מלווה אותך משלב התכנון דרך הפשרת הקרקע, החפירה ועד קבלת המפתח וטופס 4".
  - It promises to handle the bureaucracy: "את כל זמן ההתרוצצות בין אנשי המקצוע, המוסדות והוועדות – אנו עושים הכל עבורכם!"
  - It promises a schedule shown to the client and "ראש שקט".
  - No numbered steps. No warranty stated.
- **Trust devices:**
  - Stats "מאות לקוחות מרוצים" and "40 שנות ניסיון".
  - Four named testimonials, including "משפחת הורוביץ". One mentions the post-handover "תהליכי הבדק".
  - **No registry number or contractor class shown.**
- **Design language (from page source):** WordPress with **Elementor**. Fonts loaded: Open Sans, Raleway, Droid Serif and **Assistant**. Uses Swiper.
- **Path to contact:**
  - A lead form in the hero headed "**השאירו פרטיכם ונחזור אליכם בהקדם האפשרי**", with name, phone, email and message, and the button "שלח".
  - A second form near the footer and a popup "צרו איתנו קשר".
  - Two phone numbers and an email address. No WhatsApp.
- **Worth learning:**
  - The private-home buyer's real pain is bureaucracy and Form 4 (טופס 4). Saying so up front works.
  - Testimonials signed by families.
- **Avoid or don't copy:**
  - Vague counts ("מאות").
  - The header is repeated several times in the markup.
  - Templated Elementor look.
  - No proof of registration.

### 7. Shlavim Engineering (שלבים הנדסה), small: private homes plus engineering services
- **URL:** https://www.shlavim-eng.com/
- **Experience and heritage:**
  - Founded in 2017.
  - The founder is named, with credentials (building technician, Technion graduate), and the page says he holds "**קבלן מורשה ג-1**". That is the site's wording; see Part C for what the class means.
- **Projects:**
  - Filter tabs: הכל / בניה פרטית / שירותי הנדסה ליזמים.
  - Each card has a photo and a title such as "בית פרטי – משפחת ציונסקי".
  - No location, date or size.
- **Trust devices:**
  - Six named testimonials, from private clients through a CEO and a supervisor.
  - **Ten client logos** under "מבין לקוחותינו" (for example Emek Medical Center and the Technion).
  - The licence-class mention above.
- **Design language (from page source):** WordPress with Elementor. Fonts: **Assistant, Poppins, Secular One**. Uses Swiper.
- **Path to contact:**
  - The hero asks "איך נוכל לעזור לכם?", followed by a block "**בונים בית?**" that routes to turnkey construction or to management and supervision.
  - Form: name, phone, email, message and an opt-in, with the button "שליחה".
  - Phone, a **WhatsApp office link**, email, a Ramat Yishai address and office hours (Sun–Thu, 08:00–17:00).
- **Worth learning:**
  - The "בונים בית?" fork splits private clients from developers on the first screen.
  - Office hours are shown.
  - The licence class is stated next to a named person.
- **Avoid or don't copy:**
  - Course promotions mixed into the contractor homepage dilute its focus.
  - Project cards without data.

### 8. Ch. Numa (ח.נומה הנדסה ובנייה), small: villas, extensions, safe rooms (Be'er Sheva and the south)
- **URL:** https://numa.co.il/
- **Experience and heritage:** No year or count. The site says only "ניסיונם העשיר בתחום".
- **Projects:**
  - Six projects, each with only a title and location (Yeruham, Mitzpe Ramon and others).
  - A "לצפייה בכל הפרויקטים ›" link.
- **Trust devices:**
  - H1: "**ח.נומה הנדסה ובנייה – קבלן רשום לווילות, שיפוצים ותוספות בנייה**".
  - The **registered-contractor number 34552** is shown in the header and intro.
  - It states a one-year defects period: "אחריות מלאה על העבודה הכוללת שנת בדק".
  - It offers "הצעות מחיר ללא תשלום".
  - No class or branch, testimonials or logos.
- **Design language (from page source):**
  - WordPress with Elementor. Font: **Assistant**.
  - Dominant accent: dark red #af1917.
  - A floating call icon and a floating WhatsApp icon.
- **Path to contact:**
  - Phone, WhatsApp, email, address, a Waze link and Facebook.
  - Short form: name, phone and message, with the button "שליחה".
- **Worth learning:**
  - **The registry number is in the H1 area.** That is the most direct trust signal seen in the whole benchmark.
  - A Waze link for a local builder.
- **Avoid or don't copy:**
  - Thin project data.
  - Inconsistent coverage claims ("national" versus "south and centre").
  - The "שנת בדק" framing undersells, because statutory periods for new-dwelling sales are longer (see Part C).

### 9. Other small private-home sites found but not fully reviewed
- **housecontractor.co.il:** the text extraction came back empty. Its title is "האוס בנייה ויזמות: קבלן שלד גמר ובנייה עד מפתח | קבלן בנייה לוילות", and the source shows WordPress with Elementor.
- **dor-gs.co.il** (דור פתרונות בנייה, northern Israel): only the FAQ page was read. It states that a turnkey contractor "מחויב לפי חוק המכר (דירות), התשל"ג-1973". It lists warranty periods that **do not match the law's schedule**, including "no time limit" for structural defects, while the law says 20 years for major defects (see Part C).
  - **Lesson:** don't publish legal claims a lawyer hasn't checked.

---

## Part B: International benchmarks

### 10. Skanska USA
- **URL:** https://www.skanska.com/ (landed on the US experience).
- **Heritage:** No founding date or timeline. Experience is expressed through a sector list and "Notable experience". Headline: "**Building places that move and inspire**".
- **Projects:** A featured carousel ("Showing card 1 of 3") with image and name only, plus four large photo tiles (Buildings, Transportation & Infrastructure, Commercial development, Careers). No data on the cards.
- **Trust devices:** A metrics band: $8.7B revenue (2025), 6,500 US employees, and a 61% cut in Scope 1 and 2 emissions against 2015. A sustainability link. No safety statistics or logos.
- **Design:** Image-led, full-width photography with large headings and tile overlays.
- **Contact:** "Partner with Skanska", the office address with phone, and "Search our offices".
- **Learn:**
  - Photos of people at work, not just finished glass.
  - A small set of hard metrics.
- **Avoid:** Cards with no data.

### 11. Laing O'Rourke
- **URL:** https://www.laingorourke.com/
- **Heritage:** None on the homepage. The section "The Power of Experience" describes its regions.
- **Projects:**
  - The hero is a rotating carousel of **news and contract awards**, not projects. For example: "Creating new capabilities will support delivery of good growth across the UK."
  - Nine sectors in the menu.
  - No per-project data on the homepage.
- **Trust devices:** Health and safety and sustainability cards. Governance documents (code of conduct, anti-bribery, whistleblower).
- **Contact:** "Contact us", media enquiries, and head offices with phone numbers.
- **Learn:** Governance documents are a quiet trust signal for public-sector clients.
- **Avoid:** A news-led hero. It is meaningless to a family building a house.

### 12. Turner Construction
- **URL:** https://www.turnerconstruction.com/
- **Heritage:**
  - The founding year was **not** shown on the homepage.
  - It claims "the largest general contractor in the country".
  - "#1 Green Builder for the 19th Consecutive Year" signals longevity.
- **Projects:** One featured project (Four Seasons Modernization) with "See Our Portfolio" and "Browse Our Projects".
- **Hero device:** "**Making a Difference**" with "**What do you want to build?**" and three paths: *A Project / A Career / A Better Future*.
- **Trust devices:**
  - A commitment to "an injury-free environment".
  - Rankings.
  - A 24/7 ethics hotline.
  - Subcontractor prequalification.
- **Contact:** A short form (first name, last name, email, optional phone, message; "Send"), email, phone, HQ address, and "Become a Subcontractor".
- **Learn:** "What do you want to build?" is an audience router on the first screen. The idea translates well (see the takeaways).
- **Avoid:** Copying the line literally.

### 13. Willmott Dixon (UK, family-owned)
- **URL:** https://www.willmottdixon.co.uk/
- **Heritage:**
  - "**174 years of delivering projects**", and news mentioning "its 175th year".
  - The Peter Willmott Foundation is linked.
  - Hero: "**Building places, building lives.**"
- **Projects:**
  - About 15 cards. **Each leads with one headline fact**: "£40m seven-scheme programme", "1,000 student bedrooms", "handover 12 weeks early", "WELL Building Standard".
  - A projects map and featured projects in the menu.
- **Trust devices:** King's Awards, an RICS award, net-zero case studies with £ savings, and a £5bn pipeline.
- **Contact:** An enquiry form, email sign-up and head-office details.
- **Learn:** **One outcome metric per project card.** "Handover 12 weeks early" is more persuasive than "read more".
- **Avoid:** Recruitment taking over the main CTA.

### 14. Bowmer + Kirkland (UK, family-owned)
- **URL:** https://www.bandk.co.uk/
- **Heritage:** The opening statement is "**We are one of the UK's most successful family-owned construction and development groups**". No year or family names on the homepage.
- **Projects:** Three "Latest Projects" cards, each with **sector, city and client**. Testimonials link to the project pages. It cites £4.3bn of projects secured over five years, **76% from returning clients**.
- **Trust devices:**
  - "**A safe pair of hands**": turnover £1.4bn and net assets £672m (2025).
  - Testimonials from named client directors.
  - Awards in the news feed.
- **Contact:** "Enquire now" and "Contact us". "We'd like to hear from you: Discuss a project or find out more about us". Head-office phone and regional offices.
- **Learn:**
  - **The share of repeat clients** is the best trust statistic in this benchmark for a 60-year firm.
  - Testimonials tied to specific projects.
- **Avoid:** Stating family ownership without telling the family story.

### 15. Wates (UK, family-owned)
- **URL:** https://www.wates.co.uk/
- **Heritage:**
  - Hero "**Reimagining places for people to thrive**", with "family-owned" in the subtext.
  - Links to History, Leadership, and the Wates Family Enterprise Trust.
  - The founding year is not on the homepage.
- **Projects:** A slider. Each card has an image, title, location, short description, "View project" and a **sector tag that filters the project list**.
- **Trust devices:**
  - A stats band: £2.56bn turnover, 6,000 employees, £464m social value, and a £10bn order book.
  - Partner logos.
  - An Armed Forces Covenant badge.
  - Awards and governance links.
- **Contact:** An "Enquire Now" button in the header and "Get in touch". No phone in the extracted text.
- **Learn:**
  - A persistent "Enquire" button in the header.
  - Sector tags that double as filters.

### 16. Mace: not reviewed (HTTP 403)

---

## Part C: What Israeli clients check when choosing a contractor (sourced)

Purpose: content for a neutral "מה לשאול כל קבלן" section that states the law and **makes no claims about Mizrahi**. Every fact Mizrahi states about itself (registration number, branch, class, insurance, ISO) must come from the company's own documents.

### C1. רשם הקבלנים and פנקס הקבלנים (the contractors' register)
- **Law:** חוק רישום קבלנים לעבודות הנדסה בנאיות, התשכ"ט–1969. The register is run by אגף בכיר רשם הקבלנים at the Ministry of Construction and Housing.
- **Section 14(א):** engineering-construction works whose financial scope or professional nature exceeds what regulations set "לא יבוצעו … אלא על ידי קבלן רשום שקיבל רשיון".
- **Section 14(ב):** for works under a building permit (היתר) that s.14(א) applies to, performance by a registered contractor is treated as a condition of the permit, "בכל שלב משלביהן עד לסיומן".
- **Threshold:** תקנות רישום קבלנים (היקף כספי ומהות מקצועית), התשמ"ד–1984, set the scope that triggers registration.
  - Wikisource gives the 2026 indexed amounts as **₪108,500 per site in a main branch (ענף ראשי)** and **₪56,750 in a sub-branch (ענף משנה)**.
  - The amounts are updated every 1 January by the construction-input index.
  - **Regulation 2:** work on a building's **skeleton (שלד)** must be done only by registered contractors, **whatever its size**.
- **How to check:**
  - The Ministry offers registry services on gov.il.
  - Secondary guides say you can search by name or number on the Ministry site, and that if the number doesn't come up the contractor is probably not registered.
  - I could not open the gov.il search page itself (403), so **the site should link to the official gov.il registry search rather than restate how it works**, and the link must be confirmed live before launch.
- **Complaints:** the registrar handles complaints about registered contractors. Kol Zchut has a page on this ("הגשת תלונה לרשם הקבלנים במשרד הבינוי והשיכון"); I saw it in search results but its fetch returned 403.

### C2. סיווג קבלני (classification: branch, group and type)
Source: תקנות רישום קבלנים לעבודות הנדסה בנאיות (סיווג קבלנים רשומים), התשמ"ח–1988. Read as Wikisource wikitext, revision of 23 Feb 2026.

- A registration is for a **branch (ענף)** or **sub-branch (ענף משנה)**. Each branch belongs to a **classification group (קבוצת סיווג א׳/ב׳/ג׳)** and has a **type (סוג) from 1 to 5**.
  - The common shorthand "**100 ג-5**" means branch 100, group ג, type 5.
- **"סוג"** = the maximum financial scope (excluding VAT, land costs, land taxes and building fees) the contractor may perform **at one construction site**. For residential work it can alternatively be stated in sqm (reg. 1).
- **Group ג** includes **100 – ענף ראשי בניה**, 140 precast, 193 pools, 200 roads and infrastructure, 300 bridges, 400 ports and 700 silos. Limits in **₪ thousands, from Dec 2025**:

  | Type | Max per site | Residential alternative |
  |---|---|---|
  | ג-1 | 5,274 | up to 2,000 sqm |
  | ג-2 | 9,303 | up to 3,000 sqm |
  | ג-3 | 18,606 | up to 5,000 sqm |
  | ג-4 | 31,774 | up to 10,000 sqm |
  | ג-5 | unlimited | unlimited |

- **Branch 131 = "שיפוצים"** (renovations). It is a sub-branch in **group א׳** and has its own entry type, "סוג ק" (reg. 3א; ₪825k from Feb 2026).
  - Note that some commercial articles describe 131 wrongly, as "concrete and skeleton" or as "electricity". In the regulation, concrete and skeletons is **130 (group ב׳)** and electrical work in buildings is **160**.
- **Indexation:** amounts change on **1 April and 1 October** each year by the residential construction-input index (reg. 6). **Never hard-code ₪ limits on the site.**
- **Promotion and demotion:**
  - Up one type after 12 months, given works of the required scope (reg. 3).
  - A follow-up review for types 2 to 5 at three years or more can demote one type (reg. 10א).
  - Exceeding your type's scope is an offence under s.16(1) of the law (reg. 11).
- **Why a client cares:** the type caps the size of a single project, so check that the contractor's type covers the project.
- **"קבלן מוכר"** (recognised for government works) is a separate status on top of registration. Some government tenders require it, others don't, depending on the tender.
  - Source: Green Invoice magazine and tender notices on mr.gov.il. These are secondary, so verify before stating.
  - It is relevant to public buildings, but **state it only if Mizrahi actually holds it.**

### C3. חוק המכר (דירות), התשל"ג–1973: specification, inspection and warranty
Read from Wikisource.
- **s.2:** a seller must attach a **specification (מפרט)** and maintenance and use instructions to the contract. **s.3(ג):** every item in it must be filled in precisely.
- **Inspection period (תקופת בדק):** set per defect type in the schedule, running from handover. Examples:
  - 1 year: any non-major defect not listed elsewhere.
  - 2 years: frames and joinery, interior flooring.
  - 3 years: machinery and boilers, yard development, thermal insulation.
  - 4 years: plumbing and drainage, waterproofing.
  - 5 years: cracks over 1.5 mm in non-load-bearing parts.
  - 7 years: exterior cladding.
- **Warranty period (תקופת אחריות):** 3 years after the inspection period ends.
- **Major defect (אי-התאמה יסודית):** 20 years from handover.
- **Does it apply to a contractor building on the client's own plot?** This is **not straightforward**. The law defines "מוכר" as someone who sells a dwelling "שבנה או שהוא עתיד לבנות … על קרקע שלו או של זולתו".
  - Law-firm summaries point out that the decisive question is whether there is a "sale" or a works contract (חוזה קבלנות).
  - Some private-home contractors' sites simply assert that the law applies, and one of them listed the periods wrongly.
  - **Recommendation:** the site should not state which law governs Mizrahi's private-home contracts. Instead, advise: "בקשו שתקופות הבדק והאחריות ייכתבו בחוזה, ובדקו אותו עם עו״ד". Have Mizrahi's lawyer approve any wording.

### C4. חוק המכר (דירות) (הבטחת השקעות של רוכשי דירות), התשל"ה–1974: guarantees
- **s.2:** a seller may not receive more than **7%** of the price unless it provides one of these: a bank or other guarantee, an approved insurance policy, a mortgage or lien, a warning note (הערת אזהרה) or a transfer of ownership.
- This applies to **buying a new apartment from a seller or developer**. It is relevant if Mizrahi also sells units, but not automatically to a works contract on the client's land.
- In construction contracts generally, performance and warranty guarantees (ערבות ביצוע / ערבות בדק) are a matter of contract. I found no primary source that sets them for private homes, so **present them as "questions to ask", not as legal requirements.**

### C5. Insurance
- The standard Israeli contractor's policy is **ביטוח עבודות קבלניות**, in three chapters: **פרק א׳ – רכוש** (the works), **פרק ב׳ – צד שלישי**, **פרק ג׳ – חבות מעבידים**. Source: the Bituach Haklai model policy (bth.co.il). Municipal tender annexes use the same structure. One annex sets ₪4M for chapter ב׳; that is one tender, not a norm.
- Things to ask about: the deductible per chapter; cover for neighbouring property (critical for infill private homes); whether subcontractors and their workers are covered; and whether the client is named as an additional insured. These are **suggestions from policy structure, not legal requirements.**

### Suggested neutral copy: "מה לשאול כל קבלן" (draft; needs legal review)
1. מה מספר הרישום שלכם בפנקס הקבלנים, ובאיזה ענף וסוג? (בדקו בעצמכם באתר רשם הקבלנים.)
2. האם הסוג שלכם מכסה את היקף הפרויקט שלי באתר אחד?
3. מי מבצע את עבודות השלד: עובדי החברה או קבלני משנה, והאם הם רשומים?
4. איזו פוליסת ביטוח עבודות קבלניות יש לכם? האם היא כוללת צד שלישי (שכנים) וחבות מעבידים?
5. אילו ערבויות תספקו (ביצוע / בדק), ובאיזה שלב?
6. האם יש מפרט טכני מלא שמצורף לחוזה?
7. מה תקופות הבדק והאחריות לפי סוג ליקוי, וכיצד הן כתובות בחוזה?
8. מי מטפל בהיתר, בפיקוח ובטופס 4 / תעודת גמר?
9. אפשר לבקר בפרויקט שסיימתם ולדבר עם הלקוח?

### Sources for Part C
- Law (Wikisource): https://he.wikisource.org/wiki/חוק_רישום_קבלנים_לעבודות_הנדסה_בנאיות (ss. 1, 7, 14, 16)
- Classification regulations: https://he.wikisource.org/wiki/תקנות_רישום_קבלנים_לעבודות_הנדסה_בנאיות_(סיווג_קבלנים_רשומים) (regs. 1, 3, 3א, 6, 10א, 11 and the First Schedule; revision of 23 Feb 2026). Official gazette PDFs are linked from there (olaw.org.il).
- Threshold regulations: https://he.wikisource.org/wiki/תקנות_רישום_קבלנים_לעבודות_הנדסה_בנאיות_(היקף_כספי_ומהות_מקצועית) (regs. 1–3)
- חוק המכר (דירות): https://he.wikisource.org/wiki/חוק_המכר_(דירות) (ss. 1–4 and the schedule)
- הבטחת השקעות law: https://he.wikisource.org/wiki/חוק_המכר_(דירות)_(הבטחת_השקעות_של_רוכשי_דירות) (s. 2)
- Registrar unit: https://www.gov.il/he/departments/units/contractors_registrar_and_head_of_sales_laws_moch (from search; fetch returned 403)
- Registration service: https://www.gov.il/he/service/contractors-registration-application (from search)
- Kol Zchut, complaints to the registrar: https://www.kolzchut.org.il/he/הגשת_תלונה_לרשם_הקבלנים_במשרד_הבינוי_והשיכון (from search; fetch returned 403)
- Secondary sources on how to check, used with caution: https://www.greeninvoice.co.il/magazine/פנקס-קבלנים/ ; https://www.greeninvoice.co.il/magazine/קבלן-מוכר/ ; https://www.nadlancenter.co.il/article/6331
- Applicability of the sale law to private and self-build cases (law-firm summaries): https://shpak-law.com/מכירת-דירה-חדשה/ ; https://www.dt-law.co.il/articles.asp?ArticleID=7439
- Insurance policy structure: https://www.bth.co.il/wp-content/uploads/2023/01/פוליסה-לביטוח-עבודות-קבלניות-12022-.pdf
- Example of a contractor site getting the warranty periods wrong: https://www.dor-gs.co.il/faq/responsibility-of-private-construction-contractor

---

## Part D: Patterns across the benchmark

| Pattern | Who does it | Note |
|---|---|---|
| Founding year as a hero element | Minrav ("מאז 1969"), Ashtrom ("החל משנת 1963"), Denya (91 years) | Common, so the year alone does not set a firm apart |
| Timeline | Denya (dated milestones), Ashtrom (themed decades) | Ashtrom's themed decades work best |
| Stat counters | Denya, Ashtrom, Minrav, Wates, Skanska | Denya's and Ashtrom's render "0" without JS |
| Project details box | Minrav (location, client, status), Electra (client, architect) | No site shows year, area and type together as fields |
| One outcome per project card | Willmott Dixon | Rare and persuasive |
| Project filters | Minrav, Shlavim, Wates (sector tags) | |
| Registry number shown | Numa only (קבלן רשום 34552); Shlavim states "ג-1" | None of the large firms show it. That is a gap a 60-year firm could own |
| Named ISO standard | Denya (ISO 45001, on the safety page) | |
| Testimonials | Dov Grau, Shlavim, Bowmer + Kirkland | B+K ties them to projects |
| Repeat-client share | Bowmer + Kirkland (76%) | Strong for an old firm, if Mizrahi has real data |
| WhatsApp | Shlavim, Numa (small firms only) | None of the large firms have it |
| Audience router on the first screen | Turner ("What do you want to build?"), Shlavim ("בונים בית?") | |
| Lead form in the hero | Dov Grau | Converts, but looks salesy |
| Fonts | Assistant (Dov Grau, Numa, Shlavim), Open Sans / Open Sans Hebrew (Denya, Electra) | The small-firm sites are generic Elementor builds |
| Colours | Red (Denya, Numa), navy and blue (Minrav, Ashtrom, Electra) | Red and navy are taken |

---

## Takeaways for Mizrahi

### Recommendations
1. **Put the registry details at the top, verified.** Under the logo or in the hero, show: "קבלן רשום מס׳ ___ · ענף 100 · סוג ג-_", each linked to the official gov.il registry search. Only Numa among those reviewed does this, and none of the large firms. Fill it **only from Mizrahi's registration certificate**; don't guess the class.
2. **Tell 60 years as one family's story by decade, not as a counter.** Borrow Ashtrom's idea of a theme per decade, but use Mizrahi's own chapters (for example: first houses, first residential building, first public building, the next generation). Pair each decade with **one real archive photo and one real project**. The founder's name and the "ושות׳" partners give a face the large firms lack. Don't open with "60+ שנה בונים…", which is too close to Ashtrom.
3. **Give every project a fixed, scannable fact box,** fuller than Minrav's: סוג (בית פרטי / בניין מגורים / מבנה ציבור) · יישוב · שנת מסירה · שטח בנוי (מ״ר) · קומות/יח״ד · מזמין (with permission) · אדריכל · היקף העבודה (שלד / עד מפתח). No site reviewed shows year, area and type together as fields. Leave a field out rather than estimate it.
4. **Use one outcome line per project card,** like Willmott Dixon. For example: "נמסר במועד", "טופס 4 התקבל ב-__", or "בית שני לאותה משפחה". Only use lines that are true and documented.
5. **Ask "מה אתם בונים?" on the first screen,** with three paths: **בית פרטי · בניין מגורים · מבנה ציבור**. Each path leads to its own page with its own projects and its own contact form. The idea is Turner's and Shlavim's; the wording should be Mizrahi's own.
6. **Build a private-home path that addresses the real worries.** Use a numbered process (מגרש → תכנון/היתר → שלד → גמר → טופס 4 → בדק). For each step say what Mizrahi does and what the client does. Dov Grau covers this in prose; numbered steps are clearer.
7. **Publish a neutral "מה לשאול כל קבלן" checklist** (Part C) with links to primary sources. Mizrahi then answers each question **on its own page** where it can document the answer. This turns compliance into trust without overclaiming. Get a lawyer to review the wording on bdek and warranty.
8. **Show hard numbers in the HTML, not only in JS counters.** Denya and Ashtrom show "0" to crawlers. A modest count-up is fine on top of real text, but the numbers must be in the static markup and must respect reduced-motion settings.
9. **Make contact human and local.** Show a named contact person per path (for example, the partner who handles private homes), a tap-to-call phone, WhatsApp with a pre-filled message per path (for example "שלום, אני מתכנן/ת בית פרטי ב…"), office hours and a Waze link. The large firms hide contact; the small firms show it. A 60-year firm can do both: dignified and reachable. Use Hebrew CTAs only, for example "ספרו לנו על המגרש", "תיאום פגישה במשרד" and "דברו עם ___".
10. **Use a short form with a qualifying first question.** Fields: type of project, יישוב, whether a plot or permit already exists, name and phone. Minrav's department dropdown shows the routing idea. Avoid a hero lead form (Dov Grau), which reads as a sales funnel for a heritage brand.
11. **Use testimonials tied to projects and signed by families** (Dov Grau, Bowmer + Kirkland). Only with written permission. A short quote on the project page beats a carousel on the homepage. If Mizrahi has real figures on repeat or multi-generation clients ("בנינו לשלושה דורות באותה משפחה"), that is its strongest point, but only if it is documented.
12. **Choose a visual identity none of these firms use.** Red belongs to Denya and Numa; navy and blue to Minrav, Ashtrom and Electra; Assistant and Open Sans are the default fonts across the small Elementor builds. Consider a warm, material palette (stone, concrete, limestone, with one earthy accent), a Hebrew serif or a distinctive Hebrew grotesk for display, archive photos in a consistent treatment, and documentary photos of people at work rather than renders. Skanska shows that photos of people at work build trust.

### Patterns to avoid
- Generic slogans already used by others: "בונים את העתיד" (Minrav), "העוצמה שלנו, המציאות שלכם" and "60+ שנה בונה את המציאות" (Ashtrom), "Building places…" (Skanska, Willmott Dixon).
- Copying signature devices: Denya's video hero with a counter wall, Ashtrom's investor box and 1963–2033 decade strip in the same form, Minrav's "מאז" lockup.
- Vague quantities like "מאות פרויקטים" or "ניסיון עשיר" (Electra, Dov Grau, Numa). Use real counts or none.
- Inconsistent claims about years or coverage (Minrav says 57 years and "six decades"; Numa says "national" and "south and centre").
- Unverified legal claims about warranty or bdek periods (dor-gs), or downplaying them ("שנת בדק" only).
- English UI on a Hebrew site ("LET'S CONSIDER IT", "DONE ›" at Electra).
- Hiding contact behind a footer link (Ashtrom).
- News or contract awards as the hero (Laing O'Rourke). They mean nothing to a homeowner.
- JS-only numbers, heavy scroll-jacking (Lenis or GSAP) on a site whose audience includes older clients, and carousels as the only way to see projects.
- Mixing unrelated offers into the homepage (Shlavim's courses).
- Logos, certifications (ISO and others), class or "קבלן מוכר" status, safety statistics or testimonials that Mizrahi cannot document. **Nothing in this report is a fact about Mizrahi.**
