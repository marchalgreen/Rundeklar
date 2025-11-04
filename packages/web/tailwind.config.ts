import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'hsl(var(--surface))',
        surface2: 'hsl(var(--surface-2))',
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        foreground: 'hsl(var(--foreground))',
        accent: 'hsl(var(--accent))',
        accent2: 'hsl(var(--accent-2))',
        ring: 'hsl(var(--ring))',
      },
      ringColor: {
        DEFAULT: 'hsl(var(--ring))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
