/**
 * Dialog Component
 *
 * A modal dialog component built on Radix UI Dialog primitives.
 * Features animated overlay and content with Motion library.
 *
 * @example
 * ```tsx
 * <Dialog open={isOpen} onOpenChange={setIsOpen}>
 *   <DialogTrigger asChild>
 *     <Button>Open Dialog</Button>
 *   </DialogTrigger>
 *   <DialogContent>
 *     <DialogHeader>
 *       <DialogTitle>Title</DialogTitle>
 *       <DialogDescription>Description</DialogDescription>
 *     </DialogHeader>
 *     <p>Content goes here</p>
 *   </DialogContent>
 * </Dialog>
 * ```
 */

import { animation } from '@constants/design-tokens';
import { cn } from '@lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { createContext, forwardRef, useCallback, useContext, useState } from 'react';

// Context for animation state
interface DialogContextValue {
  isAnimating: boolean;
  setIsAnimating: (v: boolean) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

// Root Dialog component with animation state management
interface DialogProps extends DialogPrimitive.DialogProps {
  children: React.ReactNode;
}

function Dialog({ children, open, onOpenChange, ...props }: DialogProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen && isAnimating) return;
      onOpenChange?.(nextOpen);
    },
    [isAnimating, onOpenChange],
  );

  return (
    <DialogContext.Provider value={{ isAnimating, setIsAnimating }}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </DialogPrimitive.Root>
    </DialogContext.Provider>
  );
}

Dialog.displayName = 'Dialog';

// Trigger
const DialogTrigger = DialogPrimitive.Trigger;

// Portal
const DialogPortal = DialogPrimitive.Portal;

// Close button
const DialogClose = DialogPrimitive.Close;

// Overlay with animation
const DialogOverlay = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Content with animation
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showClose?: boolean;
  overlayClassName?: string;
}

const DialogContent = forwardRef<React.ComponentRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, showClose = true, overlayClassName, ...props }, ref) => {
    const context = useContext(DialogContext);

    return (
      <DialogPortal forceMount>
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animation.duration.fast / 1000 }}
            onAnimationStart={() => context?.setIsAnimating(true)}
            onAnimationComplete={() => context?.setIsAnimating(false)}
          >
            <DialogOverlay className={overlayClassName} />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <DialogPrimitive.Content ref={ref} asChild {...props}>
            <motion.div
              className={cn(
                'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg',
                'duration-200',
                className,
              )}
              initial={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
              animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, x: '-50%', y: '-48%' }}
              transition={animation.spring.default}
            >
              {children}
              {showClose && (
                <DialogPrimitive.Close className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <title>Close</title>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              )}
            </motion.div>
          </DialogPrimitive.Content>
        </AnimatePresence>
      </DialogPortal>
    );
  },
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Header
function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />;
}
DialogHeader.displayName = 'DialogHeader';

// Footer
function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />;
}
DialogFooter.displayName = 'DialogFooter';

// Title
const DialogTitle = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn('font-semibold text-lg leading-none tracking-tight', className)} {...props} />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// Description
const DialogDescription = forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
