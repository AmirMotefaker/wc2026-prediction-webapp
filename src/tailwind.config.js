/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { dark: "#0D1B2A", mid: "#1A3A5C", light: "#1E4976" },
        gold: { DEFAULT: "#C8A84B", light: "#E6C97A", dark: "#9A7A2E" },
        muted: "#7BA4C5",
        ice: "#E8F4FD",
      },
    },
  },
  plugins: [],
};
