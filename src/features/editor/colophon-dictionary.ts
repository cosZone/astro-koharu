import fa6Regular from '@iconify-json/fa6-regular/icons.json';
import fa6Solid from '@iconify-json/fa6-solid/icons.json';
import gg from '@iconify-json/gg/icons.json';
import ri from '@iconify-json/ri/icons.json';
import type { ResolvedColophonConfig } from '@lib/config/colophon';
import type { BUNDLED_ICON_SETS } from '@lib/config/icon-sets';
import type { EditorColophonGroup, EditorColophonIcon } from './colophon';

interface IconSet {
  icons: Record<string, { body: string; width?: number; height?: number }>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
}

const iconSets: Record<(typeof BUNDLED_ICON_SETS)[number], IconSet> = {
  gg,
  'fa6-regular': fa6Regular,
  'fa6-solid': fa6Solid,
  ri,
};

/** Resolve `set:name` (following plain aliases) so the editor renders mark icons without network access. */
export function resolveBundledIcon(name: string): EditorColophonIcon | undefined {
  const [prefix, icon] = name.split(':');
  const set = iconSets[prefix as keyof typeof iconSets];
  if (!set || !icon) return undefined;
  let key = icon;
  for (let depth = 0; depth < 4 && !set.icons[key]; depth++) {
    const parent = set.aliases?.[key]?.parent;
    if (!parent) return undefined;
    key = parent;
  }
  const data = set.icons[key];
  if (!data) return undefined;
  return { body: data.body, width: data.width ?? set.width ?? 16, height: data.height ?? set.height ?? 16 };
}

/** Group the site dictionary for the properties panel; ungrouped marks collect under a trailing「其他」. */
export function buildEditorColophon(
  config: ResolvedColophonConfig,
  resolveIcon: (name: string) => EditorColophonIcon | undefined = resolveBundledIcon,
): EditorColophonGroup[] {
  if (!config.enabled) return [];
  const toMark = ({ id, label, description, icon }: ResolvedColophonConfig['marks'][number]) => {
    const data = resolveIcon(icon);
    return { id, label, ...(description ? { description } : {}), ...(data ? { icon: data } : {}) };
  };
  const defaultLabel = (groupId: string) =>
    config.marks.find((mark) => mark.group === groupId && config.defaults.includes(mark.id))?.label;
  const groups: EditorColophonGroup[] = config.groups.map((group) => {
    const fallback = defaultLabel(group.id);
    return {
      id: group.id,
      label: group.label,
      exclusive: group.exclusive,
      marks: config.marks.filter((mark) => mark.group === group.id).map(toMark),
      ...(fallback ? { defaultLabel: fallback } : {}),
    };
  });
  const loose = config.marks.filter((mark) => mark.group === undefined).map(toMark);
  if (loose.length) groups.push({ id: '', label: '其他', exclusive: false, marks: loose });
  return groups.filter((group) => group.marks.length);
}
