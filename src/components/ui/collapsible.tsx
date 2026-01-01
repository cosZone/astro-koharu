/**
 * Collapsible Component
 *
 * An expandable/collapsible section built on Radix UI Collapsible.
 * Uses CSS Grid animation for smooth height transitions.
 *
 * @example
 * ```tsx
 * <Collapsible>
 *   <CollapsibleTrigger asChild>
 *     <Button>Toggle</Button>
 *   </CollapsibleTrigger>
 *   <CollapsibleContent>
 *     <p>Collapsible content</p>
 *   </CollapsibleContent>
 * </Collapsible>
 * ```
 */

import { animation } from '@constants/design-tokens';
import { cn } from '@lib/utils';
import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import { AnimatePresence, motion } from 'motion/react';
import type React from 'react';
import { createContext, forwardRef, useCallback, useContext, useState } from 'react';

// Context for open state
interface CollapsibleContextValue {
  open: boolean;
}

const CollapsibleContext = createContext<CollapsibleContextValue>({ open: false });

// Root
interface CollapsibleProps extends CollapsiblePrimitive.CollapsibleProps {
  children: React.ReactNode;
}

function Collapsible({ children, open: controlledOpen, onOpenChange, defaultOpen = false, ...props }: CollapsibleProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <CollapsibleContext.Provider value={{ open }}>
      <CollapsiblePrimitive.Root open={open} onOpenChange={handleOpenChange} {...props}>
        {children}
      </CollapsiblePrimitive.Root>
    </CollapsibleContext.Provider>
  );
}
Collapsible.displayName = 'Collapsible';

// Trigger
const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

// Content with animation
const CollapsibleContent = forwardRef<
  React.ComponentRef<typeof CollapsiblePrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.Content> & {
    /**
     * Use grid-based animation for smoother transitions
     * @default true
     */
    useGridAnimation?: boolean;
  }
>(({ className, children, useGridAnimation = true, ...props }, ref) => {
  const { open } = useContext(CollapsibleContext);

  if (useGridAnimation) {
    return (
      <AnimatePresence initial={false}>
        {open && (
          <CollapsiblePrimitive.Content ref={ref} forceMount asChild {...props}>
            <motion.div
              className={cn('overflow-hidden', className)}
              initial={{ gridTemplateRows: '0fr', opacity: 0 }}
              animate={{ gridTemplateRows: '1fr', opacity: 1 }}
              exit={{ gridTemplateRows: '0fr', opacity: 0 }}
              transition={{
                duration: animation.duration.normal / 1000,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{ display: 'grid' }}
            >
              <div className="min-h-0">{children}</div>
            </motion.div>
          </CollapsiblePrimitive.Content>
        )}
      </AnimatePresence>
    );
  }

  // Fallback to simple opacity animation
  return (
    <CollapsiblePrimitive.Content
      ref={ref}
      className={cn(
        'overflow-hidden',
        'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down',
        className,
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Content>
  );
});
CollapsibleContent.displayName = CollapsiblePrimitive.Content.displayName;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
