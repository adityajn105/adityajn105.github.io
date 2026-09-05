/* Widget logic for the "Guardrails for LLM Apps & Agents" post:
   RailFlow — pick an attack, then watch it travel through a stack of guardrail
   "rails" (input → retrieval → [model] → output → action → runtime). Each attack
   is stopped by exactly one rail; toggle that rail off and the attack reaches
   production. Teaches the threat↔guardrail mapping and why defense is layered.
   Framework-agnostic mount(el). Styling lives in gpt-widgets.css. */

// The rails, in the order a request flows through them.
const RAILS = [
  { id: "injection", name: "Injection & jailbreak classifier", tag: "input" },
  { id: "retrieval", name: "Retrieval sanitizer / spotlighting", tag: "retrieval" },
  { id: "moderation", name: "Content moderation", tag: "output" },
  { id: "pii", name: "PII redaction & scan", tag: "output" },
  { id: "schema", name: "Output schema & encoding", tag: "output" },
  { id: "approval", name: "Action approval + least privilege", tag: "action" },
  { id: "budget", name: "Budget & loop caps", tag: "runtime" },
];

// Each attack is caught by exactly one rail (`rail`). Turn that rail off and it
// slips through to `reach`; leave it on and it's stopped with `block`.
const ATTACKS = [
  {
    id: "prompt-injection",
    label: "Prompt injection",
    rail: "injection",
    reach: "the model obeys the injected instruction and ignores your system prompt",
    block: "the classifier flags the override attempt before the model ever sees it",
  },
  {
    id: "jailbreak",
    label: "Jailbreak",
    rail: "injection",
    reach: "the safety policy is bypassed and the model produces disallowed content",
    block: "the jailbreak classifier catches the roleplay/obfuscation on input",
  },
  {
    id: "indirect",
    label: "Indirect (RAG) injection",
    rail: "retrieval",
    reach: "instructions hidden in a retrieved document hijack the agent",
    block: "the retrieval rail spotlights the untrusted chunk so it can't issue commands",
  },
  {
    id: "toxic",
    label: "Toxic output",
    rail: "moderation",
    reach: "harmful or off-brand text is shown to the user",
    block: "the moderation rail catches it before it's returned",
  },
  {
    id: "pii",
    label: "PII leak",
    rail: "pii",
    reach: "personal data reaches the user, another tenant, or your logs",
    block: "the PII rail redacts and blocks the personal data before it leaves",
  },
  {
    id: "insecure-output",
    label: "Unsafe output (XSS / RCE)",
    rail: "schema",
    reach: "downstream code renders or executes the raw output — XSS, SQLi, or RCE",
    block: "schema validation and output encoding neutralize it before it's used",
  },
  {
    id: "destructive",
    label: "Destructive tool call",
    rail: "approval",
    reach: "the agent runs an irreversible action (delete / send / pay) on its own",
    block: "the action gate requires human approval and least-privilege scoping",
  },
  {
    id: "runaway",
    label: "Runaway loop",
    rail: "budget",
    reach: "the agent loops endlessly, burning tokens and money (denial of wallet)",
    block: "the budget and turn caps trip and halt the loop",
  },
];

export function mountRailFlow(el) {
  const enabled = {};
  RAILS.forEach((r) => (enabled[r.id] = true));
  let active = ATTACKS[0].id;

  el.innerHTML = `
    <div class="rf">
      <div class="rf-attacks" role="group" aria-label="Choose an attack">
        ${ATTACKS.map(
          (a) =>
            `<button class="rf-attack" data-attack="${a.id}" type="button">${a.label}</button>`
        ).join("")}
      </div>

      <p class="rf-lead">Sending <b class="rf-active"></b> through the pipeline. Toggle rails on and off:</p>

      <div class="rf-pipe">
        ${RAILS.map(
          (r) => `
          ${
            r.id === "moderation"
              ? `<div class="rf-model"><span>the model runs</span></div>`
              : ""
          }
          <div class="rf-stage" data-rail="${r.id}">
            <label class="rf-switch">
              <input type="checkbox" class="rf-toggle" data-rail="${r.id}" checked aria-label="Toggle ${r.name}">
              <span class="rf-name">${r.name}</span>
              <span class="rf-tag">${r.tag}</span>
            </label>
            <span class="rf-status" data-rail="${r.id}"></span>
          </div>`
        ).join("")}
        <div class="rf-end"><span>production / action executed</span></div>
      </div>

      <p class="rf-verdict"></p>
    </div>`;

  const attackBtns = [...el.querySelectorAll(".rf-attack")];
  const toggles = [...el.querySelectorAll(".rf-toggle")];

  function render() {
    const a = ATTACKS.find((x) => x.id === active);
    const catchIdx = RAILS.findIndex((r) => r.id === a.rail);
    const blocked = enabled[a.rail];

    el.querySelector(".rf-active").textContent = a.label;
    attackBtns.forEach((b) =>
      b.classList.toggle("is-on", b.dataset.attack === active)
    );

    RAILS.forEach((r, i) => {
      const stage = el.querySelector(`.rf-stage[data-rail="${r.id}"]`);
      const status = el.querySelector(`.rf-status[data-rail="${r.id}"]`);
      let cls = "rf-status",
        txt = "";
      if (!enabled[r.id]) {
        cls += " is-off";
        txt = "off";
      } else if (blocked && i > catchIdx) {
        cls += " is-skip";
        txt = "not reached";
      } else if (i === catchIdx) {
        // enabled catching rail
        cls += " is-block";
        txt = "■ blocked";
      } else {
        cls += " is-pass";
        txt = "passed";
      }
      status.className = cls;
      status.textContent = txt;
      stage.classList.toggle("is-block", enabled[r.id] && i === catchIdx);
      stage.classList.toggle(
        "is-dim",
        blocked && i > catchIdx
      );
    });

    const end = el.querySelector(".rf-end");
    const verdict = el.querySelector(".rf-verdict");
    end.classList.toggle("is-breach", !blocked);
    if (blocked) {
      verdict.className = "rf-verdict is-good";
      verdict.innerHTML = `<b>Contained.</b> ${cap(RAILS[catchIdx].name)} stopped it — ${a.block}.`;
    } else {
      verdict.className = "rf-verdict is-bad";
      verdict.innerHTML =
        `<b>Breach.</b> With <b>${RAILS[catchIdx].name}</b> off, ${a.reach}. ` +
        `That's the one rail that catches this attack — turn it back on.`;
    }
  }

  function cap(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  attackBtns.forEach((b) =>
    b.addEventListener("click", () => {
      active = b.dataset.attack;
      render();
    })
  );
  toggles.forEach((t) =>
    t.addEventListener("change", () => {
      enabled[t.dataset.rail] = t.checked;
      render();
    })
  );
  render();
}
