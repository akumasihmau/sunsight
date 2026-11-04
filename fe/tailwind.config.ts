import type { Config } from "tailwindcss";
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "inverse-primary": "#ffb77d",
        "inverse-surface": "#1e293b",
        "surface-bright": "#faf8ff",
        "surface-dim": "#d2d9f4",
        "error": "#ba1a1a",
        "on-surface": "#0f172a",
        "on-secondary-container": "#00714e",
        "on-secondary-fixed-variant": "#005137",
        "surface-tint": "#d97706",
        "tertiary-container": "#007bb9",
        "on-error-container": "#93000a",
        "on-primary-fixed": "#2f1500",
        "secondary": "#059669",
        "secondary-container": "#82f5c1",
        "background": "#f8fafc",
        "surface-container-low": "#f8fafc",
        "tertiary-fixed": "#cce5ff",
        "on-tertiary-fixed": "#001d31",
        "on-tertiary-fixed-variant": "#004b73",
        "inverse-on-surface": "#f1f5f9",
        "on-primary-container": "#fffbff",
        "surface-container-lowest": "#ffffff",
        "outline-variant": "#cbd5e1",
        "surface-variant": "#dae2fd",
        "on-primary-fixed-variant": "#6e3900",
        "on-tertiary": "#ffffff",
        "on-primary": "#ffffff",
        "tertiary": "#0284c7",
        "on-secondary-fixed": "#002114",
        "primary": "#d97706",
        "outline": "#64748b",
        "primary-fixed-dim": "#ffb77d",
        "tertiary-fixed-dim": "#93ccff",
        "on-background": "#0f172a",
        "on-error": "#ffffff",
        "on-tertiary-container": "#fdfcff",
        "surface-container": "#f1f5f9",
        "surface-container-highest": "#e2e8f0",
        "on-secondary": "#ffffff",
        "secondary-fixed-dim": "#68dba9",
        "surface": "#f8fafc",
        "secondary-fixed": "#85f8c4",
        "primary-container": "#b45309",
        "on-surface-variant": "#475569",
        "primary-fixed": "#ffdcc3",
        "surface-container-high": "#e2e8f0",
        "error-container": "#fee2e2"
      },
      fontFamily: {
        "sans": ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "title": ["Plus Jakarta Sans", "Inter", "sans-serif"],
        "body-md": ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        "code-metric": ["Inter", "monospace"],
      }
    },
  },
  plugins: [
    forms,
    containerQueries
  ],
};
export default config;
