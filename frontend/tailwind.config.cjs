const defaultPreset = require('tailwindcss/defaultConfig');

module.exports = {
  presets: [defaultPreset],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
