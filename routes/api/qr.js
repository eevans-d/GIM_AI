/**
 * QR Code API Routes
 * API endpoints for generating and managing QR codes
 * Part of PROMPT 5: Check-in QR System Implementation
 */

const express = require('express');
const router = express.Router();
const qrService = require('../../services/qr-service');
const logger = require('../../utils/logger');
const { AppError, ErrorTypes } = require('../../utils/error-handler');

const log = logger.createLogger('qr-api');

/**
 * GET /api/qr/member/:memberId
 * Generate QR code for a specific member
 */
router.get('/member/:memberId', async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const { width } = req.query;
    
    const qrData = await qrService.generateMemberQR(
      parseInt(memberId),
      { width: width ? parseInt(width) : undefined }
    );
    
    res.status(200).json({
      success: true,
      data: qrData
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/qr/generic
 * Generate generic kiosk QR code
 */
router.get('/generic', async (req, res, next) => {
  try {
    const { width } = req.query;
    
    const qrData = await qrService.generateGenericQR({
      width: width ? parseInt(width) : undefined
    });
    
    res.status(200).json({
      success: true,
      data: qrData
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/qr/class/:classId
 * Generate QR code for a specific class
 */
router.get('/class/:classId', async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { width } = req.query;
    
    const qrData = await qrService.generateClassQR(
      parseInt(classId),
      { width: width ? parseInt(width) : undefined }
    );
    
    res.status(200).json({
      success: true,
      data: qrData
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/qr/batch
 * Batch generate QR codes for all active members without QR codes
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { width } = req.body;
    
    log.info('Starting batch QR generation');
    
    const result = await qrService.batchGenerateQRCodes({
      width: width ? parseInt(width) : undefined
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/qr/verify
 * Verify if a QR code is valid
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { qrCode } = req.body;
    
    if (!qrCode) {
      throw new AppError(
        'QR code required',
        ErrorTypes.VALIDATION,
        400
      );
    }
    
    const result = await qrService.verifyQRCode(qrCode);
    
    res.status(200).json({
      success: true,
      data: result
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
