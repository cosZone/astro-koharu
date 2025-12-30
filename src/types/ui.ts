/**
 * UI Component Shared Types
 *
 * This file contains shared types for UI components including variants, sizes, states, and common patterns.
 */

/**
 * Common component sizes
 */
export type Size = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Component variant types extracted from CVA
 */
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'gradient-shoka';
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'shoka-tag';

/**
 * Open/close state for interactive components
 */
export interface OpenCloseState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

/**
 * Controlled component props pattern
 */
export interface ControlledComponentProps<T> {
  /** Controlled value */
  value?: T;
  /** Default value for uncontrolled mode */
  defaultValue?: T;
  /** Change handler */
  onChange?: (value: T) => void;
}

/**
 * Generic option type for select-like components
 */
export type OptionType<T extends string | number = string | number> = {
  label?: string;
  value: T;
} | null;

/**
 * Floating UI position types
 */
export type FloatingPosition =
  | 'top'
  | 'right'
  | 'bottom'
  | 'left'
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'right-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end';

/**
 * Common className prop
 */
export interface WithClassName {
  className?: string;
}

/**
 * Common children prop
 */
export interface WithChildren {
  children?: React.ReactNode;
}

/**
 * Ref forwarding pattern
 */
export type ForwardedRef<T> = React.ForwardedRef<T>;
