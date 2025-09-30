const isCI = Boolean(process.env.CI);

module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!node_modules/**',
    '!coverage/**',
    '!tests/**',
    '!**/node_modules/**',
  ],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
  ],
  testPathIgnorePatterns: ['/node_modules/'],
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|@so-ric|color|color-string|@dabh|diagnostics)/)'
  ],
  moduleNameMapper: {
    '^winston$': '<rootDir>/tests/__mocks__/winston.js',
    '^winston-daily-rotate-file$': '<rootDir>/tests/__mocks__/winston-daily-rotate-file.js',
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
    '^../../whatsapp/client/sender$': '<rootDir>/tests/__mocks__/whatsapp-sender.js',
    '^../whatsapp/client/sender$': '<rootDir>/tests/__mocks__/whatsapp-sender.js',
    '^whatsapp/client/sender$': '<rootDir>/tests/__mocks__/whatsapp-sender.js',
  },
  coverageThreshold: {
    global: {
      branches: isCI ? 70 : 0,
      functions: isCI ? 70 : 0,
      lines: isCI ? 70 : 0,
      statements: isCI ? 70 : 0,
    },
  },
  verbose: true,
  testTimeout: 10000,
  setupFiles: ['<rootDir>/tests/jest.setup.js'],
};
