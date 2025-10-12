module.exports = {
  displayName: "Security Tests",
  testMatch: ["<rootDir>/tests/security/**/*.spec.js"],
  setupFilesAfterEnv: [
    "<rootDir>/tests/security/jest.setup.security.js"
  ],
  testEnvironment: "node",
  collectCoverageFrom: [
    "security/**/*.js",
    "routes/**/*.js",
    "services/**/*.js",
    "!**/node_modules/**",
    "!**/*.spec.js",
    "!**/*.test.js"
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage/security",
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  // Security tests may need longer timeouts for crypto operations
  testTimeout: 10000,
  // Mock timers for rate limiting tests
  fakeTimers: {
    enableGlobally: false
  }
};
