import { useMotionLevel } from '@hooks/useMotionLevel';
import { LazyMotion, MotionConfig } from 'motion/react';
import type { PropsWithChildren } from 'react';

const loadMotionFeatures = () => import('./motionFeatures').then(({ default: features }) => features);

export function LazyMotionProvider({ children }: PropsWithChildren) {
  const motionDisabled = useMotionLevel() === 'reduced';
  return (
    // Motion 11 snapshots its reducedMotion option at mount. Our reactive preference
    // controls transitions instead, so changing the system setting works without remounting UI.
    <MotionConfig reducedMotion="never" transition={motionDisabled ? { duration: 0 } : undefined}>
      <LazyMotion features={loadMotionFeatures} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
