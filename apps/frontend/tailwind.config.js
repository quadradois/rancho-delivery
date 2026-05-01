/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        brand:   ['Rustic Printed', 'serif'],
        display: ['Rustic Printed', 'serif'],
        body:    ['Nunito', 'sans-serif'],
        produto: ['Alfa Slab One', 'serif'],
        sora: ['Sora', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        'mono-crm': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
