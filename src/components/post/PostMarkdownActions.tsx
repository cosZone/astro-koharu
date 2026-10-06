/**
 * Markdown actions beside the post breadcrumb: a split button whose primary half
 * copies the post's raw source (`<post url>.md`) and whose chevron opens the rest.
 */

import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  RiArrowDownSLine,
  RiCheckLine,
  RiDownload2Line,
  RiErrorWarningLine,
  RiFileCopyLine,
  RiQuillPenLine,
} from 'react-icons/ri';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { copyMarkdown } from '@/features/editor/clipboard';

interface LocalEditorLink {
  id: string;
  name: string;
  icon: string;
  href: string;
}

interface PostMarkdownActionsProps {
  locale: string;
  /** Same-origin path to the raw source, e.g. `/post/note/foo.md`. */
  sourcePath: string;
  filename: string;
  copy: boolean;
  download: boolean;
  /** Writing room link; omitted when the entry is unavailable. */
  editorHref?: string;
  /** Dev-only deep links into local editors. */
  localEditors?: LocalEditorLink[];
}

type Status = 'idle' | 'busy' | 'copied' | 'downloaded' | 'failed';

const RESET_DELAY: Record<Status, number> = { idle: 0, busy: 0, copied: 1500, downloaded: 2500, failed: 2500 };

const capsule = 'flex items-center gap-1 px-2.5 py-1 transition-colors duration-200 hover:bg-primary/20';
const focusRing = 'outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary/50';

async function fetchSource(path: string): Promise<string> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

function saveText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** Starts the clipboard write synchronously so Safari keeps the user activation across the fetch. */
async function copySource(path: string, filename: string): Promise<'copied' | 'downloaded'> {
  const text = fetchSource(path);
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      const blob = text.then((value) => new Blob([value], { type: 'text/plain' }));
      await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
      return 'copied';
    } catch {
      // Falls through to writeText / selection copy once the text is in hand.
    }
  }
  const source = await text;
  if (await copyMarkdown(source)) return 'copied';
  saveText(source, filename);
  return 'downloaded';
}

export default function PostMarkdownActions({
  locale,
  sourcePath,
  filename,
  copy,
  download,
  editorHref,
  localEditors = [],
}: PostMarkdownActionsProps) {
  const { t } = useTranslation(locale);
  const [status, setStatus] = useState<Status>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const settle = (next: Status) => {
    setStatus(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setStatus('idle'), RESET_DELAY[next]);
  };

  const handleCopy = async () => {
    if (status === 'busy') return;
    setStatus('busy');
    try {
      settle(await copySource(sourcePath, filename));
    } catch {
      settle('failed');
    }
  };

  const copyLabel = t('post.markdown.copy');
  const downloadLabel = t('post.markdown.download');
  const editorLabel = t('post.markdown.openInEditor');
  const announcement = {
    idle: '',
    busy: '',
    copied: t('post.markdown.copied'),
    downloaded: t('post.markdown.downloadedInstead'),
    failed: t('post.markdown.failed'),
  }[status];

  const menuDownload = copy && download;
  const menuEditor = Boolean((copy || download) && editorHref);
  const hasMenu = menuDownload || menuEditor || localEditors.length > 0;
  const primaryClass = cn(capsule, focusRing, hasMenu ? 'rounded-l-full' : 'rounded-full');
  const iconClass = 'size-3.5 shrink-0';

  let primary: ReactNode = null;
  if (copy) {
    const StatusIcon = status === 'copied' ? RiCheckLine : status === 'failed' ? RiErrorWarningLine : RiFileCopyLine;
    primary = (
      <button
        type="button"
        onClick={handleCopy}
        aria-busy={status === 'busy'}
        aria-label={copyLabel}
        title={copyLabel}
        className={cn(primaryClass, status === 'busy' && 'cursor-progress opacity-70')}
      >
        <StatusIcon aria-hidden="true" className={iconClass} />
        <span className="hidden sm:inline">{status === 'copied' ? t('post.markdown.copied') : copyLabel}</span>
      </button>
    );
  } else if (download) {
    primary = (
      <a href={sourcePath} download={filename} aria-label={downloadLabel} title={downloadLabel} className={primaryClass}>
        <RiDownload2Line aria-hidden="true" className={iconClass} />
        <span className="hidden sm:inline">{downloadLabel}</span>
      </a>
    );
  } else if (editorHref) {
    primary = (
      <a href={editorHref} aria-label={editorLabel} title={editorLabel} className={primaryClass}>
        <RiQuillPenLine aria-hidden="true" className={iconClass} />
        <span className="hidden sm:inline">{editorLabel}</span>
      </a>
    );
  }
  if (!primary) return null;

  return (
    <div className="flex shrink-0 items-center">
      <div className="flex items-stretch rounded-full bg-primary/10 text-primary">
        {primary}
        {hasMenu && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t('post.markdown.more')}
                title={t('post.markdown.more')}
                className={cn(
                  capsule,
                  focusRing,
                  'rounded-r-full border-primary/20 border-l px-1.5 data-[state=open]:bg-primary/20',
                )}
              >
                <RiArrowDownSLine aria-hidden="true" className={iconClass} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              {menuDownload && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href={sourcePath} download={filename}>
                    <RiDownload2Line aria-hidden="true" />
                    {downloadLabel}
                  </a>
                </DropdownMenuItem>
              )}
              {menuEditor && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href={editorHref}>
                    <RiQuillPenLine aria-hidden="true" />
                    {editorLabel}
                  </a>
                </DropdownMenuItem>
              )}
              {localEditors.length > 0 && (
                <>
                  {(menuDownload || menuEditor) && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {t('post.markdown.localEditors')}
                  </DropdownMenuLabel>
                  {localEditors.map((editor) => (
                    <DropdownMenuItem key={editor.id} asChild className="cursor-pointer">
                      <a href={editor.href}>
                        <Icon icon={editor.icon} aria-hidden="true" />
                        {editor.name}
                      </a>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </div>
  );
}
