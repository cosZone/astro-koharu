/**
 * Animation Types
 *
 * This file contains Motion-related types and animation configuration types.
 */

import type { Variant } from 'motion/react';

/**
 * Spring animation configuration
 */
export interface SpringConfig {
  type: 'spring';
  stiffness: number;
  damping: number;
  mass?: number;
}

/**
 * Animation direction for slide animations
 */
export type AnimationDirection = 'left' | 'right' | 'top' | 'bottom';

/**
 * Animation trigger type
 */
export type AnimationTrigger = 'mount' | 'scroll' | 'hover' | 'manual';

/**
 * Common animation variants
 */
export type AnimationVariantName = 'fade' | 'slide' | 'scale' | 'rotate' | 'expand';

/**
 * Motion variant configuration
 */
export interface MotionVariants {
  initial: Variant;
  animate: Variant;
  exit?: Variant;
}

/**
 * Animation timing configuration
 */
export interface AnimationTiming {
  /** Duration in seconds */
  duration: number;
  /** Delay in seconds */
  delay?: number;
  /** Easing function */
  ease?: string | number[];
}

/**
 * FadeIn component props
 */
export interface FadeInProps {
  /** Children to animate */
  children: React.ReactNode;
  /** Animation delay (seconds) */
  delay?: number;
  /** Animation duration (seconds) */
  duration?: number;
  /** Trigger type */
  trigger?: 'mount' | 'scroll';
  /** Custom className */
  className?: string;
}

/**
 * SlideIn component props
 */
export interface SlideInProps extends FadeInProps {
  /** Slide direction */
  direction?: AnimationDirection;
  /** Slide distance (pixels) */
  distance?: number;
}

/**
 * Expand component props
 */
export interface ExpandProps {
  /** Children to animate */
  children: React.ReactNode;
  /** Whether expanded */
  isExpanded: boolean;
  /** Animation duration (seconds) */
  duration?: number;
  /** Custom className */
  className?: string;
}

/**
 * Stagger component props
 */
export interface StaggerProps {
  /** Children to stagger */
  children: React.ReactNode;
  /** Stagger delay between children (seconds) */
  staggerDelay?: number;
  /** Custom className */
  className?: string;
}

/**
 * Spring preset names
 */
export type SpringPreset = 'default' | 'gentle' | 'wobbly' | 'stiff' | 'slow' | 'micro' | 'microRebound';
