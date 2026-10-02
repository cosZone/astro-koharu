import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { useMotionLevel } from '@hooks/useMotionLevel';
import { useStore } from '@nanostores/react';
import { scrollProgressEnabled } from '@store/settings';
import { type MotionValue, m, useScroll, useSpring } from 'motion/react';

interface ScrollProgressProps {
  className?: string;
}

function ProgressBar({ progress }: { progress: MotionValue<number> }) {
  return <m.div className="h-1 origin-left rounded-full bg-primary" style={{ scaleX: progress }} />;
}

function SmoothProgressBar({ progress }: { progress: MotionValue<number> }) {
  const springProgress = useSpring(progress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  return <ProgressBar progress={springProgress} />;
}

function ScrollProgressIndicator({ className }: ScrollProgressProps) {
  const motionDisabled = useMotionLevel() === 'reduced';
  const { scrollYProgress } = useScroll();

  return (
    <LazyMotionProvider>
      <div className={className}>
        {motionDisabled ? <ProgressBar progress={scrollYProgress} /> : <SmoothProgressBar progress={scrollYProgress} />}
      </div>
    </LazyMotionProvider>
  );
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const enabled = useStore(scrollProgressEnabled);
  return enabled ? <ScrollProgressIndicator className={className} /> : null;
}
