/**
 * PROMPT 9: Replacement Service
 * Gestión de ausencias y reemplazos de instructores con matching inteligente
 */

const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');
const logger = require('../utils/logger');
const { AppError, ErrorTypes } = require('../utils/error-handler');

const log = logger.createLogger('replacement-service');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Bull queue para procesamiento asíncrono
const replacementQueue = new Bull('replacement-queue', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

/**
 * Registrar ausencia de instructor (desde WhatsApp o panel)
 */
async function reportAbsence(instructorId, message, reason = 'other') {
  log.info('Reporting instructor absence', { instructor_id: instructorId });

  try {
    // Usar función SQL para parsear y registrar
    const { data, error } = await supabase
      .rpc('register_instructor_absence', {
        p_instructor_id: instructorId,
        p_message: message,
        p_reason: reason
      });

    if (error) {
      log.error('Error registering absence', { error: error.message });
      throw new AppError(
        'Failed to register absence',
        ErrorTypes.DATABASE_ERROR,
        500,
        { instructor_id: instructorId, error: error.message }
      );
    }

    const result = data[0];

    if (!result.success) {
      throw new AppError(
        result.error_message,
        ErrorTypes.VALIDATION_ERROR,
        400,
        { parsed_date: result.parsed_date, parsed_time: result.parsed_time }
      );
    }

    log.info('Absence registered successfully', {
      replacement_id: result.replacement_id,
      class_id: result.class_id,
      bonus_tier: result.bonus_tier
    });

    // Iniciar búsqueda de reemplazo
    await findAndOfferReplacement(result.replacement_id);

    return {
      replacement_id: result.replacement_id,
      parsed_date: result.parsed_date,
      parsed_time: result.parsed_time,
      confidence: result.confidence,
      class_name: result.class_name,
      bonus_amount: result.bonus_amount,
      bonus_tier: result.bonus_tier
    };
  } catch (error) {
    log.error('Error in reportAbsence', { error: error.message });
    throw error;
  }
}

/**
 * Buscar candidatos y enviar ofertas de reemplazo
 */
async function findAndOfferReplacement(replacementId, maxCandidates = 5) {
  log.info('Finding replacement candidates', { replacement_id: replacementId });

  try {
    // Obtener candidatos ordenados por score
    const { data: candidates, error } = await supabase
      .rpc('match_replacement_candidates', {
        p_replacement_id: replacementId,
        p_max_candidates: maxCandidates
      });

    if (error || !candidates || candidates.length === 0) {
      log.warn('No suitable candidates found', { replacement_id: replacementId });
      
      // Marcar como no se encontró reemplazo
      await supabase
        .from('replacements')
        .update({ 
          status: 'cancelled',
          candidates_contacted: 0
        })
        .eq('id', replacementId);

      throw new AppError(
        'No suitable replacement candidates found',
        ErrorTypes.NOT_FOUND,
        404,
        { replacement_id: replacementId }
      );
    }

    log.info('Found candidates', {
      replacement_id: replacementId,
      count: candidates.length,
      top_score: candidates[0].priority_score
    });

    // Obtener configuración de expiración
    const { data: config } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'replacement_offer_expiry_minutes')
      .single();

    const expiryMinutes = parseInt(config?.value || '30');

    // Enviar ofertas a los candidatos (secuencialmente por prioridad)
    const firstCandidate = candidates[0];
    await sendReplacementOffer(
      replacementId,
      firstCandidate.instructor_id,
      firstCandidate.priority_score,
      1, // Primera oferta
      expiryMinutes
    );

    // Guardar candidatos restantes por si el primero rechaza
    await supabase
      .from('replacements')
      .update({
        status: 'offered',
        candidates_contacted: 1,
        candidate_ids: candidates.map(c => c.instructor_id),
        first_offer_sent_at: new Date().toISOString()
      })
      .eq('id', replacementId);

    return {
      candidates_found: candidates.length,
      first_offer_sent_to: firstCandidate.instructor_name,
      priority_score: firstCandidate.priority_score,
      expiry_minutes: expiryMinutes
    };
  } catch (error) {
    log.error('Error in findAndOfferReplacement', { error: error.message });
    throw error;
  }
}

/**
 * Enviar oferta de reemplazo a un candidato
 */
async function sendReplacementOffer(
  replacementId,
  instructorId,
  priorityScore,
  sequence,
  expiryMinutes
) {
  log.info('Sending replacement offer', {
    replacement_id: replacementId,
    instructor_id: instructorId,
    sequence
  });

  try {
    // Crear registro de oferta
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    const { data: offer, error: offerError } = await supabase
      .from('replacement_offers')
      .insert({
        replacement_id: replacementId,
        instructor_id: instructorId,
        priority_score: priorityScore,
        offer_sequence: sequence,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (offerError) {
      throw new AppError(
        'Failed to create offer record',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: offerError.message }
      );
    }

    // Obtener datos para el mensaje
    const { data: replacement } = await supabase
      .from('replacements')
      .select(`
        *,
        classes(nombre, ubicacion),
        instructors!replacements_original_instructor_id_fkey(nombre)
      `)
      .eq('id', replacementId)
      .single();

    const { data: candidate } = await supabase
      .from('instructors')
      .select('nombre, telefono')
      .eq('id', instructorId)
      .single();

    // Contar estudiantes inscritos
    const { count: studentsCount } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('clase_id', replacement.class_id)
      .eq('fecha_reserva', replacement.scheduled_date);

    // Formatear fecha/hora
    const dateFormatted = new Date(replacement.scheduled_date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });

    // Encolar mensaje WhatsApp
    await replacementQueue.add('send-offer', {
      offer_id: offer.id,
      replacement_id: replacementId,
      instructor_id: instructorId,
      phone: candidate.telefono,
      template_data: {
        candidate_name: candidate.nombre,
        original_instructor_name: replacement.instructors.nombre,
        class_type: replacement.class_type,
        date: dateFormatted,
        time: replacement.scheduled_time,
        bonus_amount: replacement.bonus_amount,
        expiry_minutes: expiryMinutes,
        enrolled_students: studentsCount || 0
      }
    });

    log.info('Replacement offer sent', {
      offer_id: offer.id,
      instructor_id: instructorId,
      expires_at: expiresAt.toISOString()
    });

    return offer;
  } catch (error) {
    log.error('Error sending replacement offer', { error: error.message });
    throw error;
  }
}

/**
 * Procesar respuesta a oferta de reemplazo (aceptar/rechazar)
 */
async function processOfferResponse(offerId, accepted, declineReason = null) {
  log.info('Processing offer response', { offer_id: offerId, accepted });

  try {
    // Obtener oferta y reemplazo
    const { data: offer, error } = await supabase
      .from('replacement_offers')
      .select(`
        *,
        replacements(*)
      `)
      .eq('id', offerId)
      .single();

    if (error || !offer) {
      throw new AppError(
        'Offer not found',
        ErrorTypes.NOT_FOUND,
        404,
        { offer_id: offerId }
      );
    }

    // Verificar que no haya expirado
    if (new Date() > new Date(offer.expires_at)) {
      await supabase
        .from('replacement_offers')
        .update({ status: 'expired' })
        .eq('id', offerId);

      throw new AppError(
        'Offer has expired',
        ErrorTypes.VALIDATION_ERROR,
        400,
        { offer_id: offerId, expires_at: offer.expires_at }
      );
    }

    if (accepted) {
      return await acceptReplacementOffer(offer);
    } else {
      return await declineReplacementOffer(offer, declineReason);
    }
  } catch (error) {
    log.error('Error processing offer response', { error: error.message });
    throw error;
  }
}

/**
 * Aceptar oferta de reemplazo
 */
async function acceptReplacementOffer(offer) {
  log.info('Accepting replacement offer', {
    offer_id: offer.id,
    instructor_id: offer.instructor_id
  });

  try {
    const acceptedAt = new Date().toISOString();

    // Actualizar oferta
    await supabase
      .from('replacement_offers')
      .update({
        status: 'accepted',
        responded_at: acceptedAt
      })
      .eq('id', offer.id);

    // Calcular tiempo de llenado
    const timeToFill = Math.round(
      (new Date(acceptedAt) - new Date(offer.replacements.first_offer_sent_at)) / 60000
    );

    // Actualizar reemplazo
    await supabase
      .from('replacements')
      .update({
        status: 'accepted',
        replacement_instructor_id: offer.instructor_id,
        accepted_at: acceptedAt,
        time_to_fill_minutes: timeToFill
      })
      .eq('id', offer.replacement_id);

    // Actualizar clase con nuevo instructor
    await supabase
      .from('classes')
      .update({ instructor_id: offer.instructor_id })
      .eq('id', offer.replacements.class_id);

    log.info('Replacement accepted, notifying parties', {
      replacement_id: offer.replacement_id,
      time_to_fill: timeToFill
    });

    // Enviar notificaciones
    await notifyReplacementAccepted(offer.replacement_id);

    return {
      success: true,
      replacement_id: offer.replacement_id,
      instructor_id: offer.instructor_id,
      bonus_amount: offer.replacements.bonus_amount,
      time_to_fill_minutes: timeToFill
    };
  } catch (error) {
    log.error('Error accepting offer', { error: error.message });
    throw error;
  }
}

/**
 * Rechazar oferta de reemplazo
 */
async function declineReplacementOffer(offer, reason) {
  log.info('Declining replacement offer', {
    offer_id: offer.id,
    reason
  });

  try {
    // Actualizar oferta
    await supabase
      .from('replacement_offers')
      .update({
        status: 'declined',
        responded_at: new Date().toISOString(),
        decline_reason: reason
      })
      .eq('id', offer.id);

    // Buscar siguiente candidato
    const { data: replacement } = await supabase
      .from('replacements')
      .select('candidate_ids, candidates_contacted')
      .eq('id', offer.replacement_id)
      .single();

    const nextCandidateIndex = replacement.candidates_contacted;

    if (nextCandidateIndex < replacement.candidate_ids.length) {
      // Hay más candidatos, enviar al siguiente
      const nextCandidateId = replacement.candidate_ids[nextCandidateIndex];

      await sendReplacementOffer(
        offer.replacement_id,
        nextCandidateId,
        90 - (nextCandidateIndex * 10), // Score decreciente
        nextCandidateIndex + 1,
        30 // expiryMinutes
      );

      await supabase
        .from('replacements')
        .update({
          candidates_contacted: nextCandidateIndex + 1
        })
        .eq('id', offer.replacement_id);

      log.info('Sent offer to next candidate', {
        replacement_id: offer.replacement_id,
        next_candidate: nextCandidateId,
        sequence: nextCandidateIndex + 1
      });
    } else {
      // No hay más candidatos
      await supabase
        .from('replacements')
        .update({ status: 'cancelled' })
        .eq('id', offer.replacement_id);

      log.warn('No more candidates available', {
        replacement_id: offer.replacement_id
      });
    }

    return {
      success: true,
      declined: true,
      next_candidate_contacted: nextCandidateIndex < replacement.candidate_ids.length
    };
  } catch (error) {
    log.error('Error declining offer', { error: error.message });
    throw error;
  }
}

/**
 * Notificar a todas las partes cuando se acepta un reemplazo
 */
async function notifyReplacementAccepted(replacementId) {
  log.info('Notifying replacement accepted', { replacement_id: replacementId });

  try {
    // Obtener datos completos
    const { data: replacement } = await supabase
      .from('replacements')
      .select(`
        *,
        classes(nombre, ubicacion),
        original:instructors!replacements_original_instructor_id_fkey(id, nombre, telefono),
        replacement:instructors!replacements_replacement_instructor_id_fkey(id, nombre, telefono)
      `)
      .eq('id', replacementId)
      .single();

    // Contar estudiantes
    const { count: studentsCount } = await supabase
      .from('reservas')
      .select('*', { count: 'exact', head: true })
      .eq('clase_id', replacement.class_id)
      .eq('fecha_reserva', replacement.scheduled_date);

    const dateFormatted = new Date(replacement.scheduled_date).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit'
    });

    // 1. Notificar al instructor de reemplazo
    await replacementQueue.add('send-confirmation', {
      replacement_id: replacementId,
      instructor_id: replacement.replacement.id,
      phone: replacement.replacement.telefono,
      template_data: {
        instructor_name: replacement.replacement.nombre,
        class_type: replacement.class_type,
        date: dateFormatted,
        time: replacement.scheduled_time,
        bonus_amount: replacement.bonus_amount,
        location: replacement.classes.ubicacion,
        enrolled_students: studentsCount || 0
      }
    });

    // 2. Notificar al instructor original
    await replacementQueue.add('send-original-notification', {
      replacement_id: replacementId,
      instructor_id: replacement.original.id,
      phone: replacement.original.telefono,
      template_data: {
        instructor_name: replacement.original.nombre,
        class_type: replacement.class_type,
        date: dateFormatted,
        time: replacement.scheduled_time,
        replacement_instructor: replacement.replacement.nombre,
        bonus_amount: replacement.bonus_amount,
        students_count: studentsCount || 0
      }
    });

    // 3. Notificar a todos los estudiantes inscritos
    const { data: reservations } = await supabase
      .from('reservas')
      .select(`
        member_id,
        members(nombre, telefono, whatsapp_opted_in)
      `)
      .eq('clase_id', replacement.class_id)
      .eq('fecha_reserva', replacement.scheduled_date);

    for (const reservation of reservations || []) {
      if (!reservation.members.whatsapp_opted_in) continue;

      await replacementQueue.add('send-student-notification', {
        replacement_id: replacementId,
        member_id: reservation.member_id,
        phone: reservation.members.telefono,
        template_data: {
          member_name: reservation.members.nombre,
          class_type: replacement.class_type,
          date: dateFormatted,
          time: replacement.scheduled_time,
          original_instructor: replacement.original.nombre,
          replacement_instructor: replacement.replacement.nombre
        }
      }, {
        delay: Math.random() * 5000 // Delay random 0-5s para no saturar
      });
    }

    // Marcar como notificados
    await supabase
      .from('replacements')
      .update({
        status: 'confirmed',
        students_notified: true,
        students_notified_at: new Date().toISOString(),
        original_instructor_notified: true
      })
      .eq('id', replacementId);

    log.info('All parties notified', {
      replacement_id: replacementId,
      students_notified: reservations?.length || 0
    });
  } catch (error) {
    log.error('Error notifying parties', { error: error.message });
    // No lanzar error, el reemplazo ya está aceptado
  }
}

/**
 * Obtener estadísticas de reemplazos de un instructor
 */
async function getInstructorReplacementStats(instructorId, days = 90) {
  try {
    const { data, error } = await supabase
      .rpc('get_instructor_replacement_stats', {
        p_instructor_id: instructorId,
        p_days: days
      });

    if (error) {
      throw new AppError(
        'Failed to get instructor stats',
        ErrorTypes.DATABASE_ERROR,
        500,
        { error: error.message }
      );
    }

    return data[0];
  } catch (error) {
    log.error('Error getting instructor stats', { error: error.message });
    throw error;
  }
}

module.exports = {
  reportAbsence,
  findAndOfferReplacement,
  processOfferResponse,
  acceptReplacementOffer,
  declineReplacementOffer,
  notifyReplacementAccepted,
  getInstructorReplacementStats,
  replacementQueue
};
