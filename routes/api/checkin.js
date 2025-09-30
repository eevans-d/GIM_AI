/**
 * Check-in API Routes
 * Handles QR code check-ins, manual check-ins, and check-in validation
 * Part of PROMPT 5: Check-in QR System Implementation
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const logger = require('../../utils/logger');
const { AppError, ErrorTypes } = require('../../utils/error-handler');
const whatsappSender = require('../../whatsapp/client/sender');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * POST /api/checkin
 * Process a check-in (QR, manual, or kiosk)
 */
router.post('/checkin', async (req, res, next) => {
  const correlationId = req.correlationId;
  const log = logger.createLogger('checkin-api');
  
  try {
    const { member_id, phone, source, timestamp, class_id } = req.body;
    
    // Validate input
    if (!member_id && !phone) {
      throw new AppError(
        'Member ID or phone number required',
        ErrorTypes.VALIDATION,
        400,
        { correlationId }
      );
    }
    
    log.info('Processing check-in', {
      correlationId,
      member_id,
      phone: phone ? `${phone.substring(0, 4)}****` : null,
      source,
      class_id
    });
    
    // Step 1: Find member
    let member;
    if (member_id) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', member_id)
        .single();
      
      if (error || !data) {
        throw new AppError(
          'Member not found',
          ErrorTypes.NOT_FOUND,
          404,
          { correlationId, member_id }
        );
      }
      member = data;
    } else if (phone) {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('telefono', phone)
        .single();
      
      if (error || !data) {
        throw new AppError(
          'Phone number not registered',
          ErrorTypes.NOT_FOUND,
          404,
          { correlationId, phone: `${phone.substring(0, 4)}****` }
        );
      }
      member = data;
    }
    
    // Step 2: Check member status
    if (member.estado !== 'activo') {
      log.warn('Inactive member attempted check-in', {
        correlationId,
        member_id: member.id,
        estado: member.estado
      });
      
      return res.status(403).json({
        success: false,
        message: 'Membresía inactiva. Por favor, contacta a recepción.',
        memberName: member.nombre,
        estado: member.estado
      });
    }
    
    // Step 3: Check for overdue payments
    const { data: overduePayments, error: paymentError } = await supabase
      .from('payments')
      .select('monto, fecha_vencimiento')
      .eq('member_id', member.id)
      .eq('estado', 'overdue')
      .order('fecha_vencimiento', { ascending: true });
    
    const hasDebt = overduePayments && overduePayments.length > 0;
    const totalDebt = hasDebt 
      ? overduePayments.reduce((sum, p) => sum + parseFloat(p.monto), 0)
      : 0;
    
    // Step 4: Get class information if class_id provided
    let classInfo = null;
    if (class_id) {
      const { data: classData } = await supabase
        .from('classes')
        .select('nombre, fecha_hora, capacidad_maxima, ocupacion_actual')
        .eq('id', class_id)
        .single();
      
      classInfo = classData;
      
      // Check capacity
      if (classData && classData.ocupacion_actual >= classData.capacidad_maxima) {
        log.warn('Class at capacity', {
          correlationId,
          class_id,
          capacity: classData.capacidad_maxima,
          current: classData.ocupacion_actual
        });
        
        return res.status(409).json({
          success: false,
          message: 'Clase completa. Por favor, elige otra clase.',
          className: classData.nombre,
          capacity: classData.capacidad_maxima
        });
      }
    }
    
    // Step 5: Register check-in
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert({
        member_id: member.id,
        timestamp: timestamp || new Date().toISOString(),
        source: source || 'qr_cliente',
        class_id: class_id || null,
        has_debt: hasDebt
      })
      .select()
      .single();
    
    if (checkinError) {
      throw new AppError(
        'Failed to register check-in',
        ErrorTypes.DATABASE,
        500,
        { correlationId, error: checkinError.message }
      );
    }
    
    // Step 6: Update member's last check-in
    await supabase
      .from('members')
      .update({
        ultimo_checkin: checkin.timestamp,
        dias_streak: calculateStreak(member.ultimo_checkin, checkin.timestamp)
      })
      .eq('id', member.id);
    
    // Step 7: Update class occupancy if applicable
    if (class_id && classInfo) {
      await supabase
        .from('classes')
        .update({
          ocupacion_actual: classInfo.ocupacion_actual + 1
        })
        .eq('id', class_id);
    }
    
    // Step 8: Send WhatsApp confirmation (async)
    if (member.consentimiento_wa && member.telefono) {
      setImmediate(async () => {
        try {
          await whatsappSender.sendTemplate(
            member.telefono,
            'checkin_exitoso',
            [member.nombre, new Date().toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit'
            })]
          );
          
          // If has debt, schedule post-workout message
          if (hasDebt) {
            await schedulePostWorkoutMessage(member.id, member.telefono, totalDebt);
          }
        } catch (error) {
          log.error('Failed to send WhatsApp confirmation', {
            correlationId,
            member_id: member.id,
            error: error.message
          });
        }
      });
    }
    
    log.info('Check-in successful', {
      correlationId,
      checkin_id: checkin.id,
      member_id: member.id,
      hasDebt,
      totalDebt
    });
    
    // Step 9: Return success response
    res.status(200).json({
      success: true,
      checkinId: checkin.id,
      memberName: member.nombre,
      className: classInfo ? classInfo.nombre : null,
      hasDebt,
      debtAmount: hasDebt ? totalDebt.toFixed(2) : null,
      streak: calculateStreak(member.ultimo_checkin, checkin.timestamp),
      autoOpenWhatsApp: member.consentimiento_wa && !hasDebt
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/checkin/history/:memberId
 * Get check-in history for a member
 */
router.get('/history/:memberId', async (req, res, next) => {
  const log = logger.createLogger('checkin-api');
  const { memberId } = req.params;
  const { limit = 30, offset = 0 } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        timestamp,
        source,
        has_debt,
        classes (
          nombre,
          fecha_hora
        )
      `)
      .eq('member_id', memberId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      throw new AppError(
        'Failed to fetch check-in history',
        ErrorTypes.DATABASE,
        500,
        { memberId, error: error.message }
      );
    }
    
    res.status(200).json({
      success: true,
      checkins: data,
      total: data.length
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/checkin/manual
 * Manual check-in by staff (reception or instructor)
 */
router.post('/manual', async (req, res, next) => {
  const log = logger.createLogger('checkin-api');
  
  try {
    const { member_id, class_id, staff_id, notes } = req.body;
    
    // Validate staff authorization (simplified - add proper auth later)
    if (!staff_id) {
      throw new AppError(
        'Staff ID required for manual check-in',
        ErrorTypes.AUTHORIZATION,
        403
      );
    }
    
    // Use the main check-in logic but with manual source
    req.body.source = staff_id.startsWith('I') ? 'profesor' : 'recepcion';
    
    // Forward to main check-in endpoint logic
    // For simplicity, we'll duplicate the core logic here
    // In production, extract to a shared service
    
    const { data: checkin, error } = await supabase
      .from('checkins')
      .insert({
        member_id,
        timestamp: new Date().toISOString(),
        source: req.body.source,
        class_id,
        staff_id,
        notes
      })
      .select()
      .single();
    
    if (error) {
      throw new AppError(
        'Failed to register manual check-in',
        ErrorTypes.DATABASE,
        500,
        { error: error.message }
      );
    }
    
    log.info('Manual check-in registered', {
      checkin_id: checkin.id,
      member_id,
      staff_id,
      source: req.body.source
    });
    
    res.status(200).json({
      success: true,
      checkinId: checkin.id,
      message: 'Check-in registrado exitosamente'
    });
    
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to calculate streak days
 */
function calculateStreak(lastCheckin, currentCheckin) {
  if (!lastCheckin) return 1;
  
  const last = new Date(lastCheckin);
  const current = new Date(currentCheckin);
  const daysDiff = Math.floor((current - last) / (1000 * 60 * 60 * 24));
  
  // If last check-in was yesterday or today, increment streak
  if (daysDiff <= 1) {
    return daysDiff === 0 ? 1 : 2; // Simplified - should fetch current streak from DB
  }
  
  // Streak broken
  return 1;
}

/**
 * Helper function to schedule post-workout collection message
 */
async function schedulePostWorkoutMessage(memberId, phone, debtAmount) {
  const log = logger.createLogger('checkin-api');
  
  try {
    // Schedule message for 90 minutes after check-in
    const scheduleTime = new Date(Date.now() + 90 * 60 * 1000);
    
    // In production, use a proper job queue (Bull)
    // For now, we'll use a simple timeout (not production-ready)
    setTimeout(async () => {
      try {
        await whatsappSender.sendTemplate(
          phone,
          'post_entreno_cobranza',
          ['Usuario', debtAmount.toFixed(2)]
        );
        
        log.info('Post-workout collection message sent', {
          member_id: memberId,
          debtAmount
        });
      } catch (error) {
        log.error('Failed to send post-workout message', {
          member_id: memberId,
          error: error.message
        });
      }
    }, 90 * 60 * 1000);
    
  } catch (error) {
    log.error('Failed to schedule post-workout message', {
      member_id: memberId,
      error: error.message
    });
  }
}

module.exports = router;
