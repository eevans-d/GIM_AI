/**
 * PROMPT 15: DASHBOARD SERVICE
 * Servicio central para gestión del Executive Dashboard
 * Maneja KPIs, snapshots, alertas, trends y exportación
 */

const { createClient } = require('@supabase/supabase-js');
const { AppError, ErrorTypes } = require('../utils/error-handler');
const logger = require('../utils/logger').createLogger('dashboard-service');
const aiDecisionService = require('./ai-decision-service');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// KPIs EN TIEMPO REAL
// ============================================================================

/**
 * Obtener todos los KPIs del día actual (vista consolidada)
 */
async function getTodayKPIs(correlationId) {
    try {
        logger.info('Obteniendo KPIs del día', { correlationId });

        const { data, error } = await supabase
            .from('v_executive_summary')
            .select('*')
            .single();

        if (error) {
            throw new AppError(
                'Error al obtener KPIs',
                ErrorTypes.DATABASE_ERROR,
                500,
                { error: error.message }
            );
        }

        logger.info('KPIs obtenidos exitosamente', {
            correlationId,
            revenue: data?.revenue_total,
            checkins: data?.total_checkins
        });

        return data || {};

    } catch (error) {
        logger.error('Error al obtener KPIs del día', {
            correlationId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener KPIs financieros del día
 */
async function getFinancialKPIs(correlationId) {
    try {
        const { data, error } = await supabase
            .from('v_financial_kpis_today')
            .select('*')
            .single();

        if (error) throw error;
        return data || {};
    } catch (error) {
        logger.error('Error al obtener KPIs financieros', { correlationId, error: error.message });
        throw new AppError('Error al obtener KPIs financieros', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Obtener KPIs operacionales del día
 */
async function getOperationalKPIs(correlationId) {
    try {
        const { data, error } = await supabase
            .from('v_operational_kpis_today')
            .select('*')
            .single();

        if (error) throw error;
        return data || {};
    } catch (error) {
        logger.error('Error al obtener KPIs operacionales', { correlationId, error: error.message });
        throw new AppError('Error al obtener KPIs operacionales', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Obtener KPIs de satisfacción (últimos 7 días)
 */
async function getSatisfactionKPIs(correlationId) {
    try {
        const { data, error } = await supabase
            .from('v_satisfaction_kpis_recent')
            .select('*')
            .single();

        if (error) throw error;
        return data || {};
    } catch (error) {
        logger.error('Error al obtener KPIs de satisfacción', { correlationId, error: error.message });
        throw new AppError('Error al obtener KPIs de satisfacción', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Obtener KPIs de retención (últimos 30 días)
 */
async function getRetentionKPIs(correlationId) {
    try {
        const { data, error } = await supabase
            .from('v_retention_kpis_month')
            .select('*')
            .single();

        if (error) throw error;
        return data || {};
    } catch (error) {
        logger.error('Error al obtener KPIs de retención', { correlationId, error: error.message });
        throw new AppError('Error al obtener KPIs de retención', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// SNAPSHOTS DIARIOS
// ============================================================================

/**
 * Crear snapshot diario manualmente
 * (También puede ser ejecutado por cron a las 23:59)
 */
async function createDailySnapshot(correlationId) {
    try {
        logger.info('Creando snapshot diario', { correlationId });

        // Ejecutar función almacenada que refresca vistas y crea snapshot
        const { data, error } = await supabase.rpc('create_daily_snapshot');

        if (error) {
            throw new AppError(
                'Error al crear snapshot diario',
                ErrorTypes.DATABASE_ERROR,
                500,
                { error: error.message }
            );
        }

        // Obtener el snapshot creado
        const { data: snapshot, error: fetchError } = await supabase
            .from('dashboard_snapshots')
            .select('*')
            .eq('snapshot_date', new Date().toISOString().split('T')[0])
            .single();

        if (fetchError) {
            throw new AppError('Error al obtener snapshot creado', ErrorTypes.DATABASE_ERROR, 500);
        }

        logger.info('Snapshot diario creado exitosamente', {
            correlationId,
            snapshotId: snapshot.id,
            date: snapshot.snapshot_date
        });

        // Generar decisiones prioritarias con IA
        try {
            const kpis = await getTodayKPIs(correlationId);
            const context = await buildDecisionContext(correlationId);
            await aiDecisionService.generatePriorityDecisions(
                snapshot.id,
                kpis,
                context,
                correlationId
            );
        } catch (aiError) {
            logger.error('Error al generar decisiones con IA (no crítico)', {
                correlationId,
                error: aiError.message
            });
        }

        return snapshot;

    } catch (error) {
        logger.error('Error al crear snapshot diario', {
            correlationId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener snapshot de una fecha específica
 */
async function getSnapshotByDate(date, correlationId) {
    try {
        const { data, error } = await supabase
            .from('dashboard_snapshots')
            .select('*')
            .eq('snapshot_date', date)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No existe snapshot para esa fecha
            }
            throw error;
        }

        return data;

    } catch (error) {
        logger.error('Error al obtener snapshot', { correlationId, date, error: error.message });
        throw new AppError('Error al obtener snapshot', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Obtener snapshots de un rango de fechas
 */
async function getSnapshotsByRange(startDate, endDate, correlationId) {
    try {
        const { data, error } = await supabase
            .from('dashboard_snapshots')
            .select('*')
            .gte('snapshot_date', startDate)
            .lte('snapshot_date', endDate)
            .order('snapshot_date', { ascending: false });

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error al obtener snapshots por rango', {
            correlationId,
            startDate,
            endDate,
            error: error.message
        });
        throw new AppError('Error al obtener snapshots', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// ALERTAS
// ============================================================================

/**
 * Obtener alertas activas
 */
async function getActiveAlerts(severity = null, correlationId) {
    try {
        let query = supabase
            .from('dashboard_alerts')
            .select('*')
            .eq('status', 'active')
            .order('severity_order', { ascending: false })
            .order('created_at', { ascending: false });

        if (severity) {
            query = query.eq('severity', severity);
        }

        const { data, error } = await query;

        if (error) throw error;

        logger.info('Alertas activas obtenidas', {
            correlationId,
            count: data?.length || 0,
            severity
        });

        return data || [];

    } catch (error) {
        logger.error('Error al obtener alertas activas', {
            correlationId,
            error: error.message
        });
        throw new AppError('Error al obtener alertas', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Detectar alertas críticas manualmente
 * (También ejecutado automáticamente por cron cada hora)
 */
async function detectCriticalAlerts(correlationId) {
    try {
        logger.info('Detectando alertas críticas', { correlationId });

        const { data, error } = await supabase.rpc('detect_critical_alerts');

        if (error) {
            throw new AppError(
                'Error al detectar alertas',
                ErrorTypes.DATABASE_ERROR,
                500,
                { error: error.message }
            );
        }

        const alertsCount = data || 0;

        logger.info('Alertas críticas detectadas', {
            correlationId,
            newAlertsCount: alertsCount
        });

        return alertsCount;

    } catch (error) {
        logger.error('Error al detectar alertas críticas', {
            correlationId,
            error: error.message
        });
        throw error;
    }
}

/**
 * Descartar alerta manualmente
 */
async function dismissAlert(alertId, dismissedBy, reason, correlationId) {
    try {
        const { data, error } = await supabase
            .from('dashboard_alerts')
            .update({
                status: 'dismissed',
                dismissed_at: new Date().toISOString(),
                dismissed_by: dismissedBy,
                dismissed_reason: reason
            })
            .eq('id', alertId)
            .select()
            .single();

        if (error) {
            throw new AppError(
                'Error al descartar alerta',
                ErrorTypes.DATABASE_ERROR,
                500
            );
        }

        logger.info('Alerta descartada', {
            correlationId,
            alertId,
            type: data.alert_type,
            dismissedBy
        });

        return data;

    } catch (error) {
        logger.error('Error al descartar alerta', {
            correlationId,
            alertId,
            error: error.message
        });
        throw error;
    }
}

// ============================================================================
// TENDENCIAS Y ANÁLISIS
// ============================================================================

/**
 * Obtener tendencia de un KPI específico (últimos N días)
 */
async function getKPITrend(kpiName, days = 7, correlationId) {
    try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];

        const { data, error } = await supabase
            .from('dashboard_snapshots')
            .select(`snapshot_date, ${kpiName}`)
            .gte('snapshot_date', startDate)
            .lte('snapshot_date', endDate)
            .order('snapshot_date', { ascending: true });

        if (error) throw error;

        // Calcular estadísticas de tendencia
        const values = data.map(d => d[kpiName]).filter(v => v !== null);
        const trend = calculateTrendStats(values);

        return {
            kpi: kpiName,
            period: `${days} días`,
            data: data || [],
            stats: trend
        };

    } catch (error) {
        logger.error('Error al obtener tendencia de KPI', {
            correlationId,
            kpiName,
            days,
            error: error.message
        });
        throw new AppError('Error al obtener tendencia', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Calcular estadísticas de tendencia
 */
function calculateTrendStats(values) {
    if (!values || values.length === 0) {
        return { min: 0, max: 0, avg: 0, change: 0, changePercent: 0 };
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
    const change = values[values.length - 1] - values[0];
    const changePercent = values[0] !== 0 ? (change / values[0]) * 100 : 0;

    return {
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100,
        avg: Math.round(avg * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100
    };
}

/**
 * Comparar KPIs actuales vs objetivos
 */
async function compareKPIsVsTargets(correlationId) {
    try {
        const kpis = await getTodayKPIs(correlationId);
        
        const { data: targets, error } = await supabase
            .from('kpi_targets')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;

        const comparison = targets.map(target => {
            const currentValue = kpis[target.kpi_name] || 0;
            const targetValue = target.target_value;
            const warningValue = target.warning_threshold;
            const criticalValue = target.critical_threshold;

            let status = 'ok';
            let percentageVsTarget = 0;

            if (target.comparison_type === 'greater_than') {
                percentageVsTarget = (currentValue / targetValue) * 100;
                if (currentValue < criticalValue) status = 'critical';
                else if (currentValue < warningValue) status = 'warning';
            } else {
                percentageVsTarget = 100 - (currentValue / targetValue) * 100;
                if (currentValue > criticalValue) status = 'critical';
                else if (currentValue > warningValue) status = 'warning';
            }

            return {
                kpiName: target.kpi_name,
                category: target.category,
                currentValue: Math.round(currentValue * 100) / 100,
                targetValue,
                percentageVsTarget: Math.round(percentageVsTarget * 100) / 100,
                status,
                warningThreshold: warningValue,
                criticalThreshold: criticalValue
            };
        });

        return comparison;

    } catch (error) {
        logger.error('Error al comparar KPIs vs objetivos', {
            correlationId,
            error: error.message
        });
        throw new AppError('Error al comparar KPIs', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// DRILL-DOWN Y DETALLE
// ============================================================================

/**
 * Obtener detalle de ingresos por día (drill-down)
 */
async function getRevenueBreakdown(date, correlationId) {
    try {
        const { data: memberships, error: memberError } = await supabase
            .from('payments')
            .select('monto, tipo, fecha_pago, members(nombre, apellido)')
            .eq('fecha_pago', date)
            .in('tipo', ['mensualidad', 'anualidad', 'inscripcion']);

        if (memberError) throw memberError;

        const { data: classes, error: classError } = await supabase
            .from('payments')
            .select('monto, tipo, fecha_pago, members(nombre, apellido)')
            .eq('fecha_pago', date)
            .eq('tipo', 'clase');

        if (classError) throw classError;

        return {
            date,
            memberships: memberships || [],
            classes: classes || [],
            total: {
                memberships: memberships.reduce((sum, p) => sum + p.monto, 0),
                classes: classes.reduce((sum, p) => sum + p.monto, 0)
            }
        };

    } catch (error) {
        logger.error('Error al obtener desglose de ingresos', {
            correlationId,
            date,
            error: error.message
        });
        throw new AppError('Error al obtener detalle de ingresos', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Obtener lista de miembros con deuda
 */
async function getDebtorsList(correlationId) {
    try {
        const { data, error } = await supabase
            .from('members')
            .select('id, nombre, apellido, telefono, deuda_actual, fecha_ultimo_pago')
            .gt('deuda_actual', 0)
            .order('deuda_actual', { ascending: false });

        if (error) throw error;

        return data || [];

    } catch (error) {
        logger.error('Error al obtener lista de deudores', {
            correlationId,
            error: error.message
        });
        throw new AppError('Error al obtener deudores', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Obtener detalle de ocupación por clase
 */
async function getClassOccupancyDetails(date, correlationId) {
    try {
        const { data, error } = await supabase
            .from('clases')
            .select(`
                id,
                nombre_clase,
                horario,
                capacidad_maxima,
                instructor_id
            `)
            .eq('fecha', date)
            .order('horario', { ascending: true });

        if (error) throw error;

        // Agregar conteo de check-ins por clase
        const classesWithOccupancy = await Promise.all(
            (data || []).map(async (clase) => {
                const { count } = await supabase
                    .from('checkins')
                    .select('*', { count: 'exact', head: true })
                    .eq('clase_id', clase.id);

                return {
                    ...clase,
                    checkins: count || 0,
                    occupancyPercent: Math.round(((count || 0) / clase.capacidad_maxima) * 100)
                };
            })
        );

        return classesWithOccupancy;

    } catch (error) {
        logger.error('Error al obtener detalle de ocupación', {
            correlationId,
            date,
            error: error.message
        });
        throw new AppError('Error al obtener ocupación de clases', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Construir contexto adicional para decisiones de IA
 */
async function buildDecisionContext(correlationId) {
    try {
        // Obtener tendencias de los últimos 7 días
        const revenueTrend = await getKPITrend('revenue_total', 7, correlationId);
        const checkinsTrend = await getKPITrend('total_checkins', 7, correlationId);
        
        // Obtener alertas activas
        const activeAlerts = await getActiveAlerts(null, correlationId);

        const context = {
            trends: `
- Ingresos: ${revenueTrend.stats.changePercent >= 0 ? '+' : ''}${revenueTrend.stats.changePercent}% vs hace 7 días
- Check-ins: ${checkinsTrend.stats.changePercent >= 0 ? '+' : ''}${checkinsTrend.stats.changePercent}% vs hace 7 días
            `.trim(),
            alerts: activeAlerts.length > 0
                ? activeAlerts.map(a => `[${a.severity.toUpperCase()}] ${a.alert_type}: ${a.message}`).join('\n')
                : 'Sin alertas activas'
        };

        return context;

    } catch (error) {
        logger.error('Error al construir contexto para decisiones', {
            correlationId,
            error: error.message
        });
        return { trends: '', alerts: '' };
    }
}

/**
 * Refrescar vistas materializadas manualmente
 */
async function refreshMaterializedViews(correlationId) {
    try {
        logger.info('Refrescando vistas materializadas', { correlationId });

        const views = [
            'v_financial_kpis_today',
            'v_operational_kpis_today',
            'v_satisfaction_kpis_recent',
            'v_retention_kpis_month',
            'v_executive_summary'
        ];

        for (const view of views) {
            await supabase.rpc('refresh_materialized_view', { view_name: view });
        }

        logger.info('Vistas materializadas refrescadas exitosamente', { correlationId });

    } catch (error) {
        logger.error('Error al refrescar vistas materializadas', {
            correlationId,
            error: error.message
        });
        throw new AppError(
            'Error al refrescar vistas',
            ErrorTypes.DATABASE_ERROR,
            500
        );
    }
}

module.exports = {
    // KPIs
    getTodayKPIs,
    getFinancialKPIs,
    getOperationalKPIs,
    getSatisfactionKPIs,
    getRetentionKPIs,
    
    // Snapshots
    createDailySnapshot,
    getSnapshotByDate,
    getSnapshotsByRange,
    
    // Alertas
    getActiveAlerts,
    detectCriticalAlerts,
    dismissAlert,
    
    // Tendencias
    getKPITrend,
    compareKPIsVsTargets,
    
    // Drill-down
    getRevenueBreakdown,
    getDebtorsList,
    getClassOccupancyDetails,
    
    // Utilidades
    buildDecisionContext,
    refreshMaterializedViews
};
