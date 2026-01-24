/**
 * FrontmatterEditor Component
 *
 * A form editor for blog post frontmatter.
 * Supports all frontmatter fields from the blog schema.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { format } from 'date-fns';
import { useCallback, useEffect, useRef, useState } from 'react';
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

export function FrontmatterEditor({ frontmatter, onChange }: FrontmatterEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [categoryInput, setCategoryInput] = useState(formatCategoryDisplay(frontmatter.categories));
  const [tagInput, setTagInput] = useState(frontmatter.tags?.join(', ') || '');

  // Track if category/tag inputs are focused to prevent useEffect from overwriting during typing
  const categoryFocusedRef = useRef(false);
  const tagFocusedRef = useRef(false);

  // Sync local state when frontmatter prop changes (e.g., when loading a new post)
  // Skip sync if the input is currently focused (user is typing)
  useEffect(() => {
    if (!categoryFocusedRef.current) {
      setCategoryInput(formatCategoryDisplay(frontmatter.categories));
    }
  }, [frontmatter.categories]);

  useEffect(() => {
    if (!tagFocusedRef.current) {
      setTagInput(frontmatter.tags?.join(', ') || '');
    }
  }, [frontmatter.tags]);

  const updateField = useCallback(
    <K extends keyof BlogSchema>(field: K, value: BlogSchema[K]) => {
      onChange({ ...frontmatter, [field]: value });
    },
    [frontmatter, onChange],
  );

  // Update categories only on blur to allow free typing of '>' character
  const handleCategoryBlur = useCallback(() => {
    categoryFocusedRef.current = false;
    const parsed = parseCategoryInput(categoryInput);
    updateField('categories', parsed.length > 0 ? parsed : undefined);
  }, [categoryInput, updateField]);

  // Update tags only on blur
  const handleTagBlur = useCallback(() => {
    tagFocusedRef.current = false;
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    updateField('tags', tags.length > 0 ? tags : undefined);
  }, [tagInput, updateField]);

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
              value={frontmatter.title}
              onChange={(e) => updateField('title', e.target.value)}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              placeholder="Post title"
            />
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
                value={frontmatter.date ? format(frontmatter.date, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => e.target.value && updateField('date', new Date(e.target.value))}
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
                value={frontmatter.updated ? format(frontmatter.updated, "yyyy-MM-dd'T'HH:mm") : ''}
                onChange={(e) => updateField('updated', e.target.value ? new Date(e.target.value) : undefined)}
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
              value={frontmatter.description || ''}
              onChange={(e) => updateField('description', e.target.value || undefined)}
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
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
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
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
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
              value={frontmatter.cover || ''}
              onChange={(e) => updateField('cover', e.target.value || undefined)}
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
              value={frontmatter.link || ''}
              onChange={(e) => updateField('link', e.target.value || undefined)}
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
                  value={frontmatter.subtitle || ''}
                  onChange={(e) => updateField('subtitle', e.target.value || undefined)}
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
                  <input
                    type="checkbox"
                    checked={frontmatter.draft || false}
                    onChange={(e) => updateField('draft', e.target.checked || undefined)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">Draft</span>
                </label>

                {/* Sticky */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={frontmatter.sticky || false}
                    onChange={(e) => updateField('sticky', e.target.checked || undefined)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">Sticky</span>
                </label>

                {/* Catalog */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={frontmatter.catalog !== false}
                    onChange={(e) => updateField('catalog', e.target.checked ? undefined : false)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">Show Catalog</span>
                </label>

                {/* TOC Numbering */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={frontmatter.tocNumbering !== false}
                    onChange={(e) => updateField('tocNumbering', e.target.checked ? undefined : false)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span className="text-sm">TOC Numbering</span>
                </label>

                {/* Exclude from Summary */}
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={frontmatter.excludeFromSummary || false}
                    onChange={(e) => updateField('excludeFromSummary', e.target.checked || undefined)}
                    className="h-4 w-4 rounded border-input"
                  />
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
