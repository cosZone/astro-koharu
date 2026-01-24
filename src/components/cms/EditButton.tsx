/**
 * EditButton Component
 *
 * Inline edit button for post pages, displayed next to breadcrumb navigation.
 * Only visible when edit mode is enabled (via ?edit=true or localStorage).
 * Opens a dropdown menu with editor selection on click.
 *
 * In non-edit mode, shows a hidden entry button that becomes visible on hover.
 */

import { cmsConfig } from '@constants/site-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { Icon } from '@iconify/react';
import { getDefaultEditor, getFullFilePath, openInEditor } from '@lib/cms';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { cmsEditMode, enableEditMode, initCmsState, preferredEditor, setPreferredEditor } from '@store/cms';
import { useCallback, useEffect, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EditorConfig } from '@/types/cms';
import { PostEditor } from './PostEditor';

interface EditButtonProps {
  /** Post ID from Astro Content Collections (e.g., 'note/front-end/theme.md') */
  postId: string;
}

export default function EditButton({ postId }: EditButtonProps) {
  const isMounted = useIsMounted();
  const isEditMode = useStore(cmsEditMode);
  const preferredEditorId = useStore(preferredEditor);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const { enabled, editors, localProjectPath, contentRelativePath = 'src/content/blog' } = cmsConfig;

  // Initialize CMS state on mount
  useEffect(() => {
    initCmsState();
  }, []);

  // Handle opening browser editor
  const handleBrowserEdit = useCallback(() => {
    setIsEditorOpen(true);
  }, []);

  // Handle hidden entry click (enable edit mode)
  const handleHiddenEntryClick = useCallback(() => {
    enableEditMode();
  }, []);

  // Get the preferred editor or default
  const getEditor = useCallback((): EditorConfig | null => {
    if (preferredEditorId) {
      const preferred = editors.find((e) => e.id === preferredEditorId);
      if (preferred) return preferred;
    }
    return getDefaultEditor(editors);
  }, [preferredEditorId, editors]);

  // Handle editor click
  const handleEditorClick = useCallback(
    (editor: EditorConfig) => {
      if (!localProjectPath) {
        console.warn('[CMS] localProjectPath is not configured in site.yaml');
        return;
      }

      const filePath = getFullFilePath(localProjectPath, contentRelativePath, postId);
      setPreferredEditor(editor.id);
      openInEditor(editor, filePath);
    },
    [localProjectPath, contentRelativePath, postId],
  );

  // Don't render if not mounted or not enabled
  if (!isMounted || !enabled) {
    return null;
  }

  const currentEditor = getEditor();

  // Hidden entry button for non-edit mode
  if (!isEditMode) {
    return (
      <button
        type="button"
        onClick={handleHiddenEntryClick}
        className={cn(
          'flex items-center justify-center rounded-full p-1.5 transition-all duration-200',
          'opacity-0 hover:opacity-30 focus:opacity-30',
          'text-muted-foreground hover:text-foreground',
        )}
        aria-label="Enable edit mode"
        title="Enable edit mode"
      >
        <Icon icon="ri:edit-line" className="h-3.5 w-3.5" />
      </button>
    );
  }

  // Note: Browser editor is always available when CMS is enabled,
  // so no error state is needed here. Local editors are optional.

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex items-center gap-1 rounded-full px-2.5 py-1 transition-all duration-200',
              'bg-primary/10 text-primary hover:bg-primary/20',
              'text-sm',
            )}
            aria-label="Edit this post"
            title={`Edit in ${currentEditor?.name ?? 'editor'}`}
          >
            <Icon icon="ri:edit-line" className="h-3.5 w-3.5" />
            <span className="font-medium">Edit</span>
            <Icon icon="ri:arrow-down-s-line" className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          {/* Browser Editor Option */}
          <DropdownMenuItem onClick={handleBrowserEdit} className="cursor-pointer gap-2">
            <Icon icon="ri:window-line" className="h-4 w-4" />
            <span>Edit in Browser</span>
          </DropdownMenuItem>

          {/* Local Editor Options */}
          {editors.length > 0 && localProjectPath && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Open in local editor</DropdownMenuLabel>
              {editors.map((editor) => {
                const isPreferred = editor.id === preferredEditorId;
                return (
                  <DropdownMenuItem key={editor.id} onClick={() => handleEditorClick(editor)} className="cursor-pointer gap-2">
                    <Icon icon={editor.icon} className="h-4 w-4" />
                    <span>{editor.name}</span>
                    {isPreferred && <Icon icon="ri:check-line" className="ml-auto h-4 w-4 text-primary" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Browser Editor Modal */}
      <PostEditor postId={postId} isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} />
    </>
  );
}
