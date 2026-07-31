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
 * child-bearing siblings at each of those levels — the accordion effect.
 *
 * Returns `currentExpanded` unchanged (same reference) when there is nothing to
 * reveal, so React can bail out of the update.
 */
export function revealPath(headings: Heading[], targetId: string, currentExpanded: Set<string>): Set<string> {
  const target = findHeadingById(headings, targetId);
  if (!target) return currentExpanded;

  const path = getParentIds(target);
  if (target.children.length > 0) path.unshift(target.id);
  if (path.length === 0) return currentExpanded;

  const next = new Set(currentExpanded);
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
