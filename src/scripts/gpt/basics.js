/* Widget logic for the "How GPT Works" series — dot product + softmax.
   Framework-agnostic: each mount(el) renders into a container the Astro
   component provides. Styling lives in src/styles/gpt-widgets.css. */

/* ---- Dot-product & similarity playground ----------------------------- */
export function mountDotProduct(el) {
  const W = 380, H = 380, cx = W / 2, cy = H / 2, U = 42; // U = pixels per unit
  const a = { x: 2.4, y: 1.6 };
  const b = { x: 1.2, y: 2.7 };
  const toPx = (v) => ({ x: cx + v.x * U, y: cy - v.y * U });
  const fmt = (n) => (n >= 0 ? "+" : "") + n.toFixed(2);

  el.innerHTML = `
    <div class="dp-grid">
      <svg class="dp-svg viz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Two draggable vectors on a plane">
        <defs>
          <marker id="ah-a" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="var(--gpt-c2)"/></marker>
          <marker id="ah-b" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill="var(--accent)"/></marker>
        </defs>
        <g class="dp-axes"></g>
        <g class="dp-vecs">
          <line class="dp-line-a"/><line class="dp-line-b"/>
          <circle class="dp-handle dp-a" r="10"/><circle class="dp-handle dp-b" r="10"/>
          <text class="dp-lbl dp-lbl-a">a</text><text class="dp-lbl dp-lbl-b">b</text>
        </g>
      </svg>
      <div class="dp-readout">
        <div class="dp-verdict"></div>
        <table class="dp-table mono">
          <tr><td>a</td><td class="dp-av"></td></tr>
          <tr><td>b</td><td class="dp-bv"></td></tr>
          <tr class="dp-hl"><td>a · b</td><td class="dp-dot"></td></tr>
          <tr><td>|a|,&nbsp;|b|</td><td class="dp-mag"></td></tr>
          <tr><td>cos θ</td><td class="dp-cos"></td></tr>
          <tr><td>angle</td><td class="dp-ang"></td></tr>
        </table>
        <p class="dp-hint">Drag either arrowhead.</p>
      </div>
    </div>`;

  const svg = el.querySelector(".dp-svg");
  const axes = el.querySelector(".dp-axes");
  let g = "";
  for (let i = -4; i <= 4; i++) {
    g += `<line x1="${cx + i * U}" y1="0" x2="${cx + i * U}" y2="${H}" class="dp-gl"/>`;
    g += `<line x1="0" y1="${cy + i * U}" x2="${W}" y2="${cy + i * U}" class="dp-gl"/>`;
  }
  g += `<line x1="0" y1="${cy}" x2="${W}" y2="${cy}" class="dp-ax"/><line x1="${cx}" y1="0" x2="${cx}" y2="${H}" class="dp-ax"/>`;
  axes.innerHTML = g;

  const q = (s) => el.querySelector(s);
  function render() {
    const pa = toPx(a), pb = toPx(b);
    q(".dp-line-a").setAttribute("x1", cx); q(".dp-line-a").setAttribute("y1", cy);
    q(".dp-line-a").setAttribute("x2", pa.x); q(".dp-line-a").setAttribute("y2", pa.y);
    q(".dp-line-b").setAttribute("x1", cx); q(".dp-line-b").setAttribute("y1", cy);
    q(".dp-line-b").setAttribute("x2", pb.x); q(".dp-line-b").setAttribute("y2", pb.y);
    q(".dp-a").setAttribute("cx", pa.x); q(".dp-a").setAttribute("cy", pa.y);
    q(".dp-b").setAttribute("cx", pb.x); q(".dp-b").setAttribute("cy", pb.y);
    q(".dp-lbl-a").setAttribute("x", pa.x + 12); q(".dp-lbl-a").setAttribute("y", pa.y - 8);
    q(".dp-lbl-b").setAttribute("x", pb.x + 12); q(".dp-lbl-b").setAttribute("y", pb.y - 8);

    const dot = a.x * b.x + a.y * b.y;
    const ma = Math.hypot(a.x, a.y), mb = Math.hypot(b.x, b.y);
    const cos = ma && mb ? dot / (ma * mb) : 0;
    const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    q(".dp-av").textContent = `(${a.x.toFixed(1)}, ${a.y.toFixed(1)})`;
    q(".dp-bv").textContent = `(${b.x.toFixed(1)}, ${b.y.toFixed(1)})`;
    q(".dp-dot").textContent = fmt(dot);
    q(".dp-mag").textContent = `${ma.toFixed(2)}, ${mb.toFixed(2)}`;
    q(".dp-cos").textContent = fmt(cos);
    q(".dp-ang").textContent = `${ang.toFixed(0)}°`;

    const v = q(".dp-verdict");
    if (cos > 0.5) { v.textContent = "▲ pointing the same way — strong positive score"; v.className = "dp-verdict pos"; }
    else if (cos < -0.5) { v.textContent = "▼ pointing opposite — strong negative score"; v.className = "dp-verdict neg"; }
    else { v.textContent = "≈ roughly perpendicular — score near zero"; v.className = "dp-verdict zero"; }
  }

  function drag(handle, vec) {
    handle.addEventListener("pointerdown", (e) => {
      handle.setPointerCapture(e.pointerId);
      const move = (ev) => {
        const r = svg.getBoundingClientRect();
        const px = (ev.clientX - r.left) * (W / r.width);
        const py = (ev.clientY - r.top) * (H / r.height);
        vec.x = Math.max(-4.5, Math.min(4.5, Math.round(((px - cx) / U) * 10) / 10));
        vec.y = Math.max(-4.5, Math.min(4.5, Math.round(((cy - py) / U) * 10) / 10));
        render();
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", () => handle.removeEventListener("pointermove", move), { once: true });
    });
  }
  drag(q(".dp-a"), a);
  drag(q(".dp-b"), b);
  render();
}

/* ---- Softmax explorer ------------------------------------------------- */
export function mountSoftmax(el) {
  const labels = ["cat", "dog", "car", "sky"];
  const logits = [2.0, 1.0, 0.2, -0.5];
  let temp = 1.0;

  el.innerHTML = `
    <div class="controls">
      <div class="control">
        <label>Temperature · <span class="sm-tv mono">1.0</span></label>
        <input type="range" class="sm-temp" min="0.2" max="3" step="0.1" value="1"/>
      </div>
    </div>
    <div class="sm-rows"></div>
    <p class="figure__cap">Drag the <b>logit</b> sliders (raw scores) — softmax turns them into
      probabilities that always sum to <b>1</b>. Low temperature sharpens toward the top choice;
      high temperature flattens everything toward equal.</p>`;

  const rows = el.querySelector(".sm-rows");
  rows.innerHTML = labels.map((lab, i) => `
    <div class="sm-row">
      <span class="sm-lab mono">${lab}</span>
      <input type="range" class="sm-logit" data-i="${i}" min="-3" max="4" step="0.1" value="${logits[i]}"/>
      <span class="sm-logit-v mono"></span>
      <span class="sm-bar-track"><span class="sm-bar-fill" data-i="${i}"></span></span>
      <span class="sm-prob mono" data-i="${i}"></span>
    </div>`).join("");

  function render() {
    const scaled = logits.map((z) => z / temp);
    const m = Math.max(...scaled);
    const exps = scaled.map((z) => Math.exp(z - m));
    const sum = exps.reduce((s, c) => s + c, 0);
    const probs = exps.map((e) => e / sum);
    const max = Math.max(...probs);
    labels.forEach((_, i) => {
      el.querySelectorAll(".sm-logit-v")[i].textContent = logits[i].toFixed(1);
      el.querySelector(`.sm-bar-fill[data-i="${i}"]`).style.width = (probs[i] / max * 100) + "%";
      el.querySelector(`.sm-prob[data-i="${i}"]`).textContent = (probs[i] * 100).toFixed(1) + "%";
    });
  }

  el.querySelectorAll(".sm-logit").forEach((s) =>
    s.addEventListener("input", (e) => { logits[+e.target.dataset.i] = +e.target.value; render(); }));
  el.querySelector(".sm-temp").addEventListener("input", (e) => {
    temp = +e.target.value; el.querySelector(".sm-tv").textContent = temp.toFixed(1); render();
  });
  render();
}
