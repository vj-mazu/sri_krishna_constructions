/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        excel: {
          header: '#1E293B',
          grid: '#E2E8F0',
          accent: '#0F766E',
          inward: '#16A34A',
          sale: '#DC2626',
        }
      }
    },
  },
  plugins: [],
}
