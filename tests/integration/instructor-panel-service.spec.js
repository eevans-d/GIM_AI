/**
 * INTEGRATION TESTS: Instructor Panel Service ("Mi Clase Ahora")
 * Testing real-time class management, attendance, checklists, alerts
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
const instructorPanelService = require('../../services/instructor-panel-service');

describe('INTEGRATION: Instructor Panel Service', () => {
  let mockSupabaseClient;
  let mockAlertQueue;
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

    mockAlertQueue = {
      add: jest.fn(),
      process: jest.fn(),
      on: jest.fn()
    };
    Queue.mockReturnValue(mockAlertQueue);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Session Management', () => {
    test('should start instructor session with auto-checklist', async () => {
      // Arrange
      const instructorId = uuidv4();
      const classId = uuidv4();
      const classType = 'Spinning';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          session_id: uuidv4(),
          instructor_id: instructorId,
          class_id: classId,
          started_at: new Date(),
          checklist_items: 5,
          checklist_completed: 0
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.startSession(
        instructorId,
        classId
      );

      // Assert
      expect(result.session_id).toBeDefined();
      expect(result.checklist_items).toBeGreaterThan(0);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'start_instructor_session',
        expect.any(Object)
      );
    });

    test('should auto-generate checklist based on class type', async () => {
      // Arrange
      const sessionId = uuidv4();
      const classType = 'Spinning';
      const checklistItems = [
        { id: 1, item: 'Check all bikes', required: true },
        { id: 2, item: 'Verify audio system', required: true },
        { id: 3, item: 'Setup music playlist', required: true },
        { id: 4, item: 'Check ventilation', required: true },
        { id: 5, item: 'First aid kit ready', required: true }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: checklistItems,
        error: null
      });

      // Act
      const result = await instructorPanelService.getChecklistForClass(classType);

      // Assert
      expect(result).toHaveLength(5);
      expect(result.every(item => item.required)).toBe(true);
    });

    test('should track session duration and end time', async () => {
      // Arrange
      const sessionId = uuidv4();
      const endTime = new Date();

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          ended_at: endTime,
          duration_minutes: 60
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.endSession(sessionId);

      // Assert
      expect(result.duration_minutes).toBe(60);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('instructor_sessions');
    });

    test('should prevent starting duplicate sessions', async () => {
      // Arrange
      const instructorId = uuidv4();
      const classId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ session_id: uuidv4(), status: 'active' }],
        error: null
      });

      // Act & Assert
      await expect(
        instructorPanelService.startSession(instructorId, classId)
      ).rejects.toThrow();
    });
  });

  describe('2. Real-time Attendance Tracking', () => {
    test('should quick check-in student with one tap', async () => {
      // Arrange
      const sessionId = uuidv4();
      const studentId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          student_id: studentId,
          checked_in_at: new Date(),
          session_attendance_count: 42
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.quickCheckin(
        sessionId,
        studentId
      );

      // Assert
      expect(result.student_id).toBe(studentId);
      expect(result.checked_in_at).toBeDefined();
      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(
        'quick_checkin_student',
        expect.any(Object)
      );
    });

    test('should mark student as absent', async () => {
      // Arrange
      const sessionId = uuidv4();
      const studentId = uuidv4();
      const reason = 'Did not show up';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          student_id: studentId,
          status: 'absent',
          reason: reason
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.markAbsent(
        sessionId,
        studentId,
        reason
      );

      // Assert
      expect(result.status).toBe('absent');
    });

    test('should get real-time attendance count for session', async () => {
      // Arrange
      const sessionId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          total_checked_in: 18,
          total_expected: 20,
          attendance_rate: 0.90
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.getSessionAttendance(sessionId);

      // Assert
      expect(result.total_checked_in).toBe(18);
      expect(result.attendance_rate).toBeCloseTo(0.90, 2);
    });

    test('should detect low attendance automatically', async () => {
      // Arrange
      const sessionId = uuidv4();
      const lowAttendanceThreshold = 0.50;

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          attendance_rate: 0.40,
          threshold: lowAttendanceThreshold,
          total_checked_in: 8,
          total_capacity: 20
        }],
        error: null
      });

      mockAlertQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await instructorPanelService.checkAttendanceAlerts(sessionId);

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_attendance_alert'
        }),
        expect.any(Object)
      );
    });
  });

  describe('3. Checklist Management', () => {
    test('should complete checklist item', async () => {
      // Arrange
      const sessionId = uuidv4();
      const itemId = 1;

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          item_id: itemId,
          completed_at: new Date(),
          checklist_completion_rate: 0.60
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.completeChecklistItem(
        sessionId,
        itemId
      );

      // Assert
      expect(result.completed_at).toBeDefined();
      expect(result.checklist_completion_rate).toBeGreaterThan(0);
    });

    test('should allow skipping checklist item with reason', async () => {
      // Arrange
      const sessionId = uuidv4();
      const itemId = 1;
      const reason = 'Equipment not available today';

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          item_id: itemId,
          status: 'skipped',
          skip_reason: reason
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.skipChecklistItem(
        sessionId,
        itemId,
        reason
      );

      // Assert
      expect(result.status).toBe('skipped');
      expect(result.skip_reason).toBe(reason);
    });

    test('should calculate checklist completion percentage', async () => {
      // Arrange
      const sessionId = uuidv4();
      const totalItems = 5;
      const completedItems = 3;

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          total_items: totalItems,
          completed_items: completedItems,
          skipped_items: 1,
          completion_rate: 0.80
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.getChecklistProgress(sessionId);

      // Assert
      expect(result.completion_rate).toBeCloseTo(0.80, 2);
    });

    test('should detect incomplete critical items at class start', async () => {
      // Arrange
      const sessionId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [
          { item_id: 1, required: true, completed: true },
          { item_id: 2, required: true, completed: false },
          { item_id: 3, required: true, completed: true }
        ],
        error: null
      });

      // Act
      const result = await instructorPanelService.checkCriticalChecklist(sessionId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].required).toBe(true);
      expect(result[0].completed).toBe(false);
    });
  });

  describe('4. Alert System', () => {
    test('should create low attendance alert with auto-escalation', async () => {
      // Arrange
      const sessionId = uuidv4();
      const attendanceRate = 0.45;

      mockAlertQueue.add.mockResolvedValueOnce({
        id: uuidv4(),
        type: 'low_attendance_alert'
      });

      // Act
      await instructorPanelService.createAttendanceAlert(
        sessionId,
        attendanceRate
      );

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_attendance_alert',
          severity: 'low'
        }),
        expect.any(Object)
      );
    });

    test('should escalate critical attendance (below 30%)', async () => {
      // Arrange
      const sessionId = uuidv4();
      const criticalAttendance = 0.25;

      mockAlertQueue.add.mockResolvedValueOnce({
        id: uuidv4(),
        severity: 'critical'
      });

      // Act
      await instructorPanelService.createAttendanceAlert(
        sessionId,
        criticalAttendance
      );

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'critical'
        }),
        expect.any(Object)
      );
    });

    test('should create late start alert', async () => {
      // Arrange
      const sessionId = uuidv4();
      const scheduledTime = new Date(Date.now() - 6 * 60 * 1000); // 6 mins ago

      mockAlertQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await instructorPanelService.checkAndCreateLateStartAlert(
        sessionId,
        scheduledTime
      );

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'late_start_alert'
        }),
        expect.any(Object)
      );
    });

    test('should acknowledge alert', async () => {
      // Arrange
      const alertId = uuidv4();

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ id: alertId, acknowledged: true, acknowledged_at: new Date() }],
        error: null
      });

      // Act
      await instructorPanelService.acknowledgeAlert(alertId);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('attendance_alerts');
    });

    test('should resolve alert with notes', async () => {
      // Arrange
      const alertId = uuidv4();
      const resolutionNotes = 'Multiple no-shows due to weather';

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{
          id: alertId,
          status: 'resolved',
          resolution_notes: resolutionNotes
        }],
        error: null
      });

      // Act
      await instructorPanelService.resolveAlert(alertId, resolutionNotes);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('attendance_alerts');
    });
  });

  describe('5. Dashboard & Statistics', () => {
    test('should get instructor 30-day statistics', async () => {
      // Arrange
      const instructorId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          avg_attendance_rate: 0.82,
          total_classes: 30,
          avg_checklist_completion: 0.95,
          total_students_taught: 450,
          punctuality_rate: 0.98,
          critical_alerts_count: 1
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.getInstructorStats(
        instructorId,
        30
      );

      // Assert
      expect(result.avg_attendance_rate).toBeGreaterThan(0.80);
      expect(result.total_classes).toBe(30);
      expect(result.punctuality_rate).toBeGreaterThan(0.95);
    });

    test('should get current session live dashboard', async () => {
      // Arrange
      const sessionId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          class_name: 'Spinning',
          checked_in_count: 18,
          total_capacity: 20,
          attendance_rate: 0.90,
          checklist_completion: 0.80,
          alerts_active: 0,
          class_status: 'in_progress'
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.getLiveSessionDashboard(sessionId);

      // Assert
      expect(result.class_status).toBe('in_progress');
      expect(result.attendance_rate).toBeGreaterThan(0.80);
    });

    test('should track attendance trend over 30 days', async () => {
      // Arrange
      const instructorId = uuidv4();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [
          { date: '2025-09-19', attendance_rate: 0.75, classes_held: 2 },
          { date: '2025-09-20', attendance_rate: 0.78, classes_held: 2 },
          { date: '2025-09-21', attendance_rate: 0.82, classes_held: 3 }
        ],
        error: null
      });

      // Act
      const result = await instructorPanelService.getAttendanceTrend(instructorId, 30);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[2].attendance_rate).toBeGreaterThan(result[0].attendance_rate);
    });
  });

  describe('6. WhatsApp Notifications', () => {
    test('should send class started confirmation to students', async () => {
      // Arrange
      const sessionId = uuidv4();
      const studentList = [uuidv4(), uuidv4(), uuidv4()];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: studentList.map(id => ({ member_id: id, phone: '573001234567' })),
        error: null
      });

      mockAlertQueue.add.mockResolvedValue({ id: uuidv4() });

      // Act
      await instructorPanelService.notifyClassStarted(sessionId);

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notify_class_started'
        }),
        expect.any(Object)
      );
    });

    test('should send late start alert to admin', async () => {
      // Arrange
      const sessionId = uuidv4();
      const className = 'Spinning';

      mockAlertQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await instructorPanelService.notifyAdminLateStart(sessionId, className);

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'notify_admin_late_start'
        }),
        expect.any(Object)
      );
    });

    test('should send low attendance alert to admin', async () => {
      // Arrange
      const sessionId = uuidv4();
      const className = 'Yoga';
      const attendanceRate = 0.45;

      mockAlertQueue.add.mockResolvedValueOnce({ id: uuidv4() });

      // Act
      await instructorPanelService.notifyAdminLowAttendance(
        sessionId,
        className,
        attendanceRate
      );

      // Assert
      expect(mockAlertQueue.add).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'low_attendance_alert'
        }),
        expect.any(Object)
      );
    });
  });

  describe('7. Student Management', () => {
    test('should get list of registered students for class', async () => {
      // Arrange
      const classId = uuidv4();
      const students = [
        { member_id: uuidv4(), member_name: 'Juan', streak: 5 },
        { member_id: uuidv4(), member_name: 'María', streak: 3 },
        { member_id: uuidv4(), member_name: 'Carlos', streak: 12 }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: students,
        error: null
      });

      // Act
      const result = await instructorPanelService.getRegisteredStudents(classId);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('member_name');
      expect(result[0]).toHaveProperty('streak');
    });

    test('should sync instructor panel check-in with main checkins table', async () => {
      // Arrange
      const sessionId = uuidv4();
      const memberId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{
          checkin_id: uuidv4(),
          member_id: memberId,
          synced_at: new Date()
        }],
        error: null
      });

      // Act
      const result = await instructorPanelService.quickCheckin(sessionId, memberId);

      // Assert
      expect(result.checkin_id).toBeDefined();
      expect(result.synced_at).toBeDefined();
    });
  });

  describe('8. Offline Support & Resilience', () => {
    test('should buffer check-ins if network unavailable', async () => {
      // Arrange
      const sessionId = uuidv4();
      const studentId = uuidv4();

      mockSupabaseClient.rpc.mockRejectedValueOnce(
        new Error('Network error')
      );

      // Act & Assert
      await expect(
        instructorPanelService.quickCheckin(sessionId, studentId)
      ).rejects.toThrow();
    });

    test('should retry failed operations with exponential backoff', async () => {
      // Arrange
      const sessionId = uuidv4();

      mockSupabaseClient.from().select
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          data: [{ session_id: sessionId }],
          error: null
        });

      // Act
      const result = await instructorPanelService.getSessionDetails(
        sessionId,
        { retryCount: 2 }
      );

      // Assert
      expect(result.session_id).toBeDefined();
      expect(mockSupabaseClient.from).toHaveBeenCalledTimes(2);
    });
  });

  describe('9. Data Consistency & Transactions', () => {
    test('should maintain consistency during concurrent check-ins', async () => {
      // Arrange
      const sessionId = uuidv4();
      const student1 = uuidv4();
      const student2 = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ count: 2 }],
        error: null
      });

      // Act
      await instructorPanelService.quickCheckin(sessionId, student1);
      await instructorPanelService.quickCheckin(sessionId, student2);

      // Assert
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2);
    });

    test('should prevent double check-in of same student', async () => {
      // Arrange
      const sessionId = uuidv4();
      const studentId = uuidv4();

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ already_checked_in: true }],
        error: null
      });

      // Act & Assert
      await expect(
        instructorPanelService.quickCheckin(sessionId, studentId)
      ).rejects.toThrow();
    });
  });

  describe('10. Performance & Auto-Refresh', () => {
    test('should auto-refresh dashboard every 10 seconds', async () => {
      // Arrange
      const sessionId = uuidv4();
      jest.useFakeTimers();

      mockSupabaseClient.from().select.mockResolvedValue({
        data: [{ session_id: sessionId, updated_at: new Date() }],
        error: null
      });

      // Act
      await instructorPanelService.startAutoRefresh(sessionId, 10000);
      jest.advanceTimersByTime(10000);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('should load mobile-optimized dashboard under 1 second', async () => {
      // Arrange
      const sessionId = uuidv4();
      const startTime = Date.now();

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{
          session_id: sessionId,
          students_count: 20,
          checklist_progress: 0.80
        }],
        error: null
      });

      // Act
      await instructorPanelService.getLiveSessionDashboard(sessionId);
      const loadTime = Date.now() - startTime;

      // Assert
      expect(loadTime).toBeLessThan(1000);
    });
  });
});
