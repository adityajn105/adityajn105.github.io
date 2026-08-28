/* Widget logic for the "How AI Agents Work" post — an interactive ReAct trace
   stepper. Framework-agnostic mount(el). Styling lives in gpt-widgets.css.
   The traces mirror the from-scratch Python agent in the companion project:
   Thought -> Action -> Action Input -> Observation, looped, until Final Answer. */

const SCENARIOS = [
  {
    q: "How does PPO keep policy updates small?",
    note: "The simplest case: one tool call, then answer. The agent doesn't guess — it looks it up.",
    steps: [
      {
        thought: "I don't have this memorized. I should search the blog.",
        action: "search_blog",
        input: "PPO clipped surrogate objective policy update",
        obs: "[proximal-policy-optimization] PPO clips the probability ratio between the new and old policy, so each update stays small and can't push the policy too far.",
      },
      {
        thought: "The passage explains the clipping. I can answer now.",
        final: "PPO stabilizes training by clipping the probability ratio between the new and old policy, keeping each update small [proximal-policy-optimization].",
      },
    ],
  },
  {
    q: "A transformer has 12 layers with 12 attention heads each — how many heads total, and what do they do?",
    note: "Multi-hop: the agent composes two different tools — search for the concept, calculator for the arithmetic.",
    steps: [
      {
        thought: "This has two parts. First, what do attention heads do? Search the blog.",
        action: "search_blog",
        input: "multi-head attention what does each head do",
        obs: "[gpt-2-attention] Multi-head attention runs several attention operations in parallel; each head can specialize — one tracks syntax, another long-range references.",
      },
      {
        thought: "Now the count. 12 layers × 12 heads. I'll use the calculator instead of doing mental math.",
        action: "calculator",
        input: "12 * 12",
        obs: "144",
      },
      {
        thought: "I have both parts.",
        final: "144 attention heads in total (12 × 12). Each head learns a different relationship — some track syntax, others long-range references between words [gpt-2-attention].",
      },
    ],
  },
  {
    q: "What is DPO?",
    note: "The honest case. DPO isn't in the corpus — a grounded agent says so instead of hallucinating.",
    steps: [
      {
        thought: "Let me check whether the blog covers this.",
        action: "search_blog",
        input: "DPO direct preference optimization",
        obs: "No results found.",
      },
      {
        thought: "Nothing in the blog matches. I must not invent an answer.",
        final: "I couldn't find anything about DPO in the blog, so I can't answer from the sources available.",
      },
    ],
  },
];

const PHASES = ["Reason", "Act", "Observe"];

export function mountReactTrace(el) {
  el.innerHTML = `
    <div class="agt">
      <div class="agt__scenarios">
        <span class="agt__plabel">Question:</span>
        <select class="agt__select mono" aria-label="Choose a question">
          ${SCENARIOS.map((s, i) => `<option value="${i}">${escapeHtml(s.q)}</option>`).join("")}
        </select>
      </div>
      <p class="agt__note"></p>
      <div class="agt__cycle">
        ${PHASES.map((p) => `<span class="agt__phase" data-phase="${p}">${p}</span>`).join('<span class="agt__arrow">→</span>')}
        <span class="agt__loopback">↺ loop</span>
      </div>
      <div class="agt__trace"></div>
      <div class="agt__controls">
        <button class="btn btn--primary agt__next">Next step ▸</button>
        <button class="btn agt__reset">Reset</button>
        <span class="agt__progress mono"></span>
      </div>
    </div>`;

  const select = el.querySelector(".agt__select");
  const trace = el.querySelector(".agt__trace");
  const note = el.querySelector(".agt__note");
  const nextBtn = el.querySelector(".agt__next");
  const resetBtn = el.querySelector(".agt__reset");
  const progress = el.querySelector(".agt__progress");
  const phaseEls = [...el.querySelectorAll(".agt__phase")];

  let scenario = SCENARIOS[0];
  let shown = 0; // number of "sub-steps" revealed

  // flatten each step into revealable fragments so we can step Thought->Act->Obs
  function fragments() {
    const frags = [];
    scenario.steps.forEach((s, si) => {
      if (s.final !== undefined) {
        frags.push({ kind: "thought", si, text: s.thought });
        frags.push({ kind: "final", si, text: s.final });
      } else {
        frags.push({ kind: "thought", si, text: s.thought });
        frags.push({ kind: "action", si, action: s.action, input: s.input });
        frags.push({ kind: "obs", si, text: s.obs });
      }
    });
    return frags;
  }

  function phaseFor(kind) {
    return kind === "thought" || kind === "final" ? "Reason"
      : kind === "action" ? "Act" : "Observe";
  }

  function render() {
    const frags = fragments();
    const visible = frags.slice(0, shown);
    trace.innerHTML = visible
      .map((f) => {
        if (f.kind === "thought")
          return `<div class="agt-row agt-thought"><span class="agt-tag">Thought</span><span class="agt-body">${escapeHtml(f.text)}</span></div>`;
        if (f.kind === "action")
          return `<div class="agt-row agt-action"><span class="agt-tag">Action</span><span class="agt-body"><code>${escapeHtml(f.action)}</code> ← <span class="agt-input">${escapeHtml(f.input)}</span></span></div>`;
        if (f.kind === "obs")
          return `<div class="agt-row agt-obs"><span class="agt-tag">Observation</span><span class="agt-body">${escapeHtml(f.text)}</span></div>`;
        return `<div class="agt-row agt-final"><span class="agt-tag">Final Answer</span><span class="agt-body">${escapeHtml(f.text)}</span></div>`;
      })
      .join("");

    // highlight the current phase in the Reason→Act→Observe strip
    const cur = visible.length ? phaseFor(visible[visible.length - 1].kind) : null;
    phaseEls.forEach((p) => p.classList.toggle("is-active", p.dataset.phase === cur));

    const done = shown >= frags.length;
    nextBtn.disabled = done;
    nextBtn.textContent = done ? "Done ✓" : "Next step ▸";
    progress.textContent = `${Math.min(shown, frags.length)} / ${frags.length}`;
  }

  function load(i) {
    scenario = SCENARIOS[i];
    shown = 0;
    note.textContent = scenario.note;
    render();
  }

  nextBtn.addEventListener("click", () => {
    if (shown < fragments().length) shown++;
    render();
  });
  resetBtn.addEventListener("click", () => {
    shown = 0;
    render();
  });
  select.addEventListener("change", () => load(+select.value));

  load(0);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
