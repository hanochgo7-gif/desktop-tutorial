# Hebrew microcopy: rules and glossary

Lucid's Hebrew interface speaks to adults aged 16 and over. These rules keep the voice consistent across screens.
They come from the round-3 panels (ux-writing-mobile and others; see `docs/qa/panels-r3/plan.json`, item BL-8).
`tests/unit/copy.test.mjs` checks the two most common slips automatically.

## Address

| Where | Form | Example |
|---|---|---|
| Instructions, buttons, prompts | Plural imperative | בחרו, כתבו, הקשיבו, נסו שוב |
| Possessives and "you" | Plural | שלכם, אליכם, בחרתם, עשיתם |
| The learner's own statements (first person) | Slash form, masculine/feminine | לא יודע/ת, אני יודע/ת להגות…, לא יכול/ה לדבר כרגע |
| Lucid speaking about itself | First person plural or impersonal | נתחיל ב-A1, הכול נשמר במכשיר |

- Never mix forms on one screen. Singular (שלך, אליך, בחרת) and slash forms in instructions (בחר/י) are out.
- Slash forms appear only where the learner says something about themselves: objectives ("אני יודע/ת…"),
  self-ratings and the "I don't know" key.
- Hebrew grammar and gender must agree with the plural: "התשובה שבחרתם", not "התשובה שבחרת".

## Glossary

| Concept | Use | Do not use |
|---|---|---|
| Word review (spaced repetition) | **חזרה** (חזרה על מילים, חזרות להיום) | — |
| Going back to the previous screen | **הקודם** | חזרה |
| Going back to a named place | The destination: **להיום**, **למסלול**, **לרשימת הטקסטים** | חזרה להיום, חזרה למסלול |
| Practising a lesson again | **לתרגל שוב**, **לעבור על השיעור שוב** | חזרה על השיעור |
| Real-life situations (the track) | **מצבים** (אנגלית לחיים · מצבים) | Other names for the same thing (תרחישים, סיטואציות) |
| Scripted practice conversations | **שיחות מובנות** | A new name per screen; existing labels move to this one as screens are edited |
| A word or skill the learner knows well | **בשליטה** | נלמד, מושלם, יודע/ת |
| A level shown by evidence | **רמה מוכחת** | רמה מאושרת, רמה שהושגה |
| The test at the end of a level | **בדיקת רמה** | מבחן סיום, בחינה |
| The site has no AI | The one sentence: **AI לא פעיל באתר הזה. כל השאר עובד.** | Any other wording, "בקרוב", "לא זמין כרגע" |

Never claim certification: a level is "הערכה של Lucid לפי מתארי CEFR", not a certificate.

## Tone

- Calm and adult. No urgency ("מהר!", "אל תפספסו"), no streaks, no confetti, no exclamation-heavy praise.
- Say what happened and what the learner can do next. A missed day deletes nothing: "יום חופש לא מוחק כלום".
- Numbers in words where they could read backwards ("3 מתוך 14").

## English inside Hebrew text

- Every English fragment inside a Hebrew string is rendered through `isolateLatin()` (js/core/i18n.js). It wraps
  each English piece in its own `<bdi dir="ltr">`, keeps IPA (/ɪz/) and a sound with its example word
  ("/æ/ (cat)") together, gives each English sentence its own isolate, keeps a Hebrew list number outside the
  English, and keeps short pieces (30 characters or fewer) on one line with the punctuation attached to them.
- Round 4 (SB-2, SB-3): an English sentence that ends the text (or its line) keeps its own full stop, so a wrapped
  line never reads ".I work in a bank". After a lone token of up to three characters a question mark is the Hebrew
  question's ("זה E או I?"). A list of letters or short words ("E ו-I, G ו-J", "בלי s, I גדולה") gets one isolate
  per item, so the commas stay Hebrew. After a Hebrew prefix only the next token is isolated ("ל-y: lie → lying"),
  arrow pairs ("make → making") and "A = אֵיי" never break, and spelled words ("M-A-Y-A") use non-breaking hyphens
  in English lines too.
- Content files need no invisible control characters. A right-to-left mark (U+200F) between two English pieces
  that belong to different parts of the Hebrew sentence keeps them apart.
- Alignment follows the role of the English, never its line count (round 4, SB-1). Titles, labels, chips, option
  labels and plan titles are one-line labels: they share the Hebrew (right) edge. Every English meta-text block
  from `bi()` (instructions, can-dos, hints, explanations, task briefs) and every English content block (examples,
  passages, phrase cards) is a left-to-right block, left-aligned at every level, so a one-line and a three-line
  instruction start at the same x. The one exception is the verdict footer, whose answer blocks sit at the Hebrew
  edge beside its keys.
- Check every new mixed line at 390px wide, in light and dark, and at 150% text.

## Hebrew support by level

At "full" support (Pre-A1, A1) the Hebrew instruction is the primary line and the English follows in the quieter
ink; explanation paragraphs show Hebrew with an "EN" chip. From A2 the English leads and Hebrew is folded behind
"בעברית" (the one label for every Hebrew chip; "Hebrew" in the English UI). English target content (examples,
options, passages, tables) is always primary.

## The check

`node --test tests/unit/copy.test.mjs` scans the Hebrew string literals in `js/` (including `tt()` calls inside
`html` templates) for שלך, אליך, בחרת and for חזרה used as a back label (a "חזרה ל…" label, or "חזרה" paired with
an English "Back"). The hits that existed when the check was added are in its `ALLOW` list, as counts per file, so
only new ones fail. When you fix a string, lower its count in `ALLOW`.
