/**
 * Custom Hooks Barrel Export
 *
 * Centralized export for all custom React hooks.
 * Import hooks from '@hooks' for convenience.
 */

export { type UseActiveHeadingOptions, useActiveHeading } from './useActiveHeading';

// Controlled/uncontrolled state pattern
export { type UseControlledStateOptions, useControlledState } from './useControlledState';
// Clipboard with feedback
export { useCopyToClipboard } from './useCopyToClipboard';
export { type CurrentHeading, type UseCurrentHeadingOptions, useCurrentHeading } from './useCurrentHeading';
export { type UseExpandedStateOptions, type UseExpandedStateReturn, useExpandedState } from './useExpandedState';
// Floating UI wrapper
export { type UseFloatingUIOptions, useFloatingUI } from './useFloatingUI';
export { type UseHeadingClickHandlerOptions, useHeadingClickHandler } from './useHeadingClickHandler';
// TableOfContents-specific hooks
export { findHeadingById, getParentIds, getSiblingIds, type Heading, useHeadingTree } from './useHeadingTree';
// Theme state hook (monitors actual page theme, not system preference)
export { useIsDarkTheme } from './useIsDarkTheme';
// Utility hooks
export { useIsMounted } from './useIsMounted';
// Keyboard shortcuts
export { type KeyboardShortcutOptions, type ModifierKey, useEscapeKey, useKeyboardShortcut } from './useKeyboardShortcut';
// Media query hooks
export { useIsMobile, useIsTablet, useMediaQuery, usePrefersColorSchemeDark, usePrefersReducedMotion } from './useMediaQuery';
// Timer management
export { useRetimer } from './useRetimer';
// Scroll state hooks
export {
  type ScrollTriggerState,
  type UseScrollTriggerOptions,
  useScrolledPast,
  useScrollTrigger,
  useScrollY,
} from './useScrollTrigger';
// Search keyboard navigation
export { useSearchKeyboardNav } from './useSearchKeyboardNav';
// Zoom and pan for fullscreen viewers
export { type UseZoomPanReturn, useZoomPan } from './useZoomPan';
