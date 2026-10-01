/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pearl: {
          50: '#FDFBF7',
          100: '#F9F8F6',
          200: '#F4F2EE',
          300: '#E8E5DF',
        },
        graphite: {
          850: '#141416',
          900: '#0F0F11',
          950: '#09090B',
        }
      }
    },
  },
  plugins: [],
}