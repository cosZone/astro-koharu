import { Icon } from '@iconify/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PostEditorHeaderProps {
  title: string;
  postId: string;
  previewUrl: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  showSidebar: boolean;
  onClose: () => void;
  onSave: () => void;
  onToggleSidebar: () => void;
}

export function PostEditorHeader({
  title,
  postId,
  previewUrl,
  hasUnsavedChanges,
  isSaving,
  showSidebar,
  onClose,
  onSave,
  onToggleSidebar,
}: PostEditorHeaderProps) {
  return (
    <header className="flex items-center justify-between border-border border-b px-4 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Close editor"
        >
          <Icon icon="ri:arrow-left-line" className="size-5" />
        </button>
        <div>
          <h1 className="line-clamp-1 font-medium">{title || 'Untitled'}</h1>
          <p className="text-muted-foreground text-xs">{postId}</p>
        </div>
        {hasUnsavedChanges && <span className="rounded bg-orange-500/10 px-2 py-0.5 text-orange-500 text-xs">Unsaved</span>}
      </div>

      <div className="flex items-center gap-2">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
        >
          <Icon icon="ri:external-link-line" className="size-4" />
          Preview
        </a>
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            'rounded-lg p-2 transition-colors',
            showSidebar ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
          )}
          title="Toggle frontmatter panel"
        >
          <Icon icon="ri:sidebar-unfold-line" className="size-5" />
        </button>
        <Button onClick={onSave} disabled={isSaving || !hasUnsavedChanges}>
          {isSaving ? (
            <>
              <Icon icon="ri:loader-4-line" className="mr-1.5 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Icon icon="ri:save-line" className="mr-1.5 size-4" />
              Save
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
