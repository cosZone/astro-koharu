/**
 * Lazy-loading shell for the Settings Center.
 *
 * Keeps floating-ui / react-hook-form / zod out of the first-paint bundle: the heavy body
 * (SettingsPanelContent) is fetched only once the panel is first opened, then kept mounted so the
 * AnimatePresence exit animation still runs on close.
 */

import { useStore } from '@nanostores/react';
import { $isSettingsOpen } from '@store/modal';
import { lazy, Suspense, useEffect, useState } from 'react';

const SettingsPanelContent = lazy(() => import('./SettingsPanelContent'));

export default function SettingsPanel() {
  const open = useStore($isSettingsOpen);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open) setLoaded(true);
  }, [open]);

  if (!loaded) return null;
  return (
    <Suspense fallback={null}>
      <SettingsPanelContent />
    </Suspense>
  );
}
