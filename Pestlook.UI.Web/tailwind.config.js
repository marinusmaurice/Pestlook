/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
          bg:          '#FEFCF5',
          surface:     '#FFFFFF',
          surface2:    '#F9F7F0',
          surface3:    '#EAF7F0',
          border:      '#E2DFD3',
          border2:     '#CCC9BC',
          green:       '#2B6E4F',
          green2:      '#1F4E38',
          amber:       '#E5A52F',
          'amber-dim': '#C67C1E',
          red:         '#C75146',
          blue:        '#3B7DB8',
          text:        '#1F2A26',
          'text-dim':  '#5A6B62',
          'text-mid':  '#1E2F2A',
        },
        fontFamily: {
          sans:  ['Inter', 'sans-serif'],
          serif: ['Fraunces', 'serif'],
          mono:  ['JetBrains Mono', 'monospace'],
        },
    },
  },
  plugins: [],
};
