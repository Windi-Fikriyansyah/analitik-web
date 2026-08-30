import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          100: '#dbe6fe',
          500: '#3d5afe',
          600: '#3247d1',
          700: '#28389f',
        },
      },
    },
  },
  plugins: [],
};
export default config;
