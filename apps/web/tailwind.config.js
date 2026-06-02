/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand:  { DEFAULT: '#2563EB', dark: '#1D4ED8', light: '#3B82F6', muted: '#DBEAFE' },
        navy:   { DEFAULT: '#0F172A', light: '#1E293B', muted: '#64748B' },
        rain:   { DEFAULT: '#E53935', dark: '#C62828', light: '#EF5350' },
        slate:  { 25: '#F8FAFC' },
      },
      borderRadius: { '2xl': '16px', '3xl': '24px' },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / .07), 0 1px 2px -1px rgb(0 0 0 / .07)',
        lift: '0 4px 12px 0 rgb(0 0 0 / .10)',
        modal:'0 20px 60px -10px rgb(0 0 0 / .20)',
      },
    },
  },
  plugins: [],
};
