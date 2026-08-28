import type { APIRoute } from 'astro';
import { projects } from '../data/projects';

// Published at https://adityajain.me/projects.json — the canonical project feed.
// projects.adityajain.me fetches this at build time so both sites stay in sync
// from one source (src/data/projects.ts). Local /img/... thumbnails are rewritten
// to absolute URLs against this origin so cross-site consumers resolve them.
// GitHub Pages serves assets with `Access-Control-Allow-Origin: *`, so the
// cross-origin build-time fetch works without extra config.
export const GET: APIRoute = ({ site }) => {
  const origin = site?.origin ?? 'https://adityajain.me';
  const absImage = (img?: string) =>
    img && img.startsWith('/') ? origin + img : img;
  return Response.json(projects.map((p) => ({ ...p, image: absImage(p.image) })));
};
