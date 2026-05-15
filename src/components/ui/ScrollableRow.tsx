import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface ScrollableRowProps {
  children: ReactNode;
  className?: string;
  /** Extra classes on the inner scrollable container */
  innerClassName?: string;
  /** Gradient mask width in px (default: 24) */
  fadeWidth?: number;
}

export function ScrollableRow({ children, className, innerClassName, fadeWidth = 24 }: ScrollableRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkOverflow = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkOverflow();
    el.addEventListener('scroll', checkOverflow, { passive: true });

    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', checkOverflow);
      ro.disconnect();
    };
  }, [checkOverflow]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const target = direction === 'left' ? 0 : el.scrollWidth;
    el.scrollTo({ left: target, behavior: 'smooth' });
  };

  const maskImage =
    canScrollLeft && canScrollRight
      ? `linear-gradient(to right, transparent, black ${fadeWidth}px, black calc(100% - ${fadeWidth}px), transparent)`
      : canScrollLeft
        ? `linear-gradient(to right, transparent, black ${fadeWidth}px)`
        : canScrollRight
          ? `linear-gradient(to right, black calc(100% - ${fadeWidth}px), transparent)`
          : undefined;

  return (
    <div className={cn('group/scroll relative flex items-center', className)}>
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scroll('left')}
          aria-label="Scroll left"
          className="absolute -left-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-muted/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover/scroll:opacity-100"
        >
          <Icon icon="ri:arrow-left-s-line" className="h-3 w-3" />
        </button>
      )}
      <div
        ref={scrollRef}
        style={maskImage ? { maskImage, WebkitMaskImage: maskImage } : undefined}
        className={cn('scrollbar-hidden flex overflow-x-auto', innerClassName)}
      >
        {children}
      </div>
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scroll('right')}
          aria-label="Scroll right"
          className="absolute -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-md bg-muted/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity group-hover/scroll:opacity-100"
        >
          <Icon icon="ri:arrow-right-s-line" className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
