import type { Transition } from 'motion/react';

export const microDampingPreset = {
  type: 'spring',
  damping: 24,
} satisfies Transition;

export const microReboundPreset = {
  type: 'spring',
  stiffness: 300,
  damping: 24,
} satisfies Transition;
