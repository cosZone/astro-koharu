/**
 * Infographic Diagram Enhancer
 * Renders @antv/infographic diagrams and adds Mac-style toolbar with copy and fullscreen functionality
 */

import { copyToClipboard, createCodeViewIcon, createDiagramViewIcon } from './code-block-enhancer';

// Font registration flag
let fontRegistered = false;

// Track active observers and timeouts for cleanup
let activeObservers: MutationObserver[] = [];
let activeTimeouts: ReturnType<typeof setTimeout>[] = [];
let themeObserver: MutationObserver | null = null;

interface InfographicEntry {
  instance: unknown;
  source: string;
  container: HTMLElement;
}
const infographicInstances: Map<HTMLElement, InfographicEntry> = new Map();

/**
 * Create toolbar HTML for infographic diagram
 */
function createInfographicToolbar(): string {
  return `
    <div class="infographic-toolbar">
      <div class="infographic-dots">
        <span class="infographic-dot red"></span>
        <span class="infographic-dot yellow"></span>
        <span class="infographic-dot green"></span>
        <span class="infographic-language">infographic</span>
      </div>
      <div class="infographic-actions">
        <button
          class="infographic-button infographic-fullscreen"
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
        <button
          class="infographic-button infographic-copy"
          aria-label="Copy source"
          title="Copy source"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>
        <button
          class="infographic-button infographic-view-source"
          aria-label="View source code"
          title="View source code"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
            <path d="m7 8l-4 4l4 4m10-8l4 4l-4 4M14 4l-4 16"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

/**
 * Create checkmark SVG for copy success state
 */
function createCheckmarkSvg(): string {
  const id = `checkmark-infographic-${Date.now()}`;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
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
 * Check if element is already wrapped
 */
function isAlreadyWrapped(element: HTMLElement): boolean {
  return element.parentElement?.classList.contains('infographic-wrapper') ?? false;
}

/**
 * Check if current theme is dark mode
 */
function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Register custom font for infographic
 */
async function ensureFontRegistered(): Promise<void> {
  if (fontRegistered) return;

  const { registerFont } = await import('@antv/infographic');

  registerFont({
    fontFamily: '寒蝉全圆体',
    name: '寒蝉全圆体',
    baseUrl: '/fonts/ChillRoundFRegular/result.css',
    fontWeight: { regular: 'regular' },
  });

  registerFont({
    fontFamily: '寒蝉全圆体',
    name: '寒蝉全圆体 Bold',
    baseUrl: '/fonts/ChillRoundFBold/result.css',
    fontWeight: { bold: 'bold' },
  });

  fontRegistered = true;
}

/**
 * Dynamically import and render infographic
 */
async function renderInfographic(container: HTMLElement, source: string): Promise<unknown> {
  const { Infographic } = await import('@antv/infographic');

  // Register custom font before rendering
  await ensureFontRegistered();

  // Use built-in themes: 'default', 'dark', 'hand-drawn'
  const theme = isDarkMode() ? 'dark' : 'default';

  const infographic = new Infographic({
    container,
    width: '100%',
    height: 'auto',
    theme,
  });

  // Append font-family configuration to source
  const fontConfig = `
theme
  base
    text
      font-family 寒蝉全圆体
  item
    label
      font-family 寒蝉全圆体
`;
  const sourceWithFont = `${source}\n${fontConfig}`;

  infographic.render(sourceWithFont);
  return infographic;
}

/**
 * Enhance a single infographic code block
 */
async function enhanceInfographicBlock(preElement: HTMLElement): Promise<void> {
  // Skip if already enhanced or wrapped
  if (preElement.dataset.infographicEnhanced === 'true' || isAlreadyWrapped(preElement)) {
    return;
  }

  // Get source code from the code element
  const codeElement = preElement.querySelector('code');
  const source = codeElement?.textContent?.trim() || preElement.textContent?.trim() || '';

  if (!source) {
    return;
  }

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'infographic-wrapper';

  // Wrap the pre element
  preElement.parentNode?.insertBefore(wrapper, preElement);
  wrapper.appendChild(preElement);

  // Insert toolbar before pre
  preElement.insertAdjacentHTML('beforebegin', createInfographicToolbar());

  // Create container for rendered infographic
  const infographicContainer = document.createElement('div');
  infographicContainer.className = 'infographic-container';
  wrapper.appendChild(infographicContainer);

  // Hide the original pre element (source code)
  preElement.style.display = 'none';

  // Mark as enhanced
  preElement.dataset.infographicEnhanced = 'true';

  // Render the infographic
  try {
    const instance = await renderInfographic(infographicContainer, source);
    infographicInstances.set(preElement, { instance, source, container: infographicContainer });
  } catch (error) {
    console.error('Failed to render infographic:', error);
    // Show source code on error
    preElement.style.display = '';
    infographicContainer.remove();
  }

  // Bind copy button
  const copyBtn = wrapper.querySelector('.infographic-copy');
  if (copyBtn) {
    const originalSvg = copyBtn.innerHTML;
    copyBtn.addEventListener('click', async () => {
      const success = await copyToClipboard(source);
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

  // Bind fullscreen button
  const fullscreenBtn = wrapper.querySelector('.infographic-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      // Get the rendered SVG content
      const svg = infographicContainer.innerHTML;

      // Dispatch custom event with infographic data
      window.dispatchEvent(
        new CustomEvent('open-infographic-fullscreen', {
          detail: { svg, source },
        }),
      );
    });
  }

  // Bind view source toggle button
  const viewSourceBtn = wrapper.querySelector('.infographic-view-source');
  if (viewSourceBtn) {
    const codeIcon = createCodeViewIcon();
    const diagramIcon = createDiagramViewIcon();

    // Check if source code exists
    if (!source) {
      (viewSourceBtn as HTMLButtonElement).disabled = true;
    }

    viewSourceBtn.addEventListener('click', () => {
      const currentMode = wrapper.getAttribute('data-view-mode') || 'rendered';

      if (currentMode === 'rendered') {
        // Switch to source view
        preElement.style.display = '';
        infographicContainer.style.display = 'none';
        wrapper.setAttribute('data-view-mode', 'source');
        viewSourceBtn.innerHTML = diagramIcon;
        viewSourceBtn.setAttribute('aria-label', 'View rendered diagram');
        viewSourceBtn.setAttribute('title', 'View rendered diagram');
      } else {
        // Switch to rendered view
        preElement.style.display = 'none';
        infographicContainer.style.display = '';
        wrapper.setAttribute('data-view-mode', 'rendered');
        viewSourceBtn.innerHTML = codeIcon;
        viewSourceBtn.setAttribute('aria-label', 'View source code');
        viewSourceBtn.setAttribute('title', 'View source code');
      }
    });
  }
}

/**
 * Clean up all active observers, timeouts, and instances
 * @param destroyInstances - If true, also destroy infographic instances (used on page transitions)
 */
function cleanup(destroyInstances = false): void {
  // Disconnect all observers
  for (const observer of activeObservers) {
    observer.disconnect();
  }
  activeObservers = [];

  // Clean up theme observer
  if (themeObserver) {
    themeObserver.disconnect();
    themeObserver = null;
  }

  // Clear all timeouts
  for (const timeout of activeTimeouts) {
    clearTimeout(timeout);
  }
  activeTimeouts = [];

  // Only destroy instances on page transitions, not on re-init
  if (destroyInstances) {
    for (const [element, entry] of infographicInstances) {
      try {
        if (entry.instance && typeof (entry.instance as { destroy?: () => void }).destroy === 'function') {
          (entry.instance as { destroy: () => void }).destroy();
        }
        // Remove wrapper and restore original pre element
        const wrapper = element.closest('.infographic-wrapper');
        if (wrapper) {
          wrapper.replaceWith(element);
        }
      } catch {
        // Ignore errors during cleanup
      }
      element.dataset.infographicEnhanced = 'false';
      element.style.display = '';
    }
    infographicInstances.clear();
  }
}

/**
 * Check if a code block contains infographic syntax
 * Infographic syntax starts with "infographic " followed by template name
 */
function isInfographicBlock(preElement: HTMLElement): boolean {
  const codeElement = preElement.querySelector('code');
  const content = codeElement?.textContent?.trim() || preElement.textContent?.trim() || '';
  return content.startsWith('infographic ');
}

/**
 * Find and enhance all infographic code blocks
 */
function enhanceAllInfographics(): void {
  // Find all pre elements and check if they contain infographic syntax
  const allPreElements = document.querySelectorAll('pre');

  allPreElements.forEach((element) => {
    const preElement = element as HTMLElement;

    // Skip if already enhanced or wrapped
    if (preElement.dataset.infographicEnhanced === 'true' || isAlreadyWrapped(preElement)) {
      return;
    }

    // Check if this is an infographic block by content
    if (!isInfographicBlock(preElement)) {
      return;
    }

    // Enhance the block
    enhanceInfographicBlock(preElement);
  });
}

/**
 * Re-render all infographics with current theme
 * Called when theme changes
 */
async function reRenderAllInfographics(): Promise<void> {
  const { Infographic } = await import('@antv/infographic');

  // Ensure font is registered
  await ensureFontRegistered();

  const theme = isDarkMode() ? 'dark' : 'default';

  // Font configuration to append
  const fontConfig = `
theme
  base
    text
      font-family 寒蝉全圆体
  item
    label
      font-family 寒蝉全圆体
`;

  for (const [, entry] of infographicInstances) {
    try {
      // Destroy old instance
      if (entry.instance && typeof (entry.instance as { destroy?: () => void }).destroy === 'function') {
        (entry.instance as { destroy: () => void }).destroy();
      }

      // Clear container
      entry.container.innerHTML = '';

      // Create new instance with updated theme
      const newInstance = new Infographic({
        container: entry.container,
        width: '100%',
        height: 'auto',
        theme,
      });

      const sourceWithFont = `${entry.source}\n${fontConfig}`;
      newInstance.render(sourceWithFont);
      entry.instance = newInstance;
    } catch (error) {
      console.error('Failed to re-render infographic:', error);
    }
  }
}

/**
 * Setup theme observer to re-render infographics on theme change
 */
function setupThemeObserver(): void {
  if (themeObserver) {
    themeObserver.disconnect();
  }

  themeObserver = new MutationObserver(() => {
    // Only re-render if we have instances
    if (infographicInstances.size > 0) {
      reRenderAllInfographics();
    }
  });

  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  activeObservers.push(themeObserver);
}

/**
 * Initialize infographic enhancer
 */
export function initInfographicEnhancer(): void {
  // Clean up any previous observers/timeouts/instances
  cleanup();

  // Setup theme observer for live theme switching
  setupThemeObserver();

  // Small delay to let the DOM settle
  const timeout = setTimeout(enhanceAllInfographics, 100);
  activeTimeouts.push(timeout);
}

// Clean up on page transitions
if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', () => cleanup(true));
}
