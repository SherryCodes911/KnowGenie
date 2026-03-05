import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "sans-serif"],
        display: ["var(--font-display)", "serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        ink: {
          DEFAULT: "#0d0d0f",
          soft: "#1a1a1f",
          muted: "#2a2a32",
        },
        paper: {
          DEFAULT: "#f5f3ee",
          warm: "#ede9df",
          muted: "#d8d3c8",
        },
        genie: {
          DEFAULT: "#c8a96e",
          light: "#e2cfa0",
          dark: "#a07840",
          glow: "rgba(200,169,110,0.15)",
        },
        jade: {
          DEFAULT: "#3d8b6e",
          light: "#5ab896",
          dark: "#2a6150",
        },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        shimmer: "shimmer 2s linear infinite",
        pulse_soft: "pulseSoft 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
