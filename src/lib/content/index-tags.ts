/** Quantiles of repeated tags; ties always share a tier and singleton tags stay quiet. */
export function tierTags(tags: Readonly<Record<string, number>>) {
  const repeated = Object.values(tags)
    .filter((count) => count > 1)
    .sort((a, b) => a - b);
  const minimum = repeated[0];
  const maximum = repeated.at(-1);
  const cuts = [0.25, 0.5, 0.75].map((quantile) => repeated[Math.max(0, Math.ceil(repeated.length * quantile) - 1)]);
  return Object.entries(tags)
    .filter(([, count]) => count > 0)
    .map(([tag, count]) => {
      const tier =
        count === 1 ? 0 : minimum === maximum ? 2 : count === maximum ? 4 : 1 + cuts.filter((cut) => count > cut).length;
      return { tag, count, tier };
    })
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
