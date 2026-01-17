import { defineCollection, z } from 'astro:content';
import type { BlogSchema } from 'types/blog';

const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    link: z.string().optional(),
    date: z.date(),
    updated: z.date().optional(),
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(),
    // 兼容老 Hexo 博客
    subtitle: z.string().optional(),
    catalog: z.boolean().optional(),
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
  }) satisfies z.ZodType<BlogSchema>,
});

export const collections = {
  blog: blogCollection,
};
