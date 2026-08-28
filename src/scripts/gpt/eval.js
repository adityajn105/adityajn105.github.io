/* Widget logic for the "Evaluating & Observing LLM Apps" post:
   1) a retrieval-metrics explorer (hit@k, precision@k, reciprocal rank)
   2) a latency trace waterfall (where the time goes)
   Framework-agnostic mount(el). Styling lives in gpt-widgets.css.
   Metrics mirror src/eval.py exactly. */

/* =======================================================================
   1) Retrieval-metrics explorer
   A ranked result list; click a row to mark it relevant; move k. Watch the
   metrics update. Teaches what hit@k / precision@k / MRR actually measure.
   ======================================================================= */
const RESULTS = [
  { src: "proximal-policy-optimization", rel: true },
  { src: "actor-critic", rel: false },
  { src: "policy-optimization-rl", rel: false },
  { src: "proximal-policy-optimization", rel: true },
  { src: "deep-q-learning", rel: false },
  { src: "monte-carlo-and-temporal-difference", rel: false },
];

export function mountMetrics(el) {
  const rows = RESULTS.map((r) => ({ ...r }));

  el.innerHTML = `
    <div class="ev-m">
      <p class="ev-m__q">Query: <span class="mono">"what is the clipped surrogate objective in PPO?"</span></p>
      <div class="control">
        <label>Cutoff · k = <span class="ev-k">3</span> &nbsp;(click a row to toggle "relevant")</label>
        <input type="range" class="ev-slider" min="1" max="${rows.length}" step="1" value="3">
      </div>
      <ol class="ev-list"></ol>
      <div class="ev-metrics">
        <div class="ev-met"><span class="ev-met__k">hit@k</span><span class="ev-met__v ev-hit"></span><span class="ev-met__d">any relevant in top k?</span></div>
        <div class="ev-met"><span class="ev-met__k">precision@k</span><span class="ev-met__v ev-prec"></span><span class="ev-met__d">fraction of top k that's relevant</span></div>
        <div class="ev-met"><span class="ev-met__k">recip. rank</span><span class="ev-met__v ev-rr"></span><span class="ev-met__d">1 / rank of first relevant</span></div>
      </div>
    </div>`;

  const slider = el.querySelector(".ev-slider");
  const list = el.querySelector(".ev-list");

  function render() {
    const k = +slider.value;
    el.querySelector(".ev-k").textContent = k;

    list.innerHTML = rows
      .map((r, i) => {
        const inTopK = i < k;
        return `<li class="ev-row${r.rel ? " is-rel" : ""}${inTopK ? " in-k" : ""}" data-i="${i}">
          <span class="ev-row__rank">#${i + 1}</span>
          <span class="ev-row__src mono">${r.src}</span>
          <span class="ev-row__badge">${r.rel ? "relevant" : "not relevant"}</span>
        </li>`;
      })
      .join("");
    list.querySelectorAll(".ev-row").forEach((li) =>
      li.addEventListener("click", () => {
        rows[+li.dataset.i].rel = !rows[+li.dataset.i].rel;
        render();
      })
    );

    const topK = rows.slice(0, k);
    const hit = topK.some((r) => r.rel) ? 1 : 0;
    const prec = topK.filter((r) => r.rel).length / k;
    const firstRel = rows.findIndex((r) => r.rel);
    const rr = firstRel === -1 ? 0 : 1 / (firstRel + 1);

    el.querySelector(".ev-hit").textContent = hit;
    el.querySelector(".ev-hit").className = "ev-met__v ev-hit " + (hit ? "good" : "bad");
    el.querySelector(".ev-prec").textContent = prec.toFixed(2);
    el.querySelector(".ev-rr").textContent = rr.toFixed(2);
  }

  slider.addEventListener("input", render);
  render();
}

/* =======================================================================
   2) Latency trace waterfall
   Shows where wall-clock goes across the pipeline, and how much the generator
   dominates once you switch from extractive to an LLM call.
   ======================================================================= */
const TRACES = {
  extractive: [
    { name: "embed_query", ms: 1, meta: "tf-idf" },
    { name: "retrieve", ms: 4, meta: "cosine top-k" },
    { name: "generate", ms: 2, meta: "extractive · 0 tokens" },
  ],
  llm: [
    { name: "embed_query", ms: 1, meta: "tf-idf" },
    { name: "retrieve", ms: 4, meta: "cosine top-k" },
    { name: "generate", ms: 1180, meta: "gpt-4o-mini · 210 tokens" },
  ],
};

export function mountTrace(el) {
  el.innerHTML = `
    <div class="ev-t">
      <div class="ev-t__toggle">
        <span class="ev-t__lbl">Generator:</span>
        <button class="btn ev-mode is-active" data-mode="extractive">extractive (no LLM)</button>
        <button class="btn ev-mode" data-mode="llm">LLM call</button>
      </div>
      <div class="ev-t__rows"></div>
      <p class="ev-t__note"></p>
    </div>`;

  const rowsEl = el.querySelector(".ev-t__rows");
  const note = el.querySelector(".ev-t__note");

  function render(mode) {
    const spans = TRACES[mode];
    const total = spans.reduce((s, x) => s + x.ms, 0);
    rowsEl.innerHTML = spans
      .map((s) => {
        const pct = (s.ms / total) * 100;
        return `<div class="ev-span">
          <span class="ev-span__name mono">${s.name}</span>
          <span class="ev-span__track"><span class="ev-span__fill" style="width:${Math.max(1.5, pct)}%"></span></span>
          <span class="ev-span__ms mono">${s.ms} ms</span>
          <span class="ev-span__meta">${s.meta}</span>
        </div>`;
      })
      .join("");
    note.innerHTML =
      mode === "llm"
        ? `Total <b>${total} ms</b> — the LLM call is <b>${((1180 / total) * 100).toFixed(0)}%</b> of it. Retrieval is essentially free; generation and tokens are where latency and cost live, and what observability tools track.`
        : `Total <b>${total} ms</b> — no model call, so it's instant. Great for testing retrieval in isolation before an LLM is in the loop.`;
    el.querySelectorAll(".ev-mode").forEach((b) =>
      b.classList.toggle("is-active", b.dataset.mode === mode)
    );
  }

  el.querySelectorAll(".ev-mode").forEach((b) =>
    b.addEventListener("click", () => render(b.dataset.mode))
  );
  render("extractive");
}
