import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  { languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.jest } } },
  { files: ['scripts/runtime/*.js'], languageOptions: { sourceType: 'module' } },
  { files: ['scripts/runtime/*.ts'], languageOptions: { parser: tsParser, sourceType: 'module' } },
];
