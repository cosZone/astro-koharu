/**
 * CodeBlockFullscreen Component
 *
 * A fullscreen code viewer dialog with syntax highlighting and copy functionality.
 * Uses the unified modal store for state management.
 */

import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { FloatingFocusManager, FloatingPortal, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $codeFullscreenData, type CodeBlockData, closeModal, openModal } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';

/**
 * Parse inline style string to React CSSProperties
 */
function parseInlineStyles(styleString: string): React.CSSProperties {
  if (!styleString) return {};

  const styles: Record<string, string> = {};
  const declarations = styleString.split(';').filter((s) => s.trim());

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;

    const property = declaration.slice(0, colonIndex).trim();
    const value = declaration.slice(colonIndex + 1).trim();
    if (!property || !value) continue;

    const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styles[camelProperty] = value;
  }

  return styles as React.CSSProperties;
}

export default function CodeBlockFullscreen() {
  const data = useStore($codeFullscreenData);
  const isOpen = data !== null;

  const { refs, context } = useFloating({
    open: isOpen,
    onOpenChange: (open) => {
      if (!open) closeModal();
    },
  });
  const dismiss = useDismiss(context, { outsidePressEvent: 'mousedown' });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  // Listen for custom event from code block enhancer
  useEffect(() => {
    const handleOpenEvent = (e: CustomEvent<CodeBlockData>) => {
      openModal('codeFullscreen', e.detail);
    };
    window.addEventListener('open-code-fullscreen', handleOpenEvent as EventListener);
    return () => window.removeEventListener('open-code-fullscreen', handleOpenEvent as EventListener);
  }, []);

  // Close on page navigation
  useEffect(() => {
    const close = () => closeModal();
    document.addEventListener('astro:before-preparation', close);
    return () => document.removeEventListener('astro:before-preparation', close);
  }, []);

  if (!data) return null;

  const preStyles = parseInlineStyles(data.preStyle);

  return (
    <FloatingPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
            <FloatingFocusManager context={context}>
              <div className="fixed inset-0 z-50 grid place-items-center px-4">
                <motion.div
                  ref={refs.setFloating}
                  className="relative flex h-[80vh] w-[90vw] max-w-6xl flex-col overflow-hidden overscroll-none rounded-xl bg-background shadow-2xl md:max-w-[90vw]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  {...getFloatingProps()}
                >
                  <MacToolbar language={data.language} onClose={closeModal}>
                    <CopyButton text={data.code} showLabel />
                  </MacToolbar>
                  <div className="scroll-feather-mask flex-1 overflow-auto">
                    <pre className={cn(data.preClassName, 'p-4')} style={preStyles}>
                      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Safe - codeHTML comes from Shiki syntax highlighter output only */}
                      <code className={data.codeClassName} dangerouslySetInnerHTML={{ __html: data.codeHTML }} />
                    </pre>
                  </div>
                </motion.div>
              </div>
            </FloatingFocusManager>
          </motion.div>
        )}
      </AnimatePresence>
    </FloatingPortal>
  );
}
