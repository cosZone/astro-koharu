/**
 * Unified fullscreen viewer for mermaid and infographic diagrams.
 * Replaces MermaidFullscreen.astro (482 lines) + InfographicFullscreen.astro (489 lines).
 *
 * Uses shared useZoomPan hook for zoom/pan, shared MacToolbar for the toolbar,
 * and the unified $diagramFullscreenData store.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ModalLayer } from '@components/ui/ModalLayer';
import { useRetainedValue } from '@hooks/useRetainedValue';
import { useTranslation } from '@hooks/useTranslation';
import { useZoomPan } from '@hooks/useZoomPan';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $diagramFullscreenData, closeModal, type DiagramFullscreenData } from '@store/modal';
import { useEffect } from 'react';

export default function DiagramFullscreen() {
  const liveData = useStore($diagramFullscreenData);
  const data = useRetainedValue(liveData);
  const isOpen = liveData !== null;
  const { containerRef, state, reset, zoomLevel } = useZoomPan(isOpen);

  // Reset zoom when opening
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  if (!data) return null;

  return (
    <ModalLayer open={isOpen} onClose={closeModal}>
      <DiagramToolbar data={data} zoomLevel={zoomLevel} onReset={reset} />
      <div
        ref={containerRef}
        className={cn(
          'flex flex-1 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing',
          data.diagramType === 'infographic' && 'infographic-container',
        )}
        style={{ minHeight: 0, overflow: 'hidden' }}
      >
        <div
          className={cn(
            'flex origin-center items-center justify-center',
            data.diagramType === 'mermaid' ? 'mermaid-svg-container' : 'infographic-svg-container',
          )}
          style={{
            transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`,
            width: '100%',
            height: '100%',
          }}
          // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from mermaid/infographic render output
          dangerouslySetInnerHTML={{ __html: data.svg }}
        />
      </div>
    </ModalLayer>
  );
}

function DiagramToolbar({ data, zoomLevel, onReset }: { data: DiagramFullscreenData; zoomLevel: string; onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <MacToolbar language={data.diagramType} onClose={closeModal}>
      <div className="flex items-center gap-1">
        <span className="mr-2 text-muted-foreground text-sm tabular-nums">{zoomLevel}</span>
        <button
          type="button"
          onClick={onReset}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md px-3 tablet:px-0 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={t('diagram.resetZoom')}
          title={t('diagram.resetZoom')}
        >
          <Icon icon="ri:refresh-line" className="size-4" />
          <span className="tablet:hidden text-sm">{t('diagram.resetZoom')}</span>
        </button>
        <CopyButton text={data.source} showLabel />
      </div>
    </MacToolbar>
  );
}
