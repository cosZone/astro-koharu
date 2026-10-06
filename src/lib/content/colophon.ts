/**
 * Resolve a post's `colophon` frontmatter against the site's mark dictionary.
 *
 * Pure: unknown ids, exclusive-group conflicts and unusable one-off icons are
 * reported as warnings instead of failing the build, so removing a mark from
 * `config/site.yaml` never breaks older posts.
 */

import {
  assertBundledIcon,
  type ColophonGroup,
  type ColophonMark,
  type ColophonPlacement,
  type ColophonTone,
  DEFAULT_COLOPHON_PLACEMENT,
  normalizePlacement,
  normalizeTone,
  type ResolvedColophonConfig,
} from '../config/colophon';

/** Frontmatter entry: a mark id, a mark id with a note, or a one-off mark. */
export type ColophonEntry =
  | string
  | { id: string; note?: string }
  | {
      icon: string;
      label: string;
      description?: string;
      note?: string;
      tone?: ColophonTone;
      placement?: ColophonPlacement | ColophonPlacement[];
    };

export interface ColophonItem {
  /** Dictionary id, or `custom-<index>` for one-off marks. */
  id: string;
  custom: boolean;
  group?: ColophonGroup;
  icon: string;
  label: string;
  description?: string;
  /** Per-post sentence written next to the mark. */
  note?: string;
  tone: ColophonTone;
  placement: ColophonPlacement[];
}

export interface ResolvedPostColophon {
  items: ColophonItem[];
  warnings: string[];
}

export const FALLBACK_COLOPHON_ICON = 'ri:bookmark-line';

function cleanNote(note: unknown): string | undefined {
  return typeof note === 'string' && note.trim() ? note.trim() : undefined;
}

export function resolvePostColophon(
  entries: readonly ColophonEntry[] | undefined,
  config: ResolvedColophonConfig,
): ResolvedPostColophon {
  const items: ColophonItem[] = [];
  const warnings: string[] = [];
  // `colophon: []` is an explicit opt-out, including from site defaults.
  if (!config.enabled || entries?.length === 0) return { items, warnings };

  const markById = new Map(config.marks.map((mark) => [mark.id, mark]));
  const groupById = new Map(config.groups.map((group) => [group.id, group]));
  const seen = new Set<string>();
  const takenExclusive = new Map<string, string>();
  const toItem = (mark: ColophonMark, note?: string): ColophonItem => {
    const group = mark.group ? groupById.get(mark.group) : undefined;
    return {
      id: mark.id,
      custom: false,
      ...(group ? { group } : {}),
      icon: mark.icon,
      label: mark.label,
      ...(mark.description !== undefined ? { description: mark.description } : {}),
      ...(note !== undefined ? { note } : {}),
      tone: mark.tone,
      placement: mark.placement,
    };
  };

  (entries ?? []).forEach((entry, index) => {
    if (typeof entry === 'string' || 'id' in entry) {
      const id = typeof entry === 'string' ? entry.trim() : entry.id.trim();
      const mark = markById.get(id);
      if (!mark) {
        warnings.push(`unknown colophon mark "${id}" was skipped`);
        return;
      }
      if (seen.has(id)) return;
      const group = mark.group ? groupById.get(mark.group) : undefined;
      if (group?.exclusive) {
        const taken = takenExclusive.get(group.id);
        if (taken) {
          warnings.push(`"${id}" was skipped: group "${group.id}" is exclusive and already has "${taken}"`);
          return;
        }
        takenExclusive.set(group.id, id);
      }
      seen.add(id);
      items.push(toItem(mark, typeof entry === 'string' ? undefined : cleanNote(entry.note)));
      return;
    }

    const label = typeof entry.label === 'string' ? entry.label.trim() : '';
    if (!label) {
      warnings.push(`one-off colophon mark at index ${index} has no label and was skipped`);
      return;
    }
    let icon = typeof entry.icon === 'string' ? entry.icon.trim() : '';
    try {
      assertBundledIcon(icon, `one-off mark "${label}" icon`);
    } catch (error) {
      warnings.push((error as Error).message);
      icon = FALLBACK_COLOPHON_ICON;
    }
    let tone: ColophonTone = 'muted';
    let placement = [...DEFAULT_COLOPHON_PLACEMENT];
    try {
      tone = normalizeTone(entry.tone, `one-off mark "${label}" tone`);
      placement = normalizePlacement(entry.placement, `one-off mark "${label}" placement`) ?? placement;
    } catch (error) {
      warnings.push((error as Error).message);
    }
    const description = cleanNote(entry.description);
    const note = cleanNote(entry.note);
    items.push({
      id: `custom-${index}`,
      custom: true,
      icon,
      label,
      ...(description !== undefined ? { description } : {}),
      ...(note !== undefined ? { note } : {}),
      tone,
      placement,
    });
  });

  // Defaults fill groups the post left empty and go first, ahead of the post's own marks.
  const fills = config.defaults.flatMap((id) => {
    const mark = markById.get(id);
    if (!mark || seen.has(id)) return [];
    if (mark.group !== undefined && items.some((item) => item.group?.id === mark.group)) return [];
    return [toItem(mark)];
  });

  return { items: [...fills, ...items], warnings };
}

export function colophonItemsAt(items: readonly ColophonItem[], placement: ColophonPlacement): ColophonItem[] {
  return items.filter((item) => item.placement.includes(placement));
}

/** Dictionary mark ids carried by a post, for list filtering (one-off marks are not filterable). */
export function colophonMarkIds(items: readonly ColophonItem[]): string[] {
  return items.filter((item) => !item.custom).map((item) => item.id);
}
