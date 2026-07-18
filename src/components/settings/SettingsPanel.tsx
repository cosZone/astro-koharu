/**
 * Settings Center popover.
 *
 * This is the single container for reader and general preferences; see CONTEXT.md.
 * Controls render from the declarative registry and the modal store owns visibility.
 */

import { Switch } from '@components/ui/switch';
import { microReboundPreset } from '@constants/anim/spring';
import { FloatingFocusManager, useDismiss, useFloating, useInteractions, useRole } from '@floating-ui/react';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { christmasEnabled, toggleChristmas } from '@store/christmas';
import { $isSettingsOpen, closeModal } from '@store/modal';
import {
  bgmWidgetEnabled,
  type FontPreset,
  initSettings,
  masterMotionEnabled,
  readerFontPreset,
  readerFontSize,
  readerJustify,
  readerLineHeight,
  readerMeasure,
  resetReaderPreferences,
  scrollProgressEnabled,
  setBgmWidgetEnabled,
  setFontPreset,
  setFontSize,
  setJustify,
  setLineHeight,
  setMasterMotionEnabled,
  setMeasure,
  setScrollProgressEnabled,
  setWaveEnabled,
  waveEnabled,
} from '@store/settings';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NumberField } from './NumberField';
import { isSettingVisible, SETTINGS_REGISTRY, type SettingItem, type SettingSection } from './registry';

const SECTIONS: SettingSection[] = ['reader', 'general'];

export default function SettingsPanel() {
  const { t } = useTranslation();
  const open = useStore($isSettingsOpen);
  const shouldReduceMotion = useReducedMotion();

  // Store bindings
  const fontPreset = useStore(readerFontPreset);
  const fontSize = useStore(readerFontSize);
  const lineHeight = useStore(readerLineHeight);
  const measure = useStore(readerMeasure);
  const justify = useStore(readerJustify);
  const scrollProgress = useStore(scrollProgressEnabled);
  const bgmWidget = useStore(bgmWidgetEnabled);
  const masterMotion = useStore(masterMotionEnabled);
  const wave = useStore(waveEnabled);
  const isChristmasEnabled = useStore(christmasEnabled);

  const switchBindings: Record<string, { checked: boolean; onChange: (checked: boolean) => void }> = {
    justify: { checked: justify, onChange: setJustify },
    scrollProgress: { checked: scrollProgress, onChange: setScrollProgressEnabled },
    christmas: { checked: isChristmasEnabled, onChange: () => toggleChristmas() },
    bgmWidget: { checked: bgmWidget, onChange: setBgmWidgetEnabled },
    masterMotion: { checked: masterMotion, onChange: setMasterMotionEnabled },
    wave: { checked: wave, onChange: setWaveEnabled },
  };

  const numberBindings: Record<string, { value: number; onApply: (value: number) => void }> = {
    fontSize: { value: fontSize, onApply: setFontSize },
    lineHeight: { value: lineHeight, onApply: setLineHeight },
    measure: { value: measure, onApply: setMeasure },
  };

  // Open on Reading for article pages and General everywhere else.
  const [section, setSection] = useState<SettingSection>('general');
  useEffect(() => {
    if (!open) return;
    setSection(document.querySelector('article[data-pagefind-body]') ? 'reader' : 'general');
  }, [open]);

  // Initialize settings from localStorage on mount
  useEffect(() => {
    initSettings();
  }, []);

  // floating-ui: dismiss on ESC / outside click
  const { refs, context } = useFloating({
    open,
    onOpenChange: (next) => {
      if (!next) closeModal();
    },
  });
  const dismiss = useDismiss(context, {
    outsidePressEvent: 'mousedown',
    // Exclude the settings toggle button in FloatingGroup to prevent toggle/dismiss race
    outsidePress: (event) => {
      const target = event.target as HTMLElement;
      return !target.closest('[data-settings-toggle]');
    },
  });
  const role = useRole(context, { role: 'dialog' });
  const { getFloatingProps } = useInteractions([dismiss, role]);

  const renderControl = (item: SettingItem) => {
    const disabled = Boolean(item.disabledByMasterMotion && masterMotion);

    switch (item.type) {
      case 'segmented':
        return (
          <div className="flex flex-wrap gap-1">
            {item.options?.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFontPreset(option.value as FontPreset)}
                aria-pressed={fontPreset === option.value}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs transition-colors',
                  fontPreset === option.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {t(option.i18nKey)}
              </button>
            ))}
          </div>
        );
      case 'number': {
        const binding = numberBindings[item.key];
        if (!binding) return null;
        return (
          <NumberField
            label={t(item.i18nKey)}
            value={binding.value}
            step={item.step ?? 1}
            unit={item.unit}
            onApply={binding.onApply}
          />
        );
      }
      case 'switch': {
        const binding = switchBindings[item.key];
        if (!binding) return null;
        return (
          <Switch
            checked={binding.checked}
            onCheckedChange={binding.onChange}
            disabled={disabled}
            aria-label={t(item.i18nKey)}
          />
        );
      }
    }
  };

  const items = SETTINGS_REGISTRY.filter((item) => item.section === section && isSettingVisible(item));

  return (
    <AnimatePresence>
      {open && (
        <FloatingFocusManager context={context} modal={false}>
          <motion.div
            ref={refs.setFloating}
            {...getFloatingProps()}
            className="fixed right-16 bottom-20 z-40 w-[320px] max-w-[calc(100vw-5rem)]"
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
            transition={shouldReduceMotion ? { duration: 0.15 } : microReboundPreset}
          >
            <div className="rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl">
              {/* Header */}
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-sm">{t('settings.title')}</h2>
                <button
                  type="button"
                  className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={closeModal}
                  aria-label={t('settings.closePanel')}
                >
                  <Icon icon="ri:close-line" className="h-4 w-4" />
                </button>
              </div>

              {/* Section tabs */}
              <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
                {SECTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSection(key)}
                    className={cn(
                      'flex-1 rounded-md px-3 py-1 font-medium text-xs transition-colors',
                      section === key
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t(key === 'reader' ? 'settings.reader' : 'settings.general')}
                  </button>
                ))}
              </div>

              {/* Setting items */}
              <div className="flex flex-col divide-y divide-border">
                {items.map((item) => {
                  const disabled = Boolean(item.disabledByMasterMotion && masterMotion);
                  return (
                    <div key={item.key} className="py-2.5 first:pt-1 last:pb-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn('text-sm', disabled && 'opacity-50')}>{t(item.i18nKey)}</span>
                        {item.type !== 'segmented' && renderControl(item)}
                      </div>
                      {item.type === 'segmented' && <div className="mt-2">{renderControl(item)}</div>}
                      {disabled && (
                        <p className="mt-1 text-muted-foreground text-xs">{t('settings.waveDisabledByMasterMotion')}</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reader section: reset */}
              {section === 'reader' && (
                <button
                  type="button"
                  onClick={resetReaderPreferences}
                  className="mt-3 w-full rounded-md border border-input py-1.5 text-muted-foreground text-xs transition-colors hover:bg-accent hover:text-foreground"
                >
                  {t('settings.reset')}
                </button>
              )}
            </div>
          </motion.div>
        </FloatingFocusManager>
      )}
    </AnimatePresence>
  );
}
