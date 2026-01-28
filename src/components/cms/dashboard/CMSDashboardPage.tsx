/**
 * CMSDashboardPage Component
 *
 * Full-page dashboard for managing blog posts.
 * Uses shared state and components with CMSDashboard.
 */

import { Icon } from '@iconify/react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';
import { Button } from '@/components/ui/button';
import { PostEditor } from '../PostEditor';
import { CreatePostDialog } from './CreatePostDialog';
import { DashboardContent } from './DashboardContent';
import { DashboardTabs } from './DashboardTabs';
import { ErrorFallback } from './ErrorFallback';
import { useDashboardState } from './useDashboardState';

function PageErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return <ErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} variant="page" />;
}

function CMSDashboardPageContent() {
  const {
    activeTab,
    setActiveTab,
    search,
    setSearch,
    category,
    setCategory,
    tag,
    setTag,
    status,
    setStatus,
    sortField,
    sortOrder,
    editingPostId,
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,
    data,
    isLoading,
    error,
    refetch,
    handleSort,
    handleEdit,
    handleToggleDraft,
    handlePostCreated,
    handleEditorClose,
  } = useDashboardState();

  return (
    <>
      <Toaster position="top-right" richColors />

      <div className="flex min-h-screen flex-col">
        {/* Header */}
        <header className="border-border border-b bg-card">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <Icon icon="ri:dashboard-3-line" className="size-6" />
              <h1 className="font-semibold text-xl">CMS Dashboard</h1>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">DEV</span>
            </div>
            <Button variant="default" size="sm" onClick={openCreateDialog}>
              <Icon icon="ri:add-line" className="mr-1.5 size-4" />
              New Post
            </Button>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-border border-b bg-card">
          <div className="mx-auto max-w-7xl px-6">
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 bg-background">
          <div className="mx-auto max-w-7xl p-6">
            <DashboardContent
              activeTab={activeTab}
              data={data}
              isLoading={isLoading}
              error={error}
              refetch={refetch}
              search={search}
              onSearchChange={setSearch}
              category={category}
              onCategoryChange={setCategory}
              tag={tag}
              onTagChange={setTag}
              status={status}
              onStatusChange={setStatus}
              sortField={sortField}
              sortOrder={sortOrder}
              onSort={handleSort}
              onEdit={handleEdit}
              onToggleDraft={handleToggleDraft}
            />
          </div>
        </main>
      </div>

      {/* Post Editor Dialog */}
      {editingPostId && <PostEditor postId={editingPostId} isOpen={!!editingPostId} onClose={handleEditorClose} />}

      {/* Create Post Dialog */}
      <CreatePostDialog
        isOpen={isCreateDialogOpen}
        onClose={closeCreateDialog}
        categories={data?.categories ?? []}
        onCreated={handlePostCreated}
      />
    </>
  );
}

export function CMSDashboardPage() {
  return (
    <ErrorBoundary FallbackComponent={PageErrorFallback}>
      <CMSDashboardPageContent />
    </ErrorBoundary>
  );
}
