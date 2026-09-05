/* Widget logic for the "Use LLMs Efficiently" post:
   1) RouterSim — a traffic-difficulty slider splits queries across three model
      tiers (small / mid / frontier). A router sends easy→small, medium→mid,
      hard→frontier and is compared against always-cheap (fails hard work) and
      always-frontier (pays top price for trivial work).
   2) PhaseSplit — one task, split across model tiers by phase. Plan with a
      frontier model, implement the well-specified bulk with a mid model, review
      with a small one — and compare the blended cost to all-frontier.
   3) TokenTrap — the "local metric trap" from GitHub's cost-efficiency work.
      Compress each tool call harder and per-call tokens fall, but dropped
      context forces recovery turns, and because every turn re-reads the whole
      transcript the WHOLE task gets more expensive past a sweet spot.
   Framework-agnostic mount(el). Styling lives in gpt-widgets.css.
   All numbers are illustrative — a teaching model, not any vendor's price sheet. */

/* ---- helpers ---------------------------------------------------------- */
function pct(x) {
  return (x * 100).toFixed(1) + "%";
}
function fmtK(n) {
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}
function money(n) {
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
  if (n >= 100) return "$" + n.toFixed(0);
  return "$" + n.toFixed(2);
}

/* =======================================================================
   1) RouterSim — right-size the model to the query
   A slider sets how hard the traffic is. Easy queries go to a small/fast
   model, medium to a mid model, hard to a frontier model. We price a month
   of traffic three ways: route it, send everything to the cheap model
   (breaks on hard work), and send everything to the frontier model.
   ======================================================================= */
const RS = {
  VOL: 100000, // queries per month
  SMALL: 0.0006, // $/query — small/fast tier
  MID: 0.006, // $/query — mid tier (10× small)
  FRONTIER: 0.03, // $/query — frontier/reasoning tier (5× mid)
};

function rsMix(d) {
  // d in [0,1]: 0 = almost all easy, 1 = almost all hard
  const easy = Math.pow(1 - d, 1.5);
  const hard = Math.pow(d, 1.5);
  const med = Math.max(0, 1 - easy - hard);
  return { easy, med, hard };
}

export function mountRouterSim(el) {
  el.innerHTML = `
    <div class="rs">
      <div class="controls">
        <div class="control" style="flex:1 1 100%">
          <label>How hard is your traffic? · <span class="rs-dv"></span></label>
          <input type="range" class="rs-d" min="0" max="100" step="1" value="35" aria-label="Traffic difficulty" style="width:100%;max-width:none">
        </div>
      </div>

      <div class="rs-mix">
        <div class="rs-chip rs-chip--easy"><span class="rs-chip__k">Easy</span><span class="rs-chip__v rs-easy"></span><span class="rs-chip__t">→ small model</span></div>
        <div class="rs-chip rs-chip--med"><span class="rs-chip__k">Medium</span><span class="rs-chip__v rs-med"></span><span class="rs-chip__t">→ mid model</span></div>
        <div class="rs-chip rs-chip--hard"><span class="rs-chip__k">Hard</span><span class="rs-chip__v rs-hard"></span><span class="rs-chip__t">→ frontier model</span></div>
      </div>

      <div class="rs-bars">
        <div class="rs-barrow">
          <span class="rs-barlab">Always cheap<br><b class="rs-cheap-note"></b></span>
          <span class="rs-track"><span class="rs-fill rs-fill--cheap"></span></span>
          <span class="rs-val rs-val--cheap"></span>
        </div>
        <div class="rs-barrow">
          <span class="rs-barlab"><b>Routed</b><br>right-sized per query</span>
          <span class="rs-track"><span class="rs-fill rs-fill--routed"></span></span>
          <span class="rs-val rs-val--routed"></span>
        </div>
        <div class="rs-barrow">
          <span class="rs-barlab">Always frontier<br>overkill for easy work</span>
          <span class="rs-track"><span class="rs-fill rs-fill--frontier"></span></span>
          <span class="rs-val rs-val--frontier"></span>
        </div>
      </div>

      <div class="rs-stats">
        <div class="rs-stat"><span class="rs-stat__k">Routed monthly cost</span><span class="rs-stat__v rs-routed-cost"></span></div>
        <div class="rs-stat"><span class="rs-stat__k">Saved vs always-frontier</span><span class="rs-stat__v is-good rs-save"></span></div>
        <div class="rs-stat"><span class="rs-stat__k">Would fail on always-cheap</span><span class="rs-stat__v is-bad rs-fail"></span></div>
      </div>
      <p class="rs-verdict"></p>
    </div>`;

  const dEl = el.querySelector(".rs-d");

  function render() {
    const d = +dEl.value / 100;
    const m = rsMix(d);
    const routed =
      RS.VOL * (m.easy * RS.SMALL + m.med * RS.MID + m.hard * RS.FRONTIER);
    const allCheap = RS.VOL * RS.SMALL;
    const allFrontier = RS.VOL * RS.FRONTIER;
    const save = 1 - routed / allFrontier;
    const failShare = m.med + m.hard; // work the cheap model can't handle well

    el.querySelector(".rs-dv").textContent =
      d < 0.2 ? "mostly simple" : d > 0.7 ? "mostly complex" : "mixed";
    el.querySelector(".rs-easy").textContent = pct(m.easy);
    el.querySelector(".rs-med").textContent = pct(m.med);
    el.querySelector(".rs-hard").textContent = pct(m.hard);

    // bars scaled to always-frontier (the most expensive option)
    el.querySelector(".rs-fill--cheap").style.width =
      ((allCheap / allFrontier) * 100).toFixed(1) + "%";
    el.querySelector(".rs-fill--routed").style.width =
      ((routed / allFrontier) * 100).toFixed(1) + "%";
    el.querySelector(".rs-fill--frontier").style.width = "100%";

    el.querySelector(".rs-val--cheap").textContent = money(allCheap);
    el.querySelector(".rs-val--routed").textContent = money(routed);
    el.querySelector(".rs-val--frontier").textContent = money(allFrontier);
    el.querySelector(".rs-cheap-note").textContent = "breaks on hard work";

    el.querySelector(".rs-routed-cost").textContent = money(routed);
    el.querySelector(".rs-save").textContent = pct(save);
    el.querySelector(".rs-fail").textContent = pct(failShare);

    let msg;
    if (d < 0.2) {
      msg =
        `Almost everything here is easy. Routing sends <b>${pct(m.easy)}</b> to the small model and pays ` +
        `the frontier price only for the rare hard query — <b>${pct(save)} cheaper</b> than sending it all ` +
        `to a frontier model, with no quality loss on the work that matters.`;
    } else if (d > 0.7) {
      msg =
        `This traffic is genuinely hard — <b>${pct(m.hard)}</b> needs the frontier model, so routing can't ` +
        `save much (<b>${pct(save)}</b>). That's the honest answer: when the work is hard, pay for capability. ` +
        `The win from routing shows up when <b>most</b> requests are easy.`;
    } else {
      msg =
        `Mixed traffic — the sweet spot for a router. Sending everything to the cheap model would save the ` +
        `most money but <b>fail on ${pct(failShare)}</b> of requests; sending everything to the frontier model ` +
        `is safe but wasteful. Routing gets <b>${pct(save)}</b> of the frontier bill back while keeping hard ` +
        `queries on a capable model.`;
    }
    el.querySelector(".rs-verdict").innerHTML = msg;
  }

  dEl.addEventListener("input", render);
  render();
}

/* =======================================================================
   2) PhaseSplit — one task, split across tiers by phase
   A real task (e.g. a coding change) has phases with very different needs:
   planning is a small number of tokens but high-leverage; implementation is
   the bulk of the tokens but well-specified; review is mechanical. Assign each
   phase a tier and compare the blended cost against sending it all to the
   frontier model. The lesson: put the frontier model where the *thinking* is,
   and the cheap model where the *volume* is.
   ======================================================================= */
const PS_TIERS = {
  small: { label: "Small", price: 0.5 }, // $ per 1M tokens (blended, illustrative)
  mid: { label: "Mid", price: 5 },
  frontier: { label: "Frontier", price: 20 },
};
const PS_PHASES = [
  { id: "plan", label: "Plan / architect", sub: "few tokens, high leverage", tokM: 0.3, def: "frontier" },
  { id: "impl", label: "Implement", sub: "the bulk of the tokens", tokM: 1.3, def: "mid" },
  { id: "review", label: "Review / test", sub: "mechanical checks", tokM: 0.4, def: "small" },
];

export function mountPhaseSplit(el) {
  const totalTokM = PS_PHASES.reduce((s, p) => s + p.tokM, 0);
  const allFrontier = totalTokM * PS_TIERS.frontier.price;

  el.innerHTML = `
    <div class="ps">
      <div class="ps-rows">
        ${PS_PHASES.map(
          (p) => `
          <div class="ps-row">
            <span class="ps-phase">
              <span class="ps-phase__l">${p.label}</span>
              <span class="ps-phase__s">${p.sub} · ${p.tokM.toFixed(1)}M tok</span>
            </span>
            <select class="ps-tier" data-phase="${p.id}" aria-label="Model tier for ${p.label}">
              ${Object.entries(PS_TIERS)
                .map(
                  ([k, v]) =>
                    `<option value="${k}"${k === p.def ? " selected" : ""}>${v.label}</option>`
                )
                .join("")}
            </select>
            <span class="ps-cost" data-phase="${p.id}"></span>
          </div>`
        ).join("")}
      </div>

      <div class="rs-bars">
        <div class="rs-barrow">
          <span class="rs-barlab"><b>Mixed tiers</b><br>your split above</span>
          <span class="rs-track"><span class="rs-fill rs-fill--routed ps-fill"></span></span>
          <span class="rs-val ps-val"></span>
        </div>
        <div class="rs-barrow">
          <span class="rs-barlab">All frontier<br>the lazy default</span>
          <span class="rs-track"><span class="rs-fill rs-fill--frontier" style="width:100%"></span></span>
          <span class="rs-val">${money(allFrontier)}</span>
        </div>
      </div>

      <div class="rs-stats">
        <div class="rs-stat"><span class="rs-stat__k">Task cost (mixed)</span><span class="rs-stat__v ps-total"></span></div>
        <div class="rs-stat"><span class="rs-stat__k">Saved vs all-frontier</span><span class="rs-stat__v is-good ps-save"></span></div>
        <div class="rs-stat"><span class="rs-stat__k">Where the tokens are</span><span class="rs-stat__v ps-bulk"></span></div>
      </div>
      <p class="rs-verdict ps-verdict"></p>
    </div>`;

  const selects = [...el.querySelectorAll(".ps-tier")];

  function render() {
    const chosen = {};
    PS_PHASES.forEach((p) => {
      chosen[p.id] = el.querySelector(`.ps-tier[data-phase="${p.id}"]`).value;
    });

    let total = 0;
    PS_PHASES.forEach((p) => {
      const c = p.tokM * PS_TIERS[chosen[p.id]].price;
      total += c;
      el.querySelector(`.ps-cost[data-phase="${p.id}"]`).textContent = money(c);
    });
    const save = 1 - total / allFrontier;

    el.querySelector(".ps-fill").style.width =
      ((total / allFrontier) * 100).toFixed(1) + "%";
    el.querySelector(".ps-val").textContent = money(total);
    el.querySelector(".ps-total").textContent = money(total);
    el.querySelector(".ps-save").textContent = pct(save);

    // the phase with the most tokens
    const bulk = PS_PHASES.reduce((a, b) => (b.tokM > a.tokM ? b : a));
    el.querySelector(".ps-bulk").textContent = bulk.label.split(" ")[0];

    const planTier = chosen.plan;
    const implTier = chosen.impl;
    let msg;
    if (implTier === "frontier" && planTier === "frontier") {
      msg =
        `Everything on the frontier model — safe, and the <b>most expensive</b> option. ` +
        `The bulk of the tokens is <b>Implement</b>, which is well-specified once the plan exists. ` +
        `Drop it to a mid model and watch the bar fall without touching where the real thinking happens.`;
    } else if (
      implTier === "frontier" &&
      (planTier === "small" || planTier === "mid")
    ) {
      msg =
        `This is backwards: you've put your <b>cheapest</b> model on the highest-leverage step (planning) ` +
        `and paid <b>frontier prices for the easy bulk</b>. Flip it — frontier plans, mid implements.`;
    } else if (planTier === "frontier" && implTier === "mid") {
      msg =
        `The sweet spot. A frontier model does the <b>planning</b> — where one bad decision derails ` +
        `everything — then a mid model executes the <b>${(PS_PHASES[1].tokM).toFixed(1)}M tokens</b> of ` +
        `well-specified implementation. Same quality where it counts, <b>${pct(save)} off</b> the bill.`;
    } else {
      msg =
        `Mixed split: <b>${pct(save)}</b> off all-frontier. The rule of thumb — spend on the phase that ` +
        `<b>decides</b> the outcome (usually planning), economize on the phase with the <b>volume</b> ` +
        `(usually implementation), and use the smallest model for mechanical review.`;
    }
    el.querySelector(".ps-verdict").innerHTML = msg;
  }

  selects.forEach((s) => s.addEventListener("change", render));
  render();
}

/* =======================================================================
   3) TokenTrap — local savings vs global cost (the "local metric trap")
   A task is N base turns. Compressing tool output by aggressiveness c:
     - shrinks each call's displayed output (good, local)
     - misses needed info at a rate rising with c, forcing recovery turns
       that re-read the FULL original (bad, adds turns)
   Every turn re-reads the accumulated transcript, so total cost grows
   roughly with turns² — extra turns are punishing. Net: a U-shaped total.
   ======================================================================= */
const TT = {
  N: 8, // base turns in the task
  FIXED: 2000, // fixed prompt tokens re-sent every turn (system + tools)
  OUT: 500, // baseline tool-output tokens per turn
  SHRINK: 0.7, // max fraction a call can shrink at c=1
  MAXMISS: 0.5, // recovery turns as a fraction of N at c=1
};

function ttModel(c) {
  const displayed = TT.OUT * (1 - TT.SHRINK * c); // per-call output shown to model
  const missRate = TT.MAXMISS * Math.pow(c, 1.8); // nonlinear: aggressive = misses more
  const recovery = TT.N * missRate; // extra turns to re-read originals
  const turns = TT.N + recovery;
  // recovery turns re-read the full original (TT.OUT); normal turns show `displayed`
  const avgOut = (TT.N * displayed + recovery * TT.OUT) / turns;
  // closed-form of Σ_{t=1..turns}(FIXED + avgOut*(t-1)) + turns*avgOut
  const total =
    turns * TT.FIXED + avgOut * (turns * (turns - 1)) / 2 + turns * avgOut;
  return { displayed, missRate, recovery, turns, total };
}

export function mountTokenTrap(el) {
  // baseline = no compression; sweet spot = c that minimizes total
  const base = ttModel(0);
  let sweetC = 0,
    sweetT = base.total;
  for (let i = 1; i <= 100; i++) {
    const t = ttModel(i / 100).total;
    if (t < sweetT) {
      sweetT = t;
      sweetC = i / 100;
    }
  }

  el.innerHTML = `
    <div class="tt">
      <div class="controls">
        <div class="control" style="flex:1 1 100%">
          <label>Compression aggressiveness · <span class="tt-cv"></span></label>
          <input type="range" class="tt-c" min="0" max="100" step="1" value="0" aria-label="Compression aggressiveness" style="width:100%;max-width:none">
        </div>
      </div>

      <div class="tt-bars">
        <div class="tt-barrow">
          <span class="tt-barlab">Tokens per tool call</span>
          <span class="tt-track"><span class="tt-fill tt-fill--call"></span></span>
          <span class="tt-val tt-val--call"></span>
        </div>
        <div class="tt-barrow">
          <span class="tt-barlab">Total task tokens</span>
          <span class="tt-track"><span class="tt-fill tt-fill--total"></span><span class="tt-baseline" title="no-compression baseline"></span></span>
          <span class="tt-val tt-val--total"></span>
        </div>
      </div>

      <div class="tt-stats">
        <div class="tt-stat"><span class="tt-stat__k">Turns</span><span class="tt-stat__v tt-turns"></span></div>
        <div class="tt-stat"><span class="tt-stat__k">…of which recovery</span><span class="tt-stat__v tt-recov"></span></div>
        <div class="tt-stat"><span class="tt-stat__k">Total vs baseline</span><span class="tt-stat__v tt-delta"></span></div>
      </div>
      <p class="tt-verdict"></p>
    </div>`;

  const cEl = el.querySelector(".tt-c");

  function render() {
    const c = +cEl.value / 100;
    const m = ttModel(c);
    const callFrac = m.displayed / TT.OUT; // 0..1
    const totalFrac = m.total / base.total; // relative to baseline
    const delta = totalFrac - 1;

    el.querySelector(".tt-cv").textContent =
      c === 0 ? "off" : Math.round(c * 100) + "%";
    el.querySelector(".tt-fill--call").style.width = (callFrac * 100).toFixed(0) + "%";
    // total bar scaled so baseline sits at ~62% of the track, leaving room to grow
    const scale = 0.62 / 1;
    el.querySelector(".tt-fill--total").style.width =
      Math.min(100, totalFrac * scale * 100).toFixed(0) + "%";
    el.querySelector(".tt-baseline").style.left = (scale * 100).toFixed(0) + "%";

    const totalFill = el.querySelector(".tt-fill--total");
    totalFill.classList.toggle("is-over", delta > 0.005);
    totalFill.classList.toggle("is-under", delta < -0.005);

    el.querySelector(".tt-val--call").textContent = fmtK(m.displayed);
    el.querySelector(".tt-val--total").textContent = fmtK(m.total);
    el.querySelector(".tt-turns").textContent = m.turns.toFixed(1);
    el.querySelector(".tt-recov").textContent = m.recovery.toFixed(1);

    const dEl = el.querySelector(".tt-delta");
    dEl.textContent = (delta >= 0 ? "+" : "") + pct(delta);
    dEl.className = "tt-stat__v tt-delta " + (delta > 0.005 ? "is-bad" : "is-good");

    let msg;
    if (c === 0) {
      msg =
        `No compression: each tool call shows the full <b>${TT.OUT}</b> tokens. ` +
        `Drag the slider and watch the two bars move in <b>opposite</b> directions.`;
    } else if (delta <= 0.005) {
      msg =
        `So far so good — calls are <b>${pct(1 - callFrac)} smaller</b> and the task is still ` +
        `<b>cheaper overall</b>. Around <b>${Math.round(sweetC * 100)}%</b> is the conservative ` +
        `sweet spot: trim the obvious noise, keep everything the agent might need.`;
    } else {
      msg =
        `Here's the trap. Each call is <b>${pct(1 - callFrac)} smaller</b> — the local metric looks great — ` +
        `but dropped context forced <b>${m.recovery.toFixed(1)} recovery turns</b>, and since every turn ` +
        `re-reads the whole transcript, the <b>total task got ${pct(delta)} more expensive</b>. ` +
        `You saved tokens locally and spent more globally.`;
    }
    el.querySelector(".tt-verdict").innerHTML = msg;
  }

  cEl.addEventListener("input", render);
  render();
}
