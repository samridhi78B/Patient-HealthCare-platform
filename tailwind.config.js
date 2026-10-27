// Colours are CSS variables (see src/index.css) so the whole palette can be tuned in one place.
const v = n => `rgb(var(--${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    borderRadius: { none: '0', sm: '4px', DEFAULT: '8px', md: '8px', lg: '10px', xl: '12px', '2xl': '16px', full: '9999px' },
    extend: {
      fontFamily: { sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'], display: ['"Bricolage Grotesque"', '"Instrument Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        white: '#ffffff', paper: v('paper'), ivory: v('ivory'), ink: v('ink'), lime: v('lime'),
        sage: { 100: v('sage-100'), 200: v('sage-200') },
        forest: { 500: v('forest-500'), 600: v('forest-600'), 700: v('forest-700'), 900: v('forest-900') },
        // Legacy names kept so existing component classes inherit the new palette.
        navy: { 900: v('ink'), 800: v('ink-800'), 700: v('ink-700'), 500: v('ink-500'), 300: v('ink-300') },
        teal: { 50: v('ivory-deep'), 100: v('sage-100'), 200: v('sage-200'), 500: v('forest-500'), 600: v('forest-600'), 700: v('forest-700'), 900: v('forest-900') },
      },
      boxShadow: { card: 'none' },
    },
  },
}
