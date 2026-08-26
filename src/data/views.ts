// Per-post pageview counts, keyed by blog slug (the Markdown filename).
// This file is regenerated at deploy time by `scripts/fetch-views.mjs` from
// Google Analytics 4. The committed copy is the fallback used when GA data
// isn't available (local dev, forks). It may be empty.
import viewsData from './views.json';

export const views = viewsData as Record<string, number>;

/** Pageviews for a slug, or 0 if we have no data for it. */
export function viewsFor(slug: string): number {
  return views[slug] ?? 0;
}

/** Human-readable count, e.g. 1234 -> "1,234". */
export function formatViews(n: number): string {
  return n.toLocaleString('en-US');
}
