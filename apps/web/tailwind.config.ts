import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#061B3A", 800: "#0B2750", 700: "#143461", 600: "#2A4A7A" },
        cyan: { DEFAULT: "#36BDF2", light: "#9CECF1", soft: "#E4F7FB" },
        paper: "#F5F7F8",
        ink: "#10213B",
        mute: "#5B6B82",
        line: "#E3E8EE",
      },
      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "'SF Pro Display'", "'Inter'", "'Segoe UI'", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(6,27,58,.04), 0 4px 16px rgba(6,27,58,.05)",
        pop: "0 8px 40px rgba(6,27,58,.18)",
      },
      borderRadius: { xl2: "14px" },
    },
  },
  plugins: [],
};
export default config;
