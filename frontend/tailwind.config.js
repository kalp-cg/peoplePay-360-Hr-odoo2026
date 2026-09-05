/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          primary: '#714B67',
          'primary-hover': '#5d3d54',
          'primary-light': '#f3ecf1',
          teal: '#00A09D',
          'teal-hover': '#008b88',
          'teal-light': '#e6f6f6',
          dark: '#2C3E50',
          canvas: '#F8F9FA',
          card: '#FFFFFF',
          border: '#E2E8F0',
          text: '#1E293B',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Roboto Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
