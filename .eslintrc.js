module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  rules: {
    // Error Prevention
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-unreachable': 'error',

    // Code Style
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],

    // Best Practices
    'eqeqeq': 'error',
    'curly': 'error',
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error'
  },
  globals: {
    // Define global variables used in the app
    'fetch': 'readonly'
  }
};