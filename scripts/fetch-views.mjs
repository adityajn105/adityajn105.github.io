// Fetch per-post pageviews from Google Analytics 4 and write them to
// src/data/views.json. The homepage reads this file at build time to order
// the blog list "most viewed first".
//
// This runs as a separate build step (see .github/workflows/deploy.yml), NOT
// as part of `astro build`, so a normal local build never needs GA access.
// If credentials are absent (local dev, forks, missing secrets) the script is
// a no-op: it leaves the committed views.json in place and exits 0 so the
// build never breaks.
//
// Required env (set as GitHub Actions secrets):
//   GA4_PROPERTY_ID   numeric GA4 property id, e.g. "123456789"
//   GA4_CREDENTIALS   service-account JSON (the whole key file, as a string)

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'src', 'data', 'views.json');

const propertyId = process.env.GA4_PROPERTY_ID;
const credsRaw = process.env.GA4_CREDENTIALS;

if (!propertyId || !credsRaw) {
  console.warn(
    '[fetch-views] GA4_PROPERTY_ID / GA4_CREDENTIALS not set — skipping (keeping existing views.json).'
  );
  process.exit(0);
}

let credentials;
try {
  credentials = JSON.parse(credsRaw);
} catch {
  console.error('[fetch-views] GA4_CREDENTIALS is not valid JSON — skipping.');
  process.exit(0);
}

try {
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ credentials });

  const [resp] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '2015-01-01', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: { matchType: 'BEGINS_WITH', value: '/blogs/' },
      },
    },
    limit: 1000,
  });

  // Collapse `/blogs/<slug>` and `/blogs/<slug>.html` (and any query/hash) onto
  // the same slug key so counts from legacy and current URLs add up.
  const views = {};
  for (const row of resp.rows ?? []) {
    const path = row.dimensionValues?.[0]?.value ?? '';
    const count = Number(row.metricValues?.[0]?.value ?? 0);
    const m = path.match(/^\/blogs\/([^/?#]+?)(?:\.html)?(?:[?#].*)?$/);
    if (!m || !m[1]) continue;
    views[m[1]] = (views[m[1]] || 0) + count;
  }

  writeFileSync(OUT, JSON.stringify(views, null, 2) + '\n');
  console.log(`[fetch-views] wrote ${Object.keys(views).length} entries to views.json`);
} catch (err) {
  console.error('[fetch-views] GA4 query failed — keeping existing views.json.', err?.message ?? err);
  process.exit(0);
}
