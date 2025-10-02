/**
 * PROMPT 7: Collection API Routes
 * Endpoints para sistema de cobranza contextual
 */

const express = require('express');
const router = express.Router();
const { createLogger } = require('../../utils/logger');
const { AppError, ErrorTypes } = require('../../utils/error-handler');
const collectionService = require('../../services/contextual-collection-service');

const log = createLogger('collection-api');

/**
 * POST /api/collection/schedule
 * Programar cobranza contextual manualmente
 */
router.post('/schedule', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { checkin_id, delay_minutes } = req.body;

    if (!checkin_id) {
      throw new AppError(
        'checkin_id is required',
        ErrorTypes.VALIDATION,
        400,
        { correlationId }
      );
    }

    log.info('Manual collection schedule requested', {
      correlationId,
      checkin_id,
      delay_minutes
    });

    const result = await collectionService.schedulePostWorkoutCollection(
      checkin_id,
      delay_minutes
    );

    res.status(200).json({
      success: true,
      message: result.skipped 
        ? 'Collection skipped (debt below threshold)' 
        : 'Collection scheduled successfully',
      data: result
    });
  } catch (error) {
    log.error('Error scheduling collection', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * GET /api/collection/stats
 * Obtener estadísticas de conversión
 */
router.get('/stats', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { days } = req.query;
    const daysInt = days ? parseInt(days) : 30;

    log.info('Collection stats requested', {
      correlationId,
      days: daysInt
    });

    const stats = await collectionService.getConversionStats(daysInt);

    res.status(200).json({
      success: true,
      data: stats,
      period_days: daysInt
    });
  } catch (error) {
    log.error('Error fetching collection stats', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/collection/webhook
 * Webhook de MercadoPago para notificaciones de pago
 */
router.post('/webhook', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { type, data } = req.body;

    log.info('MercadoPago webhook received', {
      correlationId,
      type,
      data
    });

    // Validar firma de MercadoPago (implementar según docs)
    // const signature = req.headers['x-signature'];
    // validateSignature(signature, req.body);

    if (type === 'payment') {
      const paymentId = data.id;
      
      // Consultar detalles del pago
      const axios = require('axios');
      const paymentResponse = await axios.get(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
          }
        }
      );

      const payment = paymentResponse.data;
      
      if (payment.status === 'approved') {
        const collectionId = payment.external_reference;
        const paymentAmount = payment.transaction_amount;

        // Marcar collection como pagada
        await collectionService.markCollectionAsPaid(collectionId, paymentAmount);

        // Actualizar tabla payments del miembro
        // TODO: Implementar actualización de deuda

        log.info('Payment processed successfully', {
          correlationId,
          collection_id: collectionId,
          payment_amount: paymentAmount
        });
      }
    }

    // MercadoPago requiere respuesta 200
    res.status(200).json({ success: true });
  } catch (error) {
    log.error('Error processing webhook', {
      correlationId,
      error: error.message
    });
    // No hacer next(error) para no retornar 500 a MercadoPago
    res.status(200).json({ success: false });
  }
});

/**
 * GET /api/collection/:id
 * Obtener detalles de una collection específica
 */
router.get('/:id', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { id } = req.params;

    log.info('Collection details requested', {
      correlationId,
      collection_id: id
    });

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data, error } = await supabase
      .from('collections')
      .select('*, members(*), checkins(*, classes(*))')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new AppError(
        'Collection not found',
        ErrorTypes.NOT_FOUND,
        404,
        { collection_id: id }
      );
    }

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    log.error('Error fetching collection', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

/**
 * POST /api/collection/test-debt/:memberId
 * Endpoint de testing para verificar deuda de un miembro
 */
router.post('/test-debt/:memberId', async (req, res, next) => {
  const correlationId = req.correlationId;
  
  try {
    const { memberId } = req.params;

    log.info('Testing debt detection', {
      correlationId,
      member_id: memberId
    });

    const debtInfo = await collectionService.detectMemberDebt(memberId);

    res.status(200).json({
      success: true,
      has_debt: !!debtInfo,
      data: debtInfo
    });
  } catch (error) {
    log.error('Error testing debt detection', {
      correlationId,
      error: error.message
    });
    next(error);
  }
});

module.exports = router;
