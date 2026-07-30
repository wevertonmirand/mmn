import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: { boxShadow: { gold: "0 12px 35px -16px rgba(212,175,55,.65)" } } },
  plugins: []
};
export default config;
