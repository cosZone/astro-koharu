import fs from 'node:fs';
import path from 'node:path';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import umami from '@yeskunall/astro-umami';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import robotsTxt from 'astro-robots-txt';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import Sonda from 'sonda/astro';
import { loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import YAML from 'yaml';
import { rehypeEncryptedBlock } from './src/lib/markdown/rehype-encrypted-block.ts';
import { rehypeImagePlaceholder } from './src/lib/markdown/rehype-image-placeholder.ts';
import { rehypeShokaAttrs } from './src/lib/markdown/rehype-shoka-attrs.ts';
import { remarkEncryptedDirective } from './src/lib/markdown/remark-encrypted-directive.ts';
import { remarkLinkEmbed } from './src/lib/markdown/remark-link-embed.ts';
import { remarkIns, remarkMark } from './src/lib/markdown/remark-shoka-effects.ts';
import { remarkShokaPreprocess } from './src/lib/markdown/remark-shoka-preprocess.ts';
import { remarkShokaRuby } from './src/lib/markdown/remark-shoka-ruby.ts';
import { remarkShokaSpoiler } from './src/lib/markdown/remark-shoka-spoiler.ts';
import { shokaMetaTransformer } from './src/lib/markdown/shiki-meta-transformer.ts';
import { normalizeUrl } from './src/lib/utils.ts';

// Load YAML config directly with Node.js (before Vite plugins are available)
// This is only used in astro.config.mjs - other files use @rollup/plugin-yaml
function loadConfigForAstro() {
  const configPath = path.join(process.cwd(), 'config', 'site.yaml');
  const content = fs.readFileSync(configPath, 'utf8');
  return YAML.parse(content);
}

const yamlConfig = loadConfigForAstro();

// Bundle analysis mode: ANALYZE=true pnpm build
// Use loadEnv to read .env file (astro.config.mjs runs before Vite loads .env)
const { ANALYZE } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const isAnalyze = ANALYZE === 'true';
// Get Umami analytics config from YAML
const umamiConfig = yamlConfig.analytics?.umami;
const umamiEnabled = umamiConfig?.enabled ?? false;
const umamiId = umamiConfig?.id;
// Normalize endpoint URL to remove trailing slashes
const umamiEndpoint = normalizeUrl(umamiConfig?.endpoint);

// Get robots.txt config from YAML
const robotsConfig = yamlConfig.seo?.robots;

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

// Build conditional plugin lists based on content config
const contentConfig = yamlConfig.content || {};

// Remark plugins — order matters
// remarkShokaPreprocess MUST be first: it re-parses raw text to fix GFM/remark conflicts
// (+++, ~sub~, {% links %} YAML etc.) before any AST-level plugin runs.
const remarkPlugins = [];
{
  const needsPreprocess =
    contentConfig.enableShokaContainers !== false ||
    contentConfig.enableShokaHexoTags !== false ||
    contentConfig.enableShokaEffects !== false;
  if (needsPreprocess) {
    remarkPlugins.push([
      remarkShokaPreprocess,
      {
        enableContainers: contentConfig.enableShokaContainers !== false,
        enableHexoTags: contentConfig.enableShokaHexoTags !== false,
        enableSuperSub: contentConfig.enableShokaEffects !== false,
        enableMath: contentConfig.enableMath !== false,
        enableEncryptedBlock: contentConfig.enableEncryptedBlock ?? false,
      },
    ]);
  }
}
// remarkMath must run BEFORE ruby/spoiler/effects so that $...$ content
// is already parsed into inlineMath/math nodes and won't be touched by text-scanning plugins.
if (contentConfig.enableMath !== false) remarkPlugins.push(remarkMath);
if (contentConfig.enableShokaSpoiler !== false) remarkPlugins.push(remarkShokaSpoiler);
if (contentConfig.enableShokaRuby !== false) remarkPlugins.push(remarkShokaRuby);
if (contentConfig.enableShokaEffects !== false) {
  remarkPlugins.push(remarkIns, remarkMark);
}
// Encrypted block: remarkDirective is registered in BOTH places —
// here for the main Astro pipeline (when remarkShokaPreprocess skips re-parse),
// and inside remarkShokaPreprocess's re-parse pipeline (when it does re-parse).
if (contentConfig.enableEncryptedBlock) {
  remarkPlugins.push(remarkDirective, remarkEncryptedDirective);
}
// Link embed is always on (existing feature)
remarkPlugins.push([
  remarkLinkEmbed,
  {
    enableTweetEmbed: contentConfig.enableTweetEmbed ?? true,
    enableOGPreview: contentConfig.enableOGPreview ?? true,
  },
]);

// Rehype plugins — order matters
const rehypePlugins = [
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
];
if (contentConfig.enableShokaAttrs !== false) rehypePlugins.push(rehypeShokaAttrs);
rehypePlugins.push(rehypeImagePlaceholder);
if (contentConfig.enableMath !== false) rehypePlugins.push(rehypeKatex);
// Encrypted block MUST be last rehype plugin — encrypts fully-rendered children
if (contentConfig.enableEncryptedBlock) rehypePlugins.push(rehypeEncryptedBlock);

// Shiki transformers
const shikiTransformers = [];
if (contentConfig.enableCodeMeta !== false) shikiTransformers.push(shokaMetaTransformer());

// https://astro.build/config
export default defineConfig({
  site: yamlConfig.site.url,
  compressHTML: true,
  markdown: {
    // Enable GitHub Flavored Markdown
    gfm: true,
    remarkPlugins,
    rehypePlugins,
    syntaxHighlight: {
      type: 'shiki',
      excludeLangs: ['mermaid'],
    },
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      transformers: shikiTransformers,
    },
  },
  integrations: [
    react(),
    sitemap(),
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
    robotsTxt(robotsConfig || {}),
    ...(isAnalyze ? [Sonda()] : []),
  ],
  devToolbar: {
    enabled: true,
  },
  vite: {
    build: {
      // Enable sourcemap for Sonda bundle analysis
      sourcemap: isAnalyze,
    },
    plugins: [yaml(), conditionalSnowfall(), svgr(), tailwindcss()],
    ssr: {
      noExternal: ['react-tweet'],
    },
    optimizeDeps: {
      include: ['@antv/infographic'],
    },
  },
  trailingSlash: 'ignore',
});
