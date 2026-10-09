import type { AstroIntegration } from 'astro';
import mermaid, { type AstroMermaidOptions } from 'astro-mermaid';

const visibleSelector = 'pre.mermaid[data-mermaid-visible]';

// Keep upstream's configuration, errors and theme support; defer rendering to nearby diagrams.
export function lazyMermaid(options: AstroMermaidOptions): AstroIntegration {
  const integration = mermaid(options);
  const setup = integration.hooks['astro:config:setup'];
  return {
    ...integration,
    hooks: {
      ...integration.hooks,
      'astro:config:setup': async (context) => {
        await setup?.({
          ...context,
          injectScript: (stage, content) => {
            if (!content.includes('async function initMermaid()')) {
              context.injectScript(stage, content);
              return;
            }
            const renderMarker = 'const { svg } = await mermaid.render(id, diagramDefinition);';
            if (!content.includes(renderMarker) || !content.includes("document.querySelectorAll('pre.mermaid')")) {
              throw new Error('astro-mermaid changed its rendering contract; update lazyMermaid before building.');
            }
            const script = content
              .replaceAll("document.querySelectorAll('pre.mermaid')", `document.querySelectorAll('${visibleSelector}')`)
              .replace('async function initMermaid() {', 'async function renderVisibleMermaid(renderVersion) {')
              .replace(
                '// Reset processed state and re-render',
                'mermaidRenderVersion++;\n        // Reset processed state and re-render',
              )
              .replace(
                "if (diagram.hasAttribute('data-processed')) continue;",
                "if (!diagram.isConnected || renderVersion !== mermaidRenderVersion || diagram.hasAttribute('data-processed')) continue;",
              )
              .replace(
                renderMarker,
                `${renderMarker}\n      if (!diagram.isConnected || renderVersion !== mermaidRenderVersion) continue;`,
              )
              .replace(
                "logError('Mermaid rendering error for diagram:', id, error);",
                "if (!diagram.isConnected || renderVersion !== mermaidRenderVersion) continue;\n      logError('Mermaid rendering error for diagram:', id, error);",
              );
            context.injectScript(stage, `${script}\n${visibilityScript}`);
          },
        });
      },
    },
  };
}

const visibilityScript = `
let mermaidRenderVersion = 0;
let mermaidRendering = false;
let mermaidRenderRequested = false;
let mermaidVisibilityObserver;

async function initMermaid() {
  mermaidRenderRequested = true;
  if (mermaidRendering) return;
  mermaidRendering = true;
  try {
    while (mermaidRenderRequested) {
      mermaidRenderRequested = false;
      await renderVisibleMermaid(mermaidRenderVersion);
    }
  } catch (error) {
    logError('Failed to initialize nearby diagrams:', error);
  } finally {
    mermaidRendering = false;
  }
}

function observeMermaidVisibility() {
  mermaidVisibilityObserver?.disconnect();
  const diagrams = document.querySelectorAll('pre.mermaid');
  if (typeof IntersectionObserver === 'undefined') {
    diagrams.forEach(diagram => diagram.setAttribute('data-mermaid-visible', 'true'));
    initMermaid();
    return;
  }
  mermaidVisibilityObserver = new IntersectionObserver(entries => {
    let visible = false;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.setAttribute('data-mermaid-visible', 'true');
      mermaidVisibilityObserver.unobserve(entry.target);
      visible = true;
    }
    if (visible) initMermaid();
  }, { rootMargin: '800px' });
  diagrams.forEach(diagram => mermaidVisibilityObserver.observe(diagram));
}

document.addEventListener('astro:before-swap', () => {
  mermaidRenderVersion++;
  mermaidVisibilityObserver?.disconnect();
});
document.addEventListener('astro:after-swap', observeMermaidVisibility);
if (document.readyState !== 'loading') observeMermaidVisibility();
else document.addEventListener('DOMContentLoaded', observeMermaidVisibility, { once: true });
`;
