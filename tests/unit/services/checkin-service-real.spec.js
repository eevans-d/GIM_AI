/**
 * Checkin Service - Real Tests
 * Critical Business Flow: Member Check-in & Validation
 */

jest.mock('../../../utils/logger');
jest.mock('../../../utils/error-handler');
jest.mock('@supabase/supabase-js');

const checkinService = require('../../../services/checkin-service');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');

describe('Checkin Service - Member Check-in Flow', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'member-123', estado: 'active' }],
            error: null
          }),
          single: jest.fn().mockResolvedValue({
            data: { id: 'member-123' },
            error: null
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'checkin-001' },
          error: null
        })
      })
    };
  });

  describe('Basic Check-in', () => {
    test('should record successful member check-in', async () => {
      // Arrange
      const memberId = 'member-123';
      const claseId = 'clase-456';

      // Act
      const result = await checkinService.recordCheckin(memberId, claseId);

      // Assert
      expect(result).toBeDefined();
      expect(result.checkinId).toBeTruthy();
      expect(result.memberId).toBe(memberId);
      expect(result.claseId).toBe(claseId);
      expect(result.timestamp).toBeDefined();
      expect(result.status).toBe('success');
    });

    test('should validate member exists before check-in', async () => {
      // Arrange
      const nonExistentMemberId = 'member-999';
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: [],
          error: null
        });

      // Act & Assert
      await expect(checkinService.recordCheckin(nonExistentMemberId, 'clase-456'))
        .rejects
        .toThrow(/member.*not.*found|inactive/i);
    });

    test('should prevent duplicate check-ins within 5 minutes', async () => {
      // Arrange
      const memberId = 'member-123';
      const claseId = 'clase-456';

      // Act
      const checkin1 = await checkinService.recordCheckin(memberId, claseId);
      const checkin2 = await checkinService.recordCheckin(memberId, claseId);

      // Assert
      expect(checkin1.status).toBe('success');
      expect(checkin2.duplicate).toBe(true);
      expect(checkin2.originalCheckinId).toBe(checkin1.checkinId);
    });

    test('should handle suspended members', async () => {
      // Arrange
      const suspendedMemberId = 'member-suspended';
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: [{ id: suspendedMemberId, estado: 'suspended' }],
          error: null
        });

      // Act & Assert
      await expect(checkinService.recordCheckin(suspendedMemberId, 'clase-456'))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('Attendance Validation', () => {
    test('should calculate class occupancy', async () => {
      // Arrange
      const claseId = 'clase-456';
      const maxCapacity = 20;

      // Act
      const occupancy = await checkinService.getClassOccupancy(claseId);

      // Assert
      expect(occupancy).toBeDefined();
      expect(occupancy.current).toBeGreaterThanOrEqual(0);
      expect(occupancy.maximum).toBe(maxCapacity);
      expect(occupancy.percentage).toBeLessThanOrEqual(100);
    });

    test('should prevent check-in if class at capacity', async () => {
      // Arrange
      const claseId = 'full-class';
      const memberId = 'member-new';
      
      // Mock class at capacity
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: { capacidad_maxima: 20, checkins_count: 20 },
          error: null
        });

      // Act & Assert
      await expect(checkinService.recordCheckin(memberId, claseId))
        .rejects
        .toThrow(/class.*full|capacity.*reached|sold.*out/i);
    });

    test('should track attendance history', async () => {
      // Arrange
      const memberId = 'member-123';
      const months = 3;

      // Act
      const history = await checkinService.getMemberAttendanceHistory(
        memberId,
        months
      );

      // Assert
      expect(Array.isArray(history)).toBe(true);
      history.forEach(record => {
        expect(record).toHaveProperty('date');
        expect(record).toHaveProperty('classType');
        expect(record).toHaveProperty('attended');
      });
    });
  });

  describe('Late Arrivals', () => {
    test('should record late arrival for class already started', async () => {
      // Arrange
      const memberId = 'member-late';
      const claseId = 'clase-running';
      const classStartTime = new Date(Date.now() - 15 * 60000); // Started 15 min ago

      // Act
      const result = await checkinService.recordLateCheckin(
        memberId,
        claseId,
        classStartTime
      );

      // Assert
      expect(result.status).toBe('success');
      expect(result.lateArrival).toBe(true);
      expect(result.minutesLate).toBe(15);
    });

    test('should not charge for very late check-ins', async () => {
      // Arrange
      const memberId = 'member-very-late';
      const claseId = 'clase-ending';
      const classStartTime = new Date(Date.now() - 55 * 60000); // Started 55 min ago
      const classDuration = 60; // 60 minute class

      // Act
      const result = await checkinService.recordLateCheckin(
        memberId,
        claseId,
        classStartTime,
        classDuration
      );

      // Assert
      expect(result.status).toBe('rejected');
      expect(result.reason).toMatch(/too.*late|class.*ending|checkin.*window.*closed/i);
    });
  });

  describe('Check-out & Duration', () => {
    test('should record check-out and calculate duration', async () => {
      // Arrange
      const checkinId = 'checkin-001';
      const durationMinutes = 45;

      // Act
      const result = await checkinService.recordCheckout(
        checkinId,
        durationMinutes
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.duration).toBe(durationMinutes);
      expect(result.checkoutTime).toBeDefined();
    });

    test('should detect suspicious checkout durations', async () => {
      // Arrange
      const checkinId = 'checkin-suspicious';
      const durationMinutes = 3; // Too short

      // Act
      const result = await checkinService.recordCheckout(
        checkinId,
        durationMinutes
      );

      // Assert
      expect(result.warning).toBe(true);
      expect(result.reason).toMatch(/very.*short|suspicious|verification/i);
    });
  });

  describe('Contextual Collection', () => {
    test('should trigger post-workout collection survey', async () => {
      // Arrange
      const checkinId = 'checkin-001';
      const memberId = 'member-123';

      // Act
      const result = await checkinService.triggerPostWorkoutCollection(
        memberId,
        checkinId
      );

      // Assert
      expect(result.triggered).toBe(true);
      expect(result.collectionId).toBeTruthy();
      expect(result.scheduledFor).toBeDefined();
      expect(result.delayMinutes).toBe(90);
    });

    test('should skip collection for opted-out members', async () => {
      // Arrange
      const memberId = 'member-no-surveys';
      const checkinId = 'checkin-001';
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: [{ id: memberId, allow_surveys: false }],
          error: null
        });

      // Act
      const result = await checkinService.triggerPostWorkoutCollection(
        memberId,
        checkinId
      );

      // Assert
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/opted.*out|surveys.*disabled/i);
    });
  });

  describe('Batch Check-ins', () => {
    test('should process batch check-ins', async () => {
      // Arrange
      const checkins = [
        { memberId: 'member-1', claseId: 'clase-456' },
        { memberId: 'member-2', claseId: 'clase-456' },
        { memberId: 'member-3', claseId: 'clase-456' }
      ];

      // Act
      const results = await checkinService.recordBatchCheckins(checkins);

      // Assert
      expect(results).toHaveLength(3);
      expect(results.filter(r => r.success)).toHaveLength(
        expect.any(Number)
      );
    });

    test('should continue on partial batch failures', async () => {
      // Arrange
      const checkins = [
        { memberId: 'member-1', claseId: 'clase-456' },
        { memberId: 'invalid-id', claseId: 'clase-456' },
        { memberId: 'member-3', claseId: 'clase-456' }
      ];

      // Act
      const results = await checkinService.recordBatchCheckins(checkins);

      // Assert
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      expect(successful.length + failed.length).toBe(3);
      expect(successful.length).toBeGreaterThan(0);
      expect(failed.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics & Analytics', () => {
    test('should calculate daily attendance stats', async () => {
      // Arrange
      const date = new Date().toISOString().split('T')[0];

      // Act
      const stats = await checkinService.getDailyStats(date);

      // Assert
      expect(stats).toEqual(
        expect.objectContaining({
          date,
          totalCheckins: expect.any(Number),
          uniqueMembers: expect.any(Number),
          totalClasses: expect.any(Number),
          avgAttendance: expect.any(Number)
        })
      );
    });

    test('should generate weekly attendance report', async () => {
      // Arrange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      // Act
      const report = await checkinService.getWeeklyReport(startDate);

      // Assert
      expect(report).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.dailyBreakdown).toHaveLength(7);
      expect(report.summary).toHaveProperty('totalCheckins');
      expect(report.summary).toHaveProperty('avgDailyAttendance');
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Arrange
      mockSupabase.from().select().eq()
        .mockRejectedValueOnce(new Error('Database connection failed'));

      // Act & Assert
      await expect(checkinService.recordCheckin('member-123', 'clase-456'))
        .rejects
        .toThrow(AppError);
    });

    test('should validate input data', async () => {
      // Arrange
      const invalidMemberId = null;

      // Act & Assert
      await expect(checkinService.recordCheckin(invalidMemberId, 'clase-456'))
        .rejects
        .toThrow(/invalid|required|member.*id/i);
    });
  });

  describe('Performance', () => {
    test('should record check-in within 100ms', async () => {
      // Arrange
      const memberId = 'member-perf';
      const claseId = 'clase-perf';
      const startTime = process.hrtime.bigint();

      // Act
      await checkinService.recordCheckin(memberId, claseId);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(100);
    });

    test('should batch process 100 check-ins in < 2 seconds', async () => {
      // Arrange
      const checkins = Array.from({ length: 100 }, (_, i) => ({
        memberId: `member-${i}`,
        claseId: 'clase-batch'
      }));
      const startTime = process.hrtime.bigint();

      // Act
      await checkinService.recordBatchCheckins(checkins);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(2000);
    });
  });
});
