import { useRetimer } from '@hooks/useRetimer';
import { Icon } from '@iconify/react';
import { decryptContent } from '@lib/crypto/decrypt';
import { cn } from '@lib/utils';
import { useCallback, useRef, useState } from 'react';

interface EncryptedBlockProps {
  element: HTMLElement;
}

type DecryptState = 'locked' | 'decrypting' | 'unlocked' | 'error';

export function EncryptedBlock({ element }: EncryptedBlockProps) {
  const [state, setState] = useState<DecryptState>('locked');
  const [html, setHtml] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const retimer = useRetimer();

  const cipher = element.dataset.cipher ?? '';
  const iv = element.dataset.iv ?? '';
  const salt = element.dataset.salt ?? '';

  const handleDecrypt = useCallback(async () => {
    const password = inputRef.current?.value;
    if (!password) return;

    setState('decrypting');
    const result = await decryptContent(cipher, iv, salt, password);

    if (result) {
      setHtml(result);
      setState('unlocked');
    } else {
      setState('error');
      retimer(setTimeout(() => setState('locked'), 600));
    }
  }, [cipher, iv, salt, retimer]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleDecrypt();
    },
    [handleDecrypt],
  );

  if (state === 'unlocked') {
    return (
      <div className="encrypted-block-content prose dark:prose-invert max-w-none">
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: content is from our own build-time markdown pipeline */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <div className="encrypted-block-locked">
      <Icon
        icon="ri:lock-2-fill"
        className={cn('encrypted-block-icon', state === 'error' && 'encrypted-block-icon-error')}
        aria-label="Locked content"
      />
      <div className="encrypted-block-input-group">
        <input
          ref={inputRef}
          type="password"
          className="encrypted-block-input"
          placeholder="输入密码"
          autoComplete="off"
          onKeyDown={handleKeyDown}
          disabled={state === 'decrypting'}
        />
        <button
          type="button"
          className={cn('encrypted-block-btn', state === 'error' && 'encrypted-shake')}
          onClick={handleDecrypt}
          disabled={state === 'decrypting'}
          aria-label="Unlock"
        >
          {state === 'decrypting' ? (
            <Icon icon="ri:loader-4-line" className="animate-spin" />
          ) : (
            <Icon icon="ri:lock-unlock-line" />
          )}
        </button>
      </div>
    </div>
  );
}
