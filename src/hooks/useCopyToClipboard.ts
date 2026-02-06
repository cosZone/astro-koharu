/**
 * Hook for clipboard copy with visual feedback state.
 * Encapsulates the copy-to-clipboard logic and manages the "copied" state timer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const FEEDBACK_DURATION = 2000;

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clear pending timeout on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), FEEDBACK_DURATION);
    } catch {
      console.warn('Clipboard write failed — clipboard API may not be available in this context');
    }
  }, []);

  return { copied, copy };
}
