/**
 * Button Component
 *
 * A flexible button component with multiple variants and sizes.
 * Supports Radix UI Slot pattern for rendering as a child element.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <Button variant="default" size="md">
 *   Click me
 * </Button>
 *
 * // With custom styling
 * <Button variant="outline" className="mt-4">
 *   Outlined Button
 * </Button>
 *
 * // As a child (renders as Link but with Button styles)
 * <Button asChild>
 *   <Link href="/about">About</Link>
 * </Button>
 *
 * // Disabled state
 * <Button disabled>Disabled</Button>
 * ```
 */

import { cn } from '@lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-background/70',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        'gradient-shoka': 'bg-gradient-shoka-button text-primary-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /**
   * When true, renders the Button as a Slot component,
   * allowing it to be used as a wrapper for other elements
   * (e.g., Next.js Link, Astro anchor) while inheriting button styles.
   *
   * @default false
   */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
