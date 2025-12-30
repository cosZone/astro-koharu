/**
 * HeadingTitle Component
 *
 * Displays the current heading text with animated transitions.
 * Uses bottom-to-top animation when heading changes.
 */

import type { CurrentHeading } from '@hooks/useCurrentHeading';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface HeadingTitleProps {
  /** Current heading info */
  heading: CurrentHeading | null;
  /** Additional CSS classes */
  className?: string;
}

export function HeadingTitle({ heading, className }: HeadingTitleProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {heading && (
        <motion.span
          key={heading.id}
          className={`block truncate font-medium text-sm ${className || ''}`}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, filter: 'blur(4px)' }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: 'blur(4px)' }}
          transition={{
            default: { type: 'spring', stiffness: 400, damping: 30 },
            filter: { type: 'tween', duration: 0.2, ease: 'easeOut' },
          }}
        >
          {heading.text}
        </motion.span>
      )}
    </AnimatePresence>
  );
}
