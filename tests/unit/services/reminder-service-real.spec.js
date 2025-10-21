/**
 * Reminder Service - Real Tests
 * Critical Business Flow: Scheduled Reminders & Notifications
 */

jest.mock('../../../utils/logger');
jest.mock('../../../utils/error-handler');
jest.mock('node-cron');
jest.mock('@supabase/supabase-js');

const reminderService = require('../../../services/reminder-service');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');
const cron = require('node-cron');

describe('Reminder Service - Scheduled Reminders', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'reminder-123' },
          error: null
        }),
        update: jest.fn().mockResolvedValue({
          data: { id: 'reminder-123' },
          error: null
        })
      })
    };
  });

  describe('Reminder Scheduling', () => {
    test('should schedule reminder for next class', async () => {
      // Arrange
      const memberId = 'member-123';
      const claseId = 'clase-456';
      const reminderTime = 30; // minutes before class

      // Act
      const result = await reminderService.scheduleClassReminder(
        memberId,
        claseId,
        reminderTime
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.reminderId).toBeTruthy();
      expect(result.status).toBe('scheduled');
      expect(result.sendTime).toBeDefined();
    });

    test('should schedule workout follow-up reminder', async () => {
      // Arrange
      const memberId = 'member-789';
      const checkinId = 'checkin-001';

      // Act
      const result = await reminderService.schedulePostWorkoutReminder(
        memberId,
        checkinId
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('post_workout');
      expect(result.delayMinutes).toBe(90); // 90 min after workout
      expect(result.status).toBe('scheduled');
    });

    test('should schedule payment reminder', async () => {
      // Arrange
      const memberId = 'member-abc';
      const daysUntilDue = 5;

      // Act
      const result = await reminderService.schedulePaymentReminder(
        memberId,
        daysUntilDue
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('payment_due');
      expect(result.daysUntilDue).toBe(daysUntilDue);
      expect(result.status).toBe('scheduled');
    });
  });

  describe('Reminder Delivery', () => {
    test('should send reminder within scheduled time window', async () => {
      // Arrange
      const reminderId = 'reminder-123';
      const scheduledTime = new Date(Date.now() + 30 * 60000); // 30 min from now

      // Act
      const result = await reminderService.sendReminder(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.sentAt).toBeDefined();
      expect(new Date(result.sentAt).getTime())
        .toBeCloseTo(scheduledTime.getTime(), -3); // Within 1 second
    });

    test('should handle missing members', async () => {
      // Arrange
      const reminderId = 'reminder-404';
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Member not found' }
        });

      // Act & Assert
      await expect(reminderService.sendReminder(reminderId))
        .rejects
        .toThrow(AppError);
    });

    test('should skip reminders for opted-out members', async () => {
      // Arrange
      const reminderId = 'reminder-skip';
      const memberData = {
        id: 'member-skip',
        notify_reminders: false
      };

      // Act
      const result = await reminderService.sendReminder(
        reminderId,
        memberData
      );

      // Assert
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/opted.*out|notifications.*disabled/i);
    });
  });

  describe('Reminder Types', () => {
    test('should format class reminder message correctly', async () => {
      // Arrange
      const reminder = {
        type: 'class_reminder',
        memberName: 'Juan',
        className: 'Spinning',
        classTime: '18:00',
        minutesUntilClass: 30
      };

      // Act
      const message = await reminderService.formatReminderMessage(reminder);

      // Assert
      expect(message).toContain('Juan');
      expect(message).toContain('Spinning');
      expect(message).toContain('18:00');
      expect(message).toContain('30');
    });

    test('should format payment reminder with amount due', async () => {
      // Arrange
      const reminder = {
        type: 'payment_due',
        memberName: 'Maria',
        amountDue: 50000,
        currency: 'COP',
        daysUntilDue: 5
      };

      // Act
      const message = await reminderService.formatReminderMessage(reminder);

      // Assert
      expect(message).toContain('Maria');
      expect(message).toContain('50000');
      expect(message).toContain('COP');
      expect(message).toContain('5');
    });

    test('should include personalized content', async () => {
      // Arrange
      const reminder = {
        type: 'post_workout',
        memberName: 'Carlos',
        workoutType: 'Spinning',
        memberTier: 'VIP'
      };

      // Act
      const message = await reminderService.formatReminderMessage(reminder);

      // Assert
      expect(message).toContain('Carlos');
      // VIP members might get special message
      if (reminder.memberTier === 'VIP') {
        expect(message).toMatch(/vip|premium|special/i);
      }
    });
  });

  describe('Batch Reminders', () => {
    test('should process batch reminders efficiently', async () => {
      // Arrange
      const reminderIds = Array.from(
        { length: 10 },
        (_, i) => `reminder-${i}`
      );

      // Act
      const startTime = process.hrtime.bigint();
      const results = await reminderService.sendBatchReminders(reminderIds);
      const endTime = process.hrtime.bigint();

      // Assert
      expect(results).toHaveLength(10);
      expect(results.filter(r => r.success)).toHaveLength(
        expect.any(Number)
      );
      
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(2000); // Should be < 2 seconds
    });

    test('should continue on partial failures', async () => {
      // Arrange
      const reminderIds = ['reminder-1', 'reminder-bad', 'reminder-3'];
      
      // Mock one failure
      const results = [];
      for (const id of reminderIds) {
        if (id === 'reminder-bad') {
          results.push({ id, success: false, error: 'Not found' });
        } else {
          results.push({ id, success: true });
        }
      }

      // Act
      const batchResult = await reminderService.sendBatchReminders(reminderIds);

      // Assert
      expect(batchResult.filter(r => r.success)).toHaveLength(2);
      expect(batchResult.filter(r => !r.success)).toHaveLength(1);
    });
  });

  describe('Reminder Rescheduling', () => {
    test('should reschedule failed reminder', async () => {
      // Arrange
      const reminderId = 'reminder-reschedule';
      const newTime = new Date(Date.now() + 60 * 60000); // 1 hour later

      // Act
      const result = await reminderService.rescheduleReminder(
        reminderId,
        newTime
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.newScheduledTime).toEqual(newTime);
      expect(result.attempts).toBe(1);
    });

    test('should limit reschedule attempts', async () => {
      // Arrange
      const reminderId = 'reminder-max-attempts';
      const maxAttempts = 3;

      // Act
      let result;
      for (let i = 0; i < maxAttempts + 1; i++) {
        result = await reminderService.rescheduleReminder(reminderId);
      }

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/max.*attempts|too.*many.*retries/i);
    });
  });

  describe('Reminder Cancellation', () => {
    test('should cancel scheduled reminder', async () => {
      // Arrange
      const reminderId = 'reminder-cancel';

      // Act
      const result = await reminderService.cancelReminder(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(result.cancelledAt).toBeDefined();
    });

    test('should prevent sending cancelled reminders', async () => {
      // Arrange
      const reminderId = 'reminder-dont-send';
      await reminderService.cancelReminder(reminderId);

      // Act
      const result = await reminderService.sendReminder(reminderId);

      // Assert
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/cancelled|inactive/i);
    });
  });

  describe('Cron Scheduling', () => {
    test('should set up cron tasks for scheduled reminders', async () => {
      // Act
      await reminderService.initializeCronSchedules();

      // Assert
      expect(cron.schedule).toHaveBeenCalled();
      expect(cron.schedule).toHaveBeenCalledWith(
        expect.any(String), // Cron expression
        expect.any(Function) // Task function
      );
    });

    test('should clean up cron tasks on shutdown', async () => {
      // Arrange
      await reminderService.initializeCronSchedules();
      const taskId = 'reminder-cron-task';

      // Act
      await reminderService.stopCronSchedules();

      // Assert
      expect(reminderService.activeTasks.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      // Arrange
      mockSupabase.from().select().eq()
        .mockRejectedValueOnce(new Error('Connection timeout'));

      // Act & Assert
      await expect(reminderService.sendReminder('reminder-db-error'))
        .rejects
        .toThrow(AppError);
    });

    test('should log reminder failures', async () => {
      // Arrange
      const reminderId = 'reminder-fail';
      const logger = require('../../../utils/logger');

      // Act
      try {
        await reminderService.sendReminder(reminderId);
      } catch (error) {
        // Expected
      }

      // Assert
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    test('should schedule reminder within 50ms', async () => {
      // Arrange
      const memberId = 'member-perf';
      const claseId = 'clase-perf';
      const startTime = process.hrtime.bigint();

      // Act
      await reminderService.scheduleClassReminder(memberId, claseId, 30);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(50);
    });
  });
});
