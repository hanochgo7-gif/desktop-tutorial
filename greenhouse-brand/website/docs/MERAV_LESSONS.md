# Lessons from Merav's reviews (5 to 16 Nov 2026)

These lessons come from five review emails (`docs/reviews/merav-*.txt`) and from the notes Hanoch passed on in chat. The emails hold 196 text requests (the latest per text number), 73 notes and the picture notes.

Read this before applying a review round, and again before reporting one as done.

## 1. How we missed things, and the rule for each

| What happened | Rule from now on |
|---|---|
| She removed "שתילה" on 15 Nov. We removed it from the farm stages but missed the same word as the label of sim step 7. Identical texts share one number in the editor, so one removal covers every place that text appears. | A removal or an edit reaches every place the text appears. `src/tools/review_audit.py` flags a removed text that is still a text on the site. |
| Her 15 Nov sim notes were applied in part. Some pictures still showed the old mistakes: poles leaning inward, a vertical side net, no hail-release clips, the lift worker above the cables, big net rolls. | Picture notes are a checklist. After a new picture comes in, compare it with each clause of her note, one by one, at full size, before calling it done. |
| Step 3 still had its poles leaning the wrong way after we fixed steps 4–11. Her notes named steps 4, 6, 8 and 11. | A structural rule (pole lean, footings, side net) applies to every picture where that part shows, not only the ones she named. Check the whole series against the rules in section 2. |
| The AI flipped the pole lean again and again, and wrote "NETFARM" on a shirt. | AI pictures break geometry and text. Check every shirt logo and every lean direction by eye. Use a picture that is already right (step 4) as the reference image. |
| Caption cards covered the people in the sim. Photo headers were so dark you could not tell what they showed. | Text never covers people or the subject of a picture. Shade only behind the text. |

## 2. Net house rules (her engineering notes; the illustrations must follow them)

- **Perimeter (frame) poles** lean slightly outward: the top of the pole is further out than its base. Only perimeter poles stand on concrete footings. Inner poles are vertical.
- **Anchors** are concrete buried in the ground. Only the metal eye shows above the ground. The anchor cable runs from the pole top to that eye, with no second pole in between.
- **Side (wall) net** lies on the anchor cables, from the roof edge down to the line of anchor eyes, like a sloped wall. There is no door.
- **Roof net** is laid in continuous strips the full length of the structure, along the crop rows, never in squares. During installation, part of the roof is fully covered and part only partly.
- **Hail-release clips** sit along the seams between strips. Hail rolls into the seams and drops to the ground between the tree rows. The net opens to both sides.
- **Folding** happens only along the rows: tight, rolled on the cable "like a sausage", never loose drapes.
- **Marking out** uses stakes only, no strings. One worker holds the measuring (GPS) rod and the other drives the stakes.
- **Workers**:
  - At height they wear a harness clipped to the cable or the basket.
  - The lift worker stays below the cables, not above the structure.
  - Shirts carry the real MIFTAH logo.
- **Materials**: galvanized (silver) steel and silver steel cables only. Net rolls are small and compact.

## 3. Wording

- Keep her wording exactly. Fix only clear typos, and tell her which ones we fixed: the same fixes show up as differences in every audit.
- She writes formal, complete professional Hebrew ("אנו", "מיטבי", "בישראל ובעולם כולו", "רוח, ברד ופגעי מזג האויר"). New texts should match that register.
- No project sizes or dunam figures anywhere ("it can limit us"). No minimum size.
- Every Hebrew change gets the matching English change in the same build.
- A question in a note ("מה הכוונה?") gets an answer in the editor (`REPLY` in `text_review.py`), not just a change.

## 4. Before saying a round is done

1. `python3 src/build.py && python3 src/tools/review_audit.py`.
2. Go through every "to look at" line. Each one is either fixed or explained. The explanations are usually one of these:
   - a typo we fixed,
   - a text that was later removed,
   - a request she superseded later,
   - an item held for Hanoch's decision.
3. Read every note on a picture and check the picture itself at full size, clause by clause.
4. Screenshot each changed page on desktop and phone: text over pictures, cards over people, header contrast.
5. Report with exact counts (requests, live, explained, open). She works by numbers.

## 5. Waiting on the owners (not misses)

- A factory photo or video (#47).
- Background music: a licensed track (#33).
- Client names, testimonials and project photos once there is written approval: ברעם, מצובה, חניתה, יחיעם, גשר הזיו, כברי, בית העמק, אלרום, רמת מגשימים (#359–#366).
- Three more role holders: names, roles and photos (#374).
- A real kiwi photo from ברעם.
- A real avocado photo from Portugal.
- Place names still unresolved: עמק, צבר, קמה, יצור, חוות מתיתיהו, חוות פיכמן, מו״פ צפון.
- What was done in Greece.
- #304: the sim note that says the pictures are AI. It is held because Hanoch asked for no visible "הדמיה" labels.
