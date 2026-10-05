/**
 * Tiers come from a log scale against the most used tag: a handful of staple tags stand out,
 * the long tail stays calm, and singleton tags (tier 0) are left for the collapsed list.
 */
export function tagTier(count: number, max: number): number {
  if (count <= 1) return 0;
  if (count >= max) return 4;
  const weight = Math.log(count) / Math.log(max);
  return weight >= 0.8 ? 4 : weight >= 0.6 ? 3 : weight >= 0.35 ? 2 : 1;
}

export function tierTags(tags: Readonly<Record<string, number>>) {
  const max = Math.max(0, ...Object.values(tags));
  return Object.entries(tags)
    .filter(([, count]) => count > 0)
    .map(([tag, count]) => ({ tag, count, tier: tagTier(count, max) }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
