/**
 * Validation Utilities - Tests
 * Lightweight tests for validation functions used across the app
 */

describe('Validation Utilities', () => {
  
  /**
   * Phone number validation
   */
  describe('Phone Number Validation', () => {
    
    function isValidPhoneNumber(phone) {
      if (!phone || typeof phone !== 'string') return false;
      // Colombian format: 57+ optional, then 10 digits (Landline) or 3001234567 format
      const cleanPhone = phone.replace(/[-\s+]/g, '');
      // Either 57 + 10 digits or just 10 digits
      return /^(57)?[0-9]{10}$/.test(cleanPhone);
    }

    test('should accept valid Colombian phone numbers', () => {
      expect(isValidPhoneNumber('5730012345')).toBe(false); // Only 10 digits after 57
      expect(isValidPhoneNumber('573001234567')).toBe(true); // 57 + 10 digits
      expect(isValidPhoneNumber('3001234567')).toBe(true);   // 10 digits without 57
      expect(isValidPhoneNumber('5733001234567')).toBe(false); // 11 digits
    });

    test('should accept phone with country code', () => {
      expect(isValidPhoneNumber('+573001234567')).toBe(true);
      expect(isValidPhoneNumber('573001234567')).toBe(true);
    });

    test('should accept phone with formatting', () => {
      expect(isValidPhoneNumber('+57-300-123-4567')).toBe(true);
      expect(isValidPhoneNumber('+57 300 123 4567')).toBe(true);
    });

    test('should reject invalid formats', () => {
      expect(isValidPhoneNumber('')).toBe(false);
      expect(isValidPhoneNumber(null)).toBe(false);
      expect(isValidPhoneNumber(undefined)).toBe(false);
      expect(isValidPhoneNumber('abc')).toBe(false);
      expect(isValidPhoneNumber('123')).toBe(false);
    });
  });

  /**
   * Email validation
   */
  describe('Email Validation', () => {
    
    function isValidEmail(email) {
      if (!email || typeof email !== 'string') return false;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }

    test('should accept valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@example.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@example.com')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(isValidEmail('invalid@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('invalid.email')).toBe(false);
      expect(isValidEmail('invalid@.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail(null)).toBe(false);
    });
  });

  /**
   * UUID validation
   */
  describe('UUID Validation', () => {
    
    function isValidUUID(uuid) {
      if (!uuid || typeof uuid !== 'string') return false;
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    }

    test('should accept valid UUIDs', () => {
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    });

    test('should reject invalid UUIDs', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false);
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isValidUUID('550e8400e29b41d4a716446655440000')).toBe(false);
      expect(isValidUUID('')).toBe(false);
      expect(isValidUUID(null)).toBe(false);
    });
  });

  /**
   * Number range validation
   */
  describe('Number Range Validation', () => {
    
    function isInRange(value, min, max) {
      if (typeof value !== 'number') return false;
      return value >= min && value <= max;
    }

    test('should validate numbers within range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(0, 0, 10)).toBe(true);
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    test('should reject numbers outside range', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
      expect(isInRange(11, 0, 10)).toBe(false);
    });

    test('should handle negative ranges', () => {
      expect(isInRange(-5, -10, 0)).toBe(true);
      expect(isInRange(-5, -10, 10)).toBe(true);
      expect(isInRange(5, -10, 0)).toBe(false);
    });

    test('should handle decimal numbers', () => {
      expect(isInRange(5.5, 5, 6)).toBe(true);
      expect(isInRange(5.5, 5.6, 6)).toBe(false);
    });
  });

  /**
   * Date validation
   */
  describe('Date Validation', () => {
    
    function isValidDate(date) {
      if (date instanceof Date) {
        return !isNaN(date.getTime());
      }
      if (typeof date === 'string') {
        const d = new Date(date);
        return !isNaN(d.getTime());
      }
      return false;
    }

    function isDateBefore(date1, date2) {
      return new Date(date1) < new Date(date2);
    }

    test('should validate valid dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate('2025-01-01')).toBe(true);
      expect(isValidDate('2025-01-01T12:00:00')).toBe(true);
    });

    test('should reject invalid dates', () => {
      expect(isValidDate('invalid')).toBe(false);
      expect(isValidDate('')).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(new Date('invalid'))).toBe(false);
    });

    test('should compare dates correctly', () => {
      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-02');
      
      expect(isDateBefore(date1, date2)).toBe(true);
      expect(isDateBefore(date2, date1)).toBe(false);
      expect(isDateBefore(date1, date1)).toBe(false);
    });
  });

  /**
   * String validation
   */
  describe('String Validation', () => {
    
    function isNonEmptyString(value) {
      return typeof value === 'string' && value.trim().length > 0;
    }

    function hasMinLength(value, min) {
      return typeof value === 'string' && value.length >= min;
    }

    function hasMaxLength(value, max) {
      return typeof value === 'string' && value.length <= max;
    }

    test('should validate non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('  hello  ')).toBe(true);
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
    });

    test('should validate minimum length', () => {
      expect(hasMinLength('hello', 5)).toBe(true);
      expect(hasMinLength('hello', 4)).toBe(true);
      expect(hasMinLength('hello', 6)).toBe(false);
    });

    test('should validate maximum length', () => {
      expect(hasMaxLength('hello', 5)).toBe(true);
      expect(hasMaxLength('hello', 6)).toBe(true);
      expect(hasMaxLength('hello', 4)).toBe(false);
    });
  });

  /**
   * Array validation
   */
  describe('Array Validation', () => {
    
    function isNonEmptyArray(value) {
      return Array.isArray(value) && value.length > 0;
    }

    function hasArrayLength(value, expectedLength) {
      return Array.isArray(value) && value.length === expectedLength;
    }

    test('should validate non-empty arrays', () => {
      expect(isNonEmptyArray([1, 2, 3])).toBe(true);
      expect(isNonEmptyArray([])).toBe(false);
      expect(isNonEmptyArray(null)).toBe(false);
      expect(isNonEmptyArray('not an array')).toBe(false);
    });

    test('should validate array length', () => {
      expect(hasArrayLength([1, 2, 3], 3)).toBe(true);
      expect(hasArrayLength([1, 2, 3], 2)).toBe(false);
      expect(hasArrayLength([], 0)).toBe(true);
    });
  });

  /**
   * Boolean coercion
   */
  describe('Boolean Coercion', () => {
    
    function isTruthy(value) {
      return !!value;
    }

    function isFalsy(value) {
      return !value;
    }

    test('should correctly identify truthy values', () => {
      expect(isTruthy(true)).toBe(true);
      expect(isTruthy(1)).toBe(true);
      expect(isTruthy('text')).toBe(true);
      expect(isTruthy([])).toBe(true);
      expect(isTruthy({})).toBe(true);
    });

    test('should correctly identify falsy values', () => {
      expect(isFalsy(false)).toBe(true);
      expect(isFalsy(0)).toBe(true);
      expect(isFalsy('')).toBe(true);
      expect(isFalsy(null)).toBe(true);
      expect(isFalsy(undefined)).toBe(true);
    });
  });
});
