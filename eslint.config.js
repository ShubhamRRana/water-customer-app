// @see https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.expo/**',
      'supabase/functions/**',
      'scripts/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
  },
];
