/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        poker: {
          green: '#0d4d2a',
          felt: '#1a5c32',
          gold: '#d4af37',
          red: '#c62828',
        }
      }
    },
  },
  plugins: [],
}
