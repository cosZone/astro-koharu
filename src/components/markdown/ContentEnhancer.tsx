/**
 * ContentEnhancer - Portal-based React orchestrator for markdown content toolbars.
 *
 * Replaces vanilla DOM enhancers (code-block-enhancer, mermaid-enhancer, infographic-enhancer)
 * with a single React component that scans the DOM and renders toolbars via createPortal.
 *
 * Strategy: One React root → many portals (avoids creating separate React roots per block).
 * Pattern: Follows EmbedHydrator.tsx approach.
 */

import { extractLanguage, isInfographicBlock, wrapElement } from '@lib/content-enhancer-utils';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CodeBlockToolbar } from './CodeBlockToolbar';
import { InfographicToolbar } from './InfographicToolbar';
import { MermaidToolbar } from './MermaidToolbar';

interface ToolbarEntry {
  id: string;
  type: 'code' | 'mermaid' | 'infographic';
  mountPoint: HTMLElement;
  preElement: HTMLElement;
}

interface ContentEnhancerProps {
  enableCopy?: boolean;
  enableFullscreen?: boolean;
}

export default function ContentEnhancer({ enableCopy = true, enableFullscreen = true }: ContentEnhancerProps) {
  const [entries, setEntries] = useState<ToolbarEntry[]>([]);

  useEffect(() => {
    function scan() {
      const container = document.querySelector('.custom-content');
      if (!container) return;

      const preElements = container.querySelectorAll<HTMLElement>('pre');
      const newEntries: ToolbarEntry[] = [];

      preElements.forEach((pre, index) => {
        // Skip already enhanced elements
        if (pre.dataset.reactEnhanced === 'true') return;

        const language = extractLanguage(pre);

        if (language === 'mermaid') {
          const wrapper = wrapElement(pre, 'mermaid-wrapper');
          const mount = wrapper.querySelector('.mermaid-wrapper-toolbar-mount') as HTMLElement;
          pre.dataset.reactEnhanced = 'true';
          newEntries.push({ id: `mermaid-${index}`, type: 'mermaid', mountPoint: mount, preElement: pre });
        } else if (isInfographicBlock(pre)) {
          const wrapper = wrapElement(pre, 'infographic-wrapper');
          const mount = wrapper.querySelector('.infographic-wrapper-toolbar-mount') as HTMLElement;
          pre.dataset.reactEnhanced = 'true';
          newEntries.push({ id: `infographic-${index}`, type: 'infographic', mountPoint: mount, preElement: pre });
        } else {
          const wrapper = wrapElement(pre, 'code-block-wrapper');
          const mount = wrapper.querySelector('.code-block-wrapper-toolbar-mount') as HTMLElement;
          pre.dataset.reactEnhanced = 'true';
          newEntries.push({ id: `code-${index}`, type: 'code', mountPoint: mount, preElement: pre });
        }
      });

      if (newEntries.length > 0) {
        setEntries((prev) => [...prev, ...newEntries]);
      }
    }

    scan();

    // Re-scan on Astro page transitions (skip first fire which overlaps with initial scan)
    let skipFirst = true;
    const handlePageLoad = () => {
      if (skipFirst) {
        skipFirst = false;
        return;
      }
      // Defer scan to let DOM update, then replace entries atomically to avoid flicker
      requestAnimationFrame(() => {
        setEntries([]);
        scan();
      });
    };

    document.addEventListener('astro:page-load', handlePageLoad);
    return () => document.removeEventListener('astro:page-load', handlePageLoad);
  }, []);

  return (
    <>
      {entries.map((entry) => {
        switch (entry.type) {
          case 'code':
            return createPortal(
              <CodeBlockToolbar
                key={entry.id}
                preElement={entry.preElement}
                enableCopy={enableCopy}
                enableFullscreen={enableFullscreen}
              />,
              entry.mountPoint,
            );
          case 'mermaid':
            return createPortal(<MermaidToolbar key={entry.id} preElement={entry.preElement} />, entry.mountPoint);
          case 'infographic':
            return createPortal(<InfographicToolbar key={entry.id} preElement={entry.preElement} />, entry.mountPoint);
          default:
            return null;
        }
      })}
    </>
  );
}
