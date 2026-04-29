import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 18px 50px rgba(20, 32, 55, 0.12)",
      },
      colors: {
        ink: "#182033",
        mist: "#f5f7fb",
        leaf: "#16a34a",
        ember: "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
