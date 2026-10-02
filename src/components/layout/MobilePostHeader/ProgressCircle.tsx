import { useMotionLevel } from '@hooks/useMotionLevel';
import { useStore } from '@nanostores/react';
import { scrollProgressEnabled } from '@store/settings';
import { type MotionValue, m, useScroll, useSpring, useTransform } from 'motion/react';
import { useId } from 'react';

interface ProgressCircleProps {
  /** Circle size in pixels (default: 28) */
  size?: number;
  /** Stroke width in pixels (default: 2) */
  strokeWidth?: number;
  /** Additional CSS classes */
  className?: string;
}

interface CircleDrawingProps extends ProgressCircleProps {
  progress: MotionValue<number>;
}

function ProgressCircleDrawing({ size = 28, strokeWidth = 2, className, progress }: CircleDrawingProps) {
  const gradientId = `progress-thread-${useId().replace(/[^\w-]/g, '')}`;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const beadX = useTransform(progress, (value) => center + radius * Math.cos(value * 2 * Math.PI));
  const beadY = useTransform(progress, (value) => center + radius * Math.sin(value * 2 * Math.PI));
  const beadOpacity = useTransform(progress, (value) => (value > 0.005 ? 1 : 0));

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
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="opacity-15"
      />
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
      <m.circle
        cx={beadX}
        cy={beadY}
        r={strokeWidth * 0.95}
        style={{ fill: 'var(--gradient-shoka-button-end)', opacity: beadOpacity }}
      />
    </svg>
  );
}

function SmoothProgressCircle({ progress, ...props }: CircleDrawingProps) {
  const springProgress = useSpring(progress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  return <ProgressCircleDrawing {...props} progress={springProgress} />;
}

function ScrollProgressCircle(props: ProgressCircleProps) {
  const shouldReduceMotion = useMotionLevel() === 'reduced';
  const { scrollYProgress } = useScroll();
  return shouldReduceMotion ? (
    <ProgressCircleDrawing {...props} progress={scrollYProgress} />
  ) : (
    <SmoothProgressCircle {...props} progress={scrollYProgress} />
  );
}

export function ProgressCircle(props: ProgressCircleProps) {
  const enabled = useStore(scrollProgressEnabled);
  return enabled ? <ScrollProgressCircle {...props} /> : null;
}
