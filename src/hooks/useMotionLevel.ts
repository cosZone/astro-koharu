import type { MotionLevel } from '@lib/config/types';
import { readMotionLevel, subscribeMotionLevel } from '@lib/motion-level';
import { useSyncExternalStore } from 'react';

const getServerSnapshot = (): MotionLevel => 'reduced';

/** Effective motion level (visitor choice capped by the OS reduced-motion preference). */
export function useMotionLevel(): MotionLevel {
  return useSyncExternalStore(subscribeMotionLevel, readMotionLevel, getServerSnapshot);
}
