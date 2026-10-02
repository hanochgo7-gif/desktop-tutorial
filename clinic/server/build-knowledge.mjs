// בונה את קובץ הידע של העוזרת מנתוני האתר (services.js, products.js). מריצים: node build-knowledge.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const win = {};
new Function("window", readFileSync(join(here, "../js/services.js"), "utf8"))(win);
new Function("window", readFileSync(join(here, "../js/products.js"), "utf8"))(win);
const price = (r) => (r.price === 0 ? "ללא עלות" : r.price ? "₪ " + r.price : "לפי אבחון");
const rows = [];
for (const c of win.SERVICES) for (const g of c.groups) for (const r of g.rows)
  rows.push(`[${c.title} / ${g.title}] ${r.name}: ${r.includes || ""}. מתאים ל: ${r.who}. משך ${r.duration}. סדרה ${r.series}${r.interval ? ", מרווח " + r.interval : ""}. מחיר: ${price(r)}.${r.note ? " הערה: " + r.note : ""}`);
const byBrand = {};
for (const p of win.PRODUCTS) (byBrand[p.brand] ||= []).push(`${p.name}${p.size ? " (" + p.size + ")" : ""}: ${p.desc || ""}${p.concerns ? " מתאים ל: " + p.concerns.join(", ") : ""}${p.price ? ". ₪ " + p.price : ""}`);
const text = [
  "עובדות על הקליניקה:",
  "- רותם גוטובסקי, קוסמטיקאית פרא-רפואית מוסמכת (P.M.E), בוגרת בתי הספר למדעי הקוסמטיקה של חוה זינגבוים. הכשרה בביולוגיה, אנטומיה, פיזיולוגיה וכימיה, ובטכנולוגיות RF, פוטותרפיה ומיקרונידלינג.",
  "- כתובת: המייסדים 67, מושב בניה. חניה חופשית ברחוב.",
  "- שעות: ראשון עד חמישי 9:00 עד 19:00. שישי ושבת סגור. תורים נקבעים מראש.",
  "- טלפון ווואטסאפ: 054-577-9379. רותם עונה בשעות הפעילות, בדרך כלל תוך שעה.",
  "- האבחון בביקור הראשון ללא עלות, כחצי שעה, בלי התחייבות. אחריו תוכנית עם מספר מפגשים ומחיר ידועים מראש.",
  "- תשלום: מזומן, אשראי וביט. ביטול או שינוי תור בהודעת וואטסאפ עד 24 שעות לפני.",
  "- הסרת שיער בלייזר: לכל אזורי הגוף, לנשים ולגברים, מכויל לכל גווני העור כולל כהה מאוד. טיפול ניסיון על אזור קטן ללא עלות לפני כל סדרה. מגלחים יום לפני, לא שעווה ולא מריטה, בלי שמש בשבועיים שלפני. לא יעיל על שיער לבן או בלונדיני מאוד.",
  "- פדיקור טיפולי: טיפול רפואי-קוסמטי בכף הרגל, לא פדיקור יופי. כלים חד-פעמיים או מעוקרים, חומרים ללא חומצות אגרסיביות, בדיקת עור ותחושה לפני כל טיפול. מתאים לסוכרתיים.",
  "- טיפולי פנים לפי מטרה: אקנה, צלקות, פיגמנטציה, אנטי-אייג'ינג, לחות. פילינג חכם בריכוז 20% עד 60%; ב-20% האדמומיות חולפת תוך שעות, ב-60% ייתכן קילוף של 3 עד 5 ימים. בהיריון והנקה חלק מהחומרים לא מתאימים.",
  "- חנות: מוצרי בית של חוה זינגבוים, KLAPP, Arkana, SQT ו-Dr. Spicule. מזמינים בוואטסאפ, איסוף מהקליניקה ללא עלות או משלוח עד הבית. מחירי מוצרים נמסרים בוואטסאפ אם לא כתובים.",
  "",
  "תפריט הטיפולים:",
  ...rows.map((r) => "- " + r),
  "",
  "מוצרים בחנות:",
  ...Object.entries(byBrand).map(([b, list]) => `${b}:\n` + list.map((l) => "  - " + l).join("\n")),
].join("\n");
writeFileSync(join(here, "knowledge.txt"), text);
console.log("knowledge.txt:", text.length, "chars,", rows.length, "treatments,", win.PRODUCTS.length, "products");
