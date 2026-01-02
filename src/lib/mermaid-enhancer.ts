/**
 * Mermaid Diagram Enhancer
 * Adds Mac-style toolbar to mermaid diagrams with copy and fullscreen functionality
 */

import { copyToClipboard, createCodeViewIcon, createDiagramViewIcon } from './code-block-enhancer';

// Track active observers and timeouts for cleanup
let activeObservers: MutationObserver[] = [];
let activeTimeouts: ReturnType<typeof setTimeout>[] = [];
let mermaidRenderedHandler: (() => void) | null = null;

/**
 * Create toolbar HTML for mermaid diagram
 */
function createMermaidToolbar(): string {
  return `
    <div class="mermaid-toolbar">
      <div class="mermaid-dots">
        <span class="mermaid-dot red"></span>
        <span class="mermaid-dot yellow"></span>
        <span class="mermaid-dot green"></span>
        <span class="mermaid-language">mermaid</span>
      </div>
      <div class="mermaid-actions">
        <button
          class="mermaid-button mermaid-fullscreen"
          aria-label="Fullscreen"
          title="Fullscreen"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        </button>
        <button
          class="mermaid-button mermaid-copy"
          aria-label="Copy source"
          title="Copy source"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 448 512" fill="currentColor">
            <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"/>
          </svg>
        </button>
        <button
          class="mermaid-button mermaid-view-source"
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
  const id = `checkmark-mermaid-${Date.now()}`;
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
 * Check if mermaid element is already wrapped
 */
function isAlreadyWrapped(mermaidElement: HTMLElement): boolean {
  return mermaidElement.parentElement?.classList.contains('mermaid-wrapper') ?? false;
}

/**
 * Enhance a single mermaid diagram with toolbar
 */
function enhanceMermaidDiagram(mermaidElement: HTMLElement): void {
  // Skip if already enhanced or wrapped
  if (mermaidElement.dataset.toolbarEnhanced === 'true' || isAlreadyWrapped(mermaidElement)) {
    return;
  }

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = 'mermaid-wrapper';

  // Wrap the mermaid element
  mermaidElement.parentNode?.insertBefore(wrapper, mermaidElement);
  wrapper.appendChild(mermaidElement);

  // Insert toolbar before mermaid
  mermaidElement.insertAdjacentHTML('beforebegin', createMermaidToolbar());

  // Mark as enhanced
  mermaidElement.dataset.toolbarEnhanced = 'true';

  // Get source code from data-diagram attribute (set by astro-mermaid)
  const source = mermaidElement.getAttribute('data-diagram') || mermaidElement.textContent || '';

  // Bind copy button
  const copyBtn = wrapper.querySelector('.mermaid-copy');
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
  const fullscreenBtn = wrapper.querySelector('.mermaid-fullscreen');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      // Get the rendered SVG (innerHTML after astro-mermaid processes it)
      const svg = mermaidElement.innerHTML;

      // Dispatch custom event with mermaid data
      window.dispatchEvent(
        new CustomEvent('open-mermaid-fullscreen', {
          detail: { svg, source },
        }),
      );
    });
  }

  // Bind view source toggle button
  const viewSourceBtn = wrapper.querySelector('.mermaid-view-source');
  if (viewSourceBtn) {
    const codeIcon = createCodeViewIcon();
    const diagramIcon = createDiagramViewIcon();

    // Check if source code exists
    if (!source) {
      (viewSourceBtn as HTMLButtonElement).disabled = true;
      return;
    }

    // Cache for rendered SVG and source container element
    let renderedSvg: string | null = null;
    let sourceContainer: HTMLDivElement | null = null;

    viewSourceBtn.addEventListener('click', () => {
      const currentMode = wrapper.getAttribute('data-view-mode') || 'rendered';

      if (currentMode === 'rendered') {
        // First toggle: save rendered state and create source view
        if (!renderedSvg) {
          renderedSvg = mermaidElement.innerHTML;

          // Create source container with code element (avoid nested <pre>)
          sourceContainer = document.createElement('div');
          sourceContainer.className = 'mermaid-source';

          const codeElement = document.createElement('code');
          codeElement.className = 'language-mermaid';
          codeElement.textContent = source;
          sourceContainer.appendChild(codeElement);
        }

        // Switch to source view
        mermaidElement.innerHTML = '';
        if (sourceContainer) {
          mermaidElement.appendChild(sourceContainer);
        }
        wrapper.setAttribute('data-view-mode', 'source');
        viewSourceBtn.innerHTML = diagramIcon;
        viewSourceBtn.setAttribute('aria-label', 'View rendered diagram');
        viewSourceBtn.setAttribute('title', 'View rendered diagram');
      } else {
        // Switch back to rendered view
        if (renderedSvg) {
          mermaidElement.innerHTML = renderedSvg;
        }
        wrapper.setAttribute('data-view-mode', 'rendered');
        viewSourceBtn.innerHTML = codeIcon;
        viewSourceBtn.setAttribute('aria-label', 'View source code');
        viewSourceBtn.setAttribute('title', 'View source code');
      }
    });
  }
}

/**
 * Clean up all active observers and timeouts
 */
function cleanup(): void {
  // Disconnect all observers
  for (const observer of activeObservers) {
    observer.disconnect();
  }
  activeObservers = [];

  // Clear all timeouts
  for (const timeout of activeTimeouts) {
    clearTimeout(timeout);
  }
  activeTimeouts = [];

  // Remove mermaid:rendered listener
  if (mermaidRenderedHandler) {
    window.removeEventListener('mermaid:rendered', mermaidRenderedHandler);
    mermaidRenderedHandler = null;
  }
}

/**
 * Wait for mermaid diagrams to be processed and enhance them
 */
function waitAndEnhance(): void {
  const mermaidElements = document.querySelectorAll('pre.mermaid');

  mermaidElements.forEach((element) => {
    const mermaidElement = element as HTMLElement;

    // Skip if already enhanced or wrapped
    if (mermaidElement.dataset.toolbarEnhanced === 'true' || isAlreadyWrapped(mermaidElement)) {
      return;
    }

    // If already processed (has SVG content), enhance immediately
    if (mermaidElement.getAttribute('data-processed') === 'true') {
      enhanceMermaidDiagram(mermaidElement);
    } else {
      // Wait for astro-mermaid to process it
      const observer = new MutationObserver((mutations, obs) => {
        for (const mutation of mutations) {
          if (
            mutation.type === 'attributes' &&
            mutation.attributeName === 'data-processed' &&
            mermaidElement.getAttribute('data-processed') === 'true'
          ) {
            enhanceMermaidDiagram(mermaidElement);
            obs.disconnect();
            // Remove from active observers
            const index = activeObservers.indexOf(obs);
            if (index > -1) {
              activeObservers.splice(index, 1);
            }
            return;
          }
        }
      });

      observer.observe(mermaidElement, {
        attributes: true,
        attributeFilter: ['data-processed'],
      });

      // Track observer for cleanup
      activeObservers.push(observer);

      // Timeout fallback - if not processed in 5 seconds, enhance anyway
      const timeout = setTimeout(() => {
        observer.disconnect();
        // Remove from active observers
        const obsIndex = activeObservers.indexOf(observer);
        if (obsIndex > -1) {
          activeObservers.splice(obsIndex, 1);
        }
        // Remove from active timeouts
        const timeoutIndex = activeTimeouts.indexOf(timeout);
        if (timeoutIndex > -1) {
          activeTimeouts.splice(timeoutIndex, 1);
        }
        if (mermaidElement.dataset.toolbarEnhanced !== 'true' && !isAlreadyWrapped(mermaidElement)) {
          enhanceMermaidDiagram(mermaidElement);
        }
      }, 5000);

      // Track timeout for cleanup
      activeTimeouts.push(timeout);
    }
  });
}

/**
 * Initialize mermaid enhancer
 */
export function initMermaidEnhancer(): void {
  // Clean up any previous observers/timeouts
  cleanup();

  // Small delay to let astro-mermaid start processing
  const timeout = setTimeout(waitAndEnhance, 100);
  activeTimeouts.push(timeout);

  // Also listen for custom event from navigation fix script
  mermaidRenderedHandler = () => {
    setTimeout(waitAndEnhance, 50);
  };
  window.addEventListener('mermaid:rendered', mermaidRenderedHandler);
}

// Clean up on page transitions
if (typeof document !== 'undefined') {
  document.addEventListener('astro:before-swap', cleanup);
}
