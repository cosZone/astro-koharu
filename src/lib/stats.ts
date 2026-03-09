/**
 * Site statistics utilities
 */

import { defaultLocale } from '../i18n/config';
import { memoize } from './content/cache';
import { getPostReadingTime, getSortedPosts } from './content/posts';

/**
 * Calculate total word count and reading time for all posts (excluding drafts in production)
 * Only counts default locale posts to avoid inflating stats with translations
 */
export async function getSiteStats() {
  return memoize('siteStats', '__default__', async () => {
    const posts = await getSortedPosts(defaultLocale);

    let totalWords = 0;
    let totalMinutes = 0;

    for (const post of posts) {
      const stats = getPostReadingTime(post);

      totalWords += stats.words;
      totalMinutes += Math.ceil(stats.minutes);
    }

    // Format word count (e.g., 871k)
    const formatWordCount = (count: number): string => {
      if (count >= 1000) {
        return `${Math.floor(count / 1000)}k`;
      }
      return count.toString();
    };

    // Format reading time (e.g., 13:12 for 13 hours 12 minutes)
    const formatReadingTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}:${mins.toString().padStart(2, '0')}`;
    };

    return {
      totalWords,
      totalMinutes,
      formattedWords: formatWordCount(totalWords),
      formattedTime: formatReadingTime(totalMinutes),
      postCount: posts.length,
    };
  });
}
