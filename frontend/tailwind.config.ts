import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        shell: '#f4f4f8',
        panel: '#ffffff',
        line: '#e6e6ef',
        textbase: '#545466',
        muted: '#a0a0b1',
        accent: '#fd6f66'
      }
    }
  },
  plugins: []
};

export default config;
