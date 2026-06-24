/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        serif:   ['"Playfair Display"', 'Georgia', 'serif'],
        body:    ['Inter', 'sans-serif'],
      },
      colors: {
        bg:        'var(--color-bg)',
        canvas:    'var(--color-canvas)',
        surface:   'var(--color-surface)',
        surface2:  'var(--color-surface-2)',
        border:    'var(--color-border)',
        primary:   '#C5922B',   // antique gold (same in both modes)
        secondary: '#A04C30',   // terracotta
        accent:    '#8B2D3E',   // burgundy
        gold:      '#D4A843',
        // Academia metric accent colors
        'metric-forest':   '#3D6B50',
        'metric-scholar':  '#5C4A7A',
        'metric-gold':     '#C5922B',
        'metric-inkblue':  '#2E5A8B',
        'metric-burgundy': '#8B2D3E',
        'metric-teal':     '#2A6B5C',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #C5922B 0%, #8B2D3E 100%)',
        'gradient-card': 'linear-gradient(145deg, var(--color-surface) 0%, var(--color-bg) 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D4A843 0%, #C5922B 100%)',
      },
      boxShadow: {
        glow:       '0 0 30px rgba(197,146,43,0.35)',
        'glow-lg':  '0 0 60px rgba(197,146,43,0.50)',
        'metric':   '0 2px 16px rgba(0,0,0,0.15)',
        'card-warm':'0 2px 20px rgba(42,28,15,0.10)',
      },
      borderRadius: {
        'arch': '80px 80px 0 0',
      },
      animation: {
        'fade-in':    'fadeIn 0.5s ease forwards',
        'glow-pulse': 'glowPulse 4s ease-in-out infinite',
        spin: 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(20px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(197,146,43,0.2)' },
          '50%':      { boxShadow: '0 0 50px rgba(197,146,43,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
