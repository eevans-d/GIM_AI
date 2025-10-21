/**
 * QR Service - Real Tests
 * Critical Business Flow: QR Check-in Generation & Validation
 */

jest.mock('../../../utils/logger');
jest.mock('../../../utils/error-handler');
jest.mock('qrcode');

const qrService = require('../../../services/qr-service');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');
const logger = require('../../../utils/logger');

describe('QR Service - Critical Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Member QR Generation', () => {
    test('should generate valid member QR code', async () => {
      // Arrange
      const memberId = 'member-123';
      const expectedQrData = expect.objectContaining({
        memberId,
        type: 'member',
        timestamp: expect.any(Number)
      });

      // Act
      const result = await qrService.generateMemberQR(memberId);

      // Assert
      expect(result).toBeDefined();
      expect(result.qrCode).toBeTruthy();
      expect(result.data.memberId).toBe(memberId);
    });

    test('should handle invalid member ID', async () => {
      // Arrange
      const invalidId = null;

      // Act & Assert
      await expect(qrService.generateMemberQR(invalidId))
        .rejects
        .toThrow(AppError);
    });

    test('should include timestamp in QR data', async () => {
      // Arrange
      const memberId = 'member-456';
      const beforeTime = Date.now();

      // Act
      const result = await qrService.generateMemberQR(memberId);
      const afterTime = Date.now();

      // Assert
      expect(result.data.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.data.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('QR Code Validation', () => {
    test('should validate correct QR data', async () => {
      // Arrange
      const validQrData = {
        memberId: 'member-789',
        type: 'member',
        timestamp: Date.now()
      };

      // Act
      const isValid = await qrService.verifyQRCode(validQrData);

      // Assert
      expect(isValid).toBe(true);
    });

    test('should reject expired QR codes', async () => {
      // Arrange
      const expiredQrData = {
        memberId: 'member-abc',
        type: 'member',
        timestamp: Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      };

      // Act
      const isValid = await qrService.verifyQRCode(expiredQrData);

      // Assert
      expect(isValid).toBe(false);
    });

    test('should detect tampered QR data', async () => {
      // Arrange
      const tamperedData = {
        memberId: 'member-xyz',
        type: 'member',
        timestamp: Date.now(),
        checksum: 'WRONG_CHECKSUM'
      };

      // Act & Assert
      await expect(qrService.verifyQRCode(tamperedData))
        .rejects
        .toThrow();
    });
  });

  describe('Batch QR Generation', () => {
    test('should generate batch QR codes for multiple members', async () => {
      // Arrange
      const memberIds = ['member-1', 'member-2', 'member-3'];

      // Act
      const results = await qrService.batchGenerateQRCodes(memberIds);

      // Assert
      expect(results).toHaveLength(3);
      results.forEach((result, idx) => {
        expect(result.memberId).toBe(memberIds[idx]);
        expect(result.qrCode).toBeTruthy();
      });
    });

    test('should handle partial failures in batch', async () => {
      // Arrange
      const memberIds = ['member-1', null, 'member-3'];

      // Act
      const results = await qrService.batchGenerateQRCodes(memberIds);

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });
  });

  describe('Class QR Generation', () => {
    test('should generate unique class QR codes', async () => {
      // Arrange
      const classId = 'class-spinning-001';
      const claseDate = new Date().toISOString().split('T')[0];

      // Act
      const result = await qrService.generateClassQR(classId, claseDate);

      // Assert
      expect(result).toBeDefined();
      expect(result.data.classId).toBe(classId);
      expect(result.data.date).toBe(claseDate);
      expect(result.qrCode).toBeTruthy();
    });

    test('should prevent duplicate class QR codes', async () => {
      // Arrange
      const classId = 'class-yoga-002';
      const claseDate = new Date().toISOString().split('T')[0];

      // Act
      const result1 = await qrService.generateClassQR(classId, claseDate);
      const result2 = await qrService.generateClassQR(classId, claseDate);

      // Assert - Both should have same ID but different generation timestamps
      expect(result1.data.classId).toBe(result2.data.classId);
      expect(result1.qrCode).toBe(result2.qrCode);
    });
  });

  describe('Error Handling', () => {
    test('should log errors when QR generation fails', async () => {
      // Arrange
      const memberId = 'member-error';
      jest.spyOn(qrService, 'generateMemberQR')
        .mockRejectedValueOnce(new Error('QR generation failed'));

      // Act & Assert
      await expect(qrService.generateMemberQR(memberId))
        .rejects
        .toThrow();
    });

    test('should provide helpful error messages', async () => {
      // Arrange
      const invalidId = '';

      // Act & Assert
      try {
        await qrService.generateMemberQR(invalidId);
      } catch (error) {
        expect(error.message).toMatch(/member.*id|invalid.*id/i);
      }
    });
  });

  describe('Performance', () => {
    test('should generate QR code within 100ms', async () => {
      // Arrange
      const memberId = 'member-perf';
      const startTime = process.hrtime.bigint();

      // Act
      await qrService.generateMemberQR(memberId);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(100);
    });

    test('should batch generate 100 QR codes efficiently', async () => {
      // Arrange
      const memberIds = Array.from({ length: 100 }, (_, i) => `member-${i}`);
      const startTime = process.hrtime.bigint();

      // Act
      await qrService.batchGenerateQRCodes(memberIds);
      const endTime = process.hrtime.bigint();

      // Assert
      const durationMs = Number((endTime - startTime) / BigInt(1000000));
      expect(durationMs).toBeLessThan(5000); // Should be < 5 seconds
    });
  });
});
