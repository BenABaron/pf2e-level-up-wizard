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
        CONFIG: 'readonly',
        ui: 'readonly',
        game: 'readonly',
        Hooks: 'readonly',
        Handlebars: 'readonly',
        FormApplication: 'readonly',
        ApplicationV2: 'readonly',
        Dialog: 'readonly',
        ChatMessage: 'readonly',
        fromUuid: 'readonly',
        foundry: 'readonly',
        getTemplate: 'readonly',
        loadTemplates: 'readonly',
        renderTemplate: 'readonly'
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
