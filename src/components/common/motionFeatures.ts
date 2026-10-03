import { isMotionDisabled, subscribeMotionLevel } from '@lib/motion-level';
import { domMax, visualElementStore } from 'motion/react';

if (typeof document !== 'undefined') {
  subscribeMotionLevel(() => {
    if (!isMotionDisabled()) return;
    // Motion ignores transition-only updates for unchanged targets. Complete its active
    // value and layout animations as well, preserving completion callbacks and final styles.
    for (const element of document.querySelectorAll('*')) {
      const visual = visualElementStore.get(element);
      visual?.values.forEach((value) => {
        value.animation?.complete();
      });
      visual?.projection?.finishAnimation();
    }
  });
}

export default domMax;
