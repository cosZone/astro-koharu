import { CopyButton } from '@components/markdown/shared/CopyButton';
import { MacToolbar } from '@components/markdown/shared/MacToolbar';
import { ModalLayer } from '@components/ui/ModalLayer';
import { useIsTablet } from '@hooks/useMediaQuery';
import { useRetainedValue } from '@hooks/useRetainedValue';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { cn } from '@lib/utils';
import { useStore } from '@nanostores/react';
import { $codeFullscreenData, closeModal } from '@store/modal';
import { useEffect, useRef, useState } from 'react';

function parseInlineStyles(styleString: string): React.CSSProperties {
  if (!styleString) return {};

  const styles: Record<string, string> = {};
  for (const declaration of styleString.split(';')) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;

    const property = declaration.slice(0, colonIndex).trim();
    const value = declaration.slice(colonIndex + 1).trim();
    if (!property || !value) continue;

    const camelProperty = property.startsWith('--')
      ? property
      : property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    styles[camelProperty] = value;
  }

  return styles as React.CSSProperties;
}

export default function CodeBlockFullscreen() {
  const liveData = useStore($codeFullscreenData);
  const data = useRetainedValue(liveData);
  const { t } = useTranslation();
  const isTablet = useIsTablet();
  const [wrapLines, setWrapLines] = useState(false);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (liveData) preRef.current?.scrollTo(0, 0);
  }, [liveData]);

  if (!data) return null;

  return (
    <ModalLayer open={liveData !== null} onClose={closeModal} variant="sheet" ariaLabel={t('code.fullscreen')}>
      <MacToolbar language={data.language} onClose={isTablet ? undefined : closeModal} className="tablet:rounded-none">
        <button
          type="button"
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-pressed:bg-accent aria-pressed:text-accent-foreground"
          aria-label={t('code.wrapLines')}
          title={t('code.wrapLines')}
          aria-pressed={wrapLines}
          onClick={() => {
            setWrapLines((value) => !value);
            if (preRef.current) preRef.current.scrollLeft = 0;
          }}
        >
          <Icon icon="ri:text-wrap" className="size-5" />
        </button>
        <CopyButton text={data.code} showLabel />
      </MacToolbar>
      <pre
        ref={preRef}
        className={cn(data.preClassName, 'code-fullscreen-content')}
        data-wrap={wrapLines || undefined}
        style={parseInlineStyles(data.preStyle)}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to focus and scroll the code surface.
        tabIndex={0}
      >
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Safe - codeHTML comes from Shiki syntax highlighter output only */}
        <code className={data.codeClassName} dangerouslySetInnerHTML={{ __html: data.codeHTML }} />
      </pre>
      <div className="tablet:block hidden shrink-0 border-border border-t p-3">
        <button
          type="button"
          onClick={closeModal}
          className="flex min-h-11 w-full items-center justify-center rounded-xl bg-primary/10 px-4 py-2 font-medium text-primary text-sm transition-colors hover:bg-primary/20 active:bg-primary/25"
        >
          {t('common.close')}
        </button>
      </div>
    </ModalLayer>
  );
}
