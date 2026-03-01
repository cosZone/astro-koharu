/**
 * Site statistics utilities
 */

import { getCollection } from 'astro:content';
import readingTime from 'reading-time';
import { defaultLocale } from '../i18n/config';
import { filterPostsByLocale } from './content/locale';

/**
 * Calculate total word count and reading time for all posts (excluding drafts in production)
 * Only counts default locale posts to avoid inflating stats with translations
 */
export async function getSiteStats() {
  const allPosts = await getCollection('blog', ({ data }) => {
    // 在生产环境中，过滤掉草稿
    return import.meta.env.PROD ? data.draft !== true : true;
  });
  const posts = filterPostsByLocale(allPosts, defaultLocale);

  let totalWords = 0;
  let totalMinutes = 0;

  for (const post of posts) {
    const content = post.body || '';
    const stats = readingTime(content);

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
}
