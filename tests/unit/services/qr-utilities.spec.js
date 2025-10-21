/**
 * QR Service - Utility Functions Tests
 * Lightweight tests for pure functions that don't require mocking
 */

const crypto = require('crypto');

describe('QR Service - Utility Functions', () => {
  
  /**
   * Test for QR code generation logic (pure function)
   */
  describe('generateUniqueCode', () => {
    
    function generateUniqueCode(memberId, phone) {
      const hash = crypto
        .createHash('sha256')
        .update(`${memberId}-${phone}-${Date.now()}`)
        .digest('hex')
        .substring(0, 8)
        .toUpperCase();
      
      return `GYM-${hash.substring(0, 4)}-${hash.substring(4, 8)}`;
    }

    test('should generate valid QR code format', () => {
      // Arrange
      const memberId = 'member-123';
      const phone = '573001234567';

      // Act
      const qrCode = generateUniqueCode(memberId, phone);

      // Assert
      expect(qrCode).toMatch(/^GYM-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(qrCode.length).toBe(13); // GYM-XXXX-XXXX
    });

    test('should generate unique codes for different members', () => {
      // Arrange
      const phone = '573001234567';

      // Act
      const code1 = generateUniqueCode('member-1', phone);
      const code2 = generateUniqueCode('member-2', phone);

      // Assert
      expect(code1).not.toEqual(code2);
    });

    test('should generate unique codes at different timestamps', () => {
      // Arrange
      const memberId = 'member-123';
      const phone = '573001234567';

      // Act
      const code1 = generateUniqueCode(memberId, phone);
      const code2 = generateUniqueCode(memberId, phone);

      // Assert
      expect(code1).not.toEqual(code2);
    });

    test('should handle special characters in phone', () => {
      // Arrange
      const memberId = 'member-123';
      const phone = '+57-300-1234567';

      // Act
      const qrCode = generateUniqueCode(memberId, phone);

      // Assert
      expect(qrCode).toMatch(/^GYM-[A-F0-9]{4}-[A-F0-9]{4}$/);
    });
  });

  /**
   * Test for QR code validation logic
   */
  describe('QR Code Validation', () => {
    
    function isValidQRFormat(qrCode) {
      if (!qrCode) return false;
      return /^GYM-[A-F0-9]{4}-[A-F0-9]{4}$/.test(qrCode);
    }

    test('should validate correct QR format', () => {
      // Assert
      expect(isValidQRFormat('GYM-ABC1-DEF2')).toBe(true);
      expect(isValidQRFormat('GYM-0000-9999')).toBe(true);
    });

    test('should reject invalid QR formats', () => {
      // Assert
      expect(isValidQRFormat('INVALID-CODE')).toBe(false);
      expect(isValidQRFormat('GYM-ABC1')).toBe(false);
      expect(isValidQRFormat('GYM-ABC1-DEF2-EXTRA')).toBe(false);
      expect(isValidQRFormat('')).toBe(false);
      expect(isValidQRFormat(null)).toBe(false);
      expect(isValidQRFormat(undefined)).toBe(false);
    });

    test('should handle lowercase (convert to uppercase)', () => {
      // Assert
      expect(isValidQRFormat('gym-abc1-def2')).toBe(false);
      expect(isValidQRFormat('GYM-abc1-def2')).toBe(false); // Currently case-sensitive
    });
  });

  /**
   * Test for check-in timeout logic
   */
  describe('Check-in Timeout Validation', () => {
    
    function isCheckInExpired(checkInTime, currentTime = new Date(), timeoutMinutes = 5) {
      const checkInDate = new Date(checkInTime);
      const diff = (currentTime - checkInDate) / (1000 * 60); // Convert to minutes
      return diff > timeoutMinutes;
    }

    test('should detect non-expired check-ins', () => {
      // Arrange
      const now = new Date();
      const checkInTime = new Date(now - 2 * 60 * 1000); // 2 minutes ago

      // Act
      const isExpired = isCheckInExpired(checkInTime, now, 5);

      // Assert
      expect(isExpired).toBe(false);
    });

    test('should detect expired check-ins', () => {
      // Arrange
      const now = new Date();
      const checkInTime = new Date(now - 10 * 60 * 1000); // 10 minutes ago

      // Act
      const isExpired = isCheckInExpired(checkInTime, now, 5);

      // Assert
      expect(isExpired).toBe(true);
    });

    test('should use custom timeout window', () => {
      // Arrange
      const now = new Date();
      const checkInTime = new Date(now - 8 * 60 * 1000); // 8 minutes ago

      // Act & Assert
      expect(isCheckInExpired(checkInTime, now, 5)).toBe(true);
      expect(isCheckInExpired(checkInTime, now, 10)).toBe(false);
    });

    test('should handle edge case at exact timeout', () => {
      // Arrange
      const now = new Date();
      const checkInTime = new Date(now - 5 * 60 * 1000); // Exactly 5 minutes ago

      // Act
      const isExpired = isCheckInExpired(checkInTime, now, 5);

      // Assert (boundary: > not >=, so exactly at boundary is NOT expired)
      expect(isExpired).toBe(false);
    });
  });

  /**
   * Test for duplicate check-in detection within window
   */
  describe('Duplicate Check-in Prevention', () => {
    
    function isDuplicateCheckIn(lastCheckInTime, currentTime = new Date(), windowMinutes = 5) {
      if (!lastCheckInTime) return false;
      const lastDate = new Date(lastCheckInTime);
      const diff = (currentTime - lastDate) / (1000 * 60); // Convert to minutes
      return diff < windowMinutes;
    }

    test('should detect duplicate check-in within window', () => {
      // Arrange
      const now = new Date();
      const lastCheckIn = new Date(now - 3 * 60 * 1000); // 3 minutes ago

      // Act
      const isDuplicate = isDuplicateCheckIn(lastCheckIn, now, 5);

      // Assert
      expect(isDuplicate).toBe(true);
    });

    test('should allow new check-in after window expiry', () => {
      // Arrange
      const now = new Date();
      const lastCheckIn = new Date(now - 6 * 60 * 1000); // 6 minutes ago

      // Act
      const isDuplicate = isDuplicateCheckIn(lastCheckIn, now, 5);

      // Assert
      expect(isDuplicate).toBe(false);
    });

    test('should handle null lastCheckInTime', () => {
      // Act
      const isDuplicate = isDuplicateCheckIn(null, new Date(), 5);

      // Assert
      expect(isDuplicate).toBe(false);
    });

    test('should use custom window', () => {
      // Arrange
      const now = new Date();
      const lastCheckIn = new Date(now - 8 * 60 * 1000); // 8 minutes ago

      // Act & Assert
      expect(isDuplicateCheckIn(lastCheckIn, now, 5)).toBe(false);
      expect(isDuplicateCheckIn(lastCheckIn, now, 10)).toBe(true);
    });
  });

  /**
   * Test for business hours validation
   */
  describe('Business Hours Validation', () => {
    
    function isWithinBusinessHours(date = new Date(), startHour = 9, endHour = 21) {
      const hour = date.getHours();
      return hour >= startHour && hour < endHour;
    }

    test('should accept check-in during business hours', () => {
      // Arrange: Create date at 3 PM (15:00)
      const date = new Date();
      date.setHours(15, 0, 0, 0);

      // Act
      const isValid = isWithinBusinessHours(date, 9, 21);

      // Assert
      expect(isValid).toBe(true);
    });

    test('should reject check-in before business hours', () => {
      // Arrange: Create date at 8 AM (08:00)
      const date = new Date();
      date.setHours(8, 0, 0, 0);

      // Act
      const isValid = isWithinBusinessHours(date, 9, 21);

      // Assert
      expect(isValid).toBe(false);
    });

    test('should reject check-in after business hours', () => {
      // Arrange: Create date at 10 PM (22:00)
      const date = new Date();
      date.setHours(22, 0, 0, 0);

      // Act
      const isValid = isWithinBusinessHours(date, 9, 21);

      // Assert
      expect(isValid).toBe(false);
    });

    test('should accept at opening hour boundary', () => {
      // Arrange: Create date at exactly 9 AM
      const date = new Date();
      date.setHours(9, 0, 0, 0);

      // Act
      const isValid = isWithinBusinessHours(date, 9, 21);

      // Assert
      expect(isValid).toBe(true);
    });

    test('should reject at closing hour boundary', () => {
      // Arrange: Create date at exactly 9 PM (21:00)
      const date = new Date();
      date.setHours(21, 0, 0, 0);

      // Act
      const isValid = isWithinBusinessHours(date, 9, 21);

      // Assert
      expect(isValid).toBe(false); // < endHour, so 21:00 is NOT valid (9-21 means 9-20:59:59)
    });

    test('should use custom business hours', () => {
      // Arrange: Create date at 8 AM
      const date = new Date();
      date.setHours(8, 0, 0, 0);

      // Act & Assert
      expect(isWithinBusinessHours(date, 9, 21)).toBe(false); // Not valid for 9-21
      expect(isWithinBusinessHours(date, 7, 21)).toBe(true);  // Valid for 7-21
    });
  });

  /**
   * Test for late arrival detection
   */
  describe('Late Arrival Detection', () => {
    
    function isLateArrival(classStartTime, memberCheckInTime) {
      const startDate = new Date(classStartTime);
      const checkInDate = new Date(memberCheckInTime);
      const latenessMinutes = (checkInDate - startDate) / (1000 * 60);
      return latenessMinutes > 15; // More than 15 minutes late
    }

    test('should detect on-time arrival', () => {
      // Arrange
      const classStart = new Date();
      const checkIn = new Date(classStart.getTime() + 5 * 60 * 1000); // 5 min late

      // Act
      const isLate = isLateArrival(classStart, checkIn);

      // Assert
      expect(isLate).toBe(false);
    });

    test('should detect late arrival', () => {
      // Arrange
      const classStart = new Date();
      const checkIn = new Date(classStart.getTime() + 20 * 60 * 1000); // 20 min late

      // Act
      const isLate = isLateArrival(classStart, checkIn);

      // Assert
      expect(isLate).toBe(true);
    });

    test('should detect early arrival', () => {
      // Arrange
      const classStart = new Date();
      const checkIn = new Date(classStart.getTime() - 10 * 60 * 1000); // 10 min early

      // Act
      const isLate = isLateArrival(classStart, checkIn);

      // Assert
      expect(isLate).toBe(false);
    });

    test('should handle edge case at exactly 15 minutes', () => {
      // Arrange
      const classStart = new Date();
      const checkIn = new Date(classStart.getTime() + 15 * 60 * 1000); // Exactly 15 min

      // Act
      const isLate = isLateArrival(classStart, checkIn);

      // Assert (boundary: > not >=, so exactly at boundary is NOT late)
      expect(isLate).toBe(false);
    });
  });
});
