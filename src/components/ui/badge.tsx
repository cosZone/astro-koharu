/**
 * Badge Component
 *
 * A small visual indicator for labels, tags, categories, or status.
 * Typically used to highlight important information or metadata.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Badge>New</Badge>
 *
 * // With variants
 * <Badge variant="secondary">Beta</Badge>
 * <Badge variant="destructive">Error</Badge>
 * <Badge variant="outline">Pending</Badge>
 *
 * // With custom styling
 * <Badge className="uppercase">Featured</Badge>
 *
 * // As a tag (Shoka theme style)
 * <Badge variant="shoka-tag">React</Badge>
 * ```
 */

import { cn } from '@lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold text-xs transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 md:px-1.5',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-badge-primary text-primary-foreground hover:bg-badge-primary/90',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'border-badge-primary text-badge-primary',
        'shoka-tag': 'border-none bg-black/50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(({ className, variant, ...props }, ref) => {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
});
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
