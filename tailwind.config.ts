import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./ui/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: "#F5F5F7",
        border: "#E5E5EA",
        foreground: "#1D1D1F",
        secondary: "#6E6E73",
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          pressed: "#3730A3",
        },
        success: {
          DEFAULT: "#1F9D55",
          bg: "#EAF7EF",
        },
        error: {
          DEFAULT: "#D92D20",
          bg: "#FEF3F2",
        },
        warning: {
          DEFAULT: "#B54708",
          bg: "#FFFAEB",
        },
      },
      borderRadius: {
        card: "20px",
        btn: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        sticky: "0 -4px 16px rgba(0,0,0,0.04)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          "Inter",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
