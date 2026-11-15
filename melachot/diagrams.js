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
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + anchor + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + s + "</text>";
  }
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

  window.Diagrams = {
    defs: DEFS,
    swatch: swatch,
    materialName: function (m) { return MATERIAL_NAME[m] || ""; },
    has: function (id) { return !!D[id]; },
    title: function (id) { return D[id] ? D[id].title : ""; },
    render: function (id) { return D[id] ? D[id].draw() : ""; }
  };
})();
