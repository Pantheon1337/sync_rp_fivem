import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'node_modules/**',
      'resources/**/node_modules/**',
      'nui/dist/**',
      '**/dist/**',
      'package-lock.json',
      // FiveM server entrypoints use Citizen globals; lint pure lib/ instead
      'resources/**/server/**',
      'scripts/migrate.cjs',
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['resources/**/lib/**/*.js'],
    ignores: ['resources/**/lib/**/*.test.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['resources/**/lib/**/*.test.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier,
];
