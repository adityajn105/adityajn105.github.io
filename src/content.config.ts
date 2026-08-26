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

export const collections = { blog };
