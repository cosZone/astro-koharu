/**
 * Mermaid diagram toolbar rendered via portal.
 * Waits for astro-mermaid to process the diagram (data-processed attribute),
 * then renders Mac-style toolbar with fullscreen, copy, and view-source toggle.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ViewSourceToggle } from '@components/markdown/shared/ViewSourceToggle';
import { Icon } from '@iconify/react';
import { openModal } from '@store/modal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface MermaidToolbarProps {
  preElement: HTMLElement;
}

export function MermaidToolbar({ preElement }: MermaidToolbarProps) {
  const [isProcessed, setIsProcessed] = useState(preElement.getAttribute('data-processed') === 'true');
  const [isSourceView, setIsSourceView] = useState(false);
  const renderedSvgRef = useRef<string | null>(null);
  const sourceContainerRef = useRef<HTMLDivElement | null>(null);

  const source = useMemo(() => preElement.getAttribute('data-diagram') || preElement.textContent || '', [preElement]);

  // Wait for mermaid to process the diagram
  useEffect(() => {
    if (isProcessed) return;

    const observer = new MutationObserver(() => {
      if (preElement.getAttribute('data-processed') === 'true') {
        setIsProcessed(true);
        observer.disconnect();
      }
    });

    observer.observe(preElement, { attributes: true, attributeFilter: ['data-processed'] });

    const timeout = setTimeout(() => {
      setIsProcessed(true);
      observer.disconnect();
    }, 5000);

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, [preElement, isProcessed]);

  const handleFullscreen = useCallback(() => {
    openModal('diagramFullscreen', { diagramType: 'mermaid', svg: preElement.innerHTML, source });
  }, [preElement, source]);

  // NOTE: Direct innerHTML manipulation on preElement is safe here because the pre element
  // lives outside the React tree (in .custom-content DOM). React only manages the toolbar
  // rendered via portal into the mount point, not the pre element itself.
  const handleToggleSource = useCallback(() => {
    if (!isSourceView) {
      // Save rendered SVG on first toggle
      if (!renderedSvgRef.current) {
        renderedSvgRef.current = preElement.innerHTML;
        const container = document.createElement('div');
        container.className = 'mermaid-source';
        const codeEl = document.createElement('code');
        codeEl.className = 'language-mermaid';
        codeEl.textContent = source;
        container.appendChild(codeEl);
        sourceContainerRef.current = container;
      }
      // Switch to source view
      preElement.innerHTML = '';
      if (sourceContainerRef.current) {
        preElement.appendChild(sourceContainerRef.current);
      }
    } else {
      // Switch back to rendered view
      if (renderedSvgRef.current) {
        preElement.innerHTML = renderedSvgRef.current;
      }
    }
    setIsSourceView(!isSourceView);
  }, [isSourceView, preElement, source]);

  if (!isProcessed) return null;

  return (
    <MacToolbar language="mermaid" onFullscreen={handleFullscreen}>
      <button
        type="button"
        onClick={handleFullscreen}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
        aria-label="全屏查看"
        title="全屏查看"
      >
        <Icon icon="ri:fullscreen-line" className="size-4" />
      </button>
      <CopyButton text={source} />
      <ViewSourceToggle isSourceView={isSourceView} onToggle={handleToggleSource} disabled={!source} />
    </MacToolbar>
  );
}
