/* Widget logic for "How GPT Works — Part 2: Attention".
   Framework-agnostic mount(el) functions; styling in src/styles/gpt-widgets.css.
   Exports: mountSelfAttention, mountAlignment, mountHeads, mountPositional. */

const fmt = (n) => (n >= 0 ? "+" : "") + n.toFixed(2);

/* ======================================================================
   Self-attention (scaled dot-product Q·K → softmax → weighted sum of V)
   Toy 2-D vectors, hand-picked so "it" resolves to "cat".
   ====================================================================== */
export function mountSelfAttention(el) {
  // Each token carries a query, key and value vector (d = 2).
  const toks = [
    { w: "the",    q: [0.2, 0.1],  k: [0.3, 0.2], v: [0.1, 0.9] },
    { w: "cat",    q: [0.9, 0.8],  k: [0.9, 0.7], v: [0.8, 0.2] },
    { w: "chased", q: [0.3, 0.9],  k: [0.2, 0.8], v: [0.5, 0.5] },
    { w: "it",     q: [0.85, 0.75],k: [0.4, 0.3], v: [0.3, 0.7] },
  ];
  const d = 2, scale = Math.sqrt(d);
  let sel = 3; // start on "it"

  el.innerHTML = `
    <div class="sa-toks" role="tablist" aria-label="Pick the query token"></div>
    <p class="sa-lead mono"></p>
    <div class="sa-rows"></div>
    <div class="sa-out mono"></div>
    <p class="figure__cap">Every token emits a <b>query</b>, a <b>key</b> and a <b>value</b>.
      The query of the chosen token is dot-producted with <em>every</em> key, scaled by
      <b>√d</b>, and softmaxed into attention weights — then the output is the weighted blend of
      values. Pick <b>it</b> and watch attention land on <b>cat</b>: that is how a model resolves
      what a pronoun refers to.</p>`;

  const tabs = el.querySelector(".sa-toks");
  tabs.innerHTML = toks.map((t, i) =>
    `<button class="sa-tok" role="tab" data-i="${i}" aria-selected="${i === sel}">${t.w}</button>`).join("");

  function render() {
    const qv = toks[sel].q;
    const scores = toks.map((t) => (qv[0] * t.k[0] + qv[1] * t.k[1]) / scale);
    const m = Math.max(...scores);
    const exps = scores.map((s) => Math.exp(s - m));
    const sum = exps.reduce((a, b) => a + b, 0);
    const w = exps.map((e) => e / sum);
    const out = [0, 1].map((d) => toks.reduce((acc, t, j) => acc + w[j] * t.v[d], 0));

    el.querySelectorAll(".sa-tok").forEach((b, i) => b.setAttribute("aria-selected", i === sel));
    el.querySelector(".sa-lead").innerHTML =
      `query <b>${toks[sel].w}</b> = [${qv.join(", ")}] · dotted with each key ÷ √${d}:`;

    const max = Math.max(...w);
    el.querySelector(".sa-rows").innerHTML = toks.map((t, j) => `
      <div class="sa-row ${j === sel ? "is-self" : ""}">
        <span class="sa-row-lab mono">${t.w}</span>
        <span class="sa-row-k mono">k=[${t.k.join(", ")}]</span>
        <span class="sa-row-s mono">${fmt(scores[j])}</span>
        <span class="sa-bar-track"><span class="sa-bar-fill" style="width:${(w[j] / max * 100).toFixed(0)}%"></span></span>
        <span class="sa-row-w mono">${(w[j] * 100).toFixed(0)}%</span>
      </div>`).join("");

    const top = w.indexOf(Math.max(...w));
    el.querySelector(".sa-out").innerHTML =
      `output = Σ&nbsp;wⱼ·vⱼ = [${out[0].toFixed(2)}, ${out[1].toFixed(2)}] &nbsp;→&nbsp; ` +
      `a new vector for <b>${toks[sel].w}</b>, mostly built from <b>${toks[top].w}</b>`;
  }

  tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".sa-tok"); if (!b) return;
    sel = +b.dataset.i; render();
  });
  render();
}

/* ======================================================================
   Shared heatmap renderer (rows attend over cols; opacity ∝ weight)
   ====================================================================== */
function renderHeatmap(el, { rows, cols, matrix, rowLabel, colLabel }) {
  const cell = (v) =>
    `<td class="heat-cell" data-v="${v}" style="background:color-mix(in srgb, var(--accent) ${Math.round(v * 100)}%, transparent)"><span>${v.toFixed(2)}</span></td>`;
  el.innerHTML = `
    <div class="heat-wrap">
      <table class="heat" role="grid">
        <thead><tr><th class="heat-corner"></th>${cols.map((c) => `<th scope="col" class="heat-col mono">${c}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map((r, i) => `<tr data-row="${i}"><th scope="row" class="heat-row mono">${r}</th>${matrix[i].map(cell).join("")}</tr>`).join("")}
        </tbody>
      </table>
    </div>
    <p class="heat-axis mono"><span class="heat-axis-r">↕ ${rowLabel}</span> · <span class="heat-axis-c">↔ ${colLabel}</span></p>`;

  // Hover a row → dim the others so its distribution stands out.
  const trs = [...el.querySelectorAll("tbody tr")];
  const focus = (i) => trs.forEach((tr, k) => tr.classList.toggle("dim", i != null && k !== i));
  trs.forEach((tr, i) => {
    tr.addEventListener("mouseenter", () => focus(i));
    tr.addEventListener("mouseleave", () => focus(null));
  });
}

/* Cross-attention: EN source ↔ FR target, note the re-ordering. */
export function mountAlignment(el) {
  renderHeatmap(el, {
    rows: ["la", "maison", "rouge"],
    cols: ["the", "red", "house"],
    matrix: [
      [0.80, 0.10, 0.10],
      [0.15, 0.10, 0.75],
      [0.10, 0.80, 0.10],
    ],
    rowLabel: "French output token (query)",
    colLabel: "English input token (key)",
  });
  const cap = document.createElement("p");
  cap.className = "figure__cap";
  cap.innerHTML = `Each output word looks back over <em>all</em> input words and picks what it needs.
    <b>rouge</b> aligns to <b>red</b> even though the word order flips — attention handles reordering
    that a single fixed context vector never could. Hover a row to isolate its focus.`;
  el.appendChild(cap);
}

/* Multi-head: same sentence, three heads that learned different relations. */
export function mountHeads(el) {
  const cols = ["the", "cat", "sat", "down"];
  const heads = {
    "Head A · previous token": [
      [1.0, 0.0, 0.0, 0.0],
      [0.9, 0.1, 0.0, 0.0],
      [0.10, 0.85, 0.05, 0.0],
      [0.0, 0.10, 0.85, 0.05],
    ],
    "Head B · verb ↔ subject": [
      [0.70, 0.20, 0.10, 0.0],
      [0.20, 0.50, 0.30, 0.0],
      [0.05, 0.80, 0.15, 0.0],
      [0.0, 0.15, 0.80, 0.05],
    ],
    "Head C · broad context": [
      [0.40, 0.20, 0.20, 0.20],
      [0.20, 0.40, 0.20, 0.20],
      [0.20, 0.20, 0.40, 0.20],
      [0.20, 0.20, 0.20, 0.40],
    ],
  };
  const names = Object.keys(heads);
  let sel = 0;

  el.innerHTML = `
    <div class="controls">
      <div class="control" style="flex:1;min-width:220px">
        <label>Attention head</label>
        <select class="mh-sel btn" style="text-align:left">
          ${names.map((n, i) => `<option value="${i}">${n}</option>`).join("")}
        </select>
      </div>
    </div>
    <div class="mh-heat"></div>
    <p class="figure__cap">One head is not enough — a transformer runs several in parallel and
      concatenates them. Flip between heads: one tracks the <b>previous token</b>, another links a
      <b>verb to its subject</b>, another spreads attention <b>broadly</b>. Different heads, different
      relationships, all learned.</p>`;

  const heat = el.querySelector(".mh-heat");
  const draw = () => renderHeatmap(heat, {
    rows: cols, cols, matrix: heads[names[sel]],
    rowLabel: "querying token", colLabel: "attended token",
  });
  el.querySelector(".mh-sel").addEventListener("change", (e) => { sel = +e.target.value; draw(); });
  draw();
}

/* ======================================================================
   Positional encoding — sinusoidal PE(pos, i) heatmap, computed live
   ====================================================================== */
export function mountPositional(el) {
  const D = 32;           // model dimension (columns)
  let N = 24;             // sequence length (rows)

  const pe = (pos, i) => {
    const angle = pos / Math.pow(10000, (2 * Math.floor(i / 2)) / D);
    return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  };
  // Diverging colour: + → accent, − → secondary; |value| → opacity.
  const colour = (v) => {
    const c = v >= 0 ? "var(--accent)" : "var(--gpt-c2)";
    return `color-mix(in srgb, ${c} ${Math.round(Math.abs(v) * 100)}%, transparent)`;
  };

  el.innerHTML = `
    <div class="controls">
      <div class="control">
        <label>Sequence length · <span class="pe-nv mono">24</span></label>
        <input type="range" class="pe-n" min="6" max="40" step="1" value="24"/>
      </div>
    </div>
    <div class="pe-grid" role="img" aria-label="Positional-encoding heatmap"></div>
    <div class="pe-legend mono"><span class="pe-sw" style="background:var(--gpt-c2)"></span>−1
      <span class="pe-sw pe-sw0"></span>0
      <span class="pe-sw" style="background:var(--accent)"></span>+1</div>
    <p class="figure__cap">Attention alone is order-blind — shuffle the input and the maths is
      unchanged. So we <b>add</b> this fixed pattern to every embedding. Each row is one position's
      code; low dimensions (left) oscillate fast, high dimensions (right) slowly — together they
      give every position a unique fingerprint, and nearby rows look alike so the model can feel
      <em>closeness</em>. Drag to change the sequence length.</p>`;

  const grid = el.querySelector(".pe-grid");
  function draw() {
    let html = "";
    for (let pos = 0; pos < N; pos++) {
      html += `<div class="pe-rowline">`;
      for (let i = 0; i < D; i++) {
        const v = pe(pos, i);
        html += `<span class="pe-cell" style="background:${colour(v)}" title="pos ${pos}, dim ${i}: ${v.toFixed(2)}"></span>`;
      }
      html += `</div>`;
    }
    grid.style.setProperty("--pe-cols", D);
    grid.innerHTML = html;
  }
  el.querySelector(".pe-n").addEventListener("input", (e) => {
    N = +e.target.value; el.querySelector(".pe-nv").textContent = N; draw();
  });
  draw();
}
