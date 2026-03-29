/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        bg:       '#0f1a0c',
        surface:  '#172012',
        surface2: '#1e2e18',
        surface3: '#253820',
        border:   '#2a3d22',
        border2:  '#354d2a',
        green:    '#6dde84',
        green2:   '#3aad54',
        amber:    '#f0a840',
        'amber-dim': '#8a5e1a',
        red:      '#e06060',
        blue:     '#60a8e0',
        text:     '#d4e8cc',
        'text-dim': '#708060',
        'text-mid': '#a0b898',
      },
      fontFamily: {
        sans:  ['Instrument Sans', 'sans-serif'],
        serif: ['Fraunces', 'serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
