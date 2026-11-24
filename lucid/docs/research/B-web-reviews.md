# Team B: User reviews outside the app stores (Trustpilot, independent reviews, communities)

> **Scope.** This report covers real user and reviewer opinion about 12 competitors from sources other than Apple and Google store reviews, which are coded separately. The competitors are Duolingo, Babbel, Busuu, Rosetta Stone, Memrise, ELSA Speak, Praktika, Speak, Cambly, Preply, Quizlet and LingQ. Loora, an Israeli-founded AI English tutor, was added as a bonus because it competes directly with Lucid. The research was done on **2026-10-30**. Every claim cites a page opened in this session with WebFetch, or a PDF downloaded by WebFetch and converted to text locally. Search-result snippets were used only to find pages and are never cited.

---

## 1. Method

1. **Trustpilot.** For each company I found the Trustpilot profile by domain and recorded the TrustScore, the review count, the star distribution and the profile flags (claimed, invites reviews, reply rate) exactly as displayed. Then I read:
   - the default "most recent" page (page 1, about 20–24 reviews); and
   - the 1–2★ filtered page 1 (`?stars=1&stars=2`, about 20 reviews).

   Both pages were read for all 12 companies except Speak, which has no usable profile (see §3). I counted unique reviews per company after removing overlap between the two pages. Loora's recent page was also read.
2. **Theme coding.** I tagged each 1–2★ review on the filtered page with one or more themes, such as billing, refunds, support, depth or advanced level, AI quality, speech recognition and bugs. A **repeated pattern** means the theme shows up in at least 3 independent reviews for a company, or across at least 3 companies. A theme in only one or two reviews is reported as an **individual complaint**.
3. **Independent reviews.** I opened 6 product reviews or evaluations (1 tech publication, 3 language-learning sites, 1 academic journal software review, 1 SEO review site) and 2 news reports on Duolingo's AI shift. I recorded each one's date, method and conflicts of interest.
4. **Communities.** Reddit and Stack Exchange were unreachable (see §2). I used Hacker News: discovery through the `hn.algolia.com` API, then 4 threads opened and read. I also used Hebrew-language sources: the Tapuz "לימודי אנגלית" (English studies) forum index and 3 threads, a Maariv first-person commentary piece and a Geektime article.

## 2. Limitations and biases (read before using any number here)

**Trustpilot biases**
- **Self-selection toward billing and service problems.** Trustpilot is a consumer-service platform. On the 1–2★ pages, most complaints are about money and support, not pedagogy. Examples: Duolingo 12 of 20 billing/trial [T2]; Babbel 12 of 20 billing and 11 of 20 support [T4]; ELSA 10 of 20 trial or auto-renewal [T12]; Rosetta Stone 14 of 23 "lifetime" access [T8]. Teaching-quality signals are thin and come mostly from 3–4★ reviews.
- **Invitation bias dominates the TrustScore.** Every company whose profile says it invites reviews scores 3.6–4.4: Babbel, Busuu, Preply, Praktika, and Loora at 4.1. Every company with "no recent history of asking", or which "hasn't invited", scores 1.4–2.8: Duolingo, Rosetta Stone, Memrise, ELSA, Cambly, Quizlet, LingQ. Trustpilot says businesses "can invite reviews, or they can be organic" [T26]. Invited reviews are often short and generic, such as "So far so good" or "Easy to use", both labelled invited on Babbel [T3]. Preply's recent page has similar one-liners, such as "Fast and good" and "Awesome" [T19], but the invited label on those two was not confirmed. **TrustScores therefore compare review-collection strategies, not product quality, and must not be ranked as a quality league table.**
- **The score is weighted.** Trustpilot says the TrustScore uses "a weighting system that includes seven reviews at 3.5 stars" plus the number and age of reviews [T26]. This fits Rosetta Stone showing a 2.0 TrustScore while its cumulative distribution is 52% 5★ [T7]: older positive reviews appear to count for less than recent negative ones.
- **Small samples.** ELSA has 33 reviews, LingQ 22, and the Speak domains 1–2. Patterns for these companies are only indicative.
- **Wrong audience on some profiles.** On Cambly, 15 of 20 1–2★ reviews come from tutors or tutor applicants, about pay and onboarding, not from learners [T18]. Preply mixes tutor and student reviews [T19][T20].
- **Unverified content.** Trustpilot does not fact-check reviews [T16][T12]. Some reviews are off-topic (Duolingo vs. chess.com [T1]) or contradict their own rating (a 5★ review alleging "looted my money" [T5]).
- **Date inconsistencies.** Many cards show one date in the header and a different date under the review text. This happens on most profiles, including Duolingo, Babbel, Busuu, ELSA and Praktika, not only Memrise, Cambly, Quizlet, LingQ and Rosetta Stone. The gap is usually 1–8 days but can be months: an ELSA 4★ card shows header 2026-07-21 and body 2026-04-10 [T11], and the Babbel "Basic French…" card shows header 2026-07-12 and body 2025-08-08 [T4]. This report does **not** use one date convention consistently. Duolingo, Babbel and Cambly examples mostly use header dates. Busuu, ELSA and Praktika examples mostly use body dates. Treat each single date as accurate only to within about a week unless noted. (Corrected in verification, 2026-10-30. The earlier text said header dates were used throughout.)

**Tool and coverage limitations**
- **Extraction by a summarizer.** Trustpilot pages and threads were read through WebFetch, which returns a model-generated extraction of the page. Quotes and theme counts below are as extracted. I could not inspect them visually. Treat counts as approximate (±1–2).
- **Only page 1 was read.** Most filtered views had 4 or more pages, so each per-company sample is about 20–45 unique reviews out of hundreds or thousands.
- **Blocked or unreadable sources.** These could not be used:
  - Reddit: blocked from this environment, not cited.
  - Stack Exchange: `languagelearning.stackexchange.com` and `api.stackexchange.com` both refused.
  - PCMag and NYT Wirecutter: fetch refused.
  - The Guardian, The Verge, Wired, CNET: refused by the search tool.
  - Forbes Advisor and Israel Hayom: HTTP 403.
  - TechRadar's roundup: truncated.
  - All Language Resources: empty render.
  - An Iowa State ELSA evaluation (PSLLT): bot wall.
  - A TESL Reporter Busuu review: HTTP 503.

  The independent-review set therefore leans on smaller outlets, several with commercial conflicts. These are flagged.
- **Wrong target language.** Most independent reviews and HN discussions are by English speakers learning *other* languages, such as Spanish, French or Japanese. Few evaluate the *English* courses that Lucid competes with. Exceptions: ELSA [R5], and Trustpilot reviews of Praktika, Loora, Busuu and ELSA, many of which are by non-native English learners.
- **No Hebrew-L1 evidence.** No Trustpilot review read here identifies itself as a Hebrew speaker learning English. Hebrew community sources were sparse and largely promotional (§6.2).

---

## 3. Trustpilot summary table

All values are as displayed on 2026-10-30. "Invites" and "Replies" are Trustpilot's own profile labels. "Unique read" is the approximate number of distinct reviews read across the recent page and the 1–2★ filtered page.

| Company | Profile URL | TrustScore (label) | Total reviews | 5★ / 1★ | Claimed | Invites reviews | Replies to negatives | Unique read | Src |
|---|---|---|---|---|---|---|---|---|---|
| Duolingo | trustpilot.com/review/www.duolingo.com | **1.5** (Bad) | **8,242** (1,465 in last 12 mo) | 5% / 67% | Unclaimed | No ("hasn't invited") | None visible | ~23 | T1, T2 |
| Babbel | trustpilot.com/review/www.babbel.com | **4.4** (Excellent; star graphic 4.5) | **33,321** (3,770 in last 12 mo) | 63% / 5% | Yes (Dec 2016, paid) | Yes | 95%, within 24h (may use AI-drafted replies) | ~42 | T3, T4 |
| Busuu | trustpilot.com/review/busuu.com | **4.2** (Great) | **19,913** (2,624 in last 12 mo) | 60% / 7% | Yes (May 2014, paid) | Yes | 90%, within 1 month | ~41 | T5, T6 |
| Rosetta Stone | trustpilot.com/review/www.rosettastone.com | **2.0** (Poor) | **6,974** (37 in last 12 mo; profile merged with other Trustpilot profiles) | 52% / 7% | Yes (Oct 2014) | No recent history | "Hasn't replied" (1 reply seen) | ~28 | T7, T8 |
| Memrise | trustpilot.com/review/www.memrise.com | **1.6** (Bad; graphic 1.5) | **142** (29 in last 12 mo) | 26% / 54% | Yes (Jun 2017) | No recent history | 3%, within 1 week | ~22 | T9, T10 |
| ELSA Speak | trustpilot.com/review/elsaspeak.com | **2.3** (Poor; graphic 2.5) | **33** (17 in last 12 mo) | 15% / 67% | Yes (Mar 2022, paid) | No recent history | Label says "hasn't replied", but replies are visible | ~25 | T11, T12 |
| Praktika | trustpilot.com/review/praktika.ai | **3.6** (Average; graphic 3.5) | **1,397** (was 1,394 earlier on 2026-10-30) | 47% / 18% | Yes (Jun 2025, paid) | Yes | 74%, within 2 weeks | ~40 | T13, T14 |
| Speak (Speakeasy Labs) | trustpilot.com/review/usespeak.com | **3.2** | **1** | 0% / 100% | Unclaimed | No | n/a | 1 | T15 |
| speak.com (shown as "searchfusion") | trustpilot.com/review/speak.com | **2.9** | **2** | 0% / 100% | Unclaimed | No | n/a | 2 | T16 |
| Cambly | trustpilot.com/review/cambly.com | **2.0** (Poor) | **264** (17 in last 12 mo) | 41% / 44% | Yes (Mar 2022) | No recent history | No | ~23 | T17, T18 |
| Preply | trustpilot.com/review/preply.com | **4.4** (graphic 4.5) | **26,015** (7,418 in last 12 mo) | 76% / 13% | Yes (Sep 2016, paid) | Yes | 89%, within 24h | ~39 | T19, T20 |
| Quizlet | trustpilot.com/review/quizlet.com | **1.4** (Bad; graphic 1.5) | **662** (93 in last 12 mo) | 5% / 84% | Yes (Feb 2023) | No recent history | No | ~27 | T21, T22 |
| LingQ | trustpilot.com/review/lingq.com | **2.8** (Average; graphic 3) | **22** (2 in last 12 mo) | 27% / 59% | Yes (Sep 2015) | No recent history | No | 17 | T23, T24 |
| *Loora (bonus)* | trustpilot.com/review/loora.ai | **4.1** (Great) | **133** (132 in last 12 mo) | 58% / 7% | Yes (Feb 2026, paid) | Yes | 91%, within 2 weeks | 22 | T25 |

**Speak caveat.** Speak has **no usable Trustpilot data.** The `usespeak.com` profile ("Speakeasy Labs") holds 1 review from 2023-12-25 [T15]. The `speak.com` profile is labelled "searchfusion" in the Language Course Provider category, and nothing on it confirms that it is the Speak app. Its 2 reviews mention a $164.99 charge through Paddle.net (2026-06-23) and a paid lesson that would not load (2026-01-08) [T16]. Neither is attributed to Speak in this report.

---

## 4. Patterns across companies (Trustpilot)

| # | Pattern | Strength | Evidence (company: count on 1–2★ page 1, or dated example) |
|---|---|---|---|
| P1 | **Free trial silently converts to an annual charge, cancellation is hard, refunds are refused or bounced to Apple/Google** | **Repeated, strongest signal.** 10 of 12 companies | Duolingo 12/20 [T2]; Babbel 12/20 [T4]; ELSA 10–15/20 (a re-count found 15) [T12]; Busuu 7/20 [T6]; Praktika 6/20 [T14]; Memrise 6/20 [T10]; LingQ 5/12 [T24]; Preply 4–7/20 [T20]; Quizlet 3–4/20 plus ~10/20 paywall [T22]; Loora 2 of 22 recent [T25] |
| P2 | **Support is unreachable, templated or bot-only** | Repeated, 8 or more companies | Memrise 13/20 [T10]; Babbel 11/20 [T4]; Rosetta Stone 8/23 [T8]; Duolingo 7/20 [T2]; Busuu 6/20 [T6]; Praktika 4/20 [T14]; Quizlet 3/20 [T22]; ELSA "copy-paste replies" (2026-07-02) [T11] |
| P3 | **Content too shallow or mis-levelled for intermediate+ learners** | Repeated, 7 companies, mostly in 2–4★ reviews | Duolingo 5/20 "lack of depth" [T2]; Rosetta Stone "topics are too simple" (~B1) [T7]; Memrise A2 content served to a B2 learner [T9]; Busuu "more depth" wanted [T5]; Babbel too basic to sustain a conversation [T4]; Praktika treats high-intermediate users as beginners [T13]; Engadget and LanguaTalk agree (§5) |
| P4 | **Distrust of AI-generated content or AI tutors** (errors, generic chat, no memory) | Repeated, 6 companies | Duolingo [T1]; Memrise ×3 [T10]; LingQ ×1 explicit, plus 2 translation complaints that do not mention AI [T24]; ELSA [T12]; Praktika 4/20 [T14]; Loora (repetitive, question-heavy) [T25] |
| P5 | **Speech recognition rejects correct speech, or fails to hear it** | Repeated, 4 companies | Rosetta Stone 3/23 [T8]; Praktika 3/20 [T14]; ELSA [T11][T12]; Loora mixed [T25]. The opposite failure, over-leniency, appears in independent reviews (§5) |
| P6 | **Loss of streak or progress triggers a 1★ review** | Repeated, 5 companies | ELSA 400+ day streak (2026-07-02) [T11]; Praktika streak reset twice (2026-09-29) [T13]; Memrise ×3 [T10]; Babbel progress vanished (2026-10-30) [T3]; Duolingo crash lost an XP bonus (2026-10-24) [T1] |
| P7 | **"Childish" or gamification fatigue among adults** | Repeated, but concentrated in Duolingo | Duolingo 4/20 [T2]; Babbel praised for having "no gamification" [T3]; Busuu users switched from Duolingo [T5] |
| P8 | **Purchased "lifetime" access not honoured** | Repeated, 3 companies | Rosetta Stone 14/23 [T8]; Memrise lifetime not recognised (2025-12-04, 2025-12-09) [T9]; ELSA lifetime content "very limited", with features "locked behind another paywall" (2026-09-16) [T11] |
| P9 | **Writing practice** | **Almost absent from reviews.** Only Busuu's community-correction model is discussed, with mixed reactions | Busuu 2/20 dislike correcting other users or sending voice recordings [T6]; Praktika two positive mentions of reading and writing (both 2026-10-30) [T13]. Absence of complaints is **not** evidence of demand |

---

## 5. Per-company findings with dated examples

Quotes are verbatim as extracted, each 30 words or fewer. "(n/20)" means n of the 20 reviews on 1–2★ filtered page 1.

### Duolingo — TrustScore 1.5, 8,242 reviews [T1][T2]
- **Trial-to-annual charges (repeated, 12/20).**
  - 2026-10-25: "they snuck a $35.99 charge onto my card out of nowhere".
  - 2026-10-19: a promised trial reminder "never came".
  - 2026-10-18: "Charged me $120 without notification, warning, or an alert".
  - 2026-10-17: children's accounts were pushed into a trial that became a yearly charge [T2].
  - 2026-10-22: a 5-year subscriber was offered a renewal price on iPhone higher than the web price [T1].
- **Childish for adults (repeated, 4/20).**
  - 2026-10-21, title "Ok if you're aged 6": "It's all very childish animation and sounds."
  - 2026-10-19 (3★): "if you are an adult look elsewhere."
  - 2026-10-28: unskippable "junior puzzle" animations [T1].
- **Weak speaking and real-world language (individual complaints, 2–5/20).**
  - 2026-10-23: "endless adverts and to be rubbish at spoken language".
  - 2026-10-22: weak on slang and street language ("very poor on slang, pejorative and street language"). Idioms are not mentioned.
  - 2026-10-18 (header; body 2026-10-19): the call feature fails, and the app blames the user's internet connection [T1].
- **AI content quality (individual).** Review body dated 2026-05-18: "Duolingo has been completely ruined by AI and other factors." [T1]
- **Positive (individual).** 2026-10-19 (4★), about streaks: "it's the only study habit that actually stuck." [T1]

### Babbel — TrustScore 4.4, 33,321 reviews (invites reviews) [T3][T4]
- **Recent page is almost all 4–5★ (19 of 20), and most are invited (13 of 20 labelled invited).** Praise is for structure, grammar and short lessons:
  - "Great for Grammar and Listening" (2026-10-21).
  - "Straightforward, intuitive teaching" with no gamification (2026-10-21).
  - A 4★ review (2026-09-30) wants "more interactive conversations" that "show corrective suggestions", citing Duolingo Max [T3].
- **Auto-renewal and refunds (repeated, 12/20, Jun–Sep 2026).**
  - 2026-09-24: "sneaky auto renewal practice".
  - 2026-07-29: "does not seem to send any notifications of the end of the free trial".
  - 2026-07-02: a voucher was offered instead of a refund.
  - 2026-07-12: cancellation "unless you call in" was not allowed [T4].
- **Support loops (repeated, 11/20).** 2026-09-07: six contacts and no resolution [T4].
- **Depth (individual, 4/20).**
  - 2026-07-12 (2★), title: "Basic French that may start a conversation, but never teach you how to continue or finish one".
  - 2026-08-20: dialogues about charities and the environment rarely come up in daily talk [T4].

### Busuu — TrustScore 4.2, 19,913 reviews (invites reviews) [T5][T6]
Dates in this section are review-body dates. Header dates for the 1–2★ examples are 3–8 days later.
- **Positive: structure, and preferred over Duolingo.**
  - 2026-09-26: "After over a 600 day streak on duo I switched".
  - 2026-10-17: "Infinitely better than duolingo" [T5].
- **Higher-level depth (individual).** 2026-10-17 (3★): "okay for beginners but please make sure it's aligned perfectly with more depth" [T5].
- **Billing (repeated, 7/20).** Double charges on 2026-09-16 and 2026-10-13. Charged after cancelling on 2026-09-14 and 2026-09-22 [T6].
- **Community-correction model resented by some (individual, 2/20).**
  - 2026-10-13: "I did not sign up to correct another…".
  - 2026-09-24: does not want to send voice recordings to the community [T6].
- **Speaking practice is too thin (individual).** 2026-09-25: "There are no enough exercises" for speaking [T6].

### Rosetta Stone — TrustScore 2.0, 6,974 reviews [T7][T8]
- **Lifetime licences are not honoured during migration to the new app (repeated, 14/23, Apr–Sep 2026).**
  - 2026-09-24: "I paid for lifetime and they are sunsetting us to force a new app."
  - 2026-07-17, about Sapphire: "nothing more than a visual redesign of the exact same content" [T7].
- **Speech recognition (repeated, 3/23).**
  - 2026-05-04: "did not even register what i said".
  - 2026-02-16, title: "worst speech/voice recognition ever".
  - Featured 2023-06-16: "The speech recognition is terrible." [T7][T8]
- **Too simple, no grammar (repeated, 7/23).**
  - 2026-05-12 (3★; body dated 2025-12-12): "The topics are too simple." The reviewer guesses the content "aligns with B1 high level".
  - 2026-04-24: "It teaches you nothing in regards to grammar, and yet expects you to know it anyway."
  - 2026-05-31: content "hasn't been updated in 20 years" [T7].
- **Script relevance (individual).** 2026-04-16: immersion fails for non-Latin scripts, naming Japanese, Arabic and Hebrew [T7].
- **Positive (individual).** 2026-10-19 (4★): speaking practice "helped me order food in spanish without freezing up" [T7].

### Memrise — TrustScore 1.6, 142 reviews [T9][T10]
- **Support is non-existent or bot-only (repeated, 13/20).** 2026-09-30: "There is 0 customer service other than an AI bot that gives the wrong information." [T9]
- **Level mismatch for advanced learners (individual, 2/20).** 2026-09-30: an 850-day user at B2 kept getting A2 content. 2026-08-10: course browsing and level skipping were removed [T9].
- **AI content errors (repeated, 3/20).**
  - 2026-05-25: the conjugation section was replaced by AI that makes frequent mistakes.
  - 2026-02-11: AI chat grammar errors [T9].
- **Lifetime and billing (repeated, 6/20).** 2025-12-04 and 2025-12-09: lifetime purchases not recognised [T9].

### ELSA Speak — TrustScore 2.3, 33 reviews (small sample) [T11][T12]
- **Trial converts to an annual charge, and refunds bounce to Apple (repeated, 10–15/20; a re-count found 15 of 20; 2025–2026).** Dates in this section are mostly review-body dates.
  - 2026-02-15: "charged me $129.99 without clear prior notification after a trial."
  - 2025-09-13: "charged my account at 2am for the price of the whole year." [T11]
- **Speech scoring (individual; corroborated by Praktika and Rosetta Stone reviews).**
  - 2026-09-16: "I can repeat the same word or phrase several times, clearly and in exactly the same way" and still be rejected.
  - 2026-04-10 (4★): "the AI sometime grades my pronunciation wrong" [T11].
- **The pivot to AI chat diluted the core value (individual).** 2026-03-19: "The app now feels like a generic AI chat" with little pronunciation correction [T11].
- **Positive (individual).**
  - 2026-01-06: "people around me actually noticed the improvement in my speech."
  - 2026-01-01: "Great paths for all levels of English." [T11]

### Praktika — TrustScore 3.6, 1,397 reviews (invites reviews) [T13][T14]
- **Positive: speaking confidence and patience (repeated in 4–5★ reviews).**
  - 2026-10-15: "like your talking to a real teacher that does not get grumpy or frustrated".
  - 2026-10-27: "a personal tutor available 24/7" [T13].
- **AI tutor limits (repeated, 4/20 plus several 3–4★).**
  - 2026-09-15 (2★, a 1-year subscriber): "the advertised real-time interaction with an AI tutor was a total exaggeration".
  - 2026-10-21: the tutor drifts "instead of focusing on the original prompt".
  - 2026-10-26: "my AI does not remember what I asked for in previous chats".
  - 2026-10-27: wants the tutor to recall earlier topics [T13][T14].
- **Speech recognition (repeated, 3/20).**
  - 2026-09-23: "it never understands you, very frustrating."
  - 2026-10-11: voice recognition is unreliable and a refund was refused [T14].
  - 2026-10-29 (4★): "The AI glitches out quite a bit" [T13].
- **Level fit cuts both ways (repeated, 6/20).**
  - Beginners say it is too hard or too fast (2026-10-15, 2026-10-18, 2026-10-11).
  - A high-intermediate user is treated as a beginner (2026-10-26) [T13][T14].
- **Billing (repeated, 6/20).**
  - 2026-10-12: "charged $67.71 even though I cancelled in the allotted time".
  - 2026-10-30: the renewal price could not be disclosed [T14].

### Speak — no usable Trustpilot data
See §3 [T15][T16]. Independent evidence on Speak is in §6.

### Cambly — TrustScore 2.0, 264 reviews [T17][T18]
- **The profile is dominated by tutors (15/20 on the 1–2★ page)**, complaining about pay frozen for more than 10 years, rating algorithms and onboarding delays [T18].
- **Learner-side complaints (individual, 3 second-hand reviews).**
  - 2025-03-23: a refund was refused after the tutor's English was weaker than expected.
  - 2025-01-30: a friend was overcharged and got an unmotivated tutor with no clear teaching method (paraphrase) [T18].
- **Tutor's view of the product (individual).** 2025-10-10: says conversational tutors are sold as professional tuition [T17].
- **Former tutor on vetting (individual).** 2026-06-20: "Cambly will hire absolutely anyone who holds a passport from an approved native-English-speaking country" [T17].

### Preply — TrustScore 4.4, 26,015 reviews (invites reviews) [T19][T20]
- **Positive: flexibility and tutor choice (repeated, invited).** 2026-10-30: "speak natively the language you are trying to learn" [T19].
- **Subscription and refund rules keep money with the platform (repeated, 4–6/20).**
  - 2026-10-26: "every policy seems designed so that the money stays with Preply".
  - 2026-10-27: cancelling a subscription can affect lessons already paid for.
  - 2026-10-30: "random price increases on your monthly bills" [T20].
- **Inconsistent tutor reliability (repeated, 4/20).**
  - 2026-10-07: the tutor was often late or cancelled.
  - 2026-10-23: the tutor became unavailable mid-package.
  - 2026-09-13: the tutor taught a different exam than advertised [T20].
- **Account bans without explanation (individual, 2/20).** 2026-10-17 and 2026-10-20 [T20].

### Quizlet — TrustScore 1.4, 662 reviews [T21][T22]
- **Paywalls and upsell pressure (repeated, ~10/20). Only 2 reviews say outright that the features used to be free** (2026-02-02 and the card headed 2026-08-13) [T22].
  - 2026-09-13: "Used to be good; fell off".
  - 2026-09-11: "So many things behind a paywall".
  - 2026-09-26: auto-play removed [T22].
- **Billing (repeated, 3/20).** 2026-09-18: charged after cancelling, with bot-only support [T21].
- **AI moderation (individual).** 2026-09-28: a paying teacher says Quizlet refused to publish their sets because its AI flagged some images [T21].
- **Positive (individual).** 2026-08-31 (2★): "The AI feature is soooo good", but ads and paywalls spoil it [T21].

### LingQ — TrustScore 2.8, 22 reviews (small sample) [T23][T24]
- **Billing and cancellation (repeated, 5/12).** 2026-06-07: a charge after the "7 day free trial" [T23].
- **AI translation quality (individual; 1/12 blames AI explicitly, and 2 more criticise translations without mentioning AI).** 2025-09-30: "The AI interpretation and translations for Japanese and Polish are unusable." [T23]
- **Positive for advanced learners (individual, 2–3 reviews).** 2024-08-03: "import any Netflix show, or any content online". 2025-03-08: the reviewer reports "7000 known and successfully used words and phrases" [T23].
- **Doesn't build production (individual).** 2025-09-08: "you end up remembering words but not how to make words add up to a sentence." [T23]

### Loora (bonus; Israeli-founded AI English tutor) — TrustScore 4.1, 133 reviews (invites reviews) [T25]
- **Positive.** Real-time corrections and realistic conversation, e.g. "Almost real conversation" (2026-06-30) [T25].
- **Recurring AI-tutor complaints, mirroring Praktika (repeated, 3–4 of 22).**
  - Repetitive conversations that are mostly questions, e.g. "Only female voice and only questions" (2026-07-03).
  - The AI answers before the user finishes speaking (2026-07-07, 2026-06-24).
  - Occasional misrecognition (2026-07-03) [T25].
- **Billing (2 of 22).** Auto-renewal complaints on 2026-10-28 and 2026-09-21 [T25].
- No reviewer mentions Hebrew [T25].

---

## 6. Independent reviews and evaluations

| # | Source (date) | Type and method | Conflict / reliability | Key findings relevant to Lucid |
|---|---|---|---|---|
| R1 | **Engadget**, Julia Mercado, "The best language learning apps for 2025" (2025-03-26) | Hands-on by an intermediate Spanish learner. Criteria include advanced challenge, reading/writing and speaking. Covers 8 apps (4 top picks, 4 others). Test duration not stated | Mainstream tech outlet. No conflict noted | **Babbel** is best overall, but "Difficult to switch to an advanced level from the get-go"; its writing practice is spelling words out. **Speak** is best for speaking, but "AI sometimes misses what you're saying on the first try". **Duolingo** Max chatbot conversations are short, and the tester felt dismissed. **Pimsleur** lacks reading and writing. **Rosetta Stone** suits beginners; the $400 lifetime price is poor value [R1] |
| R2 | **LanguaTalk**, Nicholas Dunham, Speak review (updated 2026-02-19), 3/5 | Feature walk-through, apparently in French. Test duration and level not stated | **Competitor.** The publisher sells Langua and recommends it, with no explicit disclosure | Speech recognition "is overly lenient": a perfect score despite mispronunciation or reversed word order. Feedback is brief, with no tracking of recurring mistakes. Tutor Q&A is "repetitive and boring at higher levels". Little intermediate or advanced content. Writing not covered [R2] |
| R3 | **LanguaTalk**, Nicholas Dunham, Praktika review (updated 2026-06-23), 3/5 | Tested Spanish (beginner) and French (intermediate). Duration not stated | **Competitor**, as above | Speech recognition "is decent but can be too forgiving" and "won't reliably catch subtle grammar or word‑order mistakes". Feedback is easy to miss: no end-of-lesson summary, no error categories, no follow-up exercises. The avatar cannot be turned off. No spaced repetition. No monthly plan. Best for beginners and lower-intermediate learners; advanced use not evaluated [R3] |
| R4 | **StoryLearning**, Olly Richards, Duolingo Max (prices checked 2026-09-19) | Desk review of Duolingo's published pages. **The author did not test Max** | **Competitor**, disclosed: "The StoryLearning App is my own product" | Video Call runs about 1–3 minutes, with no mid-call grammar correction. Explain My Answer has been free since 2026-01-01. Max adds two conversation features and no lessons. No writing features. Duolingo says in-app purchases are generally non-refundable [R4] |
| R5 | **Nushi & Sadeghi, "A Critical Review of ELSA: A Pronunciation App"**, *CALL-EJ* 22(3), 2021, pp. 287–302 | Journal software review by two authors. It was not confirmed whether CALL-EJ peer-reviews this article type. Their stated limits: no premium access, and the review rests on the two authors' own evaluation, with no surveys or experiments | Academic. Dated (2021) | Praises ELSA's "accurate speech recognition technology" and segmental and suprasegmental feedback. Criticises its "reliance on the US English accent as the evaluation yardstick", which conflicts with English as an International Language and with IELTS and TOEFL accent diversity. Also a prescribed, behaviourist curriculum with little learner control, and premium that adds only more exercises [R5] |
| R6 | **LearnEnglish.Life**, Busuu review (2026-10-30), rated 8.8 | **No stated method** | Affiliate (commission disclosed). Prices contradict each other within the page. **Low reliability** | Community corrections are the "killer feature", but "Community feedback quality can vary". The curriculum goes up to B2, and "advanced learners may find the content too shallow". AI speaking practice is listed as a Premium Plus addition [R6] |
| R7 | **TechCrunch**, Aisha Malik (2025-04-30) | News | Reputable | Duolingo launched 148 AI-built courses, mainly beginner level. The CEO memo: "gradually stop using contractors to do work that AI can handle". Users said AI was making the app worse, with inaccurate content [R7] |
| R8 | **Fortune**, Jessica Coacci (2025-08-18) | News | Reputable | The CEO says of the AI-first memo: "This was on me. I did not give enough context." The article does not address content quality [R8] |

**Independent reviews: repeated patterns**

1. **AI speaking tutors are judged too lenient and too shallow at higher levels.**
   - Sources: R2 and R3 (same publisher, conflicted); R1, which says Speak misses speech on the first try; Trustpilot P4 and P5.
   - Recognition problems run in both directions. Some learners get false rejections (ELSA, Rosetta Stone and Praktika Trustpilot reviews). Others get false passes (LanguaTalk on Speak and Praktika).
2. **Feedback lacks persistence.** Reviewers find no cumulative error tracking (R2), no post-lesson summary (R3) and no memory of past chats (Praktika on Trustpilot). This was not found in the Loora reviews read, where one 4★ reviewer praises conversation topics that build on earlier sessions [T25].
3. **Advanced learners are under-served across the field:**
   - Babbel advanced is hard to reach (R1).
   - Busuu's curriculum goes up to B2 (R6, low reliability).
   - Speak is thin at higher levels (R2).
   - Duolingo Max calls last up to about 3 minutes (R4).
4. **Writing is barely evaluated by anyone.** Engadget covers only spelling exercises and Pimsleur's lack of writing. LanguaTalk, StoryLearning and Nushi & Sadeghi do not assess writing feedback. This is an evidence gap, not proof of a market gap.
5. **Accent standard.** The only academic source criticises a single US-accent yardstick (R5). This matters for Israeli learners who meet British-influenced school English and international exams.

---

## 7. Community findings

### 7.1 Hacker News (tech-savvy readers, mostly English speakers learning *other* languages)

Discovery used the HN Algolia API [C5]. Three of the four threads are very long, and WebFetch read only the first ~100k characters of each, so the counts are approximate.

- **"An opinionated critique of Duolingo"** (2025-09-30, 251 points, 310 comments) [C2]:
  - **Plateau** (~12 comments). mtalantikite: "I really don't think Duolingo can get you there on it's own". epistasis: "it couldn't teach me verb conjugation, noun declension…".
  - **Production neglected** (~8). elil17: "Focus on producing speech over everything else".
  - **Gamification and nagging** (~10). Uehreka: "This is an app that constantly nags you to use it." dotancohen defends it: "it was the nag features that got me to practice every day."
  - **Alternatives** (~15): Assimil, comprehensible input, iTalki tutors, Anki, Language Transfer, Pimsleur.
- **"Duolingo CEO tries to walk back AI-first comments, fails"** (2025-05-26, 459 points, 325 comments) [C3]:
  - Quitting or switching (10+). telchior: "I switched over to Busuu".
  - Quality decline (15+). lolinder: "they'd given up on prioritizing learning a long while ago".
  - Preference for human-made content (6–8). zahllos: "Courses with actual humans make learning go faster".
- **Launch HN: Univerbal (YC W23), an AI conversational tutor** (2024-01-30, 145 points, 136 comments) [C1]:
  - **Grammar hallucination fear.** schoen: "That would be my biggest fear about using a language model for foreign language study". bricee98 on an app error: "not the type of mistake that my native tutor would make".
  - **Recognition.** bravura: "There were many transcription errors". nox101 worries pronunciation scoring will be "harsher than a human".
  - **Feedback UX.** apatil: "I like the inline suggestions that don't break the flow of conversation" but "The tutor review at the end of the lesson doesn't feel as useful".
  - **Gamification opt-out.** GrinningFool: "I personally don't want to win awards or other internet points - I want to learn a language."
- **"Duolingo Max, powered by GPT-4"** (2023-03-14, 388 points, 244 comments) [C4]:
  - Correctness risk. comex: "The harder the question is, the more likely it is to get the answer wrong".
  - Price. Balgair: "a dollar a day. That's a lot to ask from an otherwise free app."
  - Practice without new learning. jake_morrison: "you can only practice something you already know".

**Repeated across HN threads:**
- gamified apps plateau at beginner or lower-intermediate level;
- users want spoken and written production;
- distrust of AI-generated correctness;
- gamification should be optional.

Caveat: HN users are not Lucid's target users.

### 7.2 Hebrew-language sources

- **Tapuz "לימודי אנגלית" (English studies) forum** [C6]:
  - 704 pages in total. The latest post on the index is dated 19/6/25, and most threads have 0–3 replies.
  - In the app-recommendation thread (opened 17/11/22) [C7], a parent says their child did not like Duolingo ("ניסיתי דאולינגו והיא לא אהבה", "I tried Duolingo and she didn't like it"). Both replies push a single commercial product with a link.
  - In "מחפש קורס ללימוד אנגלית" ("Looking for an English course", opened 15/2/22) [C8], **all 6 replies** recommend a specific provider with a link: Wall Street English, Novakid, Happy English and Speakiteasy. They look promotional.
  - A 2018 thread on the Duolingo Esperanto course [C9] calls Duolingo good for vocabulary once grammar is known, but not for a first encounter.
  - **Finding:** Israeli public forum discussion of English apps is sparse, dated and dominated by promotion. It is not a reliable source of user sentiment.
- **Maariv, Dr. Itay Gal, "אשליית הינשוף הירוק" ("The Green Owl Illusion"), 2026-06-21** [C10]. A first-person commentary piece, not labelled as opinion on the page, arguing that Duolingo's streaks and points create an illusion of progress without conversational ability:
  - "אפשר להצליח בתרגיל, אבל להיכשל בשיחה" ("You can succeed at the exercise but fail in conversation").
  - It calls the app a "learning snack" ("חטיף למידה").
  - It does not discuss English-learning or Israeli learners specifically.
- **Geektime, Yaniv Avital, 2023-06-27, on Loora** [C11]. News with **no hands-on testing**. Founder claims, unverified:
  - Duolingo and Babbel mainly serve beginners or hobbyists.
  - Private tutors are "very, very expensive" and need scheduling.
  - "אנשים רבים חוששים או מתביישים ולכן לא מתחילים ללמוד" ("Many people are afraid or embarrassed, so they don't start learning").

  Treat speaking anxiety as a vendor hypothesis to test, not as evidence.
- **Ynet, undated, sponsored content** [C12]. Promotes a Mikmak children's English-speaking game with voice-recognition feedback. Its only relevance is as an example of the speaking focus in Israeli edtech marketing. Labelled advertising, so it is given low weight.

---

## 8. Implications for Lucid (inferences, labelled as such)

1. **Treat billing trust as a feature** (P1, P8; all 10 companies with billing complaints):
   - explicit trial-end reminders, sent from Lucid and not only from the app store;
   - a monthly plan;
   - in-app cancellation;
   - a clear refund path;
   - no "lifetime" tier unless it can be honoured indefinitely.
2. **Make speech feedback calibrated and transparent** (P5, R2, R3, C1):
   - show the transcript the recogniser heard;
   - let the learner contest a misrecognition;
   - avoid both false rejections and false passes;
   - offer a choice of accent or standard (US, UK, international) (R5).
3. **Give the AI tutor memory and keep a persistent error log**:
   - recurring-error tracking, a post-session summary and follow-up drills (R2, R3; Praktika reviews);
   - keep corrections inline but unobtrusive (C1).
4. **Make level placement and up-levelling explicit for B1–C2** (P3). Do not serve A2 content to B2 users, and do not start beginners in free talk.
5. **Use adult-appropriate tone and make gamification optional** (P7, C1, C2). Back up progress and streaks robustly, and protect them from being lost (P6).
6. **Writing:** independent sources barely evaluate writing feedback in any competitor (§6, point 4). Lucid can differentiate here, but this report provides **no direct evidence of user demand**. Validate with Hebrew-speaking target users.
7. **Human tutors are not a guaranteed quality fix.** Marketplace reviews show variable tutor reliability and refund friction (Preply, Cambly). If Lucid adds human review, it needs quality control.

---

## 9. Sources

All sources were accessed on 2026-10-30 with WebFetch. "Date" is the publication or review date where shown.

| # | URL | Platform | Date | Accessed |
|---|---|---|---|---|
| T1 | https://www.trustpilot.com/review/www.duolingo.com | Trustpilot (recent) | Reviews from 2026-05 to 2026-10 | 2026-10-30 |
| T2 | https://www.trustpilot.com/review/www.duolingo.com?stars=1&stars=2 | Trustpilot (1–2★) | Reviews from 2026-10 | 2026-10-30 |
| T3 | https://www.trustpilot.com/review/www.babbel.com | Trustpilot (recent) | 2026-09 to 2026-10 | 2026-10-30 |
| T4 | https://www.trustpilot.com/review/www.babbel.com?stars=1&stars=2 | Trustpilot (1–2★) | 2026-06 to 2026-09 | 2026-10-30 |
| T5 | https://www.trustpilot.com/review/busuu.com | Trustpilot (recent) | 2026-08 to 2026-10 | 2026-10-30 |
| T6 | https://www.trustpilot.com/review/busuu.com?stars=1&stars=2 | Trustpilot (1–2★) | 2026-07 to 2026-10 | 2026-10-30 |
| T7 | https://www.trustpilot.com/review/www.rosettastone.com | Trustpilot (recent) | 2021, 2023, 2024, 2026 | 2026-10-30 |
| T8 | https://www.trustpilot.com/review/www.rosettastone.com?stars=1&stars=2 | Trustpilot (1–2★) | 2021 to 2026-09 | 2026-10-30 |
| T9 | https://www.trustpilot.com/review/www.memrise.com | Trustpilot (recent) | 2025-10 to 2026-09 | 2026-10-30 |
| T10 | https://www.trustpilot.com/review/www.memrise.com?stars=1&stars=2 | Trustpilot (1–2★) | 2025-06 to 2026-09 | 2026-10-30 |
| T11 | https://www.trustpilot.com/review/elsaspeak.com | Trustpilot (recent) | 2025-05 to 2026-10 | 2026-10-30 |
| T12 | https://www.trustpilot.com/review/elsaspeak.com?stars=1&stars=2 | Trustpilot (1–2★) | 2022 to 2026-10 | 2026-10-30 |
| T13 | https://www.trustpilot.com/review/praktika.ai | Trustpilot (recent) | 2026-09 to 2026-10 | 2026-10-30 |
| T14 | https://www.trustpilot.com/review/praktika.ai?stars=1&stars=2 | Trustpilot (1–2★) | 2026-09 to 2026-10 | 2026-10-30 |
| T15 | https://www.trustpilot.com/review/usespeak.com | Trustpilot | 2023-12-25 | 2026-10-30 |
| T16 | https://www.trustpilot.com/review/speak.com (www.speak.com shows the same profile) | Trustpilot | 2026-01, 2026-06 | 2026-10-30 |
| T17 | https://www.trustpilot.com/review/cambly.com | Trustpilot (recent) | 2025-03 to 2026-09 | 2026-10-30 |
| T18 | https://www.trustpilot.com/review/cambly.com?stars=1&stars=2 | Trustpilot (1–2★) | 2025-01 to 2026-09 | 2026-10-30 |
| T19 | https://www.trustpilot.com/review/preply.com | Trustpilot (recent) | 2026-02 to 2026-10 | 2026-10-30 |
| T20 | https://www.trustpilot.com/review/preply.com?stars=1&stars=2 | Trustpilot (1–2★) | 2026-09 to 2026-10 | 2026-10-30 |
| T21 | https://www.trustpilot.com/review/quizlet.com | Trustpilot (recent) | 2025-12 to 2026-10 | 2026-10-30 |
| T22 | https://www.trustpilot.com/review/quizlet.com?stars=1&stars=2 | Trustpilot (1–2★) | 2026-08 to 2026-10 | 2026-10-30 |
| T23 | https://www.trustpilot.com/review/lingq.com | Trustpilot (recent) | 2021-10 to 2026-06 | 2026-10-30 |
| T24 | https://www.trustpilot.com/review/lingq.com?stars=1&stars=2 | Trustpilot (1–2★) | 2021-10 to 2026-06 | 2026-10-30 |
| T25 | https://www.trustpilot.com/review/loora.ai | Trustpilot (recent) | 2025-12 to 2026-10 | 2026-10-30 |
| T26 | https://corporate.trustpilot.com/trust | Trustpilot Trust Centre (methodology) | Undated; cites 2025 figures | 2026-10-30 |
| R1 | https://www.engadget.com/apps/best-language-learning-app-120001600.html | Engadget | 2025-03-26 | 2026-10-30 |
| R2 | https://languatalk.com/blog/speak-app-review/ | LanguaTalk (competitor) | Updated 2026-02-19 | 2026-10-30 |
| R3 | https://languatalk.com/blog/praktika-review/ | LanguaTalk (competitor) | Updated 2026-06-23 | 2026-10-30 |
| R4 | https://storylearning.com/duolingo-max-review | StoryLearning (competitor, disclosed) | Prices checked 2026-09-19 | 2026-10-30 |
| R5 | https://callej.org/index.php/journal/article/download/365/295 | CALL-EJ 22(3), journal software review (PDF) | 2021 | 2026-10-30 |
| R6 | https://www.learnenglish.life/reviews/busuu/ | LearnEnglish.Life (affiliate, low reliability) | 2026-10-30 | 2026-10-30 |
| R7 | https://techcrunch.com/2025/04/30/duolingo-launches-148-courses-created-with-ai-after-sharing-plans-to-replace-contractors-with-ai | TechCrunch | 2025-04-30 | 2026-10-30 |
| R8 | https://fortune.com/2025/08/18/duolingo-ceo-admits-controversial-ai-memo-did-not-give-enough-context-insists-company-never-laid-off-full-time-employees | Fortune | 2025-08-18 | 2026-10-30 |
| C1 | https://news.ycombinator.com/item?id=39188760 | Hacker News (Launch HN: Univerbal) | 2024-01-30 | 2026-10-30 |
| C2 | https://news.ycombinator.com/item?id=45425061 | Hacker News (first ~100k chars read) | 2025-09-30 | 2026-10-30 |
| C3 | https://news.ycombinator.com/item?id=44100035 | Hacker News (first ~100k chars read) | 2025-05-26 | 2026-10-30 |
| C4 | https://news.ycombinator.com/item?id=35154870 | Hacker News (first ~100k chars read) | 2023-03-14 | 2026-10-30 |
| C5 | https://hn.algolia.com/api/v1/search?query=duolingo&tags=story&numericFilters=points>200&hitsPerPage=20 | HN Algolia API (discovery only) | n/a | 2026-10-30 |
| C6 | https://www.tapuz.co.il/forums/%D7%9C%D7%99%D7%9E%D7%95%D7%93%D7%99-%D7%90%D7%A0%D7%92%D7%9C%D7%99%D7%AA.325/ | Tapuz forum index (Hebrew) | Latest post 2025-06-19 | 2026-10-30 |
| C7 | https://www.tapuz.co.il/threads/%D7%9E%D7%99-%D7%9E%D7%9B%D7%99%D7%A8-%D7%90%D7%A4%D7%9C%D7%99%D7%A7%D7%A6%D7%99%D7%94-%D7%98%D7%95%D7%91%D7%94-%D7%9C%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%90%D7%A0%D7%92%D7%9C%D7%99%D7%AA.15585194/ | Tapuz thread (Hebrew) | 2022-11-17 to 2023-08-21 | 2026-10-30 |
| C8 | https://www.tapuz.co.il/threads/%D7%9E%D7%97%D7%A4%D7%A9-%D7%A7%D7%95%D7%A8%D7%A1-%D7%9C%D7%9C%D7%99%D7%9E%D7%95%D7%93-%D7%90%D7%A0%D7%92%D7%9C%D7%99%D7%AA.15551186/ | Tapuz thread (Hebrew) | 2022-02-15 to 2023-08-21 | 2026-10-30 |
| C9 | https://www.tapuz.co.il/posts/141481712 | Tapuz thread (Hebrew; Duolingo Esperanto) | 2018-06-02 | 2026-10-30 |
| C10 | https://www.maariv.co.il/economy/tech/article-1335343 | Maariv (Hebrew commentary) | 2026-06-21 | 2026-10-30 |
| C11 | https://www.geektime.co.il/ai-english-teacher-tutor-loora/ | Geektime (Hebrew news) | 2023-06-27 | 2026-10-30 |
| C12 | https://www.ynet.co.il/article/SJZ9MpNFP | Ynet (Hebrew, **sponsored content**) | Undated | 2026-10-30 |

**Attempted but not usable, so not cited for any claim:**
- pcmag.com and nytimes.com/wirecutter: fetch refused.
- forbes.com/advisor and israelhayom.co.il: HTTP 403.
- techradar.com "best language learning apps": truncated.
- alllanguageresources.com: empty render.
- iastatedigitalpress.com (PSLLT ELSA review): bot wall.
- lir.byuh.edu (TESL Reporter Busuu review): HTTP 503.
- languagelearning.stackexchange.com and api.stackexchange.com: fetch refused.
- help.trustpilot.com: JavaScript error page.
- reddit.com: blocked in this environment, excluded by rule.

---

## Verification log (2026-10-30)

An adversarial check re-opened every cited URL on 2026-10-30 with WebFetch. The CALL-EJ PDF was converted to text locally with `pdftotext`. Profile figures were compared with what each page shows today, and quotes were checked against page text. Status key: **OK** means confirmed as written. **Corrected** means the text above was changed. **Note** means the source was confirmed and context was added.

| Src | Status | Finding |
|---|---|---|
| T1 | Corrected | TrustScore 1.5 (Bad), 8,242 reviews (1,465 in last 12 mo), 5% / 67%, unclaimed, "hasn't invited": OK. All quoted phrases found (the page uses curly apostrophes). The "slang and idioms" review says "slang, pejorative and street language" and does not mention idioms: corrected. The "AI call" review (header 10-18, body 10-19) says calls fail with an internet-connection error: reworded. The 5★/1★ example dates mix header and body dates (see §2). |
| T2 | OK | "$35.99", "never came" and "Charged me $120…" all found. Children's-trial review: header 2026-10-17, body 2026-10-08. Billing count re-counted at 11 of 21, consistent with ~12/20. |
| T3 | Corrected | 4.4 (Excellent; graphic 4.5), 33,321 (3,770 in last 12 mo), 63% / 5%, claimed Dec 2016, paid, invites, 95% within 24h, may use AI-assisted replies: OK. Quotes found. The recent page is 13 invited and 7 unprompted, not "all invited": corrected. The 4★ review asks for "corrective suggestions": wording corrected. |
| T4 | OK | All quoted phrases and dates found. Billing 12 and support about 12 on a re-count. |
| T5 | OK | 4.2 (Great), 19,913, 60% / 7%, claimed May 2014, paid, invites, 90% within 1 month: OK. Added "2,624 in last 12 mo". Quotes found. The "looted my money" review is 5★: OK. |
| T6 | Note | Quotes and themes found (billing 7). Example dates are review-body dates, with headers 3–8 days later: a note was added. |
| T7 | Corrected | 2.0 (Poor), 6,974, 52% / 7%, claimed Oct 2014, no recent history, "hasn't replied" with 1 reply: OK. Added "37 in last 12 mo" and the profile-merged note. All quotes found. "(about B1)" changed to the reviewer's own words, "aligns with B1 high level". |
| T8 | OK | 14 lifetime/migration and 3 speech-recognition reviews confirmed. "worst speech/voice recognition ever" is part of a longer title. The "too simple / no grammar" count re-counted at 4–7 depending on inclusion: within the stated ±2. |
| T9 | OK | 1.6 (Bad; graphic 1.5), 142 (29 in last 12 mo), 26% / 54%, claimed Jun 2017, 3% within 1 week: OK. All quotes and dated examples found. |
| T10 | OK | Support 12, billing/lifetime 7, AI 3, progress loss 4: consistent. |
| T11 | Corrected | 2.3 (Poor; graphic 2.5), 33 (17 in last 12 mo), 15% / 67%, claimed Mar 2022, paid, "hasn't replied" label while 6 replies are visible: OK. All quotes found. Example dates are body dates (e.g. the 4★ review shows header 07-21, body 04-10). "Lifetime content locked" reworded to the page's "very limited" and "locked behind another paywall". |
| T12 | Corrected | The trial/auto-renewal count re-counted at 15 of 20, against "10/20": now given as 10–15/20. The "we don't fact-check reviews" statement was found. |
| T13 | Corrected | Today the page shows 1,397 reviews and 18% 1★, against 1,394 and 19%. Label "Average", graphic 3.5. Quotes found. There are two positive reading/writing mentions, not one: corrected. |
| T14 | OK | All quoted phrases and dates found ("instead of focusing on the original prompt" is on this page). Billing 7, speech 4, AI limits 5, level 4–5. |
| T15 | OK | Speakeasy Labs, 3.2, 1 review (2023-12-25), unclaimed, no invites. |
| T16 | OK | "searchfusion", Language Course Provider, 2.9, 2 reviews, Paddle.net and $164.99 (2026-06-23), lesson would not load (2026-01-08), no link to the Speak app, fact-check disclaimer present. |
| T17 | OK | 2.0 (Poor), 264 (17 in last 12 mo), 41% / 44%, claimed Mar 2022, no invites, no replies. The Martin iball quote (2026-06-20) and the 2025-10-10 mis-selling claim were found. |
| T18 | OK | 15 tutors or applicants out of 23 unique reviews. The second-hand learner reviews dated 2025-03-23 and 2025-01-30 were found. |
| T19 | Corrected | 4.4 (Excellent; graphic 4.5), 26,015, 76% / 13%, claimed Sep 2016, paid, invites, 89% within 24h: OK. Added "7,418 in last 12 mo". Quotes found. The invited label on "Fast and good" and "Awesome" was not confirmed, so §2 now also cites labelled invited examples from T3. |
| T20 | Corrected | All quoted phrases and dated examples found. The subscription/refund count re-counted at 7: range widened to 4–7. |
| T21 | Corrected | 1.4 (Bad; graphic 1.5), 662 (93 in last 12 mo), 5% / 84%, claimed Feb 2023, no replies: OK. The teacher's sets were "refused to publish", not "unpublished": corrected. |
| T22 | Corrected | Quoted titles and dates found. Only 2 reviews say outright that features used to be free; about 9 more complain about paywalls in general. The theme was relabelled. |
| T23 | Corrected | 2.8 (Average; graphic 3), 22 (2 in last 12 mo), 27% / 59%, claimed Sep 2015: OK. Quotes found. "Rapid vocabulary growth" replaced with the reviewer's own words. |
| T24 | Corrected | 12 reviews. Billing 4–5. Only 1 review blames AI explicitly: the theme count and P4 were corrected. |
| T25 | Corrected | 4.1 (Great), 133 (132 in last 12 mo), 58% / 7%, claimed Feb 2026, paid, invites, 91% within 2 weeks, no Hebrew mention: OK. Quotes and dates found. No Loora review complains about lack of memory; one praises topics that build on earlier sessions. Loora was removed from the "no memory" claims in §6 and §8. |
| T26 | OK | "weighting system that includes seven reviews at 3.5 stars", number and age of reviews, and "Businesses can invite reviews, or they can be organic…" all found. The page is undated and cites 2025 figures. |
| R1 | Corrected | Engadget, Julia Mercado, 2025-03-26. All quotes found. Speak is "Best language learning app for speaking". The article covers 8 apps, so "app count not stated" was corrected. |
| R2 | OK | LanguaTalk, Nicholas Dunham, updated 2026-02-19, 3/5. All quoted phrases found. Langua is promoted, with no explicit ownership disclosure. |
| R3 | Corrected | Updated 2026-06-23, 3/5, Spanish beginner and French intermediate: OK. The quote "decent but lenient" is not on the page. Replaced with the actual wording, "decent but can be too forgiving". |
| R4 | OK | Olly Richards. Prices checked 2026-09-19. "I haven't paid for Duolingo Max…". The "my own product" disclosure, the 1–3 minute calls, Explain My Answer free since 2026-01-01, and the non-refundable statement were all found. |
| R5 | Corrected | Nushi & Sadeghi, CALL-EJ 22(3), 2021, pp. 287–302. All quotes verified in the PDF text. "Peer-reviewed" could not be confirmed for this article type (CALL-EJ's review page covers "most other article types"), so it is now described as a journal software review. The stated limitations were reworded to match the PDF. |
| R6 | Corrected | LearnEnglish.Life, 2026-10-30, 8.8, affiliate disclosure and price contradictions: OK. "Tops out at B2" and "Premium Plus only" are not on the page. Reworded to "goes up to B2", the verbatim "too shallow", and "listed as a Premium Plus addition". |
| R7 | OK | TechCrunch, Aisha Malik, 2025-04-30. 148 courses, "primarily designed to support beginner levels", the contractor quote, and user complaints were all found. |
| R8 | OK | Fortune, Jessica Coacci, 2025-08-18. "This was on me. I did not give enough context." The article does not address content quality: confirmed. |
| C1 | OK | Univerbal Launch HN, 2024-01-30, 145 points, 136 comments. All 7 quotes found under the named users. |
| C2 | OK | 2025-09-30, 251 points, 310 comments. All 5 quotes found under the named users. The page is 220k characters, and only the first 100k were read again. |
| C3 | OK | 2025-05-26, 459 points, 325 comments. All 3 quotes found. |
| C4 | OK | 2023-03-14, 388 points, 244 comments. All 3 quotes found. |
| C5 | OK | The API lists 45425061, 44100035 and 35154870 with matching points and comment counts. |
| C6 | OK | 704 pages, latest post 19/6/25, median 0 replies. |
| C7 | OK | Opened 17/11/22. The Hebrew quote was found. 2 replies (Novakid, Speakiteasy), each with a link. |
| C8 | OK | Opened 15/2/22. 6 replies, all promoting Novakid, Wall Street English, Happy English or Speakiteasy, each with a link. |
| C9 | OK | 2018-06-02. Duolingo recommended for those who already know the grammar and not for a first encounter. |
| C10 | Corrected | Maariv, Dr. Itay Gal, 2026-06-21. All three Hebrew phrases found. Not about English or Israeli learners: OK. The page does not label the piece as opinion, so it is now described as first-person commentary. |
| C11 | OK | Geektime, Yaniv Avital, 2023-06-27. No hands-on testing. The quotes are from CEO Roi Mor. The Hebrew for "very, very expensive" is "פתרון מאוד מאוד יקר". |
| C12 | OK | Ynet, undated, tagged "תוכן שיווקי" / "תוכן פרסומי". Promotes Mikmak's "Taxi to a Million New York" with voice-recognition feedback. |

**Verdict.** No fabricated sources or invented quotes were found. Every URL resolved, and all 46 sources (26 Trustpilot, 8 reviews and news, 12 community) support the claims attributed to them, after the corrections above. 28 were confirmed as written or with a context note, and 18 needed corrections. The material problems were these:
1. One misquote (R3, "decent but lenient").
2. Two paraphrases that overstated the source: R6's "tops out at B2" and "Premium Plus only", and Quizlet's "formerly free" theme.
3. One unsupported cross-company claim: that Loora reviews, like Praktika's, show "no memory of past chats".
4. An inaccurate statement of method about dates: header and body dates are mixed.
5. Under-counted ELSA billing (15/20, not 10/20).
6. Small drifts in Praktika's figures.

No claim was removed outright. Two points are now explicitly flagged as unconfirmed: whether R5 was peer-reviewed, and whether two Preply examples were invited reviews.
