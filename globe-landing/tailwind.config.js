/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      /* ── Fonts (Design System: Plus Jakarta Sans + Inter) ── */
      fontFamily: {
        heading: ['"Plus Jakarta Sans Variable"', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'], // default
      },

      /* ── Typography scale — Desktop ── */
      fontSize: {
        // Headings — Plus Jakarta Sans
        'h1': ['3rem',    { lineHeight: '3.5rem',  fontWeight: '800' }],   // 48/56
        'h2': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '800' }],   // 36/44
        'h3': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '800' }],   // 28/36
        'h4': ['1.375rem',{ lineHeight: '1.875rem', fontWeight: '800' }],  // 22/30
        'h5': ['1.125rem',{ lineHeight: '1.625rem', fontWeight: '800' }],  // 18/26
        'h6': ['1rem',    { lineHeight: '1.5rem',  fontWeight: '800' }],   // 16/24
        // Headings — medium variant
        'h1-md': ['3rem',    { lineHeight: '3.5rem',  fontWeight: '500' }],
        'h2-md': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '500' }],
        'h3-md': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '500' }],
        'h4-md': ['1.375rem',{ lineHeight: '1.875rem', fontWeight: '500' }],
        'h5-md': ['1.125rem',{ lineHeight: '1.625rem', fontWeight: '500' }],
        'h6-md': ['1rem',    { lineHeight: '1.5rem',  fontWeight: '500' }],
        // Body — Inter
        'body-lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18/28
        'body':    ['1rem',     { lineHeight: '1.5rem'  }],   // 16/24
        'body-sm': ['0.875rem', { lineHeight: '1.375rem' }],  // 14/22
      },

      /* ── Colors (Figma Design System) ── */
      colors: {
        green: {
          50:  '#f9faf8',
          100: '#ebefe9',
          200: '#c2ccb9',
          300: '#a4b498',
          400: '#7b9168',
          500: '#617c4b',
          600: '#3a5b1e',
          700: '#35531b',
          800: '#294115',
          900: '#203211',
          950: '#18260d',
        },
        grey: {
          50:  '#f9f9f9',
          100: '#ededed',
          200: '#e4e4e4',
          300: '#d0d0d0',
          400: '#b2b2b2',
          500: '#808080',
          600: '#6c6c6c',
          700: '#525252',
          800: '#3c3c3c',
          900: '#1c1c1c',
        },
        red: {
          50:  '#fdf3f3',
          100: '#fce5e4',
          200: '#fad0ce',
        },
        orange: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#BA6347',
        },
        brand: {
          DEFAULT: '#ab2f2a',  // Tertiary / accent (Figma buttons, footer titles)
          dark:    '#772825',  // Footer section headings
        },
        // Semantic aliases
        'text-main':  '#1c1c1c',  // grey-900
        'text-body':  '#525252',  // grey-700
        'text-muted': '#808080',  // grey-500
      },

      /* ── Spacing & Layout ── */
      borderRadius: {
        pill: '50px',
      },

      /* ── Shadows ── */
      boxShadow: {
        card:       '0 2px 8px 0 rgba(24, 38, 13, 0.08)',
        'card-hover': '0 8px 24px 0 rgba(24, 38, 13, 0.14)',
        soft:       '0 4px 12px 0 rgba(24, 38, 13, 0.10)',
      },

      /* ── Responsive typography (mobile overrides) ── */
      screens: {
        // defaults from Tailwind are fine (sm:640, md:768, lg:1024, xl:1280, 2xl:1536)
      },
    },
  },
  plugins: [],
}
