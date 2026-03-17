import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#fafafa",
        foreground: "#1e1e1e",
        muted: "#e5e7eb",
        accent: "#0f766e",
        sidebar: "#252526",
        sidebarText: "#cccccc",
        sidebarHover: "#2d2d30"
      }
    }
  },
  plugins: []
};

export default config;

