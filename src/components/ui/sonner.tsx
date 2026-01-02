/**
 * Sonner Toaster Component
 *
 * shadcn-style wrapper for Sonner toast library.
 * Integrates with the project's theme system.
 */

import { useIsDarkTheme } from '@hooks/useIsDarkTheme';
import { Icon } from '@iconify/react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
  const isDark = useIsDarkTheme();

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      position="bottom-right"
      gap={12}
      icons={{
        success: <Icon icon="ri:checkbox-circle-line" className="size-4" />,
        info: <Icon icon="ri:information-line" className="size-4" />,
        warning: <Icon icon="ri:alert-line" className="size-4" />,
        error: <Icon icon="ri:error-warning-line" className="size-4" />,
        loading: <Icon icon="ri:loader-4-line" className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
