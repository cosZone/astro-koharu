import { BlockNoteView } from '@blocknote/shadcn';
import { Icon } from '@iconify/react';
import { memo } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import type { PostBlockNoteEditor } from '@/components/post-editor/editor';
import { Button } from '@/components/ui/button';

function EditorErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
      <div>
        <h3 className="font-semibold text-lg">Editor failed to load</h3>
        <p className="mt-1 text-muted-foreground text-sm">{error.message}</p>
      </div>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Try Again
      </Button>
    </div>
  );
}

interface PostEditorCanvasProps {
  editor: PostBlockNoteEditor;
}

export const PostEditorCanvas = memo(function PostEditorCanvas({ editor }: PostEditorCanvasProps) {
  return (
    <main className="flex-1 overflow-auto">
      <div className="mx-auto max-w-3xl p-6">
        <ErrorBoundary FallbackComponent={EditorErrorFallback}>
          <BlockNoteView editor={editor} theme="dark" />
        </ErrorBoundary>
      </div>
    </main>
  );
});
