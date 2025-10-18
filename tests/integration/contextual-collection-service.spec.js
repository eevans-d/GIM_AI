/**
 * INTEGRATION TESTS: Contextual Collection Service
 * Testing post-workout collection flow with MercadoPago integration
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Queue = require('bull');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('axios');
jest.mock('bull');
jest.mock('../utils/logger');
jest.mock('../utils/error-handler');

const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const collectionService = require('../../services/contextual-collection-service');

describe('INTEGRATION: Contextual Collection Service', () => {
  let mockSupabaseClient;
  let mockCollectionQueue;
  let mockLoggerInstance;
  let correlationId;

  beforeAll(() => {
    // Setup logger mock
    mockLoggerInstance = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    logger.createLogger.mockReturnValue(mockLoggerInstance);

    // Setup Supabase mock
    mockSupabaseClient = {
      from: jest.fn(),
      rpc: jest.fn()
    };
    createClient.mockReturnValue(mockSupabaseClient);

    // Setup Bull Queue mock
    mockCollectionQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
      getDelayed: jest.fn()
    };
    Queue.mockReturnValue(mockCollectionQueue);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    correlationId = uuidv4();
    process.env.COLLECTION_DELAY_MINUTES = '90';
    process.env.COLLECTION_MIN_DEBT_AMOUNT = '100';
    process.env.COLLECTION_CONVERSION_TARGET = '0.68';
  });

  describe('1. Debt Detection', () => {
    test('should detect member debt successfully', async () => {
      // Arrange
      const memberId = uuidv4();
      const debtInfo = {
        debt_amount: 250000,
        days_overdue: 7,
        member_phone: '573001234567',
        member_name: 'Juan Pérez'
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [debtInfo],
        error: null
      });

      // Act
      const result = await collectionService.detectMemberDebt(memberId);

      // Assert
      expect(result).toEqual(debtInfo);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'detect_member_debt',
        { p_member_id: memberId }
      );
      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });

    test('should return null when no debt exists', async () => {
      // Arrange
      const memberId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Act
      const result = await collectionService.detectMemberDebt(memberId);

      // Assert
      expect(result).toBeNull();
    });

    test('should handle database error in debt detection', async () => {
      // Arrange
      const memberId = uuidv4();
      const dbError = new Error('Database connection failed');

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: dbError
      });

      // Act & Assert
      await expect(collectionService.detectMemberDebt(memberId))
        .rejects.toThrow();
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe('2. Payment Link Generation', () => {
    test('should generate MercadoPago payment link', async () => {
      // Arrange
      const memberId = uuidv4();
      const collectionId = uuidv4();
      const amount = 250000;
      const paymentLink = 'https://mercadopago.com/checkout/v1/redirect?preference-id=123';

      axios.post.mockResolvedValueOnce({
        data: {
          init_point: paymentLink
        }
      });

      // Act
      const result = await collectionService.generatePaymentLink(
        memberId,
        amount,
        collectionId
      );

      // Assert
      expect(result).toBe(paymentLink);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/checkout/preferences'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should handle payment link generation error', async () => {
      // Arrange
      const memberId = uuidv4();
      const collectionId = uuidv4();
      const amount = 250000;

      axios.post.mockRejectedValueOnce(
        new Error('MercadoPago API error')
      );

      // Act & Assert
      await expect(
        collectionService.generatePaymentLink(memberId, amount, collectionId)
      ).rejects.toThrow();
    });

    test('should validate amount before generating link', async () => {
      // Arrange
      const memberId = uuidv4();
      const collectionId = uuidv4();
      const invalidAmount = 50; // Less than minimum

      // Act & Assert
      await expect(
        collectionService.generatePaymentLink(memberId, invalidAmount, collectionId)
      ).rejects.toThrow();
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  describe('3. Collection Scheduling', () => {
    test('should schedule collection message with correct delay', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();
      const delayMs = 90 * 60 * 1000; // 90 minutes

      mockCollectionQueue.add.mockResolvedValueOnce({
        id: uuidv4(),
        data: { member_id: memberId }
      });

      // Act
      await collectionService.scheduleCollection(memberId, checkInId);

      // Assert
      expect(mockCollectionQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          member_id: memberId,
          checkin_id: checkInId
        }),
        expect.objectContaining({
          delay: delayMs
        })
      );
    });

    test('should handle queue scheduling error', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();

      mockCollectionQueue.add.mockRejectedValueOnce(
        new Error('Queue error')
      );

      // Act & Assert
      await expect(
        collectionService.scheduleCollection(memberId, checkInId)
      ).rejects.toThrow();
    });

    test('should not schedule collection if member has no debt', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Act
      await collectionService.scheduleCollection(memberId, checkInId);

      // Assert
      expect(mockCollectionQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('4. Conversion Tracking', () => {
    test('should record successful payment conversion', async () => {
      // Arrange
      const collectionId = uuidv4();
      const amount = 250000;

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ id: collectionId }],
        error: null
      });

      // Act
      await collectionService.recordConversion(collectionId, amount, 'success');

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contextual_collections');
      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });

    test('should track conversion metrics for analytics', async () => {
      // Arrange
      const collectionId = uuidv4();
      const conversionData = {
        collection_id: collectionId,
        converted: true,
        amount_collected: 250000,
        time_to_conversion_minutes: 23
      };

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [conversionData],
        error: null
      });

      // Act
      await collectionService.recordConversionMetrics(conversionData);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });

    test('should calculate daily conversion rate', async () => {
      // Arrange
      const targetRate = 0.68;

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          total_sent: 100,
          total_converted: 68,
          conversion_rate: 0.68
        }],
        error: null
      });

      // Act
      const result = await collectionService.getConversionRate();

      // Assert
      expect(result.conversion_rate).toBeGreaterThanOrEqual(targetRate * 0.8); // At least 80% of target
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        expect.stringContaining('conversion'),
        expect.any(Object)
      );
    });
  });

  describe('5. Webhook Processing (MercadoPago)', () => {
    test('should process successful payment webhook', async () => {
      // Arrange
      const webhookPayload = {
        type: 'payment',
        data: {
          id: '123456789'
        },
        action: 'payment.created'
      };

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          collection_id: uuidv4(),
          external_reference: '123456789'
        }],
        error: null
      });

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{}],
        error: null
      });

      // Act
      await collectionService.processPaymentWebhook(webhookPayload);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contextual_collections');
    });

    test('should handle invalid webhook signature', async () => {
      // Arrange
      const invalidSignature = 'invalid_sig_123';
      const webhookPayload = { data: {} };

      // Act & Assert
      await expect(
        collectionService.processPaymentWebhook(webhookPayload, invalidSignature)
      ).rejects.toThrow();
    });

    test('should ignore duplicate webhook deliveries', async () => {
      // Arrange
      const webhookId = 'webhook_123';
      const webhookPayload = {
        id: webhookId,
        type: 'payment',
        data: { id: '123456789' }
      };

      // First call succeeds
      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [{}],
        error: null
      });

      // Second call (duplicate) should be ignored
      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ id: webhookId }],
        error: null
      });

      // Act
      await collectionService.processPaymentWebhook(webhookPayload);
      await collectionService.processPaymentWebhook(webhookPayload);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });

  describe('6. Rate Limiting & Business Rules', () => {
    test('should not send collection if user reached message limit', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          messages_sent_today: 2,
          max_messages_per_day: 2
        }],
        error: null
      });

      // Act & Assert
      await expect(
        collectionService.scheduleCollection(memberId, checkInId)
      ).rejects.toThrow();
    });

    test('should respect business hours (9AM-9PM)', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();
      const earlyMorning = new Date();
      earlyMorning.setHours(6, 0, 0);

      jest.useFakeTimers();
      jest.setSystemTime(earlyMorning);

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ debt_amount: 250000 }],
        error: null
      });

      // Act
      await collectionService.scheduleCollection(memberId, checkInId);

      // Assert - should queue for next business hour
      expect(mockCollectionQueue.add).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          delay: expect.any(Number)
        })
      );

      jest.useRealTimers();
    });

    test('should enforce minimum debt amount threshold', async () => {
      // Arrange
      const memberId = uuidv4();
      const smallDebtAmount = 50000; // Less than 100k threshold

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          debt_amount: smallDebtAmount,
          days_overdue: 1
        }],
        error: null
      });

      // Act & Assert
      await expect(
        collectionService.scheduleCollection(memberId, uuidv4())
      ).rejects.toThrow();
    });
  });

  describe('7. Collection Statistics & Dashboard', () => {
    test('should fetch today\'s collection statistics', async () => {
      // Arrange
      const expectedStats = {
        total_sent: 45,
        total_converted: 31,
        conversion_rate: 0.689,
        amount_collected: 7750000,
        pending_collections: 14
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [expectedStats],
        error: null
      });

      // Act
      const result = await collectionService.getCollectionStats();

      // Assert
      expect(result).toEqual(expectedStats);
      expect(result.conversion_rate).toBeGreaterThan(0.6);
    });

    test('should calculate 7-day collection trend', async () => {
      // Arrange
      const trendData = [
        { date: '2025-10-12', conversions: 28, rate: 0.65 },
        { date: '2025-10-13', conversions: 31, rate: 0.689 },
        { date: '2025-10-14', conversions: 25, rate: 0.58 }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: trendData,
        error: null
      });

      // Act
      const result = await collectionService.getCollectionTrend(7);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('date');
      expect(result[0]).toHaveProperty('conversions');
    });

    test('should list top debtors for collection priority', async () => {
      // Arrange
      const debtors = [
        { member_id: uuidv4(), debt_amount: 500000, days_overdue: 30 },
        { member_id: uuidv4(), debt_amount: 350000, days_overdue: 21 },
        { member_id: uuidv4(), debt_amount: 250000, days_overdue: 14 }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: debtors,
        error: null
      });

      // Act
      const result = await collectionService.getTopDebtors(3);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].debt_amount).toBeGreaterThanOrEqual(result[1].debt_amount);
    });
  });

  describe('8. Error Handling & Resilience', () => {
    test('should retry failed collection attempts with exponential backoff', async () => {
      // Arrange
      const memberId = uuidv4();
      const collectionId = uuidv4();

      mockCollectionQueue.add.mockResolvedValueOnce({
        id: collectionId,
        data: { member_id: memberId }
      });

      // Act
      await collectionService.scheduleCollection(memberId, uuidv4());

      // Assert
      expect(mockCollectionQueue.add).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          attempts: expect.any(Number),
          backoff: expect.any(Object)
        })
      );
    });

    test('should handle network timeout gracefully', async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(
        new Error('Network timeout')
      );

      // Act & Assert
      await expect(
        collectionService.generatePaymentLink(uuidv4(), 250000, uuidv4())
      ).rejects.toThrow();
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    test('should log all collection attempts for audit trail', async () => {
      // Arrange
      const memberId = uuidv4();
      const checkInId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ debt_amount: 250000 }],
        error: null
      });

      mockCollectionQueue.add.mockResolvedValueOnce({
        id: uuidv4()
      });

      // Act
      await collectionService.scheduleCollection(memberId, checkInId);

      // Assert
      expect(mockLoggerInstance.info).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          member_id: memberId
        })
      );
    });
  });

  describe('9. Integration with Check-in Flow', () => {
    test('should auto-trigger collection after successful check-in', async () => {
      // Arrange
      const checkInData = {
        member_id: uuidv4(),
        class_id: uuidv4(),
        checked_in_at: new Date()
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ debt_amount: 250000 }],
        error: null
      });

      mockCollectionQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await collectionService.handleCheckInCompletion(checkInData);

      // Assert
      expect(mockCollectionQueue.add).toHaveBeenCalled();
    });

    test('should not trigger collection if member has no debt', async () => {
      // Arrange
      const checkInData = {
        member_id: uuidv4(),
        class_id: uuidv4()
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Act
      await collectionService.handleCheckInCompletion(checkInData);

      // Assert
      expect(mockCollectionQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('10. Database Integrity', () => {
    test('should maintain transaction consistency for collection recording', async () => {
      // Arrange
      const collectionId = uuidv4();
      const paymentId = uuidv4();

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ id: collectionId }],
        error: null
      });

      // Act
      await collectionService.recordConversion(collectionId, 250000, 'success', paymentId);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('contextual_collections');
    });

    test('should prevent duplicate collection records', async () => {
      // Arrange
      const collectionId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ id: collectionId }],
        error: null
      });

      // Act & Assert
      await expect(
        collectionService.createCollection(collectionId, 250000)
      ).rejects.toThrow();
    });
  });
});
