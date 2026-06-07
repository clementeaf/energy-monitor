// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([globalIgnores(['dist']), {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  ],
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
  },
}, {
  files: ['src/components/ui/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-syntax': [
      'warn',
      {
        selector: 'Literal[value=/\\b(?:text|bg|border|ring|divide|outline)-gray-/]',
        message: 'Prefer semantic tokens (foreground, muted, surface, border) over gray-* in UI primitives.',
      },
    ],
  },
}, ...storybook.configs["flat/recommended"]])
