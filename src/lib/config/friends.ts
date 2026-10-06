import type { FriendGroup, FriendLink } from './types';

export interface FriendSection {
  group: FriendGroup | null;
  friends: FriendLink[];
}

export function normalizeFriendGroups(raw: unknown): FriendGroup[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error('Friends configuration error: groups must be an array.');

  const ids = new Set<string>();
  return raw.map((value, index) => {
    if (typeof value !== 'object' || value === null) {
      throw new Error(`Friends configuration error: group at index ${index} must be an object.`);
    }
    const { id, title, description } = value;
    if (typeof id !== 'string' || !id.trim() || typeof title !== 'string' || !title.trim()) {
      throw new Error(`Friends configuration error: group at index ${index} needs a non-empty id and title.`);
    }
    if (description !== undefined && typeof description !== 'string') {
      throw new Error(`Friends configuration error: description of group "${id}" must be a string.`);
    }
    const normalizedId = id.trim();
    if (normalizedId === 'all' || normalizedId === 'ungrouped') {
      throw new Error(`Friends configuration error: group id "${normalizedId}" is reserved.`);
    }
    if (ids.has(normalizedId)) throw new Error(`Friends configuration error: duplicate group id "${normalizedId}".`);
    ids.add(normalizedId);
    return { id: normalizedId, title: title.trim(), ...(description !== undefined ? { description } : {}) };
  });
}

/** Keep missing or unknown group assignments visible instead of dropping links. */
export function groupFriendLinks(friends: readonly FriendLink[], groups: readonly FriendGroup[]): FriendSection[] {
  const sections: FriendSection[] = groups.map((group) => ({ group, friends: [] }));
  const byId = new Map(sections.map((section) => [section.group?.id, section]));
  const ungrouped: FriendSection = { group: null, friends: [] };
  for (const friend of friends) {
    const section = (friend.group ? byId.get(friend.group) : undefined) ?? ungrouped;
    section.friends.push(friend);
  }
  if (ungrouped.friends.length > 0 || sections.length === 0) sections.push(ungrouped);
  return sections;
}
