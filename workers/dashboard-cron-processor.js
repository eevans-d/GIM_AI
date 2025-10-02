/**
 * PROMPT 15: DASHBOARD CRON PROCESSOR
 * Procesador de tareas programadas para el Executive Dashboard
 * - Snapshots diarios (23:59)
 * - Detección de alertas críticas (cada hora)
 * - Limpieza de alertas expiradas (cada hora)
 * - Refresh de vistas materializadas (cada 5 min)
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger').createLogger('dashboard-cron');
const dashboardService = require('../services/dashboard-service');
const { v4: uuidv4 } = require('uuid');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CRON_CONFIG = {
    // Snapshot diario a las 23:59
    dailySnapshot: process.env.DASHBOARD_SNAPSHOT_CRON_HOUR 
        ? `${process.env.DASHBOARD_SNAPSHOT_CRON_MINUTE || 59} ${process.env.DASHBOARD_SNAPSHOT_CRON_HOUR} * * *`
        : '59 23 * * *',
    
    // Detección de alertas cada hora
    alertDetection: '0 * * * *',
    
    // Limpieza de alertas cada hora (5 min después de detección)
    alertCleanup: '5 * * * *',
    
    // Refresh de vistas materializadas cada 5 minutos
    viewRefresh: '*/5 * * * *'
};

// ============================================================================
// TAREAS CRON
// ============================================================================

/**
 * CRON 1: Crear snapshot diario (23:59)
 */
const dailySnapshotJob = cron.schedule(
    CRON_CONFIG.dailySnapshot,
    async () => {
        const correlationId = `cron-snapshot-${uuidv4()}`;
        
        try {
            logger.info('Iniciando creación de snapshot diario', { correlationId });
            
            const snapshot = await dashboardService.createDailySnapshot(correlationId);
            
            logger.info('Snapshot diario creado exitosamente', {
                correlationId,
                snapshotId: snapshot.id,
                date: snapshot.snapshot_date,
                revenue: snapshot.revenue_total,
                checkins: snapshot.total_checkins
            });

        } catch (error) {
            logger.error('Error al crear snapshot diario', {
                correlationId,
                error: error.message,
                stack: error.stack
            });
        }
    },
    {
        scheduled: false, // No iniciar automáticamente, se iniciará desde initializeDashboardCron
        timezone: process.env.TZ || 'America/Mexico_City'
    }
);

/**
 * CRON 2: Detectar alertas críticas (cada hora)
 */
const alertDetectionJob = cron.schedule(
    CRON_CONFIG.alertDetection,
    async () => {
        const correlationId = `cron-alerts-${uuidv4()}`;
        
        try {
            logger.info('Iniciando detección de alertas críticas', { correlationId });
            
            const newAlertsCount = await dashboardService.detectCriticalAlerts(correlationId);
            
            logger.info('Detección de alertas completada', {
                correlationId,
                newAlertsCount
            });

        } catch (error) {
            logger.error('Error al detectar alertas críticas', {
                correlationId,
                error: error.message
            });
        }
    },
    {
        scheduled: false,
        timezone: process.env.TZ || 'America/Mexico_City'
    }
);

/**
 * CRON 3: Limpiar alertas expiradas (cada hora)
 */
const alertCleanupJob = cron.schedule(
    CRON_CONFIG.alertCleanup,
    async () => {
        const correlationId = `cron-cleanup-${uuidv4()}`;
        
        try {
            logger.info('Iniciando limpieza de alertas expiradas', { correlationId });
            
            const { data, error } = await supabase.rpc('cleanup_expired_alerts');
            
            if (error) {
                throw error;
            }

            const expiredCount = data || 0;
            
            logger.info('Limpieza de alertas completada', {
                correlationId,
                expiredCount
            });

        } catch (error) {
            logger.error('Error al limpiar alertas expiradas', {
                correlationId,
                error: error.message
            });
        }
    },
    {
        scheduled: false,
        timezone: process.env.TZ || 'America/Mexico_City'
    }
);

/**
 * CRON 4: Refrescar vistas materializadas (cada 5 min)
 */
const viewRefreshJob = cron.schedule(
    CRON_CONFIG.viewRefresh,
    async () => {
        const correlationId = `cron-refresh-${uuidv4()}`;
        
        try {
            logger.debug('Refrescando vistas materializadas', { correlationId });
            
            await dashboardService.refreshMaterializedViews(correlationId);
            
            logger.debug('Vistas materializadas refrescadas', { correlationId });

        } catch (error) {
            logger.error('Error al refrescar vistas materializadas', {
                correlationId,
                error: error.message
            });
        }
    },
    {
        scheduled: false,
        timezone: process.env.TZ || 'America/Mexico_City'
    }
);

// ============================================================================
// CONTROL DE JOBS
// ============================================================================

/**
 * Iniciar todos los cron jobs del dashboard
 */
function initializeDashboardCron() {
    try {
        logger.info('Iniciando cron jobs del dashboard', {
            config: CRON_CONFIG
        });

        // Iniciar todos los jobs
        dailySnapshotJob.start();
        alertDetectionJob.start();
        alertCleanupJob.start();
        viewRefreshJob.start();

        logger.info('Cron jobs del dashboard iniciados exitosamente', {
            jobs: {
                dailySnapshot: CRON_CONFIG.dailySnapshot,
                alertDetection: CRON_CONFIG.alertDetection,
                alertCleanup: CRON_CONFIG.alertCleanup,
                viewRefresh: CRON_CONFIG.viewRefresh
            }
        });

        return {
            dailySnapshotJob,
            alertDetectionJob,
            alertCleanupJob,
            viewRefreshJob
        };

    } catch (error) {
        logger.error('Error al iniciar cron jobs del dashboard', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Detener todos los cron jobs del dashboard
 */
function stopDashboardCron() {
    try {
        logger.info('Deteniendo cron jobs del dashboard');

        dailySnapshotJob.stop();
        alertDetectionJob.stop();
        alertCleanupJob.stop();
        viewRefreshJob.stop();

        logger.info('Cron jobs del dashboard detenidos');

    } catch (error) {
        logger.error('Error al detener cron jobs del dashboard', {
            error: error.message
        });
        throw error;
    }
}

/**
 * Obtener estado de los cron jobs
 */
function getDashboardCronStatus() {
    return {
        dailySnapshot: {
            cron: CRON_CONFIG.dailySnapshot,
            running: dailySnapshotJob ? true : false
        },
        alertDetection: {
            cron: CRON_CONFIG.alertDetection,
            running: alertDetectionJob ? true : false
        },
        alertCleanup: {
            cron: CRON_CONFIG.alertCleanup,
            running: alertCleanupJob ? true : false
        },
        viewRefresh: {
            cron: CRON_CONFIG.viewRefresh,
            running: viewRefreshJob ? true : false
        }
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    initializeDashboardCron,
    stopDashboardCron,
    getDashboardCronStatus,
    
    // Exportar jobs individuales para testing
    jobs: {
        dailySnapshotJob,
        alertDetectionJob,
        alertCleanupJob,
        viewRefreshJob
    }
};
