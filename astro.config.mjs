import fs from 'node:fs';
import path from 'node:path';
import { unified } from '@astrojs/markdown-remark';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, memoryCache } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import robotsTxt from 'astro-robots-txt';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkMath from 'remark-math';
import Sonda from 'sonda/vite';
import { loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import YAML from 'yaml';
import { momentsRoutes } from './src/features/moments/integration/momentsRoutes.ts';
import { normalizeContentConfig } from './src/lib/config/content.ts';
import { enabledFeaturedSeriesSlugs, normalizeFeaturedSeries } from './src/lib/config/featured-series.ts';
import { normalizeMomentsConfig } from './src/lib/config/moments.ts';
import { RESERVED_ROUTES } from './src/lib/config/reserved-routes.ts';
import { rehypeEncryptedBlock } from './src/lib/markdown/rehype-encrypted-block.ts';
import { rehypeEncryptedPost } from './src/lib/markdown/rehype-encrypted-post.ts';
import { rehypeImagePlaceholder } from './src/lib/markdown/rehype-image-placeholder.ts';
import { rehypeShokaAttrs } from './src/lib/markdown/rehype-shoka-attrs.ts';
import { remarkEncryptedDirective } from './src/lib/markdown/remark-encrypted-directive.ts';
import { remarkLinkEmbed } from './src/lib/markdown/remark-link-embed.ts';
import { remarkIns, remarkMark } from './src/lib/markdown/remark-shoka-effects.ts';
import { remarkShokaPreprocess } from './src/lib/markdown/remark-shoka-preprocess.ts';
import { remarkShokaRuby } from './src/lib/markdown/remark-shoka-ruby.ts';
import { remarkShokaSpoiler } from './src/lib/markdown/remark-shoka-spoiler.ts';
import { collapsibleCodeTransformer } from './src/lib/markdown/shiki-collapsible-transformer.ts';
import { shokaMetaTransformer } from './src/lib/markdown/shiki-meta-transformer.ts';

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
const env = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), '');
const { ANALYZE } = env;
const isAnalyze = ANALYZE === 'true';
// Get robots.txt config from YAML
const robotsConfig = yamlConfig.seo?.robots;

// i18n configuration from YAML
const i18nYaml = yamlConfig.i18n;
const i18nDefaultLocale = i18nYaml?.defaultLocale ?? 'zh';
const i18nLocales = (i18nYaml?.locales ?? [{ code: 'zh' }]).map((l) => l.code);
const hasMultipleLocales = i18nLocales.length > 1;
const enabledI18nLocales = (i18nYaml?.locales ?? [{ code: 'zh' }])
  .filter((locale) => locale.enabled !== false)
  .map((locale) => locale.code);

const featuredSeries = normalizeFeaturedSeries(yamlConfig.featuredSeries, {
  categoryMap: yamlConfig.categoryMap,
  reservedRoutes: RESERVED_ROUTES,
});
const momentsConfig = normalizeMomentsConfig(yamlConfig.moments, {
  reservedRoutes: RESERVED_ROUTES,
  localeCodes: enabledI18nLocales,
  seriesSlugs: enabledFeaturedSeriesSlugs(featuredSeries),
});

function assertMomentsOgImage(image, field) {
  if (!image?.startsWith('/')) return;
  const publicFile = path.join(process.cwd(), 'public', image.slice(1));
  if (!fs.existsSync(publicFile) || !fs.statSync(publicFile).isFile()) {
    throw new Error(`Moments configuration error: "${field}" does not exist in public: ${image}`);
  }
}

if (momentsConfig.enabled) {
  assertMomentsOgImage(momentsConfig.ogImage, 'ogImage');
  for (const [index, channel] of momentsConfig.channels.entries()) {
    assertMomentsOgImage(channel.ogImage, `channels[${index}].ogImage`);
  }
  const suiteUrl = env.KOHARU_SUITE_URL;
  if (!suiteUrl) throw new Error('KOHARU_SUITE_URL is required when moments.enabled is true.');
  const parsedSuiteUrl = new URL(suiteUrl);
  if (
    !['http:', 'https:'].includes(parsedSuiteUrl.protocol) ||
    parsedSuiteUrl.username ||
    parsedSuiteUrl.password ||
    parsedSuiteUrl.pathname !== '/' ||
    parsedSuiteUrl.search ||
    parsedSuiteUrl.hash
  ) {
    throw new Error('KOHARU_SUITE_URL must be an HTTP(S) origin without credentials, query, or fragment.');
  }
}

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
const contentConfig = normalizeContentConfig(yamlConfig.content);

// Remark plugins — order matters
// remarkShokaPreprocess MUST be first: it re-parses raw text to fix GFM/remark conflicts
// (+++, ~sub~, {% links %} YAML etc.) before any AST-level plugin runs.
const remarkPlugins = [];
if (contentConfig.enableShokaContainers || contentConfig.enableShokaHexoTags || contentConfig.enableShokaEffects) {
  remarkPlugins.push([
    remarkShokaPreprocess,
    {
      enableContainers: contentConfig.enableShokaContainers,
      enableHexoTags: contentConfig.enableShokaHexoTags,
      // The plugin option is named after what it parses (super/subscript);
      // `enableShokaEffects` gates the whole ++ins++/==mark==/~sub~/^sup^ family.
      enableSuperSub: contentConfig.enableShokaEffects,
      enableMath: contentConfig.enableMath,
      enableEncryptedBlock: contentConfig.enableEncryptedBlock,
    },
  ]);
}
// remarkMath must run BEFORE ruby/spoiler/effects so that $...$ content
// is already parsed into inlineMath/math nodes and won't be touched by text-scanning plugins.
if (contentConfig.enableMath) remarkPlugins.push(remarkMath);
if (contentConfig.enableShokaSpoiler) remarkPlugins.push(remarkShokaSpoiler);
if (contentConfig.enableShokaRuby) remarkPlugins.push(remarkShokaRuby);
if (contentConfig.enableShokaEffects) {
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
    enableLinkEmbed: contentConfig.enableLinkEmbed,
    enableTweetEmbed: contentConfig.enableTweetEmbed,
    enableOGPreview: contentConfig.enableOGPreview,
    enableCodePenEmbed: contentConfig.enableCodePenEmbed,
    previewCacheTime: contentConfig.previewCacheTime,
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
if (contentConfig.enableShokaAttrs) rehypePlugins.push(rehypeShokaAttrs);
rehypePlugins.push(rehypeImagePlaceholder);
if (contentConfig.enableMath) rehypePlugins.push(rehypeKatex);
// Encrypted block/post MUST be last rehype plugins — encrypt fully-rendered children
if (contentConfig.enableEncryptedBlock) {
  rehypePlugins.push(rehypeEncryptedBlock);
  rehypePlugins.push(rehypeEncryptedPost);
}

// Shiki transformers
const shikiTransformers = [];
if (contentConfig.enableCodeMeta) shikiTransformers.push(shokaMetaTransformer());
if (contentConfig.enhanceCodeBlock) shikiTransformers.push(collapsibleCodeTransformer());

// https://astro.build/config
export default defineConfig({
  site: yamlConfig.site.url,
  output: 'static',
  compressHTML: true,
  markdown: {
    processor: unified({
      gfm: true,
      remarkPlugins,
      rehypePlugins,
    }),
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
    pagefind(),
    mermaid({
      autoTheme: true,
    }),
    robotsTxt(robotsConfig || {}),
    ...(momentsConfig.enabled ? [momentsRoutes(momentsConfig)] : []),
  ],
  ...(momentsConfig.enabled
    ? {
        adapter: node({ mode: 'standalone' }),
        cache: { provider: memoryCache({ max: 1000 }) },
      }
    : {}),
  devToolbar: {
    enabled: true,
  },
  vite: {
    build: {
      // Enable sourcemap for Sonda bundle analysis
      sourcemap: isAnalyze,
    },
    plugins: [...(isAnalyze ? [Sonda({ open: false })] : []), yaml(), conditionalSnowfall(), svgr(), tailwindcss()],
    resolve: {
      noExternal: ['react-tweet'],
    },
    optimizeDeps: {
      include: [
        '@antv/infographic',
        '@floating-ui/react',
        '@hookform/resolvers/zod',
        '@tanstack/react-virtual',
        'react-hook-form',
        'zod',
      ],
    },
  },
  // Only enable Astro i18n routing when multiple locales are configured.
  // Single-locale sites skip this entirely — no /[lang]/ routes are generated.
  ...(hasMultipleLocales && {
    i18n: {
      defaultLocale: i18nDefaultLocale,
      locales: i18nLocales,
      routing: {
        prefixDefaultLocale: false,
      },
    },
  }),
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  trailingSlash: 'ignore',
});
