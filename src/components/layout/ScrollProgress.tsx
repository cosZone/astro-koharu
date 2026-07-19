import { useStore } from '@nanostores/react';
import { masterMotionEnabled, scrollProgressEnabled } from '@store/settings';
import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';

interface ScrollProgressProps {
  className?: string;
}

export function ScrollProgress({ className }: ScrollProgressProps) {
  const shouldReduceMotion = useReducedMotion();
  // Keep the progress indicator static when either reduced-motion preference is active.
  const enabled = useStore(scrollProgressEnabled);
  const masterMotion = useStore(masterMotionEnabled);

  // 监听页面滚动进度
  const { scrollYProgress } = useScroll();

  // 使用 spring 动画使滚动更平滑，提升性能
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // 如果用户偏好减少动画，则直接使用滚动进度值，不使用 spring
  const scaleX = shouldReduceMotion || masterMotion ? scrollYProgress : springProgress;

  if (!enabled) return null;

  return (
    <div className={className}>
      <motion.div className="h-1 origin-left rounded-full bg-primary" style={{ scaleX }} />
    </div>
  );
}
