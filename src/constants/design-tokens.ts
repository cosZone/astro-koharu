/**
 * Design Tokens
 *
 * Single source of truth for all design values including colors, spacing, typography,
 * shadows, border radius, and animation timings.
 *
 * These tokens are mapped to Tailwind CSS configuration and CSS custom properties.
 */

/**
 * Color System
 *
 * Semantic color names mapped to CSS custom properties for theme support.
 * Colors automatically adapt to light/dark theme via CSS variables.
 */
export const colors = {
  // Primary brand colors
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },

  // Secondary colors
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },

  // Semantic colors
  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
  },

  success: {
    DEFAULT: 'hsl(var(--success))',
    foreground: 'hsl(var(--success-foreground))',
  },

  warning: {
    DEFAULT: 'hsl(var(--warning))',
    foreground: 'hsl(var(--warning-foreground))',
  },

  // Shoka theme accent (replaces hardcoded #E95469)
  shoka: {
    DEFAULT: '#E95469',
    light: '#FF6B7A',
    dark: '#D63F55',
  },

  // Theme toggle colors
  themeToggle: {
    sun: '#ffbb52',
    moon: '#17181c',
  },

  // UI colors
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },

  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },

  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },

  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))',
  },

  badge: {
    primary: {
      // WCAG
      DEFAULT: 'hsl(var(--badge-primary))',
    },
  },
  // Backgrounds and foregrounds
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',

  // Borders and inputs
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
} as const;

/**
 * Spacing Scale
 *
 * Consistent spacing for margins, paddings, gaps, and dimensions.
 * Based on 4px base unit (0.25rem).
 */
export const spacing = {
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

/**
 * Named spacing shortcuts for common use cases
 */
export const spacingNames = {
  xs: spacing[2], // 8px
  sm: spacing[3], // 12px
  md: spacing[4], // 16px
  lg: spacing[6], // 24px
  xl: spacing[8], // 32px
  '2xl': spacing[12], // 48px
  '3xl': spacing[16], // 64px
  '4xl': spacing[24], // 96px
} as const;

/**
 * Typography Scale
 *
 * Font sizes, line heights, and letter spacing for consistent typography.
 */
export const typography = {
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }], // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.0125em' }], // 14px
    base: ['1rem', { lineHeight: '1.5rem', letterSpacing: '0' }], // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.0125em' }], // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.025em' }], // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }], // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }], // 30px
    '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }], // 36px
    '5xl': ['3rem', { lineHeight: '1', letterSpacing: '-0.025em' }], // 48px
    '6xl': ['3.75rem', { lineHeight: '1', letterSpacing: '-0.025em' }], // 60px
    '7xl': ['4.5rem', { lineHeight: '1', letterSpacing: '-0.025em' }], // 72px
    '8xl': ['6rem', { lineHeight: '1', letterSpacing: '-0.025em' }], // 96px
    '9xl': ['8rem', { lineHeight: '1', letterSpacing: '-0.025em' }], // 128px
  },

  fontWeight: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

/**
 * Shadow System
 *
 * Box shadows for elevation levels (0-4).
 * Shadows are adjusted for light/dark themes.
 */
export const shadows = {
  none: 'none',

  // Elevation 1: Subtle depth
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',

  // Elevation 2: Card level
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',

  // Elevation 3: Elevated cards, dropdowns
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',

  // Elevation 4: Modals, popovers
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

  // Inner shadow
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Custom shadows from project
  card: '0 0.625rem 1.875rem rgba(90, 97, 105, 0.12)',
  'card-darker': '0 0.625rem 1.875rem rgba(90, 97, 105, 0.2)',
  'shoka-button': '0px 0px 16px 0px rgb(233, 84, 105, 0.8)',
} as const;

/**
 * Border Radius Scale
 *
 * Consistent border radius values for corners.
 */
export const borderRadius = {
  none: '0',
  sm: '0.125rem', // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem', // 6px
  lg: '0.5rem', // 8px
  xl: '0.75rem', // 12px
  '2xl': '1rem', // 16px
  '3xl': '1.5rem', // 24px
  full: '9999px',
} as const;

/**
 * Animation Timings
 *
 * Duration and easing functions for consistent motion.
 */
export const animation = {
  // Duration in milliseconds
  duration: {
    fast: 150,
    tween: 200, // Between fast and normal
    normal: 250,
    ui: 300, // Common UI interaction
    slow: 350,
    slower: 500,
    flipCard: 600, // Card flip animation
  },

  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Spring-like easing
  },

  // Spring configurations for Motion library
  spring: {
    // Default spring (balanced)
    default: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 30,
    },

    // Gentle spring (smooth)
    gentle: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 25,
    },

    // Wobbly spring (bouncy)
    wobbly: {
      type: 'spring' as const,
      stiffness: 400,
      damping: 20,
    },

    // Stiff spring (snappy)
    stiff: {
      type: 'spring' as const,
      stiffness: 500,
      damping: 35,
    },

    // Slow spring (relaxed)
    slow: {
      type: 'spring' as const,
      stiffness: 150,
      damping: 20,
    },

    // Micro animations (existing in project)
    microDamping: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 13,
    },

    microRebound: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 9,
    },

    // Component-specific springs
    menu: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },

    popoverContent: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 20,
    },
  },

  // Transition objects for CSS transitions
  transition: {
    fast: `all ${150}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    normal: `all ${250}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    slow: `all ${350}ms cubic-bezier(0.4, 0, 0.2, 1)`,
  },
} as const;

/**
 * Breakpoints
 *
 * Responsive design breakpoints (matches Tailwind defaults).
 */
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

/**
 * Z-Index Scale
 *
 * Consistent layering for stacking contexts.
 */
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

/**
 * Color Palettes
 *
 * Multi-color arrays for gradients and backgrounds.
 */
export const gridBackground = {
  light: ['#ed719a', '#FFACDE', '#FBD7ED', '#EEF1F0', '#DDDDDD', '#B4B4B4'],
  dark: ['#212832', '#3F4659', '#8592A7', '#EEEFEA', '#212832', '#3F4659'],
} as const;

/**
 * 3D Perspective Values
 *
 * For 3D transforms and card flip effects.
 */
export const perspective = {
  card3d: '1000px',
} as const;

/**
 * Type exports for TypeScript autocomplete
 */
export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacing;
export type SpacingNameToken = keyof typeof spacingNames;
export type FontSizeToken = keyof typeof typography.fontSize;
export type FontWeightToken = keyof typeof typography.fontWeight;
export type ShadowToken = keyof typeof shadows;
export type BorderRadiusToken = keyof typeof borderRadius;
export type SpringPresetToken = keyof typeof animation.spring;
export type EasingToken = keyof typeof animation.easing;
export type BreakpointToken = keyof typeof breakpoints;
export type ZIndexToken = keyof typeof zIndex;
