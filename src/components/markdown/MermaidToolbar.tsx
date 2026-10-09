/**
 * Mermaid diagram toolbar rendered via portal.
 * Waits for astro-mermaid to process the diagram (data-processed attribute),
 * then renders Mac-style toolbar with fullscreen, copy, and view-source toggle,
 * plus the resize grip.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { DiagramResizeHandle } from '@components/markdown/shared/DiagramResizeHandle';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ViewSourceToggle } from '@components/markdown/shared/ViewSourceToggle';
import { useDiagramScale } from '@hooks/useDiagramScale';
import { useElementVisibility } from '@hooks/useElementVisibility';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { readMermaidSource } from '@lib/mermaid-source';
import { openModal } from '@store/modal';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface MermaidToolbarProps {
  preElement: HTMLElement;
}

type RenderState = 'loading' | 'ready' | 'error' | 'delayed';

function getRenderState(preElement: HTMLElement): RenderState {
  if (preElement.getAttribute('data-processed') !== 'true') return 'loading';
  const svg = preElement.querySelector('svg');
  return svg && !svg.querySelector('.error-icon, .error-text') ? 'ready' : 'error';
}

export function MermaidToolbar(props: MermaidToolbarProps) {
  // Match the renderer's target so the loading timeout cannot start before rendering is eligible.
  const isVisible = useElementVisibility(props.preElement);
  return isVisible ? <RenderedMermaidToolbar {...props} /> : null;
}

function RenderedMermaidToolbar({ preElement }: MermaidToolbarProps) {
  const { t } = useTranslation();
  const [renderState, setRenderState] = useState<RenderState>(() => getRenderState(preElement));
  const [isSourceView, setIsSourceView] = useState(false);
  const [source, setSource] = useState(() => readMermaidSource(preElement));
  const { zoom, setScale, reset, measure } = useDiagramScale(preElement);

  // Size the diagram whenever mermaid renders it: on first load and again after every theme switch
  useEffect(() => {
    const handleRender = () => {
      const state = getRenderState(preElement);
      setRenderState(state);
      const original = readMermaidSource(preElement);
      if (original) setSource(original);
      if (state === 'ready') measure(preElement.querySelector('svg'));
    };

    const observer = new MutationObserver(handleRender);
    observer.observe(preElement, {
      attributes: true,
      attributeFilter: ['data-processed', 'data-diagram'],
      childList: true,
    });
    // Mermaid may have rendered before hydration; a microtask keeps measure's flushSync out of the commit phase.
    queueMicrotask(handleRender);

    return () => {
      observer.disconnect();
    };
  }, [preElement, measure]);

  useEffect(() => {
    if (renderState !== 'loading') return;
    const timeout = setTimeout(() => setRenderState('delayed'), 15000);
    return () => clearTimeout(timeout);
  }, [renderState]);

  const hasError = renderState === 'error' || renderState === 'delayed';
  // Keep the SVG in place: astro-mermaid can replace it on a theme change even while source is visible.
  useEffect(() => {
    const display = preElement.style.display;
    if (isSourceView || hasError) preElement.style.display = 'none';
    return () => {
      preElement.style.display = display;
    };
  }, [preElement, isSourceView, hasError]);

  const handleFullscreen = useCallback(() => {
    const svg = preElement.querySelector('svg');
    if (renderState !== 'ready' || !svg) return;
    openModal('diagramFullscreen', { diagramType: 'mermaid', svg: svg.outerHTML, source });
  }, [preElement, renderState, source]);

  const wrapper = preElement.parentElement;

  return (
    <>
      <MacToolbar language="mermaid" onFullscreen={renderState === 'ready' ? handleFullscreen : undefined}>
        <button
          type="button"
          onClick={handleFullscreen}
          disabled={renderState !== 'ready'}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('diagram.fullscreen')}
          title={t('diagram.fullscreen')}
        >
          <Icon icon="ri:fullscreen-line" className="size-4" />
        </button>
        {source && <CopyButton text={source} />}
        <ViewSourceToggle isSourceView={isSourceView} onToggle={() => setIsSourceView((value) => !value)} disabled={!source} />
      </MacToolbar>
      {wrapper &&
        (hasError || isSourceView) &&
        createPortal(
          <div className="mermaid-fallback">
            {hasError && (
              <div className="mermaid-error">
                <output>
                  <span>{t(renderState === 'delayed' ? 'diagram.loadingSlow' : 'diagram.renderError')}</span>
                  <span className="text-muted-foreground text-sm">
                    {t(source ? 'diagram.errorHelp' : 'diagram.errorHelpNoSource')}
                  </span>
                </output>
                <button type="button" onClick={() => window.location.reload()}>
                  {t('diagram.reload')}
                </button>
              </div>
            )}
            {isSourceView && (
              <pre className="mermaid-source" data-react-enhanced="true">
                <code className="language-mermaid">{source}</code>
              </pre>
            )}
          </div>,
          wrapper,
        )}
      {zoom && renderState === 'ready' && !isSourceView && (
        <DiagramResizeHandle {...zoom} onScaleChange={setScale} onReset={reset} />
      )}
    </>
  );
}
