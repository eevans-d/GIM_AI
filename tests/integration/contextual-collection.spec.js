/**
 * PROMPT 7: Integration Tests - Contextual Collection
 * Tests del sistema de cobranza contextual post-entrenamiento
 */

const { createClient } = require('@supabase/supabase-js');
const collectionService = require('../../../services/contextual-collection-service');

// Mock Supabase
jest.mock('@supabase/supabase-js');

// Mock WhatsApp sender
jest.mock('../../../whatsapp/client/sender');

describe('Contextual Collection Integration Tests', () => {
  let supabaseMock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup Supabase mock
    supabaseMock = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn()
    };

    createClient.mockReturnValue(supabaseMock);
  });

  describe('detectMemberDebt', () => {
    test('should detect member with debt', async () => {
      const mockDebtData = [{
        member_id: 'member-123',
        member_name: 'Juan Pérez',
        phone: '+5491112345678',
        debt_amount: 2500.00,
        last_payment_date: '2025-09-01',
        days_overdue: 30,
        membership_status: 'active'
      }];

      supabaseMock.rpc.mockResolvedValue({ data: mockDebtData, error: null });

      const result = await collectionService.detectMemberDebt('member-123');

      expect(result).toBeDefined();
      expect(result.debt_amount).toBe(2500.00);
      expect(result.days_overdue).toBe(30);
      expect(supabaseMock.rpc).toHaveBeenCalledWith('detect_member_debt', {
        p_member_id: 'member-123'
      });
    });

    test('should return null for member without debt', async () => {
      supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

      const result = await collectionService.detectMemberDebt('member-456');

      expect(result).toBeNull();
    });

    test('should handle database errors', async () => {
      supabaseMock.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(
        collectionService.detectMemberDebt('member-789')
      ).rejects.toThrow();
    });
  });

  describe('schedulePostWorkoutCollection', () => {
    test('should schedule collection for member with debt', async () => {
      const mockCheckin = {
        id: 'checkin-123',
        member_id: 'member-123',
        fecha_hora: '2025-10-01T10:00:00Z',
        members: {
          first_name: 'Juan',
          last_name: 'Pérez',
          phone: '+5491112345678'
        },
        classes: {
          name: 'Spinning',
          class_type: 'cardio'
        }
      };

      const mockDebtData = [{
        debt_amount: 2500.00,
        days_overdue: 15
      }];

      // Mock Supabase calls
      supabaseMock.single
        .mockResolvedValueOnce({ data: mockCheckin, error: null }) // Check-in fetch
        .mockResolvedValueOnce({ data: null, error: null }) // Existing collection check
        .mockResolvedValueOnce({ 
          data: { id: 'collection-123' }, 
          error: null 
        }); // Collection insert

      supabaseMock.rpc.mockResolvedValue({ data: mockDebtData, error: null });

      // Mock payment link generation
      jest.spyOn(collectionService, 'generatePaymentLink')
        .mockResolvedValue('https://mpago.la/test123');

      const result = await collectionService.schedulePostWorkoutCollection('checkin-123', 90);

      expect(result).toBeDefined();
      expect(result.collectionId).toBe('collection-123');
      expect(result.debtAmount).toBe(2500.00);
      expect(result.paymentLink).toContain('mpago.la');
    });

    test('should skip collection if debt below threshold', async () => {
      const mockCheckin = {
        id: 'checkin-456',
        member_id: 'member-456',
        fecha_hora: '2025-10-01T10:00:00Z'
      };

      const mockDebtData = [{
        debt_amount: 50.00 // Below 100 threshold
      }];

      supabaseMock.single.mockResolvedValue({ data: mockCheckin, error: null });
      supabaseMock.rpc.mockResolvedValue({ data: mockDebtData, error: null });

      const result = await collectionService.schedulePostWorkoutCollection('checkin-456');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('debt_below_threshold');
    });

    test('should throw error if checkin not found', async () => {
      supabaseMock.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(
        collectionService.schedulePostWorkoutCollection('invalid-checkin')
      ).rejects.toThrow('Check-in not found');
    });
  });

  describe('getConversionStats', () => {
    test('should return conversion statistics', async () => {
      const mockStats = [{
        total_sent: 100,
        total_paid: 68,
        conversion_rate: 68.00,
        avg_conversion_time_minutes: 45,
        total_collected: 170000.00
      }];

      supabaseMock.rpc.mockResolvedValue({ data: mockStats, error: null });

      const result = await collectionService.getConversionStats(30);

      expect(result.total_sent).toBe(100);
      expect(result.total_paid).toBe(68);
      expect(result.conversion_rate).toBe(68.00);
      expect(result.avg_conversion_time_minutes).toBe(45);
    });

    test('should return zeros for no data', async () => {
      supabaseMock.rpc.mockResolvedValue({ data: [], error: null });

      const result = await collectionService.getConversionStats(7);

      expect(result.total_sent).toBe(0);
      expect(result.total_paid).toBe(0);
      expect(result.conversion_rate).toBe(0);
    });
  });

  describe('markCollectionAsPaid', () => {
    test('should mark collection as paid and calculate conversion time', async () => {
      const mockCollection = {
        id: 'collection-123',
        message_sent_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
        status: 'sent'
      };

      const mockUpdated = {
        ...mockCollection,
        status: 'paid',
        payment_amount: 2500.00,
        conversion_time_minutes: 30
      };

      supabaseMock.single
        .mockResolvedValueOnce({ data: mockCollection, error: null })
        .mockResolvedValueOnce({ data: mockUpdated, error: null });

      const result = await collectionService.markCollectionAsPaid('collection-123', 2500.00);

      expect(result.status).toBe('paid');
      expect(result.payment_amount).toBe(2500.00);
      expect(result.conversion_time_minutes).toBeGreaterThan(0);
    });

    test('should throw error if collection not found', async () => {
      supabaseMock.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      await expect(
        collectionService.markCollectionAsPaid('invalid-collection', 1000)
      ).rejects.toThrow('Collection not found');
    });
  });

  describe('End-to-End Collection Flow', () => {
    test('should complete full collection flow from checkin to payment', async () => {
      // 1. Member checks in
      const checkinId = 'checkin-e2e-123';
      
      // 2. Debt is detected
      const debtInfo = await collectionService.detectMemberDebt('member-123');
      expect(debtInfo).toBeDefined();
      
      // 3. Collection is scheduled
      const scheduled = await collectionService.schedulePostWorkoutCollection(checkinId);
      expect(scheduled.collectionId).toBeDefined();
      
      // 4. Message is sent (simulated by queue processor)
      // This would be tested separately in queue processor tests
      
      // 5. Payment is received
      const paid = await collectionService.markCollectionAsPaid(
        scheduled.collectionId,
        debtInfo.debt_amount
      );
      expect(paid.status).toBe('paid');
      
      // 6. Conversion stats are updated
      const stats = await collectionService.getConversionStats(1);
      expect(stats.total_paid).toBeGreaterThan(0);
    });
  });
});
