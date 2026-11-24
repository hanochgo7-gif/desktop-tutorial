# Launch audit: content lane

This is the record of the content lane of the launch audit (November 2026). The audit was carried out by AI
reviewers, and AI skeptics checked each finding. It is **not** the qualified-teacher content audit LB-12 in
`docs/09-roadmap.md`. LB-12 is still open, and nothing below replaces it.

## What changed

| Finding | Item | Change |
| --- | --- | --- |
| EK-02 | `pa1-05` e9 | "Write the short form" was a typed rewrite. The grader treats `I'm` and `I am` as the same answer, so copying the source "I am Dana." was marked correct. The item is now a choice between `Im`, `I'm` and `I'am`, with a note on each wrong option. A unit test checks every rewrite in every lesson: none passes when its English source is left unchanged. |
| EK-03 | `a2-11` e8 | "Can you give me any advice?" (the lesson teaches *any* in questions) and the *Could you ...* forms are accepted. |
| EK-05 | the last lesson of each level | Each level has one final writing task: the writing-lab task on the path (`#/writing/final-<level>`). The lesson write items that called themselves "Final assessment" (`b2-10` e14, `c1-08` e16, `c2-05` e15), "Final task" (`a1-15`, `a2-15`, `b1-12`) or "Checkpoint" (`pa1-10` e15) are now "Practice essay", "Practice paper" or "Writing practice". The B2, C1 and C2 items name the level's writing task. `c2-05` now asks for an author-year style such as APA, as the C2 final requires, instead of "APA or MLA" (MLA in-text citations are author-page). The level check (`js/views/checkpoint.js`) says the writing task is on the path after the check, and links to it, instead of "in its last lesson". The `cover` notes in `curriculum.json` no longer say "final assessment". |
| EK-06 | `c1-03` e11 | "to a certain extent" and "to some degree", in each position, are accepted. The lesson-flow e2e (`run.mjs` PL6) that used "To a certain extent ..." as an unlisted equivalent now uses "Up to a point, ...", which still exercises the self-judge path. |
| EK-07 | `a2-11` e7, e12; `a2-04` e12; `a2-13` e10 | Full sets of valid combinations: both questions with every answer form, "How much have you got?", "some pizza", and Can/Could × turn off/switch off/turn out × light/lights in both word orders. |
| EK-08 | grader (`js/core/grading.js`) | Israeli place names written with a hyphen or another transliteration are the same place (Tel-Aviv = Tel Aviv; Be'er Sheva = Beersheba; also Ramat Gan, Bat Yam, Kfar Saba, Petah Tikva). The digits 2-20 are read as number words in the rewrites a learner writes or corrects (transform, correct), up to B1. This is opt-in (`checkTyped(..., { numbers: true })`), and only the exercise player turns it on, through `digitsAllowed(level)`. Gaps, single words, word games, review cards and dictation still require the word, because there spelling the number can be the point (the phonics dictation in `pa1-02`, the number gaps in `pa1-04`). "1" is never read as "one", because *one* is also a pronoun ("my old one"). From B2 the rewrites are formal writing, where small numbers are spelled out. A content-wide unit test checks, with the player's options, that no authored wrong answer is accepted. |
| EK-09 | `b1-02` e10 | The prompt now asks the learner to keep *last year*. "I have seen this film." has its own note: it is good English but drops *last year*. Its second-try rule names the time expression without giving the answer. |
| TS-03 | `rl-social-language-exchange`, `rl-social-hostel-travellers`, `rl-restaurant-beach-bar`, expression `ex-hit-me-up` | Nothing in the social scenarios or expressions coaches a learner to give a phone number or a social account to someone they have just met. The language exchange now ends with a plan to practise again at the next exchange evening ("Shall we pair up here next week?"). Its culture note on swapping numbers is replaced by a safety note like the hostel's: meet at the same event or another public place, share contact details only if you're comfortable, never share your address, and if you're under 18, check with a parent first. The hostel plan is made for breakfast in the common room, and the roleplay brief no longer asks to swap contacts. The beach-bar feedback no longer suggests asking for an Instagram account. The `hit me up` example is now two classmates who use their class group chat. No scenario is adult-only (the beach bar is a family holiday with a lemonade), so no `sensitive` flag was added. The AI roleplay briefs cannot run at launch (`aiEnabled` is false), but they were changed as well. Edits were made in `content/real-life/parts/` and merged with `node tools/merge-parts.mjs`. |
| TS-09 (content) | `rl-social-hostel-travellers` culture note | "היכרויות בדרך" (in everyday Hebrew, *היכרויות* reads as dating) is now "להכיר אנשים בדרך". The same word in `js/views/welcome.js` and `js/views/reallife.js`, and the scenario count on the welcome screen, are UI copy outside this lane. |

Tests: `tests/unit/launch-content.test.mjs` (fails on the previous content) and `tests/e2e/launch-content.mjs`
(the real player and screens; port `LC_PORT`).

## EK-10: final-task lengths are a teacher's decision

The audit noted that the word ranges of the level finals are well above the lengths of common CEFR exam writing
tasks. Lucid aims at academic writing on purpose (`PRODUCT.md`), so this is a judgement for the LB-12 teacher, not
a proven error. **No length was changed.** The current values:

| Level | Final task (writing lab, `curriculum.json`) | Accepted range | Lesson practice item | Its range |
| --- | --- | --- | --- | --- |
| Pre-A1 | 5-6 simple sentences | 25-70 | `pa1-10` e15 | 25-70 |
| A1 | 60-80 words | 60-100 | `a1-15` e16 | 60-80 |
| A2 | 100-130 words, three paragraphs | 100-160 | `a2-15` e16 | 100-130 |
| B1 | about 300 words | 250-380 | `b1-12` e15 | 250-350 |
| B2 | about 500 words | 450-600 | `b2-10` e14 | 450-600 |
| C1 | 800-1,000 words | 750-1,100 | `c1-08` e16 | 750-1,100 |
| C2 | 1,500-2,000 words | 1,400-2,200 | `c2-05` e15 | 1,400-2,200 |

The comparison the audit gave (to be checked by the teacher, not verified here): Cambridge English exam writing
tasks ask for roughly 100 words at B1 Preliminary, 140-190 at B2 First, 220-260 at C1 Advanced and 240-320 at C2
Proficiency. The audit suggests, for B1 in particular, considering 150-250 words with two reasons. Whatever the
teacher decides, the final task and the lesson practice item at each level should be changed together.

## Left for LB-12

- `docs/09-roadmap.md` (LB-12, P2-21) still gives "to a certain extent" in `c1-03` as an example of an unfixed
  key. It is now accepted; the roadmap row is left to the docs owner.
- The answer keys were extended only where a finding named an item. Other items may still reject valid answers;
  the `self-judged` events (P2-21) and the LB-12 sample are the way to find them.
