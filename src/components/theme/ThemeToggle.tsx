/**
 * ThemeToggle Component
 *
 * A sun/moon toggle for switching between light and dark themes.
 * Features View Transitions API for smooth theme changes.
 *
 * Inspired by https://codepen.io/aaroniker/pen/raaMMGx
 */

import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to manage theme state
 */
function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Initialize from DOM on client
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  // Sync with DOM changes (e.g., from other tabs or initial state)
  useEffect(() => {
    const rootElement = document.documentElement;

    // Initial sync
    setIsDark(rootElement.classList.contains('dark'));

    // Watch for class changes
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === 'class') {
          setIsDark(rootElement.classList.contains('dark'));
        }
      }
    });

    observer.observe(rootElement, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  const applyTheme = useCallback((dark: boolean) => {
    const root = document.documentElement;
    const theme = dark ? 'dark' : 'light';

    root.classList.toggle('dark', dark);
    root.dataset.theme = theme; // For astro-mermaid autoTheme
    localStorage.setItem('theme', theme);
  }, []);

  const toggle = useCallback(() => {
    const newIsDark = !isDark;
    const rootElement = document.documentElement;

    // Add theme transition class
    rootElement.classList.add('theme-transition');

    // Use View Transitions API if available
    if (!document.startViewTransition) {
      // Fallback for browsers without View Transitions API
      applyTheme(newIsDark);
      setIsDark(newIsDark);
      setTimeout(() => {
        rootElement.classList.remove('theme-transition');
      }, 100);
      return;
    }

    const transition = document.startViewTransition(() => {
      applyTheme(newIsDark);
      setIsDark(newIsDark);
    });

    transition.finished.finally(() => {
      rootElement.classList.remove('theme-transition');
    });
  }, [isDark, applyTheme]);

  return { isDark, toggle };
}

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();

  const handleChange = () => {
    toggle();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle();
    }
  };

  return (
    <button
      className={`theme-toggle scale-80 cursor-pointer transition duration-300 hover:scale-90 ${className || ''}`}
      tabIndex={0}
      aria-label="toggle theme"
      onKeyDown={handleKeyDown}
      type="button"
    >
      <label className="toggle block cursor-pointer" aria-label="toggle theme">
        <input type="checkbox" className="hidden" checked={isDark} onChange={handleChange} />
        <div className="toggle-indicator" />
      </label>

      <style>{`
        :root {
          --theme-toggle-color: currentColor;
        }

        .theme-toggle {
          z-index: 10;
        }

        .toggle-indicator {
          border-radius: 50%;
          width: 36px;
          height: 36px;
          position: relative;
          box-shadow: inset 16px -16px 0 0 var(--theme-toggle-color, #ffbb52);
          transform: scale(1) rotate(-2deg);
          transition:
            box-shadow 0.5s ease 0s,
            transform 0.4s ease 0.1s;
        }

        .toggle-indicator:before {
          content: '';
          width: inherit;
          height: inherit;
          border-radius: inherit;
          position: absolute;
          left: 0;
          top: 0;
          background: transparent;
          transition: background 0.3s ease;
        }

        .toggle-indicator:after {
          content: '';
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin: -4px 0 0 -4px;
          position: absolute;
          top: 50%;
          left: 50%;
          box-shadow:
            0 -23px 0 var(--theme-toggle-color, #ffbb52),
            0 23px 0 var(--theme-toggle-color, #ffbb52),
            23px 0 0 var(--theme-toggle-color, #ffbb52),
            -23px 0 0 var(--theme-toggle-color, #ffbb52),
            15px 15px 0 var(--theme-toggle-color, #ffbb52),
            -15px 15px 0 var(--theme-toggle-color, #ffbb52),
            15px -15px 0 var(--theme-toggle-color, #ffbb52),
            -15px -15px 0 var(--theme-toggle-color, #ffbb52);
          transform: scale(0);
          transition: all 0.3s ease;
        }

        /* Dark mode (moon) */
        input:checked + .toggle-indicator {
          box-shadow: inset 32px -32px 0 0 var(--theme-background-color, #17181c);
          transform: scale(0.5) rotate(0deg);
          transition:
            transform 0.3s ease 0.1s,
            box-shadow 0.2s ease 0s;
        }

        input:checked + .toggle-indicator:before {
          background: var(--theme-toggle-color, #ffbb52);
          transition: background 0.3s ease 0.1s;
        }

        input:checked + .toggle-indicator:after {
          transform: scale(1.5);
          transition: transform 0.5s ease 0.15s;
        }
      `}</style>
    </button>
  );
}
