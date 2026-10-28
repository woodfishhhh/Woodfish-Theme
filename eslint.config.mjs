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
      // TypeScript already resolves identifiers, including type namespaces such as NodeJS.
      'no-undef': 'off',
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
    // The desktop CLI is a Node.js 22 program.
    files: ['apps/desktop-cli/src/**/*.ts'],
    ignores: TEST_FILES,
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    // Renderer code runs in host pages (VS Code workbench, Codex app).
    files: [
      'apps/*/browser/**/*.ts',
      'packages/renderer-runtime/src/**/*.ts',
      'packages/adapter-codex/src/renderer/**/*.ts',
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Shared packages are host-agnostic: no Node, Electron or VS Code imports.
    files: [
      'packages/theme-core/src/**/*.ts',
      'packages/renderer-runtime/src/**/*.ts',
      'packages/adapter-codex/src/**/*.ts',
    ],
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
