/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1d4ed8', dark: '#1e3a8a', light: '#3b82f6' },
        navy: { DEFAULT: '#0f1f3d', light: '#162b52', muted: '#6b7fa3' },
      },
    },
  },
  plugins: [],
};
