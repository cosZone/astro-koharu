/**
 * ProgressCircle Component
 *
 * SVG circular progress indicator showing overall article scroll progress.
 * Uses Motion's useScroll for tracking and useSpring for smooth animation.
 */

import { motion, useReducedMotion, useScroll, useSpring } from 'motion/react';

interface ProgressCircleProps {
  /** Circle size in pixels (default: 28) */
  size?: number;
  /** Stroke width in pixels (default: 2) */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ProgressCircle({ size = 28, strokeWidth = 2, className }: ProgressCircleProps) {
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  // Apply spring smoothing unless user prefers reduced motion
  const progress = shouldReduceMotion ? scrollYProgress : springProgress;

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-label="阅读进度"
      role="progressbar"
      style={{ transform: 'rotate(-90deg)' }}
    >
      {/* Background circle (track) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-20"
      />
      {/* Progress circle */}
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-primary"
        style={{
          pathLength: progress,
        }}
      />
    </svg>
  );
}
