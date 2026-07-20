import { LazyMotion } from 'motion/react';
import type { PropsWithChildren } from 'react';
import motionFeatures from './motionFeatures';

export function LazyMotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={motionFeatures} strict>
      {children}
    </LazyMotion>
  );
}
