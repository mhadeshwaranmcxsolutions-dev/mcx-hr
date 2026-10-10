import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: "#FF7A00",
          orangeLight: "#FF9A3D",
          orangeDark: "#E56A00",
          navy: "#0B1F3A",
          navyDeep: "#07152A",
          navySoft: "#13315C",
          blue: "#0A66C2",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px -6px rgba(11, 31, 58, 0.12)",
        glow: "0 0 24px rgba(255, 122, 0, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
