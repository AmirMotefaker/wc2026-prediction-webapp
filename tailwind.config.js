/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E6F1FB',
          100: '#B5D4F4',
          400: '#378ADD',
          600: '#185FA5',
          800: '#0C447C',
        },
      },
    },
  },
  plugins: [],
}
