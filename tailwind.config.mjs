import { animation as animationTokens, borderRadius, colors, shadows } from './src/constants/design-tokens.ts';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    screens: {
      xs: { max: '480px' },
      md: { max: '768px' },
      lg: { max: '1440px' },
      tablet: { max: '992px' },
      desktop: { min: '1480px' },
    },
    extend: {
      colors: {
        // Design token colors
        ...colors,
        // Existing custom colors (for backward compatibility)
        'gradient-start': 'var(--gradient-bg-start)',
        'gradient-end': 'var(--gradient-bg-end)',
        'gradient-shoka-button-start': 'var(--gradient-shoka-button-start)',
        'gradient-shoka-button-end': 'var(--gradient-shoka-button-end)',
        blue: {
          DEFAULT: 'hsl(var(--shoka-blue))',
        },
        gray: {
          400: 'hsl(var(--grey-4))',
        },
        logo: '#e91e63',
        mandy: {
          50: '#fef2f3',
          100: '#fde6e8',
          200: '#fbd0d4',
          300: '#f7aab2',
          400: '#f27a8a',
          500: '#e91e63',
          600: '#d42a4c',
          700: '#b21e3f',
          800: '#961b3b',
          900: '#801b38',
          950: '#470a1a',
        },
        // shoka migrate
        pink: {
          a3: 'var(--color-pink-a3)',
          DEFAULT: 'var(--color-pink)',
        },
      },
      borderRadius: {
        ...borderRadius,
        // Existing custom radius (for backward compatibility)
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        ...shadows,
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'slide-in-from-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-out-to-left': {
          from: { opacity: '1', transform: 'translateX(0)' },
          to: { opacity: '0', transform: 'translateX(-12px)' },
        },
      },
      animation: {
        shake: 'shake 2s ease',
        'slide-down': 'slide-down 0.2s ease-out',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.2s ease-in-out',
        'slide-out-to-left': 'slide-out-to-left 0.2s ease-in-out',
      },
      transitionDuration: {
        fast: `${animationTokens.duration.fast}ms`,
        normal: `${animationTokens.duration.normal}ms`,
        slow: `${animationTokens.duration.slow}ms`,
        slower: `${animationTokens.duration.slower}ms`,
      },
      transitionTimingFunction: {
        ...animationTokens.easing,
      },
      backgroundImage: {
        gradient: 'var(--gradient-bg)',
        'gradient-pink': 'var(--gradient-pink)',
        'gradient-header': 'var(--gradient-header)',
        'gradient-shoka-button': 'var(--gradient-shoka-button)',
        'shoka-card-mask': 'linear-gradient(135deg,#434343 0,#000 100%)',
      },
      fontSize: {
        '4.5xl': '2.5rem',
        '5.5xl': '3.5rem',
      },
      fontFamily: {
        sans: ['寒蝉全圆体', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        'chill-round': ['寒蝉全圆体', 'sans-serif'],
      },
      clipPath: {
        'post-img-left': 'polygon(0 0,92% 0%,100% 100%,0% 100%)',
        'post-img-right': 'polygon(0 0%,100% 0%,100% 100%,8% 100%)',
      },
      spacing: {
        7.5: '1.875rem',
        8.5: '2.125rem',
        14.5: '3.625rem',
        15: '3.75rem',
        16.5: '4.125rem',
        17: '4.25rem',
        19: '4.75rem',
      },
      maxWidth: {
        '8xl': '87.5rem',
      },
      borderWidth: {
        16: '16px',
      },
    },
  },
  plugins: [require('@tailwindcss/container-queries'), require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
