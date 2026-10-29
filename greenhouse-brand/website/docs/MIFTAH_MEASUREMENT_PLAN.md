# Measurement plan: from a visit to a customer

29 October 2026. **Nothing is installed yet.** No analytics, no tag manager, no pixels, no cookies. That stays so until the owners choose a tool and a consent approach.

What the site does today: `site.js` already emits the events below through `track()`. They go nowhere unless `window.plausible` or `window.dataLayer` exists on the page. Installing a tool is therefore one script tag and a CSP change. No new event code is needed.

## Funnel and the event for each step

| Stage | How it is measured | Event or source |
|---|---|---|
| Impression | Google Search Console (impressions, queries, pages) | Search Console (not connected) |
| Visit | Page views per landing page and source | analytics tool |
| Service interest | Crop tab chosen; Net houses or Turnkey page viewed; 3D page viewed | `crop_select {crop}`, page views |
| CTA click | Every "Discuss your project" and crop button, by position | `cta_click {label: hero / band-home / crop-kiwi / mbar …}` |
| Route choice | Investor and crop routes | `route_click {label}` |
| Phone intent | Every tel: link, by position | `phone_click {where: header / mbar / contact / band-… / form-unconnected}` |
| Form start | First input in the form | `form_start` |
| Step 2 reached | Step 1 answered | `form_step {step: 2}` |
| Blocked | Validation stopped the user (counts fields) | `form_invalid {fields, step}` |
| Lead sent | Endpoint returned 2xx (only then) | `form_submit_success {need, size, country}` |
| Not sent | Endpoint error or no endpoint | `form_submit_error`, `form_submit_unconnected` |
| Qualified lead | Sales marks it in the CRM | CRM field (see below) |
| Intro call held, opportunity, customer | Sales stages | CRM (none exists today: ledger 4.11) |

Rules:
- A click is never counted as a lead.
- `form_submit_success` fires only after the server confirms.
- Each event fires once per action. The form's own messages (`busy`) prevent double sends.

## What each lead carries (new, 29 Oct)

Each enquiry the form sends includes, besides the fields:
- `lang` and `page`
- `fit`: `in_range`, `below_minimum` or `unknown`, computed from land size and country against the usual minimums (ledger 4.2). It is a first sort for the office, not a decision.
- `source`: the first page of the visit, the referring site's hostname, and any `utm_*` or `gclid` tag in the landing link. These are kept for that browser tab only.

The privacy page now says this.

## The choice the owners need to make

| Option | Cookies and consent | Cost | Fits |
|---|---|---|---|
| A. Cookieless analytics (Plausible, or Vercel Web Analytics while on Vercel) | No cookies, so no consent banner | Plausible is paid. Vercel Analytics has a free tier but is tied to Vercel hosting. | Page views, sources and our custom events |
| B. GA4 through GTM | Cookies: needs a consent banner (EU visitors under GDPR; Israel's Privacy Protection Law, Amendment 13) | Free | Full GA4 and Google Ads later |

**Recommendation: A**, because the site has no cookies today and the audience is B2B and small. Move to B only if paid campaigns start.

Either way, the CSP in `build.py` must allow the tool's script and connect host. The privacy page "Statistics" section must be updated before the switch (it already promises this).

## CRM fields to agree with the office (no CRM exists yet)

lead id · date · name/company · role · need · country/region · size · `fit` · source (referrer/utm) · landing page · first call done (date) · site visit (date) · quote sent (value) · won/lost + reason.

Lead quality is then known from data, not guessed. Example: the share of `in_range` leads that reach a site visit.

## Not measured, and why

- **Conversion rates, revenue forecasts:** there is no history. Nothing will be estimated until there are at least 4–6 weeks of data.
- **WhatsApp clicks:** there is no company WhatsApp to show (ledger 1.11, O10).
- **Email clicks:** no business email is published (ledger 1.12). The `email_click` event exists for later.
