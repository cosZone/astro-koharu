/**
 * Lazy-loading shell for the Settings Center.
 *
 * The panel body is fetched on user intent or first open, then stays mounted so its exit animation can run.
 */

import { useStore } from '@nanostores/react';
import { $isSettingsOpen } from '@store/modal';
import { lazy, Suspense, useEffect, useState } from 'react';

const loadSettingsPanelContent = () => import('./SettingsPanelContent');

export function preloadSettingsPanel(): void {
  void loadSettingsPanelContent();
}

const SettingsPanelContent = lazy(loadSettingsPanelContent);

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
