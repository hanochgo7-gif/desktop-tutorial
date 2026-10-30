# Measurement plan: from a visit to a customer

29 October 2026. **Nothing is installed yet.** No analytics, no tag manager, no pixels, no cookies. That stays so until the owners choose a tool and a consent approach.

What the site does today: `site.js` already emits the events below through `track()`. They go nowhere unless `window.plausible` or `window.dataLayer` exists on the page. Installing a tool is therefore one script tag and a CSP change. No new event code is needed.

## Funnel and the event for each step

| Stage | How it is measured | Event or source |
|---|---|---|
| Impression | Google Search Console (impressions, queries, pages) | Search Console (not connected) |
| Visit | Page views per landing page and source | analytics tool |
| Service interest | Crop tab chosen (counted once per change, not on page load or a repeat tap); Net houses or Turnkey page viewed; 3D page viewed; globe loaded | `crop_select {crop}`, `globe_load {trigger: click / scroll}`, page views |
| CTA click | Every "Discuss your project" and crop button, by position | `cta_click {label: hero / band-home / crop-kiwi / mbar …}` |
| Route choice | Investor and crop routes | `route_click {label}` |
| Phone intent | Every tel: link, by position | `phone_click {where: header / header-text / header-contact / contact-head / mbar / contact / band-… / footer / about / sim / form-notice / form-unconnected / form-success / form-error}` |
| Form start | First input in the form | `form_start` |
| Step 2 reached | Step 1 answered | `form_step {step: 2}` |
| Blocked | Validation stopped the user (counts fields; the step is 1 or 2, also on Send since 30 Oct) | `form_invalid {fields, step}` |
| Lead sent | Endpoint returned 2xx (only then) | `form_submit_success {need, size, country, fit, lead_id}` |
| Not sent | Endpoint error or no endpoint | `form_submit_error`; `form_submit_unconnected` (once per page view, however many taps) |
| Qualified lead | Sales marks it in the CRM | CRM field (see below) |
| Intro call held, opportunity, customer | Sales stages | CRM (none exists today: ledger 4.11) |

Rules:
- A click is never counted as a lead.
- `form_submit_success` fires only after the server confirms.
- Each event fires once per action. The form's own messages (`busy`) prevent double sends.
- `form_submit_unconnected` is counted once per page view: a visitor who taps Send three times is one visitor, not three.
- `crop_select` waits 0.8 s and fires only when the crop actually changed, so arrow-key browsing through the tabs counts as one choice.

## What each lead carries (29 Oct; lead id and "heard" added 30 Oct)

Each enquiry the form sends includes, besides the fields:
- `lang` and `page`
- `fit`: `in_range`, `below_minimum` or `unknown`, computed from land size and country against the usual minimums (ledger 4.2). It is a first sort for the office, not a decision.
- `source`: the first page of the visit, the referring site's hostname, and any `utm_*`, `gclid`, `gbraid`, `wbraid`, `msclkid` or `li_fat_id` tag in the landing link. These are kept for that browser tab only.
- `lead_id`: a random code made in the browser (for example `MVU7A153B5JF1N`). The same code is in the enquiry and in the `form_submit_success` event, so a CRM row can be matched to its visit without storing anything else.
- `heard`: the visitor's own answer to "How did you hear about us?" (optional, free text).

The privacy page now says this.

## The choice the owners need to make

| Option | Cookies and consent | Cost | Fits |
|---|---|---|---|
| A. Cookieless analytics (Plausible, or Vercel Web Analytics while on Vercel) | No cookies, so no consent banner | Plausible is paid. Vercel Analytics has a free tier but is tied to Vercel hosting. | Page views, sources and our custom events |
| B. GA4 through GTM | Cookies: needs a consent banner (EU visitors under GDPR; Israel's Privacy Protection Law, Amendment 13) | Free | Full GA4 and Google Ads later |

**Recommendation: A**, because the site has no cookies today and the audience is B2B and small. Move to B only if paid campaigns start.

Either way, the CSP in `build.py` must allow the tool's script and connect host. The privacy page "Statistics" section must be updated before the switch (it already promises this).

## CRM fields to agree with the office (no CRM exists yet)

lead id (`lead_id` from the form) · date · name/company · role · need · country/region · size · `fit` · how they heard (`heard`) · source (referrer/utm) · landing page · first call done (date) · site visit (date) · quote sent (value) · won/lost + reason.

Lead quality is then known from data, not guessed. Example: the share of `in_range` leads that reach a site visit.

## Not measured, and why

- **Conversion rates, revenue forecasts:** there is no history. Nothing will be estimated until there are at least 4–6 weeks of data.
- **WhatsApp clicks:** there is no company WhatsApp to show (ledger 1.11, O10).
- **Email clicks:** no business email is published (ledger 1.12). The `email_click` event exists for later.

## Changes on 30 October 2026 (growth audit, round 2)
| Change | Why | Tested by |
|---|---|---|
| `form_submit_unconnected` once per page view | Repeated taps were counted as separate submissions | `qa/r2.mjs`: two taps, one event |
| `crop_select` only on a real change, debounced 0.8 s, none on page load | Arrow keys through 6 tabs produced 6 events | `qa/r2.mjs`: two clicks on the same crop, one event |
| `lead_id` in the enquiry and in `form_submit_success` | Joins a CRM row to its visit | `qa/r2.mjs`: payload and event carry the same id |
| `heard` field in the form and the summary | The office asks this on the phone anyway | `qa/r2.mjs` |
| `globe_load {trigger}` | Separates a deliberate tap from loading on scroll | `qa/r2.mjs` |
| More ad-click ids in `source` (`gbraid`, `wbraid`, `msclkid`, `li_fat_id`) | Google (iOS), Microsoft and LinkedIn campaigns | code review |
| `crop_select` starts from the crop already shown; only the crop showing when the 0.8 s timer ends counts | Round 3: a tap on the default tab, or banana→cherry→banana, sent a wrong event | `qa/r3c.mjs` |
| `form_invalid` on Send carries `step` | Round 3: the plan promised it | `qa/r3c.mjs` |

Still not installed: any analytics tool. Every event above goes nowhere until the owners choose option A or B.
