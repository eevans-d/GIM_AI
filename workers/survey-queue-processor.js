/**
 * PROMPT 8: Survey Queue Processor
 * Procesa jobs de encuestas post-clase desde Bull queue
 */

const { surveyQueue } = require('../services/survey-service');
const whatsappSender = require('../whatsapp/client/sender');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const log = logger.createLogger('survey-queue-processor');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Procesar job de envío de encuesta
 */
surveyQueue.process('send-survey-message', async (job) => {
  const {
    surveyId,
    memberId,
    memberName,
    phone,
    className,
    instructorName
  } = job.data;

  log.info('Processing survey message', {
    survey_id: surveyId,
    member_id: memberId,
    job_id: job.id
  });

  try {
    // Verificar que la encuesta sigue sin responder
    const { data: survey, error } = await supabase
      .from('surveys')
      .select('rating')
      .eq('id', surveyId)
      .single();

    if (error || !survey) {
      log.warn('Survey not found, skipping', { survey_id: surveyId });
      return { skipped: true, reason: 'not_found' };
    }

    if (survey.rating !== null) {
      log.info('Survey already answered, skipping', {
        survey_id: surveyId,
        rating: survey.rating
      });
      return { skipped: true, reason: 'already_answered' };
    }

    // Verificar que el miembro sigue con consentimiento WhatsApp
    const { data: member } = await supabase
      .from('members')
      .select('whatsapp_opted_in')
      .eq('id', memberId)
      .single();

    if (!member || !member.whatsapp_opted_in) {
      log.warn('Member opted out of WhatsApp, skipping', { member_id: memberId });
      return { skipped: true, reason: 'opted_out' };
    }

    // Enviar mensaje via WhatsApp
    const templateParams = {
      member_name: memberName,
      class_name: className,
      instructor_name: instructorName,
      language: 'es'
    };

    log.info('Sending survey WhatsApp message', {
      survey_id: surveyId,
      phone,
      template: 'post_class_survey'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'post_class_survey',
      templateParams
    );

    log.info('Survey message sent successfully', {
      survey_id: surveyId,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      surveyId,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error processing survey message', {
      survey_id: surveyId,
      error: error.message,
      job_id: job.id
    });

    throw error; // Para que Bull reintente
  }
});

/**
 * Procesar job de seguimiento para ratings bajos
 */
surveyQueue.process('send-low-rating-followup', async (job) => {
  const {
    surveyId,
    memberName,
    phone,
    className
  } = job.data;

  log.info('Processing low rating followup', {
    survey_id: surveyId,
    job_id: job.id
  });

  try {
    // Verificar que el miembro sigue con consentimiento
    const { data: survey } = await supabase
      .from('surveys')
      .select('member_id, comment, members(whatsapp_opted_in)')
      .eq('id', surveyId)
      .single();

    if (!survey || !survey.members.whatsapp_opted_in) {
      log.warn('Member opted out, skipping followup', { survey_id: surveyId });
      return { skipped: true, reason: 'opted_out' };
    }

    // Si ya dejó comentario, no enviar followup
    if (survey.comment && survey.comment.trim().length > 0) {
      log.info('Member already left comment, skipping followup', { survey_id: surveyId });
      return { skipped: true, reason: 'comment_exists' };
    }

    // Enviar mensaje de seguimiento
    const templateParams = {
      member_name: memberName,
      class_name: className,
      language: 'es'
    };

    log.info('Sending low rating followup message', {
      survey_id: surveyId,
      phone,
      template: 'survey_low_rating_followup'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'survey_low_rating_followup',
      templateParams
    );

    log.info('Followup message sent successfully', {
      survey_id: surveyId,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      surveyId,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error processing followup message', {
      survey_id: surveyId,
      error: error.message,
      job_id: job.id
    });

    throw error;
  }
});

/**
 * Event handlers para debugging
 */
surveyQueue.on('completed', (job, result) => {
  log.info('Survey job completed', {
    job_id: job.id,
    job_name: job.name,
    survey_id: job.data.surveyId,
    result
  });
});

surveyQueue.on('failed', (job, error) => {
  log.error('Survey job failed', {
    job_id: job.id,
    job_name: job.name,
    survey_id: job.data?.surveyId,
    error: error.message,
    attempts: job.attemptsMade
  });
});

surveyQueue.on('stalled', (job) => {
  log.warn('Survey job stalled', {
    job_id: job.id,
    job_name: job.name,
    survey_id: job.data?.surveyId
  });
});

log.info('Survey queue processor initialized');

module.exports = surveyQueue;
