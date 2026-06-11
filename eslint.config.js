import js from '@eslint/js';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['dist/**', '.vite/**', 'node_modules/**']
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        SVGSVGElement: 'readonly',
        HTMLElement: 'readonly',
        console: 'readonly',
        
        // Node / CommonJS globals
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        SVGSVGElement: 'readonly',
        HTMLElement: 'readonly',
        console: 'readonly',
        
        // Node / CommonJS globals
        module: 'readonly',
        require: 'readonly',
        __dirname: 'readonly',
      }
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off', // Turn off to prevent any-related lint failures
      'no-undef': 'off',
    },
  },
];
