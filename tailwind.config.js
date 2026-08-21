/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4fe',
          200: '#bfd0fd',
          300: '#93b2fb',
          400: '#608bf7',
          500: '#3b68f0',
          600: '#254ce4',
          700: '#1d39cd',
          800: '#1e30a6',
          900: '#1e2d83',
          950: '#141c4f',
        },
        sidebar: '#111827',
      },
    },
  },
  plugins: [],
};
