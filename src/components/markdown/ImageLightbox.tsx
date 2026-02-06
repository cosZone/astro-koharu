/**
 * React image lightbox with zoom/pan support.
 * Replaces the vanilla DOM lightbox in image-enhancer.ts (~400 lines).
 *
 * Uses shared useZoomPan hook, Floating UI for dismiss behavior, and Motion animations.
 * Listens for 'open-image-lightbox' custom events dispatched by image-enhancer.ts.
 */

import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useZoomPan } from '@hooks/useZoomPan';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import { $imageLightboxData, closeModal, type ImageLightboxData, navigateImage, openModal } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function ImageLightbox() {
  const data = useStore($imageLightboxData);
  const isOpen = data !== null;
  const [imageLoaded, setImageLoaded] = useState(false);
  const [rotation, setRotation] = useState(0);

  const { containerRef, state, reset, zoomTo, zoomLevel } = useZoomPan(isOpen);

  // Use a ref so the outsidePress callback always reads the latest scale
  const scaleRef = useRef(state.scale);
  scaleRef.current = state.scale;

  const handleResetAll = useCallback(() => {
    reset();
    setRotation(0);
  }, [reset]);

  const handleZoomIn = useCallback(() => zoomTo(scaleRef.current * 1.5), [zoomTo]);
  const handleZoomOut = useCallback(() => zoomTo(scaleRef.current / 1.5), [zoomTo]);
  const handleRotate = useCallback(() => setRotation((r) => (r + 90) % 360), []);

  const navigateTo = useCallback(
    (dir: 1 | -1) => {
      if (!navigateImage(dir)) return;
      reset();
      setRotation(0);
      setImageLoaded(false);
    },
    [reset],
  );

  // Keyboard shortcuts for navigation
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

  // Keyboard shortcuts for zoom/rotate
  useKeyboardShortcut({ key: '=', handler: handleZoomIn, enabled: isOpen, ignoreInputs: false, preventDefault: false });
  useKeyboardShortcut({ key: '+', handler: handleZoomIn, enabled: isOpen, ignoreInputs: false, preventDefault: false });
  useKeyboardShortcut({ key: '-', handler: handleZoomOut, enabled: isOpen, ignoreInputs: false, preventDefault: false });
  useKeyboardShortcut({ key: 'r', handler: handleRotate, enabled: isOpen, ignoreInputs: false, preventDefault: false });
  useKeyboardShortcut({ key: '0', handler: handleResetAll, enabled: isOpen, ignoreInputs: false, preventDefault: false });

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

  // Reset zoom, rotation, and image state when opening/closing
  useEffect(() => {
    if (isOpen) {
      reset();
      setRotation(0);
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
      setRotation(0);
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
                {/* Toolbar: vertical right on desktop, horizontal top on tablet */}
                <motion.div
                  className="absolute tablet:top-4 top-1/2 right-4 tablet:right-auto tablet:left-1/2 z-10 flex tablet:-translate-x-1/2 -translate-y-1/2 tablet:translate-y-0 tablet:flex-row flex-col items-center gap-1 rounded-2xl bg-black/50 p-1.5 backdrop-blur-sm"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <ToolbarButton icon="ri:zoom-in-line" label="放大" onClick={handleZoomIn} disabled={state.scale >= 4.9} />
                  <motion.button
                    type="button"
                    onClick={handleResetAll}
                    className="flex size-10 items-center justify-center rounded-full text-white/60 text-xs tabular-nums transition-colors hover:bg-white/15 hover:text-white/80"
                    whileTap={{ scale: 0.85 }}
                    aria-label="重置缩放和旋转"
                  >
                    {zoomLevel}
                  </motion.button>
                  <ToolbarButton icon="ri:zoom-out-line" label="缩小" onClick={handleZoomOut} disabled={state.scale <= 0.55} />
                  <div className="h-px tablet:h-5 tablet:w-px w-5 bg-white/20" />
                  <ToolbarButton icon="ri:clockwise-line" label="旋转 90°" onClick={handleRotate} />
                  <div className="h-px tablet:h-5 tablet:w-px w-5 bg-white/20" />
                  <ToolbarButton icon="ri:close-line" label="关闭" onClick={() => closeModal()} />
                </motion.div>

                {/* Image viewport with zoom/pan */}
                <div
                  ref={containerRef}
                  role="img"
                  className="flex h-full w-full touch-none select-none items-center justify-center p-4"
                  onDoubleClick={handleDoubleClick}
                >
                  <motion.div
                    className="flex items-center justify-center"
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.img
                      src={data.src}
                      alt={data.alt}
                      className="max-h-[80vh] max-w-[90vw] origin-center rounded-lg object-contain shadow-2xl will-change-transform"
                      animate={{ scale: state.scale, rotate: rotation, opacity: imageLoaded ? 1 : 0 }}
                      transition={{
                        scale: { type: 'tween', duration: 0.15, ease: 'easeOut' },
                        rotate: { type: 'spring', stiffness: 300, damping: 25 },
                        opacity: { duration: 0.2 },
                      }}
                      style={{
                        x: state.translateX,
                        y: state.translateY,
                        cursor: state.scale > 1.05 ? 'grab' : 'zoom-in',
                      }}
                      onLoad={() => setImageLoaded(true)}
                      draggable={false}
                    />
                  </motion.div>
                </div>

                {/* Navigation bar */}
                {data.images.length > 1 && (
                  <div className="absolute bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-black/50 p-1 backdrop-blur-sm">
                    <NavButton direction={-1} disabled={data.currentIndex === 0} onClick={() => navigateTo(-1)} />
                    <span className="min-w-14 px-1 text-center font-mono text-sm text-white/80 tabular-nums">
                      {data.currentIndex + 1} / {data.images.length}
                    </span>
                    <NavButton
                      direction={1}
                      disabled={data.currentIndex === data.images.length - 1}
                      onClick={() => navigateTo(1)}
                    />
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

function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-30"
      whileTap={{ scale: 0.85 }}
      aria-label={label}
    >
      <Icon icon={icon} className="size-5" />
    </motion.button>
  );
}

// Stable animation keyframes — avoids restarting the bounce on every parent re-render
const BOUNCE_LEFT = { x: [0, -2.5, 0] };
const BOUNCE_RIGHT = { x: [0, 2.5, 0] };
const BOUNCE_NONE = { x: 0 };

function NavButton({ direction, disabled, onClick }: { direction: 1 | -1; disabled: boolean; onClick: () => void }) {
  const isLeft = direction === -1;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/15 disabled:pointer-events-none disabled:opacity-30"
      whileTap={{ scale: 0.82 }}
      aria-label={isLeft ? '上一张' : '下一张'}
    >
      <motion.span
        animate={disabled ? BOUNCE_NONE : isLeft ? BOUNCE_LEFT : BOUNCE_RIGHT}
        transition={{ duration: 1.6, repeat: 3, ease: 'easeInOut' }}
      >
        <Icon icon={isLeft ? 'ri:arrow-left-s-line' : 'ri:arrow-right-s-line'} className="size-5" />
      </motion.span>
    </motion.button>
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
