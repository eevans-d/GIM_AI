module.exports = {
  displayName: "Integration Tests",
  testMatch: ["<rootDir>/tests/integration/**/*.spec.js"],
  setupFilesAfterEnv: [
    "<rootDir>/tests/integration/jest.setup.integration.js"
  ],
  testEnvironment: "node",
  collectCoverageFrom: [
    "routes/**/*.js",
    "services/**/*.js", 
    "!**/node_modules/**",
    "!**/*.spec.js",
    "!**/*.test.js"
  ],
  coverageReporters: ["text", "lcov", "html"],
  coverageDirectory: "coverage/integration",
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};