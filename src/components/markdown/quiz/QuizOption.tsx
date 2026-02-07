import { cn } from '@lib/utils';

interface QuizOptionProps {
  index: number;
  html: string;
  isCorrect: boolean;
  isSelected: boolean;
  revealed: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function QuizOption({ index, html, isCorrect, isSelected, revealed, disabled, onClick }: QuizOptionProps) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-all',
        !revealed && !disabled && 'cursor-pointer hover:border-primary/30 hover:bg-primary/5',
        !revealed && isSelected && 'border-primary/50 bg-primary/10',
        revealed && isCorrect && 'border-green-500/60 bg-green-50 dark:bg-green-950/30',
        revealed && isSelected && !isCorrect && 'border-red-500/60 bg-red-50 dark:bg-red-950/30',
        revealed && !isSelected && !isCorrect && 'opacity-40',
        disabled && !revealed && 'cursor-default',
      )}
      onClick={onClick}
      disabled={disabled}
      aria-label={`选项 ${String.fromCharCode(65 + index)}`}
      aria-pressed={isSelected}
    >
      <span
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full font-semibold text-xs',
          !revealed && !isSelected && 'bg-muted text-muted-foreground',
          !revealed && isSelected && 'bg-primary text-primary-foreground',
          revealed && isCorrect && 'bg-green-500 text-white',
          revealed && isSelected && !isCorrect && 'bg-red-500 text-white',
        )}
      >
        {revealed && isCorrect ? '✓' : revealed && isSelected && !isCorrect ? '✗' : String.fromCharCode(65 + index)}
      </span>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown */}
      <span className="flex-1 [&>p]:m-0" dangerouslySetInnerHTML={{ __html: html }} />
    </button>
  );
}
