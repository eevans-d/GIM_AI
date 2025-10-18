/**
 * INTEGRATION TESTS: Replacement Service
 * Testing automatic instructor replacement matching, offers, and acceptance flow
 */

const { createClient } = require('@supabase/supabase-js');
const Queue = require('bull');
const { v4: uuidv4 } = require('uuid');

jest.mock('@supabase/supabase-js');
jest.mock('bull');
jest.mock('../utils/logger');
jest.mock('../utils/error-handler');

const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const replacementService = require('../../services/replacement-service');

describe('INTEGRATION: Replacement Service', () => {
  let mockSupabaseClient;
  let mockReplacementQueue;
  let mockLoggerInstance;

  beforeAll(() => {
    mockLoggerInstance = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
    logger.createLogger.mockReturnValue(mockLoggerInstance);

    mockSupabaseClient = {
      from: jest.fn(),
      rpc: jest.fn()
    };
    createClient.mockReturnValue(mockSupabaseClient);

    mockReplacementQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn(),
      remove: jest.fn()
    };
    Queue.mockReturnValue(mockReplacementQueue);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Absence Reporting & NLP Parsing', () => {
    test('should parse absence report with natural language', async () => {
      // Arrange
      const absenceText = 'No puedo ir mañana a las 6pm spinning, problema familiar';
      const classId = uuidv4();
      const instructorId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          class_id: classId,
          class_name: 'Spinning',
          scheduled_time: '2025-10-19T18:00:00Z',
          instructor_id: instructorId
        }],
        error: null
      });

      // Act
      const result = await replacementService.parseAbsenceReport(
        absenceText,
        instructorId
      );

      // Assert
      expect(result).toHaveProperty('class_id');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('notice_hours');
    });

    test('should extract class and time from Spanish text', async () => {
      // Arrange
      const absenceText = 'Spinning mañana 6pm no puedo ir';
      const instructorId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          class_id: uuidv4(),
          class_name: 'Spinning',
          scheduled_time: '2025-10-19T18:00:00Z'
        }],
        error: null
      });

      // Act
      const result = await replacementService.parseAbsenceReport(
        absenceText,
        instructorId
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });

    test('should handle ambiguous absence report', async () => {
      // Arrange
      const ambiguousText = 'not available tomorrow';
      const instructorId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Act & Assert
      await expect(
        replacementService.parseAbsenceReport(ambiguousText, instructorId)
      ).rejects.toThrow();
    });
  });

  describe('2. Candidate Matching Algorithm', () => {
    test('should match replacement candidates with scoring', async () => {
      // Arrange
      const classId = uuidv4();
      const scheduledTime = '2025-10-19T18:00:00Z';
      const classType = 'Spinning';

      const candidates = [
        {
          instructor_id: uuidv4(),
          name: 'Carlos',
          score: 95,
          reasons: [
            'Can teach Spinning (30 pts)',
            'Available at 6pm (25 pts)',
            'High acceptance rate (15 pts)',
            'High rating (15 pts)',
            'Fair rotation (10 pts)'
          ]
        },
        {
          instructor_id: uuidv4(),
          name: 'Rosa',
          score: 78,
          reasons: [
            'Can teach Spinning (30 pts)',
            'Available at 6pm (25 pts)',
            'Medium acceptance rate (10 pts)',
            'Good rating (13 pts)'
          ]
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: candidates,
        error: null
      });

      // Act
      const result = await replacementService.findReplacementCandidates(
        classId,
        classType,
        scheduledTime
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].score).toBeGreaterThan(result[1].score);
      expect(result[0]).toHaveProperty('reasons');
    });

    test('should score based on multiple criteria (100 pts max)', async () => {
      // Arrange
      const candidate = {
        instructor_id: uuidv4(),
        can_teach: true,
        available_at_time: true,
        acceptance_rate: 0.95,
        avg_rating: 4.8,
        recent_replacements_count: 2,
        prefers_replacements: true,
        notice_hours: 18
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          ...candidate,
          score: 95 // (30 + 25 + 15 + 15 + 10 + 5 - 5)
        }],
        error: null
      });

      // Act
      const result = await replacementService.findReplacementCandidates(
        uuidv4(),
        'Spinning',
        new Date()
      );

      // Assert
      expect(result[0].score).toBeLessThanOrEqual(100);
      expect(result[0].score).toBeGreaterThan(0);
    });

    test('should penalize short notice (less than min preference)', async () => {
      // Arrange
      const candidates = [
        {
          instructor_id: uuidv4(),
          score: 70,
          notice_hours: 4, // Very short notice
          min_notice_preference_hours: 24
        }
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: candidates,
        error: null
      });

      // Act
      const result = await replacementService.findReplacementCandidates(
        uuidv4(),
        'Spinning',
        new Date()
      );

      // Assert
      expect(result[0].score).toBeLessThan(80);
    });
  });

  describe('3. Sequential Offer Management', () => {
    test('should send sequential offers with 30-minute expiration', async () => {
      // Arrange
      const replacementId = uuidv4();
      const candidateId = uuidv4();
      const bonus = 1500000; // <24h notice

      mockReplacementQueue.add.mockResolvedValueOnce({
        id: uuidv4(),
        data: { replacement_id: replacementId }
      });

      // Act
      await replacementService.sendOffer(
        replacementId,
        candidateId,
        bonus,
        1 // First offer
      );

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'send_offer',
          replacement_id: replacementId,
          candidate_id: candidateId,
          offer_number: 1
        }),
        expect.any(Object)
      );
    });

    test('should auto-reject expired offers', async () => {
      // Arrange
      const offerId = uuidv4();
      const expirationTime = new Date(Date.now() - 31 * 60 * 1000); // 31 minutes ago

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ id: offerId, status: 'expired' }],
        error: null
      });

      // Act
      await replacementService.expireOffer(offerId);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('replacement_offers');
    });

    test('should send next offer if previous rejected', async () => {
      // Arrange
      const replacementId = uuidv4();
      const rejectedCandidateId = uuidv4();
      const nextCandidateId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ candidate_rank: 1 }],
        error: null
      });

      mockReplacementQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await replacementService.handleOfferRejection(
        replacementId,
        rejectedCandidateId
      );

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'send_offer',
          offer_number: 2
        }),
        expect.any(Object)
      );
    });

    test('should mark replacement as filled when offer accepted', async () => {
      // Arrange
      const replacementId = uuidv4();
      const acceptedCandidateId = uuidv4();

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ id: replacementId, status: 'filled' }],
        error: null
      });

      // Act
      await replacementService.handleOfferAcceptance(
        replacementId,
        acceptedCandidateId
      );

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('replacements');
    });
  });

  describe('4. Bonus Calculation', () => {
    test('should calculate $1500 bonus for <24h notice', async () => {
      // Arrange
      const noticeHours = 12;

      // Act
      const bonus = replacementService.calculateBonus(noticeHours);

      // Assert
      expect(bonus).toBe(1500000); // 1.5M pesos
    });

    test('should calculate $1000 bonus for 24-48h notice', async () => {
      // Arrange
      const noticeHours = 36;

      // Act
      const bonus = replacementService.calculateBonus(noticeHours);

      // Assert
      expect(bonus).toBe(1000000);
    });

    test('should calculate $500 bonus for >48h notice', async () => {
      // Arrange
      const noticeHours = 72;

      // Act
      const bonus = replacementService.calculateBonus(noticeHours);

      // Assert
      expect(bonus).toBe(500000);
    });

    test('should include bonus in offer payload', async () => {
      // Arrange
      const replacementId = uuidv4();
      const candidateId = uuidv4();
      const noticeHours = 18;
      const expectedBonus = 1500000;

      mockReplacementQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await replacementService.sendOffer(
        replacementId,
        candidateId,
        expectedBonus,
        1
      );

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          bonus_amount: expectedBonus
        }),
        expect.any(Object)
      );
    });
  });

  describe('5. Notification Management', () => {
    test('should notify all eligible candidates', async () => {
      // Arrange
      const replacementId = uuidv4();
      const candidates = [
        { instructor_id: uuidv4(), name: 'Carlos' },
        { instructor_id: uuidv4(), name: 'Rosa' },
        { instructor_id: uuidv4(), name: 'Miguel' }
      ];

      mockReplacementQueue.add.mockResolvedValue({ id: uuidv4() });

      // Act
      await replacementService.notifyCandidates(replacementId, candidates);

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledTimes(candidates.length);
    });

    test('should notify original instructor of replacement', async () => {
      // Arrange
      const replacementId = uuidv4();
      const originalInstructorId = uuidv4();
      const replacementInstructorId = uuidv4();

      mockReplacementQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await replacementService.notifyOriginalInstructor(
        replacementId,
        originalInstructorId,
        replacementInstructorId
      );

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notify_original_instructor'
        }),
        expect.any(Object)
      );
    });

    test('should notify students of instructor change', async () => {
      // Arrange
      const replacementId = uuidv4();
      const classId = uuidv4();
      const registeredStudents = [uuidv4(), uuidv4(), uuidv4()];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: registeredStudents.map(id => ({ member_id: id })),
        error: null
      });

      mockReplacementQueue.add.mockResolvedValue({ id: uuidv4() });

      // Act
      await replacementService.notifyStudents(replacementId, classId);

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledTimes(
        registeredStudents.length
      );
    });
  });

  describe('6. Instructor Availability Management', () => {
    test('should set recurring availability for instructor', async () => {
      // Arrange
      const instructorId = uuidv4();
      const availability = {
        monday: { start: '08:00', end: '20:00', available: true },
        tuesday: { start: '08:00', end: '20:00', available: true },
        wednesday: { start: '08:00', end: '20:00', available: false },
        thursday: { start: '10:00', end: '20:00', available: true },
        friday: { start: '08:00', end: '20:00', available: true },
        saturday: { start: '09:00', end: '18:00', available: true },
        sunday: { start: null, end: null, available: false }
      };

      mockSupabaseClient.from().upsert.mockResolvedValueOnce({
        data: [{ instructor_id: instructorId, ...availability }],
        error: null
      });

      // Act
      await replacementService.setRecurringAvailability(instructorId, availability);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('instructor_availability');
    });

    test('should get instructor availability for specific day', async () => {
      // Arrange
      const instructorId = uuidv4();
      const dayOfWeek = 'monday';

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          day_of_week: dayOfWeek,
          available: true,
          start_time: '08:00',
          end_time: '20:00'
        }],
        error: null
      });

      // Act
      const result = await replacementService.getAvailabilityForDay(
        instructorId,
        dayOfWeek
      );

      // Assert
      expect(result.available).toBe(true);
      expect(result.start_time).toBe('08:00');
    });

    test('should check if instructor is available at specific time', async () => {
      // Arrange
      const instructorId = uuidv4();
      const checkTime = '18:00';
      const dayOfWeek = 'monday';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ is_available: true }],
        error: null
      });

      // Act
      const result = await replacementService.isAvailableAtTime(
        instructorId,
        checkTime,
        dayOfWeek
      );

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('7. Metrics & Dashboard', () => {
    test('should calculate instructor replacement statistics', async () => {
      // Arrange
      const instructorId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          total_offers_received: 15,
          total_accepted: 12,
          acceptance_rate: 0.80,
          total_bonus_earned: 13500000,
          avg_time_to_fill_minutes: 45,
          rating: 4.7
        }],
        error: null
      });

      // Act
      const result = await replacementService.getInstructorStats(instructorId);

      // Assert
      expect(result.acceptance_rate).toBeGreaterThan(0.75);
      expect(result.acceptance_rate).toBeLessThanOrEqual(1.0);
      expect(result.total_bonus_earned).toBeGreaterThan(10000000);
    });

    test('should provide global replacement metrics', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          total_replacements_filled: 125,
          total_replacements_pending: 3,
          success_rate: 0.977,
          avg_time_to_fill_minutes: 42,
          total_bonus_paid: 142500000,
          top_instructor_acceptance: 0.95
        }],
        error: null
      });

      // Act
      const result = await replacementService.getGlobalMetrics();

      // Assert
      expect(result.success_rate).toBeGreaterThan(0.95);
      expect(result.total_replacements_filled).toBeGreaterThan(100);
    });

    test('should list active and urgent replacements', async () => {
      // Arrange
      const replacements = [
        {
          id: uuidv4(),
          class_name: 'Spinning',
          scheduled_time: new Date(),
          status: 'urgent',
          pending_since_minutes: 15
        },
        {
          id: uuidv4(),
          class_name: 'Yoga',
          scheduled_time: new Date(Date.now() + 3600000),
          status: 'active',
          pending_since_minutes: 45
        }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: replacements,
        error: null
      });

      // Act
      const result = await replacementService.getActiveReplacements();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('urgent');
    });
  });

  describe('8. Error Handling & Resilience', () => {
    test('should handle candidate search errors', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockRejectedValueOnce(
        new Error('Database error')
      );

      // Act & Assert
      await expect(
        replacementService.findReplacementCandidates(uuidv4(), 'Spinning', new Date())
      ).rejects.toThrow();
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    test('should retry queue operations on failure', async () => {
      // Arrange
      mockReplacementQueue.add
        .mockRejectedValueOnce(new Error('Queue error'))
        .mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await replacementService.sendOffer(
        uuidv4(),
        uuidv4(),
        1500000,
        1,
        { retryCount: 2 }
      );

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledTimes(2);
    });

    test('should escalate unresolved replacements to admin', async () => {
      // Arrange
      const unfilledReplacements = 3;
      const oldestPendingMinutes = 120;

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: Array(unfilledReplacements).fill({
          id: uuidv4(),
          pending_since_minutes: oldestPendingMinutes
        }),
        error: null
      });

      mockReplacementQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await replacementService.escalateUnfilled();

      // Assert
      expect(mockReplacementQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notify_admin_unfilled'
        }),
        expect.any(Object)
      );
    });
  });

  describe('9. Database Integrity', () => {
    test('should prevent duplicate replacement records', async () => {
      // Arrange
      const classId = uuidv4();
      const existingReplacement = { id: uuidv4(), class_id: classId };

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [existingReplacement],
        error: null
      });

      // Act & Assert
      await expect(
        replacementService.createReplacement(classId)
      ).rejects.toThrow();
    });

    test('should maintain referential integrity for offer transactions', async () => {
      // Arrange
      const replacementId = uuidv4();
      const candidateId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ id: replacementId }],
        error: null
      });

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [{ replacement_id: replacementId, candidate_id: candidateId }],
        error: null
      });

      // Act
      await replacementService.recordOfferTransaction(replacementId, candidateId);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('replacement_offers');
    });
  });

  describe('10. Audit Trail & Compliance', () => {
    test('should log all replacement workflow steps', async () => {
      // Arrange
      const replacementId = uuidv4();
      const steps = [
        'absence_reported',
        'candidates_searched',
        'offers_sent',
        'offer_accepted'
      ];

      // Act
      for (const step of steps) {
        await replacementService.logAuditTrail(replacementId, step);
      }

      // Assert
      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });

    test('should provide complete audit history for replacement', async () => {
      // Arrange
      const replacementId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [
          { timestamp: new Date(), action: 'absence_reported', details: {} },
          { timestamp: new Date(), action: 'candidates_searched', details: { count: 12 } },
          { timestamp: new Date(), action: 'offer_accepted', details: { candidate_name: 'Carlos' } }
        ],
        error: null
      });

      // Act
      const result = await replacementService.getAuditTrail(replacementId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('action');
      expect(result[0]).toHaveProperty('timestamp');
    });
  });
});
