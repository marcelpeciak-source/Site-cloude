// Lint rules for the site (browser ES modules) and the Node scripts.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['vendor/**', 'node_modules/**', 'screenshots/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['przyklady/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script', // classic <script defer> on the example pages and inlined into visualisations
      globals: { ...globals.browser },
    },
  },
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.browser }, // page.evaluate() callbacks run in the browser
    },
  },
  {
    rules: {
      'no-unused-vars': ['error', { args: 'after-used', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-shadow': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'log'] }],
    },
  },
];
