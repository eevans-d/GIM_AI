/**
 * Collection Service - Real Tests
 * Critical Business Flow: Debt Collection & Payment Management
 */

jest.mock('../../../utils/logger');
jest.mock('../../../utils/error-handler');
jest.mock('@supabase/supabase-js');

const collectionService = require('../../../services/contextual-collection-service');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');

describe('Collection Service - Debt Management', () => {
  let mockSupabase;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ id: 'member-123', deuda_actual: 50000 }],
            error: null
          }),
          gt: jest.fn().mockResolvedValue({
            data: [{ id: 'debtor-1' }, { id: 'debtor-2' }],
            error: null
          })
        }),
        insert: jest.fn().mockResolvedValue({
          data: { id: 'collection-001' },
          error: null
        })
      })
    };
  });

  describe('Debt Detection', () => {
    test('should identify members with overdue debt', async () => {
      // Arrange
      const debtThreshold = 30; // 30 days overdue

      // Act
      const debtors = await collectionService.getOverdueDebtors(debtThreshold);

      // Assert
      expect(Array.isArray(debtors)).toBe(true);
      debtors.forEach(debtor => {
        expect(debtor).toHaveProperty('memberId');
        expect(debtor).toHaveProperty('daysOverdue');
        expect(debtor.daysOverdue).toBeGreaterThanOrEqual(debtThreshold);
        expect(debtor).toHaveProperty('debtAmount');
      });
    });

    test('should classify debt severity levels', async () => {
      // Arrange
      const member = {
        id: 'member-high-debt',
        deuda_actual: 150000,
        fecha_ultimo_pago: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
      };

      // Act
      const severity = await collectionService.classifyDebtSeverity(member);

      // Assert
      expect(['low', 'medium', 'high', 'critical']).toContain(severity.level);
      expect(severity.actionRequired).toBe(true);
      expect(severity.collectionStrategy).toBeDefined();
    });

    test('should calculate total debt by member', async () => {
      // Arrange
      const memberId = 'member-debt-calc';

      // Act
      const debt = await collectionService.calculateMemberDebt(memberId);

      // Assert
      expect(debt).toEqual(
        expect.objectContaining({
          memberId,
          totalDebt: expect.any(Number),
          minimumPayment: expect.any(Number),
          daysOverdue: expect.any(Number),
          lastPaymentDate: expect.any(String)
        })
      );
    });
  });

  describe('Collection Workflows', () => {
    test('should start contextual collection 90 min after workout', async () => {
      // Arrange
      const memberId = 'member-123';
      const checkinId = 'checkin-001';

      // Act
      const collection = await collectionService.startContextualCollection(
        memberId,
        checkinId
      );

      // Assert
      expect(collection).toBeDefined();
      expect(collection.collectionId).toBeTruthy();
      expect(collection.trigger).toBe('post_workout');
      expect(collection.scheduledFor).toBeDefined();
      expect(collection.status).toBe('scheduled');
    });

    test('should send payment reminder message', async () => {
      // Arrange
      const memberId = 'member-reminder';
      const debtAmount = 50000;

      // Act
      const reminder = await collectionService.sendPaymentReminder(
        memberId,
        debtAmount
      );

      // Assert
      expect(reminder.success).toBe(true);
      expect(reminder.messageId).toBeTruthy();
      expect(reminder.sentVia).toMatch(/whatsapp|sms|email/i);
      expect(reminder.nextReminderScheduled).toBeDefined();
    });

    test('should follow escalation sequence for high debt', async () => {
      // Arrange
      const memberId = 'member-high-debt';
      const daysOverdue = 60;

      // Act
      const sequence = await collectionService.getEscalationSequence(
        memberId,
        daysOverdue
      );

      // Assert
      expect(Array.isArray(sequence.steps)).toBe(true);
      expect(sequence.steps.length).toBeGreaterThan(0);
      expect(sequence.steps[0]).toEqual(
        expect.objectContaining({
          day: expect.any(Number),
          action: expect.stringMatching(/reminder|message|call/i),
          message: expect.any(String)
        })
      );
    });

    test('should skip collection for members with active payment plans', async () => {
      // Arrange
      const memberId = 'member-payment-plan';
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: [{
            id: memberId,
            payment_plan_active: true,
            payment_plan_status: 'on_track'
          }],
          error: null
        });

      // Act
      const result = await collectionService.startContextualCollection(
        memberId,
        'checkin-001'
      );

      // Assert
      expect(result.skipped).toBe(true);
      expect(result.reason).toMatch(/payment.*plan|already.*arranged/i);
    });
  });

  describe('Payment Processing', () => {
    test('should record payment and update debt', async () => {
      // Arrange
      const memberId = 'member-payment';
      const amount = 50000;
      const method = 'transfer'; // banco, transfer, cash, etc

      // Act
      const payment = await collectionService.recordPayment(
        memberId,
        amount,
        method
      );

      // Assert
      expect(payment.success).toBe(true);
      expect(payment.paymentId).toBeTruthy();
      expect(payment.newDebt).toBe(0); // Assuming payment clears all debt
      expect(payment.receiptNumber).toBeTruthy();
      expect(payment.timestamp).toBeDefined();
    });

    test('should create payment plan for large debts', async () => {
      // Arrange
      const memberId = 'member-large-debt';
      const totalDebt = 300000;
      const installments = 6;

      // Act
      const plan = await collectionService.createPaymentPlan(
        memberId,
        totalDebt,
        installments
      );

      // Assert
      expect(plan.planId).toBeTruthy();
      expect(plan.installments).toHaveLength(installments);
      plan.installments.forEach(installment => {
        expect(installment).toHaveProperty('number');
        expect(installment).toHaveProperty('dueDate');
        expect(installment).toHaveProperty('amount');
      });
      expect(plan.totalWithInterest).toBeGreaterThan(totalDebt);
    });

    test('should track payment plan compliance', async () => {
      // Arrange
      const planId = 'plan-123';

      // Act
      const compliance = await collectionService.trackPlanCompliance(planId);

      // Assert
      expect(compliance).toEqual(
        expect.objectContaining({
          planId,
          onTrack: expect.any(Boolean),
          paidInstallments: expect.any(Number),
          missedInstallments: expect.any(Number),
          compliancePercentage: expect.any(Number),
          nextDueDate: expect.any(String)
        })
      );
    });
  });

  describe('Incentive Strategies', () => {
    test('should offer discount for immediate payment', async () => {
      // Arrange
      const memberId = 'member-discount';
      const debtAmount = 100000;

      // Act
      const offer = await collectionService.getImmediatePaymentIncentive(
        memberId,
        debtAmount
      );

      // Assert
      expect(offer.offered).toBe(true);
      expect(offer.discountPercentage).toBeGreaterThan(0);
      expect(offer.finalAmount).toBeLessThan(debtAmount);
      expect(offer.validUntil).toBeDefined();
    });

    test('should suggest class credit as settlement', async () => {
      // Arrange
      const memberId = 'member-credit-offer';
      const debtAmount = 50000;

      // Act
      const offer = await collectionService.getClassCreditOffer(
        memberId,
        debtAmount
      );

      // Assert
      expect(offer).toEqual(
        expect.objectContaining({
          offered: expect.any(Boolean),
          creditClasses: expect.any(Number),
          classValue: expect.any(Number),
          validUntil: expect.any(String)
        })
      );
    });

    test('should offer membership freeze as alternative', async () => {
      // Arrange
      const memberId = 'member-freeze';
      const daysFreeze = 30;

      // Act
      const offer = await collectionService.getFreezeMembershipOffer(
        memberId,
        daysFreeze
      );

      // Assert
      expect(offer).toEqual(
        expect.objectContaining({
          offered: expect.any(Boolean),
          freezeDays: daysFreeze,
          conditions: expect.any(String),
          validUntil: expect.any(String)
        })
      );
    });
  });

  describe('Batch Collections', () => {
    test('should process batch collection campaigns', async () => {
      // Arrange
      const memberIds = ['member-1', 'member-2', 'member-3'];
      const severity = 'high';

      // Act
      const campaign = await collectionService.startBatchCollection(
        memberIds,
        severity
      );

      // Assert
      expect(campaign.campaignId).toBeTruthy();
      expect(campaign.targets).toHaveLength(3);
      expect(campaign.status).toBe('active');
    });

    test('should track batch campaign progress', async () => {
      // Arrange
      const campaignId = 'campaign-123';

      // Act
      const progress = await collectionService.getCampaignProgress(campaignId);

      // Assert
      expect(progress).toEqual(
        expect.objectContaining({
          campaignId,
          totalTargets: expect.any(Number),
          contacted: expect.any(Number),
          responded: expect.any(Number),
          paid: expect.any(Number),
          successRate: expect.any(Number)
        })
      );
    });
  });

  describe('Analytics & Reporting', () => {
    test('should generate debt aging report', async () => {
      // Act
      const report = await collectionService.getDebtAgingReport();

      // Assert
      expect(report).toEqual(
        expect.objectContaining({
          current: expect.any(Number),
          '30days': expect.any(Number),
          '60days': expect.any(Number),
          '90days': expect.any(Number),
          '120days': expect.any(Number),
          total: expect.any(Number)
        })
      );
    });

    test('should calculate collection efficiency metrics', async () => {
      // Arrange
      const period = 'month'; // week, month, quarter, year

      // Act
      const metrics = await collectionService.getCollectionMetrics(period);

      // Assert
      expect(metrics).toEqual(
        expect.objectContaining({
          period,
          totalCollected: expect.any(Number),
          contactAttempts: expect.any(Number),
          responseRate: expect.any(Number),
          conversionRate: expect.any(Number),
          avgRecoveryTime: expect.any(Number)
        })
      );
    });

    test('should predict member likelihood to pay', async () => {
      // Arrange
      const memberId = 'member-predict';

      // Act
      const prediction = await collectionService.predictPaymentLikelihood(
        memberId
      );

      // Assert
      expect(prediction).toEqual(
        expect.objectContaining({
          likelihood: expect.stringMatching(/high|medium|low/i),
          confidence: expect.any(Number),
          baseFactors: expect.any(Array),
          recommendations: expect.any(Array)
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle failed collection messages', async () => {
      // Arrange
      const memberId = 'member-msg-fail';
      mockSupabase.from().select().eq()
        .mockRejectedValueOnce(new Error('WhatsApp API error'));

      // Act & Assert
      await expect(collectionService.sendPaymentReminder(memberId, 50000))
        .rejects
        .toThrow(AppError);
    });

    test('should validate member debt before collection', async () => {
      // Arrange
      const memberId = 'member-no-debt';
      mockSupabase.from().select().eq()
        .mockResolvedValueOnce({
          data: [{ id: memberId, deuda_actual: 0 }],
          error: null
        });

      // Act & Assert
      await expect(collectionService.startContextualCollection(memberId, 'checkin-001'))
        .rejects
        .toThrow(/no.*debt|debt.*zero|nothing.*owe/i);
    });
  });

  describe('Performance', () => {
    test('should detect overdue debtors within 500ms', async () => {
      // Arrange
      const startTime = process.hrtime.bigint();

      // Act
      await collectionService.getOverdueDebtors(30);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(500);
    });

    test('should process batch campaigns efficiently', async () => {
      // Arrange
      const memberIds = Array.from({ length: 50 }, (_, i) => `member-${i}`);
      const startTime = process.hrtime.bigint();

      // Act
      await collectionService.startBatchCollection(memberIds, 'high');
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(2000);
    });
  });
});
