/**
 * TocContext
 *
 * Carries active/expanded state and the click handler to the heading tree, so
 * `HeadingList` and `HeadingTreeItem` read them directly instead of having them
 * threaded through every nesting level.
 */

import type { TocContextValue } from '@lib/toc';
import { createContext, useContext } from 'react';

const TocContext = createContext<TocContextValue | null>(null);

export function TocProvider({ value, children }: { value: TocContextValue; children: React.ReactNode }) {
  return <TocContext.Provider value={value}>{children}</TocContext.Provider>;
}

export function useTocContext(): TocContextValue {
  const value = useContext(TocContext);
  if (!value) throw new Error('useTocContext must be used within a TocProvider');
  return value;
}
