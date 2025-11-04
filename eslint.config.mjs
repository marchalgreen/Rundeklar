// eslint.config.mjs
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-config-prettier';

export default [
  // ---------------------------------------------------------------------------
  //  Ignore generated + build output
  // ---------------------------------------------------------------------------
  {
    ignores: [
      '.next/**',
      'packages/web/.next/**',
      'node_modules/**',
      'dist/**',
      'packages/web/public/**',
      'packages/web/prisma/prisma/**',
    ],
  },

  // ---------------------------------------------------------------------------
  //  Base: TypeScript + Next.js + Hooks
  // ---------------------------------------------------------------------------
  ...tseslint.configs.recommended,

  {
    plugins: {
      'react-hooks': reactHooks,
      '@next/next': nextPlugin,
    },
    rules: {
      // --- Next.js recommended rules ---
      ...nextPlugin.configs['core-web-vitals'].rules,

      // --- Hooks ---
      'react-hooks/rules-of-hooks': 'error',
      // Silence dependency-array warnings for now
      'react-hooks/exhaustive-deps': 'off',

      // --- TypeScript pragmatics (temporarily relaxed for iteration) ---
      // turn off noisy “any” warnings
      '@typescript-eslint/no-explicit-any': 'off',

      // silence unused vars (except those prefixed with _)
      '@typescript-eslint/no-unused-vars': [
        'off',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      // prefer-const warnings are harmless; silence for now
      'prefer-const': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  //  Per-file overrides
  // ---------------------------------------------------------------------------
  {
    files: ['packages/web/next-env.d.ts'],
    rules: {
      // Next generates triple-slash refs; allow them here
      '@typescript-eslint/triple-slash-reference': 'off',
    },
  },
  {
    files: [
      'packages/web/next-env.d.ts',
      'packages/web/tailwind.config.*',
      'packages/web/postcss.config.*',
    ],
    rules: {
      // config files often mix import styles
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // tests, scripts, mocks, and scrapers can be looser
    files: [
      '**/*.test.ts',
      '**/*.test.tsx',
      'tests/**',
      'scripts/**',
      'packages/web/lib/mock/**',
      'packages/web/lib/scrapers/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    // workers often access globals directly
    files: ['packages/web/components/scan/card-detector.worker.ts'],
    rules: {
      'no-restricted-globals': 'off',
    },
  },

  // ---------------------------------------------------------------------------
  //  Prettier integration (must be last)
  // ---------------------------------------------------------------------------
  prettier,
];
