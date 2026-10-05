import { friendsIntro } from '@constants/friends-config';
import { useTranslation } from '@hooks/useTranslation';
import { cn } from '@lib/utils';
import { useClipboard } from 'foxact/use-clipboard';
import { useCallback, useState } from 'react';

interface FormData {
  site: string;
  owner: string;
  url: string;
  desc: string;
  image: string;
  color: string;
}

const inputClass =
  'min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-3 py-2 text-foreground text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const labelClass = 'mb-1.5 block text-muted-foreground text-xs';

export default function FriendRequestForm({ locale }: { locale?: string }) {
  const { t } = useTranslation(locale);
  const [formData, setFormData] = useState<FormData>({
    site: '',
    owner: '',
    url: '',
    desc: '',
    image: '',
    color: '#ffc0cb',
  });
  const { copied, copy } = useClipboard({ timeout: 2000 });

  const generateText = useCallback(() => {
    return `site: ${formData.site || t('friends.sitePlaceholder')}
url: ${formData.url || 'https://example.com'}
owner: ${formData.owner || t('friends.ownerPlaceholder')}
desc: ${formData.desc || t('friends.descPlaceholder')}
image: ${formData.image || 'https://example.com/avatar.jpg'}
color: "${formData.color || '#ffc0cb'}"`;
  }, [formData, t]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  return (
    <div className="grid grid-cols-2 tablet:grid-cols-1 items-start gap-8">
      <div className="min-w-0 space-y-4">
        <p className="text-muted-foreground text-sm">{friendsIntro.applyDesc}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="friend-site" className={labelClass}>
              {t('friends.siteName')}
            </label>
            <input
              id="friend-site"
              type="text"
              name="site"
              value={formData.site}
              onChange={handleChange}
              className={inputClass}
              placeholder={t('friends.sitePlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="friend-owner" className={labelClass}>
              {t('friends.ownerName')}
            </label>
            <input
              id="friend-owner"
              type="text"
              name="owner"
              value={formData.owner}
              onChange={handleChange}
              className={inputClass}
              placeholder={t('friends.ownerPlaceholder')}
            />
          </div>
        </div>
        <div>
          <label htmlFor="friend-url" className={labelClass}>
            {t('friends.siteUrl')}
          </label>
          <input
            id="friend-url"
            type="url"
            name="url"
            value={formData.url}
            onChange={handleChange}
            className={inputClass}
            placeholder={t('friends.urlPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="friend-desc" className={labelClass}>
            {t('friends.siteDesc')}
          </label>
          <textarea
            id="friend-desc"
            name="desc"
            value={formData.desc}
            onChange={handleChange}
            rows={2}
            className={cn(inputClass, 'resize-none')}
            placeholder={t('friends.descPlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="friend-image" className={labelClass}>
            {t('friends.avatarUrl')}
          </label>
          <input
            id="friend-image"
            type="url"
            name="image"
            value={formData.image}
            onChange={handleChange}
            className={inputClass}
            placeholder={t('friends.imagePlaceholder')}
          />
        </div>
        <div>
          <label htmlFor="friend-color" className={labelClass}>
            {t('friends.themeColor')}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="friend-color"
              type="color"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className="size-11 shrink-0 cursor-pointer rounded-xl border border-border bg-card p-1"
            />
            <input
              aria-label={t('friends.themeColor')}
              type="text"
              name="color"
              value={formData.color}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>
      </div>
      <div className="friend-request-preview tablet:static sticky top-20 flex min-w-0 flex-col gap-4 self-start">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-base text-foreground">{t('friends.previewTitle')}</h3>
          <button
            type="button"
            onClick={() => copy(generateText())}
            className="min-h-11 cursor-pointer rounded-xl border border-border bg-card px-3 py-2 text-foreground text-sm focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            aria-live="polite"
          >
            {copied ? t('friends.copiedConfig') : t('friends.copyConfig')}
          </button>
        </div>
        <pre className="wrap-anywhere whitespace-pre-wrap rounded-xl bg-muted p-4 font-mono text-foreground text-xs leading-relaxed">
          {generateText()}
        </pre>
        <p className="text-muted-foreground text-sm leading-relaxed">{t('friends.hint')}</p>
      </div>
    </div>
  );
}
