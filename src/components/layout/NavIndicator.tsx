import { animation } from '@constants/design-tokens';
import { AnimatePresence, m } from 'motion/react';

/** Shared-layout pill that slides to whichever nav item is hovered, focused or current. */
export function NavIndicator({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <m.span
          layoutId="nav-indicator"
          aria-hidden="true"
          className="nav-indicator absolute inset-x-0.5 inset-y-1 -z-10 rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={animation.spring.nav}
        />
      )}
    </AnimatePresence>
  );
}
