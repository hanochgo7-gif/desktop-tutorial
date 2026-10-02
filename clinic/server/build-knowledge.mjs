// בונה את מאגר הידע של העוזרת מכל האתר: services.js, products.js, עמודי הטיפול והשאלות הנפוצות.
// פלט: js/knowledge.js (לעוזרת המקומית) ו-server/knowledge.txt (לשרת, אם יופעל). מריצים: node server/build-knowledge.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url)), root = join(here, "..");
const win = {};
new Function("window", readFileSync(join(root, "js/services.js"), "utf8"))(win);
new Function("window", readFileSync(join(root, "js/products.js"), "utf8"))(win);
const strip = (h) => h.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const price = (r) => (r.price === 0 ? "ללא עלות" : r.price ? "₪ " + r.price : "לפי אבחון");
const P = [];
const add = (p) => P.push(p);

// עובדות
const FACTS = [
  ["שעות פעילות", "הקליניקה פתוחה ראשון עד חמישי 9:00 עד 19:00. שישי ושבת סגור. תורים נקבעים מראש.", ["שעות", "פתוח", "שבת", "שישי", "מתי"], "book"],
  ["כתובת והגעה", "הקליניקה ברחוב המייסדים 67, מושב בניה. חניה חופשית ברחוב ליד הקליניקה.", ["כתובת", "איפה", "מיקום", "חניה", "ניווט", "להגיע", "בניה"], "map"],
  ["טלפון ווואטסאפ", "הטלפון של רותם: 054-577-9379. הכי מהיר לכתוב בוואטסאפ, היא עונה בשעות הפעילות ובדרך כלל תוך שעה.", ["טלפון", "וואטסאפ", "ווטסאפ", "להתקשר", "מספר", "ליצור קשר"], "wa"],
  ["הביקור הראשון", "האבחון בביקור הראשון ללא עלות: כחצי שעה, בלי התחייבות. רותם בודקת את העור בתאורה ובהגדלה, שואלת מה ניסית עד היום ואילו תרופות את לוקחת, ובונה תוכנית עם מספר מפגשים ומחיר ידועים מראש.", ["אבחון", "ביקור ראשון", "פעם ראשונה", "התחייבות", "חינם", "ללא עלות"], "book"],
  ["תשלום", "אפשר לשלם במזומן, באשראי ובביט.", ["תשלום", "לשלם", "ביט", "אשראי", "מזומן"], "book"],
  ["ביטול או שינוי תור", "ביטול או שינוי תור בהודעת וואטסאפ עד 24 שעות לפני המועד. רותם מוצאת מועד חדש.", ["לבטל", "ביטול", "לשנות", "לדחות", "איחור"], "wa"],
  ["מי זו רותם", "רותם גוטובסקי, קוסמטיקאית פרא-רפואית מוסמכת (P.M.E), בוגרת בתי הספר למדעי הקוסמטיקה של חוה זינגבוים. ההכשרה כוללת ביולוגיה, אנטומיה, פיזיולוגיה וכימיה, ומאפשרת לעבוד בשילוב עם צוות רפואי. התמחות באקנה, צלקות, פיגמנטציה והאטת הזדקנות העור, והכשרה בטכנולוגיות RF, פוטותרפיה ומיקרונידלינג.", ["רותם", "מי את", "הסמכה", "תעודות", "ניסיון", "פרא רפואית"], "book"],
  ["החנות ומשלוחים", "בחנות מוצרי הבית של חוה זינגבוים, KLAPP, Arkana, SQT ו-Dr. Spicule, אותם מוצרים שרותם עובדת איתם בטיפולים. מזמינים בוואטסאפ, איסוף מהקליניקה ללא עלות או משלוח עד הבית. מחיר שלא כתוב נמסר בוואטסאפ.", ["חנות", "משלוח", "איסוף", "להזמין", "הזמנה", "מותג", "מותגים"], "shop"],
  ["היריון והנקה", "בהיריון והנקה חלק מהחומרים והטכנולוגיות לא מתאימים. כדאי לכתוב לרותם בוואטסאפ מה המצב, והיא תתאים פרוטוקול עדין או תמליץ לדחות.", ["היריון", "הריון", "בהריון", "מניקה", "הנקה"], "wa"],
  ["גברים", "כל הטיפולים מתאימים גם לגברים: טיפולי פנים, הסרת שיער בלייזר בכל אזורי הגוף כולל גב וחזה, ופדיקור טיפולי.", ["גבר", "גברים", "לגבר", "בעלי"], "menu"],
  ["הכנה ללייזר", "לפני הסרת שיער בלייזר מגלחים את האזור יום לפני, לא מורטים ולא עושים שעווה, ונמנעים משמש בשבועיים שלפני. מגיעות עם עור נקי, בלי קרם.", ["הכנה", "להתכונן", "מתכוננים", "לפני הלייזר", "לגלח", "שעווה"], "laser"],
  ["כמה טיפולי לייזר צריך", "רוב הלקוחות רואות הפחתה משמעותית אחרי שלושה עד ארבעה טיפולי לייזר, והסדרה המלאה היא שישה עד שמונה, במרווח של ארבעה עד שמונה שבועות לפי האזור. אחרי הסדרה, תחזוקה פעם בשנה בערך.", ["כמה טיפולים", "סדרה", "לייזר", "מרווח"], "laser"],
  ["פלזמה קרה לעומת פלזמה חמה", "פלזמה קרה מחטאת ומרגיעה את פני העור בלי חום ובלי כאב, ולכן מתאימה לאקנה ולעור דלקתי ורגיש. פלזמה חמה מאדה נקודות זעירות בעור כדי למתוח אותו ללא ניתוח: עפעפיים, קמטי הבעה וקווי צוואר, עם ימי החלמה קצרים.", ["הבדל", "פלזמה", "פלזמה קרה", "פלזמה חמה"], "menu"],
  ["פיגמנטציה בקיץ", "טיפול בכתמים אפשרי גם בקיץ, אבל עדיף בחורף. בקיץ רותם עובדת בריכוזים נמוכים יותר ומקפידה על הגנה מלאה מהשמש.", ["קיץ", "חורף", "שמש", "כתמים", "פיגמנטציה"], "pig"],
  ["תוצאות באקנה", "בדרך כלל אחרי שניים עד שלושה מפגשים הדלקת נרגעת ויש פחות התפרצויות חדשות. שיפור במרקם ובכתמים לוקח יותר זמן, לרוב לאורך כל הסדרה.", ["תוצאות", "כמה זמן", "אקנה", "שיפור"], "acne"],
  ["גיל", "אין גיל מינימום לטיפולי פנים ולפדיקור, ההתאמה נעשית באבחון. הסרת שיער בלייזר מגיל 18.", ["גיל", "ילדה", "נערה", "מתבגרת", "בת", "מבוגרת"], "book"],
];
FACTS.forEach(([t, text, tags, link]) => add({ type: "fact", title: t, text, tags, link }));

// תפריט הטיפולים
for (const c of win.SERVICES) for (const g of c.groups) for (const r of g.rows) {
  const bits = [];
  if (r.includes) bits.push(r.includes);
  if (r.who) bits.push("מתאים ל: " + r.who);
  if (r.duration) bits.push("משך: " + r.duration);
  if (r.series) bits.push("סדרה: " + r.series + (r.interval ? ", מרווח " + r.interval : ""));
  bits.push("מחיר: " + price(r));
  if (r.note) bits.push(r.note);
  const link = c.id === "laser-menu" ? "laser" : c.id === "pedicure-menu" ? "pedi" : "menu";
  add({ type: "row", title: r.name, text: bits.join(". ") + ".", tags: [c.title, g.title, r.tech || ""].filter(Boolean), link, price: price(r), cat: c.id });
}

// עמודי הטיפול: מה זה, למי, הביקור, שאלות
const GUIDE = { "acne": "acne", "pigmentation": "pig", "laser-hair-removal": "laser", "diabetic-pedicure": "pedi" };
for (const f of readdirSync(join(root, "treatments")).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(join(root, "treatments", f), "utf8"), slug = f.replace(".html", ""), link = GUIDE[slug] || "menu";
  const title = strip((html.match(/<p class="kicker">(.*?)<\/p>/) || [])[1] || slug);
  for (const m of html.matchAll(/<section class="article__sec"><h2>(.*?)<\/h2><p>(.*?)<\/p><\/section>/g)) add({ type: "guide", title: title + ": " + strip(m[1]), text: strip(m[2]), tags: [title], link });
  const steps = [...html.matchAll(/<li><h3>(.*?)<\/h3><p>(.*?)<\/p><\/li>/g)].map((m) => strip(m[1]) + ": " + strip(m[2]));
  if (steps.length) add({ type: "guide", title: title + ": איך נראה הביקור", text: steps.join(" "), tags: [title, "ביקור", "תהליך", "שלבים"], link });
  for (const m of html.matchAll(/<summary>(.*?)<span class="faq-icon"[^>]*><\/span><\/summary><p>(.*?)<\/p>/g)) add({ type: "faq", title: strip(m[1]), text: strip(m[2]), tags: [title], link });
}
// שאלות נפוצות מדף הבית
const home = readFileSync(join(root, "index.html"), "utf8");
for (const m of home.matchAll(/<summary>(.*?)<span class="faq-icon"[^>]*><\/span><\/summary>\s*<p>(.*?)<\/p>/gs)) add({ type: "faq", title: strip(m[1]), text: strip(m[2]), tags: ["שאלות"], link: "menu" });

// מוצרים
for (const p of win.PRODUCTS) add({ type: "product", title: p.name, text: (p.desc || "") + (p.size ? " גודל: " + p.size + "." : ""), tags: [p.brand, p.category, ...(p.concerns || []), p.en || ""].filter(Boolean), link: "shop", brand: p.brand, price: p.price || null });

writeFileSync(join(root, "js/knowledge.js"), "/* מאגר הידע של העוזרת. נבנה אוטומטית: node server/build-knowledge.mjs */\nwindow.KB = " + JSON.stringify(P) + ";\n");
writeFileSync(join(here, "knowledge.txt"), P.map((p) => `[${p.type}] ${p.title}: ${p.text}${p.tags.length ? " (" + p.tags.join(", ") + ")" : ""}`).join("\n"));
const n = {}; P.forEach((p) => (n[p.type] = (n[p.type] || 0) + 1));
console.log("passages:", P.length, n, "knowledge.js", readFileSync(join(root, "js/knowledge.js")).length, "bytes");
