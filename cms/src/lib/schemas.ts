/**
 * CMS Form Validation Schemas
 *
 * Zod schemas for form validation in CMS components.
 * Used with react-hook-form for type-safe form handling.
 */

import { z } from 'zod';

/**
 * Schema for creating a new post
 */
export const createPostSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  categories: z.array(z.string()).optional(),
  tags: z.string().optional(),
  draft: z.boolean(),
});

/**
 * Schema for frontmatter editor
 * Note: categories and tags are stored as display strings for the form,
 * then parsed to the correct format on blur/submit.
 */
export const frontmatterSchema = z.object({
  title: z.string().min(1, '标题不能为空'),
  date: z.string().optional(),
  updated: z.string().optional(),
  description: z.string().optional(),
  categories: z.string().optional(),
  tags: z.string().optional(),
  cover: z.string().optional(),
  link: z.string().optional(),
  subtitle: z.string().optional(),
  draft: z.boolean().optional(),
  sticky: z.boolean().optional(),
  tocNumbering: z.boolean().optional(),
  excludeFromSummary: z.boolean().optional(),
  math: z.boolean().optional(),
  quiz: z.boolean().optional(),
});

/**
 * Schema for category slug validation
 */
export const categorySlugSchema = z
  .string()
  .min(1, 'Slug 不能为空')
  .regex(/^[a-z0-9-]+$/, '只允许小写字母、数字和连字符');

/**
 * Schema for category mapping dialog
 */
export const categoryMappingSchema = z.record(z.string(), categorySlugSchema);

// Type exports
export type CreatePostFormData = z.infer<typeof createPostSchema>;
export type FrontmatterFormData = z.infer<typeof frontmatterSchema>;
export type CategoryMappingFormData = z.infer<typeof categoryMappingSchema>;
