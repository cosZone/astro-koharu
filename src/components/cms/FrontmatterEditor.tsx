/**
 * FrontmatterEditor Component
 *
 * A form editor for blog post frontmatter.
 * Uses react-hook-form with Zod validation.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { type FrontmatterFormData, frontmatterSchema } from '@lib/cms';
import { cn } from '@lib/utils';
import { format } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { BlogSchema } from '@/types/blog';

interface FrontmatterEditorProps {
  frontmatter: BlogSchema;
  onChange: (frontmatter: BlogSchema) => void;
}

/**
 * Formats categories for display
 * ['工具'] -> '工具'
 * [['笔记', '前端']] -> '笔记 > 前端'
 */
function formatCategoryDisplay(categories?: string[] | string[][]): string {
  if (!categories || categories.length === 0) return '';

  // Handle nested array format [['笔记', '前端']]
  const first = categories[0];
  if (Array.isArray(first)) {
    return first.join(' > ');
  }

  // Handle flat array format ['笔记', '前端']
  return categories.join(' > ');
}

/**
 * Parses category input string back to the correct format
 * '工具' -> ['工具']
 * '笔记 > 前端' -> [['笔记', '前端']]
 * '笔记>前端' -> [['笔记', '前端']] (tolerant parsing)
 */
function parseCategoryInput(input: string): string[] | string[][] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  // Check if contains '>' (with or without spaces around it)
  if (trimmed.includes('>')) {
    // Split by '>' with optional surrounding spaces
    const parts = trimmed
      .split(/\s*>\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    // Return as nested array format [['笔记', '前端']]
    return [parts];
  }

  // Simple single-level category ['工具']
  return [trimmed];
}

/**
 * Convert BlogSchema to form data format
 */
function toFormData(fm: BlogSchema): FrontmatterFormData {
  return {
    title: fm.title,
    date: fm.date ? format(fm.date, "yyyy-MM-dd'T'HH:mm") : undefined,
    updated: fm.updated ? format(fm.updated, "yyyy-MM-dd'T'HH:mm") : undefined,
    description: fm.description || undefined,
    categories: formatCategoryDisplay(fm.categories),
    tags: fm.tags?.join(', ') || undefined,
    cover: fm.cover || undefined,
    link: fm.link || undefined,
    subtitle: fm.subtitle || undefined,
    draft: fm.draft || false,
    sticky: fm.sticky || false,
    catalog: fm.catalog !== false,
    tocNumbering: fm.tocNumbering !== false,
    excludeFromSummary: fm.excludeFromSummary || false,
  };
}

/**
 * Convert form data back to BlogSchema format
 */
function toBlogSchema(data: FrontmatterFormData, originalDate: Date): BlogSchema {
  const tags = data.tags
    ?.split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const categories = data.categories ? parseCategoryInput(data.categories) : undefined;

  return {
    title: data.title,
    date: data.date ? new Date(data.date) : originalDate,
    updated: data.updated ? new Date(data.updated) : undefined,
    description: data.description || undefined,
    categories: categories && categories.length > 0 ? categories : undefined,
    tags: tags && tags.length > 0 ? tags : undefined,
    cover: data.cover || undefined,
    link: data.link || undefined,
    subtitle: data.subtitle || undefined,
    draft: data.draft || undefined,
    sticky: data.sticky || undefined,
    catalog: data.catalog ? undefined : false,
    tocNumbering: data.tocNumbering ? undefined : false,
    excludeFromSummary: data.excludeFromSummary || undefined,
  };
}

export function FrontmatterEditor({ frontmatter, onChange }: FrontmatterEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Track if category/tag inputs are focused to prevent overwriting during typing
  const categoryFocusedRef = useRef(false);
  const tagFocusedRef = useRef(false);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FrontmatterFormData>({
    resolver: zodResolver(frontmatterSchema),
    defaultValues: toFormData(frontmatter),
    mode: 'onChange',
  });

  // Reset form when frontmatter prop changes (e.g., loading a new post)
  // Skip category/tag fields if they're focused
  useEffect(() => {
    const newData = toFormData(frontmatter);
    const keysToUpdate = Object.keys(newData) as (keyof FrontmatterFormData)[];

    for (const key of keysToUpdate) {
      if (key === 'categories' && categoryFocusedRef.current) continue;
      if (key === 'tags' && tagFocusedRef.current) continue;
      setValue(key, newData[key]);
    }
  }, [frontmatter, setValue]);

  // Sync form changes to parent via watch subscription
  useEffect(() => {
    const subscription = watch((value) => {
      // Only sync when not in the middle of typing categories/tags
      if (categoryFocusedRef.current || tagFocusedRef.current) return;

      const schema = toBlogSchema(value as FrontmatterFormData, frontmatter.date);
      onChange(schema);
    });
    return () => subscription.unsubscribe();
  }, [watch, onChange, frontmatter.date]);

  // Handle category blur - parse and sync
  const handleCategoryBlur = useCallback(() => {
    categoryFocusedRef.current = false;
    const currentValues = watch();
    onChange(toBlogSchema(currentValues, frontmatter.date));
  }, [watch, onChange, frontmatter.date]);

  // Handle tag blur - parse and sync
  const handleTagBlur = useCallback(() => {
    tagFocusedRef.current = false;
    const currentValues = watch();
    onChange(toBlogSchema(currentValues, frontmatter.date));
  }, [watch, onChange, frontmatter.date]);

  return (
    <div className="rounded-lg border border-border bg-muted/30">
      <button
        type="button"
        className={cn('flex w-full items-center justify-between px-4 py-3 transition-colors', 'hover:bg-muted/50')}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="font-medium text-sm">Frontmatter</span>
        <Icon icon={isExpanded ? 'ri:arrow-up-s-line' : 'ri:arrow-down-s-line'} className="h-4 w-4 text-muted-foreground" />
      </button>

      {isExpanded && (
        <div className="space-y-4 border-border border-t px-4 py-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="fm-title" className="block font-medium text-sm">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              id="fm-title"
              type="text"
              {...register('title')}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                errors.title && 'border-destructive',
              )}
              placeholder="Post title"
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          {/* Date and Updated */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="fm-date" className="block font-medium text-sm">
                Date
              </label>
              <input
                id="fm-date"
                type="datetime-local"
                {...register('date')}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                )}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fm-updated" className="block font-medium text-sm">
                Updated
              </label>
              <input
                id="fm-updated"
                type="datetime-local"
                {...register('updated')}
                className={cn(
                  'w-full rounded-md border border-input bg-background px-3 py-2',
                  'text-sm placeholder:text-muted-foreground',
                  'focus:outline-none focus:ring-2 focus:ring-ring',
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="fm-description" className="block font-medium text-sm">
              Description
            </label>
            <textarea
              id="fm-description"
              {...register('description')}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                'min-h-[60px] resize-y',
              )}
              placeholder="A brief description of the post"
            />
          </div>

          {/* Categories */}
          <div className="space-y-1.5">
            <label htmlFor="fm-categories" className="block text-sm">
              <span className="font-medium">Categories</span>
              <span className="ml-2 font-normal text-muted-foreground">e.g., 笔记 {'>'} 前端</span>
            </label>
            <input
              id="fm-categories"
              type="text"
              {...register('categories')}
              onFocus={() => {
                categoryFocusedRef.current = true;
              }}
              onBlur={handleCategoryBlur}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              placeholder="笔记 > 前端"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label htmlFor="fm-tags" className="block font-medium text-sm">
              Tags
            </label>
            <input
              id="fm-tags"
              type="text"
              {...register('tags')}
              onFocus={() => {
                tagFocusedRef.current = true;
              }}
              onBlur={handleTagBlur}
              onKeyDown={(e) => e.stopPropagation()}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          {/* Cover */}
          <div className="space-y-1.5">
            <label htmlFor="fm-cover" className="block font-medium text-sm">
              Cover Image
            </label>
            <input
              id="fm-cover"
              type="text"
              {...register('cover')}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              placeholder="Path to cover image"
            />
          </div>

          {/* Custom Link */}
          <div className="space-y-1.5">
            <label htmlFor="fm-link" className="block text-sm">
              <span className="font-medium">Custom Link</span>
              <span className="ml-2 font-normal text-muted-foreground">Override the default URL slug</span>
            </label>
            <input
              id="fm-link"
              type="text"
              {...register('link')}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              placeholder="custom-url-slug"
            />
          </div>

          {/* Advanced Section */}
          <details className="group">
            <summary className="cursor-pointer list-none font-medium text-muted-foreground text-sm">
              <div className="flex items-center gap-1">
                <Icon icon="ri:arrow-right-s-line" className="h-4 w-4 transition-transform group-open:rotate-90" />
                Advanced Options
              </div>
            </summary>
            <div className="mt-3 space-y-4 border-border border-t pt-3">
              {/* Subtitle */}
              <div className="space-y-1.5">
                <label htmlFor="fm-subtitle" className="block font-medium text-sm">
                  Subtitle
                </label>
                <input
                  id="fm-subtitle"
                  type="text"
                  {...register('subtitle')}
                  className={cn(
                    'w-full rounded-md border border-input bg-background px-3 py-2',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring',
                  )}
                  placeholder="Subtitle"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap gap-4">
                {/* Draft */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" {...register('draft')} className="h-4 w-4 rounded border-input" />
                  <span className="text-sm">Draft</span>
                </label>

                {/* Sticky */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" {...register('sticky')} className="h-4 w-4 rounded border-input" />
                  <span className="text-sm">Sticky</span>
                </label>

                {/* Catalog */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" {...register('catalog')} className="h-4 w-4 rounded border-input" />
                  <span className="text-sm">Show Catalog</span>
                </label>

                {/* TOC Numbering */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" {...register('tocNumbering')} className="h-4 w-4 rounded border-input" />
                  <span className="text-sm">TOC Numbering</span>
                </label>

                {/* Exclude from Summary */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input type="checkbox" {...register('excludeFromSummary')} className="h-4 w-4 rounded border-input" />
                  <span className="text-sm">Exclude from AI Summary</span>
                </label>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
