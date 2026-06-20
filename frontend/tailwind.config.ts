import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        ink: {
          50: "#f8faff", 100: "#f0f4ff", 200: "#e2e8f8",
          300: "#c6d0ee", 400: "#8896c8", 500: "#5566a8",
          600: "#3a4a8a", 700: "#26356e", 800: "#162050", 900: "#0a1232",
        },
        volt: { 400: "#a78bfa", 500: "#8b5cf6", 600: "#7c3aed" },
        jade: { 400: "#34d399", 500: "#10b981" },
        coral: { 400: "#fb7185", 500: "#f43f5e" },
        gold: { 400: "#fbbf24", 500: "#f59e0b" },
        sky2: { 400: "#38bdf8", 500: "#0ea5e9" },
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(ellipse 80% 80% at 50% -20%,rgba(120,119,198,0.3),rgba(255,255,255,0))",
        "card-shine": "linear-gradient(135deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0) 60%)",
        "volt-gradient": "linear-gradient(135deg,#7c3aed,#6366f1)",
        "jade-gradient": "linear-gradient(135deg,#059669,#10b981)",
        "coral-gradient": "linear-gradient(135deg,#be123c,#f43f5e)",
      },
      boxShadow: {
        "neon-volt": "0 0 30px -5px rgba(139,92,246,0.5)",
        "neon-jade": "0 0 30px -5px rgba(16,185,129,0.4)",
        "neon-coral": "0 0 30px -5px rgba(244,63,94,0.4)",
        "card-dark": "0 1px 2px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.06)",
        "card-glow": "0 0 0 1px rgba(139,92,246,0.3),0 8px 32px rgba(139,92,246,0.15)",
        "float": "0 24px 48px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.06)",
      },
      keyframes: {
        "count-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "pulse-ring": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(20px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "glow-pulse": { "0%,100%": { boxShadow: "0 0 20px -5px rgba(139,92,246,0.4)" }, "50%": { boxShadow: "0 0 40px -5px rgba(139,92,246,0.8)" } },
      },
      animation: {
        "count-up": "count-up 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        "pulse-ring": "pulse-ring 2s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
