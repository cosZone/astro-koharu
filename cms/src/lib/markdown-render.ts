/**
 * Markdown Rendering Utility
 *
 * Converts markdown to HTML with Shiki syntax highlighting.
 */

import { Marked, type MarkedExtension } from 'marked';
import { type BundledLanguage, type BundledTheme, codeToHtml, getSingletonHighlighter } from 'shiki';
import { createLinkEmbedExtension } from './marked-link-embed';

// Cache for shiki highlighter
let highlighterPromise: ReturnType<typeof getSingletonHighlighter> | null = null;

/**
 * Get or create the Shiki highlighter singleton
 */
async function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = getSingletonHighlighter({
      themes: ['github-dark'],
      langs: [
        'javascript',
        'typescript',
        'html',
        'css',
        'json',
        'markdown',
        'bash',
        'yaml',
        'tsx',
        'jsx',
        'python',
        'go',
        'rust',
        'sql',
        'mermaid',
        'text',
      ],
    });
  }
  return highlighterPromise;
}

/**
 * Highlight code using Shiki
 */
async function highlightCode(code: string, lang: string): Promise<string> {
  try {
    const highlighter = await getHighlighter();
    const loadedLangs = highlighter.getLoadedLanguages();

    // Use 'text' if language not supported
    const language = loadedLangs.includes(lang as BundledLanguage) ? lang : 'text';

    const html = await codeToHtml(code, {
      lang: language as BundledLanguage,
      theme: 'github-dark' as BundledTheme,
    });

    return html;
  } catch {
    // Fallback to plain pre/code
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Create Shiki extension for marked
 */
function createShikiExtension(): MarkedExtension {
  return {
    async: true,
    async walkTokens(token) {
      if (token.type === 'code') {
        const lang = token.lang || 'text';
        const code = token.text;

        // Store the highlighted HTML in a custom property
        const html = await highlightCode(code, lang);
        (token as unknown as { highlighted: string }).highlighted = html;
      }
    },
    renderer: {
      code({ text, lang, escaped }) {
        // Use the pre-computed highlighted HTML if available
        const token = this as unknown as { highlighted?: string };
        if (token.highlighted) {
          const language = lang || 'text';
          return `<div class="code-block-wrapper" data-language="${escapeHtml(language)}">${token.highlighted}</div>`;
        }

        // Fallback
        const language = lang || 'text';
        const escapedCode = escaped ? text : escapeHtml(text);
        return `<div class="code-block-wrapper" data-language="${escapeHtml(language)}"><pre class="shiki"><code>${escapedCode}</code></pre></div>`;
      },
    },
  };
}

/**
 * Create marked instance with Shiki extension
 */
function createMarkedInstance(): Marked {
  const marked = new Marked();
  marked.use(createShikiExtension());
  marked.use(createLinkEmbedExtension());
  marked.use({
    gfm: true,
    breaks: false,
  });
  return marked;
}

// Singleton marked instance
let markedInstance: Marked | null = null;

/**
 * Get or create the marked instance
 */
function getMarked(): Marked {
  if (!markedInstance) {
    markedInstance = createMarkedInstance();
  }
  return markedInstance;
}

/**
 * Render markdown to HTML with syntax highlighting
 */
export async function renderMarkdown(content: string): Promise<string> {
  const marked = getMarked();
  const html = await marked.parse(content);
  return html;
}
