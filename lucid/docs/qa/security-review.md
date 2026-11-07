# Lucid security review

Date: 30 October 2026. Reviewer: independent application-security review (code review plus local proofs of concept).
Commit reviewed: `5102e40` ("Writing feedback follows the research E rubric protocol").

## 1. Scope

| Area | Files |
|---|---|
| Client | `index.html` (CSP), `sw.js`, `config.js`, `js/**` with emphasis on `js/core/util.js` (`html`/`raw`), every `raw()`, `innerHTML` and `insertAdjacentHTML` sink, hash and location handling (`js/core/router.js`, `js/core/api.js` `consumeRedirect`), token storage and refresh (`js/core/api.js`), `js/core/store.js`, `js/core/sync.js`, backup import (`js/views/settings.js`), rendering of AI output (`js/views/tutor.js`, `essay.js`, `scenario.js`) and content JSON |
| Database | `supabase/migrations/001_lucid_core.sql`: RLS, grants, `SECURITY DEFINER` and `search_path`, age gate and 16-17 year olds, export, account deletion, size limits |
| Edge function | `supabase/functions/lucid-ai/{index,handler,schemas,prompts,rubric}.ts`: auth, CORS, consent, rate limiting, request validation, prompt injection, error messages, key handling, logging |
| Deployment | `../.github/workflows/pages.yml` (what is published), `privacy.html` (does it match the code), secrets anywhere in the repository |

Out of scope except where they affect Lucid: the other sites published from the same repository (`crm/`, `ams/`,
`markr/`, `bar-lifschitz/` and others).

## 2. Method

1. Read every in-scope file; enumerated sinks with `grep` (`raw(`, `innerHTML`, `insertAdjacentHTML`, `href=`, `eval`,
   `location`, `localStorage`, `fetch`).
2. For each candidate issue, built a concrete attack or failure scenario and, where possible, a throwaway proof of
   concept outside the repository:
   - **Client**: ran the real `api.js`, `store.js` and `sync.js` under Node with a stubbed `fetch`, `location` and
     `localStorage` (S-01).
   - **Edge function**: ran the real `handler.ts` under Deno 2.5.6 with an in-memory usage ledger and a fake Claude
     client (S-02, S-11).
   - **Database**: applied the migration on PGlite with a stub `auth` schema and Supabase's default privileges, then
     ran statements as `authenticated` (S-05, S-07, S-16, S-18).
3. Ran the existing suites: `npm test` 26/26 pass, `npm run test:db` 4/4 pass, `deno test handler_test.ts` 10/10 pass
   (Deno from a scratch install; the tests are not in CI).
4. Grepped the working tree and Lucid's git history for API keys, service-role keys, JWTs and private keys.

Severity reflects impact once the optional backend is switched on. Today `config.js` has an empty `supabaseUrl` and
`aiEnabled: false`, so the published site runs in device-only mode. S-01, S-02, S-05 to S-07, S-09, S-10 to S-13
become reachable only when Supabase and/or AI are configured. Fix them before that switch, not after.

## 3. Findings

| ID | Severity | Location | Scenario | Recommendation | Status |
|---|---|---|---|---|---|
| S-01 | High | `js/core/api.js:92-99`, `js/app.js:91-97` | **Login CSRF by fragment tokens leaks the victim's local data.** At boot, any URL with `#access_token=` is accepted as the session with no check that this device started a sign-up or reset. The first `sync.run()` then pushes every unsynced local record with the attacker's JWT. An attacker signs in to their own account, builds `…/lucid/#access_token=<A>&refresh_token=<R>&type=signup` and sends the link. The victim's essays, tutor and roleplay transcripts, attempts and events are uploaded to the attacker's account, and later pulls can plant the attacker's records (for example `settings.ai_consent: true`). The victim gets no warning: `auth.user` stays `null`, so Settings shows "Signed in as" with a blank email. Reproduced (section 4.1). | Use the PKCE flow for sign-up and recovery (`code_challenge` on `/signup` and `/recover`, then exchange `?code=` with the verifier kept on this device), so a redirect is only accepted on the device that asked for it. Fetch `/auth/v1/user` after adopting any session. Before the first push into a newly adopted account, show the account email and ask whether the data on this device should move into it. | **confirmed**. `consumeRedirect` (`api.js:92-99`) adopts any fragment token with no device-bound nonce or PKCE, and never fetches the user. `app.js:91-96` then runs `sync.run()`. `sync.js:17-26` pushes every `_dirty` record, and `store.js:84` marks every local write dirty, so a device that has never synced uploads everything. `lucid_records.user_id` defaults to `auth.uid()` (`001:48`), so the rows land in the attacker's account. The refresh token keeps uploading later edits. The CSP and escaping do not matter here because no script injection is needed. Reachable only once `config.js` has a Supabase URL. High stands. |
| S-02 | High | `supabase/functions/lucid-ai/handler.ts:75-98, 107-110` | **The AI rate limit can be bypassed in two ways.** (a) **Check-then-act race.** Usage is summed, then the model is called, and only after the call returns is usage inserted. N parallel requests all see the same total: with a 40-unit hourly limit, 150 parallel `tutor_turn` calls all succeeded. (b) **Failed calls are never metered.** `max_tokens` (Incomplete), refusals and upstream errors after the request reached Anthropic record no usage, yet are billed. The tutor prompt allows long replies "unless the learner asks for more", so asking for a very long answer can hit the 6000-token cap on every call, at no cost to the user's quota. Reproduced (section 4.2). | Reserve units before calling the model, atomically: a `SECURITY DEFINER` RPC, executable by `service_role` only, that takes `pg_advisory_xact_lock(hashtext(user_id::text))`, sums the window and inserts the usage row in one transaction. Then update token counts afterwards. Keep the reservation for refusals, truncations and post-send errors (refund only on errors raised before sending). Cap concurrent in-flight requests per user (1-2). Scale `evaluate_writing` units with `LUCID_EVAL_RUNS`. | **confirmed**. `handler.ts:75-83` reads usage, `:87` calls the model, and `:88` inserts usage only on success. There is no lock or reservation (`index.ts:32-40`). Refusal, Incomplete and upstream errors (`:92-97`) record nothing, and a failed usage insert is also swallowed (`:89`). `evaluate_writing` costs 3 units whatever `LUCID_EVAL_RUNS` is (`schemas.ts:213`, `handler.ts:118`). High stands. |
| S-03 | Medium | Hosting: `https://hanochgo7-gif.github.io` (served at `/desktop-tutorial/lucid/`); `js/core/api.js:6-23`; `sw.js` | **Lucid shares its web origin with every other site in this repository and every other Pages site of the account** (CRM, AMS, markr, bar-lifschitz and more). Any XSS on any of those pages, or any compromised third-party script, runs with Lucid's origin. Examples: GSAP from cdnjs and Lenis 1.1.14 from jsDelivr load **without SRI** on `bar-lifschitz/index.html`; `mashkanta/` allows `'unsafe-inline'` scripts. Such code can: read `localStorage['lucid-session']` (access **and refresh** token); read the `lucid` IndexedDB (all essays and chats); write poisoned entries into Lucid's Cache Storage (`lucid-v1`), which `sw.js` serves cache-first, so the backdoor persists inside Lucid. Lucid's own CSP does not protect it from sibling pages. | Serve Lucid from its own origin (a custom domain or subdomain, or a separate host). Until then, add SRI to every CDN script on sibling pages and a script-restricting CSP to all of them. Consider keeping the refresh token out of `localStorage` (memory or `sessionStorage` plus re-auth), and enable Supabase refresh-token rotation and reuse detection. | **confirmed**. There is no CNAME. `hanochgo7-gif.github.io/desktop-tutorial/crm/` is live (HTTP 200) on the same origin. `bar-lifschitz/index.html:32-34` loads GSAP and Lenis with no `integrity` attribute. `mashkanta/index.html:7` allows `'unsafe-inline'` and the whole of cdn.jsdelivr.net. localStorage, IndexedDB and Cache Storage are scoped to the origin, not the path. Lucid is not on `main` yet (`/lucid/` returns 404), so this applies from the first deploy. Medium stands. |
| S-04 | Medium | `js/views/settings.js:105` | **"Delete my account" wipes other apps' data.** After account deletion, Lucid calls `localStorage.clear()` and `sessionStorage.clear()` for the whole shared origin. That deletes the CRM's `hgos-session` (signs the user out of the CRM) and `hgos-local-data` (the CRM's local-mode records, `crm/js/core/store.js:17`), plus other sites' preferences. A learner who also uses the CRM in the same browser loses CRM data that may not exist anywhere else. | Remove only Lucid's keys: `lucid-session`, `lucid-sync-cursor:*`, `lucid-ui-lang`. Delete the `lucid` IndexedDB database and the `lucid-*` caches. Never clear origin-wide storage. | **confirmed**. `settings.js:105` clears storage for the whole origin. It also runs in device-only mode ("Delete all data from this device", with `signedIn` false), so it is reachable with no backend. The CRM keys it removes are `hgos-session` (`crm/js/core/api.js:9`), `hgos-local-data`, `hgos-outbox` (unsent CRM writes) and `hgos-settings` (`crm/js/core/store.js:15-17`). Medium stands. |
| S-05 | Medium | `supabase/migrations/001_lucid_core.sql:28-31, 93-94`; `js/views/account.js:60-67`; `js/core/api.js:92-99` | **The age gate covers only `lucid_profiles`, not learner data.** (a) RLS on `lucid_records` requires only `user_id = auth.uid()`, not a profile. A 13-year-old's profile insert is refused by the trigger, but records still sync: `afterSignIn` swallows the profile error (`console.warn`) and continues to `sync.run()`. Reproduced: two records stored for a user whose profile was refused. (b) Users who arrive through the confirmation link never get a server profile: `afterSignIn` does not run, and `auth.user` is `null`. Their data still syncs. (c) Age is `current_year - birth_year`, so anyone born in 2010 passes in 2026 while still 15 until their birthday. (d) A crafted backup file (`profile.birth_year`) bypasses the client-side gate. | Require a valid profile in the `lucid_records` policies (`exists (select 1 from public.lucid_profiles p where p.id = auth.uid())`). Abort the sync when profile creation fails, and create the profile after a redirect sign-in too. Either accept and document that year-only means "16 during this calendar year", or use `age <= 16` as the refusal threshold, or ask for month and year. | **confirmed**. Lowered to Low. The mechanics are real. The RLS policy at `001:92-93` checks only `user_id`, and `account.js:143` swallows the profile error. `app.js:91-99` never calls `afterSignIn` after a redirect. However, the client gate (`onboarding.js:111`) and the trigger both trust a self-declared birth year, so getting around them takes deliberate tampering, which only achieves what lying about the year already does. Point (c) follows the documented year-only design (`001:9`). Point (b) is also a functional bug: users who arrive by redirect have no profile, so every AI call returns `no_profile` (`handler.ts:71`). |
| S-06 | Medium | `js/core/api.js:87-90`, `js/views/settings.js:109`, `js/views/account.js:60-71`, `js/core/sync.js:19-31` | **Shared devices leak one learner's data to the next.** Sign-out keeps every record on the device ("Your data stays on this device"). When another person signs in on the same browser: they see the previous learner's essays and tutor chats; the previous learner's unsynced records are pushed into the new account; the old local profile (name, birth year) is kept, because `afterSignIn` copies the server profile only when no local one exists. Sessions never expire on the device (the refresh token stays in `localStorage`). This matters for 16-18 year olds on school computers. | On sign-in, if local data belongs to another user or to no account, ask whether to move it into this account or clear it. Tag records with the owner's user id. Offer "Sign out and remove my data from this device" (and make it the default when the data belongs to an account). | **confirmed**. Sign-out removes only the session (`api.js:87-90`), and `settings.js:109` keeps the local data. When B signs in, `sync.js:17-26` pushes A's dirty records with B's token, and A's synced records stay on screen for B. `account.js:141` makes it worse than reported: if B has no server profile, A's local name and birth year are written to B's server profile. Medium stands. |
| S-07 | Medium | `supabase/migrations/001_lucid_core.sql:47-55, 15` | **No per-user storage quota.** One user can insert unlimited `lucid_records` rows of up to 64 KB each (unlimited ids across 8 collections), and `goals` elements have no length limit. Locally, 300 rows (14 MB) went in in 1.5 s, and the client already sends batches of 400. On a free Supabase project (500 MB), a single account can fill the database, which turns the whole project read-only for every learner. | Enforce a quota in a trigger (rows per user per collection, total bytes per user), bound the `goals` text (for example `check (char_length(array_to_string(goals, '')) <= 640)`), and turn on Supabase spend and usage alerts. | **confirmed**. `001:51` limits only the size of each row. There is no quota on rows or bytes per user, and `goals` (`001:15`) limits only the number of elements, not their length. `sync.js:5` sends batches of 400. Records need no profile (S-05). Free projects go read-only above 500 MB. Medium stands. |
| S-08 | Medium | `privacy.html:40, 45, 47, 54`; `js/core/speech.js:58`; `supabase/functions/lucid-ai/prompts.ts:162`; `001_lucid_core.sql:106-115` | **The privacy text does not match the code.** (a) "Without an account, none of this leaves the device": the speaking lab and dictation use the Web Speech API, which in Chrome and Edge sends the learner's **voice** to the browser vendor's cloud. `speaking.js:147` itself says recognition "needs an internet connection". Network TTS voices are preferred (`/google/` in `pickVoice`). Neither is disclosed. (b) The AI section names only "texts you send". The tutor also sends goals, weak topics, recurring errors and recent lessons. The Anthropic retention period is not stated. (c) "Download all your data": the server export omits the account email and auth metadata, and the token counts in `lucid_ai_usage`. (d) The operator's identity and contact are "to be added before public launch", but the page is already published by the Pages workflow. (e) "Strictest privacy settings by default" for under-18s: the code gives minors exactly the same defaults as adults; the stored `minor` flag is never used. | Disclose browser speech services (or prefer on-device recognition where available, and label the microphone button). List the tutor context fields and Anthropic's retention. Include the email and account dates in `lucid_export`. Add the operator identity now, or unpublish until launch. Either implement minor-specific defaults or reword the claim (for example "the same strict defaults apply to everyone"). | **confirmed**. Confirmed except point (d). (a) `speech.js:8` and `:58` use the browser's SpeechRecognition, which is server-side in Chrome and Edge. `pickVoice` prefers network voices whose names contain `google` (`speech.js:31`), and AI roleplay replies are spoken aloud (`scenario.js:122`). (b) `prompts.ts:162` sends goals, weak topics, recurring errors and recent lessons. (c) `lucid_export` (`001:106-115`) has no email or account dates and drops token counts. (e) The `minor` flag (`onboarding.js:119-120`) is never read. (d) is wrong today: Pages deploys only `main` (`pages.yml:5-7`), which has no `lucid/`, and `/lucid/` returns 404. It is still a pre-launch blocker. Medium stands. |
| S-09 | Medium | `supabase/functions/lucid-ai/index.ts:20-21`, `handler.ts:79` | **No global AI spend cap; per-account limits multiply with free sign-ups.** Limits are per user only (200 units a day, each `evaluate_writing` up to 16k output tokens at high effort on an Opus-class model). Sign-up is free and unthrottled in code, so N scripted accounts give N times the daily budget on the project's Anthropic key. | Add a project-wide daily budget, checked in the same reservation as S-02. Set a spend limit on the Anthropic workspace. Require email confirmation and a CAPTCHA (Supabase supports Turnstile and hCaptcha) on sign-up. Alert on usage spikes. | **confirmed**. `index.ts:20-21` and `handler.ts:75-79` set limits per user only, and the code has no global budget. Sign-up throttling depends only on Supabase Auth settings (per-IP limits, email confirmation, CAPTCHA), and `setup.md` configures none of them. While S-02 is open, a single account is already unbounded. Medium stands. |
| S-10 | Low | `supabase/functions/lucid-ai/schemas.ts:23-31, 46, 83`; `prompts.ts:51, 60, 99-106` | **The client fully controls prompt content.** The scenario persona, partner role, complication and goal (up to 600 chars each), the exercise `instructions` (2000 chars) and the tutor `history`, including fabricated `assistant` turns, all come from the client. A user can therefore turn any route into a general-purpose assistant on the project's key, within the rate limits. Learner text is not escaped: `</learner_text>` inside an essay closes the delimiter and can steer the learner's own scores. Self-harm only; `postProcess` still enforces quotes and score ranges. | Send scenario and exercise **ids** and look the text up server-side (bundle the content JSON with the function). Escape or strip `<` and `>` (or the closing tags) in learner text before wrapping it. Optionally verify tutor history with a server-side signature, or keep the conversation server-side. | **confirmed**. `schemas.ts:23-31`, `:46` and `:83` take the scenario, instructions and history (including `assistant` turns) from the client. `prompts.ts:51`, `:60`, `:101` and `:161-170` insert them as they are, with no escaping of `</learner_text>`. The only guard is the system prompt telling the model to stay on topic. The impact is limited to free LLM use within the limits and steering one's own scores. Low stands. |
| S-11 | Low | `supabase/functions/lucid-ai/handler.ts:58-59` | **The 64 KB body limit is measured in UTF-16 code units, after the whole body is buffered.** A 62,506-character Hebrew body (124,506 bytes) was accepted. CJK or emoji text reaches about 3 to 4 times the intended byte size. No `Content-Length` pre-check, so oversized bodies are read fully into memory first. | Reject on `Content-Length` > 64 KiB first, then read with a byte-counting stream and compare `TextEncoder` bytes. | **confirmed**. Factor corrected. `handler.ts:58-59` compares `raw.length` (UTF-16 code units) after reading the whole body with `r.text()`, with no `Content-Length` check, but only after authentication (`:52-55`). The real factor is at most 3x: CJK takes 3 bytes per code unit, Hebrew 2, and emoji 4 bytes per 2 code units (2x). It is not 3-4x as reported. The Zod field limits still bound what reaches the model. Low stands. |
| S-12 | Low (needs confirmation) | `js/views/settings.js:23, 111`; `js/core/api.js:86` | **Password change needs no current password.** Any signed-in browser can open `#/settings?reset=1` and set a new password. Unless "Secure password change" is enabled in Supabase Auth (it is off by default), someone at a shared computer where a learner is still signed in (see S-06) can take over the account and lock the learner out. | Enable Supabase "Secure password change" (reauthentication nonce). Show the new-password form only after a fresh recovery redirect or a re-entered current password. | **confirmed**. `api.js:86` sends `PUT /auth/v1/user {password}` with only the bearer token. The `?reset=1` form (`settings.js:23`) is not a control, because the token can be read from localStorage. Supabase's `secure_password_change` defaults to false. Even when it is on, it only requires reauthentication for sessions older than 24 hours. The attack needs access to a signed-in browser. Low stands. |
| S-13 | Low (needs confirmation) | `docs/setup.md:25`; `001_lucid_core.sql:125`; `../crm/supabase/migrations/001_crm_core.sql:24` | **Reusing the CRM's Supabase project ties the two apps' accounts together.** The setup guide suggests reusing an existing project. If Lucid is deployed into the CRM's project, a person with the same email in both apps has a single `auth.users` row. "Delete my account" in Lucid then deletes that row, and `crm_members ... on delete cascade` removes their CRM workspace membership. Lucid also needs open email sign-up on that project, which opens CRM sign-up too. | Use a dedicated Supabase project for Lucid and change `setup.md` to say so. If a shared project is unavoidable, have `lucid_delete_account` delete only `lucid_*` rows and leave the identity alone. | **confirmed**. `setup.md:25` suggests "or reuse one". `crm_members.user_id` uses `on delete cascade` (`crm/supabase/migrations/001_crm_core.sql:24`), and `001_lucid_core.sql:125` deletes the `auth.users` row. The CRM threat model requires open sign-up to be off (`crm/docs/security/privacy-and-threat-model.md:423`), but Lucid's sign-up needs it on. The conflict is real whenever someone follows the guide in the CRM's project. Low stands. |
| S-14 | Low (needs confirmation) | `../.github/workflows/pages.yml:32` | **Internal documents are published.** The workflow removes `lucid/docs/research/data` but publishes the rest of `lucid/docs/` (including this report with open findings, `architecture.md`, `setup.md`, personas) and `lucid/PRODUCT.md`. If the repository is private, Pages is the only public copy of this material. | Remove `lucid/docs` and `lucid/PRODUCT.md` from the Pages artifact (or publish an allow-list of app files instead of `path: .`). | **false positive**. The premise does not hold: the GitHub API reports the repository as public (`private: false`). `PRODUCT.md`, `architecture.md` and `setup.md` are already pushed to `origin/claude/lucid-english-platform`, so Pages adds no exposure. Pages also deploys only `main`, which has no `lucid/` yet. This report is untracked. What remains is a separate point: do not commit open findings to the public repository before they are fixed. |
| S-15 | Low | `sw.js:3, 16-20` | **The service worker serves stale code first.** It is cache-first with a cache name that never changes (`lucid-v1`) and refreshes in the background, so a security fix in any JS file reaches a returning user only on the second load. It also persists a poisoned cache entry (S-03). | Version the cache per release, add `updateViaCache: 'none'`, and use network-first for `index.html`, `config.js` and `js/**`, keeping cache-first for fonts and content. | **confirmed**. The cache name in `sw.js:3` never changes, and `:17-20` serves from cache first and refreshes in the background, so a fix appears on the second load. Two corrections. First, the background `cache.put` overwrites a poisoned entry on the next load, so persistence depends on the injected code re-poisoning the cache, which it can do. Second, `updateViaCache: 'none'` changes nothing here, because the default `'imports'` already bypasses the HTTP cache for `sw.js`, which imports nothing. Low stands. |
| S-16 | Info | `supabase/migrations/001_lucid_core.sql:99-102` | **Supabase's default privileges leave `TRUNCATE`, `REFERENCES` and `TRIGGER` to `authenticated` on all three tables** (confirmed on PGlite with Supabase-like defaults). `TRUNCATE` bypasses RLS. It is not reachable through PostgREST or GraphQL today, so this is defence in depth only. | `revoke truncate, references, trigger on public.lucid_profiles, public.lucid_records, public.lucid_ai_usage from authenticated, anon;` | **confirmed**. The migration revokes privileges only from `anon` (`001:99`), and for `authenticated` revokes only insert, update and delete on usage (`:100`). Supabase's default `grant all on tables` to `authenticated` therefore leaves TRUNCATE, REFERENCES and TRIGGER in place, and TRUNCATE ignores RLS. Neither PostgREST nor pg_graphql exposes TRUNCATE. Info stands. |
| S-17 | Info | `js/core/router.js:45` | **A malformed hash stops the app from starting.** `decodeURIComponent` throws on bad percent-escapes, so a link such as `…/lucid/#/%E0%A4%A` makes boot fail ("Lucid could not start") on every reload until the user edits the URL. | Wrap the decode in `try/catch` and fall back to the raw hash or `today`. | **confirmed**. `router.js:45`: `decodeURIComponent('/%E0%A4%A')` throws a URIError (checked in Node). `router.start()` is awaited in `boot()` (`app.js:122`), so boot rejects and `app.js:127-129` shows "Lucid could not start". Info stands. |
| S-18 | Info | `js/core/store.js:97-101`, `js/core/sync.js:21-25` | **Soft deletes keep the full document on the server** (`deleted = true` rows keep `data`), and there is no way to delete a single essay or chat; only whole-account deletion removes content. Reproduced on PGlite. | Push tombstones without `data` (`data = '{}'`), and add per-item delete for writing and chats. | **confirmed**. `store.js:97-101` soft-deletes and keeps the full record, and `sync.js:22-24` pushes `data` with `deleted: true`. The only caller of `store.remove` is `learner.js:120` (for progress), so writing and chats have no per-item delete. Info stands. |

## 4. Proofs of concept (summaries)

The scripts lived in a scratch directory outside the repository and are not committed.

### 4.1 S-01: fragment-token login CSRF

Node 22, real `js/core/api.js`, `store.js` and `sync.js`, with `config.js` set to a dummy Supabase URL.
The victim has three unsynced local records; `location.hash` is set to the attacker's tokens; `boot()` is replayed:

```
consumeRedirect -> signup | signedIn: true | auth.user: null
/rest/v1/lucid_records?on_conflict=user_id,coll,id&select=coll,id,updated_at | Authorization: Bearer ATTACKER_JWT |
  [{"coll":"settings",...},{"coll":"writing","id":"essay-v1","data":{..."text":"My private essay about my family..."}}, {"coll":"chats",...}]
/rest/v1/lucid_records?select=coll,id,data,deleted,updated_at&order=updated_at.asc&limit=1000 | Authorization: Bearer ATTACKER_JWT
```

### 4.2 S-02 and S-11: edge function metering

Deno 2.5.6, real `handler.ts`, fake Claude client (200 ms latency), in-memory usage ledger, limits 40 per hour and
200 per day:

```
hourly limit 40 units, 150 parallel tutor_turn -> 150 succeeded, 150 model calls, ledger 150 units
100 sequential max_tokens calls -> 100 model calls, ledger 0 rows
50 refusals -> 50 model calls, ledger 0 rows
body 62506 chars / 124506 bytes -> status 200
```

### 4.3 S-05, S-07, S-16, S-18: database

PGlite, migration applied with Supabase-like default privileges, statements run as `authenticated`:

```
1a profile for age 13 refused: Lucid is for learners aged 16 and over
1b records stored for user with no (refused) profile: 2
2  birth_year 2010 accepted (age 15 until their birthday)
3  one user stored 300 rows, 14 MB in 1472 ms; no cap
4  lucid_ai_usage:TRUNCATE ... lucid_records:TRUNCATE ... lucid_profiles:TRUNCATE (plus REFERENCES, TRIGGER)
5  soft-deleted row data: { text: 'deleted essay text' }
```

## 5. Checked and found sound

**Client rendering and XSS**
- `html` escapes `& < > " '` for every interpolation; arrays are mapped through the same escaper.
- The four `raw()` uses are safe:
  - `icon()`: the SVG body comes from a constant map, and the size and label come from code.
  - `legend()`: the tag is a code constant.
  - `isolateLatin()`: escapes every segment before wrapping it in `<bdi>`.
  - `formatReply()`: escapes the whole tutor reply, then only adds `<strong>` around already-escaped text.
- The `insertAdjacentHTML` sinks escape (`normalizeHtml` in `exercise.js`, text context only) or strip `<>&`
  (`review.js:135`). The router's error message strips `<>&`. `openDialog` content comes only from `confirmDialog`,
  which uses `esc()`.
- No `eval`, `new Function`, `document.write` or `srcdoc`. All `href`s are fixed `#/route` strings with data only in
  quoted query values, so there is no `javascript:` URL path.
- AI output (writing evaluation, roleplay, feedback, tutor) is rendered only through `html`, never as markup.
  Content JSON is same-origin and lesson ids are `encodeURIComponent`-ed.
- The backup import accepts arbitrary records, but every field is rendered escaped. The impact is limited to S-05 (d).

**Client CSP and auth**
- CSP: `script-src 'self'` (no inline scripts, no inline handlers, no `eval`), `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `connect-src 'self' https://*.supabase.co`. Even an HTML injection could not run script.
  `style-src 'unsafe-inline'` is needed for inline `style` attributes and is acceptable.
- Clickjacking: a meta CSP cannot set `frame-ancestors` and GitHub Pages sends no `X-Frame-Options`. A cross-site
  frame gets partitioned storage in current Chrome, Firefox and Safari, so it has no session and no data to act on.
  Low impact. Revisit when moving to a host with real headers.
- Tokens are sent only to `CONFIG.supabaseUrl`. Fragment tokens are removed with `history.replaceState`, and fragments
  are never sent in `Referer`.
- `redirect_to` is fixed to the current page (and Supabase checks its allow-list). No open redirect anywhere.
  Wrong-password errors are generic, and the reset message does not reveal whether an account exists.

**Database**
- RLS is enabled on all three tables. The policies use `auth.uid()` in both `USING` and `WITH CHECK`, so a user cannot
  insert or move rows to another user id. `anon` has all table privileges revoked. `lucid_ai_usage` is select-only
  for learners and written only by the service role. `lucid_records.user_id` defaults to `auth.uid()`.
- The collection allow-list and id length are enforced. The 64 KB `data` limit measures the uncompressed size:
  70 KB of compressible text is rejected.
- `lucid_delete_account` is `SECURITY DEFINER` with `search_path = ''`, fully qualified names and an `auth.uid() is
  null` guard, and is revoked from `public` and `anon`. `lucid_export` is `SECURITY INVOKER`, so RLS applies, and is
  also revoked from `anon`. The trigger functions set `search_path = ''` and cannot be called as RPCs.
- The minors' marketing flag is forced to false server-side, whatever the client sends.

**Edge function**
- The user is authenticated with `admin.auth.getUser(token)`, a server-side check, so deleted users and revoked
  sessions fail.
- AI consent is checked on the server profile. A missing profile is refused, and the profile lookup fails closed.
- CORS is only a browser convenience (auth is by bearer token, no cookies), so reflecting allowed origins is harmless.
- Zod validates every field with bounds and enums; unknown keys are stripped, so there is no prototype-pollution path.
- Error responses are generic. Only the status and SDK error message are logged; **no learner text is logged**.
- The Anthropic key exists only as a function secret. System prompts are static and tell the model to treat learner
  text as data. `postProcess` enforces verbatim quotes and score ranges in code.

**Secrets, deployment and offline**
- No Anthropic, service-role or private keys in the working tree or Lucid's history. `config.js` is empty. The only
  keys in the repository are Supabase **publishable** keys in `crm/` and `markr/` (public by design).
- `lucid/supabase`, `lucid/tests`, `lucid/tools`, `node_modules` and `package*.json` are excluded from Pages.
- The service worker handles only same-origin GETs. Supabase and edge-function calls are cross-origin and never cached.

## 5a. Re-review of S-15 after the performance programme (2026-11-06, perf lane "delivery", items D1-D6)

**Change.** `sw.js` now serves code (pages, `config.js`, `js/`, `css/`) and also `vendor/`, `fonts/` and non-lesson
`content/` from the release cache first, which reverses the network-first part of the S-15 fix. Learners on a slow or
flaky connection otherwise waited on about 30 revalidations per load (1.3 s on a mid-range phone after 10 minutes,
16 s on lie-fi).

**Why the S-15 property still holds.** S-15's concern was that a fix reached learners late because the cache never
changed. Now the cache name is derived from the content: `tools/build-manifest.mjs` sets `RELEASE` to a hash of every
cached file plus the worker's own code, and `tests/unit/offline-manifest.test.mjs` fails while it is stale, so any
deployed fix changes `sw.js`. The browser re-checks `sw.js` on every navigation, bypassing the HTTP cache (default
`updateViaCache: 'imports'`). The new worker verifies every file it downloads against `release.json` and fails the
install on a mismatch rather than caching a stale copy. A fix therefore runs at the first screen change after the new
worker has installed, once the page side of contract C-4 (boot lane, B6) is merged, and otherwise when every Lucid tab
has been closed. Before this change it ran on the next load. A learner who keeps one tab open for days without changing
screen gets a fix later than before; B6 adds an update check when the tab becomes visible after an hour.

**S-03 interaction (shared origin).** A script on a sibling site of the same origin can still write into Lucid's
Cache Storage. With network-first code such an entry was overwritten at the next online load unless the attacker
re-poisoned it; with cache-first code it is served until the next release. The integrity checks run only when files
enter the cache (on install), not on every response, because hashing each response on every load would cost the
time this change saves. This does not change S-03's conclusion: same-origin script can already read the learner's
token and IndexedDB, and the fix remains serving Lucid from its own origin before accounts are enabled.
`{type:'lucid:activate'}` can be posted by any same-origin page; it only makes an already-installed, already-verified
release take over early.

**Other checks.** The worker still handles only same-origin GETs under `/lucid/`; Supabase and edge-function calls are
never cached; activation deletes only `lucid-` caches. The deploy-only minify step (D7) never touches the CSP meta,
and `tools/build/verify.mjs` fails the build if it changed.

**Integration follow-up (2026-11-07).** A skeptic review showed in a browser that a poisoned entry written into
the release cache by same-origin script ran on every online load until the next release (b2b669b's network-first
worker overwrote it at the next online load). The worker now checks what it serves, so the paragraph above about
checking only on install no longer holds. As it stands after the second skeptic round below:
- Every response served cache-first (pages, `config.js`, `js/`, `css/`, `vendor/`, `fonts/`, and `content/`
  except the runtime files below) is hashed and compared with `release.json` as it is served (`servable` in
  `sw.js`), and is built from the bytes just hashed, so bytes rewritten after an earlier check are never served.
  (The first follow-up hashed each entry once per worker lifetime, which left a window: see below.) An entry that
  does not match is deleted, fetched again and checked, and never served (offline it is not served at all).
- Only bodies are trusted on those paths. Every response the release cache stores or serves cache-first, and every
  file an install writes or copies, is built by the worker (`entry`): status 200 and one header, the content type of
  the file's extension. A stored status or header (a `Refresh`, a `Content-Type`) never reaches a page from them, and
  an install that copies an unchanged file from an older cache copies its bytes only.
- Not covered (corrected in the third skeptic round, K3 below): the stale-while-revalidate files, which share the
  release cache, are served as stored, bytes and headers, unhashed, exactly as at b2b669b: lessons, centre and pool
  files (`content/lessons/`, `content/centers/`, `content/pool/`), `assets/`, `manifest.webmanifest`, and
  `privacy.html` when fetched by script rather than navigated to. Same-origin script can change what those return.
  They are data, never code: lesson and content text is drawn through the escaping `html` template (`util.js`), a
  forged header on a `fetch()` response does nothing in the page, and the navigated `privacy.html` and every module
  go through the checked path.
- `release.json` in the cache can no longer vouch for a forged entry: its hash list must match `LISTING`, a SHA-256
  that only `sw.js` carries (written by `tools/build-manifest.mjs`), and the browser fetches `sw.js` from the server.
  A changed or removed copy is fetched again from the server; with none to be had, nothing is served from the cache
  (and nothing deleted) until one can be. Requests for `release.json` (a navigation included) are not handled by
  the worker: they go to the network and never read, write or delete the cached copy. An entry with no hash is never
  deleted by a request.
- A file missed at install and fetched later is kept only if it matches its hash; one that still does not match
  past every cache (an edge on another deploy) is never handed to the page as a module, stylesheet or content file
  (the request fails, contract C-4); a navigation still gets the page as the network gave it.
- A `release.json` that cannot be loaded (an error status, no connection, or no answer within 20 s) fails every
  install, a first one included (the browser tries again at the next visit), so nothing is installed that the worker
  could not check, and an active release or the hand-numbered caches keep their files and saved lessons.
- Per-file hashes are 128-bit SHA-256 prefixes (32 hex digits), so a second preimage is out of reach; `LISTING` is
  a full SHA-256. Same-origin script can still read the learner's token and IndexedDB (S-03), which no worker check
  changes.
Covered by `tests/unit/sw.test.mjs` (the integrity tests at its end) and, in a browser, `tests/e2e/upgrade.mjs`
U5-U7 and `tests/e2e/perf-boot.mjs` (the last B6 check).

**Second skeptic round: S-15 sign-off review (2026-11-07).** The reviewer read `sw.js` line by line and attacked
it in Chromium on b2b669b, the source of `fe6b9af` and its built tree (release `709b1a90e06c`).
- **Verdict: reject 5a as written; approve with conditions** once (1) served and copied entries are rebuilt with
  headers the worker chooses, or their headers are validated, with tests for the shell `Refresh` case and the
  carry-over case; and (2) navigations never delete unhashed entries and `release.json` is excluded, with an
  offline test. Recommended, not as ship blockers: full-length per-file hashes, and honest wording about the
  once-per-lifetime window. CSP, source maps, pages.yml (fallback, other sites, pinning) and lucid-verify.yml passed.
- **Condition 1, met.** Reproduced first: a page outside the scope stored the shell's genuine bytes with
  `refresh: 0; url=/other/phish.html`; after a worker restart every online open of `/lucid/` landed on the phishing
  page, and the next release (index.html unchanged) carried the header into its cache. Fix: `entry()` and the
  bullets above (headers are never stored or served from the cache). Tests: sw.test "stored headers never reach a
  page or a later release" (fails when `servable` or `fromOld` keeps the stored headers: checked by mutation);
  upgrade.mjs U5 in Chromium (forged shell, worker restart, two loads, the next release installed and activated,
  worker restart again: Lucid every time; on `fe6b9af` it fails, landing on the forged target). The reviewer's
  script run again on the new built tree: Lucid at every step.
- **Condition 2, met.** Reproduced first (max-age 0): one navigation to `/lucid/release.json` deleted the cached
  copy, and after a worker restart offline the load failed (`net::ERR_FAILED`). Fix: the worker leaves every
  request for `release.json` to the network, and never deletes an entry that has no hash. Tests: sw.test "a request
  for release.json, a navigation included, goes to the network and leaves the cached copy" (fails when the worker
  handles release.json again or deletes unhashed entries: checked by mutation); upgrade.mjs U6 (navigation to
  release.json, HTTP cache cleared, worker restarted, server unreachable: Lucid starts; on `fe6b9af` the cached copy
  is gone). The reviewer's script run again: the copy stays and the offline load draws the welcome screen.
- **Hash length (recommended), done as 128 bits.** `HASH_LEN` is 32 in `sw.js` and `tools/build-manifest.mjs`.
  A 128-bit prefix puts a second preimage at 2^128 work (2^120 against any of the 234 files): out of reach. The
  full 64 digits would add about 4 KB gz more to every release update for no practical gain. release.json grows from
  3.5 to 6.1 KB gz. offline-manifest.test checks every hash is 32 digits and that sw.js checks 32.
- **The once-per-lifetime window (recommended), closed instead of documented.** Reproduced first: `js/app.js`
  rewritten after the live worker had checked it ran on two reloads, until the worker stopped. Now every response
  is hashed as it is served (sw.test "every response from the release cache is hashed as it is served"); the
  reviewer's script run again: clean on every reload. Cost: see docs/perf/after.md, "Second skeptic round".
- From the other two round-2 reviews, also in the worker: no install goes ahead without `release.json` (a first
  visit whose `release.json` dropped installed a worker that then served nothing offline; now the install fails and
  is tried at the next visit; upgrade.mjs U7), and a stale edge can no longer feed a module of another release into a
  page (perf-boot B6, last check).

**Third skeptic round: S-15 sign-off review of `40b402b` (2026-11-07).** The reviewer read `sw.js` line by line
before any notes, then re-ran the second round's proofs and new attacks in Chromium on a fresh build of `40b402b`
(release `61cdec2e3120`) against b2b669b.
- **Verdict: approve with conditions** for the integrity part of S-15: no remaining way was found for same-origin
  script or a stale or mixed CDN edge to get code bytes or headers served inside Lucid that a fresh network load
  would not serve (forged headers, `release.json` deletion, the once-per-lifetime window, installs without
  `release.json` and mixed-release modules all closed; 128-bit hashes anchored by `LISTING`; CSP unchanged). But
  S-15 is about fixes reaching learners, and there `40b402b` was measurably worse than b2b669b in two cases.
  Conditions: (1) a recovery path that does not need a change of screen, with an e2e test of a boot crash followed
  by a fix and a reload; (2) quota failures handled as best effort, or a network fallback once a newer release
  exists, with an e2e test with a quota override; (3) the wording in `sw.js` and here corrected (K3).
- **Condition 1 (K1), met.** Reproduced first with the reviewer's `r2/brick.mjs` (release G, then B whose `boot()`
  throws, then the fix F; Cache-Control max-age 0): B took over at a change of screen and showed "Lucid could not
  start. Please reload the page."; after F was deployed, five reloads all showed the same message with F waiting;
  only closing the tab ran F. The waiting worker took over only on `lucid:activate`, which only the router sends at
  a change of screen, and a page that cannot start never makes one (a module that fails to evaluate never even
  reaches `boot().catch`). Fix, in the worker (so it works whatever broke in the page): a navigation to the app
  while a release waits is a hand-over point too. The active worker posts `lucid:activate` to the waiting worker
  and answers that navigation with a page of its own (no content, one inline script allowed by its own CSP nonce,
  `no-store`) that reloads as soon as the waiting worker is no longer waiting; the reload is then served by the new
  release. It cannot simply wait or redirect: the browser activates the waiting worker only when the active one has
  no request in hand, so waiting inside the navigation deadlocks and a redirect comes straight back to the old
  worker (both tried in Chromium: an 8 s stall, and `ERR_TOO_MANY_REDIRECTS`; a meta refresh is a same-document
  fragment navigation on `#/...` URLs and never reloads). If the waiting worker has not taken over 5 s after the first
  ask, the release serves the app again. The page is built by the worker, never stored, and appears only while a
  release waits; it is not a path for other script (it carries no stored bytes and no stored header). Other open
  tabs follow at their next change of screen, as when one tab switches at a change of screen (C-4 unchanged there).
  Tests: sw.test "a load of the app while a release waits hands over to it" and upgrade.mjs U8 (both variants: boot
  throws, and a module fails to evaluate; same tab, the fix runs at the second reload, the first one being what lets
  the browser find it; no history entry added). Both fail on `40b402b` (U8: "after 3 reloads the page still shows
  could not start" and "... stuck") and pass now. The reviewer's script on the new build: see after.md, "Third
  skeptic round".
- **Condition 2 (K2), met (best effort).** Reproduced first with `r2/quota.mjs` (quota 1.5 x the usage after the
  first install): every update install failed with `QuotaExceededError`, no worker ever waited, and `today.js` was
  the old file on every load, also after closing all tabs. Cause: an update writes a second full copy of the
  release, and the shell write (`ensure` required), the per-item writes in `unpack()` and the carry-over in
  `carryOver()` let a quota error fail the install. Fix: a write that does not fit never fails an install (`isFull`,
  `store()` in `sw.js`). Once one write does not fit, the install stops fetching best-effort files, the shell
  included in what may be left out. What did not fit is fetched and checked on use (`verifiedMiss`, unchanged: kept
  only if it matches, never handed to the page if it does not), and activation, which removes the old release's
  cache, makes room again. Saved lessons that did not fit at install are carried over at activation; if storage is
  still full then, the old caches' own files (no longer served by anyone) are dropped first to make room for them.
  The integrity rules are unchanged: nothing unchecked is stored or served, and `release.json` must still come from
  the server (only its write is best effort; without it the worker fetches it again when it next starts, as before).
  The partial cache the reviewer saw kept and reused came from failed installs; a quota error no longer fails one,
  and a cache left by an install that failed for another reason (no connection, an edge on another deploy) is what
  the retry copies from, and is removed at the next activation, as before. Tests: sw.test "a full origin never fails
  an install" (two quota levels, the second leaving no room for the shell; saved lessons kept; fails on `40b402b`, and
  also without the activation-time purge) and upgrade.mjs U9 (Chromium, `Storage.overrideQuotaForOrigin` at 1.5 x
  usage: the next release installs, takes over at a reload, keeps three saved lessons, removes the old cache, and
  screens load; on `40b402b`: "the next release did not install").
  A network fallback for a release that cannot install at all was not added: with quota errors best effort, the
  only installs that still fail are those whose files cannot be had or checked (no connection, `release.json`
  missing, an edge on another deploy), which the browser retries at every navigation; serving unverified network
  code instead would reopen the mixed-release and integrity holes the second round closed.
- **Condition 3 (K3), met (wording).** Reproduced first with `r2/swr-poison.mjs`: a forged
  `content/lessons/a1-01.json` (with an `x-forged` header) written into the release cache by a page outside the
  scope was served to Lucid, online and offline, exactly as at b2b669b. The second bullet of the list above and the
  head comment of `sw.js` now say which paths are hashed as served and which are stale-while-revalidate and served
  as stored. Hashing those as well was considered and left out of this round: it would make a lesson saved during
  the window between a deploy and the worker's update (the network then serves the next release's bytes) unstorable,
  where b2b669b stored it, and the content is escaped data.

**Status.** Re-reviewed by the delivery lane, changed by the integration and three times by the skeptic rounds as
above. The second and third reviewers' conditions are met in code and tests; the S-15 sign-off itself is still the
lead's to give before the release ships (plan item D2).

## 6. Limits of this review

- **No live Supabase project.** Not verified:
  - GoTrue behaviour: implicit versus PKCE redirects, refresh-token rotation and reuse detection, the "Secure password
    change" default, sign-up confirmation and CAPTCHA settings, the global scope of `/logout`.
  - PostgREST and GraphQL exposure and request-size limits.
  - Whether the `postgres` role may delete from `auth.users` (needed by `lucid_delete_account`).
  - Edge-runtime body and wall-clock limits.
  
  The database was exercised on PGlite with a stub `auth` schema and simulated default privileges.
- **No penetration test of a deployed instance.** GitHub Pages response headers, browser storage partitioning and CSP
  enforcement were reasoned from specifications, not observed on the live site.
- **The Anthropic API was mocked.** Real `max_tokens` and refusal rates and actual cost per request were not
  measured. The ease of forcing a truncated reply (S-02 b) is inferred from the prompt and the token caps.
- Sibling sites on the shared origin were reviewed only as far as they affect Lucid (S-03, S-04, S-13). They were not
  audited for XSS themselves.
- The privacy-text comparison (S-08) is a technical consistency check, not legal advice on the Israeli Privacy
  Protection Law or the GDPR.
