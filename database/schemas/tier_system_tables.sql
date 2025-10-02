-- PROMPT 14: PLUS/PRO TIER SYSTEM - DATABASE SCHEMA
-- Sistema de membresías premium con servicios diferenciados

CREATE TABLE IF NOT EXISTS tier_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL UNIQUE, -- standard, plus, pro
    monthly_price NUMERIC(10,2) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_classes_per_month INTEGER, -- NULL = ilimitado
    coaching_sessions_per_month INTEGER DEFAULT 0,
    priority_reservations BOOLEAN DEFAULT FALSE,
    adaptive_training_plan BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tier_plans_name ON tier_plans(tier_name);

CREATE TABLE IF NOT EXISTS member_tier_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    tier_plan_id UUID NOT NULL REFERENCES tier_plans(id),
    tier_name VARCHAR(50) NOT NULL, -- denormalized for quick access
    start_date DATE NOT NULL,
    end_date DATE, -- NULL = activa
    monthly_price NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
    cancellation_reason TEXT,
    retention_offer_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_member_tier_member ON member_tier_subscriptions(member_id);
CREATE INDEX idx_member_tier_status ON member_tier_subscriptions(status);
CREATE INDEX idx_member_tier_active ON member_tier_subscriptions(member_id, status) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS coaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    coach_name VARCHAR(200) NOT NULL,
    session_date TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    session_type VARCHAR(100), -- assessment, technique, nutrition, planning
    notes TEXT,
    completed BOOLEAN DEFAULT FALSE,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_coaching_member ON coaching_sessions(member_id);
CREATE INDEX idx_coaching_date ON coaching_sessions(session_date);
CREATE INDEX idx_coaching_completed ON coaching_sessions(completed);

CREATE TABLE IF NOT EXISTS training_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    plan_name VARCHAR(200) NOT NULL,
    goal VARCHAR(100), -- muscle_gain, weight_loss, endurance, flexibility
    duration_weeks INTEGER,
    sessions_per_week INTEGER,
    plan_details JSONB, -- { "week1": [...exercises], "week2": [...] }
    start_date DATE,
    end_date DATE,
    active BOOLEAN DEFAULT TRUE,
    completion_rate NUMERIC(5,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_training_plans_member ON training_plans(member_id);
CREATE INDEX idx_training_plans_active ON training_plans(active);

CREATE TABLE IF NOT EXISTS tier_benefits_catalog (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(50) NOT NULL,
    benefit_name VARCHAR(200) NOT NULL,
    benefit_description TEXT,
    icon VARCHAR(50), -- emoji or icon name
    display_order INTEGER DEFAULT 0
);

CREATE INDEX idx_tier_benefits_tier ON tier_benefits_catalog(tier_name);

-- Función: Obtener tier actual de un miembro
CREATE OR REPLACE FUNCTION get_member_current_tier(p_member_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_tier_name VARCHAR(50);
BEGIN
    SELECT tier_name INTO v_tier_name
    FROM member_tier_subscriptions
    WHERE member_id = p_member_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ORDER BY start_date DESC
    LIMIT 1;
    
    RETURN COALESCE(v_tier_name, 'standard');
END;
$$ LANGUAGE plpgsql;

-- Función: Identificar miembros candidatos para upgrade
CREATE OR REPLACE FUNCTION identify_upgrade_candidates(p_target_tier VARCHAR(50) DEFAULT 'plus')
RETURNS TABLE (
    member_id UUID,
    current_tier VARCHAR(50),
    avg_weekly_checkins NUMERIC,
    total_checkins_30d INTEGER,
    member_since_days INTEGER,
    upgrade_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH member_activity AS (
        SELECT 
            m.id,
            get_member_current_tier(m.id) AS current_tier,
            COUNT(c.id) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '30 days')::INTEGER AS checkins_30d,
            COUNT(c.id) FILTER (WHERE c.fecha >= CURRENT_DATE - INTERVAL '7 days')::NUMERIC AS checkins_7d,
            EXTRACT(DAY FROM CURRENT_DATE - m.fecha_registro)::INTEGER AS days_member
        FROM members m
        LEFT JOIN checkins c ON m.id = c.miembro_id
        WHERE m.activo = TRUE
        GROUP BY m.id
    )
    SELECT 
        ma.id,
        ma.current_tier,
        (ma.checkins_7d / 7.0 * 7.0)::NUMERIC AS avg_weekly,
        ma.checkins_30d,
        ma.days_member,
        (
            CASE 
                WHEN ma.checkins_30d >= 20 THEN 40
                WHEN ma.checkins_30d >= 15 THEN 30
                WHEN ma.checkins_30d >= 12 THEN 20
                ELSE 10
            END +
            CASE 
                WHEN ma.days_member >= 90 THEN 30
                WHEN ma.days_member >= 60 THEN 20
                WHEN ma.days_member >= 30 THEN 10
                ELSE 5
            END +
            CASE 
                WHEN ma.current_tier = 'standard' AND p_target_tier = 'plus' THEN 30
                WHEN ma.current_tier = 'plus' AND p_target_tier = 'pro' THEN 30
                ELSE 0
            END
        )::INTEGER AS score
    FROM member_activity ma
    WHERE ma.current_tier != p_target_tier
    AND ma.checkins_30d >= 12 -- Mínimo 3x/semana
    AND ma.days_member >= 30 -- Mínimo 1 mes de antigüedad
    ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;

-- Función: Calcular ROI de tier premium
CREATE OR REPLACE FUNCTION calculate_tier_roi()
RETURNS TABLE (
    tier_name VARCHAR(50),
    total_subscribers INTEGER,
    monthly_revenue NUMERIC,
    avg_checkins_per_member NUMERIC,
    coaching_sessions_used INTEGER,
    conversion_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mts.tier_name,
        COUNT(DISTINCT mts.member_id)::INTEGER AS subscribers,
        SUM(mts.monthly_price)::NUMERIC AS revenue,
        AVG(checkin_count.cnt)::NUMERIC AS avg_checkins,
        COUNT(cs.id)::INTEGER AS coaching_used,
        (COUNT(DISTINCT mts.member_id)::NUMERIC / 
         NULLIF((SELECT COUNT(*) FROM members WHERE activo = TRUE), 0) * 100)::NUMERIC AS conversion
    FROM member_tier_subscriptions mts
    LEFT JOIN LATERAL (
        SELECT COUNT(*) AS cnt
        FROM checkins c
        WHERE c.miembro_id = mts.member_id
        AND c.fecha >= CURRENT_DATE - INTERVAL '30 days'
    ) checkin_count ON TRUE
    LEFT JOIN coaching_sessions cs ON cs.member_id = mts.member_id
        AND cs.session_date >= CURRENT_DATE - INTERVAL '30 days'
    WHERE mts.status = 'active'
    GROUP BY mts.tier_name;
END;
$$ LANGUAGE plpgsql;

-- Función: Upgrade de tier con tracking
CREATE OR REPLACE FUNCTION upgrade_member_tier(
    p_member_id UUID,
    p_new_tier_name VARCHAR(50),
    p_monthly_price NUMERIC
) RETURNS UUID AS $$
DECLARE
    v_subscription_id UUID;
    v_tier_plan_id UUID;
BEGIN
    -- Obtener ID del plan
    SELECT id INTO v_tier_plan_id
    FROM tier_plans
    WHERE tier_name = p_new_tier_name
    AND active = TRUE;
    
    IF v_tier_plan_id IS NULL THEN
        RAISE EXCEPTION 'Tier plan % not found', p_new_tier_name;
    END IF;
    
    -- Cancelar suscripción anterior si existe
    UPDATE member_tier_subscriptions
    SET status = 'cancelled',
        end_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE member_id = p_member_id
    AND status = 'active';
    
    -- Crear nueva suscripción
    INSERT INTO member_tier_subscriptions (
        member_id,
        tier_plan_id,
        tier_name,
        start_date,
        monthly_price,
        status
    ) VALUES (
        p_member_id,
        v_tier_plan_id,
        p_new_tier_name,
        CURRENT_DATE,
        p_monthly_price,
        'active'
    ) RETURNING id INTO v_subscription_id;
    
    RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE tier_plans IS 'Planes de membresía (standard, plus, pro)';
COMMENT ON TABLE member_tier_subscriptions IS 'Suscripciones activas de miembros a tiers premium';
COMMENT ON TABLE coaching_sessions IS 'Sesiones 1:1 con coach (beneficio Pro tier)';
COMMENT ON TABLE training_plans IS 'Planes de entrenamiento adaptativos (beneficio Plus/Pro)';
COMMENT ON FUNCTION identify_upgrade_candidates IS 'Identifica miembros con alto engagement para targeting de upgrade';
COMMENT ON FUNCTION calculate_tier_roi IS 'Calcula ROI y métricas por tier';
