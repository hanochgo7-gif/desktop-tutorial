# המאמר השבועי: נוהל קבוע

רץ כל יום ראשון ב-08:00 (שעון ישראל). כל העבודה בתיקייה `hanoch/`, על הענף `claude/determined-curie-2g8rm2`.

## חוקים שלא משנים
- הכול בעברית פשוטה, בלי ז'רגון ובלי מקפים ארוכים. גוף שני רבים ("אתם").
- לא נוגעים בעיצוב האתר. רק מוסיפים מאמר דרך המחולל.
- אין שום אזכור של אולה או של חברה אחרת. לא מזכירים מתחרים בשם.
- לא ממציאים נתונים, סטטיסטיקות או ציטוטים. טווחי מחירים בשוק מוצגים כ"טווח כללי". אסור לציין מחירים של HG Studio (חבילות, תוספות או תוכניות ליווי). כשמדברים על המחיר אצלנו כותבים שהוא נקבע בהצעה כתובה עם מחיר סגור אחרי שיחת היכרות.
- לא כותבים ייעוץ משפטי. בנושאים כמו נגישות, מפנים לבדיקה מקצועית.
- קרדיטים של Higgsfield: תמונה אחת בלבד לכל מאמר (בערך 3 קרדיטים).

## שלבים
1. `git fetch origin claude/determined-curie-2g8rm2 && git checkout claude/determined-curie-2g8rm2 && git pull`.
2. פותחים את `tools/blog-topics.md` ולוקחים את השורה הראשונה עם `[ ]`. אם הקובץ `tools/posts/*-<slug>.md` כבר קיים, עוברים לשורה הבאה.
3. כותבים את `tools/posts/<YYYY-MM-DD>-<slug>.md` (התאריך של היום) לפי המבנה של `tools/posts/2026-10-04-website-cost.md`:
   - כותרת עליונה בין `---`, שורות `key: value` בלבד: slug, title (עד 60 תווים, עם ` | HG Studio`), h1, desc (140 עד 160 תווים), keyword, kicker, date, cover, cover_alt, services (רשימה בסוגריים מרובעים), lead.
   - 1,000 עד 1,600 מילים. פותחים בתיבת `> **בקצרה:**` שעונה על השאלה ישירות.
   - 4 עד 7 פרקי `##`, לפחות טבלה אחת או רשימה ממוספרת.
   - קישורים פנימיים: 2 עד 3 עמודי שירות (`https://hgpro.io/services/<slug>.html`) ומאמר קודם אחד לפחות (`https://hgpro.io/blog/<slug>.html`), בתוך הטקסט ובאופן טבעי.
   - פרק אחרון `## שאלות נפוצות` עם 4 עד 5 שאלות `###`, תשובה של 2 עד 3 משפטים לכל אחת.
4. תמונה ראשית: `generate_image` עם המודל `gpt_image_2_5`, היחס `16:9`, האיכות `high` והרזולוציה `2k`, בסגנון קבוע:
   "Editorial still life photograph on a deep charcoal matte surface: <objects related to the topic>. Moody low-key lighting, single warm orange rim light from the side, soft shadows, shallow depth of field, rich blacks, premium design studio atmosphere. No text, no logos, no readable words."
   מורידים וממירים: `ffmpeg -i in.png -vf "scale=1200:675:force_original_aspect_ratio=increase,crop=1200:675" -c:v libwebp -quality 78 blog/img/<slug>.webp`. מסתכלים על התמונה לפני שממשיכים. אם יש בה טקסט או משהו מוזר, מייצרים שוב פעם אחת.
5. בונים: `python3 tools/blog.py && python3 tools/sitemap.py`. בודקים ש-`xmllint --noout blog/feed.xml sitemap.xml` עובר.
6. מסמנים בתור `[x]` עם התאריך בסוגריים.
7. שומרים ומעלים: `git add -A hanoch && git commit` (הודעה באנגלית: `Blog: <title>`) ואז `git push -u origin claude/determined-curie-2g8rm2`.
8. עלייה לאוויר: Vercel מחובר לגיטהאב (ענף הייצור הוא claude/determined-curie-2g8rm2, ענפים אחרים לא נבנים), ולכן הדחיפה מעלה את האתר לבד. אחרי 2 עד 4 דקות בודקים שהכתובת `https://hgpro.io/blog/<slug>.html` מחזירה 200. אם לא, ו-`vercel whoami` מחובר, מריצים מתיקיית השורש של הריפו (לא מתוך hanoch, כי בפרויקט מוגדר Root Directory = hanoch): `vercel link --yes --project hgpro && vercel deploy --prod --yes`. אם גם זה לא עובד, מודיעים לחנוך מה חסר.
9. מודיעים לחנוך בעברית, בהודעה קצרה: שם המאמר, הקישור, ונושא השבוע הבא. שולחים גם התראה לטלפון אם יש כלי התראות.
