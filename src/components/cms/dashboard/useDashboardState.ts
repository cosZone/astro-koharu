/**
 * useDashboardState Hook
 *
 * Shared state management for CMS dashboard components.
 * Extracts common logic used by both CMSDashboard (dialog) and CMSDashboardPage (full page).
 */

import { toggleDraft } from '@lib/cms';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { SortField, SortOrder, StatusFilter, Tab } from './types';
import { usePostList } from './usePostList';

export function useDashboardState() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Filter state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Dialog state
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Build params for API
  const params = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      tag: tag || undefined,
      status: status === 'all' ? undefined : status,
      sort: sortField,
      order: sortOrder,
    }),
    [search, category, tag, status, sortField, sortOrder],
  );

  // Fetch data
  const { data, isLoading, error, refetch } = usePostList(params);

  // Handlers
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleEdit = (postId: string) => {
    setEditingPostId(postId);
  };

  const handleToggleDraft = async (postId: string) => {
    try {
      const result = await toggleDraft(postId);
      toast.success(result.draft ? 'Post marked as draft' : 'Post published');
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle draft status');
    }
  };

  const handlePostCreated = (postId: string) => {
    refetch();
    setEditingPostId(postId);
  };

  const handleEditorClose = () => {
    setEditingPostId(null);
    refetch();
  };

  const openCreateDialog = () => setIsCreateDialogOpen(true);
  const closeCreateDialog = () => setIsCreateDialogOpen(false);

  return {
    // Tab
    activeTab,
    setActiveTab,

    // Filters
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

    // Dialogs
    editingPostId,
    isCreateDialogOpen,
    openCreateDialog,
    closeCreateDialog,

    // Data
    data,
    isLoading,
    error,
    refetch,

    // Handlers
    handleSort,
    handleEdit,
    handleToggleDraft,
    handlePostCreated,
    handleEditorClose,
  };
}
