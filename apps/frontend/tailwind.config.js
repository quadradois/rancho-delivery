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
        display: ['Alfa Slab One', 'serif'],
        body:    ['Nunito', 'sans-serif'],
        produto: ['Alfa Slab One', 'serif'],
        sora: ['Sora', 'sans-serif'],
        'mono-crm': ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
