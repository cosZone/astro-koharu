/**
 * FrontmatterEditor Component
 *
 * A form editor for blog post frontmatter.
 * Supports all frontmatter fields from the blog schema.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { format } from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
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

  return categories
    .map((cat) => {
      if (Array.isArray(cat)) {
        return cat.join(' > ');
      }
      return cat;
    })
    .join(', ');
}

/**
 * Parses category input string back to the correct format
 * '工具' -> ['工具']
 * '笔记 > 前端' -> [['笔记', '前端']]
 * '工具, 笔记 > 前端' -> ['工具', ['笔记', '前端']]
 */
function parseCategoryInput(input: string): string[] | string[][] {
  if (!input.trim()) return [];

  const parts = input.split(',').map((p) => p.trim());

  // Check if any part contains ' > ' (multi-level)
  const hasMultiLevel = parts.some((p) => p.includes(' > '));

  if (hasMultiLevel) {
    // Return as nested arrays
    return parts.map((p) => {
      if (p.includes(' > ')) {
        return p.split(' > ').map((s) => s.trim());
      }
      return [p];
    });
  }

  // Simple single-level categories
  return parts;
}

export function FrontmatterEditor({ frontmatter, onChange }: FrontmatterEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [categoryInput, setCategoryInput] = useState(formatCategoryDisplay(frontmatter.categories));
  const [tagInput, setTagInput] = useState(frontmatter.tags?.join(', ') || '');

  // Sync local state when frontmatter prop changes (e.g., when loading a new post)
  useEffect(() => {
    setCategoryInput(formatCategoryDisplay(frontmatter.categories));
    setTagInput(frontmatter.tags?.join(', ') || '');
  }, [frontmatter.categories, frontmatter.tags]);

  const updateField = useCallback(
    <K extends keyof BlogSchema>(field: K, value: BlogSchema[K]) => {
      onChange({ ...frontmatter, [field]: value });
    },
    [frontmatter, onChange],
  );

  const handleCategoryChange = useCallback(
    (value: string) => {
      setCategoryInput(value);
      const parsed = parseCategoryInput(value);
      updateField('categories', parsed.length > 0 ? parsed : undefined);
    },
    [updateField],
  );

  const handleTagChange = useCallback(
    (value: string) => {
      setTagInput(value);
      const tags = value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      updateField('tags', tags.length > 0 ? tags : undefined);
    },
    [updateField],
  );

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
            <label htmlFor="fm-categories" className="block font-medium text-sm">
              Categories
            </label>
            <input
              id="fm-categories"
              type="text"
              value={categoryInput}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={cn(
                'w-full rounded-md border border-input bg-background px-3 py-2',
                'text-sm placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring',
              )}
              placeholder="e.g., '笔记 > 前端' for nested, or '工具, 笔记' for multiple"
            />
            <p className="text-muted-foreground text-xs">Use {'>'} for nested categories, comma for multiple</p>
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
              onChange={(e) => handleTagChange(e.target.value)}
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

          {/* Toggles Row */}
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

              {/* Link */}
              <div className="space-y-1.5">
                <label htmlFor="fm-link" className="block font-medium text-sm">
                  Custom Link
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
                  placeholder="Custom link path"
                />
              </div>

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
          </details>
        </div>
      )}
    </div>
  );
}
