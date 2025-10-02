/**
 * PROMPT 10: INSTRUCTOR PANEL SERVICE
 * Servicio para gestión del panel móvil de instructores "Mi Clase Ahora"
 * Incluye: inicio de sesión, check-in de un toque, checklists, alertas en tiempo real
 */

const { createClient } = require('@supabase/supabase-js');
const Bull = require('bull');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const logger = require('../utils/logger').createLogger('instructor-panel-service');

// Configuración
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Cola para notificaciones de alertas
const alertQueue = new Bull('instructor-alerts', {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
    }
});

// =============================================
// GESTIÓN DE SESIONES
// =============================================

/**
 * Iniciar sesión de instructor para una clase
 * @param {UUID} instructorId - ID del instructor
 * @param {UUID} claseId - ID de la clase
 * @param {Object} deviceInfo - Información del dispositivo (browser, OS, screen)
 * @returns {Object} Sesión creada con checklist y estudiantes esperados
 */
async function startInstructorSession(instructorId, claseId, deviceInfo = null, correlationId) {
    try {
        logger.info('Iniciando sesión de instructor', {
            correlationId,
            instructorId,
            claseId,
            deviceInfo
        });

        // Llamar función SQL para crear sesión
        const { data: sessionData, error: sessionError } = await supabase
            .rpc('start_instructor_session', {
                p_instructor_id: instructorId,
                p_clase_id: claseId,
                p_device_info: deviceInfo
            });

        if (sessionError) {
            throw new AppError(
                `Error al iniciar sesión: ${sessionError.message}`,
                ErrorTypes.DATABASE_ERROR,
                500,
                { instructorId, claseId, error: sessionError }
            );
        }

        const sessionId = sessionData;

        // Obtener datos completos de la sesión
        const sessionDetails = await getSessionDetails(sessionId, correlationId);

        // Enviar confirmación por WhatsApp
        await alertQueue.add('send-class-start-confirmation', {
            sessionId,
            instructorId,
            claseId,
            sessionDetails
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });

        logger.info('Sesión de instructor iniciada exitosamente', {
            correlationId,
            sessionId,
            instructorId,
            claseId,
            expectedStudents: sessionDetails.expected_students
        });

        return sessionDetails;

    } catch (error) {
        logger.error('Error al iniciar sesión de instructor', {
            correlationId,
            instructorId,
            claseId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener detalles completos de una sesión activa
 * @param {UUID} sessionId - ID de la sesión
 * @returns {Object} Detalles de sesión con checklist, estudiantes, alertas
 */
async function getSessionDetails(sessionId, correlationId) {
    try {
        // Obtener datos de la sesión desde vista materializada
        const { data: session, error: sessionError } = await supabase
            .from('v_active_instructor_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

        if (sessionError || !session) {
            throw new AppError(
                'Sesión no encontrada',
                ErrorTypes.NOT_FOUND,
                404,
                { sessionId }
            );
        }

        // Obtener checklist items con estado
        const { data: checklist, error: checklistError } = await supabase
            .from('checklist_completions')
            .select(`
                id,
                is_completed,
                completed_at,
                notes,
                issues_found,
                class_checklists (
                    id,
                    item_title,
                    item_description,
                    item_category,
                    estimated_time_minutes,
                    is_required
                )
            `)
            .eq('session_id', sessionId)
            .order('class_checklists(item_order)');

        // Obtener estudiantes esperados con estado de asistencia
        const { data: students, error: studentsError } = await supabase
            .from('reservas')
            .select(`
                id,
                member_id,
                estado,
                members (
                    id,
                    nombre,
                    apellido,
                    telefono,
                    foto_url
                )
            `)
            .eq('clase_id', session.clase_id)
            .eq('estado', 'confirmed');

        // Mapear con estado de check-in desde quick_attendance
        const { data: checkins, error: checkinsError } = await supabase
            .from('quick_attendance')
            .select('member_id, attendance_status, checked_in_at, instructor_notes')
            .eq('session_id', sessionId);

        const checkinsMap = new Map(
            (checkins || []).map(c => [c.member_id, c])
        );

        const studentsWithAttendance = (students || []).map(s => ({
            ...s.members,
            reservation_id: s.id,
            reservation_status: s.estado,
            checked_in: checkinsMap.has(s.member_id),
            attendance_status: checkinsMap.get(s.member_id)?.attendance_status || 'pending',
            checked_in_at: checkinsMap.get(s.member_id)?.checked_in_at,
            instructor_notes: checkinsMap.get(s.member_id)?.instructor_notes
        }));

        // Obtener alertas activas
        const { data: alerts, error: alertsError } = await supabase
            .from('attendance_alerts')
            .select('*')
            .eq('session_id', sessionId)
            .eq('alert_status', 'active')
            .order('created_at', { ascending: false });

        return {
            ...session,
            checklist: checklist || [],
            students: studentsWithAttendance,
            alerts: alerts || [],
            summary: {
                total_students: studentsWithAttendance.length,
                checked_in: studentsWithAttendance.filter(s => s.checked_in).length,
                pending: studentsWithAttendance.filter(s => !s.checked_in).length,
                checklist_progress: session.checklist_completion_percentage,
                active_alerts: (alerts || []).length
            }
        };

    } catch (error) {
        logger.error('Error al obtener detalles de sesión', {
            correlationId,
            sessionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Finalizar sesión de instructor
 * @param {UUID} sessionId - ID de la sesión
 * @param {Object} sessionNotes - Notas finales del instructor
 * @returns {Object} Resumen de la sesión finalizada
 */
async function endInstructorSession(sessionId, sessionNotes = null, correlationId) {
    try {
        logger.info('Finalizando sesión de instructor', {
            correlationId,
            sessionId
        });

        // Actualizar estado de la sesión
        const { data: session, error: updateError } = await supabase
            .from('instructor_sessions')
            .update({
                session_status: 'completed',
                actual_end: new Date().toISOString(),
                preparation_notes: sessionNotes
            })
            .eq('id', sessionId)
            .select()
            .single();

        if (updateError) {
            throw new AppError(
                `Error al finalizar sesión: ${updateError.message}`,
                ErrorTypes.DATABASE_ERROR,
                500,
                { sessionId, error: updateError }
            );
        }

        // Obtener resumen final
        const finalSummary = await getSessionSummary(sessionId, correlationId);

        logger.info('Sesión finalizada exitosamente', {
            correlationId,
            sessionId,
            finalAttendanceRate: finalSummary.attendance_rate
        });

        return finalSummary;

    } catch (error) {
        logger.error('Error al finalizar sesión', {
            correlationId,
            sessionId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener resumen de sesión finalizada
 */
async function getSessionSummary(sessionId, correlationId) {
    const { data, error } = await supabase
        .from('instructor_sessions')
        .select(`
            *,
            instructors (nombre, apellido),
            clases (nombre, tipo)
        `)
        .eq('id', sessionId)
        .single();

    if (error) {
        throw new AppError('Error al obtener resumen', ErrorTypes.DATABASE_ERROR, 500, { sessionId });
    }

    return data;
}

// =============================================
// CHECK-IN DE UN TOQUE
// =============================================

/**
 * Check-in rápido de estudiante con un toque
 * @param {UUID} sessionId - ID de la sesión activa
 * @param {UUID} memberId - ID del estudiante
 * @param {UUID} instructorId - ID del instructor que hace el check-in
 * @param {String} notes - Notas opcionales del instructor
 * @returns {Object} Registro de asistencia creado
 */
async function quickCheckinStudent(sessionId, memberId, instructorId, notes = null, correlationId) {
    try {
        logger.info('Check-in rápido de estudiante', {
            correlationId,
            sessionId,
            memberId,
            instructorId
        });

        // Llamar función SQL que maneja todo (quick_attendance + checkins + actualizar sesión)
        const { data: attendanceId, error: checkinError } = await supabase
            .rpc('quick_checkin_student', {
                p_session_id: sessionId,
                p_member_id: memberId,
                p_instructor_id: instructorId,
                p_notes: notes
            });

        if (checkinError) {
            throw new AppError(
                `Error en check-in: ${checkinError.message}`,
                ErrorTypes.DATABASE_ERROR,
                500,
                { sessionId, memberId, error: checkinError }
            );
        }

        // Obtener datos del registro creado
        const { data: attendance, error: fetchError } = await supabase
            .from('quick_attendance')
            .select(`
                *,
                members (nombre, apellido)
            `)
            .eq('id', attendanceId)
            .single();

        // Verificar si se debe enviar alerta de asistencia baja (trigger lo hace automáticamente)
        // Solo logueamos el evento
        const sessionDetails = await getSessionDetails(sessionId, correlationId);
        
        if (sessionDetails.attendance_rate < 50 && !sessionDetails.low_attendance_alert_sent) {
            logger.warn('Asistencia baja detectada', {
                correlationId,
                sessionId,
                attendanceRate: sessionDetails.attendance_rate,
                expectedStudents: sessionDetails.expected_students,
                checkedIn: sessionDetails.checked_in_students
            });
        }

        logger.info('Check-in completado exitosamente', {
            correlationId,
            attendanceId,
            memberId,
            memberName: `${attendance.members.nombre} ${attendance.members.apellido}`
        });

        return attendance;

    } catch (error) {
        logger.error('Error en check-in rápido', {
            correlationId,
            sessionId,
            memberId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Marcar estudiante como ausente
 * @param {UUID} sessionId - ID de la sesión
 * @param {UUID} memberId - ID del estudiante
 * @param {String} reason - Razón de ausencia
 */
async function markStudentAbsent(sessionId, memberId, reason = null, correlationId) {
    try {
        const { data, error } = await supabase
            .from('quick_attendance')
            .upsert({
                session_id: sessionId,
                member_id: memberId,
                attendance_status: 'absent',
                instructor_notes: reason,
                checkin_method: 'instructor_tap'
            }, {
                onConflict: 'session_id,member_id'
            })
            .select()
            .single();

        if (error) {
            throw new AppError('Error al marcar ausencia', ErrorTypes.DATABASE_ERROR, 500);
        }

        logger.info('Estudiante marcado como ausente', {
            correlationId,
            sessionId,
            memberId,
            reason
        });

        return data;
    } catch (error) {
        logger.error('Error al marcar ausencia', { correlationId, error: error.message });
        throw error;
    }
}

// =============================================
// GESTIÓN DE CHECKLIST
// =============================================

/**
 * Completar item del checklist de preparación
 * @param {UUID} sessionId - ID de la sesión
 * @param {UUID} checklistItemId - ID del item del checklist
 * @param {UUID} instructorId - ID del instructor
 * @param {String} notes - Notas sobre la completación
 * @param {String} issuesFound - Problemas detectados (opcional)
 * @returns {Object} Item actualizado y estado del checklist completo
 */
async function completeChecklistItem(sessionId, checklistItemId, instructorId, notes = null, issuesFound = null, correlationId) {
    try {
        logger.info('Completando item del checklist', {
            correlationId,
            sessionId,
            checklistItemId,
            instructorId
        });

        // Llamar función SQL que actualiza item y verifica completación total
        const { data: allCompleted, error: completeError } = await supabase
            .rpc('complete_checklist_item', {
                p_session_id: sessionId,
                p_checklist_item_id: checklistItemId,
                p_instructor_id: instructorId,
                p_notes: notes,
                p_issues_found: issuesFound
            });

        if (completeError) {
            throw new AppError(
                `Error al completar item: ${completeError.message}`,
                ErrorTypes.DATABASE_ERROR,
                500,
                { sessionId, checklistItemId, error: completeError }
            );
        }

        // Obtener item actualizado
        const { data: item, error: fetchError } = await supabase
            .from('checklist_completions')
            .select(`
                *,
                class_checklists (
                    item_title,
                    item_category
                )
            `)
            .eq('session_id', sessionId)
            .eq('checklist_item_id', checklistItemId)
            .single();

        logger.info('Item del checklist completado', {
            correlationId,
            sessionId,
            itemTitle: item.class_checklists.item_title,
            allCompleted
        });

        return {
            item,
            checklist_fully_completed: allCompleted
        };

    } catch (error) {
        logger.error('Error al completar item del checklist', {
            correlationId,
            sessionId,
            checklistItemId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Saltar item del checklist con justificación
 */
async function skipChecklistItem(sessionId, checklistItemId, skipReason, correlationId) {
    try {
        const { data, error } = await supabase
            .from('checklist_completions')
            .update({
                was_skipped: true,
                skip_reason: skipReason,
                updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId)
            .eq('checklist_item_id', checklistItemId)
            .select()
            .single();

        if (error) {
            throw new AppError('Error al saltar item', ErrorTypes.DATABASE_ERROR, 500);
        }

        logger.info('Item del checklist saltado', {
            correlationId,
            sessionId,
            checklistItemId,
            skipReason
        });

        return data;
    } catch (error) {
        logger.error('Error al saltar item', { correlationId, error: error.message });
        throw error;
    }
}

/**
 * Obtener progreso del checklist
 */
async function getChecklistProgress(sessionId, correlationId) {
    try {
        const { data: items, error } = await supabase
            .from('checklist_completions')
            .select(`
                *,
                class_checklists (
                    item_title,
                    item_description,
                    item_category,
                    is_required,
                    estimated_time_minutes
                )
            `)
            .eq('session_id', sessionId)
            .order('class_checklists(item_order)');

        if (error) {
            throw new AppError('Error al obtener checklist', ErrorTypes.DATABASE_ERROR, 500);
        }

        const total = items.length;
        const completed = items.filter(i => i.is_completed).length;
        const skipped = items.filter(i => i.was_skipped).length;
        const pending = items.filter(i => !i.is_completed && !i.was_skipped).length;

        return {
            items,
            summary: {
                total,
                completed,
                skipped,
                pending,
                completion_percentage: total > 0 ? Math.round((completed / total) * 100) : 0
            }
        };
    } catch (error) {
        logger.error('Error al obtener progreso checklist', { correlationId, error: error.message });
        throw error;
    }
}

// =============================================
// GESTIÓN DE ALERTAS
// =============================================

/**
 * Crear alerta manual de instructor
 * @param {UUID} sessionId - ID de la sesión
 * @param {String} alertType - Tipo de alerta
 * @param {String} message - Mensaje de la alerta
 * @param {Object} details - Detalles adicionales
 * @param {String} severity - Severidad (low, medium, high, critical)
 */
async function createAlert(sessionId, alertType, message, details = null, severity = 'medium', correlationId) {
    try {
        logger.info('Creando alerta manual', {
            correlationId,
            sessionId,
            alertType,
            severity
        });

        // Llamar función SQL para crear alerta
        const { data: alertId, error: alertError } = await supabase
            .rpc('create_attendance_alert', {
                p_session_id: sessionId,
                p_alert_type: alertType,
                p_alert_message: message,
                p_alert_details: details,
                p_severity: severity
            });

        if (alertError) {
            throw new AppError(
                `Error al crear alerta: ${alertError.message}`,
                ErrorTypes.DATABASE_ERROR,
                500,
                { sessionId, alertType, error: alertError }
            );
        }

        // Si es severidad alta o crítica, notificar inmediatamente
        if (severity === 'high' || severity === 'critical') {
            await alertQueue.add('send-critical-alert', {
                alertId,
                sessionId,
                alertType,
                message,
                severity
            }, {
                priority: 1, // Alta prioridad
                attempts: 5
            });
        }

        logger.info('Alerta creada exitosamente', {
            correlationId,
            alertId,
            alertType,
            severity
        });

        return { alert_id: alertId };

    } catch (error) {
        logger.error('Error al crear alerta', {
            correlationId,
            sessionId,
            alertType,
            error: error.message
        });
        throw error;
    }
}

/**
 * Reconocer alerta (acknowledgment)
 */
async function acknowledgeAlert(alertId, instructorId, correlationId) {
    try {
        const { data, error } = await supabase
            .from('attendance_alerts')
            .update({
                alert_status: 'acknowledged',
                acknowledged_by: instructorId,
                acknowledged_at: new Date().toISOString(),
                response_time_seconds: supabase.raw(`
                    EXTRACT(EPOCH FROM (NOW() - created_at))
                `)
            })
            .eq('id', alertId)
            .select()
            .single();

        if (error) {
            throw new AppError('Error al reconocer alerta', ErrorTypes.DATABASE_ERROR, 500);
        }

        logger.info('Alerta reconocida', { correlationId, alertId, instructorId });
        return data;
    } catch (error) {
        logger.error('Error al reconocer alerta', { correlationId, error: error.message });
        throw error;
    }
}

/**
 * Resolver alerta con notas
 */
async function resolveAlert(alertId, instructorId, resolutionNotes, correlationId) {
    try {
        const { data, error } = await supabase
            .from('attendance_alerts')
            .update({
                alert_status: 'resolved',
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes,
                resolution_time_seconds: supabase.raw(`
                    EXTRACT(EPOCH FROM (NOW() - created_at))
                `)
            })
            .eq('id', alertId)
            .select()
            .single();

        if (error) {
            throw new AppError('Error al resolver alerta', ErrorTypes.DATABASE_ERROR, 500);
        }

        logger.info('Alerta resuelta', { correlationId, alertId, instructorId });
        return data;
    } catch (error) {
        logger.error('Error al resolver alerta', { correlationId, error: error.message });
        throw error;
    }
}

/**
 * Obtener alertas activas de una sesión
 */
async function getActiveAlerts(sessionId, correlationId) {
    try {
        const { data, error } = await supabase
            .from('attendance_alerts')
            .select('*')
            .eq('session_id', sessionId)
            .eq('alert_status', 'active')
            .order('created_at', { ascending: false });

        if (error) {
            throw new AppError('Error al obtener alertas', ErrorTypes.DATABASE_ERROR, 500);
        }

        return data;
    } catch (error) {
        logger.error('Error al obtener alertas', { correlationId, error: error.message });
        throw error;
    }
}

// =============================================
// DASHBOARD Y ESTADÍSTICAS
// =============================================

/**
 * Obtener dashboard del instructor con estadísticas
 * @param {UUID} instructorId - ID del instructor
 * @returns {Object} Estadísticas de desempeño del instructor
 */
async function getInstructorDashboard(instructorId, correlationId) {
    try {
        // Obtener desde vista materializada
        const { data: dashboard, error } = await supabase
            .from('v_instructor_dashboard')
            .select('*')
            .eq('instructor_id', instructorId)
            .single();

        if (error) {
            throw new AppError('Error al obtener dashboard', ErrorTypes.DATABASE_ERROR, 500);
        }

        // Obtener sesiones activas
        const { data: activeSessions, error: activeError } = await supabase
            .from('v_active_instructor_sessions')
            .select('*')
            .eq('instructor_id', instructorId)
            .order('scheduled_start', { ascending: true });

        return {
            ...dashboard,
            active_sessions: activeSessions || []
        };
    } catch (error) {
        logger.error('Error al obtener dashboard', { correlationId, error: error.message });
        throw error;
    }
}

/**
 * Refrescar vistas materializadas (llamar periódicamente o en eventos clave)
 */
async function refreshMaterializedViews(correlationId) {
    try {
        await supabase.rpc('refresh_materialized_view', {
            view_name: 'v_active_instructor_sessions'
        });
        await supabase.rpc('refresh_materialized_view', {
            view_name: 'v_instructor_dashboard'
        });

        logger.info('Vistas materializadas refrescadas', { correlationId });
    } catch (error) {
        logger.warn('Error al refrescar vistas (puede ser normal si no existen)', {
            correlationId,
            error: error.message
        });
    }
}

module.exports = {
    // Sesiones
    startInstructorSession,
    getSessionDetails,
    endInstructorSession,
    getSessionSummary,

    // Check-in
    quickCheckinStudent,
    markStudentAbsent,

    // Checklist
    completeChecklistItem,
    skipChecklistItem,
    getChecklistProgress,

    // Alertas
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    getActiveAlerts,

    // Dashboard
    getInstructorDashboard,
    refreshMaterializedViews,

    // Exportar cola para queue processor
    alertQueue
};
