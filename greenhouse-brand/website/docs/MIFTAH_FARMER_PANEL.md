# Farmer panel: what visitors understood, and what changed

27 October 2026. Tested on the live site, https://miftah-site.vercel.app.

## Method, stated plainly

The seven "farmers" are **simulated users**: AI agents, each given one grower's profile, device and language. They are not real people. Each one opened the live site in a real browser (Playwright, Chromium), looked at screenshots of what a person would see, and did the same tasks:

1. A 5-second test on the first screen.
2. Finding a solution for their crop.
3. Understanding how a net house is built.
4. Looking for price and timing.
5. Judging trust.
6. Contacting the company. They used fake details only; the form is not connected to any inbox.

This finds clarity and usability problems quickly. It does not replace interviews with five real clients, which is still recommended (see the end).

| Persona | Where | Device | Site language |
|---|---|---|---|
| Yossi, 58: apples and cherries, 120 dunam | Golan Heights | iPhone | Hebrew |
| Dana, 34: kiwi and avocado farm manager, an agronomist comparing 3 suppliers | Upper Galilee | Laptop 1366 | Hebrew |
| Carlos, 45: bananas, 80 ha, English as a second language | Ecuador | Android | English |
| Grace, 41: avocado exporter planning a new farm | Kenya | Android, slow 3G-like connection | English |
| Mark, 52: apples and cherries, 60 ha, already has hail net, skeptical | Tasmania, Australia | Desktop 1920 | English |
| Rajesh, 39: pomegranates and grapes, 25 ha, basic English | Nashik, India | Small Android, 360 px wide | English |
| Lucía, 47: technical director of a cherry cooperative (~300 ha), low vision, keyboard user | Jerte Valley, Spain | iPad, then keyboard only and 200% text | English |

## What they understood (5-second test)

**7 of 7** said correctly what the company does: galvanized-steel net houses for orchards and bananas, against hail, sun and wind, in Israel and abroad, for more than 20 years. All 7 read the slogan correctly.

On first move, 6 of 7 went to "Which net for your crop?". Grace went to the menu, looking for turnkey farms.

## What blocked them, and what was done

| # | Finding (how many personas) | Status |
|---|---|---|
| 1 | **The form does not send. There is no email address and no WhatsApp, only an Israeli landline.** (7/7, the only blocker) | **Needs the owners.** It cannot be fixed without an address to receive enquiries (ledger O1, O10). Everything is ready: the page needs one endpoint. |
| 2 | After sending, the Hebrew call button showed the number reversed ("9854404-04") | Fixed: the number stays left-to-right in every form message |
| 3 | Email was required and phone was optional, the opposite of what a farmer wants | Fixed: "Email or phone, at least one". A phone number is checked for digits ("abc" is rejected). |
| 4 | "A grower or farm manager" was the last role, after investors | Fixed: growers come first. "A cooperative or group of growers" was added. |
| 5 | The country list had no Latin America, Asia or Australia | Added: Latin America, Asia, Australia or New Zealand |
| 6 | Pressing "Next" with nothing chosen showed no message on screen | Fixed: the message sits under its question, and the page scrolls to it |
| 7 | After correcting a field, the Send tap missed: the error vanished on the tap and the button moved | Fixed: errors clear while typing. Found by this round's test. |
| 8 | The minimum size ("from 30 ha abroad") repeated on almost every screen and read as "small farmers, go away" | One friendly wording ("usually from…, smaller or several plots? ask anyway"). Removed from the closing band on every page except Turnkey. |
| 9 | The globe showed an internal note: "Source: the questionnaire Merav and Yiftach filled in" | Fixed: a public note ("areas as of 2015; a yellow point marks the country or region") |
| 10 | The globe showed Hebrew text on the English page while loading | Fixed: text appears only in the page's language |
| 11 | "Ctrl + scroll to zoom" on a phone | Fixed: on touch, "drag sideways to rotate" |
| 12 | The embedded globe took keyboard focus with nothing visible, and its list items had no focus ring | Fixed: the embed is skipped by Tab (the full-screen globe and the table are the keyboard path), and the full-screen globe has a visible ring |
| 13 | "חוות מפתח" in the menu reads like "Miftah's farms" and doesn't say abroad | Hebrew menu: "חוות מפתח בחו״ל" |
| 14 | "How we build" (3D) was reachable only from links and the footer | Added to the main menu |
| 15 | At 200% text or 640 px, the header scrolled sideways and "Menu" was cut off | Fixed (tested at 12 widths × 2 languages × 10 pages, 240 loads) |
| 16 | On phones, tapping a crop changed only the drawing; the answer was one scroll down | The answer now comes right under the crop buttons |
| 17 | Pomegranate, grapes and other crops: no yes or no | "Other crops" now says: "Not listed? Tell us the crop and what it needs protecting from. We'll tell you honestly…", with an "Ask about your crop" button |
| 18 | Bananas: "wind and hail **in winter**" read wrongly in the tropics | "From wind and hail, and it saves water in the hot season" |
| 19 | "10–30% net": 10–30% of what? | "10–30% shade net" |
| 20 | Areas in m² ("410,000 m²"). Farmers think in hectares or dunams; Mark found the 41 ha only on the profile. | The map and table show ha (EN) and dunam (HE). The home text adds "(41 ha)". |
| 21 | The Mexico label was cut off on the phone map (".50,000 m²") | Moved below the point |
| 22 | The subtitle "A roof of net over your crop." was hard to read on the video | Lighter colour plus a soft shadow |
| 23 | The 4 steps on a phone were cut off, with no sign there are more | "Swipe sideways for all four steps" |
| 24 | 3D page: focus on the step dots went below the screen, and the ring was faint | A focused dot goes to its step, with a stronger ring |
| 25 | The company profile (one page, PDF) was hard to find | Added to the contact page under "For your board or partners" |
| 26 | No time zone for a call from abroad | "The office is in Israel (UTC+2, UTC+3 in summer)" |
| 27 | Hard English for non-native readers | "Needs mapping" → "site visit and needs assessment"; "run execution" → "manage the building work"; "as the materials weather" → "through its working life"; "A word is a word" → "We keep our word"; "bill of quantities" explained; spelling unified to US |
| 28 | "How is the price set?" gave no factors | Lists what goes into the design and the quote: crop and net, area, soil, drainage, access and wind (ledger 2.8) |
| 29 | Turnkey: "open to projects in Africa" read as "not Latin America" | "Portugal and other European countries, Africa and other markets" (ledger 4.1) |

## What only the owners can answer

The panel asked for these again and again. They are not in the truth ledger, so the site does not invent them.

1. **An address for enquiries** (email or a form service) and, if possible, a company WhatsApp. This is the most important item: 7 of 7 would not make an international call.
2. **Response time.** For example, "we reply within 2 working days".
3. **Timeline.** How long from order to a finished net house (for example, for 100 dunam), and when to order to be ready before spring.
4. **Rough price range per dunam/ha, or a decision not to publish one.** Farmers say a price only "after a site visit" pushes them away.
5. **Technical specs** for professionals: net material and UV life, shade % per crop, pole galvanizing (µm), design wind and snow load, warranty and maintenance plan.
6. **Photos of Israeli projects** (Golan apples, cherries, Western Galilee bananas) with dunam and year. Today the cards are text only (O2).
7. **Figures after 2015.** All the numbers abroad are from 2015, which made the company look "not active today".
8. **Rain covers against cherry cracking, and bird nets.** Is this something you do?
9. **Pomegranate and grapes.** Have you done them?
10. **Turnkey:** the partner's name (O5), the financing and partnership model (O6), phase durations, and whether there is Africa or Latin America experience.
11. **Can a cooperative of several small plots count towards the 30 ha minimum?**
12. **Is a Spanish speaker available?** (Spain and Latin America)

## Recommended next step with real people

Show the site to 5 real clients (2 in Israel, 3 abroad) in a 20-minute video call: the same 6 tasks, recorded with permission. Compare with this report.

## Checks after the changes (local, before deployment)

- New checks for this round: 22/22 (form, globe, menu, map).
- Form: 23/23. Keyboard: 16/16.
- Widths: 240 loads, no issues.
- Slogan: 162/162.
- axe: no violations.
- Console: 44 loads, no errors.
- html-validate: clean.
