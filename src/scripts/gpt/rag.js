/* Widget logic for the "RAG from Scratch" post — a markdown chunker and a
   live TF-IDF retriever. Framework-agnostic: each mount(el) renders into the
   container its Astro component provides. Styling lives in gpt-widgets.css.
   The math here mirrors the from-scratch Python in the companion project:
   tokenize -> tf-idf -> L2-normalize -> cosine similarity via dot product. */

/* ---- shared: tokenizer ------------------------------------------------ */
const TOKEN = /[a-z0-9]+/g;
function tokenize(text) {
  return (text.toLowerCase().match(TOKEN) || []);
}

/* =======================================================================
   1) Markdown chunker
   Splits text into heading-aware, size-bounded chunks — exactly the
   `chunk_markdown` logic from the project, running live in the browser.
   ======================================================================= */
const CHUNK_SAMPLE = `# Self-attention

Every token emits a query and a key vector. The dot product of a query with a
key measures how relevant one token is to another.

A softmax turns those scores into attention weights that sum to one.

## Multi-head attention

Several attention operations run in parallel. Each head can specialize: one
tracks syntax, another tracks long-range references.

Their outputs are concatenated and projected back down to the model width.`;

function windowParas(text, maxChars) {
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const pieces = [];
  let buf = "";
  for (const p of paras) {
    if (buf && buf.length + p.length + 2 > maxChars) {
      pieces.push(buf);
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
}

function chunkMarkdown(md, maxChars) {
  const chunks = [];
  let heading = "(intro)";
  let section = [];
  const flush = () => {
    const text = section.join("\n").trim();
    section = [];
    if (!text) return;
    for (const piece of windowParas(text, maxChars)) {
      chunks.push({ heading, text: piece });
    }
  };
  for (const line of md.split("\n")) {
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      flush();
      heading = m[2].trim();
    } else {
      section.push(line);
    }
  }
  flush();
  return chunks;
}

export function mountChunker(el) {
  el.innerHTML = `
    <div class="rag-chunk">
      <div class="rag-chunk__io">
        <div class="control rag-chunk__inwrap">
          <label for="rag-src-${uid()}">Markdown source</label>
          <textarea class="rag-src mono" spellcheck="false" rows="10"></textarea>
        </div>
        <div class="rag-chunk__out">
          <div class="rag-chunk__head">
            <span class="rag-chunk__count"></span>
            <div class="control">
              <label>Max chunk size · <span class="rag-max"></span> chars</label>
              <input type="range" class="rag-slider" min="80" max="600" step="20" value="240">
            </div>
          </div>
          <div class="rag-chunk__list"></div>
        </div>
      </div>
    </div>`;

  const src = el.querySelector(".rag-src");
  const slider = el.querySelector(".rag-slider");
  const list = el.querySelector(".rag-chunk__list");
  const count = el.querySelector(".rag-chunk__count");
  const maxLbl = el.querySelector(".rag-max");
  src.value = CHUNK_SAMPLE;

  function render() {
    const max = +slider.value;
    maxLbl.textContent = max;
    const chunks = chunkMarkdown(src.value, max);
    count.textContent = `${chunks.length} chunk${chunks.length === 1 ? "" : "s"}`;
    list.innerHTML = chunks
      .map(
        (c, i) => `
      <div class="rag-piece">
        <div class="rag-piece__meta">
          <span class="rag-piece__idx">#${i}</span>
          <span class="rag-piece__head">${escapeHtml(c.heading)}</span>
          <span class="rag-piece__len">${c.text.length} ch</span>
        </div>
        <div class="rag-piece__text">${escapeHtml(c.text)}</div>
      </div>`
      )
      .join("");
  }

  slider.addEventListener("input", render);
  src.addEventListener("input", render);
  render();
}

/* =======================================================================
   2) TF-IDF retriever
   A tiny fixed corpus, embedded with from-scratch TF-IDF, queried with
   cosine similarity. Demonstrates why retrieval works — and where a purely
   lexical scheme fails (the "values" case).
   ======================================================================= */
const CORPUS = [
  { id: "gpt-2-attention", tag: "attention",
    text: "Self-attention lets every token look at every other token. Each token emits a query vector and a key vector, and a value vector. The dot product of a query with a key measures how relevant one token is to another." },
  { id: "gpt-2-attention", tag: "multi-head",
    text: "Multi-head attention runs several attention operations in parallel. Each head can specialize: one head tracks syntax while another tracks long-range references between words." },
  { id: "word-embeddings", tag: "embeddings",
    text: "A word embedding maps each token to a dense vector so that similar words land near each other. Meaning becomes geometry: directions in the space encode relationships between words." },
  { id: "gpt-4-training-generation", tag: "softmax",
    text: "The softmax function turns a vector of scores into a probability distribution. Larger scores get exponentially more weight, and temperature controls how sharp or flat the distribution is." },
  { id: "actor-critic", tag: "value function",
    text: "In reinforcement learning the value function estimates the expected return from a state. The critic learns these state values while the actor updates its policy toward higher-advantage actions." },
  { id: "proximal-policy-optimization", tag: "PPO",
    text: "PPO stabilizes policy-gradient training by clipping the probability ratio between the new and old policy. Clipping keeps each update small so one batch cannot push the policy too far." },
  { id: "deep-q-learning", tag: "Q-learning",
    text: "Q-learning stores the value of taking an action in a state, and updates it toward the observed reward plus the discounted best next value. It learns off-policy from sampled transitions." },
  { id: "lstm-tutorials", tag: "LSTM",
    text: "An LSTM carries a cell state across time steps, using input, forget, and output gates to decide what to store, discard, and read. This lets it remember information over long sequences." },
];

const PRESETS = [
  { label: "query key dot product", q: "query key dot product", kind: "good" },
  { label: "clipped probability ratio", q: "clipped probability ratio policy", kind: "good" },
  { label: "values  (watch it miss)", q: "values", kind: "bad" },
];

// Build the TF-IDF model once from the corpus.
function buildTfidf(docs) {
  const df = new Map();
  for (const d of docs) {
    for (const tok of new Set(tokenize(d))) df.set(tok, (df.get(tok) || 0) + 1);
  }
  const vocab = new Map([...df.keys()].sort().map((t, i) => [t, i]));
  const n = docs.length;
  const idf = new Float64Array(vocab.size);
  for (const [tok, i] of vocab) idf[i] = Math.log((1 + n) / (1 + df.get(tok))) + 1;
  return { vocab, idf };
}

function encode(text, model) {
  const { vocab, idf } = model;
  const v = new Float64Array(vocab.size);
  for (const tok of tokenize(text)) {
    const j = vocab.get(tok);
    if (j !== undefined) v[j] += 1;
  }
  let norm = 0;
  for (let i = 0; i < v.length; i++) {
    v[i] *= idf[i];
    norm += v[i] * v[i];
  }
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function mountRetriever(el) {
  const model = buildTfidf(CORPUS.map((d) => d.text));
  const docVecs = CORPUS.map((d) => encode(d.text, model));

  el.innerHTML = `
    <div class="rag-ret">
      <div class="rag-ret__bar">
        <input type="text" class="rag-q mono" placeholder="Ask something…" aria-label="Query">
        <button class="btn btn--primary rag-go">Retrieve</button>
      </div>
      <div class="rag-ret__presets">
        <span class="rag-ret__plabel">Try:</span>
        ${PRESETS.map((p, i) => `<button class="btn rag-preset" data-i="${i}">${escapeHtml(p.label)}</button>`).join("")}
      </div>
      <div class="rag-ret__note"></div>
      <div class="rag-ret__results"></div>
    </div>`;

  const input = el.querySelector(".rag-q");
  const results = el.querySelector(".rag-ret__results");
  const note = el.querySelector(".rag-ret__note");

  function run(query) {
    const qtokens = new Set(tokenize(query));
    const qvec = encode(query, model);
    const scored = CORPUS.map((d, i) => ({ d, score: dot(qvec, docVecs[i]) }))
      .sort((a, b) => b.score - a.score);
    const max = scored[0].score || 1;

    results.innerHTML = scored
      .map(({ d, score }, rank) => {
        const pct = Math.max(0, (score / max) * 100);
        const dim = score <= 1e-9 ? " is-zero" : "";
        return `
        <div class="rag-hit${rank === 0 && score > 1e-9 ? " is-top" : ""}${dim}">
          <div class="rag-hit__rank">${rank + 1}</div>
          <div class="rag-hit__body">
            <div class="rag-hit__meta">
              <span class="rag-hit__src">${escapeHtml(d.id)}</span>
              <span class="rag-hit__tag">${escapeHtml(d.tag)}</span>
              <span class="rag-hit__score mono">${score.toFixed(3)}</span>
            </div>
            <div class="rag-hit__track"><span class="rag-hit__fill" style="width:${pct}%"></span></div>
            <div class="rag-hit__text">${highlight(d.text, qtokens)}</div>
          </div>
        </div>`;
      })
      .join("");

    const preset = PRESETS.find((p) => p.q === query.trim().toLowerCase());
    if (preset && preset.kind === "bad") {
      note.className = "rag-ret__note is-warn";
      note.innerHTML =
        "You were probably thinking of attention's <b>value vectors</b> — but TF-IDF only sees the bare word <code>values</code>, which is far more common in the reinforcement-learning posts. Lexical overlap wins; meaning loses. This is exactly the gap semantic embeddings close.";
    } else {
      note.className = "rag-ret__note";
      note.innerHTML = "";
    }
  }

  el.querySelectorAll(".rag-preset").forEach((b) =>
    b.addEventListener("click", () => {
      const p = PRESETS[+b.dataset.i];
      input.value = p.q;
      run(p.q);
    })
  );
  el.querySelector(".rag-go").addEventListener("click", () => run(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run(input.value);
  });

  input.value = PRESETS[0].q;
  run(PRESETS[0].q);
}

/* ---- helpers ---------------------------------------------------------- */
let _uid = 0;
function uid() {
  return `r${++_uid}`;
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function highlight(text, qtokens) {
  return escapeHtml(text).replace(/[A-Za-z0-9]+/g, (w) =>
    qtokens.has(w.toLowerCase()) ? `<mark class="rag-mark">${w}</mark>` : w
  );
}
