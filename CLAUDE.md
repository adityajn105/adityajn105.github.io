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
  ├── img/*.png|*.gif       # project thumbnails — canonical copies, also served
  │                         #   to projects.adityajain.me (see "Projects" below)
  ├── files/*.pdf           # résumés
  └── blogs/images/*        # blog images (referenced as /blogs/images/…)
src/
  ├── content.config.ts     # blog collection schema (Zod)
  ├── content/blog/*.md     # ← blog posts live here
  ├── data/                 # homepage content (edit these, not the markup)
  │   ├── profile.ts        # name, bio, socials, email, résumé, contact form
  │   ├── projects.ts       # canonical project list (shared — see "Projects")
  │   ├── skills.ts         # skill groups
  │   └── experience.ts     # work experience + education
  ├── components/           # Nav, Footer, SEO, Analytics, Icon
  ├── layouts/              # BaseLayout, BlogLayout
  ├── pages/
  │   ├── index.astro       # homepage (pulls from src/data + recent blog posts)
  │   ├── projects.json.ts  # build-time endpoint → /projects.json (shared feed)
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
- Projects → `projects.ts` — the **canonical** list, shared with
  projects.adityajain.me (see "Projects" below). Fields:
  `title, description, href, image?, demo?, blog?, tags[]`. The homepage renders the
  first 6 as a fixed 6-tile bento grid (keep the list length ≥ 6).
- Skills → `skills.ts`.
- Experience / education → `experience.ts`.
- Bio, socials, email, résumé path → `profile.ts`.

## Projects (single source of truth, shared with projects.adityajain.me)

`src/data/projects.ts` is the **one** place project data lives, for **both** this
site and **projects.adityajain.me** (the sibling repo `jackgriffin105.github.io`).

- **This site** imports `projects` directly and shows the first 6 on the homepage.
- **`src/pages/projects.json.ts`** publishes the full list as a build-time endpoint
  at **`https://adityajain.me/projects.json`**. It rewrites local `/img/...` thumbnail
  paths to absolute `https://adityajain.me/img/...` URLs (remote screenshot URLs pass
  through untouched) so cross-site consumers get working images. GitHub Pages serves it
  with `Access-Control-Allow-Origin: *`, so the cross-origin fetch just works.
- **projects.adityajain.me** is a **pure consumer**: it fetches that feed **live in
  the browser on page load** (an inline `<script>` in its `index.astro`) and injects
  the cards. It keeps **no** local project data or images. To change the project list
  or a thumbnail, edit it **here** (`projects.ts` + `public/img/`), never there.

**All project thumbnails live in this repo's `public/img/`.** Add new ones here.

**No deploy coordination needed.** Because the consumer fetches live client-side, a
change here shows up on projects.adityajain.me the moment `/projects.json` is live —
i.e. as soon as **this** site deploys, on the reader's next page load. There's no
build-order dependency and no scheduled rebuild on the consumer; just publish here and
the projects site reflects it automatically.

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
