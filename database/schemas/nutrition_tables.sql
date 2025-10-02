-- PROMPT 13: POST-WORKOUT NUTRITION TIPS - DATABASE SCHEMA
-- Context-aware nutrition tips sent 60-90 min after check-in

CREATE TABLE IF NOT EXISTS nutrition_tips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_type VARCHAR(50) NOT NULL, -- cardio, strength, flexibility, mixed
    tip_title VARCHAR(200) NOT NULL,
    tip_description TEXT NOT NULL,
    macro_focus VARCHAR(50), -- protein, carbs, fats, hydration
    recipe_name VARCHAR(200),
    recipe_ingredients TEXT,
    recipe_instructions TEXT,
    timing_recommendation VARCHAR(100), -- "Dentro de 30-60 min post-entrenamiento"
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_nutrition_tips_class_type ON nutrition_tips(class_type);
CREATE INDEX idx_nutrition_tips_active ON nutrition_tips(active);

CREATE TABLE IF NOT EXISTS member_nutrition_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id),
    checkin_id UUID REFERENCES checkins(id),
    tip_id UUID REFERENCES nutrition_tips(id),
    class_type VARCHAR(50),
    sent_at TIMESTAMP DEFAULT NOW(),
    opened BOOLEAN DEFAULT FALSE,
    clicked_recipe BOOLEAN DEFAULT FALSE,
    response_text TEXT
);

CREATE INDEX idx_nutrition_history_member ON member_nutrition_history(member_id);
CREATE INDEX idx_nutrition_history_checkin ON member_nutrition_history(checkin_id);
CREATE INDEX idx_nutrition_history_sent_at ON member_nutrition_history(sent_at);

-- Función: Seleccionar tip apropiado según tipo de clase
CREATE OR REPLACE FUNCTION select_nutrition_tip_by_class(
    p_class_type VARCHAR(50),
    p_member_id UUID
) RETURNS UUID AS $$
DECLARE
    v_tip_id UUID;
    v_recent_tips UUID[];
BEGIN
    -- Obtener tips enviados recientemente (últimos 7 días)
    SELECT ARRAY_AGG(tip_id) INTO v_recent_tips
    FROM member_nutrition_history
    WHERE member_id = p_member_id
    AND sent_at >= NOW() - INTERVAL '7 days';
    
    -- Seleccionar tip aleatorio del tipo de clase, excluyendo recientes
    SELECT id INTO v_tip_id
    FROM nutrition_tips
    WHERE class_type = p_class_type
    AND active = TRUE
    AND (v_recent_tips IS NULL OR id != ALL(v_recent_tips))
    ORDER BY RANDOM()
    LIMIT 1;
    
    -- Si no hay tips disponibles, usar cualquiera del tipo
    IF v_tip_id IS NULL THEN
        SELECT id INTO v_tip_id
        FROM nutrition_tips
        WHERE class_type = p_class_type
        AND active = TRUE
        ORDER BY RANDOM()
        LIMIT 1;
    END IF;
    
    RETURN v_tip_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Registrar envío de tip
CREATE OR REPLACE FUNCTION record_nutrition_tip_sent(
    p_member_id UUID,
    p_checkin_id UUID,
    p_tip_id UUID,
    p_class_type VARCHAR(50)
) RETURNS UUID AS $$
DECLARE
    v_history_id UUID;
BEGIN
    INSERT INTO member_nutrition_history (
        member_id,
        checkin_id,
        tip_id,
        class_type,
        sent_at
    ) VALUES (
        p_member_id,
        p_checkin_id,
        p_tip_id,
        p_class_type,
        NOW()
    ) RETURNING id INTO v_history_id;
    
    RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener estadísticas de engagement
CREATE OR REPLACE FUNCTION get_nutrition_engagement_stats()
RETURNS TABLE (
    total_sent INTEGER,
    total_opened INTEGER,
    total_clicked INTEGER,
    open_rate NUMERIC,
    click_rate NUMERIC,
    popular_class_type VARCHAR(50),
    popular_macro_focus VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER AS total_sent,
        COUNT(*) FILTER (WHERE opened = TRUE)::INTEGER AS total_opened,
        COUNT(*) FILTER (WHERE clicked_recipe = TRUE)::INTEGER AS total_clicked,
        ROUND(
            (COUNT(*) FILTER (WHERE opened = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
            2
        ) AS open_rate,
        ROUND(
            (COUNT(*) FILTER (WHERE clicked_recipe = TRUE)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
            2
        ) AS click_rate,
        MODE() WITHIN GROUP (ORDER BY mnh.class_type) AS popular_class_type,
        MODE() WITHIN GROUP (ORDER BY nt.macro_focus) AS popular_macro_focus
    FROM member_nutrition_history mnh
    LEFT JOIN nutrition_tips nt ON mnh.tip_id = nt.id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE nutrition_tips IS 'Tips de nutrición contextualizados por tipo de entrenamiento';
COMMENT ON TABLE member_nutrition_history IS 'Historial de tips enviados a miembros con tracking de engagement';
COMMENT ON FUNCTION select_nutrition_tip_by_class IS 'Selecciona tip apropiado evitando repeticiones recientes';
COMMENT ON FUNCTION record_nutrition_tip_sent IS 'Registra envío de tip con tracking de engagement';
COMMENT ON FUNCTION get_nutrition_engagement_stats IS 'Estadísticas de apertura y clicks en tips de nutrición';
