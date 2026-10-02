import { ModalLayer } from '@components/ui/ModalLayer';
import { animation } from '@constants/design-tokens';
import { useImageLightboxGestures } from '@hooks/useImageLightboxGestures';
import { useKeyboardShortcut } from '@hooks/useKeyboardShortcut';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { useRetainedValue } from '@hooks/useRetainedValue';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { flipFromOrigin, intersectsViewport } from '@lib/lightbox-flip';
import { useStore } from '@nanostores/react';
import { $imageLightboxData, closeModal, type ImageLightboxData, navigateImage, openModal } from '@store/modal';
import { m } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

export default function ImageLightbox() {
  const { t } = useTranslation();
  const liveData = useStore($imageLightboxData);
  const data = useRetainedValue(liveData);
  const isOpen = liveData !== null;
  const motionDisabled = useMotionLevel() === 'reduced';
  const [rotation, setRotation] = useState(0);
  const [image, setImage] = useState({ src: '', width: 0, height: 0, failed: false });
  const [retry, setRetry] = useState(0);
  const [fitArea, setFitArea] = useState<HTMLDivElement | null>(null);
  const [fitSize, setFitSize] = useState({ width: 0, height: 0 });
  const close = useCallback(() => {
    // A closing viewer must never dismiss another modal opened during its exit.
    if ($imageLightboxData.get()) closeModal();
  }, []);
  const navigateTo = useCallback((direction: 1 | -1) => {
    const moved = navigateImage(direction);
    if (moved) setRotation(0);
    return moved;
  }, []);
  const { containerRef, imageRef, state, reset, zoomBy, zoomLevel, isInteracting } = useImageLightboxGestures({
    enabled: isOpen,
    onClose: close,
    onNavigate: navigateTo,
    rotation,
    fitSize,
  });

  const inspectImage = useCallback((element: HTMLImageElement) => {
    if (!element.complete) return;
    setImage({
      src: element.getAttribute('src') ?? '',
      width: element.naturalWidth,
      height: element.naturalHeight,
      failed: element.naturalWidth === 0,
    });
  }, []);
  const setImageRef = useCallback(
    (element: HTMLImageElement | null) => {
      imageRef(element);
      if (element) inspectImage(element);
    },
    [imageRef, inspectImage],
  );

  const measureFitArea = useCallback((node: HTMLDivElement | null) => {
    setFitArea(node);
    setFitSize({ width: node?.clientWidth ?? 0, height: node?.clientHeight ?? 0 });
  }, []);

  useLayoutEffect(() => {
    if (!fitArea) return;
    const measure = () => setFitSize({ width: fitArea.clientWidth, height: fitArea.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(fitArea);
    return () => observer.disconnect();
  }, [fitArea]);

  useEffect(() => {
    const handleOpen = (event: CustomEvent<ImageLightboxData>) => openModal('imageLightbox', event.detail);
    window.addEventListener('open-image-lightbox', handleOpen as EventListener);
    return () => window.removeEventListener('open-image-lightbox', handleOpen as EventListener);
  }, []);

  // Reset before paint on open and navigation, but preserve the last pose throughout exit.
  useLayoutEffect(() => {
    if (!liveData) return;
    reset();
    setRotation(0);
  }, [liveData, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const prevent = (event: WheelEvent) => event.preventDefault();
    document.addEventListener('wheel', prevent, { passive: false });
    return () => document.removeEventListener('wheel', prevent);
  }, [isOpen]);

  const handleReset = () => {
    reset();
    setRotation(0);
  };
  const handleZoomIn = () => zoomBy(1.5);
  const handleZoomOut = () => zoomBy(1 / 1.5);
  const handleRotate = () => {
    reset();
    // Keep increasing so the fourth quarter-turn never spins backwards through 270 degrees.
    setRotation((value) => value + 90);
  };
  useKeyboardShortcut({ key: 'ArrowLeft', handler: () => navigateTo(-1), enabled: isOpen });
  useKeyboardShortcut({ key: 'ArrowRight', handler: () => navigateTo(1), enabled: isOpen });
  useKeyboardShortcut({ key: '=', handler: handleZoomIn, enabled: isOpen });
  useKeyboardShortcut({ key: '+', handler: handleZoomIn, enabled: isOpen });
  useKeyboardShortcut({ key: '+', modifiers: ['shift'], handler: handleZoomIn, enabled: isOpen });
  useKeyboardShortcut({ key: '-', handler: handleZoomOut, enabled: isOpen });
  useKeyboardShortcut({ key: 'r', handler: handleRotate, enabled: isOpen });
  useKeyboardShortcut({ key: '0', handler: handleReset, enabled: isOpen });

  if (!data) return null;

  const origin = data.images[data.currentIndex]?.origin;
  const loaded = image.src === data.src && image.width > 0;
  const failed = image.src === data.src && image.failed;
  const naturalWidth = loaded ? image.width : (origin?.naturalWidth ?? 0);
  const naturalHeight = loaded ? image.height : (origin?.naturalHeight ?? 0);
  const quarterTurn = rotation % 180 !== 0;
  const fit =
    naturalWidth && naturalHeight && fitSize.width && fitSize.height
      ? Math.min(
          1,
          fitSize.width / (quarterTurn ? naturalHeight : naturalWidth),
          fitSize.height / (quarterTurn ? naturalWidth : naturalHeight),
        )
      : 0;
  const flip =
    !motionDisabled && origin && fitSize.width && intersectsViewport(origin.box, window.innerWidth, window.innerHeight)
      ? flipFromOrigin(origin.box, origin.naturalWidth, origin.naturalHeight, {
          centerX: document.documentElement.clientWidth / 2,
          centerY: document.documentElement.clientHeight / 2,
          maxWidth: fitSize.width,
          maxHeight: fitSize.height,
        })
      : null;
  const returnToOrigin = flip && state.scale === 1 && rotation % 360 === 0 && state.translateX === 0 && state.translateY === 0;

  const chromeExit = { opacity: 0, transition: { duration: motionDisabled ? 0 : 0.12 } };

  return (
    <ModalLayer
      open={isOpen}
      onClose={close}
      variant="fill"
      ariaLabel={t('image.preview')}
      layerClassName="z-[60]"
      className="touch-none overflow-hidden overscroll-none"
      backdropClassName="bg-[rgb(12_6_18/0.92)]"
    >
      <m.div
        data-no-petals=""
        className="absolute inset-0"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: returnToOrigin ? 1 : 0, transition: { duration: motionDisabled ? 0 : 0.16 } }}
      >
        <div
          ref={measureFitArea}
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 inset-y-[calc(96px+max(env(safe-area-inset-top),env(safe-area-inset-bottom)))] mx-auto max-w-[90vw] [@media(max-height:520px)]:inset-y-[calc(72px+max(env(safe-area-inset-top),env(safe-area-inset-bottom)))]"
        />
        <div
          ref={containerRef}
          data-lightbox-viewport=""
          className="absolute inset-0 flex touch-none select-none items-center justify-center"
        >
          {fitSize.width > 0 && (
            <m.div
              className="flex items-center justify-center"
              initial={
                motionDisabled ? false : flip ? { x: flip.x, y: flip.y, scale: flip.scale } : { opacity: 0, scale: 0.98 }
              }
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={
                motionDisabled
                  ? { opacity: 0, transition: { duration: 0 } }
                  : returnToOrigin
                    ? { x: flip.x, y: flip.y, scale: flip.scale }
                    : { opacity: 0, transition: { duration: 0.16, ease: 'easeOut' } }
              }
              transition={motionDisabled ? { duration: 0 } : animation.spring.lightbox}
            >
              <m.img
                key={`${data.currentIndex}:${data.src}:${retry}`}
                ref={setImageRef}
                data-lightbox-image=""
                src={data.src}
                alt={data.alt}
                draggable={false}
                className="max-w-none origin-center rounded-lg object-contain shadow-2xl outline outline-1 outline-white/10"
                initial={false}
                animate={{
                  x: state.translateX,
                  y: state.translateY,
                  scale: state.scale,
                  rotate: rotation,
                }}
                transition={{
                  default: { duration: motionDisabled || isInteracting ? 0 : 0.18, ease: 'easeOut' },
                  rotate: { duration: motionDisabled ? 0 : 0.22, ease: 'easeOut' },
                }}
                style={{
                  width: fit ? naturalWidth * fit : undefined,
                  height: fit ? naturalHeight * fit : undefined,
                  maxWidth: fit ? undefined : '90vw',
                  maxHeight: fit ? undefined : '60dvh',
                  // CSS keeps the final fade value when Motion 11 cancels its native animation.
                  opacity: loaded ? 1 : 0,
                  transition: motionDisabled ? 'none' : 'opacity 150ms ease-out',
                  pointerEvents: loaded ? 'auto' : 'none',
                  cursor: isInteracting ? 'grabbing' : state.scale > 1 ? 'grab' : 'zoom-in',
                }}
                onLoad={(event) => inspectImage(event.currentTarget)}
                onError={(event) => inspectImage(event.currentTarget)}
              />
            </m.div>
          )}
          {!loaded && (
            <div
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-white/80"
              aria-live="polite"
            >
              <Icon icon={failed ? 'ri:image-line' : 'ri:image-2-line'} className="size-7 text-white/50" aria-hidden="true" />
              <p>{failed ? t('image.loadError') : t('common.loading')}</p>
              {failed && (
                <button
                  type="button"
                  data-lightbox-controls=""
                  className="pointer-events-auto min-h-11 rounded-full bg-white/10 px-5 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  onClick={() => {
                    setImage({ src: '', width: 0, height: 0, failed: false });
                    setRetry((value) => value + 1);
                  }}
                >
                  {t('image.retry')}
                </button>
              )}
            </div>
          )}
        </div>

        <m.div
          exit={chromeExit}
          data-lightbox-controls=""
          className="absolute top-[calc(12px+env(safe-area-inset-top))] right-[calc(12px+env(safe-area-inset-right))] z-10 rounded-full bg-black/40 p-1 backdrop-blur-sm"
        >
          <ToolbarButton icon="ri:close-line" label={t('image.close')} onClick={close} />
        </m.div>

        {data.images.length > 1 && (
          <m.div
            exit={chromeExit}
            data-lightbox-controls=""
            className="absolute top-[calc(12px+env(safe-area-inset-top))] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/40 p-1 backdrop-blur-sm"
          >
            <ToolbarButton
              icon="ri:arrow-left-s-line"
              label={t('image.prev')}
              disabled={data.currentIndex === 0}
              onClick={() => navigateTo(-1)}
            />
            <span className="min-w-14 text-center text-sm text-white/80 tabular-nums" aria-live="polite" aria-atomic="true">
              {t('image.counter', { current: data.currentIndex + 1, total: data.images.length })}
            </span>
            <ToolbarButton
              icon="ri:arrow-right-s-line"
              label={t('image.next')}
              disabled={data.currentIndex === data.images.length - 1}
              onClick={() => navigateTo(1)}
            />
          </m.div>
        )}

        <m.div
          exit={chromeExit}
          data-lightbox-controls=""
          className="absolute bottom-[calc(12px+env(safe-area-inset-bottom))] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/50 p-1.5 shadow-lg backdrop-blur-sm"
        >
          <ToolbarButton
            icon="ri:zoom-out-line"
            label={t('image.zoomOut')}
            onClick={handleZoomOut}
            disabled={!loaded || state.scale <= 1}
          />
          <m.button
            type="button"
            onClick={handleReset}
            className="flex h-11 min-w-16 items-center justify-center rounded-full px-2 text-sm text-white/80 tabular-nums transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
            whileTap={motionDisabled ? undefined : { scale: 0.96 }}
            aria-label={t('image.resetZoomRotate')}
            title={t('image.resetZoomRotate')}
          >
            {zoomLevel}
          </m.button>
          <ToolbarButton
            icon="ri:zoom-in-line"
            label={t('image.zoomIn')}
            onClick={handleZoomIn}
            disabled={!loaded || state.scale >= 5}
          />
          <div className="mx-1 h-5 w-px bg-white/20" aria-hidden="true" />
          <ToolbarButton icon="ri:clockwise-line" label={t('image.rotate')} onClick={handleRotate} disabled={!loaded} />
        </m.div>
        <ZoomHint key={isOpen ? 'open' : 'closed'} multiple={data.images.length > 1} />
      </m.div>
    </ModalLayer>
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
  const motionDisabled = useMotionLevel() === 'reduced';
  return (
    <m.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 disabled:cursor-default disabled:opacity-30"
      whileTap={motionDisabled || disabled ? undefined : { scale: 0.96 }}
      aria-label={label}
      title={label}
    >
      <Icon icon={icon} className="size-5" aria-hidden="true" />
    </m.button>
  );
}

function ZoomHint({ multiple }: { multiple: boolean }) {
  const { t } = useTranslation();
  const touch = useMediaQuery('(pointer: coarse)');
  const motionDisabled = useMotionLevel() === 'reduced';
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <m.p
      className="pointer-events-none absolute right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] left-4 text-center text-white/65 text-xs [@media(max-height:520px)]:hidden"
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      exit={{ opacity: 0, transition: { duration: motionDisabled ? 0 : 0.12 } }}
      transition={{ duration: motionDisabled ? 0 : 0.15 }}
    >
      {touch ? t(multiple ? 'image.hintMobileGallery' : 'image.hintMobile') : t('image.hintDesktop')}
    </m.p>
  );
}
