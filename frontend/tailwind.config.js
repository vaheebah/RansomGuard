/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy:  { 900: "#0a0f1e", 800: "#0f172a", 700: "#1e293b", 600: "#334155" },
        cyber: { DEFAULT: "#00f5ff", dim: "#00c4cc" },
        threat:{ DEFAULT: "#ff3d6e", dim: "#cc2050" },
        safe:  { DEFAULT: "#00e676", dim: "#00b85a" },
        warn:  { DEFAULT: "#ffab00", dim: "#cc8800" },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Space Grotesk'", "sans-serif"],
      },
      animation: {
        pulse2: "pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite",
        slide:  "slideIn .3s ease-out",
      },
      keyframes: {
        slideIn: { from: { opacity: 0, transform: "translateY(-8px)" }, to: { opacity: 1, transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};
