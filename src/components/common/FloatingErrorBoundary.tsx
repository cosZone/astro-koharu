/**
 * FloatingErrorBoundary Component
 *
 * Error boundary specifically designed for floating UI components (Popover, Tooltip, Dropdown).
 * Prevents crashes in floating elements from breaking the entire UI.
 *
 * @example
 * ```tsx
 * <FloatingErrorBoundary>
 *   <Popover>...</Popover>
 * </FloatingErrorBoundary>
 * ```
 */

import type { FC, PropsWithChildren, ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

export interface FloatingErrorBoundaryProps extends PropsWithChildren {
  /** Optional fallback UI to display on error (default: null for graceful degradation) */
  fallback?: ReactNode;
  /** Callback when error is caught */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Optional component name for better error messages */
  componentName?: string;
}

/**
 * Fallback component that renders nothing by default
 * Floating UI components failing should not block the main content
 */
const FloatingFallback: FC<FallbackProps & { fallback?: ReactNode }> = ({ fallback }) => {
  return fallback ? fallback : null;
};

/**
 * Error boundary for floating UI components.
 * Gracefully handles errors without breaking the main UI.
 */
const FloatingErrorBoundary: FC<FloatingErrorBoundaryProps> = ({ children, fallback, onError, componentName }) => {
  return (
    <ErrorBoundary
      fallbackRender={(props) => <FloatingFallback {...props} fallback={fallback} />}
      onError={(error, info) => {
        if (import.meta.env.DEV) {
          console.error('[FloatingErrorBoundary] caught an error:', error, info);
          if (componentName) {
            console.error(`Component: ${componentName}`);
          }
        }
        onError?.(error, info);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

/**
 * HOC to wrap components with FloatingErrorBoundary
 *
 * @example
 * ```tsx
 * const SafePopover = withFloatingErrorBoundary(Popover, 'Popover');
 * <SafePopover>...</SafePopover>
 * ```
 */
export function withFloatingErrorBoundary<P extends object>(Component: React.ComponentType<P>, componentName?: string): FC<P> {
  const WrappedComponent: FC<P> = (props) => (
    <FloatingErrorBoundary componentName={componentName}>
      <Component {...props} />
    </FloatingErrorBoundary>
  );

  WrappedComponent.displayName = `withFloatingErrorBoundary(${componentName || Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default FloatingErrorBoundary;
