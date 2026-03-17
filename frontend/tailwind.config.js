/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#f0f4ff', 100: '#dbe4ff', 200: '#bac8ff', 500: '#4263eb', 600: '#3b5bdb', 700: '#364fc7', 800: '#2b3d8f', 900: '#1e2a5e' },
        fda: { blue: '#003366', gold: '#c49a6c' },
      },
    },
  },
  plugins: [],
}
