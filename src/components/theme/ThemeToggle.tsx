/**
 * ThemeToggle Component
 *
 * A sun/moon toggle for switching between light and dark themes.
 * Features View Transitions API for smooth theme changes.
 *
 * Inspired by https://codepen.io/aaroniker/pen/raaMMGx
 */

import { useCallback, useEffect, useState } from 'react';
import './theme-toggle.css';

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
      aria-label="toggle theme"
      onKeyDown={handleKeyDown}
      type="button"
    >
      <label className="toggle block cursor-pointer" aria-label="toggle theme">
        <input type="checkbox" className="hidden" checked={isDark} onChange={handleChange} />
        <div className="toggle-indicator" />
      </label>
    </button>
  );
}
