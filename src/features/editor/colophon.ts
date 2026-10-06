import type { ListEdit } from './document';

export interface EditorColophonIcon {
  /** Trusted SVG inner markup from a bundled Iconify set, resolved at build time. */
  body: string;
  width: number;
  height: number;
}

export interface EditorColophonMark {
  id: string;
  label: string;
  description?: string;
  icon?: EditorColophonIcon;
}

export interface EditorColophonGroup {
  id: string;
  label: string;
  exclusive: boolean;
  marks: EditorColophonMark[];
  /** Label of the site default that applies when the post leaves this group empty. */
  defaultLabel?: string;
}

/** `'id'` and `{ id, note? }` reference the dictionary; one-off `{ icon, label }` entries have no id. */
export function colophonEntryId(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && 'id' in entry && typeof entry.id === 'string') return entry.id;
  return null;
}

export function colophonEntries(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined || value === null ? [] : [value];
}

function indicesOf(entries: unknown[], match: (id: string) => boolean): number[] {
  return entries.flatMap((entry, index) => {
    const id = colophonEntryId(entry);
    return id !== null && match(id) ? [index] : [];
  });
}

/** Toggle a non-exclusive mark: remove every reference to it, or append it as a plain id. */
export function toggleColophonMark(value: unknown, markId: string): ListEdit {
  const entries = colophonEntries(value);
  const present = indicesOf(entries, (id) => id === markId);
  return present.length ? { remove: present } : { remove: [], insert: { at: entries.length, value: markId } };
}

/** Pick one mark of an exclusive group (or none); a kept or replaced entry stays at its position. */
export function selectExclusiveColophon(value: unknown, group: EditorColophonGroup, markId: string | null): ListEdit {
  const entries = colophonEntries(value);
  const ids = new Set(group.marks.map((mark) => mark.id));
  const siblings = indicesOf(entries, (id) => ids.has(id) && id !== markId);
  if (markId === null || indicesOf(entries, (id) => id === markId).length) return { remove: siblings };
  return { remove: siblings, insert: { at: siblings[0] ?? entries.length, value: markId } };
}

/** Entries the panel cannot show: one-off marks and ids missing from the dictionary. They are never touched. */
export function customColophonCount(value: unknown, groups: readonly EditorColophonGroup[]): number {
  const known = new Set(groups.flatMap((group) => group.marks.map((mark) => mark.id)));
  return colophonEntries(value).filter((entry) => {
    const id = colophonEntryId(entry);
    return id === null || !known.has(id);
  }).length;
}
