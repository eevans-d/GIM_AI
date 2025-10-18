/**
 * INTEGRATION TESTS: Dashboard Service (Command Center)
 * Testing KPI aggregation, AI decision generation, alerts
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Mock dependencies
jest.mock('@supabase/supabase-js');
jest.mock('axios');
jest.mock('../utils/logger');
jest.mock('../utils/error-handler');

const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const dashboardService = require('../../services/dashboard-service');

describe('INTEGRATION: Dashboard Service (Command Center)', () => {
  let mockSupabaseClient;
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
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. KPI Calculation & Aggregation', () => {
    test('should calculate financial KPIs', async () => {
      // Arrange
      const expectedKPIs = {
        revenue_total: 15000000,
        revenue_memberships: 12000000,
        revenue_classes: 3000000,
        total_debt: 2500000,
        debt_percentage: 0.14,
        paying_members_count: 180
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [expectedKPIs],
        error: null
      });

      // Act
      const result = await dashboardService.getFinancialKPIs();

      // Assert
      expect(result).toEqual(expectedKPIs);
      expect(result.revenue_total).toBeGreaterThan(0);
      expect(result.debt_percentage).toBeLessThan(0.20);
    });

    test('should calculate operational KPIs', async () => {
      // Arrange
      const expectedKPIs = {
        total_checkins: 450,
        unique_members_attended: 280,
        classes_held: 32,
        avg_class_occupancy: 0.78,
        total_capacity: 4000,
        utilized_capacity: 3120,
        capacity_utilization: 0.78
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [expectedKPIs],
        error: null
      });

      // Act
      const result = await dashboardService.getOperationalKPIs();

      // Assert
      expect(result).toEqual(expectedKPIs);
      expect(result.capacity_utilization).toBeGreaterThan(0.70);
      expect(result.avg_class_occupancy).toBeCloseTo(result.capacity_utilization, 1);
    });

    test('should calculate satisfaction KPIs', async () => {
      // Arrange
      const expectedKPIs = {
        nps_score: 45,
        promoters_count: 150,
        passives_count: 85,
        detractors_count: 45,
        avg_class_rating: 4.5,
        surveys_completed: 280,
        response_rate: 0.52
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [expectedKPIs],
        error: null
      });

      // Act
      const result = await dashboardService.getSatisfactionKPIs();

      // Assert
      expect(result.nps_score).toBeGreaterThan(0);
      expect(result.avg_class_rating).toBeGreaterThan(4.0);
      expect(result.response_rate).toBeGreaterThan(0.40);
    });

    test('should calculate retention KPIs', async () => {
      // Arrange
      const expectedKPIs = {
        active_members: 200,
        new_members: 15,
        churned_members: 5,
        retention_rate: 0.975,
        churn_rate: 0.025
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [expectedKPIs],
        error: null
      });

      // Act
      const result = await dashboardService.getRetentionKPIs();

      // Assert
      expect(result.retention_rate).toBeGreaterThan(0.95);
      expect(result.churn_rate).toBeLessThan(0.05);
    });

    test('should handle missing KPI data gracefully', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [],
        error: null
      });

      // Act
      const result = await dashboardService.getFinancialKPIs();

      // Assert
      expect(result).toBeDefined();
      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });
  });

  describe('2. AI-Powered Decision Generation', () => {
    test('should generate 3 priority decisions from KPIs', async () => {
      // Arrange
      const kpis = {
        revenue_total: 15000000,
        nps_score: 45,
        capacity_utilization: 0.85,
        debt_percentage: 0.16,
        retention_rate: 0.972
      };

      const expectedDecisions = [
        {
          id: uuidv4(),
          rank: 1,
          category: 'financial',
          title: 'Focus on debt collection',
          description: 'Debt is at 16%, prioritize collection efforts',
          recommended_action: 'Launch collection campaign this week',
          action_owner: 'admin',
          estimated_time_minutes: 120,
          impact_score: 85,
          urgency_level: 'high',
          related_kpis: { debt_percentage: 0.16, revenue_impact: 800000 }
        },
        {
          id: uuidv4(),
          rank: 2,
          category: 'satisfaction',
          title: 'Improve instructor ratings',
          description: 'NPS at 45, focus on instructor quality training',
          recommended_action: 'Schedule quarterly instructor workshops',
          action_owner: 'staff',
          estimated_time_minutes: 240,
          impact_score: 72,
          urgency_level: 'medium',
          related_kpis: { nps_score: 45, avg_class_rating: 4.2 }
        },
        {
          id: uuidv4(),
          rank: 3,
          category: 'operational',
          title: 'Expand class schedule',
          description: 'Capacity at 85%, demand exceeds supply',
          recommended_action: 'Add 3 new class slots next month',
          action_owner: 'management',
          estimated_time_minutes: 180,
          impact_score: 65,
          urgency_level: 'medium',
          related_kpis: { capacity_utilization: 0.85 }
        }
      ];

      axios.post.mockResolvedValueOnce({
        data: { decisions: expectedDecisions }
      });

      // Act
      const result = await dashboardService.generatePriorityDecisions(kpis);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[0].impact_score).toBeGreaterThan(result[1].impact_score);
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('gemini'),
        expect.any(Object),
        expect.any(Object)
      );
    });

    test('should fallback to generic decisions if AI fails', async () => {
      // Arrange
      const kpis = {
        revenue_total: 15000000,
        nps_score: 45
      };

      axios.post.mockRejectedValueOnce(new Error('Gemini API error'));

      // Act
      const result = await dashboardService.generatePriorityDecisions(kpis);

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('category');
      expect(mockLoggerInstance.warn).toHaveBeenCalled();
    });

    test('should rank decisions by impact and urgency', async () => {
      // Arrange
      const kpis = {
        revenue_total: 12000000,
        nps_score: 35,
        debt_percentage: 0.22
      };

      const decisions = [
        { rank: 1, impact_score: 90, urgency_level: 'critical' },
        { rank: 2, impact_score: 75, urgency_level: 'high' },
        { rank: 3, impact_score: 60, urgency_level: 'medium' }
      ];

      axios.post.mockResolvedValueOnce({ data: { decisions } });

      // Act
      const result = await dashboardService.generatePriorityDecisions(kpis);

      // Assert
      expect(result[0].impact_score).toBeGreaterThanOrEqual(result[1].impact_score);
    });
  });

  describe('3. Alert Detection & Management', () => {
    test('should detect revenue drop alert', async () => {
      // Arrange
      const anomalies = {
        revenue_drop: {
          detected: true,
          current_revenue: 12000000,
          avg_7day_revenue: 15000000,
          drop_percentage: 0.20
        }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [anomalies],
        error: null
      });

      // Act
      const result = await dashboardService.detectCriticalAlerts();

      // Assert
      expect(result.revenue_drop.detected).toBe(true);
      expect(result.revenue_drop.drop_percentage).toBeGreaterThan(0.15);
    });

    test('should detect high debt alert', async () => {
      // Arrange
      const anomalies = {
        high_debt: {
          detected: true,
          debt_percentage: 0.18,
          threshold: 0.15,
          members_in_debt: 45
        }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [anomalies],
        error: null
      });

      // Act
      const result = await dashboardService.detectCriticalAlerts();

      // Assert
      expect(result.high_debt.detected).toBe(true);
      expect(result.high_debt.debt_percentage).toBeGreaterThan(result.high_debt.threshold);
    });

    test('should detect low NPS alert', async () => {
      // Arrange
      const anomalies = {
        low_nps: {
          detected: true,
          nps_score: 25,
          critical_threshold: 30
        }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [anomalies],
        error: null
      });

      // Act
      const result = await dashboardService.detectCriticalAlerts();

      // Assert
      expect(result.low_nps.detected).toBe(true);
      expect(result.low_nps.nps_score).toBeLessThan(result.low_nps.critical_threshold);
    });

    test('should detect low occupancy alert', async () => {
      // Arrange
      const anomalies = {
        low_occupancy: {
          detected: true,
          occupancy_rate: 0.55,
          critical_threshold: 0.60
        }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [anomalies],
        error: null
      });

      // Act
      const result = await dashboardService.detectCriticalAlerts();

      // Assert
      expect(result.low_occupancy.detected).toBe(true);
      expect(result.low_occupancy.occupancy_rate).toBeLessThan(result.low_occupancy.critical_threshold);
    });

    test('should dismiss alert and log action', async () => {
      // Arrange
      const alertId = uuidv4();
      const reason = 'Temporary issue, already addressed';

      mockSupabaseClient.from().update.mockResolvedValueOnce({
        data: [{ id: alertId, dismissed_at: new Date() }],
        error: null
      });

      // Act
      await dashboardService.dismissAlert(alertId, reason);

      // Assert
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('dashboard_alerts');
      expect(mockLoggerInstance.info).toHaveBeenCalled();
    });

    test('should auto-expire alerts after time period', async () => {
      // Arrange
      const expiredAlertCount = 3;

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ expired_count: expiredAlertCount }],
        error: null
      });

      // Act
      const result = await dashboardService.cleanupExpiredAlerts();

      // Assert
      expect(result.expired_count).toBe(expiredAlertCount);
    });
  });

  describe('4. Materialized View Refresh', () => {
    test('should refresh financial KPIs view', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ success: true, refresh_time_ms: 245 }],
        error: null
      });

      // Act
      const result = await dashboardService.refreshMaterializedView('v_financial_kpis_today');

      // Assert
      expect(result.success).toBe(true);
      expect(result.refresh_time_ms).toBeLessThan(1000);
    });

    test('should handle concurrent view refresh', async () => {
      // Arrange
      const views = [
        'v_financial_kpis_today',
        'v_operational_kpis_today',
        'v_satisfaction_kpis_recent'
      ];

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ views_refreshed: 3, total_time_ms: 680 }],
        error: null
      });

      // Act
      const result = await dashboardService.refreshAllMaterializedViews();

      // Assert
      expect(result.views_refreshed).toBeGreaterThanOrEqual(3);
      expect(result.total_time_ms).toBeLessThan(2000);
    });

    test('should log refresh errors for debugging', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: new Error('View refresh failed')
      });

      // Act & Assert
      await expect(dashboardService.refreshMaterializedView('v_financial_kpis_today'))
        .rejects.toThrow();
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });
  });

  describe('5. Daily Snapshot Creation', () => {
    test('should create daily snapshot with all KPIs', async () => {
      // Arrange
      const snapshotDate = new Date();
      const snapshotData = {
        date: snapshotDate,
        revenue_total: 15000000,
        total_debt: 2500000,
        nps_score: 45,
        capacity_utilization: 0.78,
        retention_rate: 0.972,
        snapshot_id: uuidv4()
      };

      mockSupabaseClient.from().insert.mockResolvedValueOnce({
        data: [snapshotData],
        error: null
      });

      // Act
      const result = await dashboardService.createDailySnapshot();

      // Assert
      expect(result.snapshot_id).toBeDefined();
      expect(result).toHaveProperty('revenue_total');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('dashboard_snapshots');
    });

    test('should retrieve historical snapshots', async () => {
      // Arrange
      const snapshots = [
        { date: '2025-10-18', revenue_total: 15000000, nps_score: 45 },
        { date: '2025-10-17', revenue_total: 14800000, nps_score: 44 },
        { date: '2025-10-16', revenue_total: 15100000, nps_score: 46 }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: snapshots,
        error: null
      });

      // Act
      const result = await dashboardService.getSnapshotRange('2025-10-16', '2025-10-18');

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].date).toBe('2025-10-18');
    });

    test('should prevent duplicate snapshots on same day', async () => {
      // Arrange
      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: [{ id: uuidv4(), date: new Date() }],
        error: null
      });

      // Act & Assert
      await expect(dashboardService.createDailySnapshot())
        .rejects.toThrow();
    });
  });

  describe('6. Trend Analysis', () => {
    test('should calculate revenue trend (7 days)', async () => {
      // Arrange
      const trends = [
        { date: '2025-10-12', revenue: 14500000, change_percentage: 0.00 },
        { date: '2025-10-13', revenue: 14800000, change_percentage: 0.021 },
        { date: '2025-10-14', revenue: 15100000, change_percentage: 0.020 },
        { date: '2025-10-15', revenue: 15300000, change_percentage: 0.013 },
        { date: '2025-10-16', revenue: 15100000, change_percentage: -0.013 },
        { date: '2025-10-17', revenue: 14800000, change_percentage: -0.020 },
        { date: '2025-10-18', revenue: 15000000, change_percentage: 0.013 }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: trends,
        error: null
      });

      // Act
      const result = await dashboardService.getTrend('revenue', 7);

      // Assert
      expect(result).toHaveLength(7);
      expect(result[0]).toHaveProperty('change_percentage');
    });

    test('should calculate occupancy trend', async () => {
      // Arrange
      const trends = [
        { date: '2025-10-14', occupancy_rate: 0.72 },
        { date: '2025-10-15', occupancy_rate: 0.75 },
        { date: '2025-10-16', occupancy_rate: 0.78 },
        { date: '2025-10-17', occupancy_rate: 0.80 },
        { date: '2025-10-18', occupancy_rate: 0.78 }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: trends,
        error: null
      });

      // Act
      const result = await dashboardService.getTrend('occupancy', 5);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[3].occupancy_rate).toBeGreaterThan(result[0].occupancy_rate);
    });
  });

  describe('7. Drill-Down Details', () => {
    test('should provide revenue drill-down by category', async () => {
      // Arrange
      const drilldown = {
        date: '2025-10-18',
        total_revenue: 15000000,
        breakdown: {
          memberships: { amount: 12000000, percentage: 0.80 },
          classes: { amount: 2000000, percentage: 0.13 },
          merchandise: { amount: 800000, percentage: 0.05 },
          other: { amount: 200000, percentage: 0.02 }
        }
      };

      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [drilldown],
        error: null
      });

      // Act
      const result = await dashboardService.getDrilldown('revenue', '2025-10-18');

      // Assert
      expect(result.total_revenue).toBe(15000000);
      expect(result.breakdown.memberships.percentage).toBe(0.80);
    });

    test('should list debtors for drill-down', async () => {
      // Arrange
      const debtors = [
        {
          member_id: uuidv4(),
          member_name: 'Juan Pérez',
          debt_amount: 500000,
          days_overdue: 30,
          last_payment_date: '2025-08-18'
        },
        {
          member_id: uuidv4(),
          member_name: 'María García',
          debt_amount: 350000,
          days_overdue: 21,
          last_payment_date: '2025-08-27'
        }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: debtors,
        error: null
      });

      // Act
      const result = await dashboardService.getDrilldown('debtors');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].debt_amount).toBeGreaterThanOrEqual(result[1].debt_amount);
    });

    test('should provide occupancy drill-down by class', async () => {
      // Arrange
      const occupancy = [
        {
          class_id: uuidv4(),
          class_name: 'Spinning',
          total_capacity: 20,
          current_occupancy: 18,
          occupancy_rate: 0.90
        },
        {
          class_id: uuidv4(),
          class_name: 'Yoga',
          total_capacity: 15,
          current_occupancy: 10,
          occupancy_rate: 0.67
        }
      ];

      mockSupabaseClient.from().select.mockResolvedValueOnce({
        data: occupancy,
        error: null
      });

      // Act
      const result = await dashboardService.getDrilldown('occupancy', '2025-10-18');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].occupancy_rate).toBeGreaterThan(result[1].occupancy_rate);
    });
  });

  describe('8. Performance & Caching', () => {
    test('should cache KPI results for 5 minutes', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ revenue_total: 15000000 }],
        error: null
      });

      // Act
      const result1 = await dashboardService.getFinancialKPIs();
      const result2 = await dashboardService.getFinancialKPIs();

      // Assert
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(1); // Only once due to cache
      expect(result1).toEqual(result2);
    });

    test('should invalidate cache on manual refresh', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ revenue_total: 15000000 }],
        error: null
      });

      // Act
      await dashboardService.getFinancialKPIs();
      await dashboardService.refreshCache();
      await dashboardService.getFinancialKPIs();

      // Assert
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('9. Health Check & Status', () => {
    test('should verify dashboard service health', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockResolvedValueOnce({
        data: [{ status: 'healthy', response_time_ms: 125 }],
        error: null
      });

      // Act
      const result = await dashboardService.getHealth();

      // Assert
      expect(result.status).toBe('healthy');
      expect(result.response_time_ms).toBeLessThan(1000);
    });

    test('should report degraded status on slow queries', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockImplementationOnce(
        () => new Promise(resolve => setTimeout(() => resolve({
          data: [{ status: 'degraded', response_time_ms: 2500 }],
          error: null
        }), 2500))
      );

      // Act
      const result = await dashboardService.getHealth();

      // Assert
      expect(result.status).toBe('degraded');
      expect(result.response_time_ms).toBeGreaterThan(2000);
    });
  });

  describe('10. Error Resilience', () => {
    test('should handle Supabase connection errors', async () => {
      // Arrange
      mockSupabaseClient.rpc.mockRejectedValueOnce(
        new Error('Connection failed')
      );

      // Act & Assert
      await expect(dashboardService.getFinancialKPIs())
        .rejects.toThrow();
      expect(mockLoggerInstance.error).toHaveBeenCalled();
    });

    test('should retry failed view refreshes', async () => {
      // Arrange
      mockSupabaseClient.rpc
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({
          data: [{ success: true }],
          error: null
        });

      // Act
      const result = await dashboardService.refreshMaterializedView('v_financial_kpis_today', {
        retryCount: 2
      });

      // Assert
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.rpc).toHaveBeenCalledTimes(2);
    });
  });
});
