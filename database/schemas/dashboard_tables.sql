-- =============================================
-- PROMPT 15: EXECUTIVE DASHBOARD "COMMAND CENTER"
-- Tablas para dashboard ejecutivo con KPIs en tiempo real y decisiones IA
-- =============================================

-- =============================================
-- TABLA: dashboard_snapshots
-- Propósito: Histórico diario de KPIs para análisis de tendencias
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Fecha del snapshot
    snapshot_date DATE NOT NULL UNIQUE,
    snapshot_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- KPIs Financieros (Revenue)
    revenue_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue_memberships DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue_classes DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue_products DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- KPIs Operacionales (Operations)
    total_checkins INTEGER NOT NULL DEFAULT 0,
    unique_members_attended INTEGER NOT NULL DEFAULT 0,
    classes_held INTEGER NOT NULL DEFAULT 0,
    avg_class_occupancy DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_capacity_used DECIMAL(5,2) NOT NULL DEFAULT 0,
    
    -- KPIs Financieros - Deuda (Collections)
    total_debt DECIMAL(12,2) NOT NULL DEFAULT 0,
    members_with_debt INTEGER NOT NULL DEFAULT 0,
    debt_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    collections_recovered DECIMAL(12,2) NOT NULL DEFAULT 0,
    
    -- KPIs de Satisfacción (Satisfaction)
    nps_score DECIMAL(5,2),
    avg_class_rating DECIMAL(3,2),
    surveys_completed INTEGER NOT NULL DEFAULT 0,
    complaints_count INTEGER NOT NULL DEFAULT 0,
    
    -- KPIs de Membresía (Membership)
    active_members INTEGER NOT NULL DEFAULT 0,
    new_members INTEGER NOT NULL DEFAULT 0,
    churned_members INTEGER NOT NULL DEFAULT 0,
    retention_rate DECIMAL(5,2),
    
    -- KPIs de Staff
    active_instructors INTEGER NOT NULL DEFAULT 0,
    replacements_needed INTEGER NOT NULL DEFAULT 0,
    replacements_filled INTEGER NOT NULL DEFAULT 0,
    staff_utilization DECIMAL(5,2),
    
    -- Metadata
    generated_by VARCHAR(50) DEFAULT 'auto_cron',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para dashboard_snapshots
CREATE INDEX idx_dashboard_snapshots_date ON dashboard_snapshots(snapshot_date DESC);
CREATE INDEX idx_dashboard_snapshots_timestamp ON dashboard_snapshots(snapshot_timestamp DESC);

-- =============================================
-- TABLA: priority_decisions
-- Propósito: Decisiones prioritarias del día generadas por IA
-- =============================================
CREATE TABLE IF NOT EXISTS priority_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Asociación con snapshot
    snapshot_id UUID REFERENCES dashboard_snapshots(id) ON DELETE CASCADE,
    decision_date DATE NOT NULL,
    
    -- Ranking de prioridad (1 = más importante)
    priority_rank INTEGER NOT NULL CHECK (priority_rank BETWEEN 1 AND 10),
    
    -- Categoría de la decisión
    decision_category VARCHAR(50) NOT NULL,
    -- Categorías: financial, operational, satisfaction, retention, staff, marketing
    
    -- Contenido de la decisión
    decision_title VARCHAR(200) NOT NULL,
    decision_description TEXT NOT NULL,
    decision_rationale TEXT, -- Por qué es importante (generado por IA)
    
    -- Métricas relacionadas
    related_kpis JSONB, -- { "revenue": -15, "nps": 45, etc }
    impact_score DECIMAL(5,2), -- Score 0-100 de impacto potencial
    urgency_level VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Acción recomendada
    recommended_action TEXT,
    action_owner VARCHAR(100), -- Quién debería ejecutar
    estimated_time_minutes INTEGER, -- Tiempo estimado para resolver
    
    -- Estado de ejecución
    status VARCHAR(20) DEFAULT 'pending',
    -- Estados: pending, in_progress, completed, dismissed
    
    assigned_to UUID REFERENCES members(id),
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    
    -- Generación IA
    generated_by_ai BOOLEAN DEFAULT TRUE,
    ai_model VARCHAR(50), -- gemini-pro, gpt-4, etc
    ai_confidence DECIMAL(5,2), -- 0-100
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para priority_decisions
CREATE INDEX idx_priority_decisions_date ON priority_decisions(decision_date DESC);
CREATE INDEX idx_priority_decisions_rank ON priority_decisions(priority_rank);
CREATE INDEX idx_priority_decisions_status ON priority_decisions(status);
CREATE INDEX idx_priority_decisions_category ON priority_decisions(decision_category);
CREATE INDEX idx_priority_decisions_pending ON priority_decisions(status, decision_date) 
    WHERE status = 'pending';

-- =============================================
-- TABLA: dashboard_alerts
-- Propósito: Alertas críticas del sistema que requieren atención inmediata
-- =============================================
CREATE TABLE IF NOT EXISTS dashboard_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tipo y severidad
    alert_type VARCHAR(50) NOT NULL,
    -- Tipos: revenue_drop, high_debt, low_attendance, low_nps, 
    --        high_churn, staff_shortage, system_error
    alert_severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    -- Severidades: low, medium, high, critical
    
    -- Contenido
    alert_title VARCHAR(200) NOT NULL,
    alert_message TEXT NOT NULL,
    alert_details JSONB,
    
    -- Threshold que disparó la alerta
    threshold_type VARCHAR(50),
    threshold_value DECIMAL(12,2),
    actual_value DECIMAL(12,2),
    
    -- Estado
    alert_status VARCHAR(20) DEFAULT 'active',
    -- Estados: active, acknowledged, resolved, dismissed, expired
    
    -- Acción recomendada
    recommended_action TEXT,
    action_url VARCHAR(500), -- Link directo a la sección relevante
    
    -- Tracking
    acknowledged_by UUID REFERENCES members(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES members(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Expiración automática
    expires_at TIMESTAMPTZ,
    auto_dismiss_after_hours INTEGER DEFAULT 24,
    
    -- Notificaciones
    notification_sent BOOLEAN DEFAULT FALSE,
    notification_channels TEXT[], -- ['whatsapp', 'email', 'push']
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para dashboard_alerts
CREATE INDEX idx_dashboard_alerts_type ON dashboard_alerts(alert_type);
CREATE INDEX idx_dashboard_alerts_severity ON dashboard_alerts(alert_severity);
CREATE INDEX idx_dashboard_alerts_status ON dashboard_alerts(alert_status);
CREATE INDEX idx_dashboard_alerts_active ON dashboard_alerts(alert_status, alert_severity) 
    WHERE alert_status = 'active';
CREATE INDEX idx_dashboard_alerts_expires ON dashboard_alerts(expires_at) 
    WHERE expires_at IS NOT NULL;

-- =============================================
-- TABLA: kpi_targets
-- Propósito: Metas configurables para cada KPI
-- =============================================
CREATE TABLE IF NOT EXISTS kpi_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- KPI
    kpi_name VARCHAR(100) NOT NULL UNIQUE,
    kpi_category VARCHAR(50) NOT NULL, -- financial, operational, satisfaction, retention
    
    -- Targets
    target_value DECIMAL(12,2) NOT NULL,
    warning_threshold DECIMAL(12,2), -- Amarillo si se acerca
    critical_threshold DECIMAL(12,2), -- Rojo si se supera/baja
    
    -- Tipo de comparación
    comparison_type VARCHAR(20) NOT NULL DEFAULT 'greater_than',
    -- greater_than, less_than, equals, range
    
    -- Unidad de medida
    unit VARCHAR(20) DEFAULT 'number', -- number, percentage, currency, count
    
    -- Metadata
    description TEXT,
    calculation_method TEXT,
    update_frequency VARCHAR(50) DEFAULT 'daily', -- realtime, hourly, daily, weekly
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para kpi_targets
CREATE INDEX idx_kpi_targets_category ON kpi_targets(kpi_category);
CREATE INDEX idx_kpi_targets_active ON kpi_targets(is_active) WHERE is_active = TRUE;

-- =============================================
-- VISTAS MATERIALIZADAS PARA KPIS EN TIEMPO REAL
-- =============================================

-- Vista: KPIs Financieros del Día Actual
CREATE MATERIALIZED VIEW IF NOT EXISTS v_financial_kpis_today AS
WITH today_payments AS (
    SELECT 
        SUM(monto) FILTER (WHERE concepto = 'membership') AS revenue_memberships,
        SUM(monto) FILTER (WHERE concepto = 'class') AS revenue_classes,
        SUM(monto) FILTER (WHERE concepto = 'product') AS revenue_products,
        SUM(monto) AS revenue_total,
        COUNT(DISTINCT member_id) AS paying_members_today
    FROM payments
    WHERE DATE(fecha_pago) = CURRENT_DATE
),
debt_stats AS (
    SELECT 
        SUM(deuda_actual) AS total_debt,
        COUNT(*) FILTER (WHERE deuda_actual > 0) AS members_with_debt,
        COUNT(*) AS total_active_members
    FROM members
    WHERE activo = TRUE
)
SELECT 
    CURRENT_DATE AS kpi_date,
    NOW() AS last_updated,
    
    -- Revenue
    COALESCE(tp.revenue_total, 0) AS revenue_total,
    COALESCE(tp.revenue_memberships, 0) AS revenue_memberships,
    COALESCE(tp.revenue_classes, 0) AS revenue_classes,
    COALESCE(tp.revenue_products, 0) AS revenue_products,
    
    -- Debt
    COALESCE(ds.total_debt, 0) AS total_debt,
    COALESCE(ds.members_with_debt, 0) AS members_with_debt,
    CASE 
        WHEN ds.total_active_members > 0 
        THEN (ds.members_with_debt::DECIMAL / ds.total_active_members * 100)
        ELSE 0 
    END AS debt_percentage,
    
    -- Members
    COALESCE(ds.total_active_members, 0) AS active_members_count
FROM today_payments tp
CROSS JOIN debt_stats ds;

-- Vista: KPIs Operacionales del Día Actual
CREATE MATERIALIZED VIEW IF NOT EXISTS v_operational_kpis_today AS
WITH today_checkins AS (
    SELECT 
        COUNT(*) AS total_checkins,
        COUNT(DISTINCT member_id) AS unique_members
    FROM checkins
    WHERE DATE(fecha_hora) = CURRENT_DATE
),
today_classes AS (
    SELECT 
        COUNT(*) AS classes_held,
        AVG(
            CASE 
                WHEN c.capacidad_maxima > 0 
                THEN (
                    SELECT COUNT(*) 
                    FROM checkins ch 
                    WHERE ch.clase_id = c.id AND DATE(ch.fecha_hora) = CURRENT_DATE
                )::DECIMAL / c.capacidad_maxima * 100
                ELSE 0
            END
        ) AS avg_occupancy,
        SUM(c.capacidad_maxima) AS total_capacity,
        (
            SELECT COUNT(*) 
            FROM checkins 
            WHERE DATE(fecha_hora) = CURRENT_DATE
        ) AS total_attendance
    FROM clases c
    WHERE DATE(c.fecha_hora) = CURRENT_DATE
)
SELECT 
    CURRENT_DATE AS kpi_date,
    NOW() AS last_updated,
    
    COALESCE(tc.total_checkins, 0) AS total_checkins,
    COALESCE(tc.unique_members, 0) AS unique_members_attended,
    COALESCE(tcl.classes_held, 0) AS classes_held,
    COALESCE(tcl.avg_occupancy, 0) AS avg_class_occupancy,
    CASE 
        WHEN tcl.total_capacity > 0 
        THEN (tcl.total_attendance::DECIMAL / tcl.total_capacity * 100)
        ELSE 0 
    END AS total_capacity_used
FROM today_checkins tc
CROSS JOIN today_classes tcl;

-- Vista: KPIs de Satisfacción (últimos 7 días)
CREATE MATERIALIZED VIEW IF NOT EXISTS v_satisfaction_kpis_recent AS
WITH recent_surveys AS (
    SELECT 
        AVG(rating) AS avg_rating,
        COUNT(*) AS survey_count,
        COUNT(*) FILTER (WHERE rating >= 9) AS promoters,
        COUNT(*) FILTER (WHERE rating >= 7 AND rating <= 8) AS passives,
        COUNT(*) FILTER (WHERE rating <= 6) AS detractors
    FROM surveys
    WHERE created_at >= NOW() - INTERVAL '7 days'
        AND rating IS NOT NULL
),
recent_collections AS (
    SELECT 
        COUNT(*) FILTER (WHERE sentiment_score < 0.3) AS complaints_count
    FROM contextual_collections
    WHERE created_at >= NOW() - INTERVAL '7 days'
)
SELECT 
    CURRENT_DATE AS kpi_date,
    NOW() AS last_updated,
    
    COALESCE(rs.avg_rating, 0) AS avg_class_rating,
    COALESCE(rs.survey_count, 0) AS surveys_completed_7d,
    
    -- NPS = (% promoters - % detractors) × 100
    CASE 
        WHEN rs.survey_count > 0 
        THEN (
            (rs.promoters::DECIMAL / rs.survey_count * 100) - 
            (rs.detractors::DECIMAL / rs.survey_count * 100)
        )
        ELSE 0 
    END AS nps_score,
    
    COALESCE(rc.complaints_count, 0) AS complaints_count_7d
FROM recent_surveys rs
CROSS JOIN recent_collections rc;

-- Vista: KPIs de Retención (últimos 30 días)
CREATE MATERIALIZED VIEW IF NOT EXISTS v_retention_kpis_month AS
WITH member_stats AS (
    SELECT 
        COUNT(*) FILTER (WHERE activo = TRUE) AS active_members,
        COUNT(*) FILTER (WHERE fecha_registro >= NOW() - INTERVAL '30 days') AS new_members_30d,
        COUNT(*) FILTER (
            WHERE fecha_baja IS NOT NULL 
            AND fecha_baja >= NOW() - INTERVAL '30 days'
        ) AS churned_members_30d,
        COUNT(*) FILTER (WHERE activo = TRUE AND fecha_registro < NOW() - INTERVAL '30 days') AS retained_members
    FROM members
)
SELECT 
    CURRENT_DATE AS kpi_date,
    NOW() AS last_updated,
    
    ms.active_members,
    ms.new_members_30d,
    ms.churned_members_30d,
    
    -- Retention rate = (members at end - new members) / members at start × 100
    CASE 
        WHEN (ms.active_members + ms.churned_members_30d - ms.new_members_30d) > 0
        THEN (
            (ms.active_members - ms.new_members_30d)::DECIMAL / 
            (ms.active_members + ms.churned_members_30d - ms.new_members_30d) * 100
        )
        ELSE 100
    END AS retention_rate
FROM member_stats ms;

-- Vista: Resumen Ejecutivo Completo
CREATE MATERIALIZED VIEW IF NOT EXISTS v_executive_summary AS
SELECT 
    CURRENT_DATE AS summary_date,
    NOW() AS last_refreshed,
    
    -- Financial
    f.revenue_total,
    f.revenue_memberships,
    f.revenue_classes,
    f.total_debt,
    f.debt_percentage,
    
    -- Operational
    o.total_checkins,
    o.unique_members_attended,
    o.classes_held,
    o.avg_class_occupancy,
    
    -- Satisfaction
    s.avg_class_rating,
    s.nps_score,
    s.surveys_completed_7d,
    s.complaints_count_7d,
    
    -- Retention
    r.active_members,
    r.new_members_30d,
    r.churned_members_30d,
    r.retention_rate,
    
    -- Staff (from instructor_sessions últimos 7 días)
    (SELECT COUNT(DISTINCT instructor_id) 
     FROM instructor_sessions 
     WHERE created_at >= NOW() - INTERVAL '7 days') AS active_instructors_7d,
    
    (SELECT COUNT(*) 
     FROM replacements 
     WHERE created_at >= NOW() - INTERVAL '7 days') AS replacements_needed_7d,
    
    (SELECT COUNT(*) 
     FROM replacements 
     WHERE status = 'filled' 
     AND created_at >= NOW() - INTERVAL '7 days') AS replacements_filled_7d
     
FROM v_financial_kpis_today f
CROSS JOIN v_operational_kpis_today o
CROSS JOIN v_satisfaction_kpis_recent s
CROSS JOIN v_retention_kpis_month r;

-- Índices para vistas materializadas
CREATE UNIQUE INDEX idx_v_financial_kpis_date ON v_financial_kpis_today(kpi_date);
CREATE UNIQUE INDEX idx_v_operational_kpis_date ON v_operational_kpis_today(kpi_date);
CREATE UNIQUE INDEX idx_v_satisfaction_kpis_date ON v_satisfaction_kpis_recent(kpi_date);
CREATE UNIQUE INDEX idx_v_retention_kpis_date ON v_retention_kpis_month(kpi_date);
CREATE UNIQUE INDEX idx_v_executive_summary_date ON v_executive_summary(summary_date);

-- =============================================
-- FUNCIONES STORED
-- =============================================

-- Función: Crear snapshot diario automático
CREATE OR REPLACE FUNCTION create_daily_snapshot()
RETURNS UUID AS $$
DECLARE
    v_snapshot_id UUID;
    v_exec_summary RECORD;
BEGIN
    -- Refrescar vistas materializadas primero
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_financial_kpis_today;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_operational_kpis_today;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_satisfaction_kpis_recent;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_retention_kpis_month;
    REFRESH MATERIALIZED VIEW CONCURRENTLY v_executive_summary;
    
    -- Obtener resumen ejecutivo
    SELECT * INTO v_exec_summary FROM v_executive_summary LIMIT 1;
    
    -- Crear snapshot
    INSERT INTO dashboard_snapshots (
        snapshot_date,
        revenue_total,
        revenue_memberships,
        revenue_classes,
        revenue_products,
        total_checkins,
        unique_members_attended,
        classes_held,
        avg_class_occupancy,
        total_capacity_used,
        total_debt,
        members_with_debt,
        debt_percentage,
        nps_score,
        avg_class_rating,
        surveys_completed,
        complaints_count,
        active_members,
        new_members,
        churned_members,
        retention_rate,
        active_instructors,
        replacements_needed,
        replacements_filled
    ) VALUES (
        CURRENT_DATE,
        v_exec_summary.revenue_total,
        v_exec_summary.revenue_memberships,
        v_exec_summary.revenue_classes,
        0, -- revenue_products (no implementado aún)
        v_exec_summary.total_checkins,
        v_exec_summary.unique_members_attended,
        v_exec_summary.classes_held,
        v_exec_summary.avg_class_occupancy,
        0, -- total_capacity_used (calcular si es necesario)
        v_exec_summary.total_debt,
        (SELECT COUNT(*) FROM members WHERE deuda_actual > 0 AND activo = TRUE),
        v_exec_summary.debt_percentage,
        v_exec_summary.nps_score,
        v_exec_summary.avg_class_rating,
        v_exec_summary.surveys_completed_7d,
        v_exec_summary.complaints_count_7d,
        v_exec_summary.active_members,
        v_exec_summary.new_members_30d,
        v_exec_summary.churned_members_30d,
        v_exec_summary.retention_rate,
        v_exec_summary.active_instructors_7d,
        v_exec_summary.replacements_needed_7d,
        v_exec_summary.replacements_filled_7d
    )
    ON CONFLICT (snapshot_date) DO UPDATE SET
        revenue_total = EXCLUDED.revenue_total,
        revenue_memberships = EXCLUDED.revenue_memberships,
        revenue_classes = EXCLUDED.revenue_classes,
        total_checkins = EXCLUDED.total_checkins,
        unique_members_attended = EXCLUDED.unique_members_attended,
        classes_held = EXCLUDED.classes_held,
        avg_class_occupancy = EXCLUDED.avg_class_occupancy,
        total_debt = EXCLUDED.total_debt,
        members_with_debt = EXCLUDED.members_with_debt,
        debt_percentage = EXCLUDED.debt_percentage,
        nps_score = EXCLUDED.nps_score,
        avg_class_rating = EXCLUDED.avg_class_rating,
        surveys_completed = EXCLUDED.surveys_completed,
        complaints_count = EXCLUDED.complaints_count,
        active_members = EXCLUDED.active_members,
        new_members = EXCLUDED.new_members,
        churned_members = EXCLUDED.churned_members,
        retention_rate = EXCLUDED.retention_rate,
        active_instructors = EXCLUDED.active_instructors,
        replacements_needed = EXCLUDED.replacements_needed,
        replacements_filled = EXCLUDED.replacements_filled,
        updated_at = NOW()
    RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Detectar alertas automáticas basadas en thresholds
CREATE OR REPLACE FUNCTION detect_critical_alerts()
RETURNS INTEGER AS $$
DECLARE
    v_alert_count INTEGER := 0;
    v_exec_summary RECORD;
    v_target RECORD;
BEGIN
    -- Obtener resumen ejecutivo
    SELECT * INTO v_exec_summary FROM v_executive_summary LIMIT 1;
    
    -- Alerta: Revenue drop >20% vs promedio últimos 7 días
    DECLARE
        v_avg_revenue_7d DECIMAL;
    BEGIN
        SELECT AVG(revenue_total) INTO v_avg_revenue_7d
        FROM dashboard_snapshots
        WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
            AND snapshot_date < CURRENT_DATE;
        
        IF v_avg_revenue_7d > 0 AND 
           v_exec_summary.revenue_total < (v_avg_revenue_7d * 0.8) THEN
            INSERT INTO dashboard_alerts (
                alert_type, alert_severity, alert_title, alert_message, alert_details,
                threshold_type, threshold_value, actual_value, expires_at
            ) VALUES (
                'revenue_drop', 'high',
                'Caída significativa de ingresos',
                format('Los ingresos de hoy ($%s) son 20%% menores al promedio de los últimos 7 días ($%s)',
                       v_exec_summary.revenue_total, v_avg_revenue_7d),
                jsonb_build_object(
                    'revenue_today', v_exec_summary.revenue_total,
                    'avg_7d', v_avg_revenue_7d,
                    'drop_percentage', ((v_avg_revenue_7d - v_exec_summary.revenue_total) / v_avg_revenue_7d * 100)
                ),
                'revenue_avg_7d', v_avg_revenue_7d * 0.8, v_exec_summary.revenue_total,
                NOW() + INTERVAL '12 hours'
            )
            ON CONFLICT DO NOTHING;
            v_alert_count := v_alert_count + 1;
        END IF;
    END;
    
    -- Alerta: Deuda >15%
    IF v_exec_summary.debt_percentage > 15 THEN
        INSERT INTO dashboard_alerts (
            alert_type, alert_severity, alert_title, alert_message, alert_details,
            threshold_type, threshold_value, actual_value, expires_at
        ) VALUES (
            'high_debt', 'high',
            'Deuda elevada',
            format('El %s%% de los miembros activos tienen deuda (total: $%s)',
                   ROUND(v_exec_summary.debt_percentage, 1), v_exec_summary.total_debt),
            jsonb_build_object(
                'debt_percentage', v_exec_summary.debt_percentage,
                'total_debt', v_exec_summary.total_debt,
                'target', 10
            ),
            'debt_percentage', 15, v_exec_summary.debt_percentage,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT DO NOTHING;
        v_alert_count := v_alert_count + 1;
    END IF;
    
    -- Alerta: NPS < 30
    IF v_exec_summary.nps_score < 30 THEN
        INSERT INTO dashboard_alerts (
            alert_type, alert_severity, alert_title, alert_message, alert_details,
            threshold_type, threshold_value, actual_value, expires_at
        ) VALUES (
            'low_nps', 'critical',
            'NPS Crítico',
            format('El NPS actual es %s (crítico <30)', ROUND(v_exec_summary.nps_score, 0)),
            jsonb_build_object(
                'nps_score', v_exec_summary.nps_score,
                'surveys_count', v_exec_summary.surveys_completed_7d,
                'target', 50
            ),
            'nps_score', 30, v_exec_summary.nps_score,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT DO NOTHING;
        v_alert_count := v_alert_count + 1;
    END IF;
    
    -- Alerta: Occupancy <60%
    IF v_exec_summary.avg_class_occupancy < 60 THEN
        INSERT INTO dashboard_alerts (
            alert_type, alert_severity, alert_title, alert_message, alert_details,
            threshold_type, threshold_value, actual_value, expires_at
        ) VALUES (
            'low_attendance', 'medium',
            'Ocupación de clases baja',
            format('La ocupación promedio es %s%% (objetivo >70%%)', 
                   ROUND(v_exec_summary.avg_class_occupancy, 0)),
            jsonb_build_object(
                'avg_occupancy', v_exec_summary.avg_class_occupancy,
                'classes_today', v_exec_summary.classes_held,
                'target', 70
            ),
            'avg_occupancy', 60, v_exec_summary.avg_class_occupancy,
            NOW() + INTERVAL '24 hours'
        )
        ON CONFLICT DO NOTHING;
        v_alert_count := v_alert_count + 1;
    END IF;
    
    RETURN v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- Función: Limpiar alertas expiradas automáticamente
CREATE OR REPLACE FUNCTION cleanup_expired_alerts()
RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    UPDATE dashboard_alerts
    SET alert_status = 'expired',
        updated_at = NOW()
    WHERE alert_status = 'active'
        AND (
            expires_at < NOW() OR
            (auto_dismiss_after_hours IS NOT NULL AND 
             created_at < NOW() - (auto_dismiss_after_hours || ' hours')::INTERVAL)
        );
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger: Actualizar timestamp updated_at
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dashboard_snapshots_updated_at
    BEFORE UPDATE ON dashboard_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_priority_decisions_updated_at
    BEFORE UPDATE ON priority_decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_alerts_updated_at
    BEFORE UPDATE ON dashboard_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_kpi_targets_updated_at
    BEFORE UPDATE ON kpi_targets
    FOR EACH ROW
    EXECUTE FUNCTION update_dashboard_updated_at();

-- =============================================
-- DATOS SEMILLA PARA KPI TARGETS
-- =============================================

INSERT INTO kpi_targets (kpi_name, kpi_category, target_value, warning_threshold, critical_threshold, comparison_type, unit, description) VALUES
-- Financial
('revenue_daily', 'financial', 50000, 40000, 30000, 'greater_than', 'currency', 'Ingresos diarios objetivo'),
('debt_percentage', 'financial', 10, 15, 20, 'less_than', 'percentage', 'Porcentaje de deuda máximo aceptable'),
('collections_recovery_rate', 'financial', 70, 60, 50, 'greater_than', 'percentage', 'Tasa de recuperación de cobros'),

-- Operational
('daily_checkins', 'operational', 200, 150, 100, 'greater_than', 'count', 'Check-ins diarios objetivo'),
('class_occupancy', 'operational', 75, 65, 55, 'greater_than', 'percentage', 'Ocupación promedio de clases'),
('capacity_utilization', 'operational', 80, 70, 60, 'greater_than', 'percentage', 'Utilización de capacidad total'),

-- Satisfaction
('nps_score', 'satisfaction', 50, 40, 30, 'greater_than', 'number', 'Net Promoter Score objetivo'),
('avg_rating', 'satisfaction', 4.5, 4.0, 3.5, 'greater_than', 'number', 'Rating promedio de clases'),
('complaints_count', 'satisfaction', 5, 10, 15, 'less_than', 'count', 'Número máximo de quejas por semana'),

-- Retention
('retention_rate', 'retention', 85, 80, 75, 'greater_than', 'percentage', 'Tasa de retención mensual'),
('churn_rate', 'retention', 5, 8, 12, 'less_than', 'percentage', 'Tasa de churn máxima'),
('new_members_monthly', 'retention', 30, 20, 10, 'greater_than', 'count', 'Nuevos miembros por mes')
ON CONFLICT (kpi_name) DO NOTHING;

-- =============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =============================================

COMMENT ON TABLE dashboard_snapshots IS 'Histórico diario de KPIs para análisis de tendencias y reportes ejecutivos';
COMMENT ON TABLE priority_decisions IS 'Decisiones prioritarias generadas por IA basadas en análisis de KPIs';
COMMENT ON TABLE dashboard_alerts IS 'Alertas críticas del sistema que requieren atención ejecutiva inmediata';
COMMENT ON TABLE kpi_targets IS 'Metas configurables para cada KPI con thresholds de alerta';

COMMENT ON FUNCTION create_daily_snapshot IS 'Crea snapshot diario automático de todos los KPIs (ejecutar con cron a las 23:59)';
COMMENT ON FUNCTION detect_critical_alerts IS 'Detecta y crea alertas automáticas basadas en thresholds configurados';
COMMENT ON FUNCTION cleanup_expired_alerts IS 'Limpia alertas expiradas automáticamente (ejecutar cada hora)';

COMMENT ON MATERIALIZED VIEW v_financial_kpis_today IS 'KPIs financieros del día actual en tiempo real';
COMMENT ON MATERIALIZED VIEW v_operational_kpis_today IS 'KPIs operacionales del día actual en tiempo real';
COMMENT ON MATERIALIZED VIEW v_satisfaction_kpis_recent IS 'KPIs de satisfacción de los últimos 7 días';
COMMENT ON MATERIALIZED VIEW v_retention_kpis_month IS 'KPIs de retención de los últimos 30 días';
COMMENT ON MATERIALIZED VIEW v_executive_summary IS 'Resumen ejecutivo completo con todos los KPIs consolidados';
