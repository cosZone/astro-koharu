import { createRoot } from 'react-dom/client';
import { SnowfallCanvas } from '../../../src/components/christmas/SnowfallCanvas';
import { christmasEnabled } from '../../../src/store/christmas';

export function mountSnowfall() {
  christmasEnabled.set(true);
  const host = document.createElement('div');
  host.id = 'snowfall-fixture';
  document.body.append(host);
  const root = createRoot(host);
  root.render(<SnowfallCanvas />);
  return () => {
    root.unmount();
    host.remove();
  };
}
