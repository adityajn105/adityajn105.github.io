import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    // Legacy Disqus thread identifier so existing comments stay attached.
    disqusId: z.union([z.string(), z.number()]).optional(),
    draft: z.boolean().default(false),
  }),
});

// Private notes, checked out from a private repo into `.notes/` by the deploy
// workflow. Rendered here but only ever published encrypted (see
// src/pages/private/notes.astro). Missing directory => empty collection.
const notes = defineCollection({
  loader: glob({ pattern: ['**/*.md', '!**/README.md'], base: './.notes' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date().optional(),
    // Position within its folder's group on the page (lower first).
    order: z.number().optional(),
  }),
});

export const collections = { blog, notes };
