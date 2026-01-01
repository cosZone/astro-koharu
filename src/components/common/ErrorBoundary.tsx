'use client';

import type { ComponentProps, FC, PropsWithChildren, ReactNode } from 'react';
import { ErrorBoundary as ErrorBoundaryLib, type FallbackProps } from 'react-error-boundary';
import { HiChat } from 'react-icons/hi';
import { RiRefreshLine } from 'react-icons/ri';
import { Button } from '../ui/button';

export interface ErrorFallbackProps extends FallbackProps {
  /** Custom title for error display */
  title?: string;
  /** Whether to show error details (stack trace in dev) */
  showDetails?: boolean;
  /** Custom action buttons */
  actions?: ReactNode;
}

/**
 * Default error fallback component with retry functionality
 */
export const ErrorFallback: FC<ErrorFallbackProps> = ({
  error,
  resetErrorBoundary,
  title = 'Oops, something went wrong!',
  showDetails = import.meta.env.DEV,
  actions,
}) => {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
      <div className="flex-center gap-2 font-medium text-lg text-red-700 dark:text-red-400">
        <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        {title}
      </div>

      {showDetails && error?.message && (
        <div className="w-full rounded-md bg-red-100 p-3 font-mono text-red-800 text-sm dark:bg-red-900/30 dark:text-red-300">
          <p className="font-semibold">Error: {error.message}</p>
          {import.meta.env.DEV && error?.stack && (
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-xs opacity-70">{error.stack}</pre>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {actions ?? (
          <>
            <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-1.5">
              <RiRefreshLine className="size-4" />
              Try Again
            </Button>
            <a
              href="https://github.com/cosZone/astro-koharu/issues/new"
              target="_blank"
              className="flex-center gap-1.5 text-blue-600 text-sm transition-colors hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              rel="noopener"
            >
              <HiChat className="size-4" />
              Report Issue
            </a>
          </>
        )}
      </div>
    </div>
  );
};

/**
 * Minimal inline error fallback for smaller components
 */
export const InlineErrorFallback: FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex-center-y gap-2 text-lg text-red-600 dark:text-red-400">
      <span>Error{error?.message ? `: ${error.message}` : ''}</span>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-1.5">
          <RiRefreshLine className="size-4" />
          Try Again
        </Button>
        <a href="https://github.com/cosZone/astro-koharu/issues/new" target="_blank" rel="noopener">
          <Button variant="outline" size="sm" onClick={resetErrorBoundary} className="gap-1.5">
            <HiChat className="size-4" />
            Report Issue
          </Button>
        </a>
      </div>
    </div>
  );
};

export interface ErrorBoundaryProps extends PropsWithChildren {
  /** Fallback component to render on error */
  fallback?: ComponentProps<typeof ErrorBoundaryLib>['fallback'];
  /** Fallback render function for more control */
  fallbackRender?: ComponentProps<typeof ErrorBoundaryLib>['fallbackRender'];
  /** Fallback component for full control */
  FallbackComponent?: ComponentProps<typeof ErrorBoundaryLib>['FallbackComponent'];
  /** Callback when error is caught */
  onError?: (error: Error, info: React.ErrorInfo) => void;
  /** Callback when boundary is reset */
  onReset?: () => void;
  /** Keys that trigger reset when changed */
  resetKeys?: unknown[];
}

/**
 * Error boundary component with graceful error handling
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With custom fallback
 * <ErrorBoundary
 *   fallbackRender={({ error, resetErrorBoundary }) => (
 *     <CustomError error={error} onRetry={resetErrorBoundary} />
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export const ErrorBoundary: FC<ErrorBoundaryProps> = ({
  children,
  fallback,
  fallbackRender,
  FallbackComponent,
  onError,
  onReset,
  resetKeys,
}) => {
  const handleError = (error: Error, info: React.ErrorInfo) => {
    console.error('[ErrorBoundary]', error, info);
    onError?.(error, info);
  };

  const commonProps = {
    onError: handleError,
    onReset,
    resetKeys,
  };

  // Priority: fallback > fallbackRender > FallbackComponent > default ErrorFallback
  if (fallback !== undefined) {
    return (
      <ErrorBoundaryLib {...commonProps} fallback={fallback}>
        {children}
      </ErrorBoundaryLib>
    );
  }

  if (fallbackRender !== undefined) {
    return (
      <ErrorBoundaryLib {...commonProps} fallbackRender={fallbackRender}>
        {children}
      </ErrorBoundaryLib>
    );
  }

  return (
    <ErrorBoundaryLib {...commonProps} FallbackComponent={FallbackComponent ?? ErrorFallback}>
      {children}
    </ErrorBoundaryLib>
  );
};
