import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  { languageOptions: { sourceType: 'commonjs', globals: { ...globals.node, ...globals.jest } } },
];
