import type { RouterItem, WritingRoomConfig } from './types';

export function normalizeEditorConfig(raw: WritingRoomConfig | undefined): Required<WritingRoomConfig> {
  if (raw !== undefined && (typeof raw !== 'object' || raw === null || Array.isArray(raw))) {
    throw new Error('Editor configuration error: "editor" must be an object.');
  }
  if (raw?.enabled !== undefined && typeof raw.enabled !== 'boolean') {
    throw new Error('Editor configuration error: "enabled" must be a boolean.');
  }
  return { enabled: raw?.enabled ?? false };
}

/** Keep existing navigation labels and positions, hiding editor links when disabled. */
export function resolveEditorNavigation(items: readonly RouterItem[], config: Required<WritingRoomConfig>): RouterItem[] {
  if (config.enabled) return [...items];
  return items.flatMap((item): RouterItem[] => {
    const path = item.path?.split(/[?#]/, 1)[0].replace(/\/+$/, '');
    if (path === '/editor' || path?.startsWith('/editor/')) return [];
    if (!item.children) return [item];
    const children = resolveEditorNavigation(item.children, config);
    if (!item.path && children.length === 0) return [];
    return [{ ...item, children }];
  });
}
