import fs from 'node:fs';
import path from 'node:path';
import cloudflare from '@astrojs/cloudflare';
import netlify from '@astrojs/netlify';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import yaml from '@rollup/plugin-yaml';
import tailwindcss from '@tailwindcss/vite';
import umami from '@yeskunall/astro-umami';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import mermaid from 'astro-mermaid';
import pagefind from 'astro-pagefind';
import robotsTxt from 'astro-robots-txt';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeSlug from 'rehype-slug';
import Sonda from 'sonda/astro';
import { loadEnv } from 'vite';
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
 * 1. Detect platform: Vercel > Cloudflare > Netlify
 * 2. Fallback: Node.js (standalone mode)
 *
 * Note: Always return an adapter to enable Astro's hybrid rendering.
 * Vercel only creates serverless functions for pages with prerender=false.
 * All CMS routes use `prerender = import.meta.env.PROD`, so:
 * - Production: prerender=true → static pages → no serverless functions → no 250MB issue
 * - Development: prerender=false → SSR → CMS works normally
 */
function selectAdapter() {
  // Platform detection
  const isVercel = process.env.VERCEL === '1';
  const isCloudflare = process.env.CF_PAGES === '1' || !!process.env.CLOUDFLARE;
  const isNetlify = process.env.NETLIFY === 'true';

  // Select platform-specific adapter
  if (isVercel) return vercel();
  if (isCloudflare) return cloudflare();
  if (isNetlify) return netlify();

  // Fallback: Node.js standalone (for self-hosting or local development)
  return node({ mode: 'standalone' });
}

const adapter = selectAdapter();

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

/**
 * Vite plugin for conditional CMS bundling
 * In production (or when CMS is disabled), replaces CMS imports with noop components
 * This saves ~180KB gzipped from the bundle (BlockNote, react-hook-form, etc.)
 */
function conditionalCms() {
  const VIRTUAL_COMPONENTS_ID = 'virtual:cms-components-noop';
  const VIRTUAL_LIB_ID = 'virtual:cms-lib-noop';
  const VIRTUAL_CSS_ID = 'virtual:cms-css-noop';
  const RESOLVED_COMPONENTS_ID = `\0${VIRTUAL_COMPONENTS_ID}`;
  const RESOLVED_LIB_ID = `\0${VIRTUAL_LIB_ID}`;
  const RESOLVED_CSS_ID = `\0${VIRTUAL_CSS_ID}`;

  let isEnabled = false;

  return {
    name: 'conditional-cms',
    enforce: 'pre',
    configResolved(config) {
      // Use Vite's resolved mode instead of NODE_ENV (which may not be set yet)
      const isDev = config.mode === 'development' || config.command === 'serve';
      isEnabled = isDev && cmsConfig?.enabled;
    },
    resolveId(id) {
      if (id === VIRTUAL_COMPONENTS_ID) return RESOLVED_COMPONENTS_ID;
      if (id === VIRTUAL_LIB_ID) return RESOLVED_LIB_ID;
      if (id === VIRTUAL_CSS_ID) return RESOLVED_CSS_ID;

      // In production or when CMS disabled, redirect imports to noop modules
      if (!isEnabled) {
        // Match various path patterns: @components/cms, @/components/cms, ./components/cms, etc.
        const isCmsComponent =
          id === '@components/cms' ||
          id.startsWith('@components/cms/') ||
          id === '@/components/cms' ||
          id.startsWith('@/components/cms/') ||
          /[\\/]components[\\/]cms([\\/]|$)/.test(id);

        const isCmsLib =
          id === '@lib/cms' ||
          id.startsWith('@lib/cms/') ||
          id === '@/lib/cms' ||
          id.startsWith('@/lib/cms/') ||
          /[\\/]lib[\\/]cms([\\/]|$)/.test(id);

        if (isCmsComponent) {
          return RESOLVED_COMPONENTS_ID;
        }
        if (isCmsLib) {
          return RESOLVED_LIB_ID;
        }
        // Exclude BlockNote entirely in production (both JS and CSS)
        if (id.includes('@blocknote')) {
          if (id.endsWith('.css')) {
            return RESOLVED_CSS_ID;
          }
          // Return empty module for BlockNote JS imports
          return RESOLVED_COMPONENTS_ID;
        }
      }
    },
    load(id) {
      if (id === RESOLVED_COMPONENTS_ID) {
        // Noop components matching @components/cms exports
        return `
          export function CategoryMappingDialog() { return null; }
          export function CMSDashboardPage() { return null; }
          export function EditButton() { return null; }
          export function EditorSelector() { return null; }
          export function FrontmatterEditor() { return null; }
          export function PostEditor() { return null; }
          export default EditButton;
        `;
      }
      if (id === RESOLVED_CSS_ID) {
        // Empty CSS for BlockNote styles
        return '';
      }
      if (id === RESOLVED_LIB_ID) {
        // Noop functions and empty schemas matching @lib/cms exports
        return `
          export const generateSlug = () => '';
          export const createPost = async () => ({ success: false });
          export const listPosts = async () => ({ posts: [], total: 0 });
          export const readPost = async () => null;
          export const toggleDraft = async () => ({ success: false });
          export const writePost = async () => ({ success: false });
          export const detectNewCategories = () => [];
          export const extractCategoryNames = () => [];
          export const generateCategorySlug = () => '';
          export const buildEditorUrl = () => '';
          export const getFullFilePath = () => '';
          export const openInEditor = () => {};
          export const jsonErrorResponse = () => new Response();
          export const jsonResponse = () => new Response();
          export const validateCmsAccess = () => ({ valid: false });
          export const categoryMappingSchema = {};
          export const categorySlugSchema = {};
          export const createPostSchema = {};
          export const frontmatterSchema = {};
          export const hasValidMarkdownExtension = () => false;
          export const isPathSafe = () => false;
        `;
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
    plugins: [yaml(), conditionalSnowfall(), conditionalCms(), svgr(), tailwindcss()],
    ssr: {
      noExternal: ['react-tweet'],
    },
    optimizeDeps: {
      include: ['@antv/infographic'],
    },
  },
  trailingSlash: 'ignore',
});
