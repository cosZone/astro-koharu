import { LazyMotion } from 'motion/react';
import type { PropsWithChildren } from 'react';

const loadMotionFeatures = () => import('./motionFeatures').then(({ default: features }) => features);

export function LazyMotionProvider({ children }: PropsWithChildren) {
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      {children}
    </LazyMotion>
  );
}
