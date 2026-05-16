/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        ink: {
          900: "#0B0F1A",
          700: "#1F2433",
          500: "#4B5468",
          300: "#9AA3B8",
          100: "#E6E9F2",
        },
        canvas: {
          DEFAULT: "#FAF8F3",
          raised: "#FFFFFF",
          sunken: "#F1EEE6",
        },
        brand: {
          50: "#F2EEFF",
          100: "#E4DBFF",
          300: "#A98CFF",
          500: "#6E45FF",
          600: "#5A33E0",
          700: "#4624B8",
        },
        accent: {
          500: "#FF7849",
          600: "#F0581F",
        },
        race: {
          red: "#EF4444",
          blue: "#3B82F6",
          emerald: "#10B981",
          amber: "#F59E0B",
          violet: "#8B5CF6",
          pink: "#EC4899",
          cyan: "#06B6D4",
          fuchsia: "#D946EF",
          lime: "#84CC16",
          rose: "#F43F5E",
          sky: "#0EA5E9",
          orange: "#F97316",
          teal: "#14B8A6",
          indigo: "#6366F1",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px -4px rgba(15, 23, 42, 0.08)",
        pop: "0 12px 36px -8px rgba(110, 69, 255, 0.25), 0 4px 16px rgba(15, 23, 42, 0.08)",
        ring: "0 0 0 4px rgba(110, 69, 255, 0.15)",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(110,69,255,0.08), transparent 60%), radial-gradient(circle at bottom right, rgba(255,120,73,0.07), transparent 55%)",
      },
      animation: {
        "fade-in": "fade-in 240ms ease-out",
        "pop-in": "pop-in 280ms cubic-bezier(0.16,1,0.3,1)",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
    },
  },
  plugins: [],
};
