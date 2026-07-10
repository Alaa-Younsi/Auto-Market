/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        "panel-2": "rgb(var(--c-panel-2) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--c-brand) / <alpha-value>)",
          light: "rgb(var(--c-brand-light) / <alpha-value>)",
          dark: "rgb(var(--c-brand-dark) / <alpha-value>)",
        },
        accent: "rgb(var(--c-green) / <alpha-value>)",
      },
      fontFamily: {
        heading: ["Sora", "Cairo", "sans-serif"],
        body: ["Inter", "Cairo", "sans-serif"],
        arabic: ["Cairo", "Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgb(var(--c-brand) / 0.45)",
        "glow-green": "0 0 30px -8px rgb(var(--c-green) / 0.5)",
        card: "0 2px 8px -2px rgb(15 23 42 / 0.06), 0 8px 24px -8px rgb(15 23 42 / 0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { transform: "translateY(16px)" },
          "100%": { transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.4)", opacity: "0" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        float: "float 6s ease-in-out infinite",
        "spin-slow": "spin-slow 18s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.2,0.8,0.2,1) infinite",
        marquee: "marquee 24s linear infinite",
      },
    },
  },
  plugins: [],
};
