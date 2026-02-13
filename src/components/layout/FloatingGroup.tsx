/**
 * FloatingGroup Component
 *
 * Floating action buttons for navigation and utilities.
 * - Scroll to top/bottom
 * - Christmas effects toggle
 * - Expand/collapse toggle
 */

import { bgmConfig, christmasConfig } from '@constants/site-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $bgmPanelOpen, toggleBgmPanel } from '@store/bgm';
import { christmasEnabled, disableChristmasCompletely, enableChristmas, initChristmasState } from '@store/christmas';
import { $isDrawerOpen } from '@store/modal';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

interface FloatingButtonProps {
  onClick: () => void;
  ariaLabel: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Optional data attribute for identifying BGM toggle button */
  dataBgmToggle?: boolean;
}

function FloatingButton({ onClick, ariaLabel, title, children, className, dataBgmToggle }: FloatingButtonProps) {
  const isMounted = useIsMounted();

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full bg-background/80 p-2 opacity-80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-background hover:opacity-100',
        className,
      )}
      aria-label={ariaLabel}
      title={isMounted ? title : undefined}
      data-bgm-toggle={dataBgmToggle || undefined}
    >
      {children}
    </button>
  );
}

export default function FloatingGroup() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const isDrawerOpen = useStore($isDrawerOpen);
  const isChristmasEnabled = useStore(christmasEnabled);
  const isBgmPanelOpen = useStore($bgmPanelOpen);

  // Initialize christmas state on mount
  useEffect(() => {
    initChristmasState();
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const scrollToBottom = () => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });

  const toggleChristmas = () => {
    if (christmasEnabled.get()) {
      disableChristmasCompletely();
    } else {
      enableChristmas();
    }
  };

  const toggleExpand = () => setIsExpanded((prev) => !prev);

  // Hide when drawer is open
  const isHidden = isDrawerOpen;

  return (
    <motion.div
      className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 text-primary"
      animate={{
        x: isHidden ? 200 : 0,
        opacity: isHidden ? 0 : 1,
        pointerEvents: isHidden ? 'none' : 'auto',
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="flex flex-col gap-2"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeInOut' }}
          >
            {christmasConfig.enabled && (
              <FloatingButton onClick={toggleChristmas} ariaLabel={t('floating.christmas')} title={t('floating.christmas')}>
                <Icon icon={isChristmasEnabled ? 'ri:snowy-fill' : 'ri:snowy-line'} className="h-5 w-5" />
              </FloatingButton>
            )}
            {bgmConfig.enabled && bgmConfig.audio.length > 0 && (
              <FloatingButton onClick={toggleBgmPanel} ariaLabel={t('floating.bgm')} title={t('floating.bgm')} dataBgmToggle>
                <Icon icon={isBgmPanelOpen ? 'ri:music-2-fill' : 'ri:music-2-line'} className="h-5 w-5" />
              </FloatingButton>
            )}
            <FloatingButton onClick={scrollToTop} ariaLabel={t('floating.backToTop')} title={t('floating.backToTop')}>
              <Icon icon="ri:arrow-up-s-line" className="h-5 w-5" />
            </FloatingButton>
            <FloatingButton
              onClick={scrollToBottom}
              ariaLabel={t('floating.scrollToBottom')}
              title={t('floating.scrollToBottom')}
            >
              <Icon icon="ri:arrow-down-s-line" className="h-5 w-5" />
            </FloatingButton>
          </motion.div>
        )}
      </AnimatePresence>

      <FloatingButton
        onClick={toggleExpand}
        ariaLabel={t('floating.toggleToolbar')}
        title={t('floating.toggleToolbar')}
        className="size-9 flex-center"
      >
        <Icon icon={isExpanded ? 'ri:close-large-fill' : 'ri:magic-fill'} className="size-4" />
      </FloatingButton>
    </motion.div>
  );
}
