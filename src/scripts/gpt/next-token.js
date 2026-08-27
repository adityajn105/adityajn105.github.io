/* Widget logic for the "How GPT Works" series — the autoregressive loop.
   A hand-authored toy "language model" (a transition table over the last
   word) so the loop is real and interactive without downloading a model. */

const TABLE = {
  the:    [["mat",.34],["floor",.19],["warm",.13],["roof",.10],["sofa",.09],["edge",.08],["table",.07]],
  models: [["are",.55],["can",.17],["have",.12],["learn",.09],["will",.07]],
  are:    [["trained",.26],["powerful",.16],["just",.12],["able",.11],["neural",.10],["good",.09],["everywhere",.16]],
  to:     [["be",.30],["learn",.16],["predict",.15],["the",.12],["generate",.11],["understand",.16]],
  not:    [["to",.52],["a",.18],["just",.12],["only",.10],["the",.08]],
  be:     [["or",.40],["the",.18],["a",.14],["able",.10],["trained",.10],["good",.08]],
  or:     [["not",.60],["to",.16],["a",.12],["the",.12]],
  cat:    [["sat",.40],["is",.18],["ran",.14],["slept",.12],["jumped",.16]],
  sat:    [["on",.62],["down",.16],["quietly",.12],["still",.10]],
  on:     [["the",.68],["a",.16],["top",.10],["its",.06]],
  large:  [["language",.58],["models",.20],["scale",.12],["amounts",.10]],
  language:[["models",.70],["is",.12],["and",.10],["processing",.08]],
};
const FALLBACK = [["the",.22],["a",.15],["and",.13],["to",.12],["of",.10],["is",.09],["that",.09],["it",.10]];

const PROMPTS = [
  "The cat sat on the",
  "Large language models are",
  "To be or not to",
];

const clean = (w) => w.toLowerCase().replace(/[^a-z]/g, "");
const dist = (tok) => (TABLE[clean(tok)] || FALLBACK).slice().sort((a, b) => b[1] - a[1]);

export function mountNextToken(el) {
  let tokens = PROMPTS[0].split(" ");
  let temp = 1;

  el.innerHTML = `
    <div class="controls">
      <div class="control" style="flex:1;min-width:220px">
        <label>Prompt</label>
        <select class="nt-prompt btn" style="text-align:left"></select>
      </div>
      <div class="control">
        <label>Temperature · <span class="nt-tval mono">1.0</span></label>
        <input type="range" class="nt-temp" min="0.1" max="2" step="0.1" value="1" />
      </div>
    </div>

    <div class="nt-stage">
      <div class="nt-text"></div>
      <div class="nt-arrow mono">predict next token ↓</div>
      <div class="nt-bars"></div>
      <p class="figure__cap">Each bar is the model's estimated probability for the next token.
        <b>Click a bar</b> to pick it yourself, or let the model sample.</p>
    </div>

    <div class="controls">
      <button class="btn btn--primary nt-sample">⚄ Sample next token</button>
      <button class="btn nt-step">→ Take most likely</button>
      <button class="btn nt-reset">↺ Reset</button>
    </div>`;

  const $ = (s) => el.querySelector(s);
  const promptSel = $(".nt-prompt");
  promptSel.innerHTML = PROMPTS.map((p, i) => `<option value="${i}">${p}…</option>`).join("");

  const textEl = $(".nt-text");
  const barsEl = $(".nt-bars");

  function softmaxTemp(pairs, t) {
    const raw = pairs.map(([tok, p]) => [tok, Math.pow(p, 1 / t)]);
    const z = raw.reduce((s, [, p]) => s + p, 0);
    return raw.map(([tok, p]) => [tok, p / z]);
  }

  function render(justAdded = false) {
    textEl.innerHTML = tokens
      .map((t, i) => `<span class="nt-tok ${i === tokens.length - 1 ? "is-last" : ""} ${justAdded && i === tokens.length - 1 ? "nt-pop" : ""}">${t}</span>`)
      .join(" ") + ` <span class="nt-cursor">▍</span>`;

    const pairs = softmaxTemp(dist(tokens[tokens.length - 1]), temp);
    const max = Math.max(...pairs.map((p) => p[1]));
    barsEl.innerHTML = pairs.map(([tok, p]) => `
      <button class="nt-bar" data-tok="${tok}" title="Pick “${tok}”">
        <span class="nt-bar-label mono">${tok}</span>
        <span class="nt-bar-track"><span class="nt-bar-fill" style="width:${(p / max) * 100}%"></span></span>
        <span class="nt-bar-pct mono">${(p * 100).toFixed(0)}%</span>
      </button>`).join("");

    barsEl.querySelectorAll(".nt-bar").forEach((b) =>
      b.addEventListener("click", () => add(b.dataset.tok)));
  }

  function add(tok) { tokens.push(tok); render(true); }

  function sample() {
    const pairs = softmaxTemp(dist(tokens[tokens.length - 1]), temp);
    let r = Math.random(), acc = 0;
    for (const [tok, p] of pairs) { acc += p; if (r <= acc) return add(tok); }
    add(pairs[pairs.length - 1][0]);
  }

  function greedy() {
    const pairs = softmaxTemp(dist(tokens[tokens.length - 1]), temp);
    add(pairs.reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
  }

  promptSel.addEventListener("change", () => { tokens = PROMPTS[+promptSel.value].split(" "); render(); });
  $(".nt-temp").addEventListener("input", (e) => { temp = +e.target.value; $(".nt-tval").textContent = temp.toFixed(1); render(); });
  $(".nt-sample").addEventListener("click", sample);
  $(".nt-step").addEventListener("click", greedy);
  $(".nt-reset").addEventListener("click", () => { tokens = PROMPTS[+promptSel.value].split(" "); render(); });

  render();
}
