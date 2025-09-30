const noop = () => {};

function createFakeTransport() {
  return {
    log: noop,
  };
}

module.exports = {
  createLogger: () => ({
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    log: noop,
    add: noop,
    child: () => ({ info: noop, warn: noop, error: noop, debug: noop, log: noop }),
  }),
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