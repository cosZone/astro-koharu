import { formatInTimeZone } from 'date-fns-tz';

type DatedPost = { data: { date: Date } };

/** Calendar buckets use the site's timezone, independent of the build machine's timezone. */
export function bucketPostsByMonth<T extends DatedPost>(posts: readonly T[], timezone: string) {
  const buckets = new Map<string, T[]>();
  for (const post of posts) {
    const key = formatInTimeZone(post.data.date, timezone, 'yyyy-MM');
    const bucket = buckets.get(key) ?? [];
    bucket.push(post);
    buckets.set(key, bucket);
  }
  return [...buckets]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, items]) => ({
      key,
      year: Number(key.slice(0, 4)),
      month: Number(key.slice(5)),
      posts: items.toSorted((a, b) => b.data.date.getTime() - a.data.date.getTime()),
    }));
}

export function groupPostsByYear<T extends DatedPost>(posts: readonly T[], timezone: string) {
  const years = new Map<number, T[]>();
  for (const bucket of bucketPostsByMonth(posts, timezone)) {
    years.set(bucket.year, [...(years.get(bucket.year) ?? []), ...bucket.posts]);
  }
  return [...years].map(([year, items]) => ({ year, posts: items }));
}

/**
 * Empty months have tier 0. Occupied months are tiered on a log scale against the peak, so one
 * burst month (a 30-post sprint) does not flatten every ordinary month into the palest tier.
 */
export function monthIntensity(count: number, peak: number): number {
  if (count <= 0 || peak <= 0) return 0;
  if (count >= peak) return 4;
  const weight = Math.log1p(count) / Math.log1p(peak);
  return weight >= 0.7 ? 4 : weight >= 0.5 ? 3 : weight >= 0.35 ? 2 : 1;
}
