/* Widget logic for "How GPT Works — Part 5: Base Model → ChatGPT".
   Exports: mountStages (pretraining → SFT → RLHF stepper, reuses .pl-* styles),
   mountBaseVsChat (same prompt, base completion vs aligned answer). */

/* ======================================================================
   The three training stages that turn a next-token predictor into an
   assistant. Reuses the pipeline (.pl-*) styling from Part 3.
   ====================================================================== */
export function mountStages(el) {
  const stages = [
    { t: "1 · Pretraining", d: `Predict the next token over a huge slice of the internet (the whole of <a href="/blogs/gpt-4-training-generation.html">Part 4</a>). Produces a <b>base model</b>: it knows an enormous amount but only "autocompletes" — it has no notion of following an instruction. Months of compute; almost all the model's knowledge is learned here.` },
    { t: "2 · Supervised fine-tuning", d: `Continue training on a smaller, curated set of <b>(instruction, ideal response)</b> pairs written by humans. This teaches the format of being a helpful assistant — answer the question, don't just continue the text.` },
    { t: "3 · RLHF / preference tuning", d: `Humans rank multiple model answers; a <b>reward model</b> learns those preferences, and the model is optimized against it (RLHF / DPO). This is the polish that makes responses helpful, harmless, and honest — the difference you feel between a raw base model and ChatGPT.` },
  ];
  let sel = 0;

  el.innerHTML = `
    <div class="pl-flow"></div>
    <div class="pl-detail"></div>
    <p class="figure__cap">ChatGPT is a base model plus <b>alignment</b>. Pretraining supplies the raw
      capability; supervised fine-tuning and RLHF reshape it into something that follows instructions.
      Click each stage.</p>`;

  const flow = el.querySelector(".pl-flow");
  flow.innerHTML = stages.map((s, i) => `
    <button class="pl-stage ${i === sel ? "active" : ""}" data-i="${i}">
      <span class="pl-stage-t">${s.t}</span>
    </button>
    ${i < stages.length - 1 ? `<span class="pl-arrow">↓</span>` : ""}`).join("");

  function detail() {
    const s = stages[sel];
    el.querySelector(".pl-detail").innerHTML = `<div class="pl-detail-t">${s.t}</div><p>${s.d}</p>`;
    flow.querySelectorAll(".pl-stage").forEach((b, i) => b.classList.toggle("active", i === sel));
  }
  flow.addEventListener("click", (e) => {
    const b = e.target.closest(".pl-stage"); if (!b) return;
    sel = +b.dataset.i; detail();
  });
  detail();
}

/* ======================================================================
   Base model vs aligned model — same prompt, very different behaviour.
   ====================================================================== */
export function mountBaseVsChat(el) {
  const examples = [
    {
      prompt: "What is the capital of France?",
      base: `What is the capital of Germany? What is the capital of Italy? What is the capital of Spain? (A quiz worksheet — the base model just continues the pattern it has seen.)`,
      chat: `The capital of France is Paris.`,
    },
    {
      prompt: "Write a haiku about the ocean.",
      base: `Write a haiku about the mountains. Write a short story about a dog. Write an essay on... (it treats your line as one item in a list of prompts to keep generating).`,
      chat: `Endless breathing tide —\nsalt air folds over the shore,\nblue meeting the sky.`,
    },
    {
      prompt: "Explain gravity to a five-year-old.",
      base: `Explain gravity to a physics student. Explain gravity using calculus. Explain relativity... (continues with more variations of the instruction rather than answering it).`,
      chat: `Gravity is like an invisible hug from the Earth! It gently pulls everything down, which is why when you jump, you always come back to the ground.`,
    },
  ];
  let ex = 0, mode = "chat";

  el.innerHTML = `
    <div class="controls">
      <div class="control" style="flex:1;min-width:220px">
        <label>Prompt</label>
        <select class="bc-prompt btn" style="text-align:left">
          ${examples.map((e, i) => `<option value="${i}">${e.prompt}</option>`).join("")}
        </select>
      </div>
      <div class="control">
        <label>Model</label>
        <div class="bc-toggle" role="tablist">
          <button class="bc-mode" data-m="base" role="tab">Base model</button>
          <button class="bc-mode is-on" data-m="chat" role="tab">ChatGPT (aligned)</button>
        </div>
      </div>
    </div>
    <div class="bc-io">
      <div class="bc-prompt-echo mono"></div>
      <div class="bc-out"></div>
    </div>
    <p class="figure__cap">Same weights' worth of knowledge, wildly different behaviour. The
      <b>base model</b> only continues text, so it often extends your instruction instead of obeying
      it. <b>Alignment</b> (SFT + RLHF) is what teaches it to answer. Toggle the model on each prompt.</p>`;

  function render() {
    const e = examples[ex];
    el.querySelector(".bc-prompt-echo").textContent = `▸ ${e.prompt}`;
    const out = el.querySelector(".bc-out");
    out.textContent = mode === "base" ? e.base : e.chat;
    out.className = `bc-out ${mode}`;
    el.querySelectorAll(".bc-mode").forEach((b) => b.classList.toggle("is-on", b.dataset.m === mode));
  }
  el.querySelector(".bc-prompt").addEventListener("change", (e) => { ex = +e.target.value; render(); });
  el.querySelector(".bc-toggle").addEventListener("click", (e) => {
    const b = e.target.closest(".bc-mode"); if (!b) return;
    mode = b.dataset.m; render();
  });
  render();
}
