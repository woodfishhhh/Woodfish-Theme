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
    '^@woodfish/chatgpt-app$': '<rootDir>/../../apps/chatgpt-app/src/index.ts',
    '^@woodfish/chatgpt-app/renderer$': '<rootDir>/../../apps/chatgpt-app/src/renderer/index.ts',
    '^@woodfish/dsh-web$': '<rootDir>/../../apps/dsh-web/src/index.ts',
    '^@woodfish/effects$': '<rootDir>/../../packages/effects/src/index.ts',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};
