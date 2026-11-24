/* Drafting-style diagrams and section hatches for "מלאכות הבנייה".
   All colors come from CSS tokens, so drawings follow the light/dark theme. */
(function () {
  "use strict";

  // ---------- shared defs (patterns, markers), injected once into the page ----------
  var DEFS =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    // concrete: stipple + small triangles (standard section symbol)
    '<pattern id="p-concrete" width="30" height="30" patternUnits="userSpaceOnUse">' +
    '<rect width="30" height="30" class="hp-bg"/>' +
    '<circle cx="4" cy="5" r="1" class="hp-fill"/><circle cx="17" cy="3" r=".8" class="hp-fill"/>' +
    '<circle cx="25" cy="13" r="1" class="hp-fill"/><circle cx="9" cy="17" r=".7" class="hp-fill"/>' +
    '<circle cx="20" cy="24" r=".9" class="hp-fill"/><circle cx="3" cy="27" r=".8" class="hp-fill"/>' +
    '<path d="M11 6 l4 1.5 -3 3 z M22 18 l-3.5 2.5 4 1 z M5 21 l3 -2 1 3.5 z" class="hp"/>' +
    '</pattern>' +
    // earth: clusters of short diagonal strokes
    '<pattern id="p-earth" width="22" height="22" patternUnits="userSpaceOnUse">' +
    '<rect width="22" height="22" class="hp-bg"/>' +
    '<path d="M2 9 l6 -6 M5 11 l6 -6 M8 13 l6 -6 M13 21 l6 -6 M16 23 l6 -6" class="hp-soft"/>' +
    '</pattern>' +
    // gravel / fill: pebbles
    '<pattern id="p-gravel" width="24" height="24" patternUnits="userSpaceOnUse">' +
    '<rect width="24" height="24" class="hp-bg"/>' +
    '<ellipse cx="5" cy="5" rx="3" ry="2.2" class="hp"/><ellipse cx="16" cy="8" rx="2.4" ry="2" class="hp"/>' +
    '<ellipse cx="9" cy="17" rx="3.2" ry="2.4" class="hp"/><ellipse cx="20" cy="19" rx="2" ry="1.6" class="hp"/>' +
    '<circle cx="13" cy="2" r=".9" class="hp-fill"/><circle cx="2" cy="13" r=".8" class="hp-fill"/><circle cx="22" cy="13" r=".8" class="hp-fill"/>' +
    '</pattern>' +
    // masonry: 45 degree hatch
    '<pattern id="p-block" width="9" height="9" patternUnits="userSpaceOnUse">' +
    '<rect width="9" height="9" class="hp-bg"/><path d="M-1 1 l2 -2 M0 9 l9 -9 M8 10 l2 -2" class="hp"/>' +
    '</pattern>' +
    // wood grain
    '<pattern id="p-wood" width="40" height="12" patternUnits="userSpaceOnUse">' +
    '<rect width="40" height="12" class="hp-bg"/>' +
    '<path d="M0 3 q10 -3 20 0 t20 0 M0 9 q10 3 20 0 t20 0" class="hp"/>' +
    '</pattern>' +
    // steel: bars in section
    '<pattern id="p-steel" width="16" height="16" patternUnits="userSpaceOnUse">' +
    '<rect width="16" height="16" class="hp-bg"/><circle cx="8" cy="8" r="4.2" class="hp-ink"/>' +
    '</pattern>' +
    // plaster / sand: fine dots
    '<pattern id="p-plaster" width="8" height="8" patternUnits="userSpaceOnUse">' +
    '<rect width="8" height="8" class="hp-bg"/><circle cx="2" cy="2" r=".75" class="hp-fill"/><circle cx="6" cy="5.5" r=".6" class="hp-fill"/>' +
    '</pattern>' +
    '<pattern id="p-sand" width="12" height="12" patternUnits="userSpaceOnUse">' +
    '<rect width="12" height="12" class="hp-bg"/><circle cx="3" cy="3" r=".7" class="hp-fill"/><circle cx="9" cy="6" r=".6" class="hp-fill"/><circle cx="5" cy="10" r=".6" class="hp-fill"/>' +
    '</pattern>' +
    // waterproofing membrane: dark layers
    '<pattern id="p-membrane" width="14" height="14" patternUnits="userSpaceOnUse">' +
    '<rect width="14" height="14" class="hp-bg"/><rect y="2" width="14" height="3.2" class="hp-ink"/><rect y="9" width="14" height="3.2" class="hp-ink"/>' +
    '</pattern>' +
    // insulation batt: loops
    '<pattern id="p-insulation" width="20" height="28" patternUnits="userSpaceOnUse">' +
    '<rect width="20" height="28" class="hp-bg"/>' +
    '<path d="M0 0 C 20 0, 20 14, 0 14 C 20 14, 20 28, 0 28" class="hp"/>' +
    '</pattern>' +
    // tiles
    '<pattern id="p-tile" width="16" height="16" patternUnits="userSpaceOnUse">' +
    '<rect width="16" height="16" class="hp-bg"/><path d="M0 .5 H16 M.5 0 V16" class="hp"/>' +
    '</pattern>' +
    // paint: brushed bands
    '<pattern id="p-paint" width="24" height="12" patternUnits="userSpaceOnUse">' +
    '<rect width="24" height="12" class="hp-bg"/><path d="M0 3 H24 M0 6 H24" class="hp-soft"/><path d="M0 10 H24" class="hp"/>' +
    '</pattern>' +
    // safety: hazard tape
    '<pattern id="p-safety" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<rect width="20" height="20" class="hp-tape"/><rect width="10" height="20" class="hp-ink"/>' +
    '</pattern>' +
    // general: drafting grid
    '<pattern id="p-general" width="12" height="12" patternUnits="userSpaceOnUse">' +
    '<rect width="12" height="12" class="hp-bg"/><path d="M0 .5 H12 M.5 0 V12" class="hp-soft"/>' +
    '</pattern>' +
    // plaster mesh
    '<pattern id="p-mesh" width="8" height="8" patternUnits="userSpaceOnUse">' +
    '<path d="M0 8 L8 0 M0 0 L8 8" class="hp"/>' +
    '</pattern>' +
    '<marker id="m-flow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
    '<path d="M0 0 L10 5 L0 10 z" class="hp-flow"/></marker>' +
    '<marker id="m-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
    '<path d="M0 1 L10 5 L0 9 z" class="hp-ink"/></marker>' +
    '</defs></svg>';

  var MATERIAL = {
    general: "p-general", earth: "p-earth", gravel: "p-gravel", wood: "p-wood", steel: "p-steel",
    concrete: "p-concrete", block: "p-block", plaster: "p-plaster", membrane: "p-membrane",
    insulation: "p-insulation", tile: "p-tile", paint: "p-paint", safety: "p-safety"
  };
  var MATERIAL_NAME = {
    general: "רשת שרטוט", earth: "קרקע", gravel: "מצע / חצץ", wood: "עץ", steel: "פלדה",
    concrete: "בטון", block: "בנייה", plaster: "טיח", membrane: "איטום",
    insulation: "בידוד", tile: "ריצוף", paint: "צבע", safety: "בטיחות"
  };

  function swatch(material) {
    var id = MATERIAL[material] || "p-general";
    return '<svg width="100%" height="100%" aria-hidden="true">' +
      '<rect width="100%" height="100%" class="hp-bg"/><rect width="100%" height="100%" fill="url(#' + id + ')"/></svg>';
  }

  // ---------- drawing helpers ----------
  // anchor: "r" = text's right edge at x (reads leftward), "l" = left edge at x, "m" = centered.
  function T(x, y, s, a, cls) {
    var anchor = a === "r" ? "start" : a === "l" ? "end" : "middle";
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '" class="lbl' + (cls ? " " + cls : "") + '">' + s + "</text>";
  }
  // text that stays visible in quiz mode (dimensions, symbols)
  function K(x, y, s, a, cls) { return T(x, y, s, a, "keep " + (cls || "")); }
  function ARR(x1, y1, x2, y2, cls) {
    return '<path d="M' + x1 + " " + y1 + " L" + x2 + " " + y2 + '" class="' + (cls || "thin") + '" marker-end="url(#m-arr)"/>';
  }
  function LOADS(x1, x2, y, step) {
    var o = "";
    for (var x = x1; x <= x2 + 0.1; x += step) o += ARR(x, y - 22, x, y - 3);
    return o + P("M" + x1 + " " + (y - 22) + " H" + x2, "thin");
  }
  function PIN(x, y) { return P("M" + x + " " + y + " l-11 18 h22 z", "ln") + P("M" + (x - 16) + " " + (y + 20) + " h32", "ln"); }
  function ROLLER(x, y) { return P("M" + x + " " + y + " l-11 14 h22 z", "ln") + '<circle cx="' + (x - 6) + '" cy="' + (y + 18) + '" r="3.5" class="ln"/><circle cx="' + (x + 6) + '" cy="' + (y + 18) + '" r="3.5" class="ln"/>' + P("M" + (x - 16) + " " + (y + 23) + " h32", "ln"); }
  function FLOW(d) { return '<path d="' + d + '" class="flow" marker-end="url(#m-flow)"/>'; }
  function L(x1, y1, x2, y2) {
    return '<path class="lead" d="M' + x1 + " " + y1 + " L" + x2 + " " + y2 + '"/><circle cx="' + x1 + '" cy="' + y1 + '" r="2.2" class="dot"/>';
  }
  function R(x, y, w, h, fill, cls) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"' +
      (fill ? ' style="fill:url(#' + fill + ')"' : "") + ' class="' + (cls || "ln") + '"/>';
  }
  function P(d, cls, fill) {
    return '<path d="' + d + '" class="' + (cls || "ln") + '"' + (fill ? ' style="fill:url(#' + fill + ')"' : "") + "/>";
  }
  function DIM(x1, y1, x2, y2) {
    return '<path d="M' + x1 + " " + y1 + " L" + x2 + " " + y2 + '" class="thin" marker-start="url(#m-arr)" marker-end="url(#m-arr)"/>';
  }
  // part group: the diagram stepper (COURSE_ANIM) highlights every .pt-N of the listed part numbers
  function G(n, body) { return '<g class="pt pt-' + n + '">' + body + "</g>"; }
  function svg(w, h, body, label) {
    return '<svg class="drawing" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="' + label + '" direction="rtl">' + body + "</svg>";
  }

  // ---------- diagrams ----------
  var D = {};

  D.excavation = {
    title: "חתך: חפירה בשיפוע ותעלה מדופנת",
    draw: function () {
      var b = "";
      // left panel: sloped excavation
      b += R(10, 90, 320, 230, "p-earth", "thin");
      b += P("M60 90 L130 290 L220 290 L290 90 Z", "cut");
      b += P("M10 90 H60 L130 290 H220 L290 90 H330", "ln2");
      b += L(96, 190, 40, 150) + T(36, 146, "שיפוע יציב", "l");
      b += L(258, 180, 300, 140) + T(304, 132, "לפי סוג", "l", "s") + T(304, 147, "הקרקע", "l", "s");
      b += T(175, 335, "חפירה בשיפוע", "m", "h");
      // right panel: shored trench
      b += R(340, 90, 330, 230, "p-earth", "thin");
      b += R(430, 90, 110, 200, null, "cut");
      b += P("M340 90 H430 V290 H540 V90 H670", "ln2");
      b += R(430, 84, 8, 206, "p-wood", "ln");
      b += R(532, 84, 8, 206, "p-wood", "ln");
      b += R(438, 136, 94, 8, null, "soft") + R(438, 136, 94, 8, null, "ln");
      b += R(438, 232, 94, 8, null, "soft") + R(438, 232, 94, 8, null, "ln");
      b += P("M578 90 Q 620 34 662 90 Z", "ln", "p-gravel");
      b += DIM(540, 70, 578, 70) + T(559, 62, "≥ 0.5 מ׳", "m", "m");
      b += L(620, 70, 650, 48) + T(652, 40, "עודפי חפירה", "r", "s");
      b += DIM(452, 92, 452, 288);
      b += T(492, 182, "עומק", "m") + T(492, 199, "מעל 1.20 מ׳", "m");
      b += L(536, 112, 600, 112) + T(604, 116, "דיפון", "l");
      b += L(500, 140, 500, 120) + T(500, 114, "תומכות", "m", "s");
      b += T(505, 335, "תעלה מדופנת", "m", "h");
      return svg(680, 345, b, this.title);
    }
  };

  D.foundations = {
    title: "חתך: יסוד בודד, יסוד עובר וכלונס עם קורת יסוד",
    draw: function () {
      var b = "";
      // ground
      b += R(10, 120, 660, 232, "p-earth", "thin");
      b += P("M10 120 H670", "ln2");
      // pad footing (right)
      b += R(555, 30, 30, 170, "p-concrete") + R(505, 200, 130, 45, "p-concrete") + R(495, 245, 150, 12, null, "soft") + R(495, 245, 150, 12, null, "ln");
      b += L(585, 70, 610, 70) + T(614, 74, "עמוד", "l");
      b += L(570, 251, 570, 276) + T(570, 292, "בטון רזה", "m", "s");
      b += T(570, 372, "יסוד בודד", "m", "h");
      // strip footing (middle)
      b += R(335, 40, 30, 160, "p-block") + R(300, 200, 100, 40, "p-concrete") + R(290, 240, 120, 12, null, "soft") + R(290, 240, 120, 12, null, "ln");
      b += L(365, 80, 390, 80) + T(394, 84, "קיר", "l");
      b += L(350, 246, 350, 272) + T(350, 288, "בטון רזה", "m", "s");
      b += T(350, 372, "יסוד עובר (רצועה)", "m", "h");
      // pile + grade beam (left)
      b += R(105, 30, 30, 90, "p-concrete");
      b += R(20, 120, 200, 45, "p-concrete");
      b += R(20, 165, 83, 20, null, "cut") + R(20, 165, 83, 20, null, "ln") + P("M20 165 L103 185 M20 185 L103 165", "thin");
      b += R(137, 165, 83, 20, null, "cut") + R(137, 165, 83, 20, null, "ln") + P("M137 165 L220 185 M137 185 L220 165", "thin");
      b += R(103, 165, 34, 185, "p-concrete");
      b += T(62, 147, "קורת יסוד", "m");
      b += L(178, 182, 178, 214) + T(178, 230, "ארגז מתכלה", "m");
      b += L(103, 270, 80, 270) + T(76, 274, "כלונס", "r");
      b += T(170, 300, "קרקע תופחת", "m", "s") + T(170, 315, "(חרסית)", "m", "s");
      b += T(120, 372, "כלונס וקורת יסוד", "m", "h");
      return svg(680, 385, b, this.title);
    }
  };

  D.formwork = {
    title: "חתך: טפסנות לתקרה ולקורה",
    draw: function () {
      var b = "";
      b += R(20, 304, 520, 14, "p-concrete", "thin") + P("M14 304 H546", "ln2");
      b += R(40, 60, 500, 26, "p-concrete");
      b += R(40, 86, 50, 64, "p-concrete");
      b += R(98, 86, 442, 8, "p-wood");
      b += R(32, 52, 8, 106, "p-wood") + R(90, 94, 8, 64, "p-wood") + R(32, 150, 66, 8, "p-wood");
      b += R(26, 158, 78, 10, null, "soft") + R(26, 158, 78, 10, null, "ln");
      var x;
      for (x = 118; x <= 530; x += 52) b += R(x, 94, 12, 24, "p-wood");
      b += R(105, 118, 435, 16, "p-wood");
      var props = [65, 200, 340, 480];
      props.forEach(function (px) {
        var top = px === 65 ? 168 : 134;
        b += R(px - 14, top, 28, 4, null, "solid");
        b += R(px - 3, top + 4, 6, 216 - top, null, "ln");
        b += R(px - 6, 214, 12, 86, null, "soft") + R(px - 6, 214, 12, 86, null, "ln");
        b += '<circle cx="' + px + '" cy="219" r="2.4" class="dot"/>';
        b += R(px - 16, 300, 32, 4, null, "solid");
      });
      b += L(520, 73, 552, 73) + T(556, 77, "בטון טרי", "l");
      b += L(530, 90, 552, 95) + T(556, 99, "לביד (דיקט)", "l");
      b += L(528, 108, 552, 118) + T(556, 122, "קורות משניות", "l");
      b += L(535, 128, 552, 142) + T(556, 146, "קורה ראשית", "l");
      b += L(486, 240, 552, 240) + T(556, 238, "פרופסים", "l") + T(556, 254, "(תמוכות טלסקופיות)", "l", "s");
      b += L(94, 140, 118, 186) + T(122, 190, "טפסות צד ותחתית לקורה", "l");
      b += T(280, 330, "רצפה / תקרה תחתונה", "m", "s");
      return svg(680, 340, b, this.title);
    }
  };

  D["rebar-cover"] = {
    title: "חתך קורה: ברזל זיון וכיסוי בטון",
    draw: function () {
      var b = "";
      b += R(250, 30, 180, 320, "p-concrete", "ln2");
      b += '<rect x="274" y="54" width="132" height="272" rx="8" class="ln2" style="stroke-width:3"/>';
      b += P("M376 54 L362 70 M406 80 L392 94", "ln2");
      [290, 390].forEach(function (cx) { b += '<circle cx="' + cx + '" cy="65" r="7" class="solid"/>'; });
      [292, 340, 388].forEach(function (cx) { b += '<circle cx="' + cx + '" cy="315" r="9" class="solid"/>'; });
      b += P("M330 350 L334 329 L346 329 L350 350 Z", "ln") + P("M330 350 L334 329 L346 329 L350 350 Z", "soft");
      // compression / tension zones
      b += P("M238 34 H232 V160 H238", "thin") + T(226, 92, "אזור לחוץ", "r") + T(226, 108, "הבטון עובד", "r", "s");
      b += P("M238 200 H232 V326 H238", "thin") + T(226, 258, "אזור מתוח", "r") + T(226, 274, "הפלדה עובדת", "r", "s");
      b += DIM(244, 327, 244, 349) + P("M240 326 H274", "dash") + T(226, 343, "כיסוי בטון", "r");
      b += L(397, 65, 462, 66) + T(466, 70, "מוטות עליונים", "l");
      b += L(406, 160, 462, 160) + T(466, 158, "חישוק סגור", "l") + T(466, 174, "וו כפוף 135°", "l", "s");
      b += L(397, 315, 462, 312) + T(466, 309, "מוטות תחתונים", "l") + T(466, 325, "זיון ראשי", "l", "s");
      b += L(346, 344, 462, 352) + T(466, 356, "ספייסר (מרחק)", "l");
      return svg(680, 370, b, this.title);
    }
  };

  D["slab-types"] = {
    title: "חתכים: תקרה מקשית, תקרת צלעות ולוחות חלולים",
    draw: function () {
      var b = "", x;
      // solid
      b += R(20, 40, 480, 36, "p-concrete");
      b += T(668, 56, "תקרה מקשית", "r", "h") + T(668, 74, "בטון מלא בכל העובי", "r", "s");
      // ribbed
      b += R(20, 140, 480, 14, "p-concrete");
      for (x = 20; x < 500; x += 80) {
        b += R(x, 154, 18, 36, "p-concrete");
        if (x + 18 < 500) b += R(x + 18, 154, Math.min(62, 482 - x), 34, "p-block");
      }
      b += L(60, 171, 60, 210) + T(60, 225, "בלוק", "m", "s");
      b += L(109, 186, 125, 214) + T(130, 225, "צלע", "m", "s");
      b += T(668, 160, "תקרת צלעות", "r", "h") + T(668, 178, "צלעות בטון ובלוקים ביניהן", "r", "s");
      // hollow core
      b += R(20, 250, 480, 12, "p-concrete");
      [20, 180, 340].forEach(function (px) {
        b += R(px, 262, 156, 40, "p-concrete");
        for (var c = px + 20; c < px + 150; c += 29) b += '<circle cx="' + c + '" cy="282" r="12" class="cut"/><circle cx="' + c + '" cy="282" r="12" class="ln"/>';
      });
      b += L(178, 300, 178, 322) + T(178, 336, "מישק יציקה", "m", "s");
      b += L(470, 256, 470, 236) + T(470, 230, "טופינג", "m", "s");
      b += T(668, 268, "לוחות חלולים טרומיים", "r", "h") + T(668, 286, "ומעליהם בטון טופינג", "r", "s");
      return svg(680, 350, b, this.title);
    }
  };

  D["block-wall"] = {
    title: "חזית קיר בלוקים: קשר, חגורה, משקוף ועמודון",
    draw: function () {
      var b = "", y, x, row = 0;
      var wl = 170, wr = 614, wt = 68, wb = 380, bw = 52, bh = 26;
      b += R(wl, 38, 490, 24, "p-concrete");
      b += R(wl, 62, wr - wl, 6, null, "soft") + R(wl, 62, wr - wl, 6, null, "dash");
      b += R(wl, wb, 490, 16, "p-concrete");
      b += '<clipPath id="cw"><rect x="' + wl + '" y="' + wt + '" width="' + (wr - wl) + '" height="' + (wb - wt) + '"/></clipPath><g clip-path="url(#cw)">';
      for (y = wb - bh; y >= wt - bh; y -= bh) {
        var off = row % 2 ? -bw / 2 : 0;
        for (x = wl + off; x < wr; x += bw) b += '<rect x="' + x + '" y="' + y + '" width="' + bw + '" height="' + bh + '" class="thin" style="fill:var(--surface-2)"/>';
        row++;
      }
      b += "</g>";
      b += R(250, 224, 90, 156, null, "cut") + R(250, 224, 90, 156, null, "ln");
      b += T(295, 310, "פתח", "m", "s");
      b += R(230, 198, 130, 26, "p-concrete");
      b += R(wl, 120, wr - wl, 26, "p-concrete");
      b += R(wr, wt - 6, 26, wb - wt + 6, "p-concrete");
      b += DIM(230, 236, 250, 236) + DIM(340, 236, 360, 236);
      // labels (left column)
      b += L(176, 50, 150, 50) + T(12, 54, "תקרה", "l");
      b += L(178, 65, 150, 78) + T(12, 82, "מרווח למילוי גמיש", "l");
      b += L(180, 133, 150, 133) + T(12, 137, "חגורה", "l");
      b += L(232, 211, 150, 205) + T(12, 205, "משקוף", "l") + T(12, 221, "נכנס כ-15–20 ס״מ לכל צד", "l", "s");
      b += L(196, 289, 150, 290) + T(12, 290, "בנייה בקשר", "l") + T(12, 306, "הסטה של חצי בלוק", "l", "s");
      b += L(222, 341, 150, 345) + T(12, 349, "מישק כ-1 ס״מ", "l");
      b += L(630, 300, 652, 300) + T(656, 304, "עמודון", "l");
      return svg(706, 410, b, this.title);
    }
  };

  D["plaster-layers"] = {
    title: "חתך שכבות הטיח, ורשת במפגש בטון ובלוקים",
    draw: function () {
      var b = "", y, x, row = 0;
      // stepped section
      b += R(240, 30, 80, 280, "p-block");
      b += R(232, 60, 8, 250, "p-plaster");
      b += R(208, 110, 24, 200, "p-sand");
      b += R(202, 160, 6, 150, null, "soft") + R(202, 160, 6, 150, null, "ln");
      b += L(270, 44, 186, 44) + T(180, 48, "בלוק / בטון", "r");
      b += L(236, 80, 186, 80) + T(180, 77, "הרבצה", "r") + T(180, 93, "אחיזה לרקע", "r", "s");
      b += L(220, 130, 186, 130) + T(180, 127, "שכבה מיישרת", "r") + T(180, 143, "מישוריות ועובי", "r", "s");
      b += L(205, 180, 186, 180) + T(180, 177, "שכבת גמר (שליכט)", "r") + T(180, 193, "משטח חלק לצבע", "r", "s");
      b += DIM(202, 322, 240, 322) + T(196, 326, "פנים: כ-1.5–2 ס״מ", "r", "s");
      // junction elevation
      b += '<clipPath id="cj"><rect x="370" y="30" width="150" height="280"/></clipPath><g clip-path="url(#cj)">';
      for (y = 284; y >= 30 - 26; y -= 26) {
        var off = row % 2 ? -26 : 0;
        for (x = 370 + off; x < 520; x += 52) b += '<rect x="' + x + '" y="' + y + '" width="52" height="26" class="thin" style="fill:var(--surface-2)"/>';
        row++;
      }
      b += "</g>";
      b += R(520, 30, 90, 280, "p-concrete");
      b += R(490, 30, 60, 280, "p-mesh", "dash");
      b += T(445, 175, "בלוקים", "m") + T(570, 175, "עמוד בטון", "m");
      b += L(520, 60, 520, 18) + T(526, 22, "רשת לטיח על המפגש", "l");
      b += T(520, 330, "כ-15–20 ס״מ לכל צד", "m", "s");
      return svg(680, 340, b, this.title);
    }
  };

  D["roof-section"] = {
    title: "חתך גג שטוח במפגש עם המעקה",
    draw: function () {
      var b = "";
      b += R(20, 230, 580, 40, "p-concrete");
      b += R(560, 40, 40, 190, "p-concrete");
      b += P("M74 230 L74 222 L560 196 L560 230 Z", "ln", "p-sand");
      b += P("M74 222 L560 196", "dash");
      b += P("M537 197.3 L560 172 L560 196 Z", "ln", "p-sand");
      b += '<path d="M74 219 L536 194.2 L556 172 L556 110" class="ln2" style="stroke-width:3"/>';
      b += '<path d="M74 215 L533 190.6 L552 170 L552 104" class="ln2" style="stroke-width:3"/>';
      b += P("M74 212 L528 187.6 L528 180.4 L74 205 Z", "ln") + P("M74 212 L528 187.6 L528 180.4 L74 205 Z", "soft");
      b += R(548, 98, 12, 10, null, "solid") + P("M548 98 L560 98 L560 88 Z", "soft") + P("M548 98 L560 98 L560 88 Z", "ln");
      // drain
      b += P("M34 222 L46 236 V300 M74 222 L64 236 V300", "ln2");
      b += R(46, 236, 18, 64, null, "cut");
      b += L(580, 64, 606, 50) + T(610, 54, "מעקה", "l");
      b += L(554, 130, 470, 92) + T(466, 96, "הגבהת האיטום על המעקה", "r");
      b += L(554, 100, 520, 62) + T(516, 66, "סרגל קיבוע + מסטיק", "r");
      b += L(550, 184, 500, 150) + T(496, 154, "רולקה", "r");
      b += L(330, 203, 330, 128) + T(330, 120, "יריעות ביטומניות (2 שכבות)", "m");
      b += L(220, 210, 220, 166) + T(220, 158, "פריימר", "m");
      b += L(120, 207, 120, 176) + T(120, 168, "שכבת הגנה", "m");
      b += L(430, 214, 430, 292) + T(430, 308, "בטון שיפועים: שיפוע לכיוון הנקז", "m");
      b += T(300, 256, "תקרה", "m");
      b += L(55, 290, 96, 300) + T(100, 304, "נקז", "l");
      return svg(680, 320, b, this.title);
    }
  };

  D.drywall = {
    title: "חזית מחיצת גבס בחיתוך: מסלולים, ניצבים, בידוד ולוחות",
    draw: function () {
      var b = "";
      b += R(150, 14, 500, 22, "p-concrete");
      b += R(150, 340, 500, 14, "p-concrete", "thin") + P("M150 340 H650", "ln2");
      [[170, 250], [260, 340], [350, 430]].forEach(function (bay) { b += R(bay[0], 46, bay[1] - bay[0], 284, "p-insulation", "thin"); });
      [160, 250, 340, 430, 520, 610].forEach(function (sx) { b += R(sx, 46, 10, 284, null, "soft") + R(sx, 46, 10, 284, null, "ln"); });
      b += R(150, 36, 500, 10, null, "soft") + R(150, 36, 500, 10, null, "ln");
      b += R(150, 330, 500, 10, null, "soft") + R(150, 330, 500, 10, null, "ln");
      b += R(435, 46, 215, 284, null, "cut") + R(435, 46, 215, 284, null, "ln");
      b += P("M435 46 L430 90 L438 140 L430 200 L438 260 L431 330", "ln");
      b += R(518, 46, 14, 284, "p-plaster", "thin");
      b += DIM(165, 64, 255, 64) + T(210, 82, "40–60 ס״מ", "m", "m");
      b += L(152, 25, 142, 25) + T(12, 29, "תקרה", "l");
      b += L(156, 41, 142, 52) + T(12, 56, "מסלול עליון (U)", "l");
      b += L(166, 120, 142, 120) + T(12, 124, "ניצב (C)", "l");
      b += L(200, 190, 142, 190) + T(12, 194, "צמר סלעים", "l");
      b += L(156, 335, 142, 320) + T(12, 324, "מסלול תחתון (U)", "l");
      b += T(480, 200, "לוח גבס", "m");
      b += L(525, 120, 585, 100) + T(589, 96, "סרט שריון", "l", "s") + T(589, 111, "+ שפכטל", "l", "s");
      return svg(680, 362, b, this.title);
    }
  };

  D["floor-section"] = {
    title: "חתך ריצוף, ושיפוע לנקז בחדר רטוב",
    draw: function () {
      var b = "", x;
      b += R(600, 20, 40, 216, "p-block");
      b += R(20, 236, 620, 40, "p-concrete");
      b += R(20, 176, 580, 60, "p-sand");
      b += R(20, 150, 580, 26, "p-plaster");
      b += R(20, 146, 580, 4, null, "solid");
      for (x = 20; x < 588; x += 76) {
        var w = Math.min(72, 588 - x);
        b += R(x, 128, w, 18, null, "soft") + R(x, 128, w, 18, null, "ln");
        if (x + 72 < 588) b += R(x + 72, 128, 4, 18, null, "solid");
      }
      b += R(592, 100, 8, 28, null, "soft") + R(592, 100, 8, 28, null, "ln");
      b += L(57, 137, 57, 62) + T(57, 54, "אריח", "m");
      b += L(94, 133, 140, 84) + T(140, 76, "מישק + רובה", "m");
      b += L(230, 148, 236, 104) + T(236, 96, "דבק", "m");
      b += L(330, 163, 340, 62) + T(340, 54, "שכבת טיט / מדה", "m");
      b += L(590, 140, 470, 96) + T(466, 92, "מישק היקפי", "r");
      b += L(596, 106, 560, 62) + T(556, 54, "פנל", "r");
      b += T(300, 212, "מצע חול", "m");
      b += T(300, 262, "תקרה", "m");
      // wet room strip
      b += T(668, 314, "חדר רטוב", "r", "h");
      b += P("M560 330 L120 352", "ln2");
      b += '<path d="M480 318 L300 327" class="thin" marker-end="url(#m-arr)"/>';
      b += T(390, 314, "שיפוע לכיוון הנקז", "m", "s");
      b += P("M120 352 L100 352 M96 352 V372 M124 352 V372", "ln") + R(100, 348, 20, 6, null, "solid");
      b += T(110, 390, "נקז", "m", "s");
      return svg(680, 398, b, this.title);
    }
  };


  // ================= course diagrams (teaching illustrations; labels follow the course slides)
  D["load-path"] = {
    title: "מסלול העברת העומסים בשלד: תקרה, קורה, עמוד, יסוד, קרקע",
    src: ["rec3-01", "rec3-02"],
    parts: [{ n: 1, name: "תקרה", x: 590, y: 76 }, { n: 2, name: "קורה", x: 420, y: 92 }, { n: 3, name: "עמוד", x: 500, y: 270 }, { n: 4, name: "יסוד", x: 545, y: 346 }, { n: 5, name: "קרקע", x: 630, y: 378 }],
    draw: function () {
      var b = "";
      b += G(5, R(10, 330, 660, 62, "p-earth", "thin") + P("M10 330 H670", "ln2"));
      b += G(4, R(130, 330, 100, 30, "p-concrete") + R(450, 330, 100, 30, "p-concrete"));
      b += G(3, R(168, 70, 24, 260, "p-concrete") + R(488, 70, 24, 260, "p-concrete"));
      b += G(1, R(60, 70, 560, 12, "p-concrete") + R(60, 190, 560, 12, "p-concrete"));
      b += G(2, R(168, 82, 344, 20, "p-concrete") + R(168, 202, 344, 20, "p-concrete"));
      b += G(1, LOADS(80, 600, 66, 40));
      b += G(1, FLOW("M340 70 V96")) + G(2, FLOW("M330 92 H210")) + G(3, FLOW("M180 110 V180") + FLOW("M180 225 V318")) + G(4, FLOW("M180 342 V384"));
      b += K(28, 120, "מסלול", "l", "s") + K(28, 135, "העומס", "l", "s") + '<path d="M70 150 H30" class="flow" marker-end="url(#m-flow)"/>';
      b += G(1, L(600, 76, 640, 56) + T(644, 52, "תקרה", "l"));
      b += G(2, L(430, 92, 455, 120) + T(459, 132, "קורה", "l"));
      b += G(3, L(512, 270, 560, 270) + T(564, 274, "עמוד", "l"));
      b += G(4, L(550, 346, 600, 346) + T(604, 350, "יסוד", "l"));
      b += G(5, T(560, 386, "קרקע", "m"));
      return svg(680, 398, b, this.title);
    }
  };

  D["column-strabe"] = {
    title: "עמוד שטראבה: תכנית וחזית, שיני קשר ושני צדי טפסנות",
    src: ["rec3-04", "rec3-05"],
    parts: [{ n: 1, name: "קיר בלוקים", x: 120, y: 175 }, { n: 2, name: "שיני קשר", x: 566, y: 154 }, { n: 3, name: "עמוד בטון יצוק", x: 600, y: 248 }, { n: 4, name: "טפסנות", x: 286, y: 178 }, { n: 5, name: "זיון (מוטות וחישוקים)", x: 246, y: 166 }],
    draw: function () {
      var b = "", y, row = 0, x;
      // plan
      b += R(60, 155, 170, 40, "p-block") + R(235, 200, 40, 130, "p-block");
      b += R(230, 150, 50, 50, "p-concrete", "ln2");
      b += R(230, 158, 12, 34, null, "dash") + R(238, 188, 34, 12, null, "dash");
      b += R(222, 140, 66, 8, "p-wood") + R(282, 142, 8, 66, "p-wood");
      b += '<rect x="238" y="158" width="34" height="34" rx="3" class="ln"/>';
      [[241, 161], [269, 161], [241, 189], [269, 189]].forEach(function (p) { b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3" class="solid"/>'; });
      b += L(120, 175, 120, 120) + T(120, 112, "קיר בלוקים", "m");
      b += L(288, 175, 320, 175) + T(316, 160, "טפסנות", "l");
      b += T(316, 192, "בשני צדדים", "l", "s");
      b += L(255, 205, 300, 250) + T(300, 266, "הבלוקים סוגרים", "m", "s") + T(300, 281, "את שני הצדדים האחרים", "m", "s");
      b += K(170, 360, "תכנית (מבט מלמעלה)", "m", "h");
      // elevation
      b += '<clipPath id="cs"><rect x="380" y="60" width="200" height="270"/></clipPath><g clip-path="url(#cs)">';
      for (y = 310; y >= 40; y -= 20) {
        var off = row % 2 ? -20 : 0;
        for (x = 380 + off; x < 560; x += 40) b += '<rect x="' + x + '" y="' + y + '" width="40" height="20" class="thin" style="fill:var(--surface-2)"/>';
        row++;
      }
      b += "</g>";
      b += R(560, 60, 50, 270, "p-concrete");
      for (y = 70, row = 0; y < 330; y += 20, row++) if (row % 2 === 0) b += '<rect x="556" y="' + y + '" width="20" height="20" class="thin" style="fill:var(--surface-2)"/>';
      b += P("M584 60 V330 M600 60 V330", "ln2");
      for (y = 80; y < 330; y += 40) b += P("M580 " + y + " H604", "thin");
      b += L(566, 150, 626, 120) + T(630, 112, "שיני קשר", "l") + T(630, 128, "VERZAHNUNG", "l", "m") + T(630, 142, "LINK TEETH", "l", "m");
      b += L(600, 248, 626, 248) + T(630, 252, "עמוד בטון", "l");
      b += L(470, 200, 470, 350) + T(470, 364, "קיר בלוקים", "m", "s");
      b += K(520, 46, "חזית: בליטות ושקעים לסירוגין", "m", "h");
      return svg(720, 372, b, this.title);
    }
  };

  D["column-isolated"] = {
    title: "עמוד משולב בקיר לעומת עמוד בדל (תכנית)",
    src: ["rec3-04", "rec3-06"],
    parts: [{ n: 1, name: "עמוד משולב בקיר", x: 175, y: 150 }, { n: 2, name: "קיר בלוקים", x: 80, y: 150 }, { n: 3, name: "עמוד בדל", x: 510, y: 150 }, { n: 4, name: "חלל פתוח", x: 590, y: 220 }],
    draw: function () {
      var b = "";
      b += R(40, 130, 260, 40, "p-block") + R(150, 124, 50, 52, "p-concrete", "ln2");
      b += L(175, 150, 175, 96) + T(175, 88, "עמוד משולב בקיר", "m");
      b += L(80, 150, 80, 210) + T(80, 226, "קיר בלוקים", "m");
      b += T(170, 280, "עמוד בתוך קיר", "m", "h");
      b += R(380, 50, 260, 200, null, "ln2") + R(380, 50, 260, 200, null, "cut") + R(380, 50, 260, 200, null, "ln2");
      b += '<circle cx="510" cy="150" r="58" class="dash"/>';
      b += R(495, 135, 30, 30, "p-concrete", "ln2");
      b += L(525, 140, 560, 100) + T(564, 96, "עמוד בדל", "l");
      b += T(564, 112, "ISOLATED COLUMN", "l", "m") + T(564, 126, "DISENGAGED COLUMN", "l", "m");
      b += T(590, 232, "חלל פתוח", "m", "s");
      b += T(510, 280, "עמוד עצמאי בחלל", "m", "h");
      return svg(700, 292, b, this.title);
    }
  };

  D["beam-positions"] = {
    title: "חתכים: קורה יורדת, קורה עולה וקורה סמויה",
    src: ["rec3-12", "rec3-13", "rec3-14"],
    parts: [{ n: 1, name: "קורה יורדת", x: 570, y: 185 }, { n: 2, name: "קורה עולה", x: 350, y: 84 }, { n: 3, name: "קורה סמויה", x: 130, y: 132 }, { n: 4, name: "תקרה (פלטה)", x: 640, y: 132 }],
    draw: function () {
      var b = "";
      // downstand
      b += R(470, 120, 200, 24, "p-concrete") + R(550, 144, 40, 76, "p-concrete");
      b += P("M550 120 V144 M590 120 V144", "dash");
      b += DIM(604, 120, 604, 220) + K(616, 175, "h", "m", "m") + DIM(550, 234, 590, 234) + K(570, 250, "b", "m", "m");
      b += T(570, 280, "קורה יורדת", "m", "h");
      b += T(570, 296, "DROPPED / DOWNSTAND BEAM", "m", "m");
      // upstand
      b += R(250, 120, 200, 24, "p-concrete") + R(330, 50, 40, 70, "p-concrete");
      b += P("M330 120 V144 M370 120 V144", "dash");
      b += DIM(384, 50, 384, 144) + K(396, 100, "h", "m", "m") + DIM(330, 36, 370, 36) + K(350, 30, "b", "m", "m");
      b += T(350, 280, "קורה עולה", "m", "h");
      // hidden
      b += R(30, 120, 200, 24, "p-concrete");
      b += R(80, 120, 100, 24, null, "ln2") + P("M80 120 V144 M180 120 V144", "ln2");
      [92, 108, 124, 140, 156, 168].forEach(function (x) { b += '<circle cx="' + x + '" cy="138" r="2.6" class="solid"/><circle cx="' + x + '" cy="126" r="2.2" class="solid"/>'; });
      b += DIM(80, 162, 180, 162) + K(130, 178, "b רחב", "m", "m");
      b += DIM(194, 120, 194, 144) + K(212, 136, "h", "m", "m");
      b += T(130, 280, "קורה סמויה", "m", "h");
      b += T(130, 296, "HIDDEN / CONCEALED BEAM", "m", "m");
      b += L(640, 132, 650, 96) + T(650, 88, "תקרה", "m", "s");
      return svg(680, 304, b, this.title);
    }
  };

  D["beam-statics"] = {
    title: "סכמות סטטיות: קורה על שני סמכים, קורה רציפה, קורה זיזית",
    src: ["rec3-15"],
    parts: [{ n: 1, name: "קורה על שני סמכים", x: 250, y: 72 }, { n: 2, name: "קורה רציפה", x: 145, y: 192 }, { n: 3, name: "קורה זיזית (קונסולית)", x: 250, y: 312 }, { n: 4, name: "סמך", x: 440, y: 92 }, { n: 5, name: "רתימה (קצה קבוע)", x: 50, y: 338 }],
    draw: function () {
      var b = "";
      b += LOADS(60, 440, 68, 38) + P("M60 72 H440", "ln2") + '<path d="M60 72 H440" class="ln2" style="stroke-width:5"/>' + PIN(60, 74) + ROLLER(440, 74);
      b += T(668, 66, "קורה על שני סמכים", "r", "h") + T(668, 84, "SIMPLE BEAM", "r", "m") + T(668, 102, "נשענת בשני קצותיה בלבד", "r", "s");
      b += LOADS(40, 460, 188, 42) + '<path d="M40 192 H460" class="ln2" style="stroke-width:5"/>' + PIN(40, 194) + PIN(250, 194) + PIN(460, 194);
      b += T(668, 186, "קורה רציפה", "r", "h") + T(668, 204, "CONTINUOUS BEAM", "r", "m") + T(668, 222, "נשענת על יותר משני סמכים", "r", "s");
      b += R(28, 270, 22, 86, "p-concrete") + LOADS(60, 380, 308, 40) + '<path d="M50 312 H380" class="ln2" style="stroke-width:5"/>';
      b += T(668, 306, "קורה זיזית / קונסולית", "r", "h") + T(668, 324, "CANTILEVER BEAM", "r", "m") + T(668, 342, "רתומה בקצה אחד וחופשית בשני", "r", "s");
      b += L(380, 312, 410, 340) + T(414, 352, "קצה חופשי", "l", "s");
      return svg(680, 366, b, this.title);
    }
  };

  D["beam-parts"] = {
    title: "חלקים אופייניים בקורת בטון מזוין (חזית ליד סמך, וחתך)",
    src: ["rec3-16"],
    parts: [{ n: 1, name: "זיון תחתון", x: 230, y: 216 }, { n: 2, name: "זיון עליון", x: 100, y: 112 }, { n: 3, name: "זיון באזורי תמיכה", x: 330, y: 112 }, { n: 4, name: "חישוקים", x: 150, y: 165 }, { n: 5, name: "טפסות תחתונות וצדדיות", x: 230, y: 240 }, { n: 6, name: "בטון", x: 520, y: 165 }],
    draw: function () {
      var b = "", x;
      // elevation near an interior support (column)
      b += R(40, 100, 400, 130, "p-concrete");
      b += R(300, 230, 60, 100, "p-concrete");
      b += R(40, 230, 260, 10, "p-wood") + R(360, 230, 80, 10, "p-wood");
      b += P("M50 216 H430", "ln2") + P("M200 112 H430", "ln2");
      b += '<path d="M200 112 H430" class="ln2" style="stroke-width:3.2"/>';
      b += P("M50 112 H200", "dash");
      for (x = 60; x <= 430; x += (x > 250 ? 20 : 34)) b += P("M" + x + " 108 V220", "thin");
      b += K(240, 350, "חזית הקורה ליד סמך פנימי", "m", "h");
      b += L(100, 112, 100, 70) + T(100, 62, "זיון עליון", "m");
      b += L(330, 112, 330, 70) + T(330, 54, "זיון באזורי תמיכה", "m") + T(330, 70, "(מעל הסמך, למעלה)", "m", "s");
      b += L(150, 165, 120, 290) + T(120, 304, "חישוקים", "m");
      b += L(230, 216, 220, 270) + T(220, 286, "זיון תחתון", "m");
      b += L(400, 240, 440, 290) + T(440, 304, "טפסות תחתונות", "m", "s") + T(440, 319, "וצדדיות", "m", "s");
      // section
      b += R(490, 90, 120, 180, "p-concrete", "ln2");
      b += R(482, 90, 8, 188, "p-wood") + R(610, 90, 8, 188, "p-wood") + R(482, 270, 136, 8, "p-wood");
      b += '<rect x="506" y="106" width="88" height="148" rx="6" class="ln2"/>';
      [[516, 116], [584, 116]].forEach(function (p) { b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" class="solid"/>'; });
      [[516, 244], [550, 244], [584, 244]].forEach(function (p) { b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="6.5" class="solid"/>'; });
      b += DIM(474, 254, 474, 270) + K(466, 266, "c", "r", "m");
      b += K(550, 300, "חתך", "m", "h");
      b += L(520, 165, 640, 165) + T(644, 169, "בטון", "l");
      return svg(680, 362, b, this.title);
    }
  };

  D["prestress-steps"] = {
    title: "עקרון הבטון הדרוך: קורה רגילה לעומת קורה דרוכה",
    src: ["rec3-16", "rec3-24"],
    // one part per stage panel (for the stepper only; not used for "identify" questions)
    parts: [{ n: 1, name: "קורה רגילה", x: 270, y: 52 }, { n: 2, name: "דריכה", x: 270, y: 152 }, { n: 3, name: "שחרור", x: 270, y: 246 }, { n: 4, name: "איזון", x: 270, y: 350 }],
    noQuiz: true,
    draw: function () {
      var b = "";
      function beam(y, curve, label, sub) {
        var o = '<path d="M60 ' + y + " Q270 " + (y + curve) + " 480 " + y + " L480 " + (y + 24) + " Q270 " + (y + 24 + curve) + " 60 " + (y + 24) + ' Z" class="ln" style="fill:url(#p-concrete)"/>';
        return o + T(668, y + 16, label, "r", "h") + (sub ? T(270, y + 50 + Math.max(0, curve), sub, "m", "s") : "");
      }
      b += G(1, LOADS(90, 450, 38, 45) + beam(40, 22, "קורה רגילה", "העומס יוצר מומנט כפיפה: הקורה שוקעת באמצע"));
      b += G(2, beam(140, 0, "בטון דרוך: דריכה", "הכבלים נמתחים לפני ההעמסה") +
        '<path d="M70 156 Q270 168 470 156" class="ln2" style="stroke-width:3;stroke-dasharray:6 4"/>' + ARR(480, 156, 520, 156, "ln") + ARR(60, 156, 20, 156, "ln"));
      b += G(3, beam(240, -18, "שחרור", "מומנט כפיפה הפוך: הקורה מתרוממת מעט") + ARR(260, 240, 260, 220, "ln") + ARR(280, 240, 280, 220, "ln"));
      b += G(4, LOADS(90, 450, 336, 45) + beam(338, 0, "איזון", "העומס והדריכה מאזנים זה את זה"));
      return svg(680, 404, b, this.title);
    }
  };

  D["slab-bending"] = {
    title: "תקרה תחת עומס: לחיצה למעלה, מתיחה למטה, הזיון באזור המתיחה",
    src: ["rec3-19"],
    parts: [{ n: 1, name: "אזור הלחיצה", x: 340, y: 128 }, { n: 2, name: "אזור המתיחה", x: 340, y: 160 }, { n: 3, name: "זיון ראשי (במתיחה)", x: 470, y: 152 }, { n: 4, name: "סמך", x: 600, y: 160 }],
    draw: function () {
      var b = "";
      b += LOADS(80, 600, 96, 40);
      b += '<path d="M60 100 Q340 150 620 100 L620 134 Q340 184 60 134 Z" class="ln" style="fill:url(#p-concrete)"/>';
      b += '<path d="M70 126 Q340 175 610 126" class="ln2" style="stroke-width:3.4"/>';
      b += PIN(80, 136) + PIN(600, 136);
      b += ARR(300, 118, 330, 122, "ln") + ARR(380, 118, 350, 122, "ln");
      b += ARR(330, 162, 296, 158, "ln") + ARR(350, 162, 384, 158, "ln");
      b += L(340, 124, 340, 52) + T(340, 46, "לחיצה בחלק העליון", "m");
      b += L(340, 166, 300, 222) + T(300, 236, "מתיחה בחלק התחתון", "m");
      b += L(470, 152, 520, 222) + T(520, 236, "פלדת הזיון באזור המתיחה", "m");
      b += K(110, 236, "בטון: חזק בלחיצה, חלש מאוד במתיחה", "m", "s");
      return svg(680, 250, b, this.title);
    }
  };

  D["one-way-slab"] = {
    title: "תקרה מתוחה בכיוון אחד: עומס בכיוון המפתח הקצר, זיון ראשי וזיון חלוקה",
    src: ["rec3-19"],
    parts: [{ n: 1, name: "זיון ראשי", x: 200, y: 160 }, { n: 2, name: "זיון חלוקה", x: 300, y: 200 }, { n: 3, name: "קורה תומכת", x: 470, y: 74 }, { n: 4, name: "המפתח הקצר", x: 562, y: 160 }],
    draw: function () {
      var b = "", x, y;
      b += R(140, 80, 400, 160, null, "soft") + R(140, 80, 400, 160, null, "ln");
      b += R(130, 68, 420, 12, "p-concrete") + R(130, 240, 420, 12, "p-concrete");
      for (x = 160; x < 540; x += 20) b += P("M" + x + " 84 V236", "thin");
      for (y = 120; y < 236; y += 40) b += P("M144 " + y + " H536", "dash");
      [240, 440].forEach(function (x2) { b += '<path d="M' + x2 + ' 100 V220" class="flow" marker-start="url(#m-flow)" marker-end="url(#m-flow)"/>'; });
      b += DIM(140, 48, 540, 48) + K(340, 40, "המפתח הארוך", "m", "s") + K(400, 40, "y_L", "m", "m");
      b += DIM(562, 80, 562, 240) + K(574, 164, "x_L", "r", "m");
      b += T(610, 150, "המפתח", "m", "s") + T(610, 166, "הקצר", "m", "s");
      b += L(200, 160, 80, 140) + T(76, 136, "זיון ראשי", "r") + T(76, 152, "בכיוון הקצר", "r", "s");
      b += L(300, 200, 80, 210) + T(76, 206, "זיון חלוקה", "r") + T(76, 222, "בכיוון הניצב", "r", "s");
      b += L(470, 74, 500, 30) + T(504, 26, "קורה / קיר נושא", "l", "s");
      b += K(340, 280, "y_L / x_L > 2", "m", "h");
      b += K(340, 298, "(או: התקרה נשענת על שתי קורות מקבילות בלבד)", "m", "s");
      return svg(680, 308, b, this.title);
    }
  };

  D["ribbed-slab"] = {
    title: "חתך תקרת צלעות: פלטה עליונה, צלעות וגופי מילוי",
    src: ["rec3-21", "rec3-22"],
    parts: [{ n: 1, name: "פלטת בטון עליונה", x: 600, y: 90 }, { n: 2, name: "צלע", x: 292, y: 140 }, { n: 3, name: "גוף מילוי", x: 220, y: 140 }, { n: 4, name: "זיון בצלע", x: 292, y: 162 }],
    draw: function () {
      var b = "", x;
      b += R(40, 80, 560, 20, "p-concrete");
      for (x = 40; x < 600; x += 124) {
        b += R(x, 100, 24, 72, "p-concrete");
        b += '<circle cx="' + (x + 12) + '" cy="162" r="4" class="solid"/>';
        if (x + 24 < 600) b += R(x + 24, 100, Math.min(100, 576 - x), 70, "p-block");
      }
      b += DIM(616, 80, 616, 172) + K(624, 130, "עובי כולל", "r", "s");
      b += DIM(616, 80, 616, 100);
      b += L(560, 90, 560, 46) + T(560, 38, "פלטה עליונה דקה", "m");
      b += L(292, 140, 300, 214) + T(300, 228, "צלע (קורה קטנה)", "m");
      b += L(220, 140, 160, 214) + T(150, 228, "גוף מילוי קל", "m");
      b += T(150, 244, "איטונג / פוליסטירן / בלוק בטון קל", "m", "s");
      b += L(292, 162, 440, 214) + T(450, 228, "זיון בתחתית הצלע", "m");
      return svg(680, 256, b, this.title);
    }
  };

  D["flat-slab"] = {
    title: "תקרה ללא קורות (פטרייה): פלטה על עמודים, כותרת וגזירת חדירה",
    src: ["rec3-23"],
    parts: [{ n: 1, name: "פלטה (תקרה מקשית עבה)", x: 340, y: 116 }, { n: 2, name: "עמוד", x: 520, y: 220 }, { n: 3, name: "כותרת / פטרייה", x: 160, y: 140 }, { n: 4, name: "אזור גזירת חדירה", x: 535, y: 116 }],
    draw: function () {
      var b = "";
      b += LOADS(60, 620, 96, 40);
      b += R(40, 100, 600, 32, "p-concrete");
      b += P("M120 132 H200 V148 H120 Z", "ln", "p-concrete");
      b += R(145, 148, 30, 120, "p-concrete") + R(505, 132, 30, 136, "p-concrete");
      b += P("M505 132 L475 100 M535 132 L565 100", "dash");
      b += P("M40 268 H640", "ln2");
      b += L(340, 116, 340, 56) + T(340, 50, "תחתית תקרה חלקה, בלי קורות", "m");
      b += L(160, 140, 100, 200) + T(100, 214, "עיבוי בראש העמוד", "m") + T(100, 230, "(כותרת / פטרייה)", "m", "s");
      b += L(520, 220, 600, 220) + T(604, 224, "עמוד", "l");
      b += L(568, 104, 600, 70) + T(676, 54, "גזירת חדירה", "r") + T(676, 70, "PUNCHING SHEAR", "r", "m");
      return svg(680, 282, b, this.title);
    }
  };

  D["post-tensioned"] = {
    title: "תקרת דריכה: כבלים בשרוולים, מתיחה ועיגון אחרי התקשות הבטון",
    src: ["rec3-24"],
    parts: [{ n: 1, name: "כבל פלדה בתוך שרוול", x: 200, y: 128 }, { n: 2, name: "עוגן", x: 640, y: 120 }, { n: 3, name: "פלטת הבטון", x: 470, y: 108 }, { n: 4, name: "עמוד", x: 340, y: 200 }],
    draw: function () {
      var b = "";
      b += G(3, R(40, 100, 600, 40, "p-concrete"));
      b += G(4, R(330, 140, 20, 110, "p-concrete") + R(50, 140, 20, 110, "p-concrete") + R(610, 140, 20, 110, "p-concrete"));
      b += G(1, '<path d="M40 120 Q190 150 340 106 Q490 150 640 120" class="ln2" style="stroke-width:4"/>' +
        '<path d="M40 120 Q190 150 340 106 Q490 150 640 120" class="ln" style="stroke:var(--cut);stroke-width:1.4"/>');
      b += G(2, R(30, 110, 10, 20, null, "solid") + R(640, 110, 10, 20, null, "solid") + '<path d="M652 120 H676" class="flow" marker-end="url(#m-flow)"/>');
      b += G(3, ARR(260, 100, 290, 100, "ln") + ARR(420, 100, 390, 100, "ln"));
      b += G(1, L(200, 128, 170, 200) + T(170, 214, "כבל פלדה בחוזק גבוה", "m") + T(170, 230, "בתוך שרוול", "m", "s"));
      b += G(2, L(645, 112, 600, 60) + T(596, 56, "עוגן ומתיחה (דריכה)", "r"));
      b += G(3, T(340, 82, "מאמצי לחיצה מוקדמים בבטון", "m", "s"));
      b += G(4, L(340, 200, 380, 200) + T(384, 204, "עמוד", "l"));
      return svg(680, 262, b, this.title);
    }
  };


  D["shoring-types"] = {
    title: "סוגי מערכות דיפון (מבט מלמעלה)",
    src: ["rec2-30", "rec2-31", "rec2-33"],
    parts: [{ n: 1, name: "דיפון כלונסאות", x: 505, y: 70 }, { n: 2, name: "קיר סלארי (DIAPHRAGM WALL)", x: 175, y: 70 }, { n: 3, name: "דפנות פלדה (SHEET PILES)", x: 505, y: 222 }, { n: 4, name: "שיטה ברלינאית (SOLDIER PILES AND LAGGING)", x: 175, y: 222 }],
    draw: function () {
      var b = "", x;
      function panel(cx, cy, title, en) { return T(cx, cy + 62, title, "m", "h") + T(cx, cy + 78, en, "m", "m"); }
      // piles (secant)
      b += R(360, 40, 290, 20, "p-earth", "thin") + R(360, 80, 290, 20, null, "soft");
      for (x = 376; x < 650; x += 26) b += '<circle cx="' + x + '" cy="70" r="15" class="ln" style="fill:url(#p-concrete)"/>';
      b += K(372, 34, "צד הקרקע", "l", "s") + K(372, 112, "צד החפירה", "l", "s");
      b += panel(505, 70, "דיפון כלונסאות", "Secant");
      // d-wall panels
      b += R(30, 40, 290, 20, "p-earth", "thin") + R(30, 80, 290, 20, null, "soft");
      for (x = 34; x < 300; x += 70) b += R(x, 60, 66, 20, "p-concrete");
      b += panel(175, 70, "קיר סלארי", "DIAPHRAGM WALL");
      // sheet piles
      b += R(360, 192, 290, 20, "p-earth", "thin") + R(360, 232, 290, 20, null, "soft");
      var d = "M362 222"; for (x = 362; x < 640; x += 40) d += " L" + (x + 10) + " 212 L" + (x + 20) + " 212 L" + (x + 30) + " 232 L" + (x + 40) + " 232";
      b += '<path d="' + d + '" class="ln2" style="stroke-width:3"/>';
      b += panel(505, 222, "דפנות פלדה", "SHEET PILES");
      // soldier piles and lagging
      b += R(30, 192, 290, 20, "p-earth", "thin") + R(30, 238, 290, 14, null, "soft");
      for (x = 40; x < 320; x += 70) b += P("M" + (x - 8) + " 214 H" + (x + 8) + " M" + x + " 214 V234 M" + (x - 8) + " 234 H" + (x + 8), "ln2");
      for (x = 48; x < 300; x += 70) b += R(x, 214, 54, 8, "p-wood");
      b += panel(175, 222, "שיטה ברלינאית", "SOLDIER PILES AND LAGGING");
      return svg(680, 318, b, this.title);
    }
  };

  D["dwall-steps"] = {
    title: "שלבי ביצוע קיר סלארי (DIAPHRAGM WALL)",
    src: ["rec2-31", "rec2-32"],
    // one part per stage panel, in step order (stage 1 is the rightmost panel); stepper only, not "identify" questions
    parts: [{ n: 1, name: "קירות מנחים", x: 600, y: 160 }, { n: 2, name: "חפירת תעלה", x: 472, y: 160 }, { n: 3, name: "תעלה מיוצבת בתרחיף", x: 344, y: 160 }, { n: 4, name: "הורדת כלוב זיון", x: 216, y: 160 }, { n: 5, name: "יציקה בצינור טרמי", x: 88, y: 160 }],
    noQuiz: true,
    draw: function () {
      var b = "", i;
      var steps = ["קירות מנחים", "חפירת תעלה", "תעלה מיוצבת בתרחיף", "הורדת כלוב זיון", "יציקה בצינור טרמי"];
      for (i = 0; i < 5; i++) {
        var x0 = 548 - i * 128, cx = x0 + 52;
        b += '<g class="pt pt-' + (i + 1) + '">';
        b += R(x0, 60, 104, 210, "p-earth", "thin") + P("M" + x0 + " 60 H" + (x0 + 104), "ln2");
        b += R(cx - 22, 52, 10, 20, "p-concrete") + R(cx + 12, 52, 10, 20, "p-concrete");
        if (i >= 1) b += R(cx - 12, 60, 24, i === 1 ? 110 : 190, null, "cut") + R(cx - 12, 60, 24, i === 1 ? 110 : 190, null, "ln");
        if (i >= 2 && i < 4) b += R(cx - 12, 74, 24, 176, "p-sand", "thin");
        if (i === 1) b += R(cx - 10, 150, 20, 22, null, "solid") + P("M" + cx + " 20 V150", "ln");
        if (i === 3) b += P("M" + (cx - 7) + " 30 V244 M" + (cx + 7) + " 30 V244 M" + (cx - 7) + " 70 H" + (cx + 7) + " M" + (cx - 7) + " 120 H" + (cx + 7) + " M" + (cx - 7) + " 170 H" + (cx + 7) + " M" + (cx - 7) + " 220 H" + (cx + 7), "ln2");
        if (i === 4) b += R(cx - 12, 150, 24, 100, "p-concrete") + R(cx - 12, 74, 24, 76, "p-sand", "thin") + P("M" + cx + " 20 V150", "ln2");
        b += K(cx, 294, String(i + 1), "m", "h") + T(cx, 314, steps[i], "m", "s");
        b += "</g>";
      }
      b += K(340, 344, "המחשה לימודית: הכיתובים באנגלית בשקף לא היו קריאים במלואם", "m", "s");
      return svg(680, 354, b, this.title);
    }
  };


  D["pile-bearing"] = {
    title: "כלונס קצה וכלונס חיכוך: איך העומס עובר לקרקע",
    src: ["rec1-17"],
    parts: [{ n: 1, name: "כלונס קצה", x: 505, y: 200 }, { n: 2, name: "כלונס חיכוך", x: 175, y: 200 }, { n: 3, name: "שכבה קשה / סלע", x: 600, y: 318 }, { n: 4, name: "קרקע חלשה", x: 430, y: 130 }],
    draw: function () {
      var b = "", y;
      b += R(360, 80, 290, 220, "p-earth", "thin") + R(360, 300, 290, 40, "p-gravel", "thin") + P("M360 80 H650", "ln2") + P("M360 300 H650", "ln");
      b += R(490, 60, 30, 250, "p-concrete") + R(470, 52, 70, 16, "p-concrete");
      b += FLOW("M505 30 V58") + FLOW("M505 312 V336");
      b += T(505, 362, "כלונס קצה", "m", "h") + T(505, 378, "העומס עובר בעיקר דרך הקצה לשכבה הקשה", "m", "s");
      b += L(600, 318, 630, 296) + T(676, 290, "שכבה קשה", "r", "s");
      b += T(430, 140, "קרקע חלשה", "m", "s");
      b += R(30, 80, 290, 260, "p-earth", "thin") + P("M30 80 H320", "ln2");
      b += R(160, 60, 30, 260, "p-concrete") + R(140, 52, 70, 16, "p-concrete");
      b += FLOW("M175 30 V58");
      for (y = 110; y < 310; y += 40) b += '<path d="M156 ' + y + ' V' + (y + 22) + '" class="flow" style="stroke-width:3" marker-end="url(#m-flow)"/><path d="M194 ' + y + ' V' + (y + 22) + '" class="flow" style="stroke-width:3" marker-end="url(#m-flow)"/>';
      b += T(175, 362, "כלונס חיכוך", "m", "h") + T(175, 378, "העומס עובר בעיקר בחיכוך לאורך הדופן", "m", "s");
      return svg(680, 390, b, this.title);
    }
  };

  D["raft-foundation"] = {
    title: "יסוד רפסודה: פלטה אחת רציפה מתחת לכל המבנה",
    src: ["rec1-12", "rec1-13"],
    parts: [{ n: 1, name: "רפסודה (פלטת בטון מזוין)", x: 340, y: 236 }, { n: 2, name: "בטון רזה", x: 600, y: 262 }, { n: 3, name: "עמוד", x: 120, y: 160 }, { n: 4, name: "קרקע", x: 600, y: 300 }],
    draw: function () {
      var b = "";
      b += R(10, 256, 660, 70, "p-earth", "thin");
      b += R(40, 256, 600, 10, null, "soft") + R(40, 256, 600, 10, null, "ln");
      b += R(50, 214, 580, 42, "p-concrete");
      [110, 260, 420, 570].forEach(function (x) { b += R(x - 12, 90, 24, 124, "p-concrete"); b += FLOW("M" + x + " 70 V96"); });
      b += P("M58 248 H622 M58 222 H622", "ln2");
      b += '<path d="M340 270 V292 M300 270 V292 M380 270 V292 M260 270 V292 M420 270 V292" class="flow" style="stroke-width:3" marker-end="url(#m-flow)"/>';
      b += L(340, 236, 340, 190) + T(340, 182, "רפסודה: פלטת בטון מזוין", "m");
      b += L(600, 262, 630, 236) + T(676, 230, "בטון רזה", "r", "s");
      b += L(120, 160, 160, 140) + T(164, 136, "עמוד", "l");
      b += T(560, 312, "הקרקע מקבלת את העומס על כל השטח", "m", "s");
      return svg(680, 334, b, this.title);
    }
  };

  window.Diagrams = {
    defs: DEFS,
    swatch: swatch,
    materialName: function (m) { return MATERIAL_NAME[m] || ""; },
    has: function (id) { return !!D[id]; },
    title: function (id) { return D[id] ? D[id].title : ""; },
    parts: function (id) { return D[id] && D[id].parts ? D[id].parts : null; },
    // false for diagrams whose parts exist only to drive the stepper (no auto-generated "identify" questions)
    quizzable: function (id) { return !!(D[id] && D[id].parts && !D[id].noQuiz); },
    src: function (id) { return D[id] && D[id].src ? D[id].src : null; },
    render: function (id, opts) {
      if (!D[id]) return "";
      var out = D[id].draw();
      if (opts && opts.marker && D[id].parts) {
        var mk = D[id].parts.map(function (p) {
          var on = p.n === opts.marker;
          return '<g class="mk' + (on ? " on" : "") + '"><circle cx="' + p.x + '" cy="' + p.y + '" r="' + (on ? 13 : 10) + '"/><text x="' + p.x + '" y="' + (p.y + 4.5) + '" text-anchor="middle">' + p.n + "</text></g>";
        }).join("");
        out = out.replace('class="drawing"', 'class="drawing quiz"').replace(/<\/svg>$/, mk + "</svg>");
        var vb = /viewBox="0 0 (\d+) (\d+)"/.exec(out);
        if (vb) {
          var W = +vb[1], H = +vb[2], xs = D[id].parts.map(function (p) { return p.x; }), ys = D[id].parts.map(function (p) { return p.y; });
          var x0 = Math.max(0, Math.min.apply(null, xs) - 40), y0 = Math.max(0, Math.min.apply(null, ys) - 40);
          var x1 = Math.min(W, Math.max.apply(null, xs) + 40), y1 = Math.min(H, Math.max.apply(null, ys) + 40);
          if ((x1 - x0) * (y1 - y0) < W * H * 0.85 && x1 - x0 > W * 0.4) out = out.replace(vb[0], 'viewBox="' + x0 + " " + y0 + " " + (x1 - x0) + " " + (y1 - y0) + '"');
        }
      }
      // legend mode (senior P0-6): every part gets a numbered marker; CSS shows them instead of the small labels on phones
      if (opts && opts.legend && D[id].parts) {
        var ml = D[id].parts.map(function (p) {
          return '<g class="mk"><circle cx="' + p.x + '" cy="' + p.y + '" r="11"/><text x="' + p.x + '" y="' + (p.y + 4.5) + '" text-anchor="middle">' + p.n + "</text></g>";
        }).join("");
        out = out.replace('class="drawing"', 'class="drawing has-mk"').replace(/<\/svg>$/, '<g class="mk-l">' + ml + "</g></svg>");
      }
      return out;
    }
  };
})();
