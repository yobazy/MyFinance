module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!server.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 10000,
  // Improved test output configuration
  verbose: true,
  // Better error reporting
  errorOnDeprecated: true,
  // Show individual test results
  testResultsProcessor: undefined,
  // Better stack traces
  // stackTraceLimit: 10, // This option doesn't exist in Jest
  // Show test names in output
  displayName: {
    name: 'MyFinance Backend Tests',
    color: 'blue'
  }
};
