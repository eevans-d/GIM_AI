/**
 * Reminder API Routes
 * Manual triggers for testing and admin control
 * Part of PROMPT 6: Automated Reminders System
 */

const express = require('express');
const router = express.Router();
const reminderService = require('../../services/reminder-service');
const logger = require('../../utils/logger');

const log = logger.createLogger('reminder-api');

/**
 * POST /api/reminders/class/24h
 * Manually trigger 24h class reminders
 */
router.post('/class/24h', async (req, res, next) => {
  try {
    log.info('Manual trigger: 24h class reminders');
    
    // Run in background
    setImmediate(() => reminderService.sendClassReminders24h());
    
    res.status(200).json({
      success: true,
      message: '24h class reminders triggered successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reminders/class/2h
 * Manually trigger 2h class reminders
 */
router.post('/class/2h', async (req, res, next) => {
  try {
    log.info('Manual trigger: 2h class reminders');
    
    setImmediate(() => reminderService.sendClassReminders2h());
    
    res.status(200).json({
      success: true,
      message: '2h class reminders triggered successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reminders/payment/d0
 * Manually trigger D0 payment reminders
 */
router.post('/payment/d0', async (req, res, next) => {
  try {
    log.info('Manual trigger: D0 payment reminders');
    
    setImmediate(() => reminderService.sendPaymentRemindersD0());
    
    res.status(200).json({
      success: true,
      message: 'D0 payment reminders triggered successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reminders/payment/d3
 * Manually trigger D3 payment reminders
 */
router.post('/payment/d3', async (req, res, next) => {
  try {
    log.info('Manual trigger: D3 payment reminders');
    
    setImmediate(() => reminderService.sendPaymentRemindersD3());
    
    res.status(200).json({
      success: true,
      message: 'D3 payment reminders triggered successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reminders/payment/d7
 * Manually trigger D7 payment reminders
 */
router.post('/payment/d7', async (req, res, next) => {
  try {
    log.info('Manual trigger: D7 payment reminders');
    
    setImmediate(() => reminderService.sendPaymentRemindersD7());
    
    res.status(200).json({
      success: true,
      message: 'D7 payment reminders triggered successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reminders/payment/critical
 * Manually trigger critical overdue payment check
 */
router.post('/payment/critical', async (req, res, next) => {
  try {
    log.info('Manual trigger: critical overdue payment check');
    
    setImmediate(() => reminderService.flagCriticalOverduePayments());
    
    res.status(200).json({
      success: true,
      message: 'Critical overdue payment check triggered successfully'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reminders/status
 * Get reminder system status
 */
router.get('/status', async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      status: 'operational',
      scheduledJobs: {
        'class-24h': '0 9 * * * (Daily at 9:00 AM)',
        'class-2h': '0 * * * * (Hourly)',
        'payment-d0': '0 9 * * * (Daily at 9:00 AM)',
        'payment-d3': '0 10 * * * (Daily at 10:00 AM)',
        'payment-d7': '0 11 * * * (Daily at 11:00 AM)',
        'critical-check': '0 8 * * * (Daily at 8:00 AM)'
      },
      businessHours: '9:00 - 21:00',
      maxMessagesPerDay: 2
    });
    
  } catch (error) {
    next(error);
  }
});

module.exports = router;
