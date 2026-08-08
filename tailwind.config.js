/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './source/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg)',
        foreground: 'var(--fg)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--fg)',
        },
        primary: {
          DEFAULT: 'var(--emerald)',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: 'var(--border)',
          foreground: 'var(--muted)',
        },
        border: 'var(--border)',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
