module.exports = {
  roots: ['<rootDir>/src'],
  projects: [
    // Project 1: Utility tests (no React Native required)
    {
      displayName: 'utils',
      preset: 'ts-jest',
      testEnvironment: 'node',
      setupFiles: ['<rootDir>/jest.setup.utils.js'],
      testMatch: [
        '<rootDir>/src/__tests__/utils/**/*.test.{ts,tsx}',
        '<rootDir>/src/__tests__/lib/**/*.test.{ts,tsx}',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: {
            jsx: 'react',
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      collectCoverageFrom: [
        'src/utils/**/*.{ts,tsx}',
        'src/lib/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/__tests__/**',
        '!src/**/__mocks__/**',
      ],
    },
    // Project 2: React Native tests (full React Native setup)
    {
      displayName: 'react-native',
      preset: 'jest-expo',
      transformIgnorePatterns: [
        'node_modules/(?!(react-native|@react-native(-community)?|react-native/jest|(jest-)?react-native|expo(nent)?|@expo(nent)?/.*|expo-font|expo-location|expo-notifications|expo-modules-core|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)/)',
      ],
      setupFiles: ['<rootDir>/jest.setup.js'],
      testMatch: [
        '<rootDir>/src/__tests__/**/*.test.{ts,tsx}',
        '<rootDir>/src/**/*.test.{ts,tsx}',
        '!<rootDir>/src/__tests__/utils/**',
        '!<rootDir>/src/__tests__/lib/**',
      ],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^expo-modules-core/build/uuid/uuid\\.web$': '<rootDir>/__mocks__/expo-modules-core/build/uuid/uuid.web.js',
      },
      collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/utils/**',
        '!src/lib/**',
        '!src/**/*.d.ts',
        '!src/**/*.stories.{ts,tsx}',
        '!src/**/__tests__/**',
        '!src/**/__mocks__/**',
      ],
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
  ],
};

