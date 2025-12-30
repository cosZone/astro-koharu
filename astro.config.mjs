import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import umami from '@yeskunall/astro-umami';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import svgr from 'vite-plugin-svgr';
import { defaultContentConfig } from './src/constants/content-config';
import { siteConfig } from './src/constants/site-config';
import { rehypeImagePlaceholder } from './src/lib/markdown/rehype-image-placeholder.ts';
import { remarkLinkEmbed } from './src/lib/markdown/remark-link-embed.ts';

// https://astro.build/config
export default defineConfig({
  site: siteConfig.site,
  compressHTML: true,
  markdown: {
    // Enable GitHub Flavored Markdown
    gfm: true,
    // Configure remark plugins for link embedding
    remarkPlugins: [
      [
        remarkLinkEmbed,
        {
          enableTweetEmbed: defaultContentConfig.enableTweetEmbed,
          enableOGPreview: defaultContentConfig.enableOGPreview,
        },
      ],
    ],
    // Configure rehype plugins for automatic heading IDs and anchor links
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['anchor-link'],
          },
        },
      ],
      rehypeImagePlaceholder,
    ],
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
    },
  },
  integrations: [
    react(),
    icon({
      include: {
        gg: ['*'],
        'fa6-regular': ['*'],
        'fa6-solid': ['*'],
        ri: ['*'],
      },
    }),
    umami({
      id: '14de13b0-3220-4beb-8f0b-e08b17724991',
      endpointUrl: 'https://stats.cosine.ren',
      hostUrl: 'https://stats.cosine.ren',
    }),
    pagefind(),
    mermaid({
      autoTheme: true,
    }),
  ],
  devToolbar: {
    enabled: true,
  },
  vite: {
    plugins: [svgr(), tailwindcss()],
    ssr: {
      noExternal: ['react-tweet'],
    },
  },
  trailingSlash: 'ignore',
});
