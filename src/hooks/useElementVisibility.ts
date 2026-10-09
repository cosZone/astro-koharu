import { useEffect, useState } from 'react';

/** Start expensive content once it approaches the viewport, and keep it active after scrolling away. */
export function useElementVisibility(element: Element): boolean {
  const [visibleElement, setVisibleElement] = useState<Element | null>(null);

  useEffect(() => {
    if (visibleElement === element) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisibleElement(element);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleElement(element);
          observer.disconnect();
        }
      },
      { rootMargin: '800px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, visibleElement]);

  return visibleElement === element;
}
