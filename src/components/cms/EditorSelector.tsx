/**
 * EditorSelector Component
 *
 * Dropdown menu for selecting which editor to open the file in.
 * Displays configured editors with their icons and names.
 */

import { cmsConfig } from '@constants/site-config';
import { Icon } from '@iconify/react';
import { getFullFilePath, openInEditor } from '@lib/cms';
import { cn } from '@lib/utils';
import { useCallback } from 'react';
import type { EditorConfig } from '@/types/cms';

interface EditorSelectorProps {
  /** Post ID from Astro Content Collections (e.g., 'note/front-end/theme.md') */
  postId: string;
  /** Callback when an editor is selected and opened */
  onSelect?: () => void;
  /** Additional class names */
  className?: string;
}

export default function EditorSelector({ postId, onSelect, className }: EditorSelectorProps) {
  const { editors, localProjectPath, contentRelativePath = 'src/content/blog' } = cmsConfig;

  const handleEditorClick = useCallback(
    (editor: EditorConfig) => {
      if (!localProjectPath) {
        console.warn('[CMS] localProjectPath is not configured in site.yaml');
        return;
      }

      const filePath = getFullFilePath(localProjectPath, contentRelativePath, postId);
      openInEditor(editor, filePath, postId);
      onSelect?.();
    },
    [localProjectPath, contentRelativePath, postId, onSelect],
  );

  if (editors.length === 0) {
    return (
      <div className={cn('p-3 text-center text-muted-foreground text-sm', className)}>
        <p>No editors configured</p>
        <p className="mt-1 text-xs">Add editors in site.yaml</p>
      </div>
    );
  }

  if (!localProjectPath) {
    return (
      <div className={cn('p-3 text-center text-muted-foreground text-sm', className)}>
        <p>Missing localProjectPath</p>
        <p className="mt-1 text-xs">Configure in site.yaml</p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1 p-2', className)}>
      <div className="px-2 py-1 text-muted-foreground text-xs">Open in editor</div>
      {editors.map((editor) => (
        <button
          key={editor.id}
          type="button"
          onClick={() => handleEditorClick(editor)}
          className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors', 'hover:bg-white/10')}
        >
          <Icon icon={editor.icon} className="h-4 w-4" />
          <span>{editor.name}</span>
        </button>
      ))}
    </div>
  );
}
