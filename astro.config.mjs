import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://astro.build/config
export default defineConfig({
  site: 'https://adityajain.me',
  // Emit `/blogs/foo.html` instead of `/blogs/foo/index.html` so the
  // original blog URLs (and their SEO) are preserved.
  build: {
    format: 'file',
  },
  integrations: [
    mdx(),
    sitemap({
      lastmod: new Date(),
      // Pages are emitted with build.format:'file', so blog routes live at
      // `/blogs/<slug>.html`. Append the extension so sitemap URLs resolve.
      serialize(item) {
        if (/\/blogs\/[^/]+$/.test(item.url) && !item.url.endsWith('.html')) {
          item.url = `${item.url}.html`;
        }
        return item;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      wrap: true,
    },
  },
});
