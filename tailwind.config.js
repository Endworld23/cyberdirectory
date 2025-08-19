/** @type {import('tailwindcss').Config} */
module.exports = {
  // ✅ Cover both with- and without-/src setups
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#eef6ff",
          100: "#d9ebff",
          200: "#b7d8ff",
          300: "#8ec0ff",
          400: "#61a2ff",
          500: "#3a84ff",
          600: "#2066f2",
          700: "#184fcb",
          800: "#153fa3",
          900: "#133881"
        }
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
};