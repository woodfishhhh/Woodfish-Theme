module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/__tests__/helpers/'],
  transform: {
    '^.+\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@woodfish/theme-core$': '<rootDir>/../../packages/theme-core/src/index.ts',
    '^@woodfish/renderer-runtime$': '<rootDir>/../../packages/renderer-runtime/src/index.ts',
    '^@woodfish/adapter-codex$': '<rootDir>/../../packages/adapter-codex/src/index.ts',
    '^@woodfish/adapter-codex/renderer$': '<rootDir>/../../packages/adapter-codex/src/renderer/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
