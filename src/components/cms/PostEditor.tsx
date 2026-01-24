/**
 * PostEditor Component
 *
 * A full-screen modal editor for blog posts using BlockNote.
 * Includes frontmatter editing, markdown content editing, and keyboard shortcuts.
 */

import '@blocknote/core/fonts/inter.css';
import '@blocknote/shadcn/style.css';

import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useIsDarkTheme } from '@hooks/useIsDarkTheme';
import { Icon } from '@iconify/react';
import { detectNewCategories, readPost, writePost } from '@lib/cms';
import { cn } from '@lib/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { BlogSchema } from '@/types/blog';
import { CategoryMappingDialog } from './CategoryMappingDialog';
import { FrontmatterEditor } from './FrontmatterEditor';

interface PostEditorProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

type EditorStatus = 'loading' | 'ready' | 'saving' | 'error';

export function PostEditor({ postId, isOpen, onClose }: PostEditorProps) {
  const [status, setStatus] = useState<EditorStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [frontmatter, setFrontmatter] = useState<BlogSchema | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  const initialContentRef = useRef<string>('');
  const isDark = useIsDarkTheme();

  // Detect platform for keyboard shortcut display
  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    // @ts-expect-error - userAgentData is not yet in TypeScript's lib.dom.d.ts
    const platform = navigator.userAgentData?.platform || navigator.userAgent;
    return /mac/i.test(platform);
  }, []);

  // Create BlockNote editor
  const editor = useCreateBlockNote();

  // Load post content when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    async function loadPost() {
      setStatus('loading');
      setError(null);

      try {
        const data = await readPost(postId);
        setFrontmatter(data.frontmatter);
        initialContentRef.current = data.content;

        // Parse markdown to blocks and load into editor
        const blocks = editor.tryParseMarkdownToBlocks(data.content);
        editor.replaceBlocks(editor.document, blocks);

        setStatus('ready');
        setHasUnsavedChanges(false);
      } catch (err) {
        console.error('[PostEditor] Failed to load post:', err);
        setError(err instanceof Error ? err.message : 'Failed to load post');
        setStatus('error');
      }
    }

    loadPost();
  }, [isOpen, postId, editor]);

  // Perform the actual save operation
  const doSave = useCallback(
    async (categoryMappings?: Record<string, string>) => {
      if (!frontmatter) return;

      setStatus('saving');

      try {
        // Convert blocks to markdown
        const markdown = editor.blocksToMarkdownLossy(editor.document);

        // Process dates
        const now = new Date();
        const updatedFrontmatter = { ...frontmatter };

        if (!updatedFrontmatter.date) {
          // New post: set date
          updatedFrontmatter.date = now;
        } else {
          // Editing: set updated
          updatedFrontmatter.updated = now;
        }

        // Write to file with optional category mappings
        await writePost(postId, updatedFrontmatter, markdown, categoryMappings);

        setFrontmatter(updatedFrontmatter);
        setHasUnsavedChanges(false);
        setStatus('ready');

        if (categoryMappings && Object.keys(categoryMappings).length > 0) {
          toast.success('Post saved with new category mappings');
        } else {
          toast.success('Post saved successfully');
        }
      } catch (err) {
        console.error('[PostEditor] Failed to save post:', err);
        toast.error(err instanceof Error ? err.message : 'Failed to save post');
        setStatus('ready');
      }
    },
    [editor, frontmatter, postId],
  );

  // Handle save - check for new categories first
  const handleSave = useCallback(async () => {
    if (!frontmatter || status === 'saving') return;

    // Check for new categories
    const newMappings = detectNewCategories(frontmatter.categories);

    if (Object.keys(newMappings).length > 0) {
      // Show dialog for user to confirm/edit mappings
      setPendingMappings(newMappings);
      setShowMappingDialog(true);
      return;
    }

    // No new categories, save directly
    await doSave();
  }, [frontmatter, status, doSave]);

  // Handle category mapping confirmation
  const handleMappingConfirm = useCallback(
    async (mappings: Record<string, string>) => {
      setShowMappingDialog(false);
      await doSave(mappings);
    },
    [doSave],
  );

  // Handle category mapping cancellation
  const handleMappingCancel = useCallback(() => {
    setShowMappingDialog(false);
    setPendingMappings({});
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+S to save
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSave]);

  // Track changes in frontmatter
  const handleFrontmatterChange = useCallback((newFrontmatter: BlogSchema) => {
    setFrontmatter(newFrontmatter);
    setHasUnsavedChanges(true);
  }, []);

  // Track changes in editor
  const handleEditorChange = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Handle close with unsaved changes warning
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowConfirmDialog(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Handle confirmed close (discard changes)
  const handleConfirmedClose = useCallback(() => {
    setShowConfirmDialog(false);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn('flex h-[90vh] max-h-[90vh] w-[90vw] max-w-[1200px] flex-col', 'overflow-hidden p-0')}
        showClose={false}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between border-border border-b px-4 py-3">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Icon icon="ri:file-edit-line" className="h-5 w-5" />
            <span className="max-w-[300px] truncate">{postId}</span>
            {hasUnsavedChanges && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-warning text-xs">Unsaved</span>}
          </DialogTitle>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleClose} disabled={status === 'saving'}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={status !== 'ready' && status !== 'saving'}>
              {status === 'saving' ? (
                <>
                  <Icon icon="ri:loader-4-line" className="mr-1.5 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon icon="ri:save-line" className="mr-1.5 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {status === 'loading' && (
            <div className="flex h-full items-center justify-center">
              <Icon icon="ri:loader-4-line" className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {status === 'error' && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <Icon icon="ri:error-warning-line" className="h-12 w-12 text-destructive" />
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={() => onClose()}>
                Close
              </Button>
            </div>
          )}

          {(status === 'ready' || status === 'saving') && frontmatter && (
            <div className="mx-auto max-w-4xl space-y-4">
              {/* Frontmatter Editor */}
              <FrontmatterEditor frontmatter={frontmatter} onChange={handleFrontmatterChange} />

              {/* BlockNote Editor */}
              <div className="rounded-lg border border-border">
                <div className="border-border border-b px-4 py-2">
                  <span className="font-medium text-sm">Content</span>
                </div>
                <div className="min-h-[400px]">
                  <BlockNoteView
                    editor={editor}
                    onChange={handleEditorChange}
                    theme={isDark ? 'dark' : 'light'}
                    className="min-h-[400px]"
                  />
                </div>
              </div>

              {/* Keyboard Shortcut Hint */}
              <p className="text-center text-muted-foreground text-xs">
                Press{' '}
                <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {isMac ? '⌘' : 'Ctrl'}+S
                </kbd>{' '}
                to save
              </p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Mapping Dialog */}
      <CategoryMappingDialog
        isOpen={showMappingDialog}
        mappings={pendingMappings}
        onConfirm={handleMappingConfirm}
        onCancel={handleMappingCancel}
      />
    </Dialog>
  );
}
