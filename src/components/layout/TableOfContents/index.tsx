/**
 * TableOfContents Component (Refactored with Sub-components)
 *
 * Displays a hierarchical table of contents with active heading detection and accordion behavior.
 * Uses custom hooks for state management and sub-components for better organization.
 */

import { useMediaQuery } from '@hooks/useMediaQuery';
import { useTocController } from '@hooks/useTocController';
import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $isDrawerOpen } from '@store/modal';
import { HeadingList } from './HeadingList';
import { TocProvider } from './TocContext';
import { TocGlide } from './TocGlide';

// Constants
const SCROLL_OFFSET_TOP = 120; // Offset for header height when detecting active heading

interface TableOfContentsProps {
  /** Drawer navigation tracks only while it is open on a narrow viewport. */
  isDrawer?: boolean;
  /** Whether headings should be expanded by default */
  defaultExpanded?: boolean;
  /** Whether to enable heading numbering (default: true) */
  enableNumbering?: boolean;
}

/**
 * TableOfContents Component
 *
 * Main container for the table of contents. Manages heading state and
 * delegates rendering to HeadingList sub-component.
 */
export function TableOfContents({
  isDrawer = false,
  defaultExpanded = false,
  enableNumbering = true,
}: TableOfContentsProps = {}) {
  const { t } = useTranslation();
  const isMobile = useMediaQuery('(max-width: 992px)');
  const drawerOpen = useStore($isDrawerOpen);
  const { headings, toc, subscribeFrame } = useTocController({
    offsetTop: SCROLL_OFFSET_TOP,
    defaultExpanded,
    enabled: isDrawer ? isMobile && drawerOpen : !isMobile,
  });

  // Empty state
  if (headings.length === 0) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        <div className="text-sm">{t('toc.empty')}</div>
      </div>
    );
  }

  return (
    <nav
      className={cn(
        'toc-container toc-silk-container toc-scroll-fade scrollbar-hidden flex h-full flex-col gap-1 overflow-y-auto overflow-x-hidden md:pb-3 md:pl-1',
        { 'toc-no-numbering': !enableNumbering },
      )}
      aria-label={t('toc.title')}
      data-toc-scroller
    >
      <TocProvider value={toc}>
        <TocGlide headings={headings} subscribeFrame={subscribeFrame} />
        <HeadingList headings={headings} numbered={enableNumbering} />
      </TocProvider>
    </nav>
  );
}
