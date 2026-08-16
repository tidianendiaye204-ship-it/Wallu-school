/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F1C30",
        inkSoft: "#16294A",
        inkLine: "#2A3D5F",
        paper: "#F4EFE3",
        paperLine: "#DED2AE",
        gold: "#CDA434",
        green: "#3F8F6C",
        rust: "#C0563B",
        text: "#EDE7D8",
        muted: "#9FAFC7",
      },
      fontFamily: {
        sans: ['"Work Sans"', 'sans-serif'],
        serif: ['"Fraunces"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
};
