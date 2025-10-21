/**
 * ADMIN QUERIES HELPER
 * Central hub for all admin dashboard database operations
 * Uses Supabase service key for full data access
 */

const { createClient } = require('@supabase/supabase-js');
const { AppError, ErrorTypes } = require('../../../utils/error-handler');
const logger = require('../../../utils/logger').createLogger('admin-queries');

// Initialize Supabase with service key (full access, bypasses RLS)
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// ============================================================================
// METRICS QUERIES
// ============================================================================

/**
 * Get comprehensive dashboard metrics
 * @param {string} correlationId - Request correlation ID
 * @returns {Promise<Object>} Dashboard metrics object
 */
async function getDashboardMetrics(correlationId) {
    try {
        logger.info('Fetching dashboard metrics', { correlationId });

        // Get today's summary
        const today = new Date().toISOString().split('T')[0];
        
        // Parallel queries for performance
        const [
            memberStats,
            checkinsData,
            revenueData,
            paymentsData,
            classesData,
            churnData
        ] = await Promise.all([
            // Active members count
            supabase
                .from('members')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'activo'),
            
            // Today's checkins
            supabase
                .from('checkins')
                .select('id', { count: 'exact', head: true })
                .gte('fecha_checkin', today + 'T00:00:00')
                .lt('fecha_checkin', today + 'T23:59:59'),
            
            // Monthly revenue
            supabase
                .from('payments')
                .select('monto')
                .gte('fecha_pago', today.substring(0, 7) + '-01')
                .lt('fecha_pago', today.substring(0, 8) + 'Z'),
            
            // Pending payments
            supabase
                .from('payments')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'pendiente'),
            
            // Classes status
            supabase
                .from('clases')
                .select('id,capacidad_maxima')
                .eq('estado', 'activo'),
            
            // Churn risk (members inactive > 30 days)
            supabase
                .from('members')
                .select('id', { count: 'exact', head: true })
                .eq('estado', 'activo')
                .lt('fecha_ultimo_checkin', 
                    new Date(Date.now() - 30*24*60*60*1000).toISOString())
        ]);

        // Calculate aggregates
        const totalMembers = memberStats.count || 0;
        const todayCheckins = checkinsData.count || 0;
        const monthlyRevenue = (revenueData.data || [])
            .reduce((sum, p) => sum + (p.monto || 0), 0);
        const pendingPayments = paymentsData.count || 0;
        const occupancy = classesData.data?.length > 0 
            ? Math.round((todayCheckins / (classesData.data.length * 20)) * 100)
            : 0;
        const churnRisk = churnData.count || 0;

        const metrics = {
            activeMembers: totalMembers,
            todayCheckins,
            monthlyRevenue: Math.round(monthlyRevenue),
            pendingPayments,
            classOccupancy: Math.min(occupancy, 100), // Cap at 100%
            churnRisk,
            // Trends (last 7 days vs current)
            membersTrend: Math.round(Math.random() * 20 - 10), // Mock for now
            checkinsTrend: Math.round(Math.random() * 15 - 7),
            revenueTrend: Math.round(Math.random() * 25 - 12),
            timestamp: new Date().toISOString()
        };

        logger.info('Dashboard metrics fetched', { correlationId, metrics });
        return metrics;

    } catch (error) {
        logger.error('Error fetching dashboard metrics', { 
            correlationId, 
            error: error.message 
        });
        throw new AppError(
            'Failed to fetch dashboard metrics',
            ErrorTypes.DATABASE_ERROR,
            500,
            { originalError: error.message }
        );
    }
}

// ============================================================================
// CLASSES QUERIES
// ============================================================================

/**
 * Get all classes with occupancy info
 * @param {string} correlationId
 * @returns {Promise<Array>} Classes list
 */
async function getClassesList(correlationId) {
    try {
        logger.info('Fetching classes list', { correlationId });

        const { data: classes, error } = await supabase
            .from('clases')
            .select(`
                id,
                nombre,
                instructor_id,
                horario,
                capacidad_maxima,
                estado,
                created_at
            `)
            .eq('estado', 'activo')
            .order('horario', { ascending: true });

        if (error) throw error;

        // Enrich with occupancy data
        const classesWithOccupancy = await Promise.all(
            (classes || []).map(async (clase) => {
                const { count } = await supabase
                    .from('checkins')
                    .select('id', { count: 'exact', head: true })
                    .eq('clase_id', clase.id)
                    .gte('fecha_checkin', 
                        new Date().toISOString().split('T')[0] + 'T00:00:00');

                return {
                    ...clase,
                    currentOccupancy: count || 0,
                    occupancyPercentage: Math.round(
                        ((count || 0) / clase.capacidad_maxima) * 100
                    )
                };
            })
        );

        logger.info('Classes list fetched', { 
            correlationId, 
            count: classesWithOccupancy.length 
        });

        return classesWithOccupancy;

    } catch (error) {
        logger.error('Error fetching classes', { correlationId, error: error.message });
        throw new AppError(
            'Failed to fetch classes',
            ErrorTypes.DATABASE_ERROR,
            500
        );
    }
}

/**
 * Pause a specific class
 * @param {string} classId - Class ID
 * @param {string} correlationId
 * @returns {Promise<Object>} Updated class
 */
async function pauseClass(classId, correlationId) {
    try {
        logger.info('Pausing class', { correlationId, classId });

        const { data, error } = await supabase
            .from('clases')
            .update({ estado: 'pausado', updated_at: new Date().toISOString() })
            .eq('id', classId)
            .select()
            .single();

        if (error) throw error;

        logger.info('Class paused', { correlationId, classId });
        return data;

    } catch (error) {
        logger.error('Error pausing class', { correlationId, classId, error: error.message });
        throw new AppError('Failed to pause class', ErrorTypes.DATABASE_ERROR, 500);
    }
}

/**
 * Resume a specific class
 * @param {string} classId - Class ID
 * @param {string} correlationId
 * @returns {Promise<Object>} Updated class
 */
async function resumeClass(classId, correlationId) {
    try {
        logger.info('Resuming class', { correlationId, classId });

        const { data, error } = await supabase
            .from('clases')
            .update({ estado: 'activo', updated_at: new Date().toISOString() })
            .eq('id', classId)
            .select()
            .single();

        if (error) throw error;

        logger.info('Class resumed', { correlationId, classId });
        return data;

    } catch (error) {
        logger.error('Error resuming class', { correlationId, classId, error: error.message });
        throw new AppError('Failed to resume class', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// MEMBERS QUERIES
// ============================================================================

/**
 * Get members with optional filtering
 * @param {string} filter - 'all' | 'active' | 'inactive' | 'debt'
 * @param {string} correlationId
 * @returns {Promise<Array>} Filtered members list
 */
async function getMembersList(filter = 'all', correlationId) {
    try {
        logger.info('Fetching members list', { correlationId, filter });

        let query = supabase
            .from('members')
            .select(`
                id,
                nombre,
                telefono,
                email,
                estado,
                fecha_registro,
                fecha_ultimo_checkin,
                deuda_actual
            `)
            .order('fecha_registro', { ascending: false });

        // Apply filter
        if (filter === 'active') {
            query = query.eq('estado', 'activo');
        } else if (filter === 'inactive') {
            query = query.eq('estado', 'inactivo');
        } else if (filter === 'debt') {
            query = query.gt('deuda_actual', 0);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Enrich with status badges
        const enrichedMembers = (data || []).map(member => ({
            ...member,
            statusBadge: member.estado === 'activo' ? 'active' : 'inactive',
            debtDays: member.deuda_actual > 0 
                ? Math.floor((Date.now() - new Date(member.fecha_ultimo_checkin)) / (1000*60*60*24))
                : 0
        }));

        logger.info('Members list fetched', { correlationId, count: enrichedMembers.length });
        return enrichedMembers;

    } catch (error) {
        logger.error('Error fetching members', { correlationId, filter, error: error.message });
        throw new AppError('Failed to fetch members', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// PAYMENTS QUERIES
// ============================================================================

/**
 * Get pending payments
 * @param {string} correlationId
 * @returns {Promise<Array>} Pending payments
 */
async function getPendingPayments(correlationId) {
    try {
        logger.info('Fetching pending payments', { correlationId });

        const { data, error } = await supabase
            .from('payments')
            .select(`
                id,
                member_id,
                monto,
                fecha_vencimiento,
                estado,
                created_at
            `)
            .eq('estado', 'pendiente')
            .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;

        // Add days overdue calculation
        const today = new Date();
        const paymentsWithOverdue = (data || []).map(payment => ({
            ...payment,
            daysOverdue: Math.max(
                0,
                Math.floor(
                    (today - new Date(payment.fecha_vencimiento)) / (1000*60*60*24)
                )
            ),
            severityColor: Math.floor(
                (today - new Date(payment.fecha_vencimiento)) / (1000*60*60*24)
            ) > 30 ? 'danger' : 'warning'
        }));

        logger.info('Pending payments fetched', { 
            correlationId, 
            count: paymentsWithOverdue.length 
        });
        return paymentsWithOverdue;

    } catch (error) {
        logger.error('Error fetching pending payments', { 
            correlationId, 
            error: error.message 
        });
        throw new AppError('Failed to fetch pending payments', ErrorTypes.DATABASE_ERROR, 500);
    }
}

// ============================================================================
// REPORTS QUERIES
// ============================================================================

/**
 * Get list of previously generated reports
 * @param {string} correlationId
 * @returns {Promise<Array>} Reports list
 */
async function getReportsList(correlationId) {
    try {
        logger.info('Fetching reports list', { correlationId });

        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        logger.info('Reports list fetched', { correlationId, count: data?.length || 0 });
        return data || [];

    } catch (error) {
        logger.error('Error fetching reports', { correlationId, error: error.message });
        throw new AppError('Failed to fetch reports', ErrorTypes.DATABASE_ERROR, 500);
    }
}

module.exports = {
    // Metrics
    getDashboardMetrics,
    
    // Classes
    getClassesList,
    pauseClass,
    resumeClass,
    
    // Members
    getMembersList,
    
    // Payments
    getPendingPayments,
    
    // Reports
    getReportsList
};
