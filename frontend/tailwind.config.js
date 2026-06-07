/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
      },
      colors: {
        bg:        '#0d0d1a',
        surface:   '#13132a',
        surface2:  '#1a1a35',
        border:    '#2a2a4a',
        primary:   '#7c5cfc',
        secondary: '#00d4c8',
        accent:    '#ff6b6b',
        gold:      '#fbbf24',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #7c5cfc 0%, #00d4c8 100%)',
        'gradient-card': 'linear-gradient(145deg, #1a1a35 0%, #13132a 100%)',
      },
      boxShadow: {
        glow: '0 0 30px rgba(124,92,252,0.3)',
        'glow-lg': '0 0 60px rgba(124,92,252,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        spin: 'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,92,252,0.2)' },
          '50%':      { boxShadow: '0 0 40px rgba(124,92,252,0.5)' },
        },
      },
    },
  },
  plugins: [],
}
