/**
 * Unified fullscreen viewer for mermaid and infographic diagrams.
 * Replaces MermaidFullscreen.astro (482 lines) + InfographicFullscreen.astro (489 lines).
 *
 * Uses shared useZoomPan hook for zoom/pan, shared MacToolbar for the toolbar,
 * and the unified $diagramFullscreenData store.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { useZoomPan } from '@hooks/useZoomPan';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $diagramFullscreenData, closeModal, type DiagramFullscreenData } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

export default function DiagramFullscreen() {
  const data = useStore($diagramFullscreenData);
  const isOpen = data !== null;
  const { containerRef, state, reset, zoomLevel } = useZoomPan(isOpen);

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) closeModal();
    },
  });
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  // Close on page navigation
  useEffect(() => {
    const close = () => closeModal();
    document.addEventListener('astro:before-preparation', close);
    return () => document.removeEventListener('astro:before-preparation', close);
  }, []);

  // Reset zoom when opening
  useEffect(() => {
    if (isOpen) reset();
  }, [isOpen, reset]);

  if (!data) return null;

  return (
    <FloatingPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <FloatingFocusManager context={context}>
              <div className="fixed inset-0 z-50 grid place-items-center px-4">
                <motion.div
                  ref={refs.setFloating}
                  className="relative flex h-[80vh] w-[90vw] max-w-6xl flex-col overflow-hidden overscroll-none rounded-xl bg-background shadow-2xl md:max-w-[90vw]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  {...getFloatingProps()}
                >
                  <DiagramToolbar data={data} zoomLevel={zoomLevel} onReset={reset} />
                  <div
                    ref={containerRef}
                    className={cn(
                      'flex flex-1 cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing',
                      data.diagramType === 'infographic' && 'infographic-container',
                    )}
                  >
                    <div
                      className={cn(
                        'flex origin-center items-center justify-center transition-transform duration-100',
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
                </motion.div>
              </div>
            </FloatingFocusManager>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}

function DiagramToolbar({ data, zoomLevel, onReset }: { data: DiagramFullscreenData; zoomLevel: string; onReset: () => void }) {
  return (
    <MacToolbar language={data.diagramType} className="tablet:items-stretch tablet:px-2" onClose={closeModal}>
      <div className="flex items-center gap-1">
        <span className="mr-2 tablet:ml-auto text-muted-foreground text-sm">{zoomLevel}</span>
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          title="重置缩放"
        >
          <Icon icon="ri:refresh-line" className="size-4" />
          <span className="text-sm">重置</span>
        </button>
        <CopyButton text={data.source} showLabel />
      </div>
    </MacToolbar>
  );
}
