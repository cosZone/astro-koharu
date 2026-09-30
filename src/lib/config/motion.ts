/**
 * Motion configuration normalization.
 *
 * Single source of truth for `motion:` defaults in `config/site.yaml`.
 * Defaults are applied per field, so a partial YAML section keeps the defaults
 * for every field it does not mention.
 */

import type { MotionConfig, MotionLevel, ResolvedMotionConfig } from './types';

export const MOTION_LEVELS: readonly MotionLevel[] = ['lively', 'subtle', 'reduced'];

export const MOTION_DEFAULTS: ResolvedMotionConfig = {
  level: 'lively',
  heroPetals: true,
  clickBurst: true,
};

export function isMotionLevel(value: unknown): value is MotionLevel {
  return MOTION_LEVELS.includes(value as MotionLevel);
}

/**
 * Resolve the raw `motion:` YAML section into a fully populated config.
 * Values of the wrong type fall back to the default for that field.
 */
export function normalizeMotionConfig(raw?: Partial<MotionConfig> | null): ResolvedMotionConfig {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    level: isMotionLevel(source.level) ? source.level : MOTION_DEFAULTS.level,
    heroPetals: typeof source.heroPetals === 'boolean' ? source.heroPetals : MOTION_DEFAULTS.heroPetals,
    clickBurst: typeof source.clickBurst === 'boolean' ? source.clickBurst : MOTION_DEFAULTS.clickBurst,
  };
}
