const noop = () => {};

// Improved mock with console fallbacks for better debugging
const mockLogger = {
  info: jest.fn((msg, meta) => console.log(`[MOCK INFO] ${msg}`, meta || '')),
  warn: jest.fn((msg, meta) => console.log(`[MOCK WARN] ${msg}`, meta || '')),
  error: jest.fn((msg, meta) => console.log(`[MOCK ERROR] ${msg}`, meta || '')),
  debug: jest.fn((msg, meta) => console.log(`[MOCK DEBUG] ${msg}`, meta || '')),
  log: jest.fn((level, msg, meta) => console.log(`[MOCK ${level}] ${msg}`, meta || '')),
  add: jest.fn(),
  child: jest.fn(() => mockLogger)
};

function createFakeTransport() {
  return {
    log: noop,
  };
}

// Cache the loggers we create so we always return the same logger for the same name
const loggers = {};

module.exports = {
  createLogger: jest.fn((name) => {
    if (!loggers[name]) {
      loggers[name] = { ...mockLogger };
    }
    return loggers[name];
  }),
  createMockLogger: jest.fn(() => ({ ...mockLogger })),
  addColors: noop,
  format: {
    combine: noop,
    timestamp: noop,
    printf: fn => fn,
    json: noop,
    colorize: noop,
    simple: noop,
    errors: () => () => {},
    splat: noop,
    metadata: noop,
  },
  transports: {
    Console: function Console() { return createFakeTransport(); },
    DailyRotateFile: function DailyRotateFile() { return createFakeTransport(); },
  },
};