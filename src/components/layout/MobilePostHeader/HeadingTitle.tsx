/**
 * HeadingTitle Component
 *
 * Displays the current heading text with animated transitions. The title rolls the way the reader
 * travels: reading on brings the next title up from below, scrolling back brings it down from above.
 */

import type { CurrentHeading } from '@hooks/useCurrentHeading';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { AnimatePresence, m, type Variants } from 'motion/react';

interface HeadingTitleProps {
  /** Current heading info */
  heading: CurrentHeading | null;
  /** 1 when the reader moved forward to this heading, -1 when they went back */
  direction?: 1 | -1;
  /** Additional CSS classes */
  className?: string;
}

const rolling: Variants = {
  enter: (direction: 1 | -1) => ({ opacity: 0, transform: `translateY(${16 * direction}px)`, filter: 'blur(4px)' }),
  shown: { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' },
  leave: (direction: 1 | -1) => ({ opacity: 0, transform: `translateY(${-12 * direction}px)`, filter: 'blur(4px)' }),
};

export function HeadingTitle({ heading, direction = 1, className }: HeadingTitleProps) {
  const shouldReduceMotion = useMotionLevel() === 'reduced';

  return (
    <AnimatePresence mode="wait" custom={direction}>
      {heading && (
        <m.span
          key={heading.id}
          className={`block truncate font-medium text-sm ${className || ''}`}
          custom={direction}
          variants={rolling}
          initial={shouldReduceMotion ? false : 'enter'}
          animate="shown"
          exit={shouldReduceMotion ? { opacity: 0 } : 'leave'}
          transition={
            shouldReduceMotion
              ? { duration: 0 }
              : {
                  default: { type: 'spring', stiffness: 400, damping: 30 },
                  filter: { type: 'tween', duration: 0.2, ease: 'easeOut' },
                  opacity: { type: 'tween', duration: 0.18, ease: 'easeOut' },
                }
          }
        >
          {heading.text}
        </m.span>
      )}
    </AnimatePresence>
  );
}
