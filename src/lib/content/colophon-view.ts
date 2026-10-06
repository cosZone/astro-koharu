/**
 * Pure view models for colophon surfaces: the end-of-article seal rows and the archive mark filter.
 */

import type { ColophonMark } from '../config/colophon';
import type { ColophonItem } from './colophon';

export interface ColophonSealRow {
  /** Group label; absent for ungrouped and one-off marks. */
  label?: string;
  marks: { label: string; note?: string }[];
}

/** One row per group in first-appearance order; ungrouped and one-off marks share a trailing unlabeled row. */
export function colophonSealRows(items: readonly ColophonItem[]): ColophonSealRow[] {
  const grouped = new Map<string, ColophonSealRow>();
  const loose: ColophonSealRow = { marks: [] };
  for (const item of items) {
    const mark = { label: item.label, ...(item.note !== undefined ? { note: item.note } : {}) };
    if (!item.group) {
      loose.marks.push(mark);
      continue;
    }
    const row = grouped.get(item.group.id) ?? { label: item.group.label, marks: [] };
    row.marks.push(mark);
    grouped.set(item.group.id, row);
  }
  return [...grouped.values(), ...(loose.marks.length ? [loose] : [])];
}

export interface ColophonFilterChip {
  id: string;
  icon: string;
  label: string;
  count: number;
}

/** Dictionary marks carried by at least one listed post, in dictionary order, with post counts. */
export function colophonFilterChips(
  marks: readonly ColophonMark[],
  postMarkIds: readonly (readonly string[])[],
): ColophonFilterChip[] {
  const counts = new Map<string, number>();
  for (const ids of postMarkIds) {
    for (const id of new Set(ids)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return marks
    .filter((mark) => counts.has(mark.id))
    .map((mark) => ({ id: mark.id, icon: mark.icon, label: mark.label, count: counts.get(mark.id) ?? 0 }));
}

/** The `?mark=` value when it names an available chip, otherwise `''` (no filter). */
export function resolveMarkFilter(param: string | null | undefined, available: readonly string[]): string {
  const id = param?.trim() ?? '';
  return available.includes(id) ? id : '';
}

/** Whether a row's space-separated `data-colophon` ids contain `mark`; an empty filter matches every row. */
export function rowHasMark(rowMarks: string | undefined, mark: string): boolean {
  return mark === '' || (rowMarks?.split(' ').includes(mark) ?? false);
}
