/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#f5f1ec',
        surface: {
          1: '#ffffff',
          2: '#ebe7e1',
        },
        ink: {
          DEFAULT: '#111111',
          muted: '#4a4a47',
          subtle: '#52524f',
          tertiary: '#52524f',
        },
        hairline: {
          DEFAULT: '#d3cec6',
          soft: '#ebe7e1',
        },
        accent: {
          DEFAULT: '#b83808',
          hover: '#9e2e05',
          light: '#faebe5',
          subtle: '#f7ded3',
        },
        semantic: {
          error: '#c41c1c',
          success: '#166534',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Noto Sans Devanagari',
          'Noto Sans Gurmukhi',
          'sans-serif'
        ],
      },
      borderRadius: {
        'card': '14px',
        'subtle': '8px',
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(0, 0, 0, 0.05)',
        'float': '0 4px 12px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
