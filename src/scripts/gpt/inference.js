/* Widget logic for the "How LLM Inference Gets Fast" post:
   1) an inference cost calculator (why decode is memory-bandwidth-bound)
   2) a KV-cache decode visualizer (O(n^2) recompute vs O(n) reuse)
   Framework-agnostic mount(el). Styling lives in gpt-widgets.css.
   All numbers are illustrative: a bandwidth-bound lower bound that ignores
   compute time, kernel overhead, and networking. */

/* ---- helpers ---------------------------------------------------------- */
function fmtBytes(b) {
  if (b >= 1e12) return (b / 1e12).toFixed(2) + " TB";
  if (b >= 1e9) return (b / 1e9).toFixed(1) + " GB";
  if (b >= 1e6) return (b / 1e6).toFixed(0) + " MB";
  if (b >= 1e3) return (b / 1e3).toFixed(0) + " KB";
  return b.toFixed(0) + " B";
}
function fmtTime(s) {
  if (s >= 1) return s.toFixed(2) + " s";
  if (s >= 1e-3) return (s * 1e3).toFixed(1) + " ms";
  return (s * 1e6).toFixed(0) + " µs";
}

/* =======================================================================
   1) Inference cost calculator
   Per decode step the GPU must read every weight out of HBM once (shared by
   the whole batch) plus each sequence's KV cache. Latency ~= bytes / bandwidth.
   ======================================================================= */
// Rough Llama-ish shapes so we can size the KV cache from a preset.
const MODELS = [
  { id: "1b", label: "1B", params: 1e9, layers: 16, dModel: 2048 },
  { id: "8b", label: "8B", params: 8e9, layers: 32, dModel: 4096 },
  { id: "70b", label: "70B", params: 70e9, layers: 80, dModel: 8192 },
];
const PRECS = [
  { id: "fp16", label: "FP16 · 2 B", bytes: 2 },
  { id: "fp8", label: "FP8 · 1 B", bytes: 1 },
  { id: "int4", label: "INT4 · 0.5 B", bytes: 0.5 },
];
const BWS = [
  { id: "a100", label: "A100 (2.0 TB/s)", bw: 2.0e12 },
  { id: "h100", label: "H100 (3.35 TB/s)", bw: 3.35e12 },
];
const KV_BYTES = 2; // KV cache assumed FP16 (2 B), independent of weight precision

export function mountInferenceCost(el) {
  el.innerHTML = `
    <div class="inf">
      <div class="controls">
        <div class="control">
          <label>Model</label>
          <select class="inf-model" aria-label="Model size">
            ${MODELS.map((m) => `<option value="${m.id}"${m.id === "70b" ? " selected" : ""}>${m.label} params</option>`).join("")}
          </select>
        </div>
        <div class="control">
          <label>Weight precision</label>
          <select class="inf-prec" aria-label="Weight precision">
            ${PRECS.map((p) => `<option value="${p.id}"${p.id === "fp16" ? " selected" : ""}>${p.label}/param</option>`).join("")}
          </select>
        </div>
        <div class="control">
          <label>GPU memory bandwidth</label>
          <select class="inf-bw" aria-label="GPU memory bandwidth">
            ${BWS.map((g) => `<option value="${g.id}"${g.id === "h100" ? " selected" : ""}>${g.label}</option>`).join("")}
          </select>
        </div>
        <div class="control">
          <label>Batch size · <span class="inf-bv"></span></label>
          <input type="range" class="inf-batch" min="1" max="128" step="1" value="1" aria-label="Batch size">
        </div>
        <div class="control">
          <label>Context length · <span class="inf-cv"></span> tokens</label>
          <input type="range" class="inf-ctx" min="1" max="20" step="1" value="8" aria-label="Context length (log scale)">
        </div>
      </div>

      <div class="inf-stats">
        <div class="inf-stat"><span class="inf-stat__k">Weights read / step</span><span class="inf-stat__v inf-w"></span><span class="inf-stat__u">once for the whole batch</span></div>
        <div class="inf-stat"><span class="inf-stat__k">KV cache read / step</span><span class="inf-stat__v inf-kv"></span><span class="inf-stat__u">grows with context × batch</span></div>
        <div class="inf-stat inf-stat--hl"><span class="inf-stat__k">Per-token latency</span><span class="inf-stat__v inf-lat"></span><span class="inf-stat__u">bytes ÷ bandwidth</span></div>
        <div class="inf-stat"><span class="inf-stat__k">Throughput</span><span class="inf-stat__v inf-tps"></span><span class="inf-stat__u">tokens/sec, all users</span></div>
      </div>
      <p class="inf-verdict"></p>
    </div>`;

  const modelEl = el.querySelector(".inf-model");
  const precEl = el.querySelector(".inf-prec");
  const bwEl = el.querySelector(".inf-bw");
  const batchEl = el.querySelector(".inf-batch");
  const ctxEl = el.querySelector(".inf-ctx");

  // context slider is log-scaled: value 1..20 -> ~256 .. 1,048,576 tokens
  function ctxTokens(v) {
    return Math.round(256 * Math.pow(2, (+v - 1) * (12 / 19)));
  }
  function fmtCtx(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
    return String(n);
  }

  function render() {
    const m = MODELS.find((x) => x.id === modelEl.value);
    const prec = PRECS.find((x) => x.id === precEl.value);
    const bw = BWS.find((x) => x.id === bwEl.value);
    const batch = +batchEl.value;
    const ctx = ctxTokens(ctxEl.value);

    el.querySelector(".inf-bv").textContent = batch;
    el.querySelector(".inf-cv").textContent = fmtCtx(ctx);

    const weightBytes = m.params * prec.bytes; // read once per step (shared by batch)
    const kvPerTokenPerSeq = 2 * m.layers * m.dModel * KV_BYTES; // K and V
    const kvBytes = kvPerTokenPerSeq * ctx * batch; // per step, across all sequences

    const bytesPerStep = weightBytes + kvBytes;
    const stepLatency = bytesPerStep / bw.bw; // seconds
    const tpsAll = batch / stepLatency; // batch tokens produced per step
    const tpsUser = 1 / stepLatency;

    el.querySelector(".inf-w").textContent = fmtBytes(weightBytes);
    el.querySelector(".inf-kv").textContent = fmtBytes(kvBytes);
    el.querySelector(".inf-lat").textContent = fmtTime(stepLatency);
    el.querySelector(".inf-tps").textContent = Math.round(tpsAll).toLocaleString("en-US");

    const kvShare = kvBytes / bytesPerStep;
    let msg;
    if (batch === 1 && kvShare < 0.15) {
      msg =
        `At batch 1 you're almost entirely paying to <b>read the weights</b> — ${fmtBytes(weightBytes)} ` +
        `hauled from HBM for a single token, ~<b>${fmtTime(stepLatency)}</b>. The math barely matters; ` +
        `the memory bus does. That's why one token from a ${m.label} model takes tens of milliseconds.`;
    } else if (kvShare >= 0.5) {
      msg =
        `Now the <b>KV cache dominates</b> (${(kvShare * 100).toFixed(0)}% of the read) — long context turned ` +
        `this into a <b>memory problem</b>, not a compute one. This is exactly what GQA, paging, and a ` +
        `quantized KV cache attack. Note the cache alone is ${fmtBytes(kvBytes)}.`;
    } else {
      msg =
        `Batching is doing its job: the ${fmtBytes(weightBytes)} weight read is <b>shared across all ${batch} ` +
        `sequences</b>, so throughput climbs to <b>${Math.round(tpsAll).toLocaleString("en-US")} tok/s</b> ` +
        `while each user still sees ~${Math.round(tpsUser)} tok/s. Same weight read, more tokens out.`;
    }
    el.querySelector(".inf-verdict").innerHTML = msg;
  }

  [modelEl, precEl, bwEl].forEach((c) => c.addEventListener("change", render));
  [batchEl, ctxEl].forEach((c) => c.addEventListener("input", render));
  render();
}

/* =======================================================================
   2) KV-cache decode visualizer
   Step through decode. Cache OFF -> recompute K,V for every prior token each
   step (work grows with position; total is O(n^2)). Cache ON -> compute K,V
   for the one new token, reuse the rest (O(n) total) but the cache grows.
   ======================================================================= */
const KV_PROMPT = 3; // tokens already in the prompt
const KV_MAX = 9; // how many tokens we let it generate

export function mountKvCacheViz(el) {
  el.innerHTML = `
    <div class="kv">
      <div class="kv__bar">
        <div class="kv__toggle" role="group" aria-label="KV cache">
          <button class="btn kv__mode is-on" data-cache="off">Cache OFF</button>
          <button class="btn kv__mode" data-cache="on">Cache ON</button>
        </div>
        <div class="kv__ctrls">
          <button class="btn btn--primary kv__next">Generate next token →</button>
          <button class="btn kv__reset">Reset</button>
          <span class="kv__progress"></span>
        </div>
      </div>

      <p class="kv__label kv__label--seq">Sequence · attention recomputed this step is highlighted</p>
      <div class="kv__strip kv__seq"></div>

      <p class="kv__label kv__label--cache">KV cache in HBM</p>
      <div class="kv__strip kv__cache"></div>

      <div class="kv__stats">
        <div class="kv-stat"><span class="kv-stat__k">K/V computed this step</span><span class="kv-stat__v kv-step"></span></div>
        <div class="kv-stat kv-stat--hl"><span class="kv-stat__k">Total K/V computed so far</span><span class="kv-stat__v kv-total"></span></div>
        <div class="kv-stat"><span class="kv-stat__k">Scaling</span><span class="kv-stat__v kv-order"></span></div>
      </div>
      <p class="kv__note"></p>
    </div>`;

  const state = { gen: 0, cache: "off", total: 0 };
  const seqEl = el.querySelector(".kv__seq");
  const cacheEl = el.querySelector(".kv__cache");
  const nextEl = el.querySelector(".kv__next");
  const resetEl = el.querySelector(".kv__reset");

  function reset() {
    state.gen = 0;
    state.total = 0;
    render(0);
  }

  // work this step, given we've already generated `g` tokens (about to make g+1)
  function stepWork(g) {
    const L = KV_PROMPT + g; // current sequence length before this new token
    return state.cache === "on" ? 1 : L; // ON: just the new token; OFF: all of them
  }

  function render(stepCost) {
    const L = KV_PROMPT + state.gen; // tokens that exist now
    const done = state.gen >= KV_MAX;

    // sequence strip
    let seq = "";
    for (let i = 0; i < L; i++) {
      const isPrompt = i < KV_PROMPT;
      const isNew = i === L - 1 && state.gen > 0; // the token we just produced
      let cls = "kv-cell";
      let tag = isPrompt ? "p" : "t" + (i - KV_PROMPT + 1);
      // highlight what attention had to (re)compute to make the last token
      if (state.gen > 0) {
        if (state.cache === "off") cls += " is-recompute";
        else cls += isNew ? " is-new" : " is-cached";
      }
      seq += `<span class="${cls}"><span class="kv-cell__i">${tag}</span></span>`;
    }
    seqEl.innerHTML = seq;

    // cache strip
    let cache = "";
    if (state.cache === "on") {
      for (let i = 0; i < L; i++) {
        const isNew = i === L - 1 && state.gen > 0;
        cache += `<span class="kv-slot${isNew ? " is-new" : " is-filled"}">K,V</span>`;
      }
    } else {
      cache = `<span class="kv-slot kv-slot--empty">— no cache — recompute every step —</span>`;
    }
    cacheEl.innerHTML = cache;

    el.querySelector(".kv-step").textContent = state.gen === 0 ? "—" : String(stepCost);
    el.querySelector(".kv-total").textContent = state.total;
    el.querySelector(".kv-order").textContent = state.cache === "on" ? "O(n) linear" : "O(n²) quadratic";
    el.querySelector(".kv__progress").textContent = `${state.gen} / ${KV_MAX} generated`;
    nextEl.disabled = done;
    nextEl.textContent = done ? "Done — hit Reset" : "Generate next token →";

    const note =
      state.gen === 0
        ? `A ${KV_PROMPT}-token prompt is loaded. Hit <b>Generate</b> and watch the cost of each new token.`
        : state.cache === "on"
          ? `With the cache on, each token computes K,V <b>once</b> (green) and reuses everything before it. ` +
            `Total work grows <b>linearly</b> — but so does the cache in HBM. <b>That</b> is the price of long context.`
          : `Without a cache, every new token re-derives K,V for <b>all ${L}</b> tokens (amber). ` +
            `The per-step cost keeps climbing, so total work is <b>quadratic</b> — hopelessly slow past a few hundred tokens.`;
    el.querySelector(".kv__note").innerHTML = note;
  }

  nextEl.addEventListener("click", () => {
    if (state.gen >= KV_MAX) return;
    const cost = stepWork(state.gen);
    state.total += cost;
    state.gen += 1;
    render(cost);
  });
  resetEl.addEventListener("click", reset);
  el.querySelectorAll(".kv__mode").forEach((b) => {
    b.addEventListener("click", () => {
      state.cache = b.dataset.cache;
      el.querySelectorAll(".kv__mode").forEach((x) => x.classList.toggle("is-on", x === b));
      reset();
    });
  });

  reset();
}
