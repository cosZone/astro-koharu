/**
 * PostFilters Component
 *
 * Filter controls for category, tag, and draft status.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';

interface PostFiltersProps {
  categories: string[];
  tags: string[];
  selectedCategory: string;
  selectedTag: string;
  selectedStatus: 'all' | 'draft' | 'published';
  onCategoryChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onStatusChange: (value: 'all' | 'draft' | 'published') => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  icon: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon icon={icon} className="size-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-8 rounded-md border border-input bg-background px-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'cursor-pointer',
        )}
        aria-label={label}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function PostFilters({
  categories,
  tags,
  selectedCategory,
  selectedTag,
  selectedStatus,
  onCategoryChange,
  onTagChange,
  onStatusChange,
}: PostFiltersProps) {
  const categoryOptions = [{ value: '', label: 'All Categories' }, ...categories.map((c) => ({ value: c, label: c }))];

  const tagOptions = [{ value: '', label: 'All Tags' }, ...tags.map((t) => ({ value: t, label: t }))];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterSelect
        label="Category"
        value={selectedCategory}
        options={categoryOptions}
        onChange={onCategoryChange}
        icon="ri:folder-line"
      />
      <FilterSelect label="Tag" value={selectedTag} options={tagOptions} onChange={onTagChange} icon="ri:price-tag-3-line" />
      <FilterSelect
        label="Status"
        value={selectedStatus}
        options={statusOptions}
        onChange={(v) => onStatusChange(v as 'all' | 'draft' | 'published')}
        icon="ri:filter-line"
      />
    </div>
  );
}
