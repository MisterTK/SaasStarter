/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        // AptlySaid brand colors
        primary: "#1A2A4F", // Deep Navy Blue
        secondary: "#F8F9FA", // Crisp Off-White
        accent: "#C5B358", // Sophisticated Muted Gold
        neutral: "#848A96", // Neutral Grey
        
        // Extended palette for UI needs
        aptly: {
          navy: {
            50: "#E6E9EF",
            100: "#CDD3DF",
            200: "#9BA7BF",
            300: "#697B9F",
            400: "#374F7F",
            500: "#1A2A4F", // Primary
            600: "#15223F",
            700: "#101A2F",
            800: "#0B111F",
            900: "#060910",
          },
          gold: {
            50: "#FDFCF4",
            100: "#FAF8E9",
            200: "#F5F1D3",
            300: "#F0EABD",
            400: "#DDD191",
            500: "#C5B358", // Accent
            600: "#B1A146",
            700: "#9D8F34",
            800: "#7A6F29",
            900: "#574F1E",
          },
          gray: {
            50: "#F4F5F6",
            100: "#E9EAEC",
            200: "#D3D5D9",
            300: "#BDC0C6",
            400: "#A1A5AD",
            500: "#848A96", // Neutral
            600: "#6B7280",
            700: "#525966",
            800: "#3A404D",
            900: "#212733",
          }
        }
      },
      fontFamily: {
        serif: ['Lora', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'Lato', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-gold": "pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
        pulseGold: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};