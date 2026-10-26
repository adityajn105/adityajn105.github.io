---
import 'katex/dist/katex.min.css';
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import Prose from '../../components/Prose.astro';
import { encrypt, type EncryptedPayload } from '../../scripts/notes-crypto';

// Private notes at /private/notes. GitHub Pages can't check passwords, so the
// notes (from the `notes` collection, checked out of a private repo at build
// time) are rendered to HTML here and encrypted with NOTES_PASSWORD. Only the
// ciphertext ships; the browser decrypts it once the password is entered.
// Without a password the page ships with no content at all — never plaintext.
const password = process.env.NOTES_PASSWORD ?? '';

// Each top-level folder in the notes repo is a group (e.g.
// `system-design-notes/` → "System Design"); topics within it are ordered by
// frontmatter `order`, then title. Groups listed here come first, in this
// order; any other folder follows alphabetically with a derived label.
const GROUP_LABELS: Record<string, string> = {
  'system-design-notes': 'System Design',
  'ml-system-design-notes': 'ML System Design',
};
const groupLabel = (dir: string) =>
  GROUP_LABELS[dir] ??
  dir
    .replace(/-notes$/, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const titleOf = (n: { id: string; data: { title?: string } }) =>
  n.data.title ?? groupLabel(n.id.split('/').pop()!);

const groups = new Map<string, CollectionEntry<'notes'>[]>();
for (const n of await getCollection('notes')) {
  const dir = n.id.includes('/') ? n.id.split('/')[0] : 'notes';
  groups.set(dir, [...(groups.get(dir) ?? []), n]);
}
const knownOrder = Object.keys(GROUP_LABELS);
const rank = (dir: string) => (knownOrder.includes(dir) ? knownOrder.indexOf(dir) : Infinity);
const sortedGroups = [...groups]
  .sort(([a], [b]) => rank(a) - rank(b) || groupLabel(a).localeCompare(groupLabel(b)))
  .map(([dir, items]) => ({
    dir,
    label: groupLabel(dir),
    items: items.sort(
      (a, b) =>
        (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
        titleOf(a).localeCompare(titleOf(b))
    ),
  }));
const noteCount = sortedGroups.reduce((sum, g) => sum + g.items.length, 0);

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const anchor = (id: string) => `note-${id.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
const fmt = (d: Date) =>
  d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

// Contents per group, then each topic as a collapsible <details>.
const html = [
  `<nav class="notes-toc" aria-label="Notes">${sortedGroups
    .map(
      (g) =>
        `<div><h2>${escape(g.label)}</h2><ol>${g.items
          .map((n) => `<li><a href="#${anchor(n.id)}">${escape(titleOf(n))}</a></li>`)
          .join('')}</ol></div>`
    )
    .join('')}</nav>`,
  ...sortedGroups.map(
    (g) =>
      `<section class="notes-group" id="${anchor(g.dir)}"><h2>${escape(g.label)}</h2>` +
      g.items
        .map(
          (n) =>
            `<details class="note" id="${anchor(n.id)}"><summary>${escape(titleOf(n))}` +
            (n.data.date ? ` <span class="note-date">${fmt(n.data.date)}</span>` : '') +
            `</summary><div class="note-body">${n.rendered?.html ?? ''}</div></details>`
        )
        .join('') +
      `</section>`
  ),
].join('\n');

let payload: EncryptedPayload | null = null;
if (!password) {
  console.warn('[private/notes] NOTES_PASSWORD is not set; publishing the page without notes.');
} else {
  if (noteCount === 0) console.warn('[private/notes] No notes found in .notes/.');
  payload = await encrypt(html, password);
}
---

<BaseLayout title="Notes — Aditya Jain" description="Private notes." isPrivate>
  <section class="section">
    <div class="container notes-container">
      <p class="eyebrow">Private</p>
      <h1 class="section-title">Notes</h1>

      {
        payload ? (
          <>
            <form class="unlock" id="unlock-form" autocomplete="on">
              <label for="notes-password">Password</label>
              <div class="unlock-row">
                <input
                  id="notes-password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  required
                />
                <button class="btn btn-primary" type="submit">Unlock</button>
              </div>
              <p class="unlock-status" id="unlock-status" role="status" aria-live="polite" />
            </form>
            <div class="notes-toolbar" id="notes-toolbar" hidden>
              <button class="btn btn-ghost" type="button" id="lock-btn">Lock</button>
            </div>
            <Prose id="notes-content" />
            <script is:inline type="application/json" id="notes-payload" set:html={JSON.stringify(payload)} />
          </>
        ) : (
          <p class="unlock-status">Notes are not configured for this build.</p>
        )
      }
    </div>
  </section>
</BaseLayout>

<script>
  import {
    decrypt,
    deriveKey,
    exportKey,
    importKey,
    payloadSalt,
    type EncryptedPayload,
  } from '../../scripts/notes-crypto';

  // The derived key (not the password) is cached for the browser tab so a
  // reload doesn't re-prompt. Closing the tab or pressing Lock forgets it.
  const STORAGE_KEY = 'notes-key';

  const payloadEl = document.getElementById('notes-payload');
  const form = document.getElementById('unlock-form') as HTMLFormElement | null;

  if (payloadEl && form) {
    const payload: EncryptedPayload = JSON.parse(payloadEl.textContent ?? '');
    const input = form.querySelector('input') as HTMLInputElement;
    const button = form.querySelector('button') as HTMLButtonElement;
    const status = document.getElementById('unlock-status')!;
    const content = document.getElementById('notes-content')!;
    const toolbar = document.getElementById('notes-toolbar')!;

    // Topics are collapsed <details>; open the one a link (or the URL hash)
    // points at. The content arrives after load, so the initial hash is
    // applied by hand.
    const openTarget = (hash: string) => {
      const el = hash.length > 1 ? document.getElementById(hash.slice(1)) : null;
      if (el instanceof HTMLDetailsElement) el.open = true;
      el?.scrollIntoView();
    };
    window.addEventListener('hashchange', () => openTarget(location.hash));

    const show = (html: string) => {
      content.innerHTML = html;
      form.hidden = true;
      toolbar.hidden = false;
      openTarget(location.hash);
    };

    const cached = sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      importKey(cached)
        .then((key) => decrypt(payload, key))
        .then(show)
        // Stale key (password changed since): fall back to the form.
        .catch(() => sessionStorage.removeItem(STORAGE_KEY));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      button.disabled = true;
      status.textContent = 'Decrypting…';
      try {
        const key = await deriveKey(input.value, payloadSalt(payload), payload.iterations, true);
        const html = await decrypt(payload, key);
        sessionStorage.setItem(STORAGE_KEY, await exportKey(key));
        status.textContent = '';
        show(html);
      } catch {
        status.textContent = 'Wrong password.';
        input.select();
      } finally {
        button.disabled = false;
      }
    });

    document.getElementById('lock-btn')!.addEventListener('click', () => {
      sessionStorage.removeItem(STORAGE_KEY);
      location.reload();
    });
  }
</script>

<style>
  .notes-container {
    max-width: var(--maxw-prose);
  }
  .unlock {
    display: grid;
    gap: 0.6rem;
    max-width: 26rem;
  }
  .unlock label {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--text-muted);
  }
  .unlock-row {
    display: flex;
    gap: 0.6rem;
  }
  .unlock input {
    flex: 1;
    min-width: 0;
    font: inherit;
    padding: 0.55rem 0.8rem;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    color: var(--text);
  }
  .unlock input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 1px;
  }
  .unlock-status {
    min-height: 1.5em;
    font-size: 0.9rem;
    color: var(--text-muted);
  }
  .notes-toolbar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1rem;
  }
  /* `display` above would otherwise override the `hidden` attribute. */
  .unlock[hidden],
  .notes-toolbar[hidden] {
    display: none;
  }
  #notes-content :global(.notes-toc) {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.5rem 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }
  #notes-content :global(.notes-toc h2) {
    font-size: 1.05rem;
    margin-top: 0;
  }
  #notes-content :global(.notes-group) {
    margin-top: 2.5rem;
  }
  #notes-content :global(.note) {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    margin-bottom: 0.75rem;
    scroll-margin-top: 5rem;
  }
  #notes-content :global(.note summary) {
    cursor: pointer;
    padding: 0.8rem 1.1rem;
    font-weight: 600;
  }
  #notes-content :global(.note summary:focus-visible) {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    border-radius: var(--radius);
  }
  #notes-content :global(.note[open] summary) {
    border-bottom: 1px solid var(--border);
  }
  #notes-content :global(.note-body) {
    padding: 0.4rem 1.1rem 0.2rem;
  }
  #notes-content :global(.note-body > :first-child) {
    margin-top: 0.8rem;
  }
  #notes-content :global(.note-date) {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    font-weight: 400;
    color: var(--text-faint);
    margin-left: 0.4rem;
  }
</style>
