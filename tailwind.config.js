/** @type {import('tailwindcss').Config} */

// Colours are CSS variables (RGB channels) defined in src/index.css for the
// light and dark themes, so opacity modifiers like `bg-ink/50` keep working.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // "Neel Bahi" palette: indigo ledger ink on cool paper, marigold for fills only
      colors: {
        canvas: v('canvas'),
        surface: {
          1: v('surface-1'),
          2: v('surface-2'),
        },
        ink: {
          DEFAULT: v('ink'),
          hover: v('ink-hover'),
          muted: v('ink-muted'),
          subtle: v('ink-subtle'),
          tertiary: v('ink-subtle'),
        },
        // Text/icons placed on an `ink` (or semantic) fill: white in light, deep indigo in dark
        inverse: {
          DEFAULT: v('inverse'),
          accent: v('inverse-accent'),
        },
        hairline: {
          DEFAULT: v('hairline'),
          soft: v('hairline-soft'),
        },
        // Text-safe deep marigold for labels/links; use `marigold` for filled surfaces
        accent: {
          DEFAULT: v('accent'),
          hover: v('accent-hover'),
          light: v('accent-light'),
          subtle: v('accent-subtle'),
        },
        marigold: {
          DEFAULT: v('marigold'),
          hover: v('marigold-hover'),
          // Text on marigold fills: always deep indigo, in both themes
          ink: v('marigold-ink'),
        },
        // Pale ink tint for selected/active states (nav pill, segmented controls)
        wash: v('wash'),
        rule: v('rule'),
        semantic: {
          error: v('error'),
          success: v('success'),
        }
      },
      fontFamily: {
        sans: [
          'Anek Latin',
          'Anek Devanagari',
          'Anek Gurmukhi',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Noto Sans',
          'sans-serif'
        ],
      },
      // Focus rings with an offset sit on the current surface, not hard-coded white
      ringOffsetColor: {
        DEFAULT: 'rgb(var(--c-surface-1))',
      },
      borderRadius: {
        'card': '18px',
        'subtle': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgb(var(--c-shadow) / 0.06)',
        'float': '0 18px 48px rgb(var(--c-shadow) / 0.18)',
        'lift': '0 12px 32px rgb(var(--c-shadow) / 0.10)',
        'offset': '6px 6px 0 0 rgb(var(--c-offset))',
        'offset-sm': '4px 4px 0 0 rgb(var(--c-offset))',
        'bar': '0 -1px 0 0 rgb(var(--c-hairline)), 0 -8px 24px rgb(var(--c-shadow) / 0.06)',
      }
    },
  },
  plugins: [],
}
