/**
 * PROMPT 7: Collection Queue Processor
 * Procesa jobs de cobranza contextual desde Bull queue
 */

const { collectionQueue } = require('../services/contextual-collection-service');
const whatsappSender = require('../whatsapp/client/sender');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const log = logger.createLogger('collection-queue-processor');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Procesar job de envío de mensaje de cobranza
 */
collectionQueue.process('send-collection-message', async (job) => {
  const {
    collectionId,
    memberId,
    memberName,
    phone,
    debtAmount,
    className,
    paymentLink
  } = job.data;

  log.info('Processing collection message', {
    collection_id: collectionId,
    member_id: memberId,
    job_id: job.id
  });

  try {
    // Verificar que la collection sigue activa (no fue cancelada)
    const { data: collection, error } = await supabase
      .from('collections')
      .select('status')
      .eq('id', collectionId)
      .single();

    if (error || !collection) {
      log.warn('Collection not found, skipping', { collection_id: collectionId });
      return { skipped: true, reason: 'not_found' };
    }

    if (collection.status !== 'scheduled') {
      log.info('Collection no longer scheduled, skipping', {
        collection_id: collectionId,
        status: collection.status
      });
      return { skipped: true, reason: 'status_changed' };
    }

    // Verificar que el miembro sigue con consentimiento WhatsApp
    const { data: member } = await supabase
      .from('members')
      .select('whatsapp_opted_in')
      .eq('id', memberId)
      .single();

    if (!member || !member.whatsapp_opted_in) {
      log.warn('Member opted out of WhatsApp, skipping', { member_id: memberId });
      
      await supabase
        .from('collections')
        .update({ status: 'cancelled' })
        .eq('id', collectionId);
      
      return { skipped: true, reason: 'opted_out' };
    }

    // Enviar mensaje via WhatsApp
    const templateParams = {
      member_name: memberName,
      class_name: className,
      debt_amount: debtAmount.toFixed(2),
      payment_link: paymentLink,
      language: 'es'
    };

    log.info('Sending WhatsApp message', {
      collection_id: collectionId,
      phone,
      template: 'debt_post_workout'
    });

    const messageResult = await whatsappSender.sendTemplate(
      phone,
      'debt_post_workout',
      templateParams
    );

    // Actualizar collection como enviada
    await supabase
      .from('collections')
      .update({
        status: 'sent',
        message_sent_at: new Date().toISOString()
      })
      .eq('id', collectionId);

    log.info('Collection message sent successfully', {
      collection_id: collectionId,
      message_id: messageResult.messageId
    });

    return {
      success: true,
      collectionId,
      messageId: messageResult.messageId,
      sentAt: new Date().toISOString()
    };
  } catch (error) {
    log.error('Error processing collection message', {
      collection_id: collectionId,
      error: error.message,
      job_id: job.id
    });

    // Marcar collection como fallida
    await supabase
      .from('collections')
      .update({ status: 'failed' })
      .eq('id', collectionId);

    throw error; // Para que Bull reintente
  }
});

/**
 * Event handlers para debugging
 */
collectionQueue.on('completed', (job, result) => {
  log.info('Collection job completed', {
    job_id: job.id,
    collection_id: job.data.collectionId,
    result
  });
});

collectionQueue.on('failed', (job, error) => {
  log.error('Collection job failed', {
    job_id: job.id,
    collection_id: job.data?.collectionId,
    error: error.message,
    attempts: job.attemptsMade
  });
});

collectionQueue.on('stalled', (job) => {
  log.warn('Collection job stalled', {
    job_id: job.id,
    collection_id: job.data?.collectionId
  });
});

log.info('Collection queue processor initialized');

module.exports = collectionQueue;
