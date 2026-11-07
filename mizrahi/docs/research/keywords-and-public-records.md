# Research: Hebrew keywords and existing web presence, "י. מזרחי בניה ושות׳"

Date of research: 2026-10-28.
Method: Google autocomplete (`suggestqueries.google.com`, `client=firefox&hl=iw&gl=il`), queried with curl. About 330 queries in total: about 100 seed and variant phrases, plus `seed + letter` expansions (א through ת, 22 letters) for 8 seeds. I also used the WebSearch tool, the data.gov.il CKAN API (the open-data copies of the Contractors Registry, the Companies Registry and the Partnerships Registry), and direct fetches of a few pages.

**Limitations (please read first)**
- **Search volumes are unknown.** Autocomplete shows only that Google considers a phrase popular enough to suggest. It gives no counts, and the order of suggestions is not a reliable ranking. Volumes need Google Keyword Planner (free with a Google Ads account), Search Console after launch, or a paid tool.
- An **empty result** means Google offered no suggestion for that exact prefix. It does not mean that nobody searches for it.
- Raw data is in `out.json`, `out2.json`, `out3.json` and `out4.json` in the same scratchpad folder.

---

## Task 1: Keyword research (Google autocomplete, he-IL)

Legend: **[HI]** = high commercial intent (the searcher is looking for a contractor to hire or get a quote from). [R] = research or information intent. [N] = navigational (the searcher wants a specific company). [X] = off-target or noise.

### A. Private home builder (homeowners building on their own plot)

Phrases observed:
- **[HI]** קבלן לבניית בית פרטי · קבלן בניית בית פרטי · קבלן בית פרטי · קבלן מפתח בית פרטי
- **[HI]** קבלן מפתח · קבלן עד מפתח · קבלן בנייה עד מפתח · קבלן מפתח מומלץ · קבלן מפתח מחיר · קבלן מפתח בצפון · קבלן מפתח בדרום · חוזה קבלן מפתח
- **[HI]** קבלן בניה פרטית · קבלן בניה מומלץ · קבלן בנייה מומלץ
- **[HI]** קבלן וילות · קבלן וילות יוקרה · קבלן וילות בבאר שבע · בניית וילות יוקרה · בניית וילות
- **[HI]** קבלן שלד · קבלן שלד מומלץ · קבלן שלד רשום · קבלן שלד מחיר · קבלן שלד מחיר למטר · קבלן שלד וגמר · מחפש קבלן שלד
- [R/HI] בניית בית פרטי · בניית בית פרטי עד מפתח · בניית בית פרטי מבטון · בניית בית במושב · בניית וילה
- [R] בניית בית פרטי שלבים · שלבי בניית בית פרטי · תהליך בניית בית פרטי · תכנון בניית בית פרטי · תהליך בניית בית
- [R] קבלן מפתח או מפקח בניה · אחריות קבלן בניה פרטית · ביטוח בניית בית פרטי
- [R] חוזה עם קבלן שלד · חוזה עם קבלן בנייה · חוזה עם קבלן שלד ופיתוח · חוזה קבלן שלד · הסכם קבלן שלד · הסכם קבלן בניה
- [X for a concrete-build contractor] בניית בית פרטי בניה קלה · בניית בית פרטי ממכולות · בניית בית פרטי מעץ · בניית וילה בניה קלה · קבלן בניה קלה (בצפון/בדרום) · קבלן שלד סיני / ערבי / דרוזי / עבודה עברית (labour-origin queries, so off-brand) · בנייה עצמית / בניה עצמית (almost all DIY: furniture, pergola, buggy, PC)

Notes:
- The letter expansions of "קבלן לבניית בית פרטי" returned **no suggestions for any of the 22 letters**. The base phrase exists, but Google suggests no long tail for it.
- "בניית בית פרטי עם קבלן", "קבלן בניה בית פרטי", "קבלן לבניית בתים פרטיים" and "קבלן שלד בית פרטי" returned nothing.

### B. Cost and research (the largest cluster seen)

- **עלות בניית בית פרטי** · ... עד מפתח · ... למטר · ... למ"ר · ... 100 מ ר · ... 150 מטר · ... 200 מ ר · ... 250 מ ר · ... 300 מטר · ... 2025 · ... 2026 · מחשבון עלות בניית בית פרטי · מה עלות בניית בית פרטי · עלות בניית שלד בית פרטי · עלות בניית ממד בית פרטי
- **כמה עולה לבנות בית פרטי** · ... 100 / 120 / 150 / 200 / 250 / 300 / 400 מטר · ... למטר · ... בישראל · כמה עולה לבנות בית · כמה עולה בניית בית פרטי (למטר)
- בניית בית פרטי מחיר · בניית בית פרטי מחיר למטר · בניית שלד בית פרטי מחיר · מחיר שלד בית פרטי · בניית בית פרטי זול · בניית בית פרטי עלויות · הוצאות בניית בית פרטי · חישוב עלויות בניית בית פרטי · תקציב בניית בית פרטי
- מחיר למטר בניה (שלד / בית פרטי / עד מפתח / בלוק / גמר / קלה / בתל אביב) · מחיר בניה למטר (2025 / 2026 / רבוע / מרובע / שלד / וילה)
- עלות בניה למטר (בית פרטי / בית פרטי 2024, 2025, 2026 / בית משותף / בניה רוויה / מסחרי) · עלות בנייה למ"ר · עלות בנייה ממוצעת למ ר
- בניית וילה עלויות · עלות בניית וילה למטר · עלות בניית בניין מגורים · עלות בניה רוויה למטר
- Contract and warranty research: אחריות קבלן · אחריות קבלן לפי חוק המכר · אחריות קבלן שלד · אחריות קבלן תמא 38

Intent: mostly [R], early in the funnel. These are the best topics for informational content: a cost guide, stages of building, and a contract checklist. Phrases containing "קבלן" together with a price (קבלן שלד מחיר, קבלן מפתח מחיר) lean towards **[HI]**.

### C. Developers, B2B and residential buildings

- **[HI]** קבלן ביצוע · דרוש קבלן ביצוע · הסכם ביצוע קבלן · ערבות ביצוע קבלן
- **[HI]** קבלן ראשי · הסכם קבלן ראשי · רווח קבלן ראשי (דקל) · אחוזי קבלן ראשי דקל (Dekel price-book terms, used by industry professionals)
- [N/HI] קבלני בניה · קבלני בניה גדולים · חברות בניה · חברות בניה גדולות (בישראל) · חברות בנייה מובילות (בישראל) · חברות בניה ויזמות · חברת בניה ויזמות · חברות בניה ויזמות בצפון · יזם וקבלן
- [R] בניית בניין מגורים · שלבי בניית בניין · תהליך בניית בניין · בניית שלד בניין · בניה רוויה (הגדרה, במושבים)
- [X] קבלן ביצוע הוצאה לפועל (legal usage) · חברות בניה דרושים (jobs) · חברת בניה למכירה
- "חברת בניה + letter" is overwhelmingly **navigational**: names of specific competitors (תדהר, אשטרום, גשם, אלמוג, מגידו, דמרי, אאורה, לוינשטיין, פרשקובסקי, עמרם אברהם, ...). Generic intent is rare in that set.
- Nothing returned for: קבלן בנייני מגורים, קבלן ביצוע למגורים, קבלן מגורים (only competitor names), קבלן בניה רוויה.

### D. Public buildings and tenders

- **[HI, B2G]** מכרזי בניה · מכרזי בניה ממשלתיים · מכרזי בניה משרד הביטחון · מכרזי בניה ושיפוצים · מכרזים לקבלנים (רשומים) · מכרזים קבלן רשום · מכרזים קבלן ג1 · מכרז מבני ציבור · מכרזי רשויות מקומיות (משכל)
- **[HI, B2G]** קבלן מוכר לעבודות ממשלתיות · רישום קבלן מוכר לעבודות ממשלתיות · קבלן מוכר כוכבית · קבלן מוכר משרד הביטחון · קבלן מוכר רשימה
- [R] מבני ציבור (דוגמאות / בישראל / חוק התכנון והבניה / עיריית ת"א / עיריית ירושלים) · בניית בית כנסת · עלות בניית בית כנסת · כמה עולה לבנות בית כנסת
- **Returned nothing:** קבלן מבני ציבור (base phrase and all 22 letter expansions), קבלן מבנים ציבוריים, בניית מבני ציבור, קבלן מבני חינוך, קבלן בניית מבני ציבור, בניית בתי ספר, בניית גני ילדים.
  - My reading: public-sector buyers (municipalities and ministries) do not find contractors through Google search. On the site, public buildings belong in the portfolio, as a trust signal, rather than as a keyword target.

### E. Trust and verification (the searcher is checking a contractor)

- **[HI-adjacent]** קבלן רשום · קבלן רשום בדיקה · בדיקת קבלן רשום (רשם הקבלנים / לפי ח"פ / לפי תעודת זהות / לפי מספר) · בדיקת רישיון קבלן רשום · בדיקת סיווג קבלן רשום · בדיקת סטטוס קבלן רשום · קבלן בניה רשום · קבלן בניין רשום
- פנקס הקבלנים (הרשומים / סיווג / משרד הבינוי) · רשם הקבלנים (חיפוש קבלן / סיווג / קבלן רשום)
- סיווג קבלנים · סיווג קבלני ג 1 / ג 2 / ג 5 · סיווג קבלנים ענפים · סיווג קבלנים טבלה · סיווג קבלנים בענף 200 · קבלן ג5 · קבלן רשום ג5 · מה זה קבלן ג5 · קבלן סיווג ג 5 · קבלן ענף 131
- רישיון קבלן בניה · מידרג קבלן בניה · קבלן שלד מידרג (the Midrag review site)
- Nothing returned for: קבלן בניה ביקורות, קבלן בניה המלצות, קבלן בניה ותיק, קבלן בנייה ותיק, חברת בניה ותיקה, חברת בניה משפחתית, קבלן בניה עם ניסיון.
- Implication: show the contractor-registry number, the branch and classification (ענף/סיווג), and a link to the registry on the site. People search for these terms. "60 years" is a trust message for the page copy, not a search phrase.

### F. Local (contractor + region or city)

- **[HI]** קבלן בניה בצפון / בדרום / במרכז · קבלן בניה ירושלים / בירושלים · קבלן בנייה בירושלים · קבלן בניה באר שבע / ברחובות / באילת / בחיפה / נתיבות · קבלן בנייה בנתיבות
- **[HI]** קבלן שלד בצפון / בדרום / במרכז / בשרון / באר שבע / אשקלון / חיפה / ירושלים / בתל אביב / באזור מודיעין עילית
- **[HI]** קבלני בניה בדרום / בצפון / במרכז / בחיפה / ירושלים / באר שבע · קבלן בניין בחיפה / בצפון / באילת / באשקלון / בדרום
- [N] חברת בניה ירושלים / בירושלים / בנתניה / בפתח תקווה / חיפה / חולון / הרצליה / רעננה / מודיעין / ...
- Nothing returned for: קבלן בניה תל אביב, ... חיפה, ... השרון, ... מבשרת, ... בית שמש, ... מודיעין, ... גוש עציון, ... מעלה אדומים, קבלן בית פרטי ירושלים, בניית בית פרטי ירושלים, קבלן מבני ציבור ירושלים.
- Jerusalem urban renewal (relevant if the company is the Jerusalem entity in Task 2): פינוי בינוי ירושלים (+ neighbourhoods: קטמונים, גילה, קרית מנחם, ארמון הנציב) · תמא 38 ירושלים · התחדשות עירונית ירושלים · קבלן תמא 38 · אחריות קבלן תמא 38.
  - "תמ"א 38 קבלן", with the quotation mark, returned nothing; the unquoted form "תמא 38 קבלן" suggests "קבלן תמא 38".

### Spelling: בניה vs. בנייה

Both spellings appear in autocomplete. The short spelling **בניה** produced more suggestions in every seed pair tested:
- קבלן בניה vs. קבלן בנייה
- חברת בניה vs. חברת בנייה
- בניה עצמית vs. בנייה עצמית

This does not prove that more people search for it. Recommendation: use one spelling in body copy and cover the other naturally, for example in an FAQ or a title variant.

### Shortlist of high-intent phrases to consider as page targets

Volumes are unverified; check them in Keyword Planner before committing.

| Page | Candidate phrases (observed in autocomplete) |
|---|---|
| Home / brand | קבלן בניה · חברת בניה · קבלן ראשי · קבלן ביצוע |
| Private homes | קבלן לבניית בית פרטי · קבלן מפתח בית פרטי · קבלן עד מפתח · קבלן וילות יוקרה · קבלן שלד |
| Residential buildings | קבלן ביצוע · חברת בניה ויזמות · בניית בניין מגורים |
| Public buildings | (no direct search demand seen) · use as portfolio; tender phrases: מכרזי בניה · קבלן מוכר לעבודות ממשלתיות |
| Cost guide (content) | עלות בניית בית פרטי (למטר / עד מפתח / 200 מ"ר / 2026) · כמה עולה לבנות בית פרטי · מחיר שלד בית פרטי |
| About / trust | קבלן רשום · סיווג קבלני ג5 / ג3 · פנקס הקבלנים · בדיקת קבלן רשום |
| Local | קבלן בניה + region (צפון/דרום/מרכז/ירושלים) · קבלן שלד + city |

---

## Task 2: Existing public web presence of the company

**Nothing below is verified. Mizrahi is a very common surname.** Each item is graded by how confident I am that it is the client:
- **Possible match**: the name and field fit, but nothing ties it to the client yet.
- **Unlikely**: probably a different business.
- **Different entity**: clearly not the client.

### 2.1 Google autocomplete signals (observed)

- Typing **"י מזרחי בניה"**, **"י. מזרחי בניה"**, **"י.מזרחי בניה"** or **"י מזרחי ושות"** autocompletes to **"י מזרחי ושות בניה ויזמות בע מ"**. Google therefore knows an entity by roughly this name.
- **"י. מזרחי"** on its own autocompletes mostly to **י. מזרחי ריהוט משרדי**, an office-furniture company (website y-mizrahi.com, see 2.4).
  - Brand and SEO implication: the short name "י. מזרחי" is already associated with a different business.
- "מזרחי קבלן" and "מזרחי בנייה" autocomplete to many different individuals: רוני / יוסי / איציק / אלי / ניסים / קובי / אבי מזרחי קבלן, ארז מזרחי בנייה ויזמות, and others.

### 2.2 Israeli Companies Registry (רשם החברות), data.gov.il open dataset `ica_companies` (observed)

**Possible match:** company no. **514842368**, **"י. מזרחי ושותפיו בניה ויזמות בע"מ"**
- Private company, status **פעילה** (active)
- Incorporated **20/11/2012**
- Address: **בצלאל 59, ירושלים**, 9455666
- **Flagged "מפרה"** (non-compliant company, violation code 18 in the dataset)
- Last annual report filed: **2019**
- This is the closest name match found. Note that the 2012 incorporation date does not match "60 years" by itself.

Other "מזרחי + בניה/בנין" companies exist. All of them are **unlikely**: either the name differs or they are dissolved or struck off. Examples:
- 510566409 י מזרחי קבלנות כללית בע"מ (active, 1971, חולון)
- 510502248 א ברוך ו י מזרחי קבלנים בע"מ (voluntarily liquidated, 1968, ירושלים)
- 511555203 י. מזרחי - ח. גנזל בנין ופיתוח (struck off)
- 510641020 יעקב מזרחי חברה לבנין (court liquidation)
- 510600257 אפרים מזרחי ושות בניה ופיתוח (struck off)

Source: https://data.gov.il/dataset/ica_companies (resource f004176c-b85f-4542-8901-7b3176f9a054)

### 2.3 Partnerships Registry and Contractors Registry, data.gov.il (observed)

**Possible match, linked to 2.2 by the same address:** partnership no. **540128204**, **"יצחק ויעקב מזרחי - קבלני בנין ופיתוח"**
- General partnership, status active
- Registered **05/04/1978**
- Address field: "ירושלים בצלאל 59 יצחק"
- Source: https://data.gov.il/dataset/ica_partnerships

The same partnership appears in the **Contractors Registry (פנקס הקבלנים הרשומים)** as **contractor no. 5213**:
- Name: "יצחק ויעקב מזרחי קבלני בנין"
- Address: בצלאל 59, ירושלים
- Registered as a contractor: **19/10/1983**
- Branch **100 (בניה), group ג, classification 3** (classification date 29/09/1994)
- Branch **200 (כבישים, תשתית ופיתוח), ג1**
- Recognised for government works: "לא מוכר"
- Manager listed: מזרחי יצחק
- Source: https://data.gov.il/dataset/pinkashakablanim (dataset last updated 2026-08-17)

What the address link means:
- The company 514842368 (2.2) and this registered contractor share the address Bezalel 59, Jerusalem. That suggests they are related.
- The "י." could stand for יצחק or יעקב. This is **not confirmed**.

Gaps against the client's description:
- **514842368 is not in the Contractors Registry.** A search by its company number returned no rows.
- The oldest date found for this group is 1978. I found **no record that supports "60 years"**.
- A ג3 classification is a mid-size limit. It does not by itself show work on large public buildings.

Other Mizrahi entries in the Contractors Registry (114 rows matched "מזרחי" out of 24,373) belong to **different entities**. Examples:
- קבוצת מזרחי ובניו השקעות (12411, Bat Yam, ג5)
- נאות מזרחי (8699, Bat Yam, ג5)
- א.ר.י. מזרחי ובניו (10430, Bat Yam, ג3)
- many individuals

### 2.4 Business directories, social media and websites

- **Dapei Zahav (d.co.il): "י. מזרחי ושות', ירושלים"**: **possible match**
  - https://www.d.co.il/4098540/43470/
  - Category: קבלני בניין
  - Hours: Sun–Thu 7:30–19:30, Fri 9:00–13:00
  - Phones on the page: 072-3121704 (probably a tracking number) and 02-6248516
  - No street address, no website, no description, and no reviews ("אין עדיין חוות דעת")
- **Facebook page "י. מזרחי ושות' בניה ויזמות בע"מ"**: **possible match**
  - https://www.facebook.com/p/%D7%99-%D7%9E%D7%96%D7%A8%D7%97%D7%99-%D7%95%D7%A9%D7%95%D7%AA-%D7%91%D7%A0%D7%99%D7%94-%D7%95%D7%99%D7%96%D7%9E%D7%95%D7%AA-%D7%91%D7%A2%D7%9E-100057467175385/ (page ID 100057467175385)
  - I could not view the page: fetching it returned a login wall.
  - A search-engine summary (not seen by me directly) described it as a Jerusalem firm with focus "בניה ויזמות בניה התחדשות עירונית פינוי בינוי ותמ״א 38" and about 9 likes.
  - That positioning (urban renewal, TAMA 38) differs from the brief (private houses, residential, public buildings).
- **No company website was found.**
  - Domains probed: ymizrahi.co.il, mizrahi-bniya.co.il, mizrahi-build.co.il and mizrahi-construction.co.il did not connect.
  - **y-mizrahi.co.il** answers but is behind a Cloudflare challenge (HTTP 403), so its owner and content are **unknown**. It is worth asking the client whether it is theirs.
  - **y-mizrahi.com** = "ריהוט משרדי" (office furniture): **different entity**.
  - **ymizrahi.com** = a software engineer's portfolio: **different entity**.
- **Google Business Profile:** I could not check this. I have no Maps access, and nothing appeared in web search.

### 2.5 News, rankings and tenders

- **Nothing found** for "י. מזרחי ושות'", "מזרחי ושותפיו", "יצחק ויעקב מזרחי" or "י. מזרחי בניה" in news, Duns100 or tender documents.
- Search results are dominated by **קבוצת מזרחי ובניו (1958)**, which is a **different entity**:
  - large Bat Yam developer; chairman רוני מזרחי, former president of the Builders' Association
  - Contractors Registry no. 12411, ג5
  - sites: https://www.mizrachi-sons.co.il/ and https://www.duns100.co.il/en/Mizrachi_&_Sons_Group_1958
  - Its "since 1958" claim resembles "60 years". **Do not use its projects or history.**
- Also **different entities**:
  - ח. מיתר לבנין (Meir Mizrahi, כפר מעש): https://www.duns100.co.il/ח_מיתר_בעמ
  - מזרחי ובניו (א.ר.א) בניה והשקעות, Bat Yam: https://www.d.co.il/17670370/43470/

### 2.6 Questions to ask the client before writing any "about" copy

1. What is the exact legal name and company or partnership number (ח"פ)? Is it 514842368 or 540128204?
2. What is the contractor registry number (5213?), and what are the current branches and classifications?
3. What is the basis for "60 years"? For example, a predecessor business or a founder who started earlier than 1978.
4. Is y-mizrahi.co.il theirs? Is the Facebook page theirs? Do they have a Google Business Profile?
5. Does the company know that the Companies Registry lists 514842368 as "מפרה", with the last annual report filed in 2019? This may matter if the site shows the company number.
6. Which projects (private houses, residential buildings, public buildings) can be named publicly, with photos?
