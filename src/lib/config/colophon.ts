/**
 * Colophon (落款) configuration normalization.
 *
 * `colophon:` in `config/site.yaml` defines a dictionary of marks a post can carry
 * (how it was written, image sources, reading notices, …). Groups and marks are
 * YAML maps so their key order is the display order.
 */

import { BUNDLED_ICON_SETS, isBundledIcon } from './icon-sets';

export const COLOPHON_PLACEMENTS = ['meta', 'banner', 'seal', 'card'] as const;
export type ColophonPlacement = (typeof COLOPHON_PLACEMENTS)[number];

export const COLOPHON_TONES = ['muted', 'accent', 'warn'] as const;
export type ColophonTone = (typeof COLOPHON_TONES)[number];

/** Placement used when neither the mark nor its group sets one. */
export const DEFAULT_COLOPHON_PLACEMENT: readonly ColophonPlacement[] = ['meta', 'seal'];

export interface ColophonGroup {
  id: string;
  label: string;
  /** A post may carry at most one mark of an exclusive group. */
  exclusive: boolean;
  placement: ColophonPlacement[];
}

export interface ColophonMark {
  id: string;
  group?: string;
  /** Iconify name from a bundled set, e.g. `ri:quill-pen-line`. */
  icon: string;
  label: string;
  description?: string;
  tone: ColophonTone;
  placement: ColophonPlacement[];
}

export interface ResolvedColophonConfig {
  enabled: boolean;
  groups: ColophonGroup[];
  marks: ColophonMark[];
  /** Mark ids added to posts that carry no mark of the same group; `colophon: []` opts a post out. */
  defaults: string[];
}

/** Locale overrides from `config/i18n-content.yaml` → `<locale>.colophon`. */
export interface ColophonContentTranslation {
  groups?: Record<string, string>;
  marks?: Record<string, { label?: string; description?: string }>;
}

const DISABLED: ResolvedColophonConfig = { enabled: false, groups: [], marks: [], defaults: [] };

function fail(message: string): never {
  throw new Error(`Colophon configuration error: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(value: unknown, where: string): string {
  if (typeof value !== 'string' || !value.trim()) fail(`${where} must be a non-empty string.`);
  return value.trim();
}

function optionalText(value: unknown, where: string): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') fail(`${where} must be a string.`);
  return value.trim() || undefined;
}

export function assertBundledIcon(icon: string, where: string): void {
  if (!isBundledIcon(icon)) {
    fail(
      `${where} "${icon}" is not available. Use "set:name" from one of: ${BUNDLED_ICON_SETS.join(', ')} ` +
        '(or install @iconify-json/<set> and add it to src/lib/config/icon-sets.ts).',
    );
  }
}

export function normalizePlacement(value: unknown, where: string): ColophonPlacement[] | undefined {
  if (value === undefined || value === null) return undefined;
  const list = Array.isArray(value) ? value : [value];
  for (const item of list) {
    if (!COLOPHON_PLACEMENTS.includes(item as ColophonPlacement)) {
      fail(`${where} "${String(item)}" must be one of: ${COLOPHON_PLACEMENTS.join(', ')}.`);
    }
  }
  return [...new Set(list as ColophonPlacement[])];
}

export function normalizeTone(value: unknown, where: string): ColophonTone {
  if (value === undefined || value === null) return 'muted';
  if (!COLOPHON_TONES.includes(value as ColophonTone)) fail(`${where} must be one of: ${COLOPHON_TONES.join(', ')}.`);
  return value as ColophonTone;
}

function normalizeGroups(raw: unknown): ColophonGroup[] {
  if (raw === undefined || raw === null) return [];
  if (!isRecord(raw)) fail('"groups" must be a map of group id → settings.');
  return Object.entries(raw).map(([id, value]) => {
    const where = `group "${id}"`;
    if (!isRecord(value)) fail(`${where} must be an object.`);
    if (value.exclusive !== undefined && typeof value.exclusive !== 'boolean') fail(`${where} "exclusive" must be a boolean.`);
    return {
      id,
      label: requireText(value.label, `${where} "label"`),
      exclusive: value.exclusive ?? false,
      placement: normalizePlacement(value.placement, `${where} placement`) ?? [...DEFAULT_COLOPHON_PLACEMENT],
    };
  });
}

/**
 * Resolve the raw `colophon:` YAML section.
 * Omitting the section, or `enabled: false`, disables every colophon surface.
 */
export function normalizeColophonConfig(raw: unknown): ResolvedColophonConfig {
  if (raw === undefined || raw === null) return DISABLED;
  if (!isRecord(raw)) fail('"colophon" must be an object.');
  if (raw.enabled !== undefined && typeof raw.enabled !== 'boolean') fail('"enabled" must be a boolean.');
  if (raw.enabled === false) return DISABLED;

  const groups = normalizeGroups(raw.groups);
  const groupById = new Map(groups.map((group) => [group.id, group]));

  if (raw.marks !== undefined && raw.marks !== null && !isRecord(raw.marks))
    fail('"marks" must be a map of mark id → settings.');
  const marks = Object.entries(raw.marks ?? {}).map(([id, value]): ColophonMark => {
    const where = `mark "${id}"`;
    if (!isRecord(value)) fail(`${where} must be an object.`);
    const groupId = optionalText(value.group, `${where} "group"`);
    const group = groupId === undefined ? undefined : groupById.get(groupId);
    if (groupId !== undefined && !group) fail(`${where} refers to unknown group "${groupId}".`);
    const icon = requireText(value.icon, `${where} "icon"`);
    assertBundledIcon(icon, `${where} icon`);
    const description = optionalText(value.description, `${where} "description"`);
    return {
      id,
      ...(groupId !== undefined ? { group: groupId } : {}),
      icon,
      label: requireText(value.label, `${where} "label"`),
      ...(description !== undefined ? { description } : {}),
      tone: normalizeTone(value.tone, `${where} "tone"`),
      placement: normalizePlacement(value.placement, `${where} placement`) ??
        group?.placement ?? [...DEFAULT_COLOPHON_PLACEMENT],
    };
  });

  return { enabled: true, groups, marks, defaults: normalizeDefaults(raw.defaults, marks) };
}

function normalizeDefaults(raw: unknown, marks: readonly ColophonMark[]): string[] {
  if (raw === undefined || raw === null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const markById = new Map(marks.map((mark) => [mark.id, mark]));
  const groupsTaken = new Set<string>();
  const defaults: string[] = [];
  for (const value of list) {
    const id = requireText(value, '"defaults" entry');
    const mark = markById.get(id);
    if (!mark) fail(`"defaults" refers to unknown mark "${id}".`);
    if (defaults.includes(id)) continue;
    if (mark.group !== undefined) {
      if (groupsTaken.has(mark.group)) fail(`"defaults" has more than one mark of group "${mark.group}".`);
      groupsTaken.add(mark.group);
    }
    defaults.push(id);
  }
  return defaults;
}

/** Apply locale overrides; missing keys keep the default-locale text. */
export function localizeColophonConfig(
  config: ResolvedColophonConfig,
  translation: ColophonContentTranslation | undefined,
): ResolvedColophonConfig {
  if (!translation) return config;
  return {
    ...config,
    groups: config.groups.map((group) => ({ ...group, label: translation.groups?.[group.id] ?? group.label })),
    marks: config.marks.map((mark) => {
      const override = translation.marks?.[mark.id];
      if (!override) return mark;
      const description = override.description ?? mark.description;
      return {
        ...mark,
        label: override.label ?? mark.label,
        ...(description !== undefined ? { description } : {}),
      };
    }),
  };
}
