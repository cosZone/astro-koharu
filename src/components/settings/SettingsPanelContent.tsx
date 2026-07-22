/**
 * Settings Center popover body.
 *
 * This is the single container for reader and general preferences.
 * Controls render from the declarative registry and the modal store owns visibility.
 * Lazy-loaded by SettingsPanel so heavy form and positioning dependencies stay out of the all-page shell.
 */

import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
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
  masterMotionEnabled,
  readerFontFamily,
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
  setLocalFontFamily,
  setMasterMotionEnabled,
  setMeasure,
  setScrollProgressEnabled,
  setWaveEnabled,
  waveEnabled,
} from '@store/settings';
import { READER_CUSTOM_MEASURE } from '@store/settings-constants';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { lazy, type MouseEvent, Suspense, useEffect, useRef, useState } from 'react';
import { NumberField } from './NumberField';
import { isSettingVisible, SETTINGS_REGISTRY, type SettingItem, type SettingSection } from './registry';

const SECTIONS: SettingSection[] = ['reader', 'general'];
const loadLocalFontPicker = () => import('./LocalFontPicker');

function preloadLocalFontPicker(): void {
  void loadLocalFontPicker();
}

const LocalFontPicker = lazy(loadLocalFontPicker);

export default function SettingsPanelContent() {
  const { t } = useTranslation();
  const open = useStore($isSettingsOpen);
  const shouldReduceMotion = useReducedMotion();

  // Store bindings
  const fontPreset = useStore(readerFontPreset);
  const fontFamily = useStore(readerFontFamily);
  const fontSize = useStore(readerFontSize);
  const lineHeight = useStore(readerLineHeight);
  const measure = useStore(readerMeasure);
  const justify = useStore(readerJustify);
  const scrollProgress = useStore(scrollProgressEnabled);
  const bgmWidget = useStore(bgmWidgetEnabled);
  const masterMotion = useStore(masterMotionEnabled);
  const wave = useStore(waveEnabled);
  const isChristmasEnabled = useStore(christmasEnabled);
  const [fontPickerLoaded, setFontPickerLoaded] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const fontPickerTriggerRef = useRef<HTMLButtonElement>(null);

  const openFontPicker = (event: MouseEvent<HTMLButtonElement>) => {
    fontPickerTriggerRef.current = event.currentTarget;
    preloadLocalFontPicker();
    setFontPickerLoaded(true);
    setFontPickerOpen(true);
  };

  const switchBindings: Record<string, { checked: boolean; onChange: (checked: boolean) => void }> = {
    justify: { checked: justify, onChange: setJustify },
    scrollProgress: { checked: scrollProgress, onChange: setScrollProgressEnabled },
    christmas: { checked: isChristmasEnabled, onChange: () => toggleChristmas() },
    bgmWidget: { checked: bgmWidget, onChange: setBgmWidgetEnabled },
    masterMotion: { checked: masterMotion, onChange: setMasterMotionEnabled },
    wave: { checked: wave, onChange: setWaveEnabled },
  };

  const numberBindings: Record<
    string,
    {
      value: number | null;
      onApply: (value: number | null) => void;
      emptyValue?: { label: string; fallback: number };
    }
  > = {
    fontSize: { value: fontSize, onApply: (value) => value !== null && setFontSize(value) },
    lineHeight: { value: lineHeight, onApply: (value) => value !== null && setLineHeight(value) },
    measure: {
      value: measure,
      onApply: setMeasure,
      emptyValue: { label: t('settings.auto'), fallback: READER_CUSTOM_MEASURE },
    },
  };

  // Open on Reading for pages with prose content and General everywhere else.
  const [section, setSection] = useState<SettingSection>('general');
  useEffect(() => {
    if (!open) return;
    setSection(document.querySelector('[data-pagefind-body]') ? 'reader' : 'general');
  }, [open]);

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
      const target = event.target;
      return !(target instanceof Element && target.closest('[data-settings-toggle], [data-dialog-layer]'));
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
            {item.options?.map((option) => {
              const localOption = option.value === 'local';
              const active = localOption ? fontFamily !== null : fontFamily === null && fontPreset === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={(event) => (localOption ? openFontPicker(event) : setFontPreset(option.value as FontPreset))}
                  onPointerEnter={localOption ? preloadLocalFontPicker : undefined}
                  onPointerDown={localOption ? preloadLocalFontPicker : undefined}
                  onFocus={localOption ? preloadLocalFontPicker : undefined}
                  aria-pressed={active}
                  className={cn(
                    'relative rounded-md px-2.5 py-1 text-xs transition-colors',
                    active ? 'text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {active && (
                    <m.span
                      layoutId="settings-font-preset-pill"
                      className="absolute inset-0 rounded-md bg-primary"
                      transition={shouldReduceMotion ? { duration: 0 } : microReboundPreset}
                    />
                  )}
                  <span className="relative">{t(option.i18nKey)}</span>
                </button>
              );
            })}
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
            emptyValue={binding.emptyValue}
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
    <LazyMotionProvider>
      <AnimatePresence>
        {open && (
          <FloatingFocusManager key="settings-panel" context={context} modal={false}>
            <m.div
              ref={refs.setFloating}
              {...getFloatingProps()}
              className="fixed right-16 bottom-20 z-40 w-[320px] max-w-[calc(100vw-5rem)]"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
              transition={shouldReduceMotion ? { duration: 0.15 } : microReboundPreset}
            >
              <div className="flex h-[calc(100dvh-6rem)] max-h-96 flex-col overflow-hidden rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-xl">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-sm">{t('settings.title')}</h2>
                  <button
                    type="button"
                    className="relative rounded-full p-1 text-muted-foreground transition-[background-color,color,transform] after:absolute after:-inset-2 after:rounded-full after:content-[''] hover:bg-accent hover:text-foreground active:scale-[0.96]"
                    onClick={closeModal}
                    aria-label={t('settings.closePanel')}
                  >
                    <Icon icon="ri:close-line" className="h-4 w-4" />
                  </button>
                </div>

                {/* Section tabs */}
                <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1">
                  {SECTIONS.map((key) => {
                    const active = section === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSection(key)}
                        className={cn(
                          'relative flex-1 rounded-md px-3 py-1 font-medium text-xs transition-colors',
                          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {active && (
                          <m.span
                            layoutId="settings-section-pill"
                            className="absolute inset-0 rounded-md bg-background shadow-sm"
                            transition={shouldReduceMotion ? { duration: 0 } : microReboundPreset}
                          />
                        )}
                        <span className="relative">{t(key === 'reader' ? 'settings.reader' : 'settings.general')}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Setting items */}
                <div className="min-h-0 flex-1">
                  <AnimatePresence mode="wait" initial={false}>
                    <m.div
                      key={section}
                      className="h-full overflow-y-auto overscroll-contain"
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
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
                              {item.key === 'fontPreset' && fontFamily && (
                                <button
                                  type="button"
                                  onClick={openFontPicker}
                                  onPointerEnter={preloadLocalFontPicker}
                                  onPointerDown={preloadLocalFontPicker}
                                  onFocus={preloadLocalFontPicker}
                                  className="mt-2 flex w-full items-center gap-2 rounded-md border border-input px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-accent"
                                  aria-label={t('settings.localFont.change')}
                                >
                                  <Icon icon="ri:font-family" className="size-4 shrink-0 text-primary" />
                                  <span className="min-w-0 flex-1 truncate">{fontFamily}</span>
                                  <Icon icon="ri:arrow-right-s-line" className="size-4 shrink-0 text-muted-foreground" />
                                </button>
                              )}
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
                          className="mt-3 w-full rounded-md border border-input py-1.5 text-muted-foreground text-xs transition-[background-color,color,transform] hover:bg-accent hover:text-foreground active:scale-[0.96]"
                        >
                          {t('settings.reset')}
                        </button>
                      )}
                    </m.div>
                  </AnimatePresence>
                </div>
              </div>
            </m.div>
          </FloatingFocusManager>
        )}
        {fontPickerLoaded && (
          <Suspense key="local-font-picker" fallback={null}>
            <LocalFontPicker
              open={fontPickerOpen}
              currentFont={fontFamily}
              returnFocusRef={fontPickerTriggerRef}
              onOpenChange={setFontPickerOpen}
              onSelect={setLocalFontFamily}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </LazyMotionProvider>
  );
}
