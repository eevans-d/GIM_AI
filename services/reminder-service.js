/**
 * Automated Reminder Service
 * Sends scheduled reminders for classes and payments
 * Part of PROMPT 6: Automated Reminders System
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');
const whatsappSender = require('../whatsapp/client/sender');
const cron = require('node-cron');

const log = logger.createLogger('reminder-service');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Send class reminder 24 hours before
 */
async function sendClassReminders24h() {
  try {
    log.info('Starting 24h class reminders');
    
    // Get classes happening in 24 hours
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);
    tomorrow.setMinutes(0, 0, 0);
    
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(tomorrowEnd.getHours() + 1);
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        id,
        nombre,
        fecha_hora,
        sala,
        instructors (nombre)
      `)
      .gte('fecha_hora', tomorrow.toISOString())
      .lt('fecha_hora', tomorrowEnd.toISOString())
      .eq('estado', 'programada');
    
    if (error) {
      log.error('Failed to fetch classes for 24h reminders', { error: error.message });
      return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const classData of classes) {
      // Get reservations for this class
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          members (
            id,
            nombre,
            telefono,
            consentimiento_wa
          )
        `)
        .eq('class_id', classData.id)
        .eq('estado', 'confirmada');
      
      if (resError || !reservations) {
        log.error('Failed to fetch reservations', { class_id: classData.id, error: resError?.message });
        continue;
      }
      
      // Send reminder to each member
      for (const reservation of reservations) {
        const member = reservation.members;
        
        if (!member || !member.consentimiento_wa || !member.telefono) {
          continue;
        }
        
        try {
          const classTime = new Date(classData.fecha_hora).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit'
          });
          
          await whatsappSender.sendTemplate(
            member.telefono,
            'recordatorio_clase_24h',
            [member.nombre, classData.nombre, classTime]
          );
          
          sent++;
          
          log.info('24h reminder sent', {
            member_id: member.id,
            class_id: classData.id,
            class_name: classData.nombre
          });
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          failed++;
          log.error('Failed to send 24h reminder', {
            member_id: member.id,
            class_id: classData.id,
            error: error.message
          });
        }
      }
    }
    
    log.info('24h class reminders complete', { sent, failed, total: classes.length });
    
  } catch (error) {
    log.error('Error in 24h class reminders', { error: error.message });
  }
}

/**
 * Send class reminder 2 hours before
 */
async function sendClassReminders2h() {
  try {
    log.info('Starting 2h class reminders');
    
    // Get classes happening in 2 hours
    const in2Hours = new Date();
    in2Hours.setHours(in2Hours.getHours() + 2);
    in2Hours.setMinutes(0, 0, 0);
    
    const in2HoursEnd = new Date(in2Hours);
    in2HoursEnd.setMinutes(in2HoursEnd.getMinutes() + 30);
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select(`
        id,
        nombre,
        fecha_hora,
        sala
      `)
      .gte('fecha_hora', in2Hours.toISOString())
      .lt('fecha_hora', in2HoursEnd.toISOString())
      .eq('estado', 'programada');
    
    if (error) {
      log.error('Failed to fetch classes for 2h reminders', { error: error.message });
      return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const classData of classes) {
      // Get reservations
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select(`
          id,
          members (
            id,
            nombre,
            telefono,
            consentimiento_wa
          )
        `)
        .eq('class_id', classData.id)
        .eq('estado', 'confirmada');
      
      if (resError || !reservations) {
        continue;
      }
      
      for (const reservation of reservations) {
        const member = reservation.members;
        
        if (!member || !member.consentimiento_wa || !member.telefono) {
          continue;
        }
        
        try {
          await whatsappSender.sendText(
            member.telefono,
            `⏰ Recordatorio!\n\n${classData.nombre} en 2 horas\n🕐 ${new Date(classData.fecha_hora).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n💡 Tip: Cená liviano ahora y traé agua extra 💧`
          );
          
          sent++;
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          failed++;
          log.error('Failed to send 2h reminder', {
            member_id: member.id,
            error: error.message
          });
        }
      }
    }
    
    log.info('2h class reminders complete', { sent, failed });
    
  } catch (error) {
    log.error('Error in 2h class reminders', { error: error.message });
  }
}

/**
 * Send payment reminders - Day 0 (due date)
 */
async function sendPaymentRemindersD0() {
  try {
    log.info('Starting D0 payment reminders');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    // Get payments due today
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        monto,
        fecha_vencimiento,
        members (
          id,
          nombre,
          telefono,
          consentimiento_wa
        )
      `)
      .gte('fecha_vencimiento', today.toISOString())
      .lte('fecha_vencimiento', todayEnd.toISOString())
      .eq('estado', 'pendiente');
    
    if (error) {
      log.error('Failed to fetch D0 payments', { error: error.message });
      return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const payment of payments) {
      const member = payment.members;
      
      if (!member || !member.consentimiento_wa || !member.telefono) {
        continue;
      }
      
      try {
        await whatsappSender.sendTemplate(
          member.telefono,
          'recordatorio_pago_d0',
          [member.nombre, payment.monto.toString()]
        );
        
        // Update last reminder timestamp
        await supabase
          .from('payments')
          .update({ ultimo_recordatorio: new Date().toISOString() })
          .eq('id', payment.id);
        
        sent++;
        
        log.info('D0 payment reminder sent', {
          payment_id: payment.id,
          member_id: member.id,
          amount: payment.monto
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        log.error('Failed to send D0 reminder', {
          payment_id: payment.id,
          member_id: member.id,
          error: error.message
        });
      }
    }
    
    log.info('D0 payment reminders complete', { sent, failed, total: payments.length });
    
  } catch (error) {
    log.error('Error in D0 payment reminders', { error: error.message });
  }
}

/**
 * Send payment reminders - Day 3 (3 days overdue)
 */
async function sendPaymentRemindersD3() {
  try {
    log.info('Starting D3 payment reminders');
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);
    
    const threeDaysAgoEnd = new Date(threeDaysAgo);
    threeDaysAgoEnd.setHours(23, 59, 59, 999);
    
    // Get payments overdue by 3 days
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        monto,
        fecha_vencimiento,
        members (
          id,
          nombre,
          telefono,
          consentimiento_wa
        )
      `)
      .gte('fecha_vencimiento', threeDaysAgo.toISOString())
      .lte('fecha_vencimiento', threeDaysAgoEnd.toISOString())
      .eq('estado', 'overdue');
    
    if (error) {
      log.error('Failed to fetch D3 payments', { error: error.message });
      return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const payment of payments) {
      const member = payment.members;
      
      if (!member || !member.consentimiento_wa || !member.telefono) {
        continue;
      }
      
      try {
        await whatsappSender.sendText(
          member.telefono,
          `Hola ${member.nombre}! 👋\n\nSeguimos viendo $${payment.monto} pendiente.\n\nTe ofrecemos opciones:\n• Pago completo: [LINK]\n• 2 cuotas sin interés: [LINK_PLAN]\n• Hablar con admin: Respondé LLAMAR\n\nTu bienestar nos importa 💙`
        );
        
        await supabase
          .from('payments')
          .update({ 
            ultimo_recordatorio: new Date().toISOString(),
            intentos_cobro: supabase.raw('intentos_cobro + 1')
          })
          .eq('id', payment.id);
        
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        log.error('Failed to send D3 reminder', {
          payment_id: payment.id,
          error: error.message
        });
      }
    }
    
    log.info('D3 payment reminders complete', { sent, failed });
    
  } catch (error) {
    log.error('Error in D3 payment reminders', { error: error.message });
  }
}

/**
 * Send payment reminders - Day 7 (1 week overdue)
 */
async function sendPaymentRemindersD7() {
  try {
    log.info('Starting D7 payment reminders');
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const sevenDaysAgoEnd = new Date(sevenDaysAgo);
    sevenDaysAgoEnd.setHours(23, 59, 59, 999);
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        monto,
        fecha_vencimiento,
        members (
          id,
          nombre,
          telefono,
          consentimiento_wa
        )
      `)
      .gte('fecha_vencimiento', sevenDaysAgo.toISOString())
      .lte('fecha_vencimiento', sevenDaysAgoEnd.toISOString())
      .eq('estado', 'overdue');
    
    if (error) {
      log.error('Failed to fetch D7 payments', { error: error.message });
      return;
    }
    
    let sent = 0;
    let failed = 0;
    
    for (const payment of payments) {
      const member = payment.members;
      
      if (!member || !member.consentimiento_wa || !member.telefono) {
        continue;
      }
      
      try {
        await whatsappSender.sendText(
          member.telefono,
          `${member.nombre}, para mantener tu acceso activo necesitamos regularizar $${payment.monto} antes del viernes.\n\nPlan especial: 3 cuotas sin interés\n[ACTIVAR PLAN]\n\nTambién podés llamarnos: ${process.env.GYM_PHONE}\n\nQueremos que sigas entrenando 🏋️‍♀️`
        );
        
        await supabase
          .from('payments')
          .update({ 
            ultimo_recordatorio: new Date().toISOString(),
            intentos_cobro: supabase.raw('intentos_cobro + 1')
          })
          .eq('id', payment.id);
        
        sent++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        failed++;
        log.error('Failed to send D7 reminder', {
          payment_id: payment.id,
          error: error.message
        });
      }
    }
    
    log.info('D7 payment reminders complete', { sent, failed });
    
  } catch (error) {
    log.error('Error in D7 payment reminders', { error: error.message });
  }
}

/**
 * Check for payments overdue by 14+ days and flag for manual follow-up
 */
async function flagCriticalOverduePayments() {
  try {
    log.info('Checking for critical overdue payments (14+ days)');
    
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        id,
        monto,
        fecha_vencimiento,
        intentos_cobro,
        members (
          id,
          nombre,
          telefono,
          ultimo_checkin
        )
      `)
      .lt('fecha_vencimiento', fourteenDaysAgo.toISOString())
      .eq('estado', 'overdue');
    
    if (error) {
      log.error('Failed to fetch critical overdue payments', { error: error.message });
      return;
    }
    
    if (payments.length === 0) {
      log.info('No critical overdue payments found');
      return;
    }
    
    // Log critical cases for admin review
    for (const payment of payments) {
      const daysPastDue = Math.floor(
        (new Date() - new Date(payment.fecha_vencimiento)) / (1000 * 60 * 60 * 24)
      );
      
      log.warn('Critical overdue payment', {
        payment_id: payment.id,
        member_id: payment.members.id,
        member_name: payment.members.nombre,
        amount: payment.monto,
        days_past_due: daysPastDue,
        attempts: payment.intentos_cobro,
        last_checkin: payment.members.ultimo_checkin
      });
    }
    
    log.info('Critical overdue payments flagged', { total: payments.length });
    
    // TODO: Send notification to admin via WhatsApp or Telegram
    
  } catch (error) {
    log.error('Error flagging critical overdue payments', { error: error.message });
  }
}

/**
 * Initialize cron jobs for automated reminders
 */
function initializeCronJobs() {
  log.info('Initializing reminder cron jobs');
  
  // Class reminders 24h before - Run daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    log.info('Running scheduled 24h class reminders');
    sendClassReminders24h();
  });
  
  // Class reminders 2h before - Run every hour
  cron.schedule('0 * * * *', () => {
    sendClassReminders2h();
  });
  
  // Payment reminders D0 - Run daily at 9:00 AM
  cron.schedule('0 9 * * *', () => {
    log.info('Running scheduled D0 payment reminders');
    sendPaymentRemindersD0();
  });
  
  // Payment reminders D3 - Run daily at 10:00 AM
  cron.schedule('0 10 * * *', () => {
    log.info('Running scheduled D3 payment reminders');
    sendPaymentRemindersD3();
  });
  
  // Payment reminders D7 - Run daily at 11:00 AM
  cron.schedule('0 11 * * *', () => {
    log.info('Running scheduled D7 payment reminders');
    sendPaymentRemindersD7();
  });
  
  // Flag critical overdue payments - Run daily at 8:00 AM
  cron.schedule('0 8 * * *', () => {
    log.info('Running critical overdue check');
    flagCriticalOverduePayments();
  });
  
  log.info('Reminder cron jobs initialized successfully');
}

module.exports = {
  sendClassReminders24h,
  sendClassReminders2h,
  sendPaymentRemindersD0,
  sendPaymentRemindersD3,
  sendPaymentRemindersD7,
  flagCriticalOverduePayments,
  initializeCronJobs
};
