import type { Config } from 'tailwindcss'
import { join } from 'node:path'

const config: Config = {
  content: [
    join(__dirname, 'index.html'),
    join(__dirname, 'src/**/*.{ts,tsx}')
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: 'var(--font-sans)',
        display: 'var(--font-display)'
      },
      spacing: {
        '1.5': 'var(--space-1)',
        '2.5': 'var(--space-2)',
        '3.5': 'var(--space-3)',
        '4.5': 'var(--space-4)',
        '5.5': 'var(--space-5)',
        '6.5': 'var(--space-6)',
        '7.5': 'var(--space-7)'
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)'
      },
      colors: {
        surface: 'hsl(var(--surface))',
        'surface-2': 'hsl(var(--surface-2))',
        border: 'hsl(var(--border))',
        muted: 'hsl(var(--muted))',
        foreground: 'hsl(var(--foreground))',
        accent: 'hsl(var(--primary))',
        'accent-2': 'hsl(var(--neutral))',
        'accent-blue': 'hsl(var(--primary))',
        court: {
          50: '#f1f9ff',
          100: '#e0f2ff',
          500: '#0d7bdc',
          600: '#0a65b0',
          900: '#05294a'
        }
      },
      ringColor: {
        DEFAULT: 'hsl(var(--ring))'
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)'
      },
      backgroundImage: {
        'app-gradient': `
          radial-gradient(1200px 800px at 80% 60%, hsl(var(--bg-gradient-2)) 0%, transparent 60%),
          radial-gradient(900px 600px at 20% 30%, hsl(var(--bg-gradient-1)) 0%, transparent 55%),
          hsl(var(--bg-canvas))
        `
      }
    }
  },
  plugins: []
}

export default config