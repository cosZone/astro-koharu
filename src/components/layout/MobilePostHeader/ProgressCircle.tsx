/**
 * ProgressCircle Component
 *
 * Overall article scroll progress as the silk thread coiled into a ring: the theme gradient winds
 * clockwise from the top with a bead riding its tip. Uses Motion's useScroll for tracking and
 * useSpring for smooth animation.
 */

import { useMotionLevel } from '@hooks/useMotionLevel';
import { useStore } from '@nanostores/react';
import { scrollProgressEnabled } from '@store/settings';
import { m, useScroll, useSpring, useTransform } from 'motion/react';
import { useId } from 'react';

interface ProgressCircleProps {
  /** Circle size in pixels (default: 28) */
  size?: number;
  /** Stroke width in pixels (default: 2) */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

export function ProgressCircle({ size = 28, strokeWidth = 2, className }: ProgressCircleProps) {
  const enabled = useStore(scrollProgressEnabled);
  const isReduced = useMotionLevel() === 'reduced';
  const gradientId = `progress-thread-${useId().replace(/[^\w-]/g, '')}`;
  const { scrollYProgress } = useScroll();

  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const progress = isReduced ? scrollYProgress : springProgress;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const beadX = useTransform(progress, (value) => center + radius * Math.cos(value * 2 * Math.PI));
  const beadY = useTransform(progress, (value) => center + radius * Math.sin(value * 2 * Math.PI));
  const beadOpacity = useTransform(progress, (value) => (value > 0.005 ? 1 : 0));

  if (!enabled) return null;

  return (
    <svg
      width={size}
      height={size}
      className={className}
      aria-label="阅读进度"
      role="progressbar"
      style={{ transform: 'rotate(-90deg)' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--gradient-shoka-button-start)' }} />
          <stop offset="1" style={{ stopColor: 'var(--gradient-shoka-button-end)' }} />
        </linearGradient>
      </defs>
      {/* Background circle (track) */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-15"
      />
      {/* Progress circle */}
      <m.circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{
          pathLength: progress,
        }}
      />
      {/* Bead at the tip of the thread */}
      <m.circle
        cx={beadX}
        cy={beadY}
        r={strokeWidth * 0.95}
        style={{ fill: 'var(--gradient-shoka-button-end)', opacity: beadOpacity }}
      />
    </svg>
  );
}
