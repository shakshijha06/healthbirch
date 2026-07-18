/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // HEALTHBIRCH brand palette
        primary: {
          DEFAULT: '#0d1b3e',   // dark navy-blue
          dark:    '#0a0a0f',   // deep black
          light:   '#1e293b',   // slate container background
        },
        secondary: {
          DEFAULT: '#60A5FA',   // soft blue accent
          light:   '#93C5FD',   // lighter blue accent
        },
        accent: {
          DEFAULT: '#7C3AED',   // purple accent
          light:   '#9333EA',   // lighter purple
        },
        // Semantic / neutrals
        success:       '#10B981',
        warning:       '#F59E0B',
        danger:        '#EF4444',
        emergency:     '#DC2626',
        background:    '#0a0a0f',
        section:       '#0b0f19',   // dark background tint for sections
        card:          'rgba(255, 255, 255, 0.04)',
        textPrimary:   '#FFFFFF',   // white text
        textSecondary: '#94A3B8',   // light gray body text
        border:        'rgba(255, 255, 255, 0.08)',
      },
      borderRadius: {
        'card-sm': '16px',
        'card-md': '20px',
        'card-lg': '24px',
      },
      boxShadow: {
        'card':   '0 4px 24px -4px rgba(10, 31, 68, 0.08), 0 1px 4px rgba(10, 31, 68, 0.04)',
        'soft':   '0 2px 12px rgba(10, 31, 68, 0.06)',
        'strong': '0 8px 32px -6px rgba(10, 31, 68, 0.16)',
      },
    },
  },
  plugins: [],
};