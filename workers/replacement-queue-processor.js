/**
 * PROMPT 9: Replacement Queue Processor
 * Procesa jobs de mensajes WhatsApp para el sistema de reemplazos
 */

const { replacementQueue } = require('../services/replacement-service');
const whatsappSender = require('../whatsapp/client/sender');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const log = logger.createLogger('replacement-queue-processor');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Procesar job de envío de oferta de reemplazo
 */
replacementQueue.process('send-offer', async (job) => {
  const {
    offer_id,
    replacement_id,
    instructor_id,
    phone,
    template_data
  } = job.data;

  log.info('Processing replacement offer message', {
    offer_id,
    replacement_id,
    instructor_id,
    job_id: job.id
  });

  try {
    // Verificar que la oferta sigue activa
    const { data: offer, error } = await supabase
      .from('replacement_offers')
      .select('status, expires_at')
      .eq('id', offer_id)
      .single();

    if (error || !offer) {
      log.warn('Offer not found, skipping', { offer_id });
      return { skipped: true, reason: 'not_found' };
    }

    if (offer.status !== 'sent') {
      log.info('Offer already processed, skipping', {
        offer_id,
        status: offer.status
      });
      return { skipped: true, reason: 'already_processed' };
    }

    // Verificar que no haya expirado
    if (new Date() > new Date(offer.expires_at)) {
      log.info('Offer expired, skipping', { offer_id });
      await supabase
        .from('replacement_offers')
        .update({ status: 'expired' })
        .eq('id', offer_id);
      return { skipped: true, reason: 'expired' };
    }

    // Enviar mensaje via WhatsApp
    log.info('Sending replacement offer WhatsApp message', {
      offer_id,
      phone,
      template: 'replacement_offer'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'replacement_offer',
      {
        ...template_data,
        language: 'es'
      }
    );

    log.info('Replacement offer sent successfully', {
      offer_id,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      offerId: offer_id,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error processing replacement offer', {
      offer_id,
      error: error.message,
      job_id: job.id
    });

    throw error; // Para que Bull reintente
  }
});

/**
 * Procesar job de confirmación de reemplazo aceptado
 */
replacementQueue.process('send-confirmation', async (job) => {
  const {
    replacement_id,
    instructor_id,
    phone,
    template_data
  } = job.data;

  log.info('Processing replacement confirmation', {
    replacement_id,
    instructor_id,
    job_id: job.id
  });

  try {
    // Verificar que el reemplazo está aceptado
    const { data: replacement } = await supabase
      .from('replacements')
      .select('status, replacement_instructor_id')
      .eq('id', replacement_id)
      .single();

    if (!replacement || replacement.replacement_instructor_id !== instructor_id) {
      log.warn('Replacement status invalid, skipping', {
        replacement_id,
        instructor_id
      });
      return { skipped: true, reason: 'invalid_status' };
    }

    // Enviar confirmación
    log.info('Sending replacement confirmation', {
      replacement_id,
      phone,
      template: 'replacement_accepted_confirmation'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'replacement_accepted_confirmation',
      {
        ...template_data,
        language: 'es'
      }
    );

    log.info('Confirmation sent successfully', {
      replacement_id,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      replacementId: replacement_id,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error sending confirmation', {
      replacement_id,
      error: error.message,
      job_id: job.id
    });

    throw error;
  }
});

/**
 * Procesar job de notificación al instructor original
 */
replacementQueue.process('send-original-notification', async (job) => {
  const {
    replacement_id,
    instructor_id,
    phone,
    template_data
  } = job.data;

  log.info('Processing original instructor notification', {
    replacement_id,
    instructor_id,
    job_id: job.id
  });

  try {
    // Enviar notificación
    log.info('Sending notification to original instructor', {
      replacement_id,
      phone,
      template: 'replacement_original_instructor_notification'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'replacement_original_instructor_notification',
      {
        ...template_data,
        language: 'es'
      }
    );

    log.info('Original instructor notified', {
      replacement_id,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      replacementId: replacement_id,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error notifying original instructor', {
      replacement_id,
      error: error.message,
      job_id: job.id
    });

    throw error;
  }
});

/**
 * Procesar job de notificación a estudiantes
 */
replacementQueue.process('send-student-notification', async (job) => {
  const {
    replacement_id,
    member_id,
    phone,
    template_data
  } = job.data;

  log.info('Processing student notification', {
    replacement_id,
    member_id,
    job_id: job.id
  });

  try {
    // Verificar que el miembro sigue con WhatsApp opt-in
    const { data: member } = await supabase
      .from('members')
      .select('whatsapp_opted_in')
      .eq('id', member_id)
      .single();

    if (!member || !member.whatsapp_opted_in) {
      log.warn('Member opted out, skipping', { member_id });
      return { skipped: true, reason: 'opted_out' };
    }

    // Enviar notificación
    log.info('Sending notification to student', {
      replacement_id,
      phone,
      template: 'replacement_student_notification'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'replacement_student_notification',
      {
        ...template_data,
        language: 'es'
      }
    );

    log.info('Student notified', {
      replacement_id,
      member_id,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      replacementId: replacement_id,
      memberId: member_id,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error notifying student', {
      replacement_id,
      member_id,
      error: error.message,
      job_id: job.id
    });

    throw error;
  }
});

/**
 * Procesar job de confirmación de ausencia
 */
replacementQueue.process('send-absence-confirmation', async (job) => {
  const {
    instructor_id,
    phone,
    template_data
  } = job.data;

  log.info('Processing absence confirmation', {
    instructor_id,
    job_id: job.id
  });

  try {
    // Enviar confirmación de ausencia
    log.info('Sending absence confirmation', {
      instructor_id,
      phone,
      template: 'absence_confirmation'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'absence_confirmation',
      {
        ...template_data,
        language: 'es'
      }
    );

    log.info('Absence confirmation sent', {
      instructor_id,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      instructorId: instructor_id,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error sending absence confirmation', {
      instructor_id,
      error: error.message,
      job_id: job.id
    });

    throw error;
  }
});

/**
 * Event handlers para debugging y monitoreo
 */
replacementQueue.on('completed', (job, result) => {
  log.info('Replacement job completed', {
    job_id: job.id,
    job_name: job.name,
    result
  });
});

replacementQueue.on('failed', (job, error) => {
  log.error('Replacement job failed', {
    job_id: job.id,
    job_name: job.name,
    error: error.message,
    attempts: job.attemptsMade,
    data: job.data
  });
});

replacementQueue.on('stalled', (job) => {
  log.warn('Replacement job stalled', {
    job_id: job.id,
    job_name: job.name,
    data: job.data
  });
});

replacementQueue.on('error', (error) => {
  log.error('Replacement queue error', {
    error: error.message
  });
});

log.info('Replacement queue processor initialized');

module.exports = replacementQueue;
