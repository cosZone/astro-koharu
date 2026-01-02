/**
 * MobilePostHeader Component
 *
 * Mobile-only header for post pages that shows current heading title
 * with progress circle and expandable TOC dropdown.
 */

import { animation } from '@constants/design-tokens';
import { useActiveHeading, useExpandedState, useHeadingClickHandler, useHeadingTree, useMediaQuery } from '@hooks/index';
import { useCurrentHeading } from '@hooks/useCurrentHeading';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
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

export function MobilePostHeader({
  isPostPage,
  logoElement,
  logoText,
  logoSrc,
  enableNumbering = true,
}: MobilePostHeaderProps) {
  const shouldReduceMotion = useReducedMotion();

  // Check if we're on mobile (tablet breakpoint: max-width 992px)
  const isMobile = useMediaQuery('(max-width: 992px)');

  // Get current H2/H3 heading for title display
  const currentHeading = useCurrentHeading({ offsetTop: SCROLL_OFFSET_TOP });

  // Get full heading tree for TOC dropdown
  const headings = useHeadingTree();

  // Get active heading ID for TOC highlighting
  const activeId = useActiveHeading({ offsetTop: SCROLL_OFFSET_TOP + 40 });

  // Get expanded state for TOC accordion
  const { expandedIds, setExpandedIds } = useExpandedState({
    headings,
    activeId,
    defaultExpanded: false,
  });

  // Determine if we should show heading mode
  const showHeadingMode = isPostPage && isMobile && headings.length > 0 && currentHeading !== null;

  // Handle heading click in TOC dropdown
  const handleHeadingClick = useHeadingClickHandler({ headings, setExpandedIds });

  // Logo component
  const Logo = () => (
    <a href="/" className="flex items-center gap-1">
      {logoElement === 'svg' && logoSrc ? (
        <img src={logoSrc} alt={siteConfig?.alternate ?? siteConfig?.name} className="h-8" height={32} />
      ) : (
        <span className="logo-text">{logoText}</span>
      )}
    </a>
  );

  // If not mobile or not a post page, always show logo
  if (!isMobile) {
    return <Logo />;
  }

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {showHeadingMode ? (
          <motion.div
            key="heading-mode"
            className="flex items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : animation.spring.gentle}
          >
            <MobileTOCDropdown
              headings={headings}
              activeId={activeId}
              expandedIds={expandedIds}
              onHeadingClick={handleHeadingClick}
              enableNumbering={enableNumbering}
              trigger={
                <button
                  type="button"
                  className="flex w-[calc(100vw-10.5rem)] items-center gap-2.5 rounded-full bg-foreground/10 py-1 pr-3 pl-1.5 backdrop-blur-sm transition-colors hover:bg-foreground/20"
                  aria-label="展开目录"
                >
                  {/* Progress circle - fixed size container */}
                  <div className="relative shrink-0">
                    <ProgressCircle size={32} strokeWidth={2.5} />
                  </div>
                  <div className="overflow-hidden">
                    <HeadingTitle heading={currentHeading} />
                  </div>
                </button>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="logo-mode"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={shouldReduceMotion ? { duration: 0 } : animation.spring.gentle}
          >
            <Logo />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
