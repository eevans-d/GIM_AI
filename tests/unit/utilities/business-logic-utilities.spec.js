/**
 * Business Logic Utilities - Tests
 * Tests for calculation and transformation functions
 */

describe('Business Logic Utilities', () => {
  
  /**
   * Debt calculation logic
   */
  describe('Debt Calculation', () => {
    
    function calculateDebtDays(lastPaymentDate) {
      if (!lastPaymentDate) return Infinity;
      const lastDate = new Date(lastPaymentDate);
      const today = new Date();
      const diff = today - lastDate;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    function classifyDebtSeverity(debtDays) {
      if (debtDays < 30) return 'LOW';
      if (debtDays < 60) return 'MEDIUM';
      if (debtDays < 90) return 'HIGH';
      return 'CRITICAL';
    }

    test('should calculate days overdue correctly', () => {
      // Arrange: 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      // Act
      const days = calculateDebtDays(fiveDaysAgo);

      // Assert
      expect(days).toBe(5);
    });

    test('should classify debt as LOW (< 30 days)', () => {
      // Arrange
      const days = 15;

      // Act
      const severity = classifyDebtSeverity(days);

      // Assert
      expect(severity).toBe('LOW');
    });

    test('should classify debt as MEDIUM (30-60 days)', () => {
      // Arrange & Assert
      expect(classifyDebtSeverity(30)).toBe('MEDIUM');
      expect(classifyDebtSeverity(45)).toBe('MEDIUM');
      expect(classifyDebtSeverity(59)).toBe('MEDIUM');
    });

    test('should classify debt as HIGH (60-90 days)', () => {
      // Arrange & Assert
      expect(classifyDebtSeverity(60)).toBe('HIGH');
      expect(classifyDebtSeverity(75)).toBe('HIGH');
      expect(classifyDebtSeverity(89)).toBe('HIGH');
    });

    test('should classify debt as CRITICAL (>= 90 days)', () => {
      // Arrange & Assert
      expect(classifyDebtSeverity(90)).toBe('CRITICAL');
      expect(classifyDebtSeverity(120)).toBe('CRITICAL');
      expect(classifyDebtSeverity(365)).toBe('CRITICAL');
    });

    test('should handle no payment date', () => {
      // Act
      const days = calculateDebtDays(null);

      // Assert
      expect(days).toBe(Infinity);
      expect(classifyDebtSeverity(days)).toBe('CRITICAL');
    });
  });

  /**
   * Attendance percentage calculation
   */
  describe('Attendance Calculation', () => {
    
    function calculateAttendancePercentage(attendances, totalClasses) {
      if (totalClasses === 0) return 0;
      return Math.round((attendances / totalClasses) * 100);
    }

    function classifyAttendance(percentage) {
      if (percentage >= 80) return 'EXCELLENT';
      if (percentage >= 60) return 'GOOD';
      if (percentage >= 40) return 'FAIR';
      return 'POOR';
    }

    test('should calculate attendance percentage', () => {
      expect(calculateAttendancePercentage(8, 10)).toBe(80);
      expect(calculateAttendancePercentage(5, 10)).toBe(50);
      expect(calculateAttendancePercentage(10, 10)).toBe(100);
    });

    test('should handle zero total classes', () => {
      expect(calculateAttendancePercentage(0, 0)).toBe(0);
    });

    test('should classify EXCELLENT attendance (>= 80%)', () => {
      expect(classifyAttendance(100)).toBe('EXCELLENT');
      expect(classifyAttendance(80)).toBe('EXCELLENT');
      expect(classifyAttendance(90)).toBe('EXCELLENT');
    });

    test('should classify GOOD attendance (60-79%)', () => {
      expect(classifyAttendance(79)).toBe('GOOD');
      expect(classifyAttendance(60)).toBe('GOOD');
      expect(classifyAttendance(70)).toBe('GOOD');
    });

    test('should classify FAIR attendance (40-59%)', () => {
      expect(classifyAttendance(59)).toBe('FAIR');
      expect(classifyAttendance(40)).toBe('FAIR');
      expect(classifyAttendance(50)).toBe('FAIR');
    });

    test('should classify POOR attendance (< 40%)', () => {
      expect(classifyAttendance(0)).toBe('POOR');
      expect(classifyAttendance(39)).toBe('POOR');
      expect(classifyAttendance(20)).toBe('POOR');
    });
  });

  /**
   * Revenue calculation
   */
  describe('Revenue Calculation', () => {
    
    function calculateMonthlyRevenue(members) {
      return members
        .filter(m => m.estado === 'activo')
        .reduce((sum, m) => sum + (m.cuota_mensual || 0), 0);
    }

    function calculateRevenueWithDiscount(amount, discountPercent) {
      return Math.round(amount * (1 - discountPercent / 100));
    }

    test('should calculate revenue from active members only', () => {
      // Arrange
      const members = [
        { estado: 'activo', cuota_mensual: 100 },
        { estado: 'activo', cuota_mensual: 150 },
        { estado: 'inactivo', cuota_mensual: 200 }
      ];

      // Act
      const revenue = calculateMonthlyRevenue(members);

      // Assert
      expect(revenue).toBe(250);
    });

    test('should calculate revenue with discount', () => {
      expect(calculateRevenueWithDiscount(1000, 10)).toBe(900);
      expect(calculateRevenueWithDiscount(1000, 50)).toBe(500);
      expect(calculateRevenueWithDiscount(1000, 0)).toBe(1000);
    });

    test('should handle empty members array', () => {
      expect(calculateMonthlyRevenue([])).toBe(0);
    });
  });

  /**
   * Class capacity calculation
   */
  describe('Class Capacity Calculation', () => {
    
    function calculateAvailableCapacity(maxCapacity, currentBookings) {
      return Math.max(0, maxCapacity - currentBookings);
    }

    function isClassFull(maxCapacity, currentBookings) {
      return currentBookings >= maxCapacity;
    }

    function getCapacityPercentage(maxCapacity, currentBookings) {
      return Math.round((currentBookings / maxCapacity) * 100);
    }

    test('should calculate available capacity', () => {
      expect(calculateAvailableCapacity(20, 5)).toBe(15);
      expect(calculateAvailableCapacity(20, 20)).toBe(0);
      expect(calculateAvailableCapacity(20, 25)).toBe(0); // Never negative
    });

    test('should detect when class is full', () => {
      expect(isClassFull(20, 20)).toBe(true);
      expect(isClassFull(20, 21)).toBe(true);
      expect(isClassFull(20, 19)).toBe(false);
    });

    test('should calculate capacity percentage', () => {
      expect(getCapacityPercentage(20, 10)).toBe(50);
      expect(getCapacityPercentage(20, 20)).toBe(100);
      expect(getCapacityPercentage(20, 5)).toBe(25);
    });
  });

  /**
   * Payment plan calculation
   */
  describe('Payment Plan Calculation', () => {
    
    function calculatePaymentPlan(debtAmount, installments = 3) {
      const baseInstallment = Math.round((debtAmount / installments) * 100) / 100;
      const remainder = Math.round((debtAmount - (baseInstallment * (installments - 1))) * 100) / 100;
      
      const plan = [];
      for (let i = 0; i < installments - 1; i++) {
        plan.push(baseInstallment);
      }
      plan.push(remainder);
      
      return plan;
    }

    test('should divide debt equally across installments', () => {
      // Arrange
      const debt = 300;
      const installments = 3;

      // Act
      const plan = calculatePaymentPlan(debt, installments);

      // Assert
      expect(plan.length).toBe(3);
      expect(plan[0]).toBe(100);
      expect(plan[1]).toBe(100);
      expect(plan[2]).toBe(100);
    });

    test('should handle uneven division', () => {
      // Arrange
      const debt = 100;
      const installments = 3;

      // Act
      const plan = calculatePaymentPlan(debt, installments);

      // Assert
      expect(plan.length).toBe(3);
      const total = plan.reduce((sum, payment) => sum + payment, 0);
      expect(total).toBe(100);
    });

    test('should handle single installment', () => {
      // Act
      const plan = calculatePaymentPlan(100, 1);

      // Assert
      expect(plan).toEqual([100]);
    });
  });

  /**
   * Incentive calculation
   */
  describe('Incentive Calculation', () => {
    
    function calculateDiscount(amount, discountPercent) {
      return Math.round(amount * (discountPercent / 100));
    }

    function calculateIncentiveAmount(debtAmount, incentiveType) {
      switch (incentiveType) {
        case 'DISCOUNT_10':
          return calculateDiscount(debtAmount, 10);
        case 'DISCOUNT_15':
          return calculateDiscount(debtAmount, 15);
        case 'CLASS_CREDIT_5':
          return 5; // 5 free classes
        case 'CLASS_CREDIT_10':
          return 10; // 10 free classes
        default:
          return 0;
      }
    }

    test('should calculate 10% discount', () => {
      expect(calculateDiscount(1000, 10)).toBe(100);
    });

    test('should calculate 15% discount', () => {
      expect(calculateDiscount(1000, 15)).toBe(150);
    });

    test('should return incentive amount for each type', () => {
      const debt = 500;
      expect(calculateIncentiveAmount(debt, 'DISCOUNT_10')).toBe(50);
      expect(calculateIncentiveAmount(debt, 'DISCOUNT_15')).toBe(75);
      expect(calculateIncentiveAmount(debt, 'CLASS_CREDIT_5')).toBe(5);
      expect(calculateIncentiveAmount(debt, 'CLASS_CREDIT_10')).toBe(10);
    });
  });

  /**
   * Churn risk calculation
   */
  describe('Churn Risk Calculation', () => {
    
    function calculateChurnRisk(
      daysSinceLastAttendance,
      debtDays,
      attendancePercentage
    ) {
      let score = 0;
      
      // Days without attendance (0-40 points)
      if (daysSinceLastAttendance > 60) score += 40;
      else if (daysSinceLastAttendance > 30) score += 25;
      else if (daysSinceLastAttendance > 14) score += 10;
      
      // Debt (0-30 points)
      if (debtDays > 90) score += 30;
      else if (debtDays > 60) score += 20;
      else if (debtDays > 30) score += 10;
      
      // Attendance (0-30 points)
      if (attendancePercentage < 40) score += 30;
      else if (attendancePercentage < 60) score += 15;
      else if (attendancePercentage < 80) score += 5;
      
      return Math.min(100, score);
    }

    function classifyChurnRisk(score) {
      if (score >= 70) return 'CRITICAL';
      if (score >= 50) return 'HIGH';
      if (score >= 30) return 'MEDIUM';
      return 'LOW';
    }

    test('should calculate low churn risk for active healthy member', () => {
      const score = calculateChurnRisk(7, 0, 90);
      expect(score).toBe(0);
      expect(classifyChurnRisk(score)).toBe('LOW');
    });

    test('should calculate HIGH risk for inactive member with debt', () => {
      const score = calculateChurnRisk(40, 45, 70);
      expect(score).toBeGreaterThanOrEqual(25);
    });

    test('should calculate CRITICAL risk for abandoned member', () => {
      const score = calculateChurnRisk(90, 100, 20);
      expect(score).toBeGreaterThanOrEqual(70);
      expect(classifyChurnRisk(score)).toBe('CRITICAL');
    });

    test('should cap churn score at 100', () => {
      const score = calculateChurnRisk(100, 120, 10);
      expect(score).toBe(100);
    });
  });
});
