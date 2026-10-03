import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { m } from 'motion/react';
import { createRoot } from 'react-dom/client';

export function mountCompletionFixture() {
  const host = document.createElement('div');
  host.id = 'motion-completion-fixture';
  host.style.cssText = 'position:fixed;top:100px;left:20px;z-index:9999';
  document.body.append(host);
  const root = createRoot(host);
  root.render(
    <LazyMotionProvider>
      <m.div data-motion-completion="opacity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16 }}>
        Opacity
      </m.div>
      <m.div
        data-motion-completion="clip-path"
        initial={{ clipPath: 'inset(0% 45% 88% 0%)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 0.46 }}
      >
        Reveal
      </m.div>
      <m.div
        data-motion-completion="filter"
        initial={{ filter: 'blur(6px)' }}
        animate={{ filter: 'blur(0px)' }}
        transition={{ duration: 0.2 }}
      >
        Blur
      </m.div>
      <m.div
        data-motion-completion="transform"
        initial={{ transform: 'translateY(20px) scale(0.9)' }}
        animate={{ transform: 'translateY(0px) scale(1)' }}
        transition={{ duration: 0.24 }}
      >
        Transform
      </m.div>
    </LazyMotionProvider>,
  );
  return () => {
    root.unmount();
    host.remove();
  };
}
