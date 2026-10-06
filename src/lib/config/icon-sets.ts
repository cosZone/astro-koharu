/**
 * Iconify collections bundled by astro-icon at build time.
 *
 * astro-icon only resolves icons from these sets, so config-provided icon names
 * (e.g. colophon marks) are validated against this list. Adding a set requires
 * installing `@iconify-json/<set>` as well.
 */
export const BUNDLED_ICON_SETS = ['gg', 'fa6-regular', 'fa6-solid', 'ri'] as const;

/** Whether `name` looks like `set:icon` with a set that astro-icon can render. */
export function isBundledIcon(name: string): boolean {
  const [set, icon, ...rest] = name.split(':');
  return rest.length === 0 && Boolean(icon) && (BUNDLED_ICON_SETS as readonly string[]).includes(set);
}
