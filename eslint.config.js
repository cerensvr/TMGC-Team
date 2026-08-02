const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      '.expo/**',
      'backend/**',
      'ios/**',
      'node_modules/**',
      'output/**',
      'tmp/**',
    ],
  },
]);
