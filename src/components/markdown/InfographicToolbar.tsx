/**
 * Infographic diagram toolbar rendered via portal.
 * Dynamically imports @antv/infographic, renders the diagram, and responds to theme changes.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ViewSourceToggle } from '@components/markdown/shared/ViewSourceToggle';
import { useIsDarkTheme } from '@hooks/useIsDarkTheme';
import { Icon } from '@iconify/react';
import { openModal } from '@store/modal';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const FONT_CONFIG = `
theme
  base
    text
      font-family 寒蝉全圆体
  item
    label
      font-family 寒蝉全圆体
`;

interface InfographicToolbarProps {
  preElement: HTMLElement;
}

export function InfographicToolbar({ preElement }: InfographicToolbarProps) {
  const isDark = useIsDarkTheme();
  const [isSourceView, setIsSourceView] = useState(false);
  const instanceRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
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
    if (!wrapper || containerRef.current) return;

    const container = document.createElement('div');
    container.className = 'infographic-container';
    wrapper.appendChild(container);
    containerRef.current = container;

    // Hide the original pre element
    preElement.style.display = 'none';

    return () => {
      destroyInstance();
      container.remove();
      preElement.style.display = '';
    };
  }, [preElement, destroyInstance]);

  // Render/re-render when theme changes
  useEffect(() => {
    if (!containerRef.current || !source) return;

    const container = containerRef.current;
    const currentRender = ++renderCountRef.current;

    async function render() {
      try {
        const { Infographic } = await import('@antv/infographic');

        // Skip if a newer render was requested
        if (currentRender !== renderCountRef.current) return;

        destroyInstance();
        container.innerHTML = '';

        const infographic = new Infographic({
          container,
          width: '100%',
          height: 'auto',
          theme: isDark ? 'dark' : 'default',
        });

        infographic.render(`${source}\n${FONT_CONFIG}`);
        instanceRef.current = infographic;
      } catch (error) {
        console.error('Failed to render infographic:', error);
        // Show source code on error
        preElement.style.display = '';
        container.style.display = 'none';
      }
    }

    render();
  }, [isDark, source, preElement, destroyInstance]);

  const handleFullscreen = useCallback(() => {
    openModal('diagramFullscreen', { diagramType: 'infographic', svg: containerRef.current?.innerHTML || '', source });
  }, [source]);

  const handleToggleSource = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isSourceView) {
      preElement.style.display = '';
      container.style.display = 'none';
    } else {
      preElement.style.display = 'none';
      container.style.display = '';
    }
    setIsSourceView(!isSourceView);
  }, [isSourceView, preElement]);

  return (
    <MacToolbar language="infographic" onFullscreen={handleFullscreen}>
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
