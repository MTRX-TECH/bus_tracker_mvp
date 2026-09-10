/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          400: "#F3E5AB",
          500: "#D4AF37",
          600: "#AA820A",
          700: "#806000",
        },
        silver: {
          300: "#E0E0E0",
          400: "#C0C0C0",
          500: "#999999",
        },
        luxury: {
          black: "#0D0D0D",
          dark: "#141414",
          card: "rgba(25, 25, 25, 0.7)",
        }
      },
      boxShadow: {
        gold: "0 4px 20px -2px rgba(212, 175, 55, 0.25)",
        goldLG: "0 8px 30px -4px rgba(212, 175, 55, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      backdropBlur: {
        xs: "2px",
      }
    },
  },
  plugins: [],
};
