import { microDampingPreset } from '@constants/anim/spring';
import { AnimatePresence, motion } from 'motion/react';

interface QuizExplanationProps {
  html: string | null;
  visible: boolean;
}

/** Replace text emoji codes with actual emoji characters */
function replaceEmoji(html: string): string {
  return html.replaceAll(':heavy_check_mark:', '✔️').replaceAll(':x:', '❌');
}

export function QuizExplanation({ html, visible }: QuizExplanationProps) {
  if (!html) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={microDampingPreset}
          className="overflow-hidden"
        >
          <div
            className="mt-3 rounded-lg border border-blue-200/60 bg-blue-50/50 px-4 py-3 text-sm dark:border-blue-800/40 dark:bg-blue-950/20 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown
            dangerouslySetInnerHTML={{ __html: replaceEmoji(html) }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
