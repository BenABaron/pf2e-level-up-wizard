import globals from 'globals';
import pluginJs from '@eslint/js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        $: 'readonly',
        jQuery: 'readonly',
        ui: 'readonly',
        game: 'readonly',
        Hooks: 'readonly',
        Handlebars: 'readonly',
        FormApplication: 'readonly',
        Dialog: 'readonly',
        ChatMessage: 'readonly',
        fromUuid: 'readonly',
        foundry: 'readonly',
        getTemplate: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'error'
    }
  },
  pluginJs.configs.recommended
];
