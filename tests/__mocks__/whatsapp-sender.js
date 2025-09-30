module.exports = {
  sendTemplate: async () => ({ mocked: true }),
  sendText: async () => ({ mocked: true }),
  sendInteractive: async () => ({ mocked: true }),
  queueMessage: async () => ({ queued: true, jobId: 'mock-job' }),
  isWithinBusinessHours: () => true,
};