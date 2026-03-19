/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#25D366",
          dark:    "#1ebe5a",
          muted:   "#128C7E",
        },
        surface: {
          DEFAULT: "#111b21",
          card:    "#1f2c33",
          input:   "#2a3942",
          hover:   "#263238",
          border:  "#2a3942",
        },
      },
    },
  },
  plugins: [],
}

