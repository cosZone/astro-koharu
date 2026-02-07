import { cn } from '@lib/utils';
import { AnimatePresence, motion } from 'motion/react';

interface QuizGapProps {
  answer: string;
  revealed: boolean;
  onClick: () => void;
  isMistake?: boolean;
}

export function QuizGap({ answer, revealed, onClick, isMistake }: QuizGapProps) {
  return (
    <AnimatePresence mode="wait">
      {revealed ? (
        <motion.span
          key="answer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'inline-block rounded px-1.5 py-0.5 font-semibold',
            isMistake
              ? 'bg-red-100 text-red-600 line-through dark:bg-red-950/40 dark:text-red-400'
              : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
          )}
        >
          {answer}
        </motion.span>
      ) : (
        <motion.button
          key="blank"
          type="button"
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={onClick}
          className="inline-block cursor-pointer border-primary/50 border-b-2 border-dashed px-4 py-0.5 text-transparent transition-colors hover:border-primary hover:bg-primary/5"
          aria-label="点击查看答案"
        >
          {answer}
        </motion.button>
      )}
    </AnimatePresence>
  );
}
