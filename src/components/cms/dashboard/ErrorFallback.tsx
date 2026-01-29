/**
 * ErrorFallback Component
 *
 * Shared error fallback for dashboard error boundaries.
 * Supports both dialog (compact) and page (full-screen) variants.
 */

import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { Button } from '@/components/ui/button';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
  variant?: 'dialog' | 'page';
}

export function ErrorFallback({ error, resetErrorBoundary, variant = 'dialog' }: ErrorFallbackProps) {
  const isPage = variant === 'page';

  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 p-6', isPage ? 'min-h-screen' : 'h-full')}>
      <Icon icon="ri:error-warning-line" className={cn('text-destructive', isPage ? 'size-16' : 'size-12')} />
      <h3 className={cn('font-semibold', isPage ? 'text-xl' : 'text-lg')}>Something went wrong</h3>
      <p className={cn('max-w-md text-center text-muted-foreground', !isPage && 'text-sm')}>{error.message}</p>
      <Button size={isPage ? 'default' : 'sm'} onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}
