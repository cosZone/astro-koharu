/**
 * MobileTOCDropdown Component
 *
 * Dropdown panel for the mobile table of contents.
 * Uses Floating UI for positioning and Motion for animations.
 */

import { animation } from '@constants/design-tokens';
import { FloatingFocusManager, FloatingPortal, useClick, useDismiss, useInteractions, useRole } from '@floating-ui/react';
import { useControlledState } from '@hooks/useControlledState';
import { useFloatingUI } from '@hooks/useFloatingUI';
import type { Heading } from '@hooks/useHeadingTree';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { cloneElement } from 'react';
import { cn } from '@/lib/utils';
import { HeadingList } from '../TableOfContents/HeadingList';

interface MobileTOCDropdownProps {
  /** Hierarchical heading tree */
  headings: Heading[];
  /** ID of the currently active heading */
  activeId: string;
  /** Set of expanded heading IDs */
  expandedIds: Set<string>;
  /** Callback when a heading is clicked */
  onHeadingClick: (id: string) => void;
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
  activeId,
  expandedIds,
  onHeadingClick,
  trigger,
  open: passedOpen,
  onOpenChange,
  enableNumbering = true,
}: MobileTOCDropdownProps) {
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

  const handleHeadingClick = (id: string) => {
    onHeadingClick(id);
    setIsOpen(false);
  };

  return (
    <>
      {cloneElement(trigger, getReferenceProps({ ref: refs.setReference, ...trigger.props }))}
      <AnimatePresence>
        {isOpen && (
          <FloatingPortal>
            <FloatingFocusManager context={context} modal={false}>
              <motion.div
                ref={refs.setFloating}
                style={floatingStyles}
                className="z-50 max-h-[60vh] w-72 overflow-auto rounded-2xl border border-border bg-background/80 p-3 backdrop-blur-md"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, originY: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={animation.spring.popoverContent}
                {...getFloatingProps()}
              >
                <nav className={cn('toc-container', { 'toc-no-numbering': !enableNumbering })} aria-label="文章目录">
                  <div className="space-y-1">
                    <HeadingList
                      headings={headings}
                      depth={0}
                      activeId={activeId}
                      expandedIds={expandedIds}
                      onHeadingClick={handleHeadingClick}
                    />
                  </div>
                </nav>
              </motion.div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </AnimatePresence>
    </>
  );
}
