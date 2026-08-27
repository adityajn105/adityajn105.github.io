/* Widget logic for "How GPT Works — Part 4: Training & Generation".
   Exports: mountSampling (temperature / top-k / top-p), mountTraining (live
   cross-entropy descent). Styling in src/styles/gpt-widgets.css. */

/* ======================================================================
   Sampling playground — reshape a fixed next-token distribution.
   ====================================================================== */
export function mountSampling(el) {
  const cands = [
    ["sunny", 0.28], ["warm", 0.17], ["nice", 0.11], ["cold", 0.10],
    ["cloudy", 0.08], ["rainy", 0.07], ["hot", 0.06], ["humid", 0.05],
    ["freezing", 0.04], ["grim", 0.04],
  ];
  let temp = 1.0, k = 0, p = 1.0; // k=0 → off, p=1 → off

  el.innerHTML = `
    <p class="sp-context mono">“The weather today is …”</p>
    <div class="controls">
      <div class="control"><label>Temperature · <span class="sp-tv mono">1.0</span></label>
        <input type="range" class="sp-temp" min="0.1" max="2" step="0.1" value="1"/></div>
      <div class="control"><label>top-k · <span class="sp-kv mono">off</span></label>
        <input type="range" class="sp-k" min="0" max="10" step="1" value="0"/></div>
      <div class="control"><label>top-p (nucleus) · <span class="sp-pv mono">off</span></label>
        <input type="range" class="sp-p" min="0.1" max="1" step="0.05" value="1"/></div>
    </div>
    <div class="sp-rows"></div>
    <p class="figure__cap">Temperature reshapes the distribution (low = peaky/greedy, high = flat/wild).
      <b>top-k</b> keeps only the k most likely tokens; <b>top-p</b> keeps the smallest set whose
      probability sums past p. Whatever survives is renormalized and sampled from — dimmed bars were
      cut. Turn temperature to its minimum to approximate <b>greedy</b> decoding.</p>`;

  const rows = el.querySelector(".sp-rows");
  function render() {
    // 1) temperature on base probs: p_i^(1/T), renormalized.
    const t = cands.map(([, pr]) => Math.pow(pr, 1 / temp));
    const tsum = t.reduce((a, b) => a + b, 0);
    let dist = cands.map(([w], i) => ({ w, base: cands[i][1], p: t[i] / tsum, cut: false }));

    // 2) rank by probability for the filters.
    const order = [...dist].sort((a, b) => b.p - a.p);
    if (k > 0) order.forEach((d, i) => { if (i >= k) d.cut = true; });
    if (p < 1) {
      let cum = 0;
      for (const d of order) {
        if (d.cut) continue;
        if (cum >= p) { d.cut = true; } else { cum += d.p; }
      }
    }
    // 3) renormalize survivors.
    const surv = dist.filter((d) => !d.cut).reduce((a, b) => a + b.p, 0) || 1;
    dist.forEach((d) => (d.final = d.cut ? 0 : d.p / surv));

    const max = Math.max(...dist.map((d) => d.final), 0.001);
    rows.innerHTML = dist.map((d) => `
      <div class="sp-row ${d.cut ? "cut" : ""}">
        <span class="sp-lab mono">${d.w}</span>
        <span class="sp-bar-track"><span class="sp-bar-fill" style="width:${(d.final / max * 100).toFixed(0)}%"></span></span>
        <span class="sp-prob mono">${d.cut ? "—" : (d.final * 100).toFixed(1) + "%"}</span>
      </div>`).join("");
  }

  const bind = (sel, fn) => el.querySelector(sel).addEventListener("input", (e) => { fn(+e.target.value); render(); });
  bind(".sp-temp", (v) => { temp = v; el.querySelector(".sp-tv").textContent = v.toFixed(1); });
  bind(".sp-k", (v) => { k = v; el.querySelector(".sp-kv").textContent = v === 0 ? "off" : v; });
  bind(".sp-p", (v) => { p = v; el.querySelector(".sp-pv").textContent = v >= 1 ? "off" : v.toFixed(2); });
  render();
}

/* ======================================================================
   Training — watch cross-entropy loss fall as the model learns to put
   probability on the correct next token. Gradient: dL/dz = p − onehot.
   ====================================================================== */
export function mountTraining(el) {
  const labels = ["cat", "dog", "sat", "ran", "the", "mat"];
  const target = 2; // correct next token = "sat"
  const init = [0.5, 0.4, 0.6, 0.3, 0.9, 0.2]; // "the" wrongly favored at first
  let logits, history, timer = null;
  const lr = 0.9;

  const softmax = (z) => {
    const m = Math.max(...z), e = z.map((v) => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0);
    return e.map((v) => v / s);
  };

  function reset() {
    logits = init.slice();
    history = [-Math.log(softmax(logits)[target])];
    stopAuto();
    render();
  }
  function step() {
    const p = softmax(logits);
    logits = logits.map((z, i) => z - lr * (p[i] - (i === target ? 1 : 0)));
    history.push(-Math.log(softmax(logits)[target]));
    if (history.length > 60) stopAuto();
    render();
  }
  function stopAuto() { if (timer) { clearInterval(timer); timer = null; } updateAutoLabel(); }
  function updateAutoLabel() {
    const b = el.querySelector(".tr-auto"); if (b) b.textContent = timer ? "⏸ Pause" : "▶ Auto-train";
  }

  el.innerHTML = `
    <div class="controls">
      <button class="btn btn--primary tr-step">→ One training step</button>
      <button class="btn tr-auto">▶ Auto-train</button>
      <button class="btn tr-reset">↺ Reset</button>
    </div>
    <div class="tr-grid">
      <div>
        <div class="tr-caption mono">predicted P(next token) · target = <b>sat</b></div>
        <div class="tr-bars"></div>
      </div>
      <div>
        <div class="tr-caption mono">cross-entropy loss = −log&nbsp;P(<b>sat</b>)</div>
        <svg class="tr-curve viz-svg" viewBox="0 0 240 140" preserveAspectRatio="none" role="img" aria-label="Loss curve"></svg>
        <div class="tr-loss mono"></div>
      </div>
    </div>
    <p class="figure__cap">Training shows the model the real next token and pushes probability toward
      it. The gradient of cross-entropy is beautifully simple — <b>predicted minus target</b> — so
      each step nudges the correct token up and the rest down, and the loss falls. Do this across
      trillions of tokens and next-token prediction alone produces everything a GPT can do.</p>`;

  function render() {
    const p = softmax(logits);
    const max = Math.max(...p);
    el.querySelector(".tr-bars").innerHTML = labels.map((lab, i) => `
      <div class="tr-bar ${i === target ? "target" : ""}">
        <span class="tr-bar-lab mono">${lab}</span>
        <span class="tr-bar-track"><span class="tr-bar-fill" style="width:${(p[i] / max * 100).toFixed(0)}%"></span></span>
        <span class="tr-bar-p mono">${(p[i] * 100).toFixed(0)}%</span>
      </div>`).join("");

    const loss = history[history.length - 1];
    el.querySelector(".tr-loss").innerHTML = `step ${history.length - 1} · loss <b>${loss.toFixed(3)}</b>`;

    // loss curve
    const W = 240, H = 140, pad = 6, maxL = Math.max(...history, 2);
    const n = history.length;
    const pts = history.map((l, i) => {
      const x = pad + (n === 1 ? 0 : (i / (n - 1)) * (W - 2 * pad));
      const y = pad + (1 - l / maxL) * (H - 2 * pad);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    el.querySelector(".tr-curve").innerHTML =
      `<polyline class="tr-curve-line" points="${pts}"/>` +
      (n ? `<circle class="tr-curve-dot" r="3" cx="${pts.split(" ").pop().split(",")[0]}" cy="${pts.split(" ").pop().split(",")[1]}"/>` : "");
  }

  el.querySelector(".tr-step").addEventListener("click", () => { stopAuto(); step(); });
  el.querySelector(".tr-reset").addEventListener("click", reset);
  el.querySelector(".tr-auto").addEventListener("click", () => {
    if (timer) { stopAuto(); return; }
    timer = setInterval(() => { if (history.length > 60) stopAuto(); else step(); }, 350);
    updateAutoLabel();
  });
  reset();
}
