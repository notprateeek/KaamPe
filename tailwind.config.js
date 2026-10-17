/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // "Neel Bahi" palette: indigo ledger ink on cool paper, marigold for fills only
      colors: {
        canvas: '#EEF0F7',
        surface: {
          1: '#ffffff',
          2: '#F4F5FA',
        },
        ink: {
          DEFAULT: '#17214D',
          hover: '#0F1650',
          muted: '#4D5579',
          subtle: '#5A6285',
          tertiary: '#5A6285',
        },
        hairline: {
          DEFAULT: '#D9DDEB',
          soft: '#E6E9F2',
        },
        // Text-safe deep marigold for labels/links; use `marigold` for filled surfaces
        accent: {
          DEFAULT: '#8F5400',
          hover: '#6E4000',
          light: '#FFF4D6',
          subtle: '#F6DFA0',
        },
        marigold: {
          DEFAULT: '#F2A900',
          hover: '#E09C00',
        },
        // Pale ink tint for selected/active states (nav pill, segmented controls)
        wash: '#E3E7F6',
        rule: '#E8A0A0',
        semantic: {
          error: '#B3261E',
          success: '#1D7044',
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
      borderRadius: {
        'card': '18px',
        'subtle': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 2px rgba(23, 33, 77, 0.06)',
        'float': '0 18px 48px rgba(23, 33, 77, 0.18)',
        'offset': '6px 6px 0 0 #17214D',
        'offset-sm': '4px 4px 0 0 #17214D',
        'bar': '0 -1px 0 0 #D9DDEB, 0 -8px 24px rgba(23, 33, 77, 0.06)',
      }
    },
  },
  plugins: [],
}
