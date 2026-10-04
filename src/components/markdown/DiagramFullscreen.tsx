/**
 * Unified fullscreen viewer for mermaid and infographic diagrams.
 *
 * Uses shared useZoomPan hook for zoom/pan, shared MacToolbar for the toolbar,
 * and the unified $diagramFullscreenData store.
 *
 * Zoom controls live in the title bar on desktop and in a floating pill at the bottom on tablet and
 * phone (`tablet:` is max-width 992px here), where the viewer fills the screen, the title bar is
 * already crowded by the close button, and the bottom edge is within thumb reach.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ModalLayer } from '@components/ui/ModalLayer';
import { useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useRetainedValue } from '@hooks/useRetainedValue';
import { useTranslation } from '@hooks/useTranslation';
import { type UseZoomPanReturn, useZoomPan } from '@hooks/useZoomPan';
import { Icon } from '@iconify/react';
import { downloadDiagram, getNaturalSize } from '@lib/diagram-export';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $diagramFullscreenData, closeModal, type DiagramFullscreenData } from '@store/modal';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

const BUTTON_STEP = 1.5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 6;

interface ZoomControls {
  zoom: UseZoomPanReturn;
  /** Scale at which the diagram shows at its natural size; null when fitting already shows it there. */
  actualScale: number | null;
}

export default function DiagramFullscreen() {
  const liveData = useStore($diagramFullscreenData);
  const data = useRetainedValue(liveData);
  const isOpen = liveData !== null;

  const zoom = useZoomPan(isOpen);
  const { viewportRef, contentRef, zoomBy, zoomTo, reset, isZoomed } = zoom;

  const [content, setContentNode] = useState<HTMLDivElement | null>(null);
  const setContent = useCallback(
    (node: HTMLDivElement | null) => {
      contentRef(node);
      setContentNode(node);
    },
    [contentRef],
  );
  const actualScale = useActualScale(content, data);

  useKeyboardShortcut({ key: '=', handler: () => zoomBy(BUTTON_STEP), enabled: isOpen });
  useKeyboardShortcut({ key: '-', handler: () => zoomBy(1 / BUTTON_STEP), enabled: isOpen });
  useKeyboardShortcut({ key: '0', handler: () => reset(), enabled: isOpen });
  useKeyboardShortcut({ key: '1', handler: () => actualScale && zoomTo(actualScale), enabled: isOpen });

  if (!data) return null;

  const controls: ZoomControls = { zoom, actualScale };

  return (
    <ModalLayer open={isOpen} onClose={closeModal}>
      <DiagramToolbar data={data} controls={controls} content={content} />
      {/* The pill and hint sit beside the canvas, not in it: role="img" hides its children from assistive tech. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          ref={viewportRef}
          role="img"
          aria-label={data.diagramType}
          className={cn(
            'diagram-viewport flex min-h-0 flex-1 touch-none select-none items-center justify-center bg-(--code-surface)',
            isZoomed ? 'cursor-grab data-dragging:cursor-grabbing' : 'cursor-zoom-in',
            data.diagramType === 'infographic' && 'infographic-container',
          )}
          // Inline so it beats the unlayered `.infographic-container { overflow: auto }` the viewer reuses.
          style={{ overflow: 'hidden' }}
          onDoubleClick={(e) => (isZoomed ? reset() : zoomBy(2, e.clientX, e.clientY))}
        >
          <div
            ref={setContent}
            className={cn(
              'flex size-full origin-center items-center justify-center',
              data.diagramType === 'mermaid' ? 'mermaid-svg-container' : 'infographic-svg-container',
            )}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG from mermaid/infographic render output
            dangerouslySetInnerHTML={{ __html: data.svg }}
          />
        </div>
        <div className="absolute inset-x-0 bottom-3 tablet:flex hidden justify-center">
          <ZoomGroup
            controls={controls}
            className="bg-(--code-toolbar)/90 shadow-lg ring-(--code-border) ring-1 backdrop-blur-md"
          />
        </div>
        <GestureHint />
      </div>
    </ModalLayer>
  );
}

/** Fitting never enlarges a diagram, so 1:1 only matters for diagrams shrunk to fit the panel. */
function useActualScale(content: HTMLElement | null, shown: DiagramFullscreenData | null): number | null {
  const [actualScale, setActualScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!content || !shown) return;
    const measure = () => {
      const svg = content.querySelector('svg');
      const natural = svg && getNaturalSize(svg);
      // Layout dimensions ignore zoom and entrance transforms; either axis can limit the SVG's viewBox fit.
      const width = svg?.clientWidth;
      const height = svg?.clientHeight;
      const scale = natural && width && height ? Math.max(natural.width / width, natural.height / height) : 1;
      setActualScale(scale > 1.05 ? Math.min(MAX_SCALE, scale) : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [content, shown]);

  return actualScale;
}

function DiagramToolbar({
  data,
  controls,
  content,
}: {
  data: DiagramFullscreenData;
  controls: ZoomControls;
  content: HTMLElement | null;
}) {
  return (
    <MacToolbar language={data.diagramType} onClose={closeModal}>
      <div className="flex items-center gap-1">
        <ZoomGroup controls={controls} className="tablet:hidden bg-foreground/5" />
        <div className="mx-1 tablet:hidden h-4 w-px bg-border" />
        <DownloadButton data={data} content={content} />
        <CopyButton text={data.source} showLabel />
      </div>
    </MacToolbar>
  );
}

function ZoomGroup({ controls, className }: { controls: ZoomControls; className?: string }) {
  const { t } = useTranslation();
  const { zoom, actualScale } = controls;
  const { zoomBy, zoomTo, reset, zoomLevel, scale } = zoom;

  return (
    <div className={cn('flex items-center gap-0.5 rounded-xl p-1', className)}>
      <ToolButton
        icon="ri:subtract-line"
        label={`${t('diagram.zoomOut')} (-)`}
        onClick={() => zoomBy(1 / BUTTON_STEP)}
        disabled={scale <= MIN_SCALE + 0.001}
      />
      <output aria-live="polite" className="min-w-12 text-center font-mono text-muted-foreground text-xs tabular-nums">
        {zoomLevel}
      </output>
      <ToolButton
        icon="ri:add-line"
        label={`${t('diagram.zoomIn')} (=)`}
        onClick={() => zoomBy(BUTTON_STEP)}
        disabled={scale >= MAX_SCALE - 0.001}
      />
      <div className="mx-0.5 h-4 w-px bg-border" />
      <ToolButton
        icon="ri:fullscreen-exit-line"
        label={`${t('diagram.fitToScreen')} (0)`}
        onClick={() => reset()}
        disabled={false}
      />
      {actualScale && (
        <ToolButton
          label={`${t('diagram.actualSize')} (1)`}
          onClick={() => zoomTo(actualScale)}
          disabled={Math.abs(scale - actualScale) < 0.01}
        >
          <span className="font-mono text-[0.6875rem] tabular-nums">1:1</span>
        </ToolButton>
      )}
    </div>
  );
}

function DownloadButton({ data, content }: { data: DiagramFullscreenData; content: HTMLElement | null }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    const svg = content?.querySelector('svg');
    if (!svg || busy) return;
    setBusy(true);
    try {
      const slug = window.location.pathname.split('/').filter(Boolean).pop() ?? 'diagram';
      await downloadDiagram(svg, `${slug}-${data.diagramType}`, getSurfaceColor(content));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-md px-3 tablet:px-0 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground active:scale-95 disabled:opacity-50"
      aria-label={t('diagram.download')}
      title={t('diagram.download')}
    >
      <Icon icon={busy ? 'ri:loader-4-line' : 'ri:download-2-line'} className={cn('size-4', busy && 'animate-spin')} />
      <span className="tablet:hidden text-sm">{t('diagram.download')}</span>
    </button>
  );
}

/** The first opaque background behind the diagram, so the exported image keeps the surface it was drawn on. */
function getSurfaceColor(from: Element | null): string {
  for (let el = from; el; el = el.parentElement) {
    const color = getComputedStyle(el).backgroundColor;
    if (color && color !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return getComputedStyle(document.body).backgroundColor;
}

function ToolButton({
  icon,
  label,
  onClick,
  disabled,
  children,
}: {
  icon?: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 tablet:size-11 items-center justify-center rounded-lg text-muted-foreground transition-[color,background-color,opacity,transform] hover:bg-background hover:text-foreground active:scale-90 disabled:pointer-events-none disabled:opacity-35"
      aria-label={label}
      title={label}
    >
      {icon ? <Icon icon={icon} className="size-4" /> : children}
    </button>
  );
}

function GestureHint() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute bottom-4 tablet:bottom-20 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-foreground/75 px-3.5 py-1.5 text-background text-xs shadow-lg backdrop-blur-sm transition-opacity duration-500',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <span className="tablet:hidden">{t('diagram.gestureHint')}</span>
      <span className="tablet:inline hidden">{t('image.hintMobile')}</span>
    </div>
  );
}
