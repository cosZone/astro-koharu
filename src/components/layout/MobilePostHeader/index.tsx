/**
 * MobilePostHeader Component
 *
 * Mobile-only header for post pages that shows current heading title
 * with progress circle and expandable TOC dropdown.
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { TocProvider } from '@components/layout/TableOfContents/TocContext';
import { animation } from '@constants/design-tokens';
import { useMediaQuery } from '@hooks/index';
import { useTocController } from '@hooks/useTocController';
import { useTranslation } from '@hooks/useTranslation';
import { chapterIndexOf, findHeadingById, flattenHeadings } from '@lib/toc';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { useMemo, useState } from 'react';
import { siteConfig } from '@/constants/site-config';
import { HeadingTitle } from './HeadingTitle';
import { MobileTOCDropdown } from './MobileTOCDropdown';
import { ProgressCircle } from './ProgressCircle';

interface MobilePostHeaderProps {
  /** Whether the current page is a post page */
  isPostPage: boolean;
  /** Type of logo element to display */
  logoElement: 'svg' | 'text';
  /** Text to display when logoElement is 'text' */
  logoText?: string;
  /** Logo image URL (for svg type) */
  logoSrc?: string;
  /** Whether to enable CSS counter numbering in TOC (default: true) */
  enableNumbering?: boolean;
}

// Scroll offset for detecting active heading
const SCROLL_OFFSET_TOP = 80;

function Logo({ logoElement, logoText, logoSrc }: Pick<MobilePostHeaderProps, 'logoElement' | 'logoText' | 'logoSrc'>) {
  return (
    <a href="/" className="flex items-center gap-1">
      {logoElement === 'svg' && logoSrc ? (
        <img src={logoSrc} alt={siteConfig?.alternate ?? siteConfig?.name} className="h-8" height={32} />
      ) : (
        <span className="logo-text">{logoText}</span>
      )}
    </a>
  );
}

export function MobilePostHeader({
  isPostPage,
  logoElement,
  logoText,
  logoSrc,
  enableNumbering = true,
}: MobilePostHeaderProps) {
  const { t } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  // Check if we're on mobile (tablet breakpoint: max-width 992px)
  const isMobile = useMediaQuery('(max-width: 992px)');

  // The header title and dropdown follow the same reading position.
  const { headings, toc, subscribeFrame } = useTocController({
    offsetTop: SCROLL_OFFSET_TOP + 40,
    enabled: isMobile && isPostPage,
  });
  const currentHeading = findHeadingById(headings, toc.activeId);

  // Determine if we should show heading mode
  const showHeadingMode = isPostPage && isMobile && headings.length > 0 && currentHeading !== null;

  // Which way the reader travelled to the current heading, so its title rolls in from that side
  const order = useMemo(() => flattenHeadings(headings).map((heading) => heading.id), [headings]);
  const [travel, setTravel] = useState<{ id: string; direction: 1 | -1 }>({ id: '', direction: 1 });
  if (currentHeading && currentHeading.id !== travel.id) {
    const from = order.indexOf(travel.id);
    setTravel({ id: currentHeading.id, direction: from === -1 || order.indexOf(currentHeading.id) >= from ? 1 : -1 });
  }
  const chapter = currentHeading ? chapterIndexOf(headings, currentHeading.id) : 0;

  // If not mobile or not a post page, always show logo
  if (!isMobile) {
    // Keep motion features ready when a breakpoint change enables reading tracking.
    return (
      <LazyMotionProvider>
        <Logo logoElement={logoElement} logoText={logoText} logoSrc={logoSrc} />
      </LazyMotionProvider>
    );
  }

  return (
    <LazyMotionProvider>
      <div className="flex items-center gap-2">
        <AnimatePresence mode="wait">
          {showHeadingMode ? (
            <m.div
              key="heading-mode"
              className="flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : animation.spring.gentle}
            >
              <TocProvider value={toc}>
                <MobileTOCDropdown
                  headings={headings}
                  subscribeFrame={subscribeFrame}
                  enableNumbering={enableNumbering}
                  trigger={
                    <button
                      type="button"
                      className="flex w-[calc(100vw-12rem)] items-center gap-2.5 rounded-full bg-foreground/10 py-1 pr-3 pl-1.5 backdrop-blur-sm transition-colors hover:bg-foreground/20"
                      aria-label={t('toc.expand')}
                    >
                      {/* Progress circle - fixed size container, with the current chapter number inside */}
                      <div className="relative shrink-0">
                        <ProgressCircle size={32} strokeWidth={2.5} />
                        {enableNumbering && chapter > 0 && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 flex-center font-semibold text-[0.625rem] text-primary tabular-nums"
                          >
                            {chapter}
                          </span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <HeadingTitle heading={currentHeading} direction={travel.direction} />
                      </div>
                    </button>
                  }
                />
              </TocProvider>
            </m.div>
          ) : (
            <m.div
              key="logo-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : animation.spring.gentle}
            >
              <Logo logoElement={logoElement} logoText={logoText} logoSrc={logoSrc} />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotionProvider>
  );
}
