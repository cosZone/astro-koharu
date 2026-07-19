import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { microDampingPreset } from '@constants/anim/spring';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';

interface QuizExplanationProps {
  html: string | null;
  visible: boolean;
}

/** Replace text emoji codes with actual emoji characters */
function replaceEmoji(html: string): string {
  return html.replaceAll(':heavy_check_mark:', '✔️').replaceAll(':x:', '❌');
}

export function QuizExplanation({ html, visible }: QuizExplanationProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!html) return null;

  return (
    <LazyMotionProvider>
      <AnimatePresence>
        {visible && (
          <m.div
            layout={!shouldReduceMotion}
            initial={shouldReduceMotion ? false : { opacity: 0, scaleY: 0.96, y: -4 }}
            animate={{ opacity: 1, scaleY: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scaleY: 0.96, y: -4 }}
            transition={shouldReduceMotion ? { duration: 0 } : microDampingPreset}
            className="origin-top overflow-hidden"
          >
            <div
              className="mt-3 rounded-lg border border-blue-200/60 bg-blue-50/50 px-4 py-3 text-sm dark:border-blue-800/40 dark:bg-blue-950/20 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Content from build-time Markdown
              dangerouslySetInnerHTML={{ __html: replaceEmoji(html) }}
            />
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotionProvider>
  );
}
