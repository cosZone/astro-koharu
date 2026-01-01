/**
 * MobileDrawer Component
 *
 * A mobile navigation drawer using Vaul (Radix-based).
 * Controlled by the unified modal store.
 */

import { Drawer, DrawerContent } from '@components/ui/drawer';
import { useStore } from '@nanostores/react';
import { $isDrawerOpen, closeModal, openModal } from '@store/modal';
import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';

interface MobileDrawerProps {
  children: ReactNode;
}

/**
 * MobileDrawer component controlled by modal store
 */
export default function MobileDrawer({ children }: MobileDrawerProps) {
  const isOpen = useStore($isDrawerOpen);

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      openModal('drawer');
    } else {
      closeModal();
    }
  }, []);

  // Close drawer before page navigation
  useEffect(() => {
    const handleBeforePreparation = () => {
      if ($isDrawerOpen.get()) {
        closeModal();
      }
    };

    document.addEventListener('astro:before-preparation', handleBeforePreparation);
    return () => {
      document.removeEventListener('astro:before-preparation', handleBeforePreparation);
    };
  }, []);

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange} direction="left">
      <DrawerContent side="left" showHandle={false} className="w-[70vw] min-w-64 px-4 pt-6">
        <div className="flex h-full w-full flex-col overflow-auto">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Hook to control mobile drawer
 */
export function useMobileDrawer() {
  const isOpen = useStore($isDrawerOpen);

  const open = useCallback(() => {
    openModal('drawer');
  }, []);

  const close = useCallback(() => {
    closeModal();
  }, []);

  const toggle = useCallback(() => {
    if ($isDrawerOpen.get()) {
      closeModal();
    } else {
      openModal('drawer');
    }
  }, []);

  return { isOpen, open, close, toggle };
}
