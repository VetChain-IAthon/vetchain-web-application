import type { Config } from "tailwindcss";

// Tokens extraídos del prototipo (design/prototipo). Ver design/tokens.md.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#D01F29", hover: "#8E1119", soft: "#FBE8E9", softBorder: "#F0C9CC", strong: "#A8161F" },
        ink: { DEFAULT: "#161616", 2: "#3A3A3A", muted: "#5F6368" },
        canvas: "#F5F5F5",
        night: { DEFAULT: "#111111", muted: "#B5B5B5", faint: "#8A8A8A" },
        surface: "#FFFFFF",
        line: { DEFAULT: "#E3E3E3", strong: "#CFCFCF" },
        ok: { bg: "#E5F3EA", fg: "#1E6B3A" },
        warn: { bg: "#FDF1DC", fg: "#8A5300" },
        danger: { bg: "#FBE8E9", fg: "#A8161F", badge: "#A63224" },
        neutral: { bg: "#EDEDED", fg: "#3A3A3A" },
        info: { bg: "#E8EEF9", fg: "#1F3F7A" },
      },
      borderRadius: { xs: "4px", sm: "6px", DEFAULT: "8px", lg: "12px" },
      fontFamily: { sans: ['"IBM Plex Sans"', "system-ui", "sans-serif"] },
      spacing: { sidebar: "240px" },
    },
  },
  plugins: [],
};
export default config;
