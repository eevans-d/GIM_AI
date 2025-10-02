/**
 * PROMPT 10: INSTRUCTOR PANEL ALERT QUEUE PROCESSOR
 * Procesador de cola Bull para notificaciones de alertas del panel de instructor
 * Tipos de jobs: send-class-start-confirmation, send-critical-alert, send-low-attendance-alert
 */

const { alertQueue } = require('../services/instructor-panel-service');
const whatsappSender = require('../whatsapp/client/sender');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('instructor-alert-queue');

// Configuración
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// =============================================
// JOB PROCESSORS
// =============================================

/**
 * Job: send-class-start-confirmation
 * Enviar confirmación de inicio de clase al instructor
 */
alertQueue.process('send-class-start-confirmation', async (job) => {
    const { sessionId, instructorId, claseId, sessionDetails } = job.data;
    const correlationId = job.id;

    try {
        logger.info('Procesando confirmación de inicio de clase', {
            correlationId,
            sessionId,
            instructorId,
            claseId
        });

        // Obtener datos del instructor
        const { data: instructor, error: instructorError } = await supabase
            .from('instructors')
            .select('nombre, telefono')
            .eq('id', instructorId)
            .single();

        if (instructorError || !instructor) {
            throw new Error(`Instructor no encontrado: ${instructorId}`);
        }

        // Obtener datos de la clase
        const { data: clase, error: claseError } = await supabase
            .from('clases')
            .select('nombre, fecha_hora')
            .eq('id', claseId)
            .single();

        if (claseError || !clase) {
            throw new Error(`Clase no encontrada: ${claseId}`);
        }

        // Verificar opt-in de WhatsApp
        const hasOptIn = await whatsappSender.checkOptIn(instructor.telefono);
        if (!hasOptIn) {
            logger.warn('Instructor sin opt-in de WhatsApp', {
                correlationId,
                instructorId,
                phone: instructor.telefono
            });
            return { skipped: true, reason: 'no_opt_in' };
        }

        // Enviar confirmación por WhatsApp
        const startTime = new Date().toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit'
        });

        await whatsappSender.sendTemplate(
            instructor.telefono,
            'class_started_confirmation',
            {
                instructor_name: instructor.nombre,
                class_name: clase.nombre,
                expected_students: sessionDetails.expected_students.toString(),
                checked_in_students: sessionDetails.checked_in_students.toString(),
                start_time: startTime,
                language: 'es'
            }
        );

        logger.info('Confirmación de inicio enviada exitosamente', {
            correlationId,
            instructorId,
            phone: instructor.telefono
        });

        return { success: true, sent_at: new Date().toISOString() };

    } catch (error) {
        logger.error('Error al enviar confirmación de inicio', {
            correlationId,
            sessionId,
            error: error.message
        });
        throw error; // Bull retry logic
    }
});

/**
 * Job: send-critical-alert
 * Enviar alerta crítica a administración
 */
alertQueue.process('send-critical-alert', async (job) => {
    const { alertId, sessionId, alertType, message, severity } = job.data;
    const correlationId = job.id;

    try {
        logger.info('Procesando alerta crítica', {
            correlationId,
            alertId,
            alertType,
            severity
        });

        // Obtener datos de la sesión y clase
        const { data: session, error: sessionError } = await supabase
            .from('instructor_sessions')
            .select(`
                *,
                instructors (nombre, apellido),
                clases (nombre, fecha_hora)
            `)
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            throw new Error(`Sesión no encontrada: ${sessionId}`);
        }

        // Obtener admins para notificar
        const { data: admins, error: adminsError } = await supabase
            .from('members')
            .select('nombre, telefono')
            .eq('rol', 'admin')
            .eq('activo', true);

        if (adminsError || !admins || admins.length === 0) {
            logger.warn('No hay admins para notificar', { correlationId });
            return { skipped: true, reason: 'no_admins' };
        }

        // Enviar alerta a cada admin
        const sendPromises = admins.map(async (admin) => {
            const hasOptIn = await whatsappSender.checkOptIn(admin.telefono);
            if (!hasOptIn) {
                logger.warn('Admin sin opt-in', {
                    correlationId,
                    admin: admin.nombre,
                    phone: admin.telefono
                });
                return { skipped: true, admin: admin.nombre };
            }

            // Seleccionar template según tipo de alerta
            let templateName;
            let templateParams;

            if (alertType === 'low_attendance') {
                templateName = 'low_attendance_alert';
                templateParams = {
                    admin_name: admin.nombre,
                    class_name: session.clases.nombre,
                    instructor_name: `${session.instructors.nombre} ${session.instructors.apellido}`,
                    expected_students: session.expected_students.toString(),
                    checked_in_students: session.checked_in_students.toString(),
                    attendance_rate: Math.round(session.attendance_rate).toString(),
                    class_time: new Date(session.clases.fecha_hora).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    language: 'es'
                };
            } else if (alertType === 'late_start') {
                templateName = 'late_start_alert';
                const minutesLate = Math.floor(
                    (new Date() - new Date(session.scheduled_start)) / 1000 / 60
                );
                templateParams = {
                    admin_name: admin.nombre,
                    class_name: session.clases.nombre,
                    instructor_name: `${session.instructors.nombre} ${session.instructors.apellido}`,
                    scheduled_time: new Date(session.scheduled_start).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    current_time: new Date().toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    minutes_late: minutesLate.toString(),
                    waiting_students: session.expected_students.toString(),
                    language: 'es'
                };
            } else {
                // Alerta genérica - usar template de low_attendance como fallback
                templateName = 'low_attendance_alert';
                templateParams = {
                    admin_name: admin.nombre,
                    class_name: session.clases.nombre,
                    instructor_name: `${session.instructors.nombre} ${session.instructors.apellido}`,
                    expected_students: session.expected_students.toString(),
                    checked_in_students: session.checked_in_students.toString(),
                    attendance_rate: Math.round(session.attendance_rate || 0).toString(),
                    class_time: new Date(session.clases.fecha_hora).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    language: 'es'
                };
            }

            await whatsappSender.sendTemplate(
                admin.telefono,
                templateName,
                templateParams
            );

            logger.info('Alerta enviada a admin', {
                correlationId,
                admin: admin.nombre,
                phone: admin.telefono,
                alertType
            });

            return { success: true, admin: admin.nombre };
        });

        const results = await Promise.allSettled(sendPromises);

        // Actualizar alerta con estado de notificación
        await supabase
            .from('attendance_alerts')
            .update({
                notification_sent: true,
                notification_sent_at: new Date().toISOString(),
                notification_channel: 'whatsapp'
            })
            .eq('id', alertId);

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        logger.info('Alerta crítica procesada', {
            correlationId,
            alertId,
            notified_admins: successCount,
            total_admins: admins.length
        });

        return {
            success: true,
            notified_admins: successCount,
            total_admins: admins.length
        };

    } catch (error) {
        logger.error('Error al procesar alerta crítica', {
            correlationId,
            alertId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Job: send-low-attendance-alert
 * Enviar alerta de asistencia baja (triggered automáticamente por SQL trigger)
 */
alertQueue.process('send-low-attendance-alert', async (job) => {
    const { sessionId, attendanceRate, expectedStudents, actualStudents } = job.data;
    const correlationId = job.id;

    try {
        logger.info('Procesando alerta de asistencia baja', {
            correlationId,
            sessionId,
            attendanceRate,
            expectedStudents,
            actualStudents
        });

        // Obtener datos de la sesión
        const { data: session, error: sessionError } = await supabase
            .from('instructor_sessions')
            .select(`
                *,
                instructors (nombre, apellido, telefono),
                clases (nombre, fecha_hora)
            `)
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            throw new Error(`Sesión no encontrada: ${sessionId}`);
        }

        // Obtener admins
        const { data: admins, error: adminsError } = await supabase
            .from('members')
            .select('nombre, telefono')
            .eq('rol', 'admin')
            .eq('activo', true);

        if (adminsError || !admins || admins.length === 0) {
            logger.warn('No hay admins para notificar', { correlationId });
            return { skipped: true, reason: 'no_admins' };
        }

        // Enviar alertas a admins
        for (const admin of admins) {
            const hasOptIn = await whatsappSender.checkOptIn(admin.telefono);
            if (!hasOptIn) continue;

            await whatsappSender.sendTemplate(
                admin.telefono,
                'low_attendance_alert',
                {
                    admin_name: admin.nombre,
                    class_name: session.clases.nombre,
                    instructor_name: `${session.instructors.nombre} ${session.instructors.apellido}`,
                    expected_students: expectedStudents.toString(),
                    checked_in_students: actualStudents.toString(),
                    attendance_rate: Math.round(attendanceRate).toString(),
                    class_time: new Date(session.clases.fecha_hora).toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit'
                    }),
                    language: 'es'
                }
            );
        }

        logger.info('Alerta de asistencia baja enviada', {
            correlationId,
            sessionId,
            notifiedAdmins: admins.length
        });

        return { success: true, notified_count: admins.length };

    } catch (error) {
        logger.error('Error al enviar alerta de asistencia baja', {
            correlationId,
            sessionId,
            error: error.message
        });
        throw error;
    }
});

/**
 * Job: send-checklist-reminder
 * Recordatorio de completar checklist antes de clase
 */
alertQueue.process('send-checklist-reminder', async (job) => {
    const { sessionId, instructorId, minutesUntilStart } = job.data;
    const correlationId = job.id;

    try {
        logger.info('Procesando recordatorio de checklist', {
            correlationId,
            sessionId,
            instructorId,
            minutesUntilStart
        });

        // Obtener progreso del checklist
        const { data: session, error: sessionError } = await supabase
            .from('instructor_sessions')
            .select(`
                *,
                instructors (nombre, telefono),
                clases (nombre)
            `)
            .eq('id', sessionId)
            .single();

        if (sessionError || !session) {
            throw new Error(`Sesión no encontrada: ${sessionId}`);
        }

        // Si checklist ya está completo, no enviar
        if (session.checklist_completed) {
            logger.info('Checklist ya completado, no se envía recordatorio', {
                correlationId,
                sessionId
            });
            return { skipped: true, reason: 'checklist_already_completed' };
        }

        // Obtener items pendientes
        const { data: pendingItems, error: itemsError } = await supabase
            .from('checklist_completions')
            .select(`
                class_checklists (item_title)
            `)
            .eq('session_id', sessionId)
            .eq('is_completed', false)
            .limit(3);

        const pendingItemsList = (pendingItems || [])
            .map(item => `• ${item.class_checklists.item_title}`)
            .join('\n');

        // Obtener total de items
        const { count: totalItems } = await supabase
            .from('checklist_completions')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId);

        const { count: completedItems } = await supabase
            .from('checklist_completions')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sessionId)
            .eq('is_completed', true);

        const completionPercentage = totalItems > 0 
            ? Math.round((completedItems / totalItems) * 100) 
            : 0;

        // Verificar opt-in
        const hasOptIn = await whatsappSender.checkOptIn(session.instructors.telefono);
        if (!hasOptIn) {
            logger.warn('Instructor sin opt-in', { correlationId, instructorId });
            return { skipped: true, reason: 'no_opt_in' };
        }

        // Enviar recordatorio
        await whatsappSender.sendTemplate(
            session.instructors.telefono,
            'checklist_reminder',
            {
                instructor_name: session.instructors.nombre,
                class_name: session.clases.nombre,
                minutes_until_start: minutesUntilStart.toString(),
                completed_items: completedItems.toString(),
                total_items: totalItems.toString(),
                completion_percentage: completionPercentage.toString(),
                pending_items_list: pendingItemsList || 'Items pendientes',
                language: 'es'
            }
        );

        logger.info('Recordatorio de checklist enviado', {
            correlationId,
            instructorId,
            phone: session.instructors.telefono
        });

        return { success: true };

    } catch (error) {
        logger.error('Error al enviar recordatorio de checklist', {
            correlationId,
            sessionId,
            error: error.message
        });
        throw error;
    }
});

// =============================================
// EVENT HANDLERS
// =============================================

alertQueue.on('completed', (job, result) => {
    logger.info('Job completado exitosamente', {
        jobId: job.id,
        jobType: job.name,
        result
    });
});

alertQueue.on('failed', (job, err) => {
    logger.error('Job falló', {
        jobId: job.id,
        jobType: job.name,
        error: err.message,
        attempts: job.attemptsMade
    });
});

alertQueue.on('stalled', (job) => {
    logger.warn('Job estancado', {
        jobId: job.id,
        jobType: job.name
    });
});

logger.info('Instructor Panel Alert Queue Processor iniciado', {
    queueName: alertQueue.name,
    processors: ['send-class-start-confirmation', 'send-critical-alert', 'send-low-attendance-alert', 'send-checklist-reminder']
});

module.exports = alertQueue;
