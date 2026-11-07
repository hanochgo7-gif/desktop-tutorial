# Lucid security review

Date: 30 October 2026. Reviewer: independent application-security review (code review plus local proofs of concept).
Commit reviewed: `5102e40` ("Writing feedback follows the research E rubric protocol").

> **Note, 7 November 2026: no minimum age.** The owner removed the 16+ age limit. This review is kept as it was
> written; where it mentions the age gate, read it as history. Today `004_lucid_no_age_limit.sql` replaces
> `lucid_profiles_guard`: no floor, a birth year that is not in the future and an age of at most 120, marketing off
> under 18, and `guardian_consent_at` required while the learner is under 16. S-05 still holds: records need a
> profile, so a refused profile (now: an impossible year, or under 16 without a guardian's agreement) stores
> nothing, and the client creates no server profile for an under-16 without the agreement (`js/core/session.js`).
> The guardian's agreement is self-declared, like the birth year (S-05 (d) applies to it too). Tests:
> `tests/db/schema.test.mjs` ("no minimum age: ..."), `tests/unit/session.test.mjs`, e2e `AGE2`.

## 1. Scope

| Area | Files |
|---|---|
| Client | `index.html` (CSP), `sw.js`, `config.js`, `js/**` with emphasis on `js/core/util.js` (`html`/`raw`), every `raw()`, `innerHTML` and `insertAdjacentHTML` sink, hash and location handling (`js/core/router.js`, `js/core/api.js` `consumeRedirect`), token storage and refresh (`js/core/api.js`), `js/core/store.js`, `js/core/sync.js`, backup import (`js/views/settings.js`), rendering of AI output (`js/views/tutor.js`, `essay.js`, `scenario.js`) and content JSON |
| Database | `supabase/migrations/001_lucid_core.sql`: RLS, grants, `SECURITY DEFINER` and `search_path`, age gate and 16-17 year olds (since November 2026 there is no minimum age: `004_lucid_no_age_limit.sql` replaces the guard; see the note at the top), export, account deletion, size limits |
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
  ask, the release serves the app again (1 s since the fourth round, below, with one hand-over page at most). The page is built by the worker, never stored, and appears only while a
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
  *Corrected in the fourth round (below):* this made the shell and `release.json` best effort too, so at quota =
  usage an update installed with an empty or partial cache, took over and deleted the complete old cache (offline
  lost); and activation read the hashes only from its cache, so without `release.json` nothing was carried over.
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

**Fourth skeptic round: S-15 sign-off review of `fde78c2` (2026-11-07).** Two reviews of the third round's two new
mechanisms: a security and contract review of the hand-over at a load of the app and of the quota-tolerant install,
and a review of real-learner behaviour of the hand-over on built trees (GitHub-Pages-like server, 150 ms RTT and
1.6 Mbps shaping, CPU 4x). Each problem was reproduced first with the reviewers' own scripts (scratchpad
`skeptic4-handover-security/x/`, `skeptic4-handover/`), then run again on a build of this round (release
`b23362933538`, next release `b783a3b0177f`; outputs in scratchpad `refix4/x/` and `refix4/s4/`). The final
build (`1a7cae2732c8`, where U1-U12 and run.mjs pass) differs from it only in the hand-over page giving up after 2 s of
wall time instead of after 40 polls of 50 ms.
- **Verdict (security and contract): REJECT as it stands.** The hand-over was approved for security (a cross-site
  page can trigger it only through a visible top-level load of the app; nothing new for same-origin script; shell
  URLs only; per-response 128-bit nonce; strict `no-store` CSP; `index.html`'s CSP byte-identical; its tests fail
  when it is reverted). Rejected for the full-origin path and an activation race. Conditions: (1) never activate
  over, or delete, a complete old cache unless the new cache holds `release.json` and the full SHELL, and fail the
  install when required files do not fit; (2) activation must not delete the cache of a release still installing;
  (3) tests for quota = usage with an offline restart, and for an install racing an activation; (4) plan.json C-4
  and the 5a / architecture §7 wording corrected.
- **Verdict (learner behaviour): no blocker; shipping OK as far as the hand-over goes.** Four minor problems, all
  reproduced: a ~1 s blank (white in light mode) screen once per deploy, 1403 ms against 385 ms for a plain reload
  and 565 ms for b2b669b; a 6.4 s stall of hand-over pages that ends on the old release when another tab has a
  cache-miss request hanging; a silent, empty page for screen readers during the hand-over; and a changed saved
  lesson dropped when storage is full. Not tested by that reviewer: a hidden or background tab (every tab reported
  itself visible); not tested here either.
- **Condition 1, met.** Reproduced first: `x/quota.mjs` at F = 1.0 on a build of `fde78c2` gave the next release a
  cache of 0 entries that took over at the reload and deleted the old 150-entry cache (offline `ERR_FAILED`), and
  b2b669b -> `fde78c2` at quota = usage deleted the legacy cache at once. Fix: `release.json` and every SHELL write
  are required again (`store(..., required)` rethrows `QuotaExceededError`; the `release.json` put is no longer
  caught), so such an install fails, gives its space back (`caches.delete(CACHE)` on a quota failure) and the
  active release keeps its cache. The install also ends by opening its cache again by name and checking it with
  `holds()` (release.json matching `LISTING`, every SHELL entry). Activation deletes older caches only when
  `holds()` passes for its own cache, and otherwise keeps them (it does no network). Only best-effort files (modules
  and content beyond the shell) may still be left out on a full origin, as the third round needed (K2: at 1.5 x
  usage the update installs). On this build: `x/quota.mjs` F = 1.0 and 1.004: no update installs, the old cache
  keeps its 150 entries and 3 lessons, and offline the app starts and the lessons return 200; F = 1.5: the update
  installs, takes over, 3 of 3 lessons; b2b669b -> this build at F = 1.0: the legacy cache (83 entries, 3 lessons)
  is kept and works offline. The trade-off, stated in architecture §7: with no room even for the shell, the learner
  stays on the old release (online too) until the origin has room, where b2b669b's network-first worker would have
  fetched new code online (and lost the offline copy: the learner reviewer's `quota.mjs` at 1.1 x: b2b669b kept 1 of
  5 saved lessons and 1 of 31 screens offline; this build keeps 5 of 5 and 31 of 31 on the old release).
- **Condition 2, met.** Reproduced first: `x/race.mjs` (B waiting, C installing with one file stalled, then a
  reload): B's activation deleted C's cache; C later took over with 27 entries and no lessons. Fix: activation
  purges and deletes nothing while `registration.installing` or `registration.waiting` is set (a newer release: its
  cache is among the older ones, and its own activation removes the rest), and an install whose cache was removed
  while it ran fails its final `holds()` check, so the browser tries again. On this build, `race.mjs` reload and
  screen variants: C takes over with 150 entries and the 3 lessons; offline path, progress, writing, games and the
  saved lesson load.
- **Condition 3, met.** sw.test: "with no room for the next release's release.json or shell, its install fails"
  (room 0, 0.004, 0.02; the old release starts offline after a restart; with room the next attempt installs),
  "activation removes the older caches only when its own holds release.json and the shell", and "activation leaves
  the cache of a newer release that is installing; an install whose cache was removed while it ran fails". Each
  fails on `fde78c2`'s worker and on a mutation that removes its part of the fix (required shell writes, the space
  given back, the `holds()` guard, the newer-release guard, the end-of-install check). upgrade.mjs U10 (quota =
  usage, from this release and from b2b669b, with an offline restart) and U11 (an install racing an activation,
  then offline screens) fail on a `fde78c2` tree ("the update installed with no room for its shell", "caches
  [lucid-2026-11-03.1] became [lucid-17565f744f38]", "B's activation removed the cache of C") and pass on the
  source and the built tree.
- **Condition 4, met.** plan.json C-4 now has the third hand-over point (the active worker at a shell navigation
  while a release waits, the nonce page, the 1 s window and the fall-back) and the install/activation rules above;
  architecture §7 ("Full storage", "Updates") and the K2 bullet above are corrected.
- **Learner-lens problems, all fixed.** (a) Stall: only navigations within `HANDOVER_MS` (now 1000 ms) of the first
  ask get the hand-over page, and that page reloads after at most about 2 s, so a hand-over the browser cannot make
  costs one page: `stall.mjs` 2408 ms and 2 documents (was 6436 ms and 4), `x/loop.mjs` 2261 ms and one hand-over
  page (was 6335 ms and 3); it still ends on the old release, which takes over by itself once the stuck request
  ends (the waiting worker was asked). Test: sw.test "a hand-over that does not happen costs one page" (fails at
  5000 ms) and U12 ("4 documents" on `fde78c2`). (b) Blank screen: the page has the boot frame's ground and ink
  for each colour scheme (sw.test compares them with `index.html`, which boot-preload.test ties to `css/app.css`);
  `cost.mjs` frames are now 244,248,251 in light and 11,14,21 in dark mode. Its ~1 s is the browser's activation
  and stays (after.md says so against a plain reload and b2b669b). (c) Screen readers: the page has
  `<p role="status">מעדכנים את Lucid…</p>`; in Chromium's accessibility tree it is a status live region with that
  text. The CSP gains `style-src 'nonce-…'` for the one style; nothing else is allowed. (d) Changed saved lessons:
  activation returns the lessons it could not carry (changed in the release) and fetches them again (checked) once
  the old caches are gone, kept alive by the next fetch events rather than held in activation (which would delay
  every request): the learner reviewer's `quota.mjs` with the HTTP cache cleared, 1.5 x usage: 5 of 5 saved lessons
  (was 4 of 5, `a1-02` missing).
- **Unchanged.** Everything the second and third rounds established: bodies only, hashing on every served response,
  `release.json` never read from or written to the cache by the fetch handler, installs fail without it, 128-bit
  hashes anchored by `LISTING`; U1-U9 and every earlier sw.test pass.

**Fifth skeptic round: S-15 sign-off review of `9db2cd7` (2026-11-07).** Two reviews: a line-by-line review of the
worker's state machine (install, activation, purge, carry-over, refetch, hand-over, fetch paths), each suspicion tested
with a fake-cache unit test or in Chromium on a GitHub-Pages-like server, on the source and a built tree; and an
offline and upgrade matrix (61 cells, built trees against b2b669b as production serves it, quotas 1.0 to 2 x usage,
HTTP cache fresh or cleared, a worker restart and a fresh offline tab walking 31 screens and 5 saved lessons). Every
problem was reproduced first with the reviewers' scripts on a `9db2cd7` tree (copies in scratchpad `refix5/b5/`,
outputs `refix5/b5/out/pre-*`; matrix cell `refix5/m5/out/recover-b2-head-1.2.txt`), then run on this round's source
(release `25d5521d984f`, which differs from the final one only in comments and in not yet skipping the `force-cache`
fallback in `no-store` mode;
outputs `refix5/b5/out/srcfix-*`, `rep2-*`) and on the final build (`e64c1cd42486`, `refix5/m5/out/`).
- **Verdict (worker state machine): REJECT 9db2cd7 as is** ("each round's fix again broke a neighbouring path, this
  time the storage edges"). Approve once: (1) the install deletes on failure only a cache it created, and deletes it
  on every failure; (2) the install checks for room before its first write; (3) best-effort writes leave room for
  the next release's shell; (4) the router listens for `controllerchange` from module evaluation; (5) tests cover the
  1.02-1.1 x legacy band, the same-release reinstall (with the harness counting a replacing put in full), the
  failed-install orphan and the claim during boot.
- **Verdict (offline matrix): faster, and equal or better offline in every ample-storage cell; fix P1 before
  shipping** (b2b669b -> this release at 1.2 x usage: offline Lucid did not start and all 5 saved lessons were lost,
  because activation kept `Cache` objects for the caches it deleted, so Chromium kept their space for that worker's
  lifetime). P2 (offline within max-age on a nearly full origin) and P3 (the hand-over load) may ship as documented.
- **Condition 1, met.** Reproduced: `reinstall.mjs` (registration removed, Cache Storage kept, quota = usage x 1 and
  x 1.05): the same release's fresh install failed and deleted the complete cache with the 3 saved lessons; `orphan.mjs`:
  B, failing on a stale file, left 73 entries (1.6 MB) that kept C out. Fix: the install records whether it found a
  complete cache of its own release (`holds()`); only otherwise is the cache its own, and every failure (not only a
  quota error) then empties it through the worker's `Cache` object and deletes it, so the space returns at once. A
  same-release install over a complete cache also writes nothing: an entry already holding the release's bytes and
  the worker's headers is left in place (`inPlace`), so at quota = usage that install succeeds. On this round:
  `reinstall.mjs` x 1 and x 1.05: the cache (150 entries, 3 lessons) is kept and the worker active again; `orphan2.mjs`
  (quota = A's usage + 1.3 x shell, which fits C next to A but not next to B's leftovers): B leaves no cache and C
  installs at the first attempt (9db2cd7: B's 73 entries stay and C never installs). Tests: sw.test "a second install
  of the same release ... writes nothing and keeps the cache and saved lessons; one that fails leaves that cache
  alone", "an install that fails for any reason, after writing, gives its own cache back and its space at once";
  U15, U16.
- **Condition 2, met, by writing rather than estimating.** `navigator.storage.estimate()` cannot carry the check:
  Chromium's DevTools quota override (which every quota test uses) is enforced on writes but not reported by
  `estimate()`, and with the profile on a real nearly full disk (a 64 MB tmpfs filled to 98%) `estimate()` reported
  usage + 1 GiB free while every write failed (`refix5/b5/disk.mjs`). So the install reads the shell and
  `release.json` into memory first, then writes a probe entry of their size and deletes it; when the probe does not
  fit, the install fails before writing anything else. The probe's key is `https://lucid.invalid/room`, another
  origin's URL that no request the worker serves can match. That alone did not fix the 1.02-1.05 x band: with nothing
  written (usage unchanged), offline Lucid still did not start in 2 of 3 runs, while b2b669b's worker alone (HEAD's
  files under b2b669b's `sw.js`) started in 4 of 4. The cause was the HTTP cache, not space: the failed install had
  fetched the new `index.html` and `app.js` with `cache: 'no-cache'`, which stores them in the HTTP cache, and
  b2b669b's network-first worker, which reads that cache, then served them next to old modules still fresh there
  (`router.js` without `checkForRelease`) and stored the mix (a diagnostic run classed the old cache's entries as 25
  old and 3 new). `9db2cd7` failed at its `release.json` write at 1.0 x, before fetching the shell, which is why U10
  passed and the band began just above it. Now the one-time upgrade (an active worker and only hand-numbered caches)
  fetches with `cache: 'no-store'`, so an attempt never changes what the old worker serves; the upgrade's files
  differ from the old ones, so nothing a revalidation could reuse is lost. On this round: b2b669b -> source at 1.02,
  1.05 and 1.1 x stays on the old release and starts offline with 3 of 3 lessons and 5 of 5 screens (1.02 and 1.05 x:
  5 runs each), at 1.2 x it takes over and does the same; a built tree, whose shell is smaller, may take over at
  1.1 x, and U13 accepts either outcome but requires the offline start and the lessons, and, when the update did not
  fit, that the `app.js` the old worker serves from the HTTP cache is still the old one. Tests: sw.test "an install
  checks for room before its first write ... writes nothing", "the one-time upgrade from the hand-numbered caches
  leaves the HTTP cache as it is (no-store)"; U13 at 1.02, 1.05 and 1.1 x.
- **Condition 3, met.** Reproduced: `tight.mjs` (quota 1.9 MB before the first visit): the first install filled the
  origin, no update ever installed, and online the changed `slang.json` was refused (Expressions did not load). Now
  best-effort files are written next to a ballast entry (same key) of 1.25 x the shell, deleted afterwards: in the
  install, in the fill-in after activation, and for every miss kept later (one at a time). They therefore stop where
  the next release's shell would no longer fit. On this round: the first release stores 64 entries, N1 installs at
  the first attempt, takes over at the reload, and Expressions loads online. Test: sw.test "on a tight origin the first
  install, and later misses, leave room for the next release's shell".
- **Condition 4, met.** Reproduced: `askboot.mjs` (4 and 6 x CPU): 4 of 4 runs mixed releases and broke `#/progress`
  (`SyntaxError ... export named 'n1mark'`). Now `js/core/router.js` attaches its `controllerchange` listener when it
  is evaluated (and `watchRelease` adds the registration later), the first screen also reloads when a release took
  over during the boot, and a screen whose modules were loading when one took over reloads instead of rendering or
  showing "did not load". On this round: 8 of 8 throttled runs clean (4 reloaded into N1 at the first change of
  screen, 4 booted on N1 through the first-screen reload); `#/progress` loads in every run. Tests: router.test "a
  release taking over while the page boots ... is a release switch; the first install is not"; U17 (4, 6 and 6 x).
- **Condition 5, met.** The unit harness now counts a replacing put in full, keeps a deleted cache's bytes counted
  while a worker that opened it runs (`worker.stop()` ends that) unless its entries are deleted, models the HTTP cache
  for `force-cache`, and has `caches.has`. Seven new sw.test cases and one router.test case; each fails on `9db2cd7`'s
  worker or router, and each part of the fix is needed by one of them (mutation runs: no probe, no ballast, no
  emptying at activation, no emptying at a failed install, no fill-in, no `no-store`, no boot listener). upgrade.mjs
  U13 x 3, U14, U15, U16 and U17 all fail on a `9db2cd7` tree (U13: "the failed update changed the app.js the old
  worker serves", also on a tree with only the `no-store` part removed; U14: "offline path: broken"; U15: no cache
  left; U16: the orphan; U17: the mixed screen) and pass on the source and the built tree.
- **Matrix P1, fixed.** Chromium frees a deleted cache's space only when no `Cache` object for it is alive, but frees
  each entry deleted through one at once, before or after `caches.delete` (`refix5/b5/handle3.mjs`: 2 MB -> 0 in both
  orders). Activation now deletes the old caches and then empties them through the objects it holds, before it fetches
  the changed saved lessons again and then the offline list's files the install left out (`fillIn`, next to the
  ballast). Reviewer's `recover.mjs`, b2b669b -> build at 1.2 x: right after the upgrade visit, offline Lucid starts
  with 31 of 31 screens and 5 of 5 saved lessons (`9db2cd7`: does not start, 0 of 31, 0 of 5). Tests: sw.test
  "activation gives the old caches' space back at once ...", U14.
- **Matrix P2, fixed.** Offline, a file the release cache lacks was fetched with `cache: 'no-cache'` only, which fails
  without a connection even when the HTTP cache holds a fresh copy. Now a network error falls back to
  `cache: 'force-cache'` (not in `no-store` mode), and the bytes are hashed as before, so a copy of another release is
  never served. Test: sw.test "offline, a file the install left out is served from the HTTP cache when its bytes are
  the release's ...".
- **Matrix P3 and the worker review's minor items.** The hand-over load is unchanged (after.md re-measures it). Files
  left out at an upgrade on a nearly full origin are now fetched again once activation has made room (the fill-in);
  after.md's "26 of 31" note no longer applies to that path.
- **Unchanged.** Bodies only and the worker's headers on every response, hashing on every served response,
  `release.json` never read from or written to the cache by the fetch handler, no install without `release.json`,
  128-bit hashes anchored by `LISTING`, the hand-over page and its CSP, `index.html`'s CSP byte-identical to
  b2b669b's; U1-U12 and every earlier sw.test pass. New surface: the probe and ballast entry under
  `https://lucid.invalid/` (written and deleted by the worker, never served: the fetch handler ignores other origins
  and its cache lookups use in-scope keys), and the `force-cache` fallback, whose bytes are checked like any other.

**Sixth skeptic round: S-15 sign-off review of `26290ea` (2026-11-07).** Two reviews: a fresh-eyes review (the
worker, the router's release watch, app.js and compat.js read before any notes; each state of the worker tested with
fake-cache unit tests and in Chromium on a GitHub-Pages-like server with the quota set by
`Storage.overrideQuotaForOrigin`; scratchpad `skeptic6-fresh-eyes/`), and a replay of every earlier reproduction on
fresh built trees, with the offline and upgrade matrix and perf against b2b669b (scratchpad
`skeptic6-replay-matrix/`). Every problem was reproduced first with the reviewers' own scripts on `26290ea` (outputs
in scratchpad `refix6/pre/`, and the reviewers' own outputs), then run on this round's source and on its build
(release `d6e094419e58`; source `b64765738ba5`; scratchpad `refix6/post/` and `refix6/replay/`, a copy of the replay reviewer's folder pointed
at this round's trees).
- **Verdict (fresh eyes): APPROVE WITH CONDITIONS.** No blocker; the legacy upgrade is safe on the source and the
  built tree. Conditions before shipping: (1) the 3.0 s freeze at every change of screen while a release waits
  behind a request the network never answers (major); (2) saved lessons dropped silently at about 1.08-1.1 x of
  quota on deploys after the upgrade (`sw.js:226`). The tight-origin breakage of changed screens online, the ballast
  not covering saved lessons, and the Hebrew-only hand-over page may ship if documented in architecture §7 and here,
  with follow-ups.
- **Verdict (replay): safe to ship, and faster than b2b669b.** Every earlier blocker and major passes on `26290ea`.
  Conditions: fix T1 (a first visit on a nearly full origin, then offline within max-age: 18 of 31 screens against
  b2b669b's 26) or document it; correct the heavy-Today headline. No blocker or major.
- **Condition 1 (the freeze), met.** Reproduced: `c2c-stall.mjs` (one unsaved lesson request never answered, the
  next release waiting) on `26290ea`: six changes of screen took 3029, 3015, 3034, 3015, 3014 and 3037 ms, none
  reloaded, the release still waited. The browser cannot activate the waiting worker while the active one has a
  fetch whose response is pending, and `switchRelease()` waited its full 3 s again at every tap. Fix
  (`js/core/router.js`): a waiting worker that did not take over within the 3 s is remembered; later changes of
  screen post `lucid:activate` again without waiting; when the stuck request ends the worker takes over by itself
  (it was asked), and the page reloads at its next change of screen, as after a switch by another tab. The
  reviewer's first suggestion (never wait at a change of screen) was not taken: the reload at the asking change of
  screen is what C-4, perf-boot B6 ("tab A asks for the new release and reloads on Today") and U8 rely on, so a
  returning learner runs the new release at the first change of screen; without the wait the takeover lands about
  1 s after the new screen is drawn and the page moves one change of screen later. What remains is one wait of at
  most 3 s per waiting release and tab, in that state only (b2b669b: none; with every request hanging, b2b669b's 4 s
  network-first timeout is worse). On this round: `c2c-stall.mjs` on the source: 3028 ms at the first change of screen, then 20, 39, 28, 30 and 38 ms, with the release still waiting behind the request; on the build 3035, then 40, 40, 13, 24 and 37 ms; the reviewer's control `c2b-stall.mjs` (a hanging revalidation) is unchanged (1160 ms once, then the reload into the new release), and b2b669b in the same setup (`c2d-stall-b2b.mjs`) 22-114 ms. Tests: router.test "a waiting worker that did not take
  over within 3 s is asked again without waiting ..." and upgrade.mjs U18 (a stuck request, the next release
  waiting, five changes of screen, then the request ends: at most one waits, the release takes over and the next
  change of screen reloads into it); both fail on `26290ea` (U18: "5 changes of screen waited for the release:
  3021, 3027, 3017, 3033, 3017 ms").
- **Condition 2 (saved lessons), met.** Reproduced: the reviewer's harness `t1-lessons-quota.test.mjs` (all 75
  lessons saved): 67 of 75 kept at 1.08 x, from this release and from b2b669b's cache; Chromium `c1-lessons-quota.mjs`
  at 1.08 x: 68 of 75. A copy that did not fit even after the purge counted as carried, and the old caches were then
  deleted. Fix (`carryOver` in `sw.js`): at activation each saved lesson is moved (its old entry deleted right after
  the copy, which gives that space back at once, so each copy needs room for itself only), and a lesson that still
  does not fit is returned as missed and fetched again once the old caches are emptied. On this round: the harness
  keeps 75 of 75 at every factor from 1.0 to 2, from this release and from b2b669b; Chromium `c1-lessons-quota.mjs` keeps 75 of 75 at 1.08, 1.1 and 1.15 x (usage afterwards 5.91 MB of a 6.42 MB quota at 1.08 x; at 1.06 x the update does not install and all 75 stay), and on the build 75 of 75 at 1.08 and 1.1 x (5.07 of 5.51 MB); the legacy upgrade at 1.04-1.15 x keeps 75 of 75 as before. Tests: sw.test
  "activation moves the saved lessons on a nearly full origin ..." (offline at activation, from this release and
  from b2b669b; fails without the move) and "a saved lesson activation cannot place is fetched again once the old
  caches are emptied" (fails when such a copy counts as carried).
- **T1 (replay), fixed.** Reproduced by the reviewer on `26290ea`'s build (matrix cell at an absolute quota of
  1484581 B, HTTP cache kept: 18 of 31 screens offline against b2b669b's 26; `edge.mjs` quota 1.5 MB: 26 of 29
  against 29). Once an install had no room left it never requested the files it left out, so they never reached the
  HTTP cache. Fix (`ensure`): such an install still fetches and checks the remaining offline files, without keeping
  them, as b2b669b's precache left every file in the HTTP cache even when its writes failed; not on the one-time
  upgrade, whose requests bypass the HTTP cache (`no-store`, fifth round). On this round: the matrix cell keeps 26 of 31 screens offline, as b2b669b (every other of the 64 matrix runs gives what it gave on `26290ea`), and `edge.mjs` quota 1.5 MB 29 of 29 (PROBLEMS 0). Test: sw.test "an
  install with no room left still fetches and checks the offline files it does not keep (not on the one-time
  upgrade)" (fails without it, and when the `no-store` guard is removed).
- **Tight origin, changed screens online (fresh eyes P3), mitigated; the rest documented.** Reproduced:
  `t2-full-origin-deploy.test.mjs` (quota 1.2-1.95 x the shell: the first install keeps its 13 shell entries, the
  next release cannot install, its changed `progress.js` is refused) and `c3-tight-deploy.mjs` (1.3 and 1.8 x: "did
  not load" online). Fix: a miss now takes the HTTP cache's copy first (`force-cache`, hashed like any other copy),
  which, with T1's fetches, still holds the active release's file after the server has moved on. Test: sw.test "on
  an origin with room for one release, a screen the next release changed still loads after the deploy from the HTTP
  cache's copy of this release" (fails without either part; it also checks that the next release's copy is still
  never handed to the page). `t2` itself still fails (its harness does not put fetched files in the HTTP cache), and
  `c3` too, because it clears the browser's HTTP cache at the deploy: that is the case left, a copy the browser has
  evicted, documented in architecture §7 ("Known limits on a full origin"). Not done: passing the network copy
  through, as b2b669b did, would hand the page a module of another release, the hole the second round closed
  (perf-boot B6's last check, which now clears the HTTP cache first so that only the next release's copy exists
  anywhere, as it means to test); requiring room for the shell and the ballast before a first install would leave
  such an origin without any offline support, where b2b669b kept its shell. Follow-up: a release that has proved it
  cannot have its own file while no newer release can install could serve the next load of the app from the network
  whole (the page and every request of that page), so a reload recovers.
- **The ballast and saved lessons (fresh eyes P4), documented, not changed.** Reproduced: `t3-lessons-eat-reserve`
  (1 MB free after a full install; 30 lessons saved Settings-style leave 4.6 KB; the next install fails with
  `QuotaExceededError`). Not a regression: b2b669b's update needed room for a whole second copy. Writing those
  lessons next to the ballast would keep about 11 fewer saved lessons than b2b669b on a nearly full origin (1.25 x
  the shell is about 450 KB) and write 450 KB per newly saved lesson; the reviewer's other suggestion (a permanent
  room entry that the next install deletes) is a new cross-cache mechanism. Stated in architecture §7 and in the
  head comment of `sw.js`; follow-up.
- **Hand-over page language (fresh eyes P5), fixed.** The worker does not know the interface language (it is in the
  page's database), so the status line is in both: `<span lang="he" dir="rtl">מעדכנים את Lucid…</span><span
  lang="en" dir="ltr">Updating Lucid…</span>`, so a screen reader speaks each part in its own voice. The page keeps
  `lang="he" dir="rtl"` on `<html>`, as `index.html`'s boot frame does for every learner. Test: the sw.test hand-over
  check now requires both parts with their language and direction (fails on `26290ea`).
- **Replay minors.** A first visit whose `release.json` cannot be loaded gets no offline support until its next
  online visit (`firstdrop`, `first503`): unchanged, accepted since the second round, stated in architecture §7. The
  heavy-Today headline in after.md is now a range across windows (about 30-43 %), with heavy TBT no better than the
  base app's. The hand-over load (about 0.9 s slower than b2b669b's load after a deploy, once per deploy) is
  unchanged and re-measured in after.md.
- **Unchanged.** Bodies only and the worker's headers on every response, hashing on every served response (the
  HTTP cache's copies included), `release.json` never read from or written to the cache by the fetch handler, no
  install without `release.json`, 128-bit hashes anchored by `LISTING`, a module of another release never handed to
  a page, the hand-over page's CSP, `index.html`'s CSP byte-identical to b2b669b's; U1-U17 and every earlier sw.test
  pass.

**Production base change (2026-11-07, after the sixth round).** Production is now `d83a500` (release
`2026-11-07.1`: the same tree as `b2b669b` plus the no-age-limit change), merged into this branch as `4546346`. Its
`sw.js` is byte-identical to `b2b669b`'s apart from the `RELEASE` line, so every worker finding above that was
measured "from b2b669b" holds from `d83a500`: the worker's legacy pattern (`lucid-<date>.<n>`) takes
`lucid-2026-11-07.1` exactly as `lucid-2026-11-03.1`, and `tests/unit/sw.test.mjs` now runs the one-time-upgrade
cases over both cache names. `tests/e2e/upgrade.mjs` (U1-U19) and `lucid-verify.yml` upgrade from `d83a500`;
`index.html`'s CSP meta is byte-identical to `d83a500`'s (and `privacy.html`'s). The merge review found one gap,
a child-protection one, not a worker one: in a tab still on 2026-11-07.1 the screens' `scenarioIndex()` and
`scenario(id)` came from `compat.js` and read the generated files unfiltered, so a learner under 16 saw a flagged
scenario and could open it (no item is flagged today, so nobody was exposed). Fixed and tested (fix-log AGE-16,
upgrade U19, which fails on `4546346`). Tabs still on 2026-11-03.1 are covered as architecture §7 states.

**Seventh skeptic round: S-15 and age sign-off review of `d2d62a2` (2026-11-07, production `d83a500`).** Two
reviews of the integration of production's no-age-limit change: one of the age protections on the perf paths (source
and built trees, fresh tabs and tabs that crossed the deploy, online and offline, with flagged content injected into
throwaway `git archive` copies and the index files regenerated; scratchpad `skeptic7-age-on-perf/`), and one of the
merged worker and the upgrade from `d83a500` to `d2d62a2` on a GitHub-Pages-like server with fault injection, source
(`8612c63a8047`) and built (`d9f3f0d19b33`) (scratchpad `skeptic7-worker-upgrade/`). The problem was reproduced first
with the reviewer's own script on `d2d62a2`'s build, then run on this round's build (release `87265cced809`; source
`2aeb12fd30ca`; scratchpad `refix7/c9/`).
- **Sign-off (age): "I could not refute it: on the age lens, d2d62a2 is safe to ship in place of d83a500."** Every age
  behaviour tested matched production, on source and built, in fresh tabs and in tabs that crossed the deploy,
  offline, without the index files, across an age change and across UTC New Year; no condition. This round changes
  no age path: the files it moves are lessons, centre and pool files, none of which carries a `sensitive` flag or
  is age-filtered (only scenarios and expressions are, in code, on every read), and the fill-in stores only files
  checked against `release.json`.
- **Sign-off (worker and upgrade): "approve with conditions"**, no blocker; nothing that works on `d83a500` breaks in
  normal operation. Condition P-A (minor): fix or document that, on an origin under about 1.45 x of usage, an
  interruption right after the one-time built upgrade can lose saved lessons and leave most screens unavailable
  offline with no retry.
- **Condition P-A, met by a fix.** Reproduced with the reviewer's `c9-refill.mjs` on `d2d62a2`'s build (75 lessons
  saved on `d83a500`, quota by `Storage.overrideQuotaForOrigin`): worker stopped 1.3-1.6 s after the takeover at
  1.15 x and 1.3 x, 49 and 12 of 75 lessons left in the new cache, 2 and 18 of 21 screens offline; server down for
  20 s at 1.06 x, 0 lessons and 1 of 21 screens. Cause: none of production's saved lessons matches the built
  (minified) bytes, the install had no room to carry anything over, activation deleted the old caches with the
  lessons, and the refetch and the fill-in ran once. Fix (`sw.js`), taking the reviewer's option (a) for the
  lessons and (b) for the screens, with no new mechanism: at activation a saved lesson (or centre or pool file) the
  release changed is moved as stored, with the worker's headers, like a matching one (these are stale-while-
  revalidate data, served as stored and never hashed, so production's copy is what `d83a500` itself serves; it is
  still fetched again, and refreshed on use); and a fill-in that a lost connection or a stopped worker cut short is
  taken up again at the next load of the app (a navigation to the shell) until every offline file is stored or no
  room is left next to the ballast; a file that does not match (an edge on another deploy) does not count as left
  to do. The hash check stays everywhere else: code, pages and non-runtime content are still only ever served
  hashed. On this round's build: 75 of 75 lessons kept at the fault, 223 entries after the next load, 21 of 21
  screens offline, in all three cases. Tests: sw.test "the upgrade on a nearly full origin keeps every saved lesson
  when the network goes right after the takeover ..." (1.2 and 2 shells free; fails on `d2d62a2` with 75 lessons
  lost, and with either half of the fix removed) and "a load of the app with nothing left to fill in makes no
  request ..."; upgrade.mjs U20 (screens and lessons cut off until just after the takeover, then the worker
  stopped; fails on `d2d62a2`'s build with 0 of 3 lessons and on its source with 19 of 30 screens).
- **Cost.** A load of the app reads the cache's key list once per worker lifetime when the fill-in is not known to be
  complete; on a tight origin where files never fit, each worker lifetime may write the ballast once and fetch up to
  six files that are then not kept (as a kept miss already does). Measured: docs/perf/after.md, "Seventh skeptic
  round".

**Status.** Re-reviewed by the delivery lane, changed by the integration and seven times by the skeptic rounds as
above. The second to seventh reviewers' conditions are met in code and tests (the sixth round's tight-origin and
ballast items as documented limits with follow-ups; the seventh round's P-A by a fix); the seventh round's age
review signed off without conditions; the S-15 sign-off itself is still the lead's to give before the release ships
(plan item D2).

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
