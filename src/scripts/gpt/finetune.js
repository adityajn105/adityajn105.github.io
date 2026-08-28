/* Widget logic for the "Fine-Tuning & Serving" post:
   1) a LoRA rank explorer (why low-rank adapters are cheap)
   2) a quantization memory calculator (why 4-bit lets a big model fit)
   Framework-agnostic mount(el). Styling lives in gpt-widgets.css.
   The LoRA math mirrors src/lora_demo.py: full = d*d, adapter = 2*d*r. */

/* ---- helpers ---------------------------------------------------------- */
function fmtInt(n) {
  return n.toLocaleString("en-US");
}
function fmtCompact(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return String(n);
}

/* =======================================================================
   1) LoRA rank explorer
   ======================================================================= */
export function mountLoraExplorer(el) {
  el.innerHTML = `
    <div class="ft-lora">
      <div class="controls">
        <div class="control">
          <label>Weight matrix size · d = <span class="ft-dv"></span></label>
          <input type="range" class="ft-d" min="256" max="8192" step="256" value="4096">
        </div>
        <div class="control">
          <label>Adapter rank · r = <span class="ft-rv"></span></label>
          <input type="range" class="ft-r" min="1" max="128" step="1" value="8">
        </div>
      </div>

      <div class="ft-diagram">
        <div class="ft-mat ft-mat--w"><span class="ft-mat__lbl">W (frozen)</span><span class="ft-mat__dim ft-wdim"></span></div>
        <span class="ft-plus">+</span>
        <div class="ft-mat ft-mat--b"><span class="ft-mat__lbl">B</span><span class="ft-mat__dim ft-bdim"></span></div>
        <span class="ft-times">×</span>
        <div class="ft-mat ft-mat--a"><span class="ft-mat__lbl">A</span><span class="ft-mat__dim ft-adim"></span></div>
      </div>

      <div class="ft-stats">
        <div class="ft-stat"><span class="ft-stat__k">Full fine-tune</span><span class="ft-stat__v ft-full"></span><span class="ft-stat__u">params in W</span></div>
        <div class="ft-stat ft-stat--hl"><span class="ft-stat__k">LoRA (train only B, A)</span><span class="ft-stat__v ft-lora"></span><span class="ft-stat__u">params · 2·d·r</span></div>
        <div class="ft-stat"><span class="ft-stat__k">Trainable</span><span class="ft-stat__v ft-pct"></span><span class="ft-stat__u">of the original</span></div>
      </div>
      <p class="ft-verdict"></p>
    </div>`;

  const dEl = el.querySelector(".ft-d");
  const rEl = el.querySelector(".ft-r");

  function render() {
    const d = +dEl.value;
    const r = +rEl.value;
    el.querySelector(".ft-dv").textContent = d;
    el.querySelector(".ft-rv").textContent = r;

    const full = d * d;
    const lora = 2 * d * r;
    const pct = (lora / full) * 100;
    const ratio = Math.round(full / lora);

    el.querySelector(".ft-full").textContent = fmtCompact(full);
    el.querySelector(".ft-lora").textContent = fmtCompact(lora);
    el.querySelector(".ft-pct").textContent = pct < 1 ? pct.toFixed(2) + "%" : pct.toFixed(1) + "%";
    el.querySelector(".ft-wdim").textContent = `${d}×${d}`;
    el.querySelector(".ft-bdim").textContent = `${d}×${r}`;
    el.querySelector(".ft-adim").textContent = `${r}×${d}`;
    el.querySelector(".ft-verdict").innerHTML =
      `A rank-<b>${r}</b> adapter trains <b>${fmtInt(lora)}</b> numbers instead of <b>${fmtInt(full)}</b> — ` +
      `about <b>${ratio}× fewer</b>. That's why a 7B model fine-tunes on one consumer GPU.`;

    // visual widths: B is d-tall, r-wide; A is r-tall, d-wide. Scale r visually.
    const rW = Math.max(6, Math.min(70, 6 + r * 0.9)); // px-ish, capped
    el.querySelector(".ft-mat--b").style.width = rW + "px";
    el.querySelector(".ft-mat--a").style.height = rW + "px";
  }

  dEl.addEventListener("input", render);
  rEl.addEventListener("input", render);
  render();
}

/* =======================================================================
   2) Quantization memory calculator
   ======================================================================= */
const PRECISIONS = [
  { id: "fp32", label: "FP32 (full)", bytes: 4 },
  { id: "fp16", label: "FP16 / BF16", bytes: 2 },
  { id: "int8", label: "INT8", bytes: 1 },
  { id: "int4", label: "INT4 (QLoRA)", bytes: 0.5 },
];
const GPUS = [
  { name: "RTX 4090", gb: 24 },
  { name: "A100", gb: 80 },
  { name: "H100", gb: 80 },
];
const SAMPLE = 0.3172; // a single weight value, rounded per precision

export function mountQuantize(el) {
  el.innerHTML = `
    <div class="ft-q">
      <div class="controls">
        <div class="control">
          <label>Model size · <span class="ft-pv"></span>B parameters</label>
          <input type="range" class="ft-params" min="0.5" max="70" step="0.5" value="7">
        </div>
        <div class="control">
          <label>Precision</label>
          <select class="ft-prec">
            ${PRECISIONS.map((p) => `<option value="${p.id}"${p.id === "fp16" ? " selected" : ""}>${p.label} · ${p.bytes} B/param</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="ft-q__mem">
        <span class="ft-q__memv"></span>
        <span class="ft-q__memu">just for the weights</span>
      </div>
      <div class="ft-q__gpus"></div>
      <p class="ft-q__note"></p>
    </div>`;

  const paramsEl = el.querySelector(".ft-params");
  const precEl = el.querySelector(".ft-prec");
  const gpusEl = el.querySelector(".ft-q__gpus");

  function render() {
    const params = +paramsEl.value;
    const prec = PRECISIONS.find((p) => p.id === precEl.value);
    el.querySelector(".ft-pv").textContent = params;

    const gb = params * prec.bytes; // params(B) * bytes = GB
    el.querySelector(".ft-q__memv").textContent = gb.toFixed(1) + " GB";

    gpusEl.innerHTML = GPUS.map((g) => {
      const fits = gb <= g.gb;
      const pct = Math.min(100, (gb / g.gb) * 100);
      return `<div class="ft-gpu${fits ? " fits" : " over"}">
        <div class="ft-gpu__head"><span>${g.name}</span><span class="mono">${g.gb} GB</span></div>
        <div class="ft-gpu__track"><span class="ft-gpu__fill" style="width:${pct}%"></span></div>
        <div class="ft-gpu__verdict">${fits ? "fits ✓" : "won't fit ✗"}</div>
      </div>`;
    }).join("");

    const fp16 = params * 2;
    const save = (1 - (gb / fp16)) * 100;
    const rounded = prec.bytes >= 2 ? SAMPLE.toFixed(4)
      : prec.bytes === 1 ? (Math.round(SAMPLE * 127) / 127).toFixed(4)
      : (Math.round(SAMPLE * 7) / 7).toFixed(4); // int4: ~15 levels
    el.querySelector(".ft-q__note").innerHTML =
      `One weight <code>${SAMPLE}</code> stored at this precision ≈ <code>${rounded}</code>. ` +
      (prec.id === "fp16" ? "FP16 is the usual training/serving default."
        : prec.bytes < 2 ? `Quantizing trades a little accuracy for <b>${save.toFixed(0)}% less memory</b> vs FP16 — the reason big models fit on small GPUs.`
        : "FP32 is rarely needed for inference — it just doubles memory.");
  }

  paramsEl.addEventListener("input", render);
  precEl.addEventListener("change", render);
  render();
}
