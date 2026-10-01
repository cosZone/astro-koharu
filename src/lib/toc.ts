/**
 * Table of contents domain logic — pure, DOM-free.
 *
 * Holds the heading tree shape, its traversal helpers and the accordion
 * reveal algorithm shared by the sidebar TOC and the mobile TOC dropdown.
 */

export interface Heading {
  id: string;
  text: string;
  level: number;
  children: Heading[];
  parent?: Heading;
}

/** Data the heading observer reports for the heading currently under the offset line */
export interface ObservedHeading {
  id: string;
  text: string;
  level: number;
}

/** Everything a TOC tree needs to render itself, shared through React context */
export interface TocContextValue {
  activeId: string;
  expandedIds: Set<string>;
  onHeadingClick: (id: string) => void;
}

/** Build a hierarchical tree from a flat, document-ordered heading list */
export function buildHeadingTree(flatHeadings: Array<{ id: string; text: string; level: number }>): Heading[] {
  const tree: Heading[] = [];
  const stack: Heading[] = [];

  for (const heading of flatHeadings) {
    const node: Heading = { ...heading, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      tree.push(node);
    } else {
      const parent = stack[stack.length - 1];
      parent.children.push(node);
      node.parent = parent;
    }

    stack.push(node);
  }

  return tree;
}

/** Find a heading by ID anywhere in the tree */
export function findHeadingById(headings: Heading[], id: string): Heading | null {
  for (const heading of headings) {
    if (heading.id === id) return heading;
    const found = findHeadingById(heading.children, id);
    if (found) return found;
  }
  return null;
}

/** Ancestor IDs of a heading, nearest parent first */
export function getParentIds(heading: Heading): string[] {
  const parentIds: string[] = [];
  let current = heading.parent;
  while (current) {
    parentIds.push(current.id);
    current = current.parent;
  }
  return parentIds;
}

/** Sibling IDs that own children (the only ones an accordion can collapse) */
export function getSiblingIds(target: Heading, allHeadings: Heading[]): string[] {
  const pool = target.parent ? target.parent.children : allHeadings;
  return pool.filter((heading) => heading.id !== target.id && heading.children.length > 0).map((heading) => heading.id);
}

function hasSameMembers(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

/**
 * Expanded-set transition that reveals `targetId`: opens every ancestor on its
 * path (plus the target itself when it has children) and collapses the
 * child-bearing siblings at each of those levels — the accordion effect. A
 * childless top-level target opens nothing but still closes the other
 * chapters, so only the current chapter is ever unfolded.
 *
 * Returns `currentExpanded` unchanged (same reference) when nothing changes,
 * so React can bail out of the update.
 */
export function revealPath(headings: Heading[], targetId: string, currentExpanded: Set<string>): Set<string> {
  const target = findHeadingById(headings, targetId);
  if (!target) return currentExpanded;

  const path = getParentIds(target);
  if (target.children.length > 0) path.unshift(target.id);

  const next = new Set(currentExpanded);
  if (path.length === 0) {
    for (const siblingId of getSiblingIds(target, headings)) next.delete(siblingId);
  }
  for (const id of path) {
    const node = findHeadingById(headings, id);
    if (!node) continue;
    for (const siblingId of getSiblingIds(node, headings)) {
      next.delete(siblingId);
    }
    next.add(id);
  }

  return hasSameMembers(next, currentExpanded) ? currentExpanded : next;
}

/** IDs of every heading that owns children — the initial set when `defaultExpanded` is on */
export function collectExpandableIds(headings: Heading[]): Set<string> {
  const ids = new Set<string>();
  const walk = (nodes: Heading[]) => {
    for (const node of nodes) {
      if (node.children.length > 0) ids.add(node.id);
      walk(node.children);
    }
  };
  walk(headings);
  return ids;
}

/** Every heading in document order */
export function flattenHeadings(headings: Heading[]): Heading[] {
  return headings.flatMap((heading) => [heading, ...flattenHeadings(heading.children)]);
}

/** Number shown beside a TOC entry: "01" for a chapter, "6.1" below it, "" for an unnumbered heading */
export function tocNumberLabel(numberPath: number[]): string {
  if (numberPath.length === 0) return '';
  return numberPath.length === 1 ? String(numberPath[0]).padStart(2, '0') : numberPath.join('.');
}

/**
 * Drops a heading's own leading ordinal ("1. ", "2、", "3) ", "1.总结") when it repeats the number
 * the TOC already shows beside it, so an entry never reads "6.1 1. …". A dot or colon only counts
 * before a space or CJK text, so "1.5 版本", "2.x 迁移", "3.js" and "2:30" keep their number.
 */
export function stripRepeatedOrdinal(text: string, ordinal: number): string {
  const match = new RegExp(
    `^\\s*${ordinal}(?:[.．:：](?=\\s|\\p{sc=Han}|\\p{sc=Hiragana}|\\p{sc=Katakana}|\\p{sc=Hangul})|[、)）])\\s*`,
    'u',
  ).exec(text);
  if (!match) return text;
  const rest = text.slice(match[0].length);
  return rest.trim() ? rest : text;
}

/** 1-based position of the top-level section containing `id`, or 0 when the tree has no such heading */
export function chapterIndexOf(headings: Heading[], id: string): number {
  return headings.findIndex((heading) => heading.id === id || findHeadingById(heading.children, id) !== null) + 1;
}

export interface ReadingPosition {
  /** Index into the section list, -1 while the line is above the first section */
  index: number;
  /** Fraction of the current section above the reading line, 0–1 */
  progress: number;
}

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

/**
 * Document-space y of the reading line. It rides `offsetTop` below the viewport top, then sweeps
 * down to the viewport bottom over the last screen of scroll: the closing sections of a page may
 * never reach the offset line, and they should still read to the end.
 */
export function readingLineAt(scrollY: number, viewportHeight: number, maxScrollY: number, offsetTop: number): number {
  const sweep = Math.min(viewportHeight, maxScrollY);
  const reach = sweep > 0 ? clamp01((scrollY - (maxScrollY - sweep)) / sweep) : 1;
  return scrollY + offsetTop + reach * (viewportHeight - offsetTop);
}

/** Locate `line` among consecutive sections that open at `starts` (ascending) and close at `end` */
export function locateReading(starts: number[], end: number, line: number): ReadingPosition {
  let index = -1;
  while (index + 1 < starts.length && starts[index + 1] <= line) index++;
  if (index < 0) return { index, progress: 0 };

  const start = starts[index];
  const span = (starts[index + 1] ?? end) - start;
  return { index, progress: span > 0 ? clamp01((line - start) / span) : 1 };
}
