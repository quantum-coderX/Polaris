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
        heading: ['Inter', 'sans-serif'],
        serif:   ['Inter', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      colors: {
        bg:        'var(--color-bg)',
        canvas:    'var(--color-canvas)',
        surface:   'var(--color-surface)',
        surface2:  'var(--color-surface-2)',
        border:    'var(--color-border)',
        primary:   'var(--color-primary)',   // Electric Violet
        secondary: 'var(--color-secondary)', // Luminous Emerald
        accent:    'var(--color-accent)',    // Danger/Error Red
        gold:      'var(--color-gold)',      // Warning/Alert Amber
        // premium design system colors
        'metric-violet': '#8B5CF6',
        'metric-emerald': '#10B981',
        'metric-amber': '#F59E0B',
        'metric-rose': '#F43F5E',
        'metric-blue': '#3B82F6',
        'metric-cyan': '#06B6D4',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
        'gradient-card': 'linear-gradient(145deg, var(--color-surface) 0%, var(--color-bg) 100%)',
        'gradient-violet-emerald': 'linear-gradient(135deg, #8B5CF6 0%, #10B981 100%)',
      },
      boxShadow: {
        glow:       '0 0 30px rgba(139,92,246,0.15)',
        'glow-lg':  '0 0 60px rgba(139,92,246,0.30)',
        'glow-emerald': '0 0 30px rgba(16,185,129,0.15)',
        'metric':   '0 4px 20px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'arch': '12px 12px 0 0',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,92,246,0.1)' },
          '50%':      { boxShadow: '0 0 50px rgba(139,92,246,0.3)' },
        },
      },
    },
  },
  plugins: [],
}

