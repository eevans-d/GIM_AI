-- ===================================
-- PROMPT 8: Post-Class Surveys System
-- Tabla para encuestas y feedback de clases
-- ===================================

-- Tabla principal de encuestas
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    checkin_id UUID NOT NULL REFERENCES checkins(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    
    -- Rating y feedback
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    sentiment VARCHAR(20), -- positive, neutral, negative, not_analyzed
    sentiment_score DECIMAL(3,2), -- -1.0 a 1.0 (Gemini API)
    
    -- Metadata de envío
    survey_sent_at TIMESTAMP WITH TIME ZONE,
    survey_responded_at TIMESTAMP WITH TIME ZONE,
    response_time_minutes INTEGER,
    
    -- Categorización automática (IA)
    feedback_category VARCHAR(50), -- music, intensity, cleanliness, instructor, equipment
    requires_action BOOLEAN DEFAULT false,
    action_taken BOOLEAN DEFAULT false,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_checkin FOREIGN KEY (checkin_id) REFERENCES checkins(id),
    CONSTRAINT fk_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_instructor FOREIGN KEY (instructor_id) REFERENCES instructors(id),
    CONSTRAINT fk_class FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Índices para optimización
CREATE INDEX idx_surveys_instructor_id ON surveys(instructor_id);
CREATE INDEX idx_surveys_member_id ON surveys(member_id);
CREATE INDEX idx_surveys_checkin_id ON surveys(checkin_id);
CREATE INDEX idx_surveys_class_id ON surveys(class_id);
CREATE INDEX idx_surveys_rating ON surveys(rating);
CREATE INDEX idx_surveys_created_at ON surveys(created_at DESC);
CREATE INDEX idx_surveys_sentiment ON surveys(sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX idx_surveys_instructor_rating ON surveys(instructor_id, rating, created_at DESC);
CREATE INDEX idx_surveys_requires_action ON surveys(requires_action) WHERE requires_action = true;

-- Índice compuesto para análisis de instructor
CREATE INDEX idx_surveys_instructor_period ON surveys(instructor_id, created_at DESC) 
WHERE rating IS NOT NULL;

-- Comentarios para documentación
COMMENT ON TABLE surveys IS 'Encuestas post-clase con análisis de sentimiento (PROMPT 8)';
COMMENT ON COLUMN surveys.rating IS 'Rating de 1-5 estrellas de la clase';
COMMENT ON COLUMN surveys.sentiment IS 'Análisis de sentimiento del comentario (Gemini API)';
COMMENT ON COLUMN surveys.sentiment_score IS 'Score numérico de sentimiento: -1 (negativo) a +1 (positivo)';
COMMENT ON COLUMN surveys.requires_action IS 'Flag automático si requiere atención (rating <=2 o sentiment negativo)';

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_surveys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_surveys_updated_at
    BEFORE UPDATE ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_surveys_updated_at();

-- Función para calcular NPS de instructor
CREATE OR REPLACE FUNCTION calculate_instructor_nps(
    p_instructor_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    instructor_id UUID,
    total_responses INTEGER,
    promoters INTEGER,
    passives INTEGER,
    detractors INTEGER,
    nps_score INTEGER,
    avg_rating DECIMAL(3,2),
    response_rate DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH survey_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(CASE WHEN rating >= 4 THEN 1 END) as promo,
            COUNT(CASE WHEN rating = 3 THEN 1 END) as pass,
            COUNT(CASE WHEN rating <= 2 THEN 1 END) as detrac,
            AVG(rating::DECIMAL) as avg_rat
        FROM surveys
        WHERE instructor_id = p_instructor_id
        AND created_at >= NOW() - (p_days || ' days')::INTERVAL
        AND rating IS NOT NULL
    ),
    checkin_stats AS (
        SELECT COUNT(*) as total_checkins
        FROM checkins c
        JOIN classes cl ON c.class_id = cl.id
        WHERE cl.instructor_id = p_instructor_id
        AND c.fecha_hora >= NOW() - (p_days || ' days')::INTERVAL
    )
    SELECT 
        p_instructor_id,
        ss.total::INTEGER,
        ss.promo::INTEGER,
        ss.pass::INTEGER,
        ss.detrac::INTEGER,
        ROUND(((ss.promo::DECIMAL - ss.detrac::DECIMAL) / NULLIF(ss.total, 0)) * 100)::INTEGER as nps,
        ROUND(ss.avg_rat, 2),
        ROUND((ss.total::DECIMAL / NULLIF(cs.total_checkins, 0)) * 100, 2) as resp_rate
    FROM survey_stats ss, checkin_stats cs;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_instructor_nps IS 'Calcula NPS (Net Promoter Score) de un instructor en los últimos X días';

-- Función para obtener feedback que requiere acción
CREATE OR REPLACE FUNCTION get_actionable_feedback(
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    survey_id UUID,
    instructor_name VARCHAR(200),
    member_name VARCHAR(200),
    rating INTEGER,
    comment TEXT,
    sentiment VARCHAR(20),
    class_name VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        CONCAT(i.first_name, ' ', i.last_name),
        CONCAT(m.first_name, ' ', m.last_name),
        s.rating,
        s.comment,
        s.sentiment,
        c.name,
        s.created_at
    FROM surveys s
    JOIN instructors i ON s.instructor_id = i.id
    JOIN members m ON s.member_id = m.id
    LEFT JOIN classes c ON s.class_id = c.id
    WHERE s.requires_action = true
    AND s.action_taken = false
    ORDER BY s.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_actionable_feedback IS 'Obtiene feedback que requiere atención inmediata';

-- Función para obtener tendencia de rating de instructor
CREATE OR REPLACE FUNCTION get_instructor_rating_trend(
    p_instructor_id UUID,
    p_weeks INTEGER DEFAULT 12
)
RETURNS TABLE (
    week_start DATE,
    avg_rating DECIMAL(3,2),
    total_responses INTEGER,
    nps INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE_TRUNC('week', s.created_at)::DATE as week_start,
        ROUND(AVG(s.rating)::DECIMAL, 2) as avg_rating,
        COUNT(*)::INTEGER as total_responses,
        ROUND(
            ((COUNT(CASE WHEN s.rating >= 4 THEN 1 END)::DECIMAL - 
              COUNT(CASE WHEN s.rating <= 2 THEN 1 END)::DECIMAL) / 
              NULLIF(COUNT(*), 0)) * 100
        )::INTEGER as nps
    FROM surveys s
    WHERE s.instructor_id = p_instructor_id
    AND s.created_at >= NOW() - (p_weeks || ' weeks')::INTERVAL
    AND s.rating IS NOT NULL
    GROUP BY DATE_TRUNC('week', s.created_at)
    ORDER BY week_start DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_instructor_rating_trend IS 'Obtiene tendencia semanal de rating de un instructor';

-- Vista materializada para dashboard de instructores (opcional, para optimización futura)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_instructor_performance AS
SELECT 
    i.id as instructor_id,
    CONCAT(i.first_name, ' ', i.last_name) as instructor_name,
    COUNT(DISTINCT s.id) as total_surveys,
    ROUND(AVG(s.rating)::DECIMAL, 2) as avg_rating,
    COUNT(CASE WHEN s.rating >= 4 THEN 1 END) as promoters,
    COUNT(CASE WHEN s.rating = 3 THEN 1 END) as passives,
    COUNT(CASE WHEN s.rating <= 2 THEN 1 END) as detractors,
    ROUND(
        ((COUNT(CASE WHEN s.rating >= 4 THEN 1 END)::DECIMAL - 
          COUNT(CASE WHEN s.rating <= 2 THEN 1 END)::DECIMAL) / 
          NULLIF(COUNT(*), 0)) * 100
    )::INTEGER as nps_score,
    COUNT(CASE WHEN s.requires_action = true THEN 1 END) as action_items,
    MAX(s.created_at) as last_survey_date
FROM instructors i
LEFT JOIN surveys s ON i.id = s.instructor_id 
    AND s.created_at >= NOW() - INTERVAL '30 days'
GROUP BY i.id, i.first_name, i.last_name;

CREATE UNIQUE INDEX ON mv_instructor_performance(instructor_id);

COMMENT ON MATERIALIZED VIEW mv_instructor_performance IS 'Vista materializada de performance de instructores (últimos 30 días)';

-- Función para refrescar la vista materializada (llamar cada hora)
CREATE OR REPLACE FUNCTION refresh_instructor_performance()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_instructor_performance;
END;
$$ LANGUAGE plpgsql;
