/**
 * React image lightbox with zoom/pan support.
 * Replaces the vanilla DOM lightbox in image-enhancer.ts (~400 lines).
 *
 * Uses shared useZoomPan hook, Floating UI for dismiss behavior, and Motion animations.
 * Listens for 'open-image-lightbox' custom events dispatched by image-enhancer.ts.
 */

import { CloseIcon } from '@components/markdown/shared/icons';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useZoomPan } from '@hooks/useZoomPan';
import { useStore } from '@nanostores/react';
import { $imageLightboxData, closeModal, type ImageLightboxData, navigateImage, openModal } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function ImageLightbox() {
  const data = useStore($imageLightboxData);
  const isOpen = data !== null;
  const { containerRef, state, reset, zoomTo } = useZoomPan(isOpen);
  const [imageLoaded, setImageLoaded] = useState(false);
  // Use a ref so the outsidePress callback always reads the latest scale
  const scaleRef = useRef(state.scale);
  scaleRef.current = state.scale;

  const navigateTo = useCallback(
    (dir: 1 | -1) => {
      if (!navigateImage(dir)) return;
      reset();
      setImageLoaded(false);
    },
    [reset],
  );

  useKeyboardShortcut({
    key: 'ArrowLeft',
    handler: () => navigateTo(-1),
    enabled: isOpen,
    ignoreInputs: false,
    preventDefault: false,
  });

  useKeyboardShortcut({
    key: 'ArrowRight',
    handler: () => navigateTo(1),
    enabled: isOpen,
    ignoreInputs: false,
    preventDefault: false,
  });

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) closeModal();
    },
  });
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
    outsidePress: (event) => {
      // Don't close when zoomed in (user might be panning)
      if (scaleRef.current > 1.05) return false;
      // Don't close when clicking interactive elements or the image itself
      const target = event.target as HTMLElement;
      if (target.closest('button, img, [role="img"]')) return false;
      return true;
    },
  });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  // Listen for custom events from image-enhancer
  useEffect(() => {
    const handleOpen = (e: CustomEvent<ImageLightboxData>) => {
      openModal('imageLightbox', e.detail);
    };

    window.addEventListener('open-image-lightbox', handleOpen as EventListener);
    return () => window.removeEventListener('open-image-lightbox', handleOpen as EventListener);
  }, []);

  // Close on page navigation
  useEffect(() => {
    const close = () => closeModal();
    document.addEventListener('astro:before-preparation', close);
    return () => document.removeEventListener('astro:before-preparation', close);
  }, []);

  // Reset zoom and image state when opening/closing
  useEffect(() => {
    if (isOpen) {
      reset();
      setImageLoaded(false);
    }
  }, [isOpen, reset]);

  // Lock page scroll while lightbox is open
  useEffect(() => {
    if (!isOpen) return;
    const prevent = (e: WheelEvent) => e.preventDefault();
    document.addEventListener('wheel', prevent, { passive: false });
    return () => document.removeEventListener('wheel', prevent);
  }, [isOpen]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (state.scale > 1.05) {
      reset();
    } else {
      zoomTo(2, e.clientX, e.clientY);
    }
  };

  if (!data) return null;

  return (
    <FloatingPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/90 backdrop-blur-sm" />
            {/* Content */}
            <FloatingFocusManager context={context}>
              <div ref={refs.setFloating} className="fixed inset-0 flex items-center justify-center" {...getFloatingProps()}>
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => closeModal()}
                  className="absolute top-4 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 active:scale-95"
                  aria-label="关闭"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>

                {/* Image viewport with zoom/pan */}
                <div
                  ref={containerRef}
                  role="img"
                  className="flex h-full w-full touch-none select-none items-center justify-center p-4"
                  onDoubleClick={handleDoubleClick}
                >
                  <motion.img
                    src={data.src}
                    alt={data.alt}
                    className="max-h-[80vh] max-w-[90vw] origin-center rounded-lg object-contain shadow-2xl will-change-transform"
                    style={{
                      transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`,
                      cursor: state.scale > 1.05 ? 'grab' : 'zoom-in',
                      opacity: imageLoaded ? 1 : 0,
                      transition: 'opacity 0.2s ease-in-out',
                    }}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    onLoad={() => setImageLoaded(true)}
                    draggable={false}
                  />
                </div>

                {/* Position indicator */}
                {data.images.length > 1 && (
                  <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 font-mono text-sm text-white/80 tabular-nums">
                    {data.currentIndex + 1} / {data.images.length}
                  </div>
                )}

                {/* Zoom hint */}
                <ZoomHint />
              </div>
            </FloatingFocusManager>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}

function ZoomHint() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <motion.div
      className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white/70 text-xs"
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="hidden touch-none sm:inline">双击放大 · 滚轮/双指缩放</span>
      <span className="sm:hidden">双击放大 · 双指缩放</span>
    </motion.div>
  );
}
