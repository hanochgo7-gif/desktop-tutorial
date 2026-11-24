# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
One person: Hanoch Gotovski, owner of HG Studio (websites, online stores and systems for small businesses, AI ads, social media management). He runs the studio alone and uses HG OS for his own sales and money, on the phone between meetings and on the computer at his desk, about equally. Other accounts may exist (a friend's), but the product is built for a solo business owner, not a team.

## Product Purpose
HG OS is the studio's own CRM: every inquiry becomes a lead with the source that brought it, nothing falls through the cracks ("היום שלי" says what to do now), deals move through a sales pipeline, and money is tracked from payment request to collection, with VAT and expenses. Success: every lead gets a fast reply, every follow-up happens, and he knows which marketing pays back (CAC, ROAS, ROI from real collections, not estimates).

## Positioning
A HubSpot-class CRM reduced to what one Israeli business owner actually does: Hebrew and RTL first, Israeli VAT and invoicing rules (payment requests are not tax invoices), attribution from the owner's own website (hgpro.io) straight into leads, and honest numbers: cash collected, not just deals closed.

## Operating Context
- Leads arrive from hgpro.io (brief form, with campaign/source), WhatsApp, calls, referrals; most contact happens on WhatsApp and phone (call / WhatsApp buttons on every lead).
- Daily ritual: open "היום שלי", call back new leads, do overdue tasks, move deals.
- Monthly: enter ad spend per source, check the sources report, export for the accountant, VAT report every two months (due the 15th).
- Tax invoices are issued in external invoicing software (Green Invoice considered) and recorded in HG OS.

## Capabilities and Constraints
- Screens: My Day, leads list and lead page, deals board and deal page, tasks, sources & ads report (CAC/ROAS/ROI, lead quality), finance (overview, documents, expenses, print), settings (business details, stages, sources, website connection, backup).
- Static vanilla ES modules (no build step), served from GitHub Pages; data in Supabase (account mode) or the browser (trial mode); offline outbox; service worker.
- Strict CSP (`script-src 'self'`, no inline scripts, no third-party scripts or fonts from CDNs); self-hosted Heebo font.
- Hebrew, RTL; numbers, phones, emails and document numbers are LTR inside RTL. Amounts before VAT unless stated; documents show agorot.
- All behavior, copy and data rules are product truth: a redesign changes the look, not what the screens do or say.

## Brand Commitments
- Name: HG OS, part of HG Studio (hgpro.io).
- Look: the owner chose the category standard (a classic CRM) at Pipedrive's finish level over a themed world; HG shows in the ink rail and mark, not in a costume.
- Voice: plain, short Hebrew; no jargon (round 2 replaced "פולואפ", "משוקלל").

## Evidence on Hand
- Real usage data lives in the owner's account; sample data (tagged "דוגמה") exists for trial mode. No testimonials or metrics to show; none should be invented.
- Usability panels (docs/ux-panel-round1.md, docs/quality-round2.md) and a design audit (WCAG AA contrast, dark mode, RTL alignment) recorded what already works and what must not regress.

## Product Principles
1. The next action first: every screen answers "what do I do now?" before showing numbers.
2. Fast on the phone: one hand, big targets, WhatsApp/call one tap away.
3. Honest money: show what was collected and what is owed, before VAT, and never a number the data can't support.
4. Nothing lost: every change saved or queued, undoable, and visible.
5. Calm by default: color only means something (overdue, money, warning).

## Accessibility & Inclusion
WCAG 2.2 AA contrast in light and dark; 44px touch targets; full keyboard use and visible focus; screen-reader labels on every control; works at 150–200% zoom.
