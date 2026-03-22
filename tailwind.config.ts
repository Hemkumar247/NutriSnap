import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    // Root-level pages (e.g. App.tsx) — must be listed or Tailwind will not emit their utilities
    './*.{ts,tsx}',
  ],
};

export default config;
