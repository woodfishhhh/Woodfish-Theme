import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

const SOURCE_FILES = ['apps/*/src/**/*.ts', 'apps/*/browser/**/*.ts', 'packages/*/src/**/*.ts'];
const TEST_FILES = ['apps/*/src/__tests__/**/*.ts', 'packages/*/src/__tests__/**/*.ts'];

export default [
  js.configs.recommended,
  {
    files: SOURCE_FILES,
    ignores: TEST_FILES,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Each file is checked with its nearest tsconfig.json (core, extension, browser).
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,
      ...prettierConfig.rules,
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['apps/vscode-extension/src/**/*.ts'],
    ignores: TEST_FILES,
    languageOptions: {
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
  },
  {
    // Workbench renderer scripts run in the browser.
    files: ['apps/*/browser/**/*.ts'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // The shared core is host-agnostic: no Node, DOM or VS Code globals.
    files: ['packages/theme-core/src/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['vscode', 'electron', 'node:*', 'fs', 'path'] },
      ],
    },
  },
  {
    ignores: ['**/out/', '**/node_modules/', '**/*.js', ...TEST_FILES],
  },
];
