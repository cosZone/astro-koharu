import type { TransitionAnimationPair, TransitionDirectionalAnimations } from 'astro';
import { animation } from '../design-tokens';

/** Root cross-fade: the old page leaves quickly, the new one settles in slightly later. */
const softFade: TransitionAnimationPair = {
  old: { name: 'astroFadeOut', duration: '180ms', easing: animation.easing['in-quart'], fillMode: 'both' },
  new: { name: 'astroFadeIn', duration: '360ms', delay: '60ms', easing: animation.easing['out-quart'], fillMode: 'both' },
};

export const pageTransition: TransitionDirectionalAnimations = {
  forwards: softFade,
  backwards: softFade,
};
