/**
 * Infographic diagram toolbar rendered via portal.
 * Dynamically imports @antv/infographic, renders the diagram, and responds to theme changes.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { DiagramResizeHandle } from '@components/markdown/shared/DiagramResizeHandle';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ViewSourceToggle } from '@components/markdown/shared/ViewSourceToggle';
import { useDiagramScale } from '@hooks/useDiagramScale';
import { useIsDarkTheme } from '@hooks/useIsDarkTheme';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { openModal } from '@store/modal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function getFontConfig(locale: string) {
  const fontFamily = locale === 'ja' ? 'Gen Jyuu Gothic P' : '寒蝉全圆体';
  return `
theme
  base
    text
      font-family ${fontFamily}
  item
    label
      font-family ${fontFamily}
`;
}

interface InfographicToolbarProps {
  preElement: HTMLElement;
}

export function InfographicToolbar({ preElement }: InfographicToolbarProps) {
  const { t, locale } = useTranslation();
  const isDark = useIsDarkTheme();
  const [isSourceView, setIsSourceView] = useState(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { zoom, setScale, reset, measure } = useDiagramScale(container);
  const instanceRef = useRef<unknown>(null);
  const renderCountRef = useRef(0);

  const source = useMemo(() => {
    const codeEl = preElement.querySelector('code');
    return codeEl?.textContent?.trim() || preElement.textContent?.trim() || '';
  }, [preElement]);

  const destroyInstance = useCallback(() => {
    if (instanceRef.current && typeof (instanceRef.current as { destroy?: () => void }).destroy === 'function') {
      (instanceRef.current as { destroy: () => void }).destroy();
      instanceRef.current = null;
    }
  }, []);

  // Create render container on mount
  useEffect(() => {
    const wrapper = preElement.parentElement;
    if (!wrapper) return;

    const element = document.createElement('div');
    element.className = 'infographic-container';
    wrapper.appendChild(element);
    setContainer(element);

    // Hide the original pre element
    preElement.style.display = 'none';

    return () => {
      destroyInstance();
      element.remove();
      preElement.style.display = '';
    };
  }, [preElement, destroyInstance]);

  // Render/re-render when theme changes
  useEffect(() => {
    if (!container || !source) return;

    const currentRender = ++renderCountRef.current;

    const render = async () => {
      try {
        const { Infographic } = await import('@antv/infographic');

        // Skip if a newer render was requested
        if (currentRender !== renderCountRef.current) return;

        destroyInstance();
        container.innerHTML = '';

        // padding: 0 keeps the viewBox hugging the content; the library would otherwise convert its
        // padding at the render-time scale, so the natural size would drift between renders.
        const infographic = new Infographic({
          container,
          width: '100%',
          padding: 0,
          theme: isDark ? 'dark' : 'default',
        });

        infographic.render(`${source}\n${getFontConfig(locale)}`);
        instanceRef.current = infographic;

        // Let the card surface show through instead of the dark theme's flat #1F1F1F backdrop.
        const svg = container.querySelector('svg');
        svg?.style.removeProperty('background-color');
        svg?.querySelector(':scope > [data-element-type="background"]')?.remove();

        // The library fits the viewBox in a mutation-observer microtask queued by render().
        await Promise.resolve();
        if (currentRender === renderCountRef.current) measure(svg);
      } catch (error) {
        console.error('Failed to render infographic:', error);
        // Show source code on error
        preElement.style.display = '';
        container.style.display = 'none';
      }
    };

    render();
  }, [container, isDark, source, locale, preElement, destroyInstance, measure]);

  const handleFullscreen = useCallback(() => {
    openModal('diagramFullscreen', { diagramType: 'infographic', svg: container?.innerHTML || '', source });
  }, [container, source]);

  const handleToggleSource = useCallback(() => {
    if (!container) return;

    if (!isSourceView) {
      preElement.style.display = '';
      container.style.display = 'none';
    } else {
      preElement.style.display = 'none';
      container.style.display = '';
    }
    setIsSourceView(!isSourceView);
  }, [container, isSourceView, preElement]);

  return (
    <>
      <MacToolbar language="infographic" onFullscreen={handleFullscreen}>
        <button
          type="button"
          onClick={handleFullscreen}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95"
          aria-label={t('diagram.fullscreen')}
          title={t('diagram.fullscreen')}
        >
          <Icon icon="ri:fullscreen-line" className="size-4" />
        </button>
        <CopyButton text={source} />
        <ViewSourceToggle isSourceView={isSourceView} onToggle={handleToggleSource} disabled={!source} />
      </MacToolbar>
      {zoom && !isSourceView && <DiagramResizeHandle {...zoom} onScaleChange={setScale} onReset={reset} />}
    </>
  );
}
