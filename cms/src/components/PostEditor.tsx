/**
 * Post Editor
 *
 * Full-screen editor for blog posts with BlockNote editor and frontmatter panel.
 * Supports Cmd+S save, new category detection, and unsaved changes warning.
 */

import { BlockNoteSchema, createCodeBlockSpec, defaultBlockSpecs } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import '@blocknote/shadcn/style.css';
import { Icon } from '@iconify/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { toast } from 'sonner';
import { CategoryMappingDialog } from '@/components/CategoryMappingDialog';
import { EditorTOC } from '@/components/EditorTOC';
import { FrontmatterEditor, type FrontmatterEditorRef } from '@/components/FrontmatterEditor';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { Button } from '@/components/ui/button';
import { useEditorHeadings } from '@/hooks';
import { readPost, writePost } from '@/lib/api';
import { detectNewCategories, getCategoryMap, setCategoryMap } from '@/lib/category';
import { DEV_SERVER_URL } from '@/lib/config';
import { cn } from '@/lib/utils';
import type { BlogSchema } from '@/types';

// Supported languages for code blocks
const CODE_BLOCK_LANGUAGES = {
  typescript: { name: 'TypeScript', aliases: ['ts'] },
  javascript: { name: 'JavaScript', aliases: ['js'] },
  tsx: { name: 'TSX' },
  jsx: { name: 'JSX' },
  html: { name: 'HTML' },
  css: { name: 'CSS' },
  json: { name: 'JSON' },
  yaml: { name: 'YAML', aliases: ['yml'] },
  markdown: { name: 'Markdown', aliases: ['md'] },
  bash: { name: 'Bash', aliases: ['sh', 'shell'] },
  python: { name: 'Python', aliases: ['py'] },
  go: { name: 'Go' },
  rust: { name: 'Rust', aliases: ['rs'] },
  sql: { name: 'SQL' },
  c: { name: 'C' },
  cpp: { name: 'C++', aliases: ['c++'] },
  java: { name: 'Java' },
  php: { name: 'PHP' },
  ruby: { name: 'Ruby', aliases: ['rb'] },
  swift: { name: 'Swift' },
  kotlin: { name: 'Kotlin', aliases: ['kt'] },
  text: { name: 'Plain Text' },
};

// Create schema with built-in code block using predefined languages
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs, // Keep all default blocks (paragraph, heading, list, etc.)
    codeBlock: createCodeBlockSpec({
      indentLineWithTab: true,
      defaultLanguage: 'text',
      supportedLanguages: CODE_BLOCK_LANGUAGES,
    }),
  },
});

interface PostEditorProps {
  postId: string;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Fallback component for editor errors
 */
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

/**
 * Converts BlockNote blocks to markdown
 */
async function blocksToMarkdown(editor: ReturnType<typeof useCreateBlockNote>): Promise<string> {
  return await editor.blocksToMarkdownLossy(editor.document);
}

/**
 * Converts markdown to BlockNote blocks
 */
async function markdownToBlocks(editor: ReturnType<typeof useCreateBlockNote>, markdown: string): Promise<void> {
  const blocks = await editor.tryParseMarkdownToBlocks(markdown);
  editor.replaceBlocks(editor.document, blocks);
}

type SidebarTab = 'frontmatter' | 'toc' | 'preview';

const SIDEBAR_WIDTH_KEY = 'cms-sidebar-width';
const SIDEBAR_DEFAULT_WIDTH = 320;

export function PostEditor({ postId, onClose, onSaved }: PostEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('frontmatter');

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? Number(saved) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Frontmatter state
  const [frontmatter, setFrontmatter] = useState<BlogSchema>({ title: '' });
  const frontmatterRef = useRef<FrontmatterEditorRef>(null);

  // Preview state
  const [previewContent, setPreviewContent] = useState('');

  // Category state
  const [currentCategories, setCurrentCategories] = useState<string[]>([]);
  const [pendingCategoryMappings, setPendingCategoryMappings] = useState<Record<string, string>>({});
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // BlockNote editor with code block language support
  const editor = useCreateBlockNote({ schema });
  const initialContentLoaded = useRef(false);
  const initialFrontmatterLoaded = useRef(false);

  // Extract headings for TOC
  const headings = useEditorHeadings(editor);

  // Load post data
  useEffect(() => {
    async function loadPost() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await readPost(postId);
        setFrontmatter(data.frontmatter);
        initialFrontmatterLoaded.current = true;

        // Load content into editor
        if (data.content && editor) {
          await markdownToBlocks(editor, data.content);
          initialContentLoaded.current = true;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load post');
      } finally {
        setIsLoading(false);
      }
    }

    loadPost();
  }, [postId, editor]);

  // Track content changes
  useEffect(() => {
    if (!editor) return;

    const unsubscribe = editor.onChange(() => {
      // Only mark as changed after initial content is loaded
      if (initialContentLoaded.current) {
        setHasUnsavedChanges(true);
      }
    });

    return unsubscribe;
  }, [editor]);

  // Handle frontmatter changes
  const handleFrontmatterChange = useCallback((fm: BlogSchema) => {
    setFrontmatter(fm);
    // Only mark as changed after initial frontmatter is loaded
    if (initialFrontmatterLoaded.current) {
      setHasUnsavedChanges(true);
    }
  }, []);

  // Handle categories change for new category detection
  const handleCategoriesChange = useCallback((categories: string[]) => {
    setCurrentCategories(categories);
  }, []);

  // Actual save operation (defined first so handleSave can reference it)
  const performSave = useCallback(
    async (categoryMappings?: Record<string, string>) => {
      if (!editor) return;

      setIsSaving(true);
      try {
        // Get markdown content
        const content = await blocksToMarkdown(editor);

        // Update the updated date
        const now = new Date();
        const updatedFrontmatter = {
          ...frontmatter,
          updated: now,
          // Set date if not present (new post)
          date: frontmatter.date || now,
        };

        await writePost(postId, updatedFrontmatter, content, categoryMappings);

        // Update category map if we added new mappings
        if (categoryMappings) {
          const currentMap = getCategoryMap();
          setCategoryMap({ ...currentMap, ...categoryMappings });
        }

        setHasUnsavedChanges(false);
        toast.success('Post saved successfully');
        onSaved?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save post');
      } finally {
        setIsSaving(false);
      }
    },
    [editor, frontmatter, postId, onSaved],
  );

  // Save post with new category detection
  const handleSave = useCallback(async () => {
    if (!editor) return;

    // Check for new categories
    const newCats = detectNewCategories(currentCategories);
    if (Object.keys(newCats).length > 0) {
      setPendingCategoryMappings(newCats);
      setShowCategoryDialog(true);
      return;
    }

    await performSave();
  }, [editor, currentCategories, performSave]);

  // Handle category mapping confirmation
  const handleCategoryMappingConfirm = useCallback(
    (mappings: Record<string, string>) => {
      setShowCategoryDialog(false);
      performSave(mappings);
    },
    [performSave],
  );

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Sidebar resize handling
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Persist width to localStorage
      localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, sidebarWidth]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  // Get post preview URL (points to Astro dev server)
  const getPreviewUrl = () => {
    // Use frontmatter.link if available, otherwise extract filename from postId
    const slug =
      frontmatter.link ||
      postId
        .replace(/\.mdx?$/, '')
        .split('/')
        .pop();
    return `${DEV_SERVER_URL}/post/${slug}`;
  };

  // Handle TOC navigation
  const handleTOCNavigate = useCallback(
    (blockId: string) => {
      if (!editor) return;

      // Set cursor position and focus
      editor.setTextCursorPosition(blockId);
      editor.focus();

      // Scroll block into view after cursor position is set
      // BlockNote renders blocks with data-id attribute
      requestAnimationFrame(() => {
        const blockElement = document.querySelector(`[data-id="${blockId}"]`);
        if (blockElement) {
          blockElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    },
    [editor],
  );

  // Handle sidebar tab change
  const handleTabChange = useCallback(
    async (tab: SidebarTab) => {
      if (tab === 'preview' && editor) {
        // Convert blocks to markdown when switching to preview
        const md = await blocksToMarkdown(editor);
        setPreviewContent(md);
      }
      setSidebarTab(tab);
    },
    [editor],
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="ri:loader-4-line" className="size-12 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="ri:error-warning-line" className="size-12 text-destructive" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-border border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Close editor"
          >
            <Icon icon="ri:arrow-left-line" className="size-5" />
          </button>
          <div>
            <h1 className="line-clamp-1 font-medium">{frontmatter.title || 'Untitled'}</h1>
            <p className="text-muted-foreground text-xs">{postId}</p>
          </div>
          {hasUnsavedChanges && <span className="rounded bg-orange-500/10 px-2 py-0.5 text-orange-500 text-xs">Unsaved</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Preview link */}
          <a
            href={getPreviewUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon icon="ri:external-link-line" className="size-4" />
            Preview
          </a>

          {/* Toggle sidebar */}
          <button
            type="button"
            onClick={() => setShowSidebar(!showSidebar)}
            className={cn(
              'rounded-lg p-2 transition-colors',
              showSidebar ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
            title="Toggle frontmatter panel"
          >
            <Icon icon="ri:sidebar-unfold-line" className="size-5" />
          </button>

          {/* Save button */}
          <Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
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

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto max-w-3xl p-6">
            <ErrorBoundary FallbackComponent={EditorErrorFallback}>
              <BlockNoteView editor={editor} theme="dark" />
            </ErrorBoundary>
          </div>
        </main>

        {/* Resize Handle */}
        {showSidebar && (
          <hr
            tabIndex={0}
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuenow={sidebarWidth}
            className={cn(
              'h-full w-1 shrink-0 cursor-col-resize border-none transition-colors hover:bg-primary/50',
              isResizing && 'bg-primary',
            )}
            onMouseDown={() => setIsResizing(true)}
          />
        )}

        {/* Sidebar */}
        {showSidebar && (
          <aside style={{ width: sidebarWidth }} className="flex shrink-0 flex-col border-border border-l bg-card">
            {/* Tab buttons */}
            <div className="flex border-border border-b">
              <button
                type="button"
                onClick={() => handleTabChange('frontmatter')}
                className={cn(
                  'flex-1 px-3 py-2.5 font-medium text-sm transition-colors',
                  sidebarTab === 'frontmatter'
                    ? 'border-primary border-b-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon icon="ri:settings-3-line" className="mr-1 inline-block size-4" />
                属性
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('toc')}
                className={cn(
                  'flex-1 px-3 py-2.5 font-medium text-sm transition-colors',
                  sidebarTab === 'toc'
                    ? 'border-primary border-b-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon icon="ri:list-unordered" className="mr-1 inline-block size-4" />
                目录
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('preview')}
                className={cn(
                  'flex-1 px-3 py-2.5 font-medium text-sm transition-colors',
                  sidebarTab === 'preview'
                    ? 'border-primary border-b-2 text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon icon="ri:eye-line" className="mr-1 inline-block size-4" />
                预览
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {sidebarTab === 'frontmatter' && (
                <FrontmatterEditor
                  ref={frontmatterRef}
                  frontmatter={frontmatter}
                  onChange={handleFrontmatterChange}
                  onCategoriesChange={handleCategoriesChange}
                />
              )}
              {sidebarTab === 'toc' && (
                <div className="p-4">
                  <EditorTOC headings={headings} onNavigate={handleTOCNavigate} />
                </div>
              )}
              {sidebarTab === 'preview' && (
                <div className="p-4">
                  <MarkdownPreview content={previewContent} />
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Category Mapping Dialog */}
      <CategoryMappingDialog
        open={showCategoryDialog}
        onOpenChange={setShowCategoryDialog}
        newCategories={pendingCategoryMappings}
        onConfirm={handleCategoryMappingConfirm}
        onCancel={() => setShowCategoryDialog(false)}
      />
    </div>
  );
}
