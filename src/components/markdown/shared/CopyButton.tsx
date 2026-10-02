/**
 * Copy button with animated checkmark feedback.
 * Uses useCopyToClipboard hook for state management.
 */

import { useCopyToClipboard } from '@hooks/useCopyToClipboard';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { CheckIcon } from './icons';

interface CopyButtonProps {
  text: string;
  className?: string;
  showLabel?: boolean;
}

export function CopyButton({ text, className, showLabel }: CopyButtonProps) {
  const { copied, copy } = useCopyToClipboard();
  const { t } = useTranslation();

  const label = copied ? t('common.copied') : t('common.copy');

  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={cn(
        'flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-accent-foreground active:scale-95',
        showLabel ? 'gap-2 px-3 tablet:px-0 py-1.5' : 'size-11',
        copied && 'text-primary',
        className,
      )}
      aria-label={label}
      title={label}
    >
      {copied ? <CheckIcon /> : <Icon icon="ri:file-copy-line" className="size-4" />}
      {showLabel && <span className="tablet:hidden text-sm">{label}</span>}
    </button>
  );
}
