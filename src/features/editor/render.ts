import type { Element, Root as HastRoot, RootContent } from 'hast';
import { toHtml } from 'hast-util-to-html';
import type { Link, Root as MarkdownRoot } from 'mdast';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { type BundledLanguage, createHighlighter } from 'shiki';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { normalizeContentConfig } from '../../lib/config/content';
import type { ContentConfig } from '../../lib/config/types';
import { classifyLink, isStandaloneLinkParagraph } from '../../lib/markdown/link-utils';
import { rehypeImagePlaceholder } from '../../lib/markdown/rehype-image-placeholder';
import { rehypeShokaAttrs } from '../../lib/markdown/rehype-shoka-attrs';
import { remarkEncryptedDirective } from '../../lib/markdown/remark-encrypted-directive';
import { remarkIns, remarkMark } from '../../lib/markdown/remark-shoka-effects';
import { remarkShokaPreprocess } from '../../lib/markdown/remark-shoka-preprocess';
import { remarkShokaRuby } from '../../lib/markdown/remark-shoka-ruby';
import { remarkShokaSpoiler } from '../../lib/markdown/remark-shoka-spoiler';
import { collapsibleCodeTransformer } from '../../lib/markdown/shiki-collapsible-transformer';
import { shokaMetaTransformer } from '../../lib/markdown/shiki-meta-transformer';
import { escapeHtml } from '../../lib/markdown/shoka-renderers';
import { encryptEditorContent } from './crypto';

export interface EditorHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface EditorRenderOptions {
  ogEndpoint?: string;
  contentConfig?: Partial<ContentConfig>;
}

const safeTags = new Set(
  (
    'a abbr b bdi bdo blockquote br caption code col colgroup dd del details div dl dt em figcaption figure ' +
    'h1 h2 h3 h4 h5 h6 hr i img input ins kbd li mark ol p pre q rp rt ruby s samp section small span ' +
    'strong sub summary sup table tbody td th thead tr u ul var button spoiler-span audio video source ' +
    'math annotation semantics mrow mi mn mo mtext mspace msup msub msubsup mfrac msqrt mroot mtable ' +
    'mtr mtd mover munder munderover mpadded mphantom menclose svg g path rect circle ellipse line polyline ' +
    'polygon text tspan defs clipPath use symbol title desc'
  )
    .toLowerCase()
    .split(' '),
);

const urlProperties = new Set(['href', 'src', 'poster', 'xlinkhref', 'cite']);

function safeUrl(value: string): boolean {
  const compact = [...value].filter((character) => character.charCodeAt(0) > 32 && character.charCodeAt(0) !== 127).join('');
  if (compact.startsWith('#')) return true;
  try {
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(compact, 'https://editor.invalid').protocol);
  } catch {
    return false;
  }
}

/** Defence in depth before output reaches the isolated, DOMPurify-protected preview. */
function sanitizeTree(node: HastRoot | Element): void {
  node.children = node.children.filter((child) => {
    if (child.type === 'comment' || child.type === 'doctype' || child.type === 'raw') return false;
    if (child.type !== 'element') return true;
    if (!safeTags.has(child.tagName.toLowerCase())) return false;
    if (
      child.tagName === 'input' &&
      (String(child.properties.type).toLowerCase() !== 'checkbox' || child.properties.disabled !== true)
    ) {
      return false;
    }
    for (const [key, value] of Object.entries(child.properties)) {
      const normalized = key.toLowerCase();
      if (
        normalized.startsWith('on') ||
        ['srcdoc', 'srcset', 'action', 'formaction', 'form', 'autofocus', 'contenteditable', 'is'].includes(normalized) ||
        (urlProperties.has(normalized) && !safeUrl(String(value)))
      ) {
        delete child.properties[key];
      }
      if (normalized === 'style' && /url\s*\(|expression\s*\(|@import|\\|behavior\s*:|-moz-binding/i.test(String(value))) {
        delete child.properties[key];
      }
    }
    if (child.tagName === 'button') child.properties.type = 'button';
    if (child.tagName === 'img') child.properties.loading = 'lazy';
    if (child.tagName === 'a') child.properties.rel = ['noopener', 'noreferrer'];
    sanitizeTree(child);
    return true;
  }) as typeof node.children;
}

function remarkEditorLinks(options: EditorRenderOptions) {
  const config = normalizeContentConfig(options.contentConfig);
  return (tree: MarkdownRoot) => {
    if (!config.enableLinkEmbed) return;
    visit(tree, 'paragraph', (node, index, parent) => {
      if (index === undefined || !parent || !isStandaloneLinkParagraph(node)) return;
      const { url } = node.children[0] as Link;
      if (!/^https?:\/\//i.test(url)) return;
      const link = classifyLink(url);
      let html = '';
      if (link.type === 'tweet' && config.enableTweetEmbed && link.tweetId) {
        html = `<div data-tweet-embed data-tweet-id="${escapeHtml(link.tweetId)}" data-url="${escapeHtml(url)}"></div>`;
      } else if (link.type === 'codepen' && config.enableCodePenEmbed && link.codepen) {
        const { user, penId } = link.codepen;
        html = `<p class="codepen" data-height="400" data-default-tab="result" data-slug-hash="${escapeHtml(penId)}" data-user="${escapeHtml(user)}"><span>See the Pen <a href="${escapeHtml(url)}">${escapeHtml(penId)}</a> by ${escapeHtml(user)} (<a href="https://codepen.io/${escapeHtml(user)}">@${escapeHtml(user)}</a>) on <a href="https://codepen.io">CodePen</a>.</span></p>`;
      } else if (link.type === 'general' && config.enableOGPreview) {
        const endpoint = options.ogEndpoint ?? '/api/editor/og';
        html = `<div class="link-preview-block not-prose" data-editor-og-url="${escapeHtml(url)}" data-editor-og-endpoint="${escapeHtml(endpoint)}" data-state="loading"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a><p class="text-muted-foreground text-xs" role="status">正在获取链接信息…</p></div>`;
      }
      if (html) parent.children[index] = { type: 'html', value: html };
    });
  };
}

function remarkCodeMeta() {
  return (tree: MarkdownRoot) => {
    visit(tree, 'code', (node) => {
      if (node.meta) node.data = { ...node.data, hProperties: { 'data-editor-meta': node.meta } };
    });
  };
}

let highlighterPromise: ReturnType<typeof createHighlighter> | undefined;
const languageLoads = new Map<string, Promise<boolean>>();

async function highlightCode(tree: HastRoot, options: EditorRenderOptions) {
  const config = normalizeContentConfig(options.contentConfig);
  const blocks: { node: Element; parent: HastRoot | Element }[] = [];
  visit(tree, 'element', (node, _index, parent) => {
    if (node.tagName === 'pre' && parent && (parent.type === 'root' || parent.type === 'element')) {
      blocks.push({ node, parent });
    }
  });
  if (blocks.length === 0) return;
  highlighterPromise ??= createHighlighter({ themes: ['github-light', 'github-dark'], langs: [] });
  const highlighter = await highlighterPromise;
  for (const { node, parent } of blocks) {
    const code = node.children.find((child): child is Element => child.type === 'element' && child.tagName === 'code');
    if (!code) continue;
    const source = textContent(code).replace(/\n$/, '');
    const classes = code.properties.className;
    const langClass = Array.isArray(classes) ? classes.find((value) => String(value).startsWith('language-')) : undefined;
    const language = langClass ? String(langClass).slice('language-'.length) : 'text';
    const meta = String(code.properties['data-editor-meta'] ?? code.properties.dataEditorMeta ?? '');
    delete code.properties['data-editor-meta'];
    delete code.properties.dataEditorMeta;
    if (language === 'mermaid') {
      node.properties.className = ['mermaid'];
      node.properties['data-language'] = 'mermaid';
      node.properties['data-diagram'] = source;
      continue;
    }
    if (source.trimStart().startsWith('infographic ')) continue;
    let highlightLanguage = language;
    if (!['text', 'txt', 'plaintext', 'ansi'].includes(language)) {
      let load = languageLoads.get(language);
      if (!load) {
        load = Promise.resolve()
          .then(() => highlighter.loadLanguage(language as BundledLanguage))
          .then(
            () => true,
            () => false,
          );
        languageLoads.set(language, load);
      }
      if (!(await load)) highlightLanguage = 'text';
    }
    const highlighted = highlighter.codeToHast(source, {
      lang: highlightLanguage,
      themes: { light: 'github-light', dark: 'github-dark' },
      meta: { __raw: meta },
      transformers: [
        ...(config.enableCodeMeta ? [shokaMetaTransformer()] : []),
        ...(config.enhanceCodeBlock ? [collapsibleCodeTransformer()] : []),
        {
          pre(pre) {
            pre.properties['data-language'] = language;
          },
        },
      ],
    });
    const index = parent.children.indexOf(node);
    if (index >= 0) parent.children.splice(index, 1, ...(highlighted.children as Element[]));
  }
}

function textContent(node: RootContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textContent).join('');
  return '';
}

async function encryptBlocks(tree: HastRoot) {
  const blocks: Element[] = [];
  visit(tree, 'element', (node) => {
    if (Array.isArray(node.properties.className) && node.properties.className.includes('encrypted-block')) {
      blocks.push(node);
    }
  });
  // Children are encrypted before parents so nested directives remain usable after decryption.
  for (const node of blocks.reverse()) {
    const password = String(node.properties.dataPassword ?? node.properties['data-password'] ?? '');
    delete node.properties.dataPassword;
    delete node.properties['data-password'];
    if (!password) continue;
    const html = toHtml({ type: 'root', children: node.children });
    const encrypted = await encryptEditorContent(html, password);
    node.children = [];
    node.properties['data-cipher'] = encrypted.cipher;
    node.properties['data-iv'] = encrypted.iv;
    node.properties['data-salt'] = encrypted.salt;
    node.properties['data-pagefind-ignore'] = '';
  }
}

/** Render the article body with the blog's actual Shoka, KaTeX, heading and code plugins. */
export async function renderEditorMarkdown(source: string, options: EditorRenderOptions = {}) {
  const config = normalizeContentConfig(options.contentConfig);
  const processor = unified().use(remarkParse).use(remarkGfm);
  if (config.enableShokaContainers || config.enableShokaHexoTags || config.enableShokaEffects) {
    processor.use(remarkShokaPreprocess, {
      enableContainers: config.enableShokaContainers,
      enableHexoTags: config.enableShokaHexoTags,
      enableSuperSub: config.enableShokaEffects,
      enableMath: config.enableMath,
      enableEncryptedBlock: config.enableEncryptedBlock,
    });
  }
  if (config.enableMath) processor.use(remarkMath);
  if (config.enableShokaSpoiler) processor.use(remarkShokaSpoiler);
  if (config.enableShokaRuby) processor.use(remarkShokaRuby);
  if (config.enableShokaEffects) processor.use(remarkIns).use(remarkMark);
  if (config.enableEncryptedBlock) processor.use(remarkDirective).use(remarkEncryptedDirective);
  const pipeline = processor
    .use(remarkEditorLinks, options)
    .use(remarkCodeMeta)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: 'append',
      properties: { className: ['anchor-link'], ariaLabel: 'Link to this section' },
    });
  if (config.enableShokaAttrs) pipeline.use(rehypeShokaAttrs);
  pipeline.use(rehypeImagePlaceholder);
  if (config.enableMath) pipeline.use(rehypeKatex, { throwOnError: false, strict: false });
  const tree = (await pipeline.run(pipeline.parse(source), { value: source })) as HastRoot;
  await highlightCode(tree, options);
  sanitizeTree(tree);
  const headings: EditorHeading[] = [];
  visit(tree, 'element', (node) => {
    if (!/^h[1-6]$/.test(node.tagName) || !node.properties.id) return;
    headings.push({ depth: Number(node.tagName[1]), slug: String(node.properties.id), text: textContent(node) });
    node.properties['data-level'] = `H${node.tagName[1]}`;
  });
  if (config.enableEncryptedBlock) await encryptBlocks(tree);
  return { html: toHtml(tree), headings };
}
