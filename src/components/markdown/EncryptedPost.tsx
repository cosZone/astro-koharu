/**
 * EncryptedPost - Full-page post encryption UI.
 *
 * Unlike EncryptedBlock (which renders decrypted HTML via dangerouslySetInnerHTML),
 * this component injects decrypted HTML directly into the DOM and dispatches
 * 'content:decrypted' to trigger ContentEnhancer re-scan, TOC rebuild, etc.
 */
import { useRetimer } from '@hooks/useRetimer';
import { useTranslation } from '@hooks/useTranslation';
import { Icon } from '@iconify/react';
import { decryptContent } from '@lib/crypto/decrypt';
import { cn } from '@lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

interface EncryptedPostProps {
  element: HTMLElement;
}

type DecryptState = 'locked' | 'decrypting' | 'unlocked' | 'error';

export function EncryptedPost({ element }: EncryptedPostProps) {
  const [state, setState] = useState<DecryptState>('locked');
  const decryptedRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const retimer = useRetimer();
  const { t } = useTranslation();

  const handleDecrypt = useCallback(async () => {
    const password = inputRef.current?.value;
    if (!password) return;

    const { cipher, iv, salt } = element.dataset;
    if (!cipher || !iv || !salt) return;

    setState('decrypting');
    const result = await decryptContent(cipher, iv, salt, password);

    if (result) {
      decryptedRef.current = result;
      setState('unlocked');
    } else {
      setState('error');
      retimer(setTimeout(() => setState('locked'), 600));
    }
  }, [element, retimer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleDecrypt();
    },
    [handleDecrypt],
  );

  // Inject decrypted HTML after portal unmounts (component returns null when unlocked)
  useEffect(() => {
    if (state !== 'unlocked' || !decryptedRef.current) return;

    element.innerHTML = decryptedRef.current;
    decryptedRef.current = '';
    element.classList.remove('encrypted-post');
    element.removeAttribute('data-cipher');
    element.removeAttribute('data-iv');
    element.removeAttribute('data-salt');
    element.removeAttribute('data-react-enhanced');

    requestAnimationFrame(() => {
      const container = document.querySelector('.custom-content');
      if (container) container.removeAttribute('data-enhanced');
      document.dispatchEvent(new CustomEvent('content:decrypted'));
    });
  }, [state, element]);

  if (!element.dataset.cipher || !element.dataset.iv || !element.dataset.salt) {
    return <div className="encrypted-post-error">Error: Missing encryption data</div>;
  }

  if (state === 'unlocked') return null;

  return (
    <div className="encrypted-post-locked">
      <Icon
        icon="ri:lock-2-fill"
        className={cn('encrypted-post-icon', state === 'error' && 'encrypted-post-icon-error')}
        aria-label={t('encrypted.post.title')}
      />
      <p className="encrypted-post-title">{t('encrypted.post.title')}</p>
      <p className="encrypted-post-subtitle">{t('encrypted.post.description')}</p>
      <div className="encrypted-post-input-group">
        <input
          ref={inputRef}
          type="password"
          className="encrypted-post-input"
          placeholder={t('encrypted.placeholder')}
          autoComplete="off"
          onKeyDown={handleKeyDown}
          disabled={state === 'decrypting'}
        />
        <button
          type="button"
          className={cn('encrypted-post-btn', state === 'error' && 'encrypted-shake')}
          onClick={handleDecrypt}
          disabled={state === 'decrypting'}
        >
          {state === 'decrypting' ? (
            <Icon icon="ri:loader-4-line" className="animate-spin" />
          ) : (
            <Icon icon="ri:lock-unlock-line" />
          )}
          <span>{t('encrypted.submit')}</span>
        </button>
      </div>
      {state === 'error' && <p className="encrypted-post-error-text">{t('encrypted.incorrect')}</p>}
    </div>
  );
}
