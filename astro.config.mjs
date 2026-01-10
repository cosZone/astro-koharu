import fs from 'node:fs';
import path from 'node:path';
import react from '@astrojs/react';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import umami from '@yeskunall/astro-umami';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import jsYaml from 'js-yaml';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visualizer } from 'rollup-plugin-visualizer';
import { loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import { rehypeImagePlaceholder } from './src/lib/markdown/rehype-image-placeholder.ts';
import { remarkLinkEmbed } from './src/lib/markdown/remark-link-embed.ts';

// Load YAML config directly with Node.js (before Vite plugins are available)
// This is only used in astro.config.mjs - other files use @rollup/plugin-yaml
function loadConfigForAstro() {
  const configPath = path.join(process.cwd(), 'config', 'site.yaml');
  const content = fs.readFileSync(configPath, 'utf8');
  return jsYaml.load(content);
}

const yamlConfig = loadConfigForAstro();
const mode = process.env.NODE_ENV ?? 'development';
const env = loadEnv(mode, process.cwd(), '');
const umamiId = env.UMAMI_ID ?? process.env.UMAMI_ID;
const umamiEndpoint = env.UMAMI_ENDPOINT ?? process.env.UMAMI_ENDPOINT;

/**
 * Vite plugin for conditional Three.js bundling
 * When christmas snowfall is disabled, replaces SnowfallCanvas with a noop component
 * This saves ~879KB from the bundle
 */
function conditionalSnowfall() {
  const VIRTUAL_ID = 'virtual:snowfall-canvas';
  const RESOLVED_ID = `\0${VIRTUAL_ID}`;
  const christmas = yamlConfig.christmas || { enabled: false, features: {} };
  const isEnabled = christmas.enabled && christmas.features?.snowfall;

  return {
    name: 'conditional-snowfall',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      // Redirect the alias import to virtual module when disabled
      if (!isEnabled && id === '@components/christmas/SnowfallCanvas') {
        return RESOLVED_ID;
      }
    },
    load(id) {
      if (id === RESOLVED_ID) {
        // Return noop component when christmas is disabled
        return 'export function SnowfallCanvas() { return null; }';
      }
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: yamlConfig.site.url,
  compressHTML: true,
  markdown: {
    // Enable GitHub Flavored Markdown
    gfm: true,
    // Configure remark plugins for link embedding
    remarkPlugins: [
      [
        remarkLinkEmbed,
        {
          enableTweetEmbed: yamlConfig.content?.enableTweetEmbed ?? true,
          enableOGPreview: yamlConfig.content?.enableOGPreview ?? true,
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
            ariaLabel: 'Link to this section',
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
    // Umami analytics - configured via environment variables
    // Set UMAMI_ID and UMAMI_ENDPOINT in .env file
    ...(umamiId
      ? [
          umami({
            id: umamiId,
            endpointUrl: umamiEndpoint,
            hostUrl: umamiEndpoint,
          }),
        ]
      : []),
    pagefind(),
    mermaid({
      autoTheme: true,
    }),
  ],
  devToolbar: {
    enabled: true,
  },
  vite: {
    plugins: [
      yaml(),
      conditionalSnowfall(),
      svgr(),
      tailwindcss(),
      visualizer({
        emitFile: true,
        filename: 'stats.html',
      }),
    ],
    ssr: {
      noExternal: ['react-tweet'],
    },
    optimizeDeps: {
      include: ['@antv/infographic'],
    },
  },
  trailingSlash: 'ignore',
});
