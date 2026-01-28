/**
 * PostTable Component
 *
 * Table displaying all posts with sortable columns and actions.
 */

import { cmsConfig } from '@constants/site-config';
import { Icon } from '@iconify/react';
import type { PostListItem } from '@lib/cms';
import { getFullFilePath, openInEditor } from '@lib/cms';
import { cn } from '@lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { SortField, SortOrder } from './types';

interface PostTableProps {
  posts: PostListItem[];
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onEdit: (postId: string) => void;
  onToggleDraft: (postId: string) => void;
}

function SortableHeader({
  label,
  field,
  currentField,
  currentOrder,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  currentOrder: SortOrder;
  onSort: (field: SortField) => void;
}) {
  const isActive = field === currentField;

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn('flex items-center gap-1 font-medium text-xs uppercase tracking-wide', isActive && 'text-primary')}
    >
      {label}
      <Icon
        icon={isActive ? (currentOrder === 'asc' ? 'ri:arrow-up-s-fill' : 'ri:arrow-down-s-fill') : 'ri:arrow-up-down-line'}
        className={cn('size-4', !isActive && 'opacity-50')}
      />
    </button>
  );
}

export function PostTable({ posts, sortField, sortOrder, onSort, onEdit, onToggleDraft }: PostTableProps) {
  const handleOpenInEditor = (postId: string) => {
    const { editors, localProjectPath, contentRelativePath = 'src/content/blog' } = cmsConfig;

    if (!localProjectPath) {
      toast.error('Local project path is not configured');
      return;
    }

    if (editors.length === 0) {
      toast.error('No editors configured');
      return;
    }

    try {
      const filePath = getFullFilePath(localProjectPath, contentRelativePath, postId);
      openInEditor(editors[0], filePath, postId);
      toast.success('Opening in editor...');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to open in editor');
    }
  };

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-border border-dashed p-8 text-center">
        <Icon icon="ri:file-list-3-line" className="size-12 text-muted-foreground" />
        <p className="mt-2 font-medium text-muted-foreground">No posts found</p>
        <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-border border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left">
                <SortableHeader label="Title" field="title" currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
              </th>
              <th className="hidden px-4 py-3 text-left md:table-cell">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Category</span>
              </th>
              <th className="hidden px-4 py-3 text-left lg:table-cell">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Tags</span>
              </th>
              <th className="px-4 py-3 text-left">
                <SortableHeader label="Date" field="date" currentField={sortField} currentOrder={sortOrder} onSort={onSort} />
              </th>
              <th className="px-4 py-3 text-left">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</span>
              </th>
              <th className="px-4 py-3 text-right">
                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {posts.map((post) => (
              <tr key={post.id} className="transition-colors hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {post.sticky && (
                      <span title="Sticky">
                        <Icon icon="ri:pushpin-fill" className="size-4 shrink-0 text-orange-500" />
                      </span>
                    )}
                    <span className="line-clamp-1 font-medium text-sm">{post.title}</span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <span className="text-muted-foreground text-sm">{post.categories.join(' > ') || '-'}</span>
                </td>
                <td className="hidden px-4 py-3 lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                        {tag}
                      </span>
                    ))}
                    {post.tags.length > 3 && <span className="text-muted-foreground text-xs">+{post.tags.length - 3}</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted-foreground text-sm">{format(new Date(post.date), 'yyyy-MM-dd')}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs',
                      post.draft ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500',
                    )}
                  >
                    {post.draft ? 'Draft' : 'Published'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(post.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Edit in CMS"
                    >
                      <Icon icon="ri:edit-line" className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenInEditor(post.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Open in local editor"
                    >
                      <Icon icon="ri:code-s-slash-line" className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleDraft(post.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title={post.draft ? 'Publish' : 'Mark as draft'}
                    >
                      <Icon icon={post.draft ? 'ri:check-line' : 'ri:draft-line'} className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
