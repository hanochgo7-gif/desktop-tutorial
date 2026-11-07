/* SOTA: the one-minute IT check. Six questions, one at a time, along a route.
   The result lists the points worth checking and can prefill the consultation form. Nothing is sent anywhere. */
(() => {
  "use strict";
  const I18N = (() => { try { return JSON.parse(document.getElementById("i18n").textContent); } catch { return {}; } })();
  const C = I18N.check;
  const root = document.querySelector("[data-check]");
  if (!C || !root) return;
  const body = root.querySelector("[data-check-body]");
  const live = root.querySelector("[data-check-live]");
  const stations = Array.from(root.querySelectorAll("[data-check-stn]"));
  const total = C.questions.length, max = total * 2;
  const VALUE = { yes: 2, unsure: 1, no: 0 };
  let answers = [];

  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v; else if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v); else n.setAttribute(k, v);
    }
    kids.flat().forEach((c) => c && n.append(c));
    return n;
  };

  function setRoute(done) {
    live.style.setProperty("--p", String(done / total));
    stations.forEach((s, i) => s.classList.toggle("is-on", i < done));
    root.querySelector(".cr-end").classList.toggle("is-on", done === total);
  }

  let started = false;
  function question(i, focus = true) {
    setRoute(i);
    const q = C.questions[i];
    const h = el("h3", { class: "check-q", tabindex: "-1", text: q.q });
    const choose = (k) => () => {
      if (!started) { started = true; window.sotaTrack?.("check_start"); }
      answers[i] = VALUE[k]; i + 1 < total ? question(i + 1) : result(); };
    body.replaceChildren(
      el("p", { class: "check-progress", text: C.progress.replace("{n}", i + 1).replace("{total}", total) }),
      h,
      el("div", { class: "check-answers" },
        el("button", { class: "btn", type: "button", onclick: choose("yes") }, C.yes),
        el("button", { class: "btn btn-ghost", type: "button", onclick: choose("unsure") }, C.unsure),
        el("button", { class: "btn btn-ghost", type: "button", onclick: choose("no") }, C.no)),
      i > 0 ? el("button", { class: "link-back", type: "button", onclick: () => question(i - 1) }, C.back) : null,
    );
    if (focus) h.focus({ preventScroll: true });
  }

  function result() {
    setRoute(total);
    const score = answers.reduce((a, b) => a + b, 0);
    const r = C.results.find((x) => score >= x.min) || C.results[C.results.length - 1];
    const weak = C.questions.map((q, i) => ({ q, v: answers[i] })).filter((x) => x.v < 2);
    window.sotaTrack?.("check_complete", { score, max });

    const h = el("h3", { class: "check-q", tabindex: "-1", text: r.t });
    const cta = el("button", { class: "btn", type: "button", "data-track": "cta_click", "data-track-loc": "check_result" }, el("span", { class: "dot", "aria-hidden": "true" }), C.cta);
    cta.addEventListener("click", () => {
      const msg = document.getElementById("lead-message");
      if (msg) {
        const points = weak.length ? weak.map((x) => "- " + x.q.q).join("\n") : "-";
        const text = C.message.replace("{score}", score).replace("{max}", max).replace("{points}", points);
        if (!msg.value.trim() || msg.dataset.fromCheck === "1") { msg.value = text; msg.dataset.fromCheck = "1"; }
      }
      const target = document.getElementById("consult");
      window.SOTA?.scrollToTarget ? window.SOTA.scrollToTarget(target) : target.scrollIntoView();
      setTimeout(() => document.getElementById("lead-name")?.focus({ preventScroll: true }), 1100);
    });

    body.replaceChildren(
      el("div", { class: "check-score" },
        el("span", { class: "cs-num", text: `${score}/${max}` }),
        el("span", { class: "small muted", text: C.scoreLabel })),
      h,
      el("p", { class: "check-desc", text: r.d }),
      weak.length ? el("div", { class: "check-tips" },
        el("p", { class: "flabel", text: C.tipsTitle }),
        el("ul", {}, weak.map((x) => el("li", {}, el("b", { text: x.q.q }), el("span", { text: x.q.tip }))))) : null,
      el("div", { class: "cta-row" }, cta,
        el("button", { class: "btn btn-ghost", type: "button", onclick: () => { answers = []; question(0); } }, C.restart)),
      el("p", { class: "small muted", text: C.disclaimer }),
    );
    h.focus({ preventScroll: true });
  }

  // the first question is on screen from the start: one click less between the visitor and an answer
  question(0, false);
})();
