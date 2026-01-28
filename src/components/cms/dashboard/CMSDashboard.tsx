/**
 * CMSDashboard Component
 *
 * Full-screen dashboard dialog for managing blog posts.
 * Uses shared state and components with CMSDashboardPage.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PostEditor } from '../PostEditor';
import { CreatePostDialog } from './CreatePostDialog';
import { DashboardContent } from './DashboardContent';
import { DashboardTabs } from './DashboardTabs';
import { ErrorFallback } from './ErrorFallback';
import { useDashboardState } from './useDashboardState';

interface CMSDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

function CMSDashboardContent({ isOpen, onClose }: CMSDashboardProps) {
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className={cn('flex h-[90vh] max-h-[90vh] w-[95vw] max-w-[1400px] flex-col', 'overflow-hidden p-0')}
          showClose={false}
        >
          {/* Header */}
          <DialogHeader className="flex flex-row items-center justify-between border-border border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Icon icon="ri:dashboard-3-line" className="size-5" />
              CMS Dashboard
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" onClick={openCreateDialog}>
                <Icon icon="ri:add-line" className="mr-1.5 size-4" />
                New Post
              </Button>
              <Button variant="outline" size="sm" onClick={onClose}>
                <Icon icon="ri:close-line" className="size-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Tabs */}
          <div className="border-border border-b px-6">
            <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
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
        </DialogContent>
      </Dialog>

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

export function CMSDashboard({ isOpen, onClose }: CMSDashboardProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <CMSDashboardContent isOpen={isOpen} onClose={onClose} />
    </ErrorBoundary>
  );
}
