/**
 * WhatsApp Sender - Real Tests
 * Critical Business Flow: Message Queue & Rate Limiting
 */

jest.mock('../../../utils/logger');
jest.mock('../../../utils/error-handler');
jest.mock('bull');
jest.mock('ioredis');

const whatsappSender = require('../../../whatsapp/client/sender');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');
const Bull = require('bull');

describe('WhatsApp Sender - Message Queue Tests', () => {
  let mockQueue;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      process: jest.fn(),
      on: jest.fn()
    };
    Bull.mockReturnValue(mockQueue);
  });

  describe('Queue Message Sending', () => {
    test('should queue message for sending', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'Test message';

      // Act
      const result = await whatsappSender.queueMessage(phone, message);

      // Assert
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          phone,
          message,
          status: 'pending'
        })
      );
      expect(result).toHaveProperty('jobId');
    });

    test('should respect rate limiting (2 msgs/day per user)', async () => {
      // Arrange
      const phone = '573001234567';
      const message1 = 'Message 1';
      const message2 = 'Message 2';
      const message3 = 'Message 3'; // Should be rejected

      // Act
      const result1 = await whatsappSender.queueMessage(phone, message1);
      const result2 = await whatsappSender.queueMessage(phone, message2);
      const result3 = await whatsappSender.queueMessage(phone, message3);

      // Assert
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(false);
      expect(result3.error).toMatch(/rate limit|max.*messages/i);
    });

    test('should enforce business hours (9-21h)', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'After hours message';
      
      // Mock time to 3 AM
      const mockDate = new Date('2025-10-21T03:00:00Z');
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      // Act
      const result = await whatsappSender.queueMessage(phone, message, { 
        force: false 
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.queued).toBe(true); // Should be queued for later
      expect(result.willSendAt).toBeDefined();

      jest.useRealTimers();
    });

    test('should allow force sending outside business hours', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'Urgent message';

      // Act
      const result = await whatsappSender.queueMessage(phone, message, { 
        force: true 
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });

  describe('Template Message Sending', () => {
    test('should send template message with variables', async () => {
      // Arrange
      const phone = '573001234567';
      const templateName = 'checkin_confirmation';
      const variables = {
        member_name: 'Juan',
        class_name: 'Spinning',
        language: 'es'
      };

      // Act
      const result = await whatsappSender.sendTemplate(
        phone,
        templateName,
        variables
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'template',
          template: templateName,
          variables
        })
      );
    });

    test('should validate template exists', async () => {
      // Arrange
      const phone = '573001234567';
      const invalidTemplate = 'non_existent_template';

      // Act & Assert
      await expect(whatsappSender.sendTemplate(
        phone,
        invalidTemplate,
        {}
      )).rejects.toThrow(AppError);
    });

    test('should require all template variables', async () => {
      // Arrange
      const phone = '573001234567';
      const templateName = 'checkin_confirmation';
      const incompleteVariables = {
        member_name: 'Juan'
        // missing class_name
      };

      // Act & Assert
      await expect(whatsappSender.sendTemplate(
        phone,
        templateName,
        incompleteVariables
      )).rejects.toThrow(/missing.*variable|incomplete/i);
    });
  });

  describe('Message Retry Logic', () => {
    test('should retry failed messages', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'Retry test message';
      const maxRetries = 3;

      // Act
      const result = await whatsappSender.queueMessage(phone, message, {
        maxRetries
      });

      // Assert
      expect(result.retryConfig).toEqual(
        expect.objectContaining({
          attempts: maxRetries,
          backoff: expect.objectContaining({
            type: 'exponential'
          })
        })
      );
    });

    test('should not retry validation errors', async () => {
      // Arrange
      const invalidPhone = 'not-a-phone';
      const message = 'Test message';

      // Act & Assert
      await expect(whatsappSender.queueMessage(invalidPhone, message))
        .rejects
        .toThrow(/invalid.*phone|phone.*format/i);
    });
  });

  describe('Message Status Tracking', () => {
    test('should track message delivery status', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'Status tracking test';

      // Act
      const result = await whatsappSender.queueMessage(phone, message);

      // Assert
      expect(result).toHaveProperty('jobId');
      expect(result).toHaveProperty('status');
      expect(['pending', 'sent', 'failed']).toContain(result.status);
    });

    test('should retrieve message history', async () => {
      // Arrange
      const phone = '573001234567';

      // Act
      const history = await whatsappSender.getMessageHistory(phone);

      // Assert
      expect(Array.isArray(history)).toBe(true);
      history.forEach(msg => {
        expect(msg).toHaveProperty('timestamp');
        expect(msg).toHaveProperty('status');
        expect(msg).toHaveProperty('message');
      });
    });

    test('should calculate remaining messages today', async () => {
      // Arrange
      const phone = '573001234567';

      // Act
      const remaining = await whatsappSender.getRemainingMessages(phone);

      // Assert
      expect(typeof remaining).toBe('number');
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(2); // Max 2 per day
    });
  });

  describe('Error Handling', () => {
    test('should validate phone number format', async () => {
      // Arrange
      const invalidPhone = '123'; // Too short
      const message = 'Test message';

      // Act & Assert
      await expect(whatsappSender.queueMessage(invalidPhone, message))
        .rejects
        .toThrow(AppError);
    });

    test('should handle WhatsApp API errors gracefully', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'API error test';
      mockQueue.add.mockRejectedValueOnce(
        new Error('WhatsApp API: Connection timeout')
      );

      // Act & Assert
      await expect(whatsappSender.queueMessage(phone, message))
        .rejects
        .toThrow();
    });

    test('should maintain queue integrity on error', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'Integrity test';

      // Act
      try {
        await whatsappSender.queueMessage(phone, message);
      } catch (error) {
        // Expected error
      }

      // Assert - Queue should still be functional
      const result = await whatsappSender.queueMessage(phone, 'Recovery message');
      expect(result).toBeDefined();
    });
  });

  describe('Circuit Breaker', () => {
    test('should open circuit after repeated failures', async () => {
      // Arrange
      mockQueue.add.mockRejectedValue(new Error('Service unavailable'));
      const phone = '573001234567';
      const failureThreshold = 5;

      // Act - Trigger multiple failures
      for (let i = 0; i < failureThreshold; i++) {
        try {
          await whatsappSender.queueMessage(phone, 'Test message');
        } catch (error) {
          // Expected
        }
      }

      // Assert - Next call should be rejected immediately (circuit open)
      const circuitOpenResult = await whatsappSender.queueMessage(
        phone,
        'Test message'
      );
      expect(circuitOpenResult.circuitOpen).toBe(true);
    });

    test('should recover after circuit timeout', async () => {
      // Arrange
      jest.useFakeTimers();
      mockQueue.add.mockRejectedValue(new Error('Service unavailable'));

      // Act
      for (let i = 0; i < 5; i++) {
        try {
          await whatsappSender.queueMessage('573001234567', 'Test');
        } catch (error) {
          // Expected
        }
      }

      // Advance time past circuit timeout (60 seconds)
      jest.advanceTimersByTime(61000);

      // Mock recovery
      mockQueue.add.mockResolvedValue({ id: 'job-recovery' });

      // Assert - Circuit should try again
      const recovery = await whatsappSender.queueMessage('573001234567', 'Recovery');
      expect(recovery.success).toBe(true);

      jest.useRealTimers();
    });
  });

  describe('Performance', () => {
    test('should queue message within 50ms', async () => {
      // Arrange
      const phone = '573001234567';
      const message = 'Perf test';
      const startTime = process.hrtime.bigint();

      // Act
      await whatsappSender.queueMessage(phone, message);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(50);
    });
  });
});
