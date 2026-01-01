/**
 * Drawer Component
 *
 * A mobile-friendly drawer component built on Vaul (Radix-based).
 * Supports swipe gestures and multiple positions.
 *
 * @example
 * ```tsx
 * <Drawer open={isOpen} onOpenChange={setIsOpen}>
 *   <DrawerTrigger asChild>
 *     <Button>Open Drawer</Button>
 *   </DrawerTrigger>
 *   <DrawerContent>
 *     <DrawerHeader>
 *       <DrawerTitle>Title</DrawerTitle>
 *       <DrawerDescription>Description</DrawerDescription>
 *     </DrawerHeader>
 *     <p>Content</p>
 *   </DrawerContent>
 * </Drawer>
 * ```
 */

import { cn } from '@lib/utils';
import type React from 'react';
import { forwardRef } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';

// Root - use ComponentProps to get proper types from vaul
function Drawer({ shouldScaleBackground = true, ...props }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />;
}
Drawer.displayName = 'Drawer';

// Trigger
const DrawerTrigger = DrawerPrimitive.Trigger;

// Portal
const DrawerPortal = DrawerPrimitive.Portal;

// Close
const DrawerClose = DrawerPrimitive.Close;

// Overlay
const DrawerOverlay = forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} />
));
DrawerOverlay.displayName = DrawerPrimitive.Overlay.displayName;

// Content
interface DrawerContentProps extends React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> {
  showHandle?: boolean;
  side?: 'bottom' | 'left' | 'right';
}

const DrawerContent = forwardRef<React.ComponentRef<typeof DrawerPrimitive.Content>, DrawerContentProps>(
  ({ className, children, showHandle = true, side = 'bottom', ...props }, ref) => {
    const sideStyles = {
      bottom: 'inset-x-0 bottom-0 mt-24 rounded-t-[10px]',
      left: 'inset-y-0 left-0 h-full w-3/4 max-w-sm rounded-r-[10px]',
      right: 'inset-y-0 right-0 h-full w-3/4 max-w-sm rounded-l-[10px]',
    };

    return (
      <DrawerPortal>
        <DrawerOverlay />
        <DrawerPrimitive.Content
          ref={ref}
          className={cn('fixed z-50 flex h-auto flex-col border bg-background', sideStyles[side], className)}
          {...props}
        >
          {showHandle && side === 'bottom' && <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />}
          {children}
        </DrawerPrimitive.Content>
      </DrawerPortal>
    );
  },
);
DrawerContent.displayName = 'DrawerContent';

// Header
function DrawerHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('grid gap-1.5 p-4 text-center sm:text-left', className)} {...props} />;
}
DrawerHeader.displayName = 'DrawerHeader';

// Footer
function DrawerFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mt-auto flex flex-col gap-2 p-4', className)} {...props} />;
}
DrawerFooter.displayName = 'DrawerFooter';

// Title
const DrawerTitle = forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title ref={ref} className={cn('font-semibold text-lg leading-none tracking-tight', className)} {...props} />
));
DrawerTitle.displayName = DrawerPrimitive.Title.displayName;

// Description
const DrawerDescription = forwardRef<
  React.ComponentRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
));
DrawerDescription.displayName = DrawerPrimitive.Description.displayName;

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
