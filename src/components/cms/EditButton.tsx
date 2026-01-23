/**
 * EditButton Component
 *
 * Inline edit button for post pages, displayed next to breadcrumb navigation.
 * Only visible when edit mode is enabled (via ?edit=true or localStorage).
 * Opens a dropdown menu with editor selection on click.
 */

import { cmsConfig } from '@constants/site-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { Icon } from '@iconify/react';
import { getDefaultEditor, getFullFilePath, openInEditor } from '@lib/cms';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { cmsEditMode, initCmsState, preferredEditor, setPreferredEditor } from '@store/cms';
import { useCallback, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EditorConfig } from '@/types/cms';

interface EditButtonProps {
  /** Post ID from Astro Content Collections (e.g., 'note/front-end/theme.md') */
  postId: string;
}

export default function EditButton({ postId }: EditButtonProps) {
  const isMounted = useIsMounted();
  const isEditMode = useStore(cmsEditMode);
  const preferredEditorId = useStore(preferredEditor);

  const { enabled, editors, localProjectPath, contentRelativePath = 'src/content/blog' } = cmsConfig;

  // Initialize CMS state on mount
  useEffect(() => {
    initCmsState();
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

  // Don't render if not mounted, not enabled, or not in edit mode
  if (!isMounted || !enabled || !isEditMode) {
    return null;
  }

  const currentEditor = getEditor();

  // Error states
  if (editors.length === 0) {
    return (
      <div className="text-muted-foreground text-xs">
        <span>No editors configured</span>
      </div>
    );
  }

  if (!localProjectPath) {
    return (
      <div className="text-muted-foreground text-xs">
        <span>Missing localProjectPath</span>
      </div>
    );
  }

  return (
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
      <DropdownMenuContent align="end" className="min-w-[160px]">
        <DropdownMenuLabel>Open in editor</DropdownMenuLabel>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
