/**
 * CMS App
 *
 * Main entry point for the standalone CMS application.
 */

import { Icon } from '@iconify/react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';
import {
  CategoryStats,
  CreatePostDialog,
  DashboardStats,
  ErrorFallback,
  PostEditor,
  PostTable,
  RecentUpdates,
} from '@/components';
import { Button } from '@/components/ui/button';
import { type StatusFilter, useDashboardState } from '@/hooks';
import { MAX_CATEGORY_DISPLAY, MAX_RECENT_POSTS_DISPLAY } from '@/lib/paths';
import { cn } from '@/lib/utils';

// Main App Content
function AppContent() {
  const {
    activeTab,
    setActiveTab,
    data,
    isLoading,
    error,
    isCreateDialogOpen,
    setIsCreateDialogOpen,
    editingPostId,
    search,
    setSearch,
    category,
    setCategory,
    status,
    setStatus,
    sortField,
    sortOrder,
    fetchData,
    handleSort,
    handleToggleDraft,
    handleToggleSticky,
    handleCreatePostSuccess,
    handleEditPost,
    handleOpenInEditor,
    handleEditorClose,
    handleEditorSaved,
  } = useDashboardState();

  // Show editor if editing
  if (editingPostId) {
    return <PostEditor postId={editingPostId} onClose={handleEditorClose} onSaved={handleEditorSaved} />;
  }

  return (
    <>
      <Toaster position="top-right" richColors />

      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="border-border border-b bg-card">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Icon icon="ri:dashboard-3-line" className="size-6" />
              <h1 className="font-semibold text-xl">Koharu CMS</h1>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">DEV</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                <Icon
                  icon={isLoading ? 'ri:loader-4-line' : 'ri:refresh-line'}
                  className={cn('mr-1.5 size-4', isLoading && 'animate-spin')}
                />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Icon icon="ri:add-line" className="mr-1.5 size-4" />
                New Post
              </Button>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-border border-b bg-card">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex gap-4">
              {(['overview', 'posts'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'border-b-2 px-1 py-3 font-medium text-sm capitalize transition-colors',
                    activeTab === tab
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 bg-background">
          <div className="mx-auto max-w-7xl p-6">
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Icon icon="ri:loader-4-line" className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="flex h-64 flex-col items-center justify-center gap-4">
                <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={fetchData}>
                  Retry
                </Button>
              </div>
            ) : data ? (
              <>
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <DashboardStats total={data.stats.total} published={data.stats.published} draft={data.stats.draft} />

                    {/* Two-column layout for Categories and Recent Updates */}
                    <div className="grid gap-6 md:grid-cols-2">
                      <CategoryStats categories={data.stats.categoryStats} maxDisplay={MAX_CATEGORY_DISPLAY} />
                      <RecentUpdates
                        posts={data.stats.recentPosts}
                        maxDisplay={MAX_RECENT_POSTS_DISPLAY}
                        onEdit={handleEditPost}
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'posts' && (
                  <div className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="relative">
                        <Icon
                          icon="ri:search-line"
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          type="text"
                          placeholder="Search posts..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="rounded-lg border border-input bg-background py-2 pr-3 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                      </div>
                      <div className="relative">
                        <Icon
                          icon="ri:folder-line"
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="appearance-none rounded-lg border border-input bg-background py-2 pr-8 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">All Categories</option>
                          {data.categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <Icon
                          icon="ri:arrow-down-s-line"
                          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                      </div>
                      <div className="relative">
                        <Icon
                          icon="ri:filter-line"
                          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value as StatusFilter)}
                          className="appearance-none rounded-lg border border-input bg-background py-2 pr-8 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="all">All Status</option>
                          <option value="published">Published</option>
                          <option value="draft">Draft</option>
                        </select>
                        <Icon
                          icon="ri:arrow-down-s-line"
                          className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                      </div>
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
                      onSort={handleSort}
                      onToggleDraft={handleToggleDraft}
                      onToggleSticky={handleToggleSticky}
                      onEdit={handleEditPost}
                      onOpenInEditor={handleOpenInEditor}
                    />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </main>
      </div>

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        existingCategories={data?.categories || []}
        onSuccess={handleCreatePostSuccess}
      />
    </>
  );
}

export function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <AppContent />
    </ErrorBoundary>
  );
}
