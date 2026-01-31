/**
 * Preview Content Enhancer
 *
 * Enhances rendered markdown with:
 * - Code block toolbars (Mac style)
 * - Mermaid diagram rendering
 * - Infographic chart rendering
 * - Image lightbox
 */

import type mermaidType from 'mermaid';

// Mermaid instance (lazy loaded)
let mermaidInstance: typeof mermaidType | null = null;
let mermaidIdCounter = 0;

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, '');
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create Mac-style toolbar HTML for code blocks
 */
function createCodeToolbar(language: string): string {
  const safeLanguage = escapeHtml(language);

  return `
    <div class="preview-code-toolbar">
      <div class="preview-code-dots">
        <span class="preview-code-dot red"></span>
        <span class="preview-code-dot yellow"></span>
        <span class="preview-code-dot green"></span>
        <span class="preview-code-language">${safeLanguage}</span>
      </div>
      <div class="preview-code-actions">
        <button
          class="preview-code-button preview-code-copy"
          aria-label="Copy code"
          title="Copy code"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Create checkmark SVG for copy success animation
 */
function createCheckmarkSvg(): string {
  const id = `checkmark-preview-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
      <mask id="${id}">
        <g fill="none" stroke="#fff" stroke-dasharray="24" stroke-dashoffset="24" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
          <path d="M2 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="24;0"/>
          </path>
          <path stroke="#000" stroke-width="6" d="M7.5 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0"/>
          </path>
          <path d="M7.5 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0"/>
          </path>
        </g>
      </mask>
      <rect width="24" height="24" fill="currentColor" mask="url(#${id})"/>
    </svg>`;
}

/**
 * Extract code content from a code block wrapper
 */
function extractCodeContent(wrapper: HTMLElement): string {
  const codeEl = wrapper.querySelector('code');
  return codeEl?.textContent || '';
}

/**
 * Extract language from code block wrapper
 */
function extractLanguage(wrapper: HTMLElement): string {
  return wrapper.getAttribute('data-language') || 'text';
}

/**
 * Enhance code blocks with Mac-style toolbars
 */
function enhanceCodeBlocks(container: HTMLElement): void {
  const wrappers = container.querySelectorAll('.code-block-wrapper');

  wrappers.forEach((wrapper) => {
    const el = wrapper as HTMLElement;

    // Skip if already enhanced
    if (el.dataset.enhanced === 'true') return;

    const language = extractLanguage(el);
    const code = extractCodeContent(el);

    // Skip mermaid and infographic blocks (handled separately)
    if (language === 'mermaid' || code.trim().startsWith('infographic ')) {
      return;
    }

    // Insert toolbar at the beginning
    el.insertAdjacentHTML('afterbegin', createCodeToolbar(language));
    el.dataset.enhanced = 'true';

    // Bind copy button
    const copyBtn = el.querySelector('.preview-code-copy');
    if (copyBtn) {
      const originalSvg = copyBtn.innerHTML;

      copyBtn.addEventListener('click', async () => {
        const success = await copyToClipboard(code);
        if (success) {
          copyBtn.classList.add('copied');
          copyBtn.innerHTML = createCheckmarkSvg();
          setTimeout(() => {
            copyBtn.classList.remove('copied');
            copyBtn.innerHTML = originalSvg;
          }, 2000);
        }
      });
    }
  });
}

/**
 * Get or initialize mermaid
 */
async function getMermaid(): Promise<typeof mermaidType> {
  if (!mermaidInstance) {
    const mod = await import('mermaid');
    mermaidInstance = mod.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
    });
  }
  return mermaidInstance;
}

/**
 * Create mermaid toolbar HTML
 */
function createMermaidToolbar(): string {
  return `
    <div class="preview-mermaid-toolbar">
      <div class="preview-code-dots">
        <span class="preview-code-dot red"></span>
        <span class="preview-code-dot yellow"></span>
        <span class="preview-code-dot green"></span>
        <span class="preview-code-language">mermaid</span>
      </div>
      <div class="preview-code-actions">
        <button
          class="preview-code-button preview-code-copy"
          aria-label="Copy source"
          title="Copy source"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Render mermaid diagrams
 */
async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  const wrappers = container.querySelectorAll('.code-block-wrapper');

  for (const wrapper of wrappers) {
    const el = wrapper as HTMLElement;
    const language = extractLanguage(el);

    if (language !== 'mermaid') continue;
    if (el.dataset.mermaidEnhanced === 'true') continue;

    const code = extractCodeContent(el);
    if (!code.trim()) continue;

    try {
      const mermaid = await getMermaid();
      const id = `mermaid-preview-${++mermaidIdCounter}`;

      const { svg } = await mermaid.render(id, code);

      // Create new structure
      const mermaidWrapper = document.createElement('div');
      mermaidWrapper.className = 'preview-mermaid-wrapper';
      mermaidWrapper.innerHTML = createMermaidToolbar();

      const diagramContainer = document.createElement('div');
      diagramContainer.className = 'preview-mermaid-diagram';
      diagramContainer.innerHTML = svg;
      mermaidWrapper.appendChild(diagramContainer);

      // Replace original wrapper
      el.replaceWith(mermaidWrapper);

      // Bind copy button
      const copyBtn = mermaidWrapper.querySelector('.preview-code-copy');
      if (copyBtn) {
        const originalSvg = copyBtn.innerHTML;
        copyBtn.addEventListener('click', async () => {
          const success = await copyToClipboard(code);
          if (success) {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = createCheckmarkSvg();
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = originalSvg;
            }, 2000);
          }
        });
      }
    } catch (error) {
      console.error('Failed to render mermaid:', error);
      // Keep original code block on error
      el.dataset.mermaidEnhanced = 'true';
    }
  }
}

/**
 * Create infographic toolbar HTML
 */
function createInfographicToolbar(): string {
  return `
    <div class="preview-infographic-toolbar">
      <div class="preview-code-dots">
        <span class="preview-code-dot red"></span>
        <span class="preview-code-dot yellow"></span>
        <span class="preview-code-dot green"></span>
        <span class="preview-code-language">infographic</span>
      </div>
      <div class="preview-code-actions">
        <button
          class="preview-code-button preview-code-copy"
          aria-label="Copy source"
          title="Copy source"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Render infographic charts
 */
async function renderInfographics(container: HTMLElement): Promise<void> {
  const wrappers = container.querySelectorAll('.code-block-wrapper');

  for (const wrapper of wrappers) {
    const el = wrapper as HTMLElement;
    const code = extractCodeContent(el);

    if (!code.trim().startsWith('infographic ')) continue;
    if (el.dataset.infographicEnhanced === 'true') continue;

    try {
      const { Infographic } = await import('@antv/infographic');

      // Create new structure
      const infographicWrapper = document.createElement('div');
      infographicWrapper.className = 'preview-infographic-wrapper';
      infographicWrapper.innerHTML = createInfographicToolbar();

      const chartContainer = document.createElement('div');
      chartContainer.className = 'preview-infographic-chart';
      infographicWrapper.appendChild(chartContainer);

      // Replace original wrapper
      el.replaceWith(infographicWrapper);

      // Render infographic
      const infographic = new Infographic({
        container: chartContainer,
        width: '100%',
        height: 'auto',
        theme: 'dark',
      });

      infographic.render(code);

      // Bind copy button
      const copyBtn = infographicWrapper.querySelector('.preview-code-copy');
      if (copyBtn) {
        const originalSvg = copyBtn.innerHTML;
        copyBtn.addEventListener('click', async () => {
          const success = await copyToClipboard(code);
          if (success) {
            copyBtn.classList.add('copied');
            copyBtn.innerHTML = createCheckmarkSvg();
            setTimeout(() => {
              copyBtn.classList.remove('copied');
              copyBtn.innerHTML = originalSvg;
            }, 2000);
          }
        });
      }
    } catch (error) {
      console.error('Failed to render infographic:', error);
      el.dataset.infographicEnhanced = 'true';
    }
  }
}

/**
 * Enhance images with lightbox
 */
function enhanceImages(container: HTMLElement, onImageClick?: (src: string) => void): void {
  const images = container.querySelectorAll('img');

  images.forEach((img) => {
    const el = img as HTMLImageElement;

    // Skip if already enhanced
    if (el.dataset.lightboxEnhanced === 'true') return;

    el.dataset.lightboxEnhanced = 'true';
    el.style.cursor = 'zoom-in';

    el.addEventListener('click', () => {
      if (onImageClick && el.src) {
        onImageClick(el.src);
      }
    });
  });
}

/**
 * Main enhancer function - enhances all preview content
 */
export async function enhancePreviewContent(
  container: HTMLElement,
  options?: {
    onImageClick?: (src: string) => void;
  },
): Promise<void> {
  // 1. Enhance code blocks with toolbars
  enhanceCodeBlocks(container);

  // 2. Render mermaid diagrams
  await renderMermaidDiagrams(container);

  // 3. Render infographic charts
  await renderInfographics(container);

  // 4. Enhance images with lightbox
  enhanceImages(container, options?.onImageClick);
}
