/**
 * DashboardContent Component
 *
 * Shared content area for both CMSDashboard (dialog) and CMSDashboardPage (full page).
 * Renders loading, error, overview, and posts views.
 */

import { Icon } from '@iconify/react';
import type { ListPostsResponse } from '@lib/cms';
import { Button } from '@/components/ui/button';
import { CategoryStats } from './CategoryStats';
import { DashboardStats } from './DashboardStats';
import { PostFilters } from './PostFilters';
import { PostSearch } from './PostSearch';
import { PostTable } from './PostTable';
import { RecentPosts } from './RecentPosts';
import type { SortField, SortOrder, StatusFilter, Tab } from './types';

interface DashboardContentProps {
  activeTab: Tab;
  data: ListPostsResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;

  // Filter props
  search: string;
  onSearchChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  tag: string;
  onTagChange: (value: string) => void;
  status: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;

  // Sort props
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;

  // Action handlers
  onEdit: (postId: string) => void;
  onToggleDraft: (postId: string) => void;
}

export function DashboardContent({
  activeTab,
  data,
  isLoading,
  error,
  refetch,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  tag,
  onTagChange,
  status,
  onStatusChange,
  sortField,
  sortOrder,
  onSort,
  onEdit,
  onToggleDraft,
}: DashboardContentProps) {
  if (isLoading) {
    return (
      <div className="flex h-full min-h-64 items-center justify-center">
        <Icon icon="ri:loader-4-line" className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4">
        <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <DashboardStats total={data.stats.total} published={data.stats.published} draft={data.stats.draft} />
          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryStats stats={data.stats.categoryStats} />
            <RecentPosts posts={data.stats.recentPosts} onEdit={onEdit} />
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PostFilters
              categories={data.categories}
              tags={data.tags}
              selectedCategory={category}
              selectedTag={tag}
              selectedStatus={status}
              onCategoryChange={onCategoryChange}
              onTagChange={onTagChange}
              onStatusChange={onStatusChange}
            />
            <PostSearch value={search} onChange={onSearchChange} className="w-full sm:w-64" />
          </div>

          {/* Results Count */}
          <p className="text-muted-foreground text-sm">
            Showing {data.posts.length} of {data.stats.total} posts
          </p>

          {/* Table */}
          <PostTable
            posts={data.posts}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={onSort}
            onEdit={onEdit}
            onToggleDraft={onToggleDraft}
          />
        </div>
      )}
    </>
  );
}
