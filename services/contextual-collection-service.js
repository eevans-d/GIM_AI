/**
 * PROMPT 7: Contextual Collection Service
 * Servicio de cobranza contextual post-entrenamiento
 * 
 * Funcionalidades:
 * - Detectar deuda de miembros
 * - Programar mensajes 90 min después del check-in
 * - Generar links de pago (MercadoPago)
 * - Tracking de conversión
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const Queue = require('bull');
const axios = require('axios');

const log = logger.createLogger('contextual-collection');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Message queue for scheduled collections
const collectionQueue = new Queue('contextual-collections', 
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000 // 1 minuto
      },
      removeOnComplete: true,
      removeOnFail: false
    }
  }
);

// Configuración
const CONFIG = {
  DELAY_MINUTES: parseInt(process.env.COLLECTION_DELAY_MINUTES) || 90,
  MIN_DEBT_AMOUNT: parseFloat(process.env.COLLECTION_MIN_DEBT_AMOUNT) || 100,
  CONVERSION_TARGET: parseFloat(process.env.COLLECTION_CONVERSION_TARGET) || 0.68,
  MERCADOPAGO_ACCESS_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN,
  MERCADOPAGO_API_URL: 'https://api.mercadopago.com/v1'
};

/**
 * Detectar deuda de un miembro
 * @param {string} memberId - ID del miembro
 * @returns {Promise<object|null>} Información de deuda o null si no tiene
 */
async function detectMemberDebt(memberId) {
  try {
    log.info('Detecting member debt', { member_id: memberId });

    const { data, error } = await supabase
      .rpc('detect_member_debt', { p_member_id: memberId });

    if (error) {
      throw new AppError(
        `Error detecting debt: ${error.message}`,
        ErrorTypes.DATABASE,
        500,
        { member_id: memberId, error }
      );
    }

    if (!data || data.length === 0) {
      log.info('No debt found for member', { member_id: memberId });
      return null;
    }

    const debtInfo = data[0];
    
    log.info('Debt detected', {
      member_id: memberId,
      debt_amount: debtInfo.debt_amount,
      days_overdue: debtInfo.days_overdue
    });

    return debtInfo;
  } catch (error) {
    log.error('Error detecting member debt', {
      member_id: memberId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Generar link de pago con MercadoPago
 * @param {string} memberId - ID del miembro
 * @param {number} amount - Monto a cobrar
 * @param {string} collectionId - ID de la collection
 * @returns {Promise<string>} URL del payment link
 */
async function generatePaymentLink(memberId, amount, collectionId) {
  try {
    log.info('Generating payment link', {
      member_id: memberId,
      amount,
      collection_id: collectionId
    });

    if (!CONFIG.MERCADOPAGO_ACCESS_TOKEN) {
      log.warn('MercadoPago not configured, returning mock link');
      return `https://gim-ai.com/pay/${collectionId}`;
    }

    // Obtener información del miembro
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('first_name, last_name, email, phone')
      .eq('id', memberId)
      .single();

    if (memberError) {
      throw new AppError(
        'Member not found',
        ErrorTypes.NOT_FOUND,
        404,
        { member_id: memberId }
      );
    }

    // Crear preferencia de pago en MercadoPago
    const preference = {
      items: [
        {
          title: 'Pago de Membresía - GIM_AI',
          description: `Pago de cuota atrasada - ${member.first_name} ${member.last_name}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS'
        }
      ],
      payer: {
        name: member.first_name,
        surname: member.last_name,
        email: member.email || `${member.phone}@gim-ai.com`,
        phone: {
          number: member.phone
        }
      },
      external_reference: collectionId,
      notification_url: `${process.env.APP_BASE_URL}/api/collection/webhook`,
      back_urls: {
        success: `${process.env.APP_BASE_URL}/payment-success`,
        failure: `${process.env.APP_BASE_URL}/payment-failure`,
        pending: `${process.env.APP_BASE_URL}/payment-pending`
      },
      auto_return: 'approved',
      statement_descriptor: 'GIM_AI'
    };

    const response = await axios.post(
      `${CONFIG.MERCADOPAGO_API_URL}/checkout/preferences`,
      preference,
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.MERCADOPAGO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const paymentLink = response.data.init_point;

    log.info('Payment link generated', {
      member_id: memberId,
      collection_id: collectionId,
      payment_link: paymentLink
    });

    return paymentLink;
  } catch (error) {
    log.error('Error generating payment link', {
      member_id: memberId,
      amount,
      error: error.message
    });
    throw new AppError(
      'Failed to generate payment link',
      ErrorTypes.EXTERNAL_API,
      500,
      { member_id: memberId, original_error: error.message }
    );
  }
}

/**
 * Programar mensaje de cobranza
 * @param {string} checkinId - ID del check-in
 * @param {number} delayMinutes - Minutos de delay (default: 90)
 * @returns {Promise<object>} Información de la collection programada
 */
async function schedulePostWorkoutCollection(checkinId, delayMinutes = CONFIG.DELAY_MINUTES) {
  try {
    log.info('Scheduling post-workout collection', {
      checkin_id: checkinId,
      delay_minutes: delayMinutes
    });

    // Verificar que el check-in existe
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .select('*, members(*), classes(*)')
      .eq('id', checkinId)
      .single();

    if (checkinError || !checkin) {
      throw new AppError(
        'Check-in not found',
        ErrorTypes.NOT_FOUND,
        404,
        { checkin_id: checkinId }
      );
    }

    // Detectar deuda
    const debtInfo = await detectMemberDebt(checkin.member_id);
    
    if (!debtInfo || debtInfo.debt_amount < CONFIG.MIN_DEBT_AMOUNT) {
      log.info('Debt below threshold, skipping collection', {
        checkin_id: checkinId,
        member_id: checkin.member_id,
        debt_amount: debtInfo?.debt_amount || 0
      });
      return { skipped: true, reason: 'debt_below_threshold' };
    }

    // Calcular timestamp de envío
    const scheduledFor = new Date(checkin.fecha_hora);
    scheduledFor.setMinutes(scheduledFor.getMinutes() + delayMinutes);

    // Crear registro de collection (si no existe ya por el trigger)
    const { data: existingCollection } = await supabase
      .from('collections')
      .select('id')
      .eq('checkin_id', checkinId)
      .single();

    let collectionId;

    if (existingCollection) {
      collectionId = existingCollection.id;
      log.info('Collection already exists (created by trigger)', {
        collection_id: collectionId,
        checkin_id: checkinId
      });
    } else {
      // Crear manualmente si el trigger no lo creó
      const { data: newCollection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          member_id: checkin.member_id,
          checkin_id: checkinId,
          debt_amount: debtInfo.debt_amount,
          original_debt: debtInfo.debt_amount,
          class_name: checkin.classes?.name || 'Clase',
          class_type: checkin.classes?.class_type || 'general',
          scheduled_for: scheduledFor.toISOString(),
          status: 'scheduled'
        })
        .select()
        .single();

      if (collectionError) {
        throw new AppError(
          'Failed to create collection',
          ErrorTypes.DATABASE,
          500,
          { checkin_id: checkinId, error: collectionError }
        );
      }

      collectionId = newCollection.id;
    }

    // Generar payment link
    const paymentLink = await generatePaymentLink(
      checkin.member_id,
      debtInfo.debt_amount,
      collectionId
    );

    // Actualizar collection con payment link
    await supabase
      .from('collections')
      .update({ payment_link: paymentLink })
      .eq('id', collectionId);

    // Agregar job a la queue
    const delayMs = delayMinutes * 60 * 1000;
    await collectionQueue.add(
      'send-collection-message',
      {
        collectionId,
        memberId: checkin.member_id,
        memberName: `${checkin.members.first_name} ${checkin.members.last_name}`,
        phone: checkin.members.phone,
        debtAmount: debtInfo.debt_amount,
        className: checkin.classes?.name || 'tu clase',
        paymentLink
      },
      {
        delay: delayMs,
        jobId: `collection_${collectionId}`
      }
    );

    log.info('Collection scheduled successfully', {
      collection_id: collectionId,
      checkin_id: checkinId,
      scheduled_for: scheduledFor.toISOString(),
      delay_minutes: delayMinutes
    });

    return {
      collectionId,
      scheduledFor: scheduledFor.toISOString(),
      debtAmount: debtInfo.debt_amount,
      paymentLink
    };
  } catch (error) {
    log.error('Error scheduling post-workout collection', {
      checkin_id: checkinId,
      error: error.message
    });
    throw error;
  }
}

/**
 * Obtener estadísticas de conversión
 * @param {number} days - Días a analizar (default: 30)
 * @returns {Promise<object>} Estadísticas de conversión
 */
async function getConversionStats(days = 30) {
  try {
    const { data, error } = await supabase
      .rpc('get_collection_conversion_stats', { p_days: days });

    if (error) {
      throw new AppError(
        'Failed to get conversion stats',
        ErrorTypes.DATABASE,
        500,
        { error }
      );
    }

    return data[0] || {
      total_sent: 0,
      total_paid: 0,
      conversion_rate: 0,
      avg_conversion_time_minutes: 0,
      total_collected: 0
    };
  } catch (error) {
    log.error('Error getting conversion stats', { error: error.message });
    throw error;
  }
}

/**
 * Marcar collection como pagada
 * @param {string} collectionId - ID de la collection
 * @param {number} paymentAmount - Monto pagado
 * @returns {Promise<object>} Collection actualizada
 */
async function markCollectionAsPaid(collectionId, paymentAmount) {
  try {
    log.info('Marking collection as paid', {
      collection_id: collectionId,
      payment_amount: paymentAmount
    });

    // Obtener collection
    const { data: collection, error: fetchError } = await supabase
      .from('collections')
      .select('*')
      .eq('id', collectionId)
      .single();

    if (fetchError || !collection) {
      throw new AppError(
        'Collection not found',
        ErrorTypes.NOT_FOUND,
        404,
        { collection_id: collectionId }
      );
    }

    // Calcular tiempo de conversión
    const messageSentAt = new Date(collection.message_sent_at);
    const now = new Date();
    const conversionTimeMinutes = Math.round((now - messageSentAt) / 60000);

    // Actualizar collection
    const { data: updated, error: updateError } = await supabase
      .from('collections')
      .update({
        status: 'paid',
        payment_received_at: now.toISOString(),
        payment_amount: paymentAmount,
        conversion_time_minutes: conversionTimeMinutes
      })
      .eq('id', collectionId)
      .select()
      .single();

    if (updateError) {
      throw new AppError(
        'Failed to update collection',
        ErrorTypes.DATABASE,
        500,
        { collection_id: collectionId, error: updateError }
      );
    }

    log.info('Collection marked as paid', {
      collection_id: collectionId,
      conversion_time_minutes: conversionTimeMinutes
    });

    return updated;
  } catch (error) {
    log.error('Error marking collection as paid', {
      collection_id: collectionId,
      error: error.message
    });
    throw error;
  }
}

module.exports = {
  detectMemberDebt,
  generatePaymentLink,
  schedulePostWorkoutCollection,
  getConversionStats,
  markCollectionAsPaid,
  collectionQueue
};
