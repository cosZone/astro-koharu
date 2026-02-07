import { defineCollection, z } from 'astro:content';
import { parseDateInSiteTimezone, reinterpretUtcAsTimezone } from '@lib/date';
import type { BlogSchema, BlogSchemaInput } from 'types/blog';

/**
 * Custom date schema that parses date strings in the site's configured timezone.
 * This ensures consistent date handling regardless of build environment.
 *
 * Accepts:
 * - Date objects (reinterpreted from UTC to site timezone, since gray-matter
 *   incorrectly parses "2025-12-29 21:55:00" as UTC)
 * - Date strings like "2025-12-29 21:55:00" (parsed as site timezone)
 * - ISO strings like "2025-12-29T21:55:00+08:00" (parsed correctly with offset)
 */
const dateInSiteTimezone = z
  .string()
  .or(z.date())
  .transform((val) => {
    if (val instanceof Date) {
      // gray-matter has already parsed the date string as UTC, but user intended site timezone.
      // Reinterpret the UTC values as site timezone to get correct timestamp.
      return reinterpretUtcAsTimezone(val);
    }
    return parseDateInSiteTimezone(val);
  });

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
    date: dateInSiteTimezone,
    updated: dateInSiteTimezone.optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // 兼容老 Hexo 博客
    subtitle: z.string().optional(),
    catalog: z.boolean().optional().default(true),
    categories: z
      .array(z.string())
      .or(z.array(z.array(z.string())))
      .optional(),
    sticky: z.boolean().optional(),
    draft: z.boolean().optional(),
    // 目录编号控制
    tocNumbering: z.boolean().optional().default(true),
    // 排除 AI 摘要生成
    excludeFromSummary: z.boolean().optional(),
    // Shoka features per-post toggle
    math: z.boolean().optional(),
    quiz: z.boolean().optional(),
  }) satisfies z.ZodType<BlogSchema, z.ZodTypeDef, BlogSchemaInput>,
});

export const collections = {
  blog: blogCollection,
};
