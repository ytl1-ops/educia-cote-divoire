import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        educia: {
          50: "#F0F9FF",
          100: "#DFF1FF",
          200: "#B9E2FF",
          300: "#7BCBFF",
          400: "#36AEFF",
          500: "#0B8FEF",
          600: "#0070CC",
          700: "#0059A3",
          800: "#064A85",
          900: "#0A3D6B",
        },
        ivoire: {
          orange: "#FF8200",
          blanc: "#FFFFFF",
          vert: "#009E60",
        },
        succes: "#16A34A",
        alerte: "#F59E0B",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
