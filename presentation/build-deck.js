// Builds hanoch-7-10.pptx from the live-deck content (38 slides), with videos + recordings embedded with sound.
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

const P = (f) => path.join(__dirname, "photos", f);
const b64 = (f, mime) => mime + ";base64," + fs.readFileSync(f).toString("base64");

// ---------- palette ----------
const INK = "0E1116", INK2 = "171C24", SAND = "D9B78C", SANDD = "B8925C", PAPER = "F6F3EE", PAPER2 = "ECE7DF";
const TXT = "1C1F26", MUTED = "6B7280", MUTEDL = "A7ADB8", LINE_D = "2A313C", LINE_L = "E2DCD2", WHITE = "F6F3EE", BROWN = "5A4A30";
const FH = "Frank Ruhl Libre", FB = "Heebo";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in  (1920x1080 px @ 144 px/in)
pres.rtlMode = true;
pres.lang = "he-IL";
pres.title = "7.10 – הסיפור שלי";
pres.author = "חנוך";
const W = 13.333, H = 7.5;
const px = (v) => v / 144;          // px (1920 grid) -> inches
const pt = (v) => Math.round(v * 0.5); // px font-size -> pt (1px@1920 grid ≈ 0.5pt on a 13.33in slide)

const nodot = (s) => (s.endsWith(".") && !s.endsWith("…")) ? s.slice(0, -1) : s;
const T = (o) => Object.assign({ fontFace: FB, rtlMode: true, lang: "he-IL", isTextBox: true, margin: 0, align: "right", valign: "top", fit: "shrink" }, o);

function text(s, str, x, y, w, h, o = {}) {
  s.addText(str, T(Object.assign({ x: px(x), y: px(y), w: px(w), h: px(h) }, o)));
}
function heading(s, str, x, y, w, h, size, color, o = {}) {
  text(s, nodot(str), x, y, w, h, Object.assign({ fontSize: pt(size), bold: true, color, fontFace: FH }, o));
}
function para(s, str, x, y, w, h, size, color, o = {}) {
  text(s, str, x, y, w, h, Object.assign({ fontSize: pt(size), color }, o));
}
function img(s, file, x, y, w, h, o = {}) {
  s.addImage(Object.assign({ path: P(file), x: px(x), y: px(y), w: px(w), h: px(h), sizing: { type: "cover", w: px(w), h: px(h) } }, o));
}
function rrect(s, x, y, w, h, fill, line, radius = 24, dash) {
  s.addShape(pres.ShapeType.roundRect, {
    x: px(x), y: px(y), w: px(w), h: px(h), rectRadius: px(radius),
    fill: { color: fill }, line: line ? { color: line, width: 1.5, dashType: dash || "solid" } : { color: fill, width: 0 },
  });
}
function rect(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.rect, { x: px(x), y: px(y), w: px(w), h: px(h), fill: { color: fill }, line: { color: fill, width: 0 } });
}
function circle(s, cx, cy, d, fill, line) {
  s.addShape(pres.ShapeType.ellipse, { x: px(cx - d / 2), y: px(cy - d / 2), w: px(d), h: px(d), fill: { color: fill }, line: line ? { color: line, width: 3 } : { color: fill, width: 0 } });
}
function iconChip(s, cx, cy, d, name) {
  circle(s, cx, cy, d, SAND);
  const k = d * 0.5;
  s.addImage({ path: path.join(__dirname, "icons", name + ".png"), x: px(cx - k / 2), y: px(cy - k / 2), w: px(k), h: px(k) });
}
function circleIcon(s, cx, cy, d, sym, bg = SAND, fg = INK) {
  circle(s, cx, cy, d, bg);
  text(s, sym, cx - d / 2, cy - d / 2, d, d, { fontSize: pt(d * 0.5), color: fg, align: "center", valign: "middle" });
}
function video(s, file, still, x, y, w, h) {
  s.addMedia({ type: "video", path: P(file), cover: b64(P(still), "image/jpeg"), x: px(x), y: px(y), w: px(w), h: px(h) });
}
const TOTAL = 43;
let CUR_SEC = null;
function pnum() {}
function rule(s, x, y, w = 120, color = SAND) { rect(s, x, y, w, 6, color); }
function chrome(s, dark, mark = 0, idx = n) {
  if (CUR_SEC) {
    rect(s, 1782, 66, 10, 10, SAND);
    para(s, CUR_SEC[0] + "  ·  " + CUR_SEC[1], 128, 48, 1640, 44, 28, dark ? SAND : SANDD, { charSpacing: 1 });
  }
  para(s, idx + " / " + TOTAL, 128, 1000, 200, 40, 24, dark ? MUTEDL : MUTED, { align: "left", rtlMode: false, lang: "en-US" });
  s.addShape(pres.ShapeType.rect, { x: 0, y: px(1076), w: W, h: px(4), fill: { color: dark ? "1B2028" : "E2DCD2" }, line: { color: dark ? "1B2028" : "E2DCD2", width: 0 } });
  const w = Math.round(1920 * idx / TOTAL);
  rect(s, 1920 - w, 1076, w, 4, SAND);
  if (mark) rect(s, 1848, 128, 8, mark, SAND);
}
let n = 0;
function slide(bg, notes, opts = {}) {
  n += 1;
  const s = pres.addSlide();
  s.background = { color: bg };
  if (notes) s.addNotes(notes);
  if (opts.chrome !== false) chrome(s, bg === INK, opts.mark || 0, opts.idx || n);
  return s;
}
function sectionSlide(num, title, notes, tsize = 96) {
  CUR_SEC = null;
  const s = slide(INK, notes);
  text(s, num, 128, 60, 1664, 420, { fontSize: pt(400), bold: true, color: SAND, transparency: 91, fontFace: FH, align: "left", valign: "top" });
  rule(s, 1672, 430);
  para(s, "פרק " + num, 128, 410, 1520, 48, 28, SAND, { charSpacing: 2 });
  heading(s, title, 128, 480, 1664, 260, tsize, WHITE);
  CUR_SEC = [num, title];
}

// ============ 1 cover ============
{
  const s = slide(INK, "שקף פתיחה. לא מדברים עליו. הוא נשאר על המסך כשהקהל נכנס. התמונה: סוף המסלול, הסיכה בפה. והדגל מתנופף מאחור. הקהל רואה בחור צעיר ומחייך, ועוד לא יודע מה יקרה לו. אפשר לחזור אליה בסוף: הבחור הזה לא ידע מה מחכה לו.", { chrome: false });
  img(s, "cover-B.jpg", 0, 0, 1920, 1080);
  rule(s, 728, 668);
  heading(s, "7.10", 128, 696, 720, 180, 170, SAND);
  heading(s, "הסיפור שלי", 128, 872, 720, 100, 80, WHITE);
  para(s, "חנוך  |  לוחם סיירת נח״ל, פצוע 7 באוקטובר", 128, 976, 720, 50, 30, "C9CDD4");
}
// ============ 2 hook ============
{
  const s = slide(INK, "פתיחה – 3 דקות. לשאול את השאלה, ומיד להוסיף: 'אל תענו בקול, רק תחשבו רגע.' לתת חמש שניות של שקט – כל אחד באולם חוזר לבוקר ההוא. ואז, בשקט: 'אני הייתי במוצב סופה.' ומשם מתחילים. לא להסביר את השאלה. בסוף ההרצאה חוזרים אליה: אף אחד מאיתנו לא בחר את היום הזה – אבל כל אחד מאיתנו בוחר מה עושים מכאן.");
  rule(s, 1672, 379);
  heading(s, "איפה הייתם\nב־7 באוקטובר?", 128, 413, 1664, 280, 110, WHITE, { valign: "top" });
  pnum(s, n);
}
// ============ 3 section 01 ============
CUR_SEC = ["01", "מי הייתי לפני הכול"]; // chapter slide removed by the user
// ============ 4 who ============
{
  const s = slide(PAPER, "אני חנוך, בן 24, מיישובי גדרות. ילדות מושבניקית. אח בכור לשלושה אחים – ארבעה ילדים כולל אותי. הרבה סימני שאלה – לא ילד שידעו לאן הוא הולך. (להוסיף פרט אחד קטן ומצחיק מהילדות שמחבר את הקהל.)");
  heading(s, "חנוך, בן 24, מיישובי גדרות", 128, 64, 1664, 90, 64, TXT, { align: "center" });
  img(s, "02-childhood.jpg", (1920 - 570) / 2, 182, 570, 830);
  pnum(s, n, false);
}
// ============ 5 label ============
{
  const s = slide(INK, "מהגן הגדירו אותי כ'ילד בעייתי' והייתי מסתבך הרבה. לתת דוגמה אחת קונקרטית – אירוע אחד, לא רשימה.");
  img(s, "03-kid.jpg", 128, 128, 640, 824);
  heading(s, "״ילד בעייתי״", 832, 250, 960, 200, 140, SAND);
  para(s, "ככה הגדירו אותי כבר מהגן. ומאז – הסתבכתי הרבה.", 832, 500, 960, 130, 40, WHITE);
  para(s, "כשאומרים לך משהו מספיק פעמים, אתה מתחיל להאמין לזה.", 832, 650, 960, 110, 30, MUTEDL);
  pnum(s, n);
}
// ============ 6 grade10 ============
{
  const s = slide(PAPER, "אירוע אחד בכיתה י' ששינה לי את כל התפיסה. האשימו אותי בבית הספר בסחר בסמים ולא היה לי שום קשר לזה. בסוף השיחה הם האמינו לי – אבל זה השאיר בי חותם: שיכולים לחשוד בי בדבר כל כך חמור. זו הפעם הראשונה שהחלטתי לקחת את ההחלטות בחיים שלי בעצמי. מאותו רגע: חיפוש שנת שירות איכותית, שאיפה לשירות קרבי משמעותי.", { mark: 74 });
  heading(s, "כיתה י׳: הרגע שבו הכול התהפך", 128, 128, 1664, 90, 64, TXT);
  // dark quote card on the left (720 wide)
  // three words on the right, evenly spread
  const words = ["ההאשמה", "ההבנה", "ההחלטה"];
  words.forEach((w, i) => {
    const y = 266 + (654 / 3) * i + 654 / 6;
    circle(s, 1792 - 24, y, 48, SAND);
    heading(s, w, 128, y - 60, 1600, 120, 72, TXT, { valign: "middle" });
  });
  pnum(s, n, false);
}
// ============ 7 msg1 ============
{
  const s = slide(INK, "המסר של הפרק. לעצור עליו רגע. הקהל צריך להבין: לא הגיבור שנולד גיבור – נער עם הרבה סימני שאלה.");
  rule(s, 900, 290);
  heading(s, "העבר שלך מסביר אותך", 128, 330, 1664, 150, 88, MUTEDL, { align: "center" });
  heading(s, "אבל הוא לא חייב להגדיר אותך", 128, 500, 1664, 170, 96, SAND, { align: "center" });
  pnum(s, n);
}
// ============ 8 s02 ============
{
  CUR_SEC = null;
  const s = slide(INK, "הבחירה – 7 דקות. המעבר לסיירת נח״ל. לא להפוך את זה ל'סיפור צבאי'. הנושא: הפעם הראשונה שבה בחרת מי אתה רוצה להיות.");
  text(s, "02", 128, 60, 1664, 420, { fontSize: pt(400), bold: true, color: SAND, transparency: 91, fontFace: FH, align: "left", valign: "top" });
  s.addImage({ path: path.join(__dirname, "nahal-sand.png"), x: px(128), y: px(365), w: px(640), h: px(351), sizing: { type: "contain", w: px(640), h: px(351) } });
  rule(s, 1672, 430); para(s, "פרק 02", 832, 410, 816, 48, 28, SAND, { charSpacing: 2 });
  heading(s, "הבחירה", 832, 480, 960, 140, 96, WHITE);
  CUR_SEC = ["02", "הבחירה"];
}
// ============ 9 shomer ============
{
  const s = slide(PAPER, "בהתחלה החלטתי ללכת לשנת שירות ב'שומר החדש'. עבדתי שם בחקלאות, ובזכות זה, דרך גרעין נח״ל, התגייסתי לנח״ל. משם הגעתי לסיירת.", { mark: 70 });
  heading(s, "שנת שירות ב״שומר החדש״ – גרעין נח״ל", 128, 128, 1664, 90, 60, TXT, { valign: "middle" });
  // photo row, centered, right to left
  const shomer = [["shomer-01.jpg", 436 / 712], ["shomer-02.jpg", 530 / 710]], sh = 662, sg = 32;
  const sw = shomer.map(([, ar]) => Math.round(sh * ar));
  let sx = 960 + (sw.reduce((a, b) => a + b, 0) + sg * (shomer.length - 1)) / 2;
  shomer.forEach(([f], i) => { sx -= sw[i]; img(s, f, sx, 258, sw[i], sh); sx -= sg; });
  pnum(s, n, false);
}
// ============ 9 sayeret ============
{
  const s = slide(PAPER, "השירות בקצרה: מהשנה בשומר החדש הגעתי לסיירת – מסלול של שנה וחודשיים. עליתי לקו יקיר, אחר כך אימון חורף, מבצע 'בית וגן' בג'נין, ואז עלינו לקו עזה. (לספר בעל פה: למה רציתי להגיע לסיירת – אוהב אתגרים, להוכיח לעצמי; המחיר – קושי פיזי ומנטלי וקשיים בבית; מה הצבא לימד אותי – שהכול בראש ושתמיד אפשר להשתפר. מוטיבציה מביאה אותך להתחלה, משמעת מביאה אותך לסוף.)", { mark: 70 });
  heading(s, "השירות הצבאי", 700, 128, 1092, 143, 60, TXT, { valign: "middle" });
  s.addImage({ path: path.join(__dirname, "nahal-dark.png"), x: px(128), y: px(128), w: px(260), h: px(143), sizing: { type: "contain", w: px(260), h: px(143) } });
  // timeline: 5 steps right-to-left
  const steps = ["מסלול בסיירת נח״ל", "קו יקיר", "אימון חורף", "מבצע ״בית וגן״", "קו עזה"];
  const y0 = 300, gap = 52, cw = (1664 - 4 * gap) / 5; // 5 cells + 4 arrow gaps = 1664
  const xs = steps.map((_, i) => 1792 - cw / 2 - i * (cw + gap)); // centers, right to left
  rect(s, xs[4], y0 + 13, xs[0] - xs[4], 4, SAND);
  steps.forEach((st, i) => {
    circle(s, xs[i], y0 + 15, 30, i === 4 ? SAND : "FFFFFF", SAND);
    if (i > 0) text(s, "←", xs[i] + cw / 2 + 2, y0, gap - 4, 30, { fontSize: pt(30), color: SANDD, align: "center", valign: "middle" });
    para(s, st, xs[i] - cw / 2, y0 + 44, cw, 100, 28, TXT, { bold: true, align: "center" });
  });
  // three photos row (right to left): team 842, army 348, stretcher 390, gaps 32 → total 1644
  const py = 450, ph = 520;
  let x = 1792 - 842; img(s, "army-03-team-berets.jpg", x, py, 842, ph);
  x -= 32 + 348; img(s, "04-army.jpg", x, py, 348, ph);
  x -= 32 + 390; img(s, "army-02-stretcher.jpg", x, py, 390, ph);
  pnum(s, n, false);
}
// ============ 10 commanders ============
{
  const s = slide(INK, "קליין – תמיד דחף אותנו למצוינות ומקצועיות, לעשות דברים כמו שצריך ועד הסוף. עד היום אני במשטר אימונים בגלל המסגרת שהוא הכניס אותנו אליה. ברנש (יונתן צור) – הגיע משלדג, פיקד בתפקידים רבים, עטור שבחים. ובכל זאת קודם כל היה אדם: ידע שמות, התייעץ איתנו, דיבר איתנו בשיח חברי. התמונה: לחיצת יד בטקס סוף המסלול. השיעור: אפשר להיות הכי טוב ועדיין להישאר בן אדם.", { mark: 60 });
  heading(s, "שני מפקדים. שני שיעורים", 128, 128, 1664, 80, 52, WHITE);
  const cards = [["קליין  ·  המפקצ׳", "cmd-klein-wide.jpg", Math.floor(600 * 564 / 460)], ["ברנש  ·  המג״ד, יונתן צור", "cmd-barnash-tight.jpg", Math.floor(600 * 577 / 460)]];
  const cwid = (1664 - 48) / 2, cy = 240, ch = 680;
  cards.forEach(([name, file, pw], i) => {
    const cx = 1792 - cwid - i * (cwid + 48);
    rrect(s, cx, cy, cwid, ch, INK2, "2A313C", 20);
    img(s, file, cx + (cwid - pw) / 2, cy + 28, pw, 600);
    heading(s, name, cx + 28, cy + 640, cwid - 56, 60, 44, SAND, { align: "center" });
  });
  pnum(s, n);
}
// ============ 11 s03 ============
sectionSlide("03", "7 באוקטובר", "7 באוקטובר – 15 דקות. הלב הרגשי של ההרצאה, אבל לא כל ההרצאה. לספר כמו סרט. לא רק מה קרה – מה חשבת בכל שלב.");
// ============ 12a gaza map ============
{
  const s = slide(INK, "מפת העוטף ואז צילום האוויר. מימין: איפה אנחנו ברצועה – הקצה הדרומי, ליד המשולש עם מצרים. משמאל: מקרוב – כרם שלום, סופה, ניר יצחק, והגבול עם רפיח במרחק קילומטרים ספורים. משפט אחד – ומשם לתרשים של איך הגזרה עבדה.", { mark: 70 });
  heading(s, "הגזרה הדרומית", 128, 128, 1664, 80, 60, WHITE);
  const total = 648 + 64 + 604, x0 = (1920 - total) / 2, y = 238;
  img(s, "gaza-map-2.jpg", x0, y, 604, 700);
  s.addImage({ path: P("gaza-map-1.jpg"), x: px(x0 + 604 + 64), y: px(y), w: px(648), h: px(700), sizing: { type: "contain", w: px(648), h: px(700) } });
}
// ============ 12 sector ============
{
  const s = slide(INK, "להסביר את המבנה בשלושה משפטים: סיירת נח״ל תפסה את הגזרה הדרומית. שני מוצבים – כרם שלום (פלחה״ן) וסופה (פלוגת נ״ט). הפלס״ר, הפלוגה שלי, הייתה מחולקת בין שניהם. כל מוצב מחולק למשימות, והמשימה שלנו הייתה צוות עתודה – זמין לכל אירוע. משמרות: כל בוקר 05:30 וכל ערב 18:30. ומכאן – לשקף הבא: ערב חג.", { mark: 60 });
  heading(s, "איך זה עבד בגזרה", 128, 100, 1664, 80, 52, WHITE);
  const box = (cx, y, w, h, txt, sub, hot) => {
    rrect(s, cx - w / 2, y, w, h, hot ? SAND : INK2, hot ? SAND : LINE_D, 16);
    if (sub) {
      para(s, txt, cx - w / 2 + 16, y + 6, w - 32, h / 2, 34, hot ? INK : WHITE, { bold: true, align: "center", valign: "bottom" });
      para(s, sub, cx - w / 2 + 16, y + h / 2 + 4, w - 32, h / 2 - 8, 28, hot ? BROWN : MUTEDL, { align: "center", valign: "top" });
    } else para(s, txt, cx - w / 2 + 16, y, w - 32, h, 34, hot ? INK : WHITE, { bold: true, align: "center", valign: "middle" });
  };
  const vl = (y, h = 18) => rect(s, 958, y, 4, h, LINE_D);
  const hb = (y) => rect(s, 410, y, 1100, 4, LINE_D);
  let y = 196;
  box(960, y, 900, 76, "סיירת נח״ל תפסה את הגזרה הדרומית", "", false); y += 76;
  vl(y); y += 18; hb(y); y += 4;
  rect(s, 958 - 276, y, 4, 14, LINE_D); rect(s, 958 + 276, y, 4, 14, LINE_D); y += 14;
  box(960 + 276, y, 520, 116, "מוצב כרם שלום", "פלחה״ן", false); box(960 - 276, y, 520, 116, "מוצב סופה", "פלוגת נ״ט", false); y += 116;
  vl(y); y += 18;
  box(960, y, 900, 116, "פלס״ר – הפלוגה שלי", "מחולקת בין שני המוצבים", true); y += 116;
  vl(y); y += 18; hb(y); y += 4;
  [960 - 544, 960, 960 + 544].forEach((cx) => rect(s, cx - 2, y, 4, 14, LINE_D)); y += 14;
  const bw = (1664 - 64) / 3;
  box(1792 - bw / 2, y, bw, 116, "תורנות מטבח", "", false); box(960, y, bw, 116, "צוות עתודה", "זמין לכל אירוע בגזרה", true); box(128 + bw / 2, y, bw, 116, "כיתת כוננות", "", false); y += 116;
  vl(y); y += 18;
  box(960, y, 900, 76, "משמרת בוקר 05:30  ·  משמרת ערב 18:30", "", false);
  pnum(s, n);
}
// ============ 13 nagmash ============
{
  const s = slide(INK, "רגע לפני שמספרים על קו עזה: להסביר בעל פה מה זה נגמ״ש – נושא גייסות משוריין, כבד, הצוות בפנים, המפקד והמקלען למעלה. הקהל צריך לדעת מה הכלי הזה כדי להבין את מה שיקרה לו בהמשך.");
  heading(s, "מה זה נגמ״ש?", 128, 110, 1664, 110, 80, WHITE, { align: "center" });
  img(s, "apc-explainer.jpg", (1920 - 1220) / 2, 250, 1220, 686);
  pnum(s, n);
}
// ============ 14 before ============
{
  const s = slide(INK, "בעל פה, לפני השקף: ערב 6.10, ערב חג – ארוחת חג, אימון, והלכתי לישון. (על צוות העתודה והכוננות – כבר סופר בתרשים.) ואז: ב-05:30 קמתי למשמרת בוקר. התמונה מהבוקר הזה. משפט על הבוקר – רגיל, שקט. ואז השקף הבא: 06:29.");
  img(s, "oct7-00-morning.jpg", 128, 128, 620, 824);
  heading(s, "עליתי למשמרת", 812, 340, 980, 170, 110, WHITE);
  heading(s, "05:30  7.10", 812, 540, 980, 90, 56, SAND);
  pnum(s, n);
}
// ============ 15 rockets ============
{
  const s = slide(INK, "06:29 – מטח רקטות. הסרטון (17 שניות) מתחיל בלחיצה. להגיד: קמתי למשמרת, ובשש עשרים ותשע – ללחוץ. אחרי הסרטון עוברים להקלטת הקשר של הסמג״ד.");
  video(s, "oct7-rockets-portrait.mp4", "oct7-rockets-portrait-still.jpg", 128, 128, 464, 824);
  heading(s, "06:29", 658, 330, 1134, 220, 150, SAND);
  heading(s, "מטח רקטות מעזה", 658, 570, 1134, 90, 48, WHITE);
  pnum(s, n);
}
// ============ radio helper ============
function radio(when, title, sub, dur, notes, lines, file, still) {
  const s = slide(INK, notes);
  const chars0 = lines.reduce((a, [sp, tx]) => a + sp.length + tx.length, 0);
  const tsz0 = chars0 < 80 ? 44 : chars0 < 140 ? 40 : chars0 < 260 ? 34 : 32;
  const tw = 1664 - 128 - 560 - 48, perLine = Math.floor(tw / (0.52 * tsz0));
  const nLines = lines.reduce((a, [sp, tx]) => a + Math.ceil((sp.length + tx.length + 1) / perLine), 0) + (lines.length - 1);
  const textEnd = 260 + nLines * tsz0 * 1.35 + 20;
  const ch = Math.max(620, Math.round(Math.max(200 + 315 + 60, textEnd) + 56));
  const cx = 128, cw = 1664, cy = Math.max(116, Math.round((1080 - ch) / 2));
  rrect(s, cx, cy, cw, ch, INK2, LINE_D, 24);
  s.addShape(pres.ShapeType.roundRect, { x: px(cx + cw - 64 - 620), y: px(cy + 36), w: px(620), h: px(52), rectRadius: px(26), fill: { color: "2B1A1D" }, line: { color: "6E2A2E", width: 1 } });
  circle(s, cx + cw - 64 - 30, cy + 62, 14, "E5484D");
  para(s, "הקלטת קשר  ·  " + when, cx + cw - 64 - 610, cy + 40, 550, 44, 28, WHITE, { valign: "middle" });
  para(s, dur, cx + 64, cy + 40, 300, 44, 28, MUTEDL, { align: "left" });
  heading(s, title, cx + 64, cy + 90, cw - 128, 80, 52, WHITE);
  // recording video on the left, transcript on the right
  const vw = 560, vh = Math.round(vw * 480 / 852);
  video(s, file, still, cx + 64, cy + 200, vw, vh);
  para(s, "▶ לחיצה משמיעה את ההקלטה", cx + 64, cy + 200 + vh + 12, vw, 44, 26, MUTEDL, { align: "center" });
  para(s, sub, cx + 64 + vw + 48, cy + 200, cw - 128 - vw - 48, 48, 30, SAND);
  const chars = lines.reduce((a, [sp, tx]) => a + sp.length + tx.length, 0);
  const tsz = chars < 80 ? 44 : chars < 140 ? 40 : chars < 260 ? 34 : 32;
  const runs = [];
  lines.forEach(([sp, tx], i) => {
    if (sp) runs.push({ text: sp + " ", options: { bold: true, color: SAND, breakLine: false } });
    runs.push({ text: tx, options: { breakLine: i < lines.length - 1 } });
    if (i < lines.length - 1) runs.push({ text: "", options: { breakLine: true } });
  });
  s.addText(runs, T({ x: px(cx + 64 + vw + 48), y: px(cy + 260), w: px(cw - 128 - vw - 48), h: px(ch - 300), fontSize: pt(tsz), color: WHITE, valign: "top", paraSpaceAfter: 6 }));
  pnum(s, n);
}
radio("7.10, 06:45", "הסמג״ד עידו שני מכריז על מלחמה", "רבע שעה אחרי מטח הרקטות", "0:09",
  "הקלטת קשר, 9 שניות: הסמג״ד עידו שני מכריז על מלחמה, 06:45. ההקלטה מתנגנת בלחיצה. להשמיע, לשתוק, ואז: ובדיוק אז, מהצד השני של הכביש –",
  [["הסמג״ד:", "אנחנו במלחמה! כל אחד הגנה בגזרתו."], ["", "להרוג מחבלים. בהצלחה!"]], "radio-01-ido-shani.mp4", "radio-01-still.jpg");
// ============ 18 map ============
{
  const s = slide(INK, "לפני הסרטון: להסביר את המרחב. איפה המוצב, איפה הקיבוץ, מאיפה הגיעו המחבלים (הנקודה האדומה), ואיפה הנגמ״ש. שני משפטים – הקהל צריך רק להבין את המרחב, ואז בסרטון הוא יזהה את הנקודה.", { chrome: false });
  heading(s, "מפת הקרב", 128, 88, 1664, 80, 56, WHITE);
  img(s, "oct7-04-map-he2.jpg", 0, 200, 1920, 656);
}
// ============ 17 nukhba ============
{
  const s = slide(INK, "הסרטון על כל המסך, מתחיל בלחיצה. לספר: עליתי למשמרת בוקר, בוקר רגיל – ובדיוק ברגע הזה ללחוץ. מצלמת הגוף של המחבלים מגיעים לנקודה שבמפה ויורים נ״ט על הנגמ״ש. לא לדבר מעליו 20–30 שניות. אחר כך: ואני עוד לא ידעתי כלום.", { chrome: false });
  video(s, "oct7-03-nukhba-sm.mp4", "oct7-03-still.jpg", 0, 0, 1920, 1080);
  rect(s, 0, 990, 1920, 90, INK);
  heading(s, "באותן דקות, מהצד השני של הכביש", 128, 1000, 1664, 70, 36, WHITE, { valign: "middle" });
}
// ============ 22 apc ============
{
  const s = slide(INK, "יום אחרי הקרב. התמונה צולמה מהנקודה שממנה ירו עלינו. לתת לקהל להסתכל. משפט אחד: ככה זה נראה מהצד שלהם.");
  img(s, "oct7-01-apc.jpg", (1920 - 1408) / 2, 128, 1408, 792);
  para(s, "הנגמ״ש שלנו, מצולם מהמקום שבו עמדו המחבלים", 128, 960, 1664, 50, 28, MUTEDL);
}
radio("7.10, 07:45", "הסמל מבקש פינוי", "שעה בדיוק אחרי הכרזת המלחמה", "0:07",
  "הקלטת קשר, 7 שניות: חכים, מפקד כוח האכזרית, מבקש פינוי ב-07:45 – בדיוק שעה אחרי שהסמג״ד הכריז על מלחמה. להגיד את זה: שעה. כל מה שסיפרתי עכשיו קרה בתוך שעה אחת.",
  [["חכים (מפקד כוח האכזרית):", "מוכרחים פינוי דחוף."], ["קליין:", "חכים קבל, אין לנו איך לעזור לכם. אנחנו בניהול אש עם מחבלים."]], "radio-02-evac-request.mp4", "radio-02-still.jpg");
// ============ battle map again (user-added copy) ============
{
  const s = slide(INK, "לפני הסרטון: להסביר את המרחב. איפה המוצב, איפה הקיבוץ, מאיפה הגיעו המחבלים (הנקודה האדומה), ואיפה הנגמ״ש. שני משפטים – הקהל צריך רק להבין את המרחב, ואז בסרטון הוא יזהה את הנקודה.", { chrome: false });
  heading(s, "מפת הקרב", 128, 88, 1664, 80, 56, WHITE);
  img(s, "oct7-04-map-he2.jpg", 0, 200, 1920, 656);
}
// ============ 19 outpost ============
{
  const s = slide(INK, "הסרטון מתחיל בלחיצה עליו (לא אוטומטית), כדי שתשלוט מתי. להגיד קודם: אני לא הייתי שם – ואז להפעיל. אחרי הסרטון: משפט אחד על מה שזה עשה לך לראות את זה אחר כך.", { chrome: false });
  video(s, "oct7-05-outpost-cut.mp4", "oct7-05-outpost-cut-still.jpg", 654, 0, 612, 1080);
  heading(s, "בינתיים, בתוך המוצב", 1290, 128, 560, 80, 50, WHITE);
  pnum(s, n);
}
// ============ 20 moment ============
{
  const s = slide(INK, "הרגע של הפציעה. לעצור אחרי 'הדבר היחיד שעבר לי בראש היה…' – שנייה של שקט – ואז: תמיד אמרו לנו שמי שלא מתפקד מקבל פוסט טראומה. אז תפקדתי. זו ההחלטה השנייה – אותה החלטה מכיתה י': לפעול, לא לתת לדברים לקרות לי.");
  img(s, "oct7-02-evac.jpg", 128, 128, 720, 824);
  heading(s, "באותו רגע שנפצעתי,", 912, 300, 880, 100, 60, WHITE);
  heading(s, "מחשבה אחת בלבד עברה בראשי…", 912, 410, 880, 180, 60, SAND);
  para(s, "תמיד לימדו אותנו: מי שלא ממשיך לתפקד – נשאר עם הטראומה", 912, 620, 880, 160, 36, MUTEDL);
  pnum(s, n);
}
radio("7.10, דקות אחרי 07:45", "כל הכוחות באזור עולים לקשר. כולם מבקשים פינוי", "אחד מהשני. אין למי לפנות", "0:20",
  "הקלטת קשר, 20 שניות: דקות אחרי הבקשה של חכים, כל הכוחות באזור עולים לקשר ומבקשים פינוי אחד מהשני. להשמיע עד הסוף. אחר כך משפט אחד: זה הרגע שבו הבנתי שאף אחד לא בא.",
  [["קליין (המפקצ׳):", "חמ״ל מקליין. תן לי דוח מצב על כוחות פינוי: א. לסופה, ב. לאנדרטת נירים."], ["החמ״ליסט:", "קיבל. כי אין לי שום מושג. אין פינוי, אין פינוי כרגע. אנחנו חייבים פינוי דחוף, דחוף."], ["קליין:", "מה אתה אומר לי? אתה החמ״ל, אחי!"]], "radio-03-all-forces.mp4", "radio-03-still.jpg");
radio("7.10, 07:50", "קליין נותן פקודה. והיא מאפסת אותנו", "המפקצ׳ שדחף אותנו למצוינות במסלול – עכשיו זה נכנס לפעולה", "0:08",
  "הקלטת קשר, 07:50: קליין נותן פקודה שמאפסת אותנו. חמש דקות אחרי שכולם מבקשים פינוי – קול אחד ברור. לחבר לשקף המפקדים: זו המסגרת שהוא הכניס אותנו אליה.",
  [["קליין למפקד כוח האכזרית:", "תאפס אותם. תקפיאו מצב. תסגרו את כל הפינות."], ["", "שימו ת׳פצועים באמצע, ואל תתנו למחבלים להגיע אליכם."]], "radio-04-klein-order.mp4", "radio-04-still.jpg");
// ============ 25 evac ============
{
  const s = slide(INK, "תמונה מרגע הפינוי, מתוך הרכב שהגיע. לא להסביר הרבה – להגיד מי צילם ומאיפה, ומה הרגשת כשסוף סוף הגיע מישהו.");
  img(s, "oct7-evac2.jpg", (1920 - 1408) / 2, 128, 1408, 792);
  para(s, "הפינוי. הצוות ליד הנגמ״ש, האלונקות על הקרקע", 128, 960, 1664, 50, 28, MUTEDL);
}
// ============ 26 soroka ============
{
  const s = slide(INK, "סורוקה, שעתיים אחרי הפינוי. התמונה + ההודעה הקולית ששלחתי לכולם. להשמיע. הקהל שומע 'אני בסדר גמור' – ואתה כבר יודע שזה לא היה נכון. משפט אחד אחרי: באותו רגע חשבתי שהחלק הקשה נגמר. ואז הנגמ״ש יום אחרי, ואז הטוויסט.");
  img(s, "rehab-00-soroka.jpg", 1792 - 464, 128, 464, 824);
  const cx = 128, cy = 128, cw = 1664 - 464 - 48, ch = 824;
  rrect(s, cx, cy, cw, ch, INK2, LINE_D, 24);
  para(s, "סורוקה  ·  שעתיים אחרי הפינוי", cx + 48, cy + 32, 700, 44, 28, MUTEDL);
  para(s, "0:28", cx + 48, cy + 32, 200, 44, 28, MUTEDL, { align: "left" });
  heading(s, "ההודעה הקולית ששלחתי מהמיטה", cx + 48, cy + 80, cw - 96, 60, 40, WHITE);
  const vw = 440, vh = Math.round(vw * 480 / 852);
  video(s, "radio-05-soroka.mp4", "radio-05-still.jpg", cx + 48, cy + 160, vw, vh);
  para(s, "▶ לחיצה משמיעה את ההודעה", cx + 48, cy + 160 + vh + 8, vw, 44, 26, MUTEDL, { align: "center" });
  para(s, "״אני בסדר גמור.״ עוד לא ידעתי כלום", cx + 48 + vw + 40, cy + 160, cw - 96 - vw - 40, 48, 30, SAND);
  const lines = [["חנוך:", "היי כולם, מה קורה, זה חנוך. מבקש לא להפיץ את ההקלטה, לא בא לי שכל העולם ישמע אותי מדבר."], ["", "הייתי בסופה, הותקלנו מחבלים. קיבלתי כדור ביד, חוץ מזה אני בסדר גמור."], ["", "בגדול דואגים לי, אמא פה, אבא תכף יגיע. כל הצבא עליי, כל הבי״ח עליי. אני בסדר גמור."], ["", "אוהב את כולם, נשיקות, נפגש."]];
  const runs = [];
  lines.forEach(([sp, tx], i) => {
    if (sp) runs.push({ text: sp + " ", options: { bold: true, color: SAND, breakLine: false } });
    runs.push({ text: tx, options: { breakLine: i < lines.length - 1 } });
    if (i < lines.length - 1) runs.push({ text: "", options: { breakLine: true } });
  });
  s.addText(runs, T({ x: px(cx + 48 + vw + 40), y: px(cy + 215), w: px(cw - 96 - vw - 40), h: px(ch - 260), fontSize: pt(30), color: WHITE, valign: "top", paraSpaceAfter: 4 }));
  pnum(s, n);
}
// ============ 27 twist ============
{
  const s = slide(SAND, "הטוויסט של ההרצאה. הקהל מצפה שהשיא היה 7 באוקטובר – ואתה אומר: הקרב היה החלק הקל. מכאן ההרצאה עוברת מסיפור מלחמה לסיפור חיים.", { chrome: false });
  rule(s, 900, 260, 120, INK);
  heading(s, "האמת?", 128, 300, 1664, 180, 120, INK, { align: "center" });
  heading(s, "הקרב היה החלק הקל", 128, 500, 1664, 200, 130, INK, { align: "center" });
}
// ============ 28 s04 ============
sectionSlide("04", "ואז הכול נגמר", "ואז הכול נגמר – 8 דקות.");
// ============ 29 numbers ============
{
  const s = slide(INK, "התמונה: הצוות בסוף המסלול, בשחור לבן. מעל 19 חברים באותו יום, ועוד כמעט עשרה במהלך המלחמה. זה הדבר שהיה לי הכי קשה אחרי השביעי – לא הפציעה. הדברים שהם לא יספיקו לעשות, והמשפחות השכולות. (אפשר להגיד שם אחד או שניים. לעצור. לא למהר לשקף הבא.)");
  img(s, "team-gray.jpg", 128, 287, 820, 506);
  rule(s, 1672, 330);
  heading(s, "הדבר הכי קשה לא היה הפציעה", 1028, 370, 764, 180, 64, WHITE);
  para(s, "הדברים שהם לא יספיקו לעשות. המשפחות שנשארו.", 1028, 570, 764, 100, 32, MUTEDL);
  heading(s, "זה מה שנשאר איתי", 1028, 690, 764, 70, 44, SAND);
  pnum(s, n);
}
// ============ 30 after ============
{
  const s = slide(PAPER, "הפציעה – יד (חוסם עורקים) ועין (רסיס). השיקום – ארוך ומתיש, לבד רוב הזמן, בלי משככי כאבים, 3 חודשים בתל השומר. (לא להיכנס לסיבה – זה אישי ולא חלק מההרצאה.) האובדן. החיים שאחרי – המעבר המהיר בין לוחם לפצוע לאזרח. כאן ההרצאה עוברת מסיפור מלחמה לסיפור חיים.", { mark: 74 });
  heading(s, "מה שאף אחד לא מכין אותך אליו", 128, 128, 1664, 90, 64, TXT);
  img(s, "rehab-01.jpg", 128, 250, 580, 740);
  const items = [["pulse", "הפציעה"], ["clock", "השיקום"], ["heart", "האובדן"], ["home", "החיים שאחרי"]];
  items.forEach(([sym, t], i) => {
    const y = 250 + (740 / 4) * i + 92;
    iconChip(s, 1792 - 48, y, 96, sym);
    heading(s, t, 740, y - 50, 924, 100, 60, TXT, { valign: "middle" });
  });
  pnum(s, n, false);
}
// ============ 31 journey ============
{
  const s = slide(INK, "שקף אחד על כל המסע מאז – ממש בקצרה. משפט על כל תמונה, לא יותר. טיולים: הריטריט בפנמה שבו פגשתי אנשים טובים וראיתי שבאמת קיימים כאלה – משם התחלתי לחזור לאנשים. סוסים. טיפוס. סנפלינג. הרצאות.", { mark: 83 });
  heading(s, "מאז", 128, 128, 1664, 90, 72, WHITE);
  const tiles = [["journey-camp.jpg", "טיולים"], ["horses-tile.jpg", "סוסים"], ["climb.jpg", "טיפוס"], ["waterfall.jpg", "סנפלינג"], ["journey-lecture.jpg", "הרצאות"]];
  tiles.forEach(([f, cap], i) => {
    const x = 1792 - 304 - i * (304 + 36);
    img(s, f, x, 270, 304, 520);
    para(s, cap, x, 800, 304, 48, 30, MUTEDL, { align: "center" });
  });
  pnum(s, n);
}
// ============ 32 s05 ============
sectionSlide("05", "מה עושים כשהחיים לא חוזרים להיות מה שהיו?", "מה עושים כשהחיים לא חוזרים להיות מה שהיו – 10 דקות. החלק החדש. עליו הדגש.", 72);
// ============ 33 principles ============
{
  const s = slide(PAPER, "עיקרון 1 – אתה לא שולט במה שקורה לך, אבל אתה כן שולט במה שאתה עושה עם זה. עיקרון 2 – לא חייבים לדעת את כל הדרך. צריך לדעת רק מה הצעד הבא. עיקרון 3 – זהות לא מקבלים. בונים. הפציעה לא מגדירה אותך. העבר לא מגדיר אותך. גם מה שקרה לך לא מגדיר בהכרח את האדם שתהיה. לכל עיקרון: דוגמה אחת מהחיים שלך מאז הפציעה.", { mark: 74 });
  heading(s, "שלושה עקרונות לעבור משבר", 128, 128, 1664, 90, 64, TXT);
  const Pz = [["אתה לא שולט במה שקורה לך", "אבל אתה כן שולט במה שאתה עושה עם זה.", false], ["לא חייבים לדעת את כל הדרך", "צריך לדעת רק מה הצעד הבא.", false], ["זהות לא מקבלים. בונים.", "הפציעה לא מגדירה אותך. העבר לא מגדיר אותך. גם מה שקרה לך לא מגדיר בהכרח את האדם שתהיה.", true]];
  const cw = (1664 - 80) / 3;
  Pz.forEach(([a, b, dark], i) => {
    const x = 1792 - cw - i * (cw + 40);
    rrect(s, x, 266, cw, 654, dark ? INK2 : "FFFFFF", dark ? LINE_D : LINE_L, 20);
    circle(s, x + cw - 48 - 44, 266 + 56 + 44, 88, SAND);
    text(s, String(i + 1), x + cw - 48 - 88, 266 + 56, 88, 88, { fontSize: pt(44), color: INK, align: "center", valign: "middle" });
    heading(s, a, x + 48, 420, cw - 96, 300, 56, dark ? WHITE : TXT, { valign: "middle" });
  });
  pnum(s, n, false);
}
// ============ 33b one slide per principle ============
[
  ["1", "אתה לא שולט במה שקורה לך", "אבל אתה כן שולט במה שאתה עושה עם זה", 96, 72, "עיקרון 1. להגיד את השורה הראשונה, לעצור, ואז את השנייה: 'אבל אתה כן שולט במה שאתה עושה עם זה.' הדוגמה: אני לא בחרתי לחטוף כדור. אבל כששכבתי על הרצפה ורציתי להירדם, אני כן בחרתי לקום ולחזור לתפקד."],
  ["2", "לא חייבים לדעת את כל הדרך", "צריך לדעת רק מה הצעד הבא", 96, 80, "עיקרון 2. הדוגמה: אחרי השיקום לא היה לי מושג מה אני עושה עם החיים שלי. הצעד הראשון היה רק לנסוע לפנמה. משם הגיע הצעד הבא, ואחריו עוד אחד. היום אני לומד, עובד ומרצה."],
  ["3", "זהות לא מקבלים", "בונים", 104, 140, "עיקרון 3. 'זהות לא מקבלים' – לעצור – 'בונים.' הפציעה לא מגדירה אותך. העבר לא מגדיר אותך. גם מה שקרה לך לא מגדיר בהכרח את האדם שתהיה. הדוגמה: בגן הדביקו לי תווית של ילד בעייתי. אחרי השביעי יכולתי לקבל תווית חדשה: הפצוע. בשתי הפעמים בחרתי לבנות את מי שאני בעצמי."],
].forEach(([num, a, b, sa, sb, notes]) => {
  const s = slide(INK, notes);
  text(s, num, 128, 60, 1664, 420, { fontSize: pt(400), bold: true, color: SAND, transparency: 91, fontFace: FH, align: "left", valign: "top" });
  para(s, "עיקרון " + num + " מתוך 3", 128, 330, 1664, 50, 32, SAND, { align: "center" });
  rect(s, 900, 402, 120, 6, SAND);
  const ha = Math.round(sa * 1.3);
  heading(s, a, 128, 430, 1664, ha, sa, WHITE, { align: "center", valign: "middle" });
  heading(s, b, 128, 440 + Math.round(sa * 1.15) + 30, 1664, Math.round(sb * 1.4), sb, SAND, { align: "center", valign: "middle" });
  pnum(s, n);
});
// ============ 34 s06 ============
sectionSlide("06", "להפוך כאב למשהו", "להפוך כאב למשהו – 7 דקות.");
// ============ 35 today ============
{
  const s = slide(PAPER, "לימודים – הנדסאי בניין, ובקרוב יזמות וקיימות באוניברסיטת רייכמן. עבודה – עבדתי בכל מיני עבודות, כל אחת לימדה אותי משהו. הרצאות – לעמוד מול אנשים ולספר, לא בשביל רחמים. קורסים והתנסויות – מיציתי את עצמי עד הקצה: קורסים, טיולים בעולם, ניסיון בכל דבר. שאיפות – יש לי שאיפות גדולות; אני לא יודע את כל הדרך, אני יודע מה הצעד הבא. הרצון להתפתח – לא לעצור, תמיד אפשר להיות יותר טוב. המסר: לא תמיד אפשר לבחור את הסיפור שקיבלת. אפשר לבחור מה אתה עושה איתו.", { mark: 74 });
  heading(s, "מה אני עושה עם זה היום", 128, 100, 1664, 90, 64, TXT);
  const T6 = [["grad", "לימודים", "הנדסאי בניין, ובקרוב – יזמות וקיימות באוניברסיטת רייכמן."], ["tool", "עבודה", "עבדתי בכל מיני עבודות – כל אחת לימדה אותי משהו."], ["users", "הרצאות", "לעמוד מול אנשים ולספר. לא בשביל רחמים."], ["bolt", "קורסים והתנסויות", "מיציתי את עצמי עד הקצה: קורסים, טיולים בעולם, ניסיון בכל דבר."], ["star", "שאיפות", "יש לי שאיפות גדולות. אני לא יודע את כל הדרך – אני יודע מה הצעד הבא."], ["growth", "הרצון להתפתח", "לא לעצור. תמיד אפשר להיות יותר טוב."]];
  const cw = (1664 - 64) / 3, ch = 360;
  T6.forEach(([ic, a, b], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 1792 - cw - col * (cw + 32), y = 220 + row * (ch + 32);
    rrect(s, x, y, cw, ch, "FFFFFF", LINE_L, 20);
    iconChip(s, x + cw / 2, y + 120, 104, ic);
    heading(s, a, x + 24, y + 200, cw - 48, 90, 48, TXT, { align: "center", valign: "middle" });
  });
  pnum(s, n, false);
}
// ============ 36 callback ============
{
  const s = slide(INK, "הסיום – 3 דקות. חוזרים לשאלה מהפתיחה: 'בהתחלה שאלתי אתכם איפה הייתם ב־7 באוקטובר. אף אחד מאיתנו לא בחר את היום הזה.' לעצור. ואז: 'אבל כל אחד מאיתנו' – 'בוחר מה עושים מכאן.' לתת לו רגע לבד. זה המוסר השכל של כל ההרצאה.");
  rule(s, 900, 210);
  para(s, "בהתחלה שאלתי אתכם איפה הייתם ב־7 באוקטובר", 128, 250, 1664, 60, 40, MUTEDL, { align: "center" });
  heading(s, "אף אחד מאיתנו לא בחר את היום הזה", 128, 320, 1664, 110, 72, MUTEDL, { align: "center" });
  para(s, "אבל כל אחד מאיתנו", 128, 520, 1664, 70, 44, WHITE, { align: "center" });
  heading(s, "בוחר מה עושים מכאן", 128, 600, 1664, 170, 110, SAND, { align: "center" });
  pnum(s, n);
}
// ============ 37 decision ============
{
  const s = slide(INK, "שלוש פעמים, אותה החלטה. כיתה י׳: כשהאשימו אותי – החלטתי לכתוב את הסיפור שלי בעצמי. 7.10: כשנפצעתי – החלטתי לתפקד ולהמשיך. היום: כשהחיים לא חזרו למה שהיו – החלטתי לבנות אותם מחדש. כאן סוגרים את המעגל מהפתיחה: 'ההחלטה' לא הייתה רק להמשיך להילחם. ההחלטה הייתה לקחת החלטות ולפעול בחיים של עצמי – כמו שעשיתי כילד, כמו שעשיתי בקרב, כמו שאני עושה היום.");
  heading(s, "ההחלטה הייתה לקחת את ההחלטות בחיים שלי בעצמי", 128, 128, 1664, 100, 60, WHITE, { align: "center" });
  const D = [["כיתה י׳", "כשהאשימו אותי – החלטתי לכתוב את הסיפור שלי בעצמי."], ["7.10", "כשנפצעתי – החלטתי לתפקד ולהמשיך."], ["היום", "כשהחיים לא חזרו למה שהיו – החלטתי לבנות אותם מחדש."]];
  const cw = (1664 - 80) / 3, ch = 320, y = 400;
  D.forEach(([a, b], i) => {
    const x = 1792 - cw - i * (cw + 40);
    rrect(s, x, y, cw, ch, INK2, LINE_D, 20);
    heading(s, a, x + 40, y + 40, cw - 80, ch - 80, 110, SAND, { align: "center", valign: "middle" });
  });
  pnum(s, n);
}
// ============ 38 final ============
{
  const s = slide(SAND, "תודה. לעצור, לא להוסיף כלום. הקהל מצלם את ה-QR.");
  img(s, "final-horse.jpg", 1792 - 620, 128, 620, 824);
  const x = 128, w = 1664 - 620 - 64;
  rule(s, x + w - 120, 260, 120, INK);
  heading(s, "תודה", x, 300, w, 200, 160, INK);
  // contact flush right under the title, QR to its left
  s.addImage({ path: P("qr-instagram.png"), x: px(x + w - 380 - 32 - 200), y: px(660), w: px(200), h: px(200) });
  para(s, "חנוך  |  054-5522053", x + w - 380, 668, 380, 50, 30, BROWN);
  para(s, "Instagram: hanoch234", x + w - 380, 728, 380, 50, 30, BROWN);
  para(s, "hanochgo@gmail.com", x + w - 380, 788, 380, 50, 30, BROWN);
}

const OUT = path.join(__dirname, "hanoch-7-10.pptx");
pres.writeFile({ fileName: OUT }).then(() => console.log("wrote", OUT, n, "slides"));
