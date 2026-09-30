/**
 * MobileTOCDropdown Component
 *
 * Dropdown panel for the mobile table of contents. It grows out of the header pill (a clip-path
 * reveal from the pill's corner) and opens already scrolled to the current heading.
 * Uses Floating UI for positioning and Motion for animations.
 */

import { animation } from '@constants/design-tokens';
import { FloatingFocusManager, FloatingPortal, useClick, useDismiss, useInteractions, useRole } from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { useTranslation } from '@hooks/useTranslation';
import { chapterIndexOf, type Heading } from '@lib/toc';
import { AnimatePresence, m, type Transition } from 'motion/react';
import type React from 'react';
import { cloneElement, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { HeadingList } from '../TableOfContents/HeadingList';
import { TocProvider, useTocContext } from '../TableOfContents/TocContext';
import { TocGlide } from '../TableOfContents/TocGlide';

/** The panel starts as a pill-sized corner under the trigger and opens to its full size. */
const PANEL_CLOSED = 'inset(0% 45% 88% 0% round 20px)';
const PANEL_OPEN = 'inset(0% 0% 0% 0% round 16px)';
const PANEL_ENTER: Transition = {
  clipPath: { duration: 0.46, ease: animation.bezier.outExpo },
  opacity: { duration: 0.16, ease: animation.bezier.outQuart },
};
const PANEL_EXIT: Transition = {
  clipPath: { duration: 0.2, ease: animation.bezier.inQuart },
  opacity: { duration: 0.16, delay: 0.04, ease: animation.bezier.inQuart },
};
const COMPACT_GAP = { '--toc-gap': '0.25rem' } as React.CSSProperties;

interface MobileTOCDropdownProps {
  /** Hierarchical heading tree */
  headings: Heading[];
  /** Trigger element that opens the dropdown */
  trigger: React.JSX.Element;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Whether to enable CSS counter numbering (default: true) */
  enableNumbering?: boolean;
}

export function MobileTOCDropdown({
  headings,
  trigger,
  open: passedOpen,
  onOpenChange,
  enableNumbering = true,
}: MobileTOCDropdownProps) {
  const { t } = useTranslation();
  const outerToc = useTocContext();
  const fadeOnly = useMotionLevel() === 'reduced';
  const chapter = chapterIndexOf(headings, outerToc.activeId);
  const [isOpen, setIsOpen] = useControlledState({
    value: passedOpen,
    defaultValue: false,
    onChange: onOpenChange,
  });

  const { refs, floatingStyles, context } = useFloatingUI({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-start',
    offset: 8,
    transform: false,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context, { ancestorScroll: true });
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  // Same TOC state, but a click also dismisses the dropdown
  const toc = useMemo(
    () => ({
      ...outerToc,
      onHeadingClick: (id: string) => {
        outerToc.onHeadingClick(id);
        setIsOpen(false);
      },
    }),
    [outerToc, setIsOpen],
  );

  return (
    <>
      {cloneElement(trigger, getReferenceProps({ ref: refs.setReference, ...trigger.props }))}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <m.div
                ref={refs.setFloating}
                style={floatingStyles}
                className="z-50 flex max-h-[min(70vh,34rem)] w-[min(20rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-primary/15 bg-background/85 shadow-xl backdrop-blur-md"
                initial={fadeOnly ? { opacity: 0 } : { opacity: 0, clipPath: PANEL_CLOSED }}
                animate={
                  fadeOnly
                    ? { opacity: 1, transition: { duration: 0.15 } }
                    : { opacity: 1, clipPath: PANEL_OPEN, transition: PANEL_ENTER }
                }
                exit={
                  fadeOnly
                    ? { opacity: 0, transition: { duration: 0.12 } }
                    : { opacity: 0, clipPath: PANEL_CLOSED, transition: PANEL_EXIT }
                }
                {...getFloatingProps()}
              >
                <div className="flex items-center justify-between px-4 pt-3 pb-1.5 text-xs">
                  <span className="font-semibold text-foreground/85">{t('toc.title')}</span>
                  {chapter > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                      {chapter} / {headings.length}
                    </span>
                  )}
                </div>
                <div className="overflow-y-auto overflow-x-hidden px-2 pb-2" data-toc-scroller>
                  <nav
                    className={cn('toc-container flex flex-col gap-1', { 'toc-no-numbering': !enableNumbering })}
                    style={COMPACT_GAP}
                    aria-label={t('toc.title')}
                  >
                    <TocProvider value={toc}>
                      <TocGlide headings={headings} />
                      <HeadingList headings={headings} />
                    </TocProvider>
                  </nav>
                </div>
              </m.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}
