(function () {
  "use strict";
  var lvl = 0;
  var items = Array.prototype.slice.call(document.querySelectorAll(".bq"));
  var secs = Array.prototype.slice.call(document.querySelectorAll(".bank-ch"));
  var seg = document.getElementById("f-lvl");
  var team = document.getElementById("f-team");
  var req = document.getElementById("f-req");
  var flag = document.getElementById("f-flag");
  var s = document.getElementById("f-s");
  var count = document.getElementById("f-count");
  function apply() {
    var term = (s.value || "").trim().toLowerCase();
    var n = 0;
    items.forEach(function (it) {
      var ok = (!lvl || +it.dataset.lvl === lvl) &&
        (!team.value || it.dataset.teams.indexOf(team.value) > -1) &&
        (!req.checked || it.dataset.req === "1") &&
        (!flag.checked || it.dataset.flag === "1") &&
        (!term || it.dataset.s.indexOf(term) > -1);
      it.hidden = !ok;
      if (ok) n++;
    });
    secs.forEach(function (sec) { sec.hidden = !sec.querySelector(".bq:not([hidden])"); });
    count.textContent = n + " שאלות מוצגות";
  }
  seg.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    lvl = +b.dataset.v;
    Array.prototype.forEach.call(seg.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
    apply();
  });
  [team, req, flag].forEach(function (x) { x.addEventListener("change", apply); });
  s.addEventListener("input", apply);
  // a link to a question that is filtered out clears the filters first
  document.addEventListener("click", function (e) {
    var a = e.target.closest('a[href^="#g-"], a[href^="#gb-"]'); if (!a) return;
    var t = document.getElementById(a.getAttribute("href").slice(1));
    if (t && (t.hidden || (t.closest(".bank-ch") && t.closest(".bank-ch").hidden))) {
      lvl = 0; team.value = ""; req.checked = false; flag.checked = false; s.value = "";
      Array.prototype.forEach.call(seg.querySelectorAll("button"), function (x) { x.setAttribute("aria-pressed", String(x.dataset.v === "0")); });
      apply();
    }
  });
  apply();
})();
