import tseslint from 'typescript-eslint'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import prettier from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/**', 'packages/**/dist/**', 'node_modules/**']
  },
  // Node.js scripts configuration
  {
    files: ['**/scripts/**/*.ts', '**/*.mjs'],
    languageOptions: {
      parserOptions: {
        project: ['./packages/webapp/scripts/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname || process.cwd()
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly'
      }
    }
  },
  ...tseslint.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }
      ]
    },
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  prettier
]
