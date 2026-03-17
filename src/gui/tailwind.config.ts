import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./types/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-elevated": "var(--surface-elevated)",
        border: "var(--border)",
        "border-active": "var(--border-active)",
        primary: "var(--primary)",
        "primary-muted": "var(--primary-muted)",
        accent: "var(--accent)",
        success: "var(--success)",
        danger: "var(--danger)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "stamp-red": "var(--stamp-red)",
        navy: {
          50: "#f0f4ff",
          100: "#dbe4ff",
          200: "#bac8ff",
          500: "#4263eb",
          600: "#3b5bdb",
          700: "#364fc7",
          800: "#2b3d8f",
          900: "#1e2a5e",
        },
        fda: {
          blue: "#003366",
          gold: "#c49a6c",
        },
      },
      fontFamily: {
        serif: ['"IBM Plex Serif"', "Georgia", "serif"],
        sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
