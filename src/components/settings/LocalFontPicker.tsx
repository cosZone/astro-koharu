import { Button } from '@components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { Input } from '@components/ui/input';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { quoteCssString } from '@lib/css-string';
import { cn } from '@lib/utils';
import { READER_FONT_FAMILY_MAX_LENGTH } from '@store/settings-constants';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type FormEvent, type RefObject, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

interface LocalFontData {
  family: string;
}

interface LocalFontWindow extends Window {
  queryLocalFonts?: () => Promise<LocalFontData[]>;
}

type PickerView = 'intro' | 'loading' | 'fonts' | 'manual';
type FailureReason = 'unsupported' | 'denied' | 'error';

interface LocalFontPickerProps {
  open: boolean;
  currentFont: string | null;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onOpenChange: (open: boolean) => void;
  onSelect: (fontFamily: string) => void;
}

function supportsLocalFontAccess(): boolean {
  return typeof window !== 'undefined' && typeof (window as LocalFontWindow).queryLocalFonts === 'function';
}

function toCssFontFamily(family: string): string {
  return `${quoteCssString(family)}, sans-serif`;
}

function getUniqueFamilies(fonts: LocalFontData[], locale: string): string[] {
  const families = new Set<string>();
  for (const font of fonts) {
    const family = font.family.trim();
    if (family && !family.startsWith('.')) families.add(family);
  }
  return [...families].sort(new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }).compare);
}

export default function LocalFontPicker({ open, currentFont, returnFocusRef, onOpenChange, onSelect }: LocalFontPickerProps) {
  const { t, locale } = useTranslation();
  const localFontAccessSupported = supportsLocalFontAccess();
  const [view, setView] = useState<PickerView>(localFontAccessSupported ? 'intro' : 'manual');
  const [failureReason, setFailureReason] = useState<FailureReason | null>(localFontAccessSupported ? null : 'unsupported');
  const [families, setFamilies] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [manualFont, setManualFont] = useState(currentFont ?? '');
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase(locale));
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setManualFont(currentFont ?? '');
    if (families.length > 0) {
      setView('fonts');
      return;
    }
    if (!supportsLocalFontAccess()) {
      setFailureReason('unsupported');
      setView('manual');
      return;
    }
    setFailureReason(null);
    setView('intro');
  }, [currentFont, families.length, open]);

  const filteredFamilies = useMemo(() => {
    if (!deferredSearch) return families;
    return families.filter((family) => family.toLocaleLowerCase(locale).includes(deferredSearch));
  }, [deferredSearch, families, locale]);

  const rowVirtualizer = useVirtualizer({
    count: filteredFamilies.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 58,
    getItemKey: (index) => filteredFamilies[index] ?? index,
    overscan: 6,
  });

  const requestFonts = async () => {
    const queryLocalFonts = (window as LocalFontWindow).queryLocalFonts;
    if (!queryLocalFonts) {
      setFailureReason('unsupported');
      setView('manual');
      return;
    }

    setView('loading');
    try {
      const fonts = await queryLocalFonts.call(window);
      const nextFamilies = getUniqueFamilies(fonts, locale);
      if (nextFamilies.length === 0) throw new Error('No local fonts returned');
      setFamilies(nextFamilies);
      setFailureReason(null);
      setView('fonts');
    } catch (error) {
      setFailureReason(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'error');
      setView('manual');
    }
  };

  const selectFont = (family: string) => {
    onSelect(family);
    onOpenChange(false);
  };

  const submitManualFont = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const family = manualFont.trim();
    if (family) selectFont(family);
  };

  const failureMessage = failureReason ? t(`settings.localFont.${failureReason}`) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100%-2rem)] max-w-xl gap-0 overflow-hidden p-0"
        overlayClassName="bg-black/60 backdrop-blur-xs"
        closeLabel={t('common.close')}
        contentTransition={{ duration: 0.12, ease: 'easeOut' }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        <DialogHeader className="border-border border-b px-5 py-4 pr-14 text-left">
          <DialogTitle>{t('settings.localFont.title')}</DialogTitle>
          <DialogDescription>{t('settings.localFont.description')}</DialogDescription>
        </DialogHeader>

        {view === 'intro' && (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon icon="ri:font-family" className="size-6" />
            </div>
            <p className="max-w-sm text-muted-foreground text-sm leading-relaxed">{t('settings.localFont.permission')}</p>
            <Button type="button" className="mt-6" onClick={requestFonts}>
              {t('settings.localFont.requestAccess')}
            </Button>
          </div>
        )}

        {view === 'loading' && (
          <output aria-live="polite" className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Icon icon="ri:loader-4-line" className="size-6 animate-spin" />
            <p className="text-sm">{t('settings.localFont.loading')}</p>
          </output>
        )}

        {view === 'fonts' && (
          <div className="p-4">
            <div className="relative mb-3">
              <Icon
                icon="ri:search-line"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  rowVirtualizer.scrollToOffset(0);
                }}
                placeholder={t('settings.localFont.search')}
                aria-label={t('settings.localFont.search')}
                className="pl-9"
                autoFocus
              />
            </div>

            {filteredFamilies.length > 0 ? (
              <div ref={scrollRef} className="h-72 overflow-y-auto overscroll-contain rounded-lg border border-border">
                <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const family = filteredFamilies[virtualRow.index];
                    const selected = family === currentFont;
                    return (
                      <div
                        key={virtualRow.key}
                        className="absolute top-0 left-0 w-full p-0.5"
                        style={{ height: virtualRow.size, transform: `translateY(${virtualRow.start}px)` }}
                      >
                        <button
                          type="button"
                          onClick={() => selectFont(family)}
                          aria-pressed={selected}
                          className={cn(
                            'flex h-full w-full items-center gap-3 rounded-md px-3 text-left transition-colors',
                            selected ? 'bg-primary/10 text-primary' : 'hover:bg-accent',
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm">{family}</span>
                          <span
                            className="hidden shrink-0 text-muted-foreground text-sm sm:block"
                            style={{ fontFamily: toCssFontFamily(family) }}
                          >
                            {t('settings.localFont.preview')}
                          </span>
                          {selected && <Icon icon="ri:check-line" className="size-4 shrink-0" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center rounded-lg border border-border border-dashed text-muted-foreground text-sm">
                {t('settings.localFont.empty')}
              </div>
            )}
          </div>
        )}

        {view === 'manual' && (
          <form className="p-5" onSubmit={submitManualFont}>
            <div className="mb-5 rounded-lg bg-muted/60 p-3 text-muted-foreground text-sm leading-relaxed">
              {failureMessage}
            </div>
            <label htmlFor="local-font-family" className="mb-2 block font-medium text-sm">
              {t('settings.localFont.manualLabel')}
            </label>
            <div className="flex gap-2">
              <Input
                id="local-font-family"
                value={manualFont}
                onChange={(event) => setManualFont(event.target.value)}
                maxLength={READER_FONT_FAMILY_MAX_LENGTH}
                placeholder={t('settings.localFont.manualPlaceholder')}
                autoComplete="off"
                autoFocus
              />
              <Button type="submit" disabled={!manualFont.trim()}>
                {t('settings.localFont.useFont')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
