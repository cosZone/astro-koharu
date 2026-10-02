import { createRoot } from 'react-dom/client';
import { Segmented } from '../../../src/components/ui/segmented';

function FixtureIcon({ className }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="4" />
    </svg>
  );
}

export function mountSegmented() {
  const host = document.createElement('div');
  host.id = 'segmented-motion-fixture';
  host.style.cssText = 'position:fixed;top:100px;left:20px;z-index:9999;font-family:system-ui';
  document.body.append(host);
  const root = createRoot(host);
  root.render(
    <Segmented
      options={[
        { value: 'first', label: 'First motion option', icon: FixtureIcon },
        { value: 'second', label: 'Second motion option', icon: FixtureIcon },
      ]}
    />,
  );
  return () => {
    root.unmount();
    host.remove();
  };
}
