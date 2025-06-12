/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6fcff",
          100: "#ccf9ff",
          200: "#99f3ff",
          300: "#66edff",
          400: "#33e7ff",
          500: "#00D4FF", // R7AI cyan
          600: "#00aae6",
          700: "#0080b3",
          800: "#005580",
          900: "#002b4d",
          950: "#001526",
        },
        r7ai: {
          cyan: "#00D4FF",
          black: "#0A0A0A",
          charcoal: "#111111",
          steel: "#333333",
          gray: "#888888",
        },
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
