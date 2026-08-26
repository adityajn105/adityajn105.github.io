# adityajain.me — Portfolio (Astro)

Personal portfolio + blog for Aditya Jain. Static site built with **Astro**, deployed to
**GitHub Pages** at the custom domain **adityajain.me** (`CNAME`).

## Tech stack

- **Astro 5** — static site generator (zero JS shipped by default).
- **Content Collections** for blog posts (Markdown/MDX in `src/content/blog/`).
- **KaTeX** for math (`remark-math` + `rehype-katex`).
- **Shiki** for syntax highlighting (dual light/dark themes).
- **@astrojs/sitemap** auto-generates `sitemap-index.xml` at build time.
- Self-hosted fonts via `@fontsource-variable` (Inter + JetBrains Mono).
- No CSS framework — hand-rolled design system in `src/styles/global.css` (CSS custom
  properties + light/dark theme via `data-theme` on `<html>`).

## Commands

```bash
npm install      # install deps
npm run dev      # local dev server at http://localhost:4321
npm run build    # production build -> dist/
npm run preview  # preview the production build locally
```

## Project structure

```
public/                     # copied verbatim to site root
  ├── CNAME                 # custom domain (adityajain.me) — DO NOT delete
  ├── favicon.svg / .ico    # AJ monogram
  ├── robots.txt
  ├── img/profile.png       # hero portrait (optimized, 480px)
  ├── files/*.pdf           # résumés
  └── blogs/images/*        # blog images (referenced as /blogs/images/…)
src/
  ├── content.config.ts     # blog collection schema (Zod)
  ├── content/blog/*.md     # ← blog posts live here
  ├── data/                 # homepage content (edit these, not the markup)
  │   ├── profile.ts        # name, bio, socials, email, résumé, contact form
  │   ├── projects.ts       # project cards
  │   ├── skills.ts         # skill groups
  │   └── experience.ts     # work experience + education
  ├── components/           # Nav, Footer, SEO, Analytics, Icon
  ├── layouts/              # BaseLayout, BlogLayout
  ├── pages/
  │   ├── index.astro       # homepage (pulls from src/data + recent blog posts)
  │   └── blogs/[...slug].astro   # renders each blog post
  └── styles/global.css     # design tokens + base styles
astro.config.mjs            # site URL, integrations, markdown (build.format:'file')
.github/workflows/deploy.yml
```

## URLs (do not break these — they have SEO/backlinks)

- `/` — homepage
- `/blogs.html` — blog archive (all posts, most-viewed first)
- `/blogs/<slug>.html` — blog posts. The `build.format: 'file'` setting in
  `astro.config.mjs` is what preserves the legacy `.html` extension. **Keep it.**
- `/files/Aditya_Jain_resume.pdf` — résumé
- `/sitemap-index.xml` — generated automatically

## How to add a blog post

1. Create `src/content/blog/my-post.md`. The filename becomes the URL slug
   (`/blogs/my-post.html`).
2. Frontmatter:
   ```yaml
   ---
   title: "My Post Title"
   description: "One-sentence summary for SEO and the blog list."
   pubDate: 2025-01-15
   tags: ["NLP", "Deep Learning"]
   disqusId: 10          # optional; only for legacy posts with existing comments
   draft: false          # omit or set true to hide
   ---
   ```
3. Write Markdown. Math uses `$inline$` and `$$display$$` (KaTeX). Fenced code blocks get
   syntax highlighting. Images go in `public/blogs/images/` and are referenced as
   `/blogs/images/name.png`.
4. It appears automatically: the homepage lists the **5 most recent** posts (by `pubDate`),
   and the full archive at **`/blogs.html`** lists **all** posts ordered **most-viewed first**
   (see "Blog view counts" below; no-view posts fall back to newest-first).
5. The `tags` you set show as pills on each tile and are clickable: they link to
   `/blogs.html?tag=<tag>`. The archive has a filter bar (all distinct tags) that filters the
   list client-side and syncs the `?tag=` query param (shareable, back/forward-aware). Tiles
   use a "stretched link" — the title link covers the row, tag links sit above it — so avoid
   nesting other links inside a `.post-row`.

## How to update homepage content

Edit the files in `src/data/` — never hard-code content in `index.astro`.
- Projects → `projects.ts` (`featured: true` makes a card span two columns).
- Skills → `skills.ts`.
- Experience / education → `experience.ts`.
- Bio, socials, email, résumé path → `profile.ts`.

## Comments (Disqus)

Blog comments use Disqus shortname **`adityajn105`**. Legacy posts keep their original
thread via the `disqusId` frontmatter field so old comments stay attached. New posts can
omit it (Disqus will key off the URL).

## Contact form (Formspree)

`profile.ts` → `formspree` holds the form action URL. The legacy site used Formspree's
deprecated email endpoint. Create a form at https://formspree.io and replace the value with
your real endpoint (`https://formspree.io/f/xxxxxxx`).

## Analytics

Google Analytics 4, property `G-D5V2STMGF5`, in `src/components/Analytics.astro`.

## Blog view counts (most-viewed ordering)

Blog popularity is sourced from GA4 **at build time** — no client-side counter, no
runtime dependency.

- `scripts/fetch-views.mjs` queries the GA4 Data API for `screenPageViews` per
  `/blogs/*` path and writes `src/data/views.json` (`{ "<slug>": <count> }`). It merges
  the legacy `.html` and extensionless URLs onto the same slug.
- `src/data/views.ts` loads that JSON and exposes `viewsFor(slug)` / `formatViews(n)`.
  The archive page `blogs.astro` orders by it (newest-first tiebreak); counts are shown on
  each row (homepage + archive) and in the post header when `> 0`. The homepage itself lists
  the 5 most recent, not by views.
- The build step runs via `npm run fetch:views` **before** `astro build` in
  `deploy.yml`. `astro build` itself never touches GA, so local builds work offline.
- If the script has no credentials (local dev, forks, missing secrets) it is a **no-op**:
  it leaves the committed `views.json` in place and exits 0. So the counts refresh on each
  deploy, not in real time.

**One-time setup** — add two GitHub Actions **secrets** (repo → Settings → Secrets and
variables → Actions):
- `GA4_PROPERTY_ID` — the **numeric** GA4 property id (Admin → Property Settings; *not*
  the `G-…` measurement id).
- `GA4_CREDENTIALS` — a Google Cloud **service-account** JSON key (whole file, pasted as
  the secret value). Enable the *Google Analytics Data API* on the project and add the
  service-account email as a **Viewer** on the GA4 property.

To refresh `views.json` locally: `GA4_PROPERTY_ID=… GA4_CREDENTIALS="$(cat key.json)" npm run fetch:views`.

## Theming & color palettes

Two independent axes on `<html>`, both persisted to `localStorage` and applied pre-paint
(FOUC-free) by the inline script in `BaseLayout.astro`:
- `data-theme` = `light` | `dark` — the sun/moon toggle in `Nav.astro`.
- `data-palette` = `default` (Cobalt) | `emerald` | `amber` | `rose` | `violet` | `cyan` —
  the swatch picker in `Nav.astro`. Each palette only recolors the `--accent*` tokens, so
  it composes with both themes. `default` = no attribute (base `:root` accent).

To add a palette: add `:root[data-palette='x']` + `:root[data-theme='dark'][data-palette='x']`
blocks in `global.css`, then one entry in the `palettes` array in `Nav.astro`.

## Deployment

Pushing to `master` triggers `.github/workflows/deploy.yml`, which builds with Astro and
publishes `dist/` to GitHub Pages.

**One-time setup:** In the GitHub repo → Settings → Pages → set **Source** to
**GitHub Actions** (not "Deploy from a branch"). The `CNAME` file in `public/` keeps the
custom domain attached.

## Conventions

- Keep it dependency-light and ship minimal JS.
- Respect `prefers-reduced-motion` (already handled in `global.css`).
- Preserve accessibility: keep the skip link, `aria-label`s on icon-only buttons/links, and
  color-contrast in both themes.
