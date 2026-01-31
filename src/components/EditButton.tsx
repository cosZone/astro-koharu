/**
 * EditButton Component (Dev Only)
 *
 * Inline edit button for post pages, displayed next to breadcrumb navigation.
 * Opens a dropdown menu to select a local editor (VS Code, Cursor, Zed, etc.)
 * Visibility is controlled at build-time via Astro page conditions.
 */

import { devConfig } from '@constants/site-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { Icon } from '@iconify/react';
import type { EditorConfig } from '@lib/config/types';
import { cn } from '@lib/utils';
import { useCallback } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface EditButtonProps {
  /** Post ID from Astro Content Collections (e.g., 'note/front-end/theme.md') */
  postId: string;
}

/**
 * Build the full file path from project path, content path, and post ID
 */
function getFullFilePath(localProjectPath: string, contentRelativePath: string, postId: string): string {
  // Normalize paths: remove trailing slashes
  const projectPath = localProjectPath.replace(/\/+$/, '');
  const contentPath = contentRelativePath.replace(/^\/+|\/+$/g, '');
  return `${projectPath}/${contentPath}/${postId}`;
}

/**
 * Build the editor URL from template and file path
 */
function buildEditorUrl(editor: EditorConfig, filePath: string): string {
  return editor.urlTemplate.replace('{path}', filePath);
}

/**
 * Open a file in the specified editor
 */
function openInEditor(editor: EditorConfig, filePath: string): void {
  const url = buildEditorUrl(editor, filePath);
  window.open(url, '_self');
}

export default function EditButton({ postId }: EditButtonProps) {
  const isMounted = useIsMounted();

  const { editors, localProjectPath, contentRelativePath = 'src/content/blog' } = devConfig;

  // Handle editor click
  const handleEditorClick = useCallback(
    (editor: EditorConfig) => {
      if (!localProjectPath) {
        console.warn('[Dev] localProjectPath is not configured in site.yaml');
        return;
      }

      const filePath = getFullFilePath(localProjectPath, contentRelativePath, postId);
      openInEditor(editor, filePath);
    },
    [localProjectPath, contentRelativePath, postId],
  );

  // Don't render if not mounted or no editors configured
  if (!isMounted || editors.length === 0 || !localProjectPath) {
    return null;
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1 rounded-full px-2.5 py-1 transition-all duration-200',
            'bg-primary/10 text-primary hover:bg-primary/20',
            'text-sm',
          )}
          aria-label="Edit this post"
          title="Edit this post"
        >
          <Icon icon="ri:edit-line" className="h-3.5 w-3.5" />
          <span className="font-medium">Edit</span>
          <Icon icon="ri:arrow-down-s-line" className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {editors.map((editor) => (
          <DropdownMenuItem key={editor.id} onClick={() => handleEditorClick(editor)} className="cursor-pointer gap-2">
            <Icon icon={editor.icon} className="h-4 w-4" />
            <span>{editor.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
