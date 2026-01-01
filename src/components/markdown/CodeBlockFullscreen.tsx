/**
 * CodeBlockFullscreen Component
 *
 * A fullscreen code viewer dialog with syntax highlighting and copy functionality.
 * Uses the unified modal store for state management.
 */

import { Dialog, DialogPortal } from '@components/ui/dialog';
import { useEscapeKey } from '@hooks/useKeyboardShortcut';
import { copyToClipboard } from '@lib/code-block-enhancer';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $codeFullscreenData, type CodeBlockData, closeModal, openModal } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';

// Icons
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 448 512"
      fill="currentColor"
      className={className}
    >
      <title>Copy</title>
      <path d="M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" className={className}>
      <title>Copied</title>
      <mask id="checkmark-anim-fullscreen">
        <g
          fill="none"
          stroke="#fff"
          strokeDasharray="24"
          strokeDashoffset="24"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M2 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="24;0" />
          </path>
          <path stroke="#000" strokeWidth="6" d="M7.5 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0" />
          </path>
          <path d="M7.5 13.5l4 4l10.75 -10.75">
            <animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="24;0" />
          </path>
        </g>
      </mask>
      <rect width="24" height="24" fill="currentColor" mask="url(#checkmark-anim-fullscreen)" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <title>Close</title>
      <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" />
    </svg>
  );
}

/**
 * Parse inline style string to apply to element
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

    // Convert kebab-case to camelCase for React
    const camelProperty = property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styles[camelProperty] = value;
  }

  return styles as React.CSSProperties;
}

export default function CodeBlockFullscreen() {
  const data = useStore($codeFullscreenData);
  const isOpen = data !== null;
  const [copied, setCopied] = useState(false);

  // Handle escape key
  useEscapeKey(() => {
    if (isOpen) closeModal();
  }, isOpen);

  // Listen for custom event from code block enhancer
  useEffect(() => {
    const handleOpenEvent = (e: CustomEvent<CodeBlockData>) => {
      openModal('codeFullscreen', e.detail);
    };

    window.addEventListener('open-code-fullscreen', handleOpenEvent as EventListener);
    return () => {
      window.removeEventListener('open-code-fullscreen', handleOpenEvent as EventListener);
    };
  }, []);

  // Close on page navigation
  useEffect(() => {
    const handleBeforePreparation = () => {
      if (isOpen) closeModal();
    };

    document.addEventListener('astro:before-preparation', handleBeforePreparation);
    return () => {
      document.removeEventListener('astro:before-preparation', handleBeforePreparation);
    };
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    if (!data) return;

    const success = await copyToClipboard(data.code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data]);

  const handleClose = useCallback(() => {
    closeModal();
  }, []);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose],
  );

  if (!data) return null;

  const preStyles = parseInlineStyles(data.preStyle);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogPortal forceMount>
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Overlay */}
              <motion.div
                className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />

              {/* Dialog */}
              <motion.div
                className="fixed inset-0 z-50 grid place-items-center px-4"
                onClick={handleBackgroundClick}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <motion.div
                  className="relative flex h-[85vh] w-[90vw] max-w-6xl flex-col overflow-hidden rounded-xl bg-background shadow-2xl md:max-w-[90vw]"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Toolbar */}
                  <div className="flex shrink-0 items-center justify-between border-border border-b bg-muted/50 px-4 py-3 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-2">
                        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="font-medium font-mono text-muted-foreground text-xs uppercase tracking-wider">
                        {data.language}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleCopy}
                        className={cn(
                          'flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                          copied && 'text-primary',
                        )}
                      >
                        {copied ? <CheckIcon /> : <CopyIcon />}
                        <span className="text-sm">{copied ? '已复制' : '复制'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label="关闭"
                      >
                        <CloseIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  {/* Code Content */}
                  <div className="scroll-feather-mask flex-1 overflow-auto">
                    <pre className={cn(data.preClassName, 'p-4')} style={preStyles}>
                      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Safe - codeHTML comes from Shiki syntax highlighter output only */}
                      <code className={data.codeClassName} dangerouslySetInnerHTML={{ __html: data.codeHTML }} />
                    </pre>
                  </div>
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </DialogPortal>
    </Dialog>
  );
}
