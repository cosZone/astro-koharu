import fs from 'node:fs';
import path from 'node:path';
import cloudflare from '@astrojs/cloudflare';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import umami from '@yeskunall/astro-umami';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import { visualizer } from 'rollup-plugin-visualizer';
import svgr from 'vite-plugin-svgr';
import YAML from 'yaml';
import { rehypeImagePlaceholder } from './src/lib/markdown/rehype-image-placeholder.ts';
import { remarkLinkEmbed } from './src/lib/markdown/remark-link-embed.ts';
import { normalizeUrl } from './src/lib/utils.ts';

// Load YAML config directly with Node.js (before Vite plugins are available)
// This is only used in astro.config.mjs - other files use @rollup/plugin-yaml
function loadConfigForAstro() {
  const configPath = path.join(process.cwd(), 'config', 'site.yaml');
  const content = fs.readFileSync(configPath, 'utf8');
  return YAML.parse(content);
}

const yamlConfig = loadConfigForAstro();

// Load CMS config for adapter decision
function loadCmsConfig() {
  const configPath = path.join(process.cwd(), 'config', 'cms.yaml');
  if (!fs.existsSync(configPath)) return { enabled: false };
  const content = fs.readFileSync(configPath, 'utf8');
  return YAML.parse(content) || { enabled: false };
}

const cmsConfig = loadCmsConfig();

/**
 * Select adapter based on environment
 * 按需渲染适配器，选择最合适的适配器：https://docs.astro.build/en/guides/on-demand-rendering/
 *
 * Priority:
 * 1. Check if adapter is needed (dev with CMS or production build)
 * 2. Detect platform: Vercel > Cloudflare > Netlify
 * 3. Fallback: Node.js (standalone mode)
 * 4. No adapter: static build
 */
function selectAdapter() {
  const isDev = process.env.NODE_ENV !== 'production';

  // Determine if adapter is needed
  const needsAdapter = isDev ? cmsConfig?.enabled : true;

  // Static build without adapter
  if (!needsAdapter) {
    return undefined;
  }

  // Platform detection
  const isVercel = process.env.VERCEL === '1';
  const isCloudflare = process.env.CF_PAGES === '1' || !!process.env.CLOUDFLARE;
  const isNetlify = process.env.NETLIFY === 'true';

  // Select platform-specific adapter
  if (isVercel) return vercel();
  if (isCloudflare) return cloudflare();
  if (isNetlify) return netlify();

  // Fallback: Node.js standalone (for self-hosting or undetected platforms)
  return node({ mode: 'standalone' });
}

const adapter = selectAdapter();

// Get Umami analytics config from YAML
const umamiConfig = yamlConfig.analytics?.umami;
const umamiEnabled = umamiConfig?.enabled ?? false;
const umamiId = umamiConfig?.id;
// Normalize endpoint URL to remove trailing slashes
const umamiEndpoint = normalizeUrl(umamiConfig?.endpoint);

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
  adapter,
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
    // Umami analytics - configured via config/site.yaml
    ...(umamiEnabled && umamiId
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
