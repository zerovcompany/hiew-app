import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F7F3E8",
        paper: "#FFFDF8",
        ink: "#1E2A22",
        krachiao: {
          DEFAULT: "#D1548C",
          dark: "#A93D6D",
          light: "#F3D7E4",
        },
        mudmee: {
          DEFAULT: "#2B4570",
          dark: "#1B2C48",
          light: "#DCE3EE",
        },
        turmeric: {
          DEFAULT: "#E3A72F",
          dark: "#B9820E",
          light: "#FBEACB",
        },
        line: "#06C755",
      },
      fontFamily: {
        display: ["Mitr", "sans-serif"],
        body: ["Sarabun", "sans-serif"],
      },
      borderRadius: {
        ticket: "4px",
        chip: "999px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(30,42,34,0.06), 0 4px 14px rgba(30,42,34,0.06)",
        lifted: "0 8px 24px rgba(30,42,34,0.14)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pop-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "pop-in": "pop-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
