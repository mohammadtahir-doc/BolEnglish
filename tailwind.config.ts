import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488", // Primary brand teal
          700: "#0f766e", // 3D shadow press teal
          800: "#115e59",
          900: "#134e4a",
        },
        ai: {
          50: "#eef2ff",
          100: "#e0e7ff",
          400: "#818cf8",
          500: "#6366f1", // AI Violet
          600: "#4f46e5",
          700: "#4338ca",
        },
        streak: {
          400: "#fbbf24",
          500: "#f59e0b", // Amber flame
          600: "#d97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        hindi: ["var(--font-hindi)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        "3d-primary": "0 4px 0 0 #0f766e",
        "3d-streak": "0 4px 0 0 #d97706",
        "3d-ai": "0 4px 0 0 #4338ca",
        "3d-neutral": "0 4px 0 0 #cbd5e1",
      },
    },
  },
  plugins: [],
};

export default config;
