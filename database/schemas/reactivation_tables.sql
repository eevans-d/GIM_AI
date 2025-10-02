-- PROMPT 12: SMART REACTIVATION SYSTEM - DATABASE SCHEMA-- PROMPT 12: SMART REACTIVATION SYSTEM - DATABASE SCHEMA-- PROMPT 12: SMART REACTIVATION SYSTEM - DATABASE SCHEMA

-- Detecta y reactiva miembros inactivos (10-14 días) con secuencia de 3 mensajes

-- Detecta y reactiva miembros inactivos (10-14 días) con secuencia de 3 mensajes-- Detecta y reactiva miembros inactivos (10-14 días) con secuencia de 3 mensajes

CREATE TABLE IF NOT EXISTS reactivation_campaigns (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    member_id UUID NOT NULL REFERENCES members(id),

    days_inactive INTEGER NOT NULL,CREATE TABLE IF NOT EXISTS reactivation_campaigns (CREATE TABLE IF NOT EXISTS reactivation_campaigns (

    last_checkin_date DATE NOT NULL,

    favorite_class_type VARCHAR(100),    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    friend_reference VARCHAR(255),

    status VARCHAR(50) NOT NULL DEFAULT 'detected', -- detected, active, completed, reactivated, abandoned    member_id UUID NOT NULL REFERENCES members(id),    member_id UUID NOT NULL REFERENCES members(id),

    current_message_seq INTEGER DEFAULT 0, -- 0, 1, 2, 3

    reactivated BOOLEAN DEFAULT FALSE,    days_inactive INTEGER NOT NULL,    days_inactive INTEGER NOT NULL,

    reactivation_date DATE,

    created_at TIMESTAMP DEFAULT NOW(),    last_checkin_date DATE NOT NULL,    last_checkin_date DATE NOT NULL,

    updated_at TIMESTAMP DEFAULT NOW()

);    favorite_class_type VARCHAR(100),    favorite_class_type VARCHAR(100),



CREATE INDEX idx_reactivation_campaigns_member ON reactivation_campaigns(member_id);    friend_reference VARCHAR(255),    friend_reference VARCHAR(255),

CREATE INDEX idx_reactivation_campaigns_status ON reactivation_campaigns(status);

    status VARCHAR(50) NOT NULL DEFAULT 'detected', -- detected, active, completed, reactivated, abandoned    status VARCHAR(50) NOT NULL DEFAULT 'detected',

CREATE TABLE IF NOT EXISTS reactivation_messages (

    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),    current_message_seq INTEGER DEFAULT 0, -- 0, 1, 2, 3    current_message_seq INTEGER DEFAULT 0,

    campaign_id UUID NOT NULL REFERENCES reactivation_campaigns(id) ON DELETE CASCADE,

    message_seq INTEGER NOT NULL CHECK (message_seq BETWEEN 1 AND 3),    reactivated BOOLEAN DEFAULT FALSE,    reactivated BOOLEAN DEFAULT FALSE,

    message_type VARCHAR(50) NOT NULL, -- miss_you, social_proof, special_offer

    sent_at TIMESTAMP DEFAULT NOW(),    reactivation_date DATE,    reactivation_date DATE,

    response_received BOOLEAN DEFAULT FALSE,

    response_text TEXT    created_at TIMESTAMP DEFAULT NOW(),    created_at TIMESTAMP DEFAULT NOW(),

);

    updated_at TIMESTAMP DEFAULT NOW(),    CONSTRAINT chk_message_seq CHECK (current_message_seq BETWEEN 0 AND 3)

CREATE INDEX idx_reactivation_messages_campaign ON reactivation_messages(campaign_id);

CREATE INDEX idx_reactivation_messages_seq ON reactivation_messages(campaign_id, message_seq);    CONSTRAINT chk_message_seq CHECK (current_message_seq BETWEEN 0 AND 3));



-- Función: Detectar miembros inactivos elegibles para reactivación);

CREATE OR REPLACE FUNCTION detect_inactive_members()

RETURNS TABLE (CREATE TABLE IF NOT EXISTS reactivation_messages (

    member_id UUID,

    days_inactive INTEGER,CREATE TABLE IF NOT EXISTS reactivation_messages (    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    last_checkin DATE,

    favorite_class VARCHAR(100)    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),    campaign_id UUID NOT NULL REFERENCES reactivation_campaigns(id),

) AS $$

BEGIN    campaign_id UUID NOT NULL REFERENCES reactivation_campaigns(id),    message_seq INTEGER NOT NULL,

    RETURN QUERY

    SELECT     message_seq INTEGER NOT NULL, -- 1, 2, 3    sent_at TIMESTAMP,

        m.id,

        EXTRACT(DAY FROM NOW() - MAX(c.fecha))::INTEGER AS days_inactive,    message_type VARCHAR(50), -- 'miss_you', 'social_proof', 'special_offer'    delivered_at TIMESTAMP,

        MAX(c.fecha)::DATE AS last_checkin,

        MODE() WITHIN GROUP (ORDER BY cl.tipo_clase) AS favorite_class    sent_at TIMESTAMP,    read_at TIMESTAMP,

    FROM members m

    INNER JOIN checkins c ON m.id = c.miembro_id    delivered_at TIMESTAMP,    response_received BOOLEAN DEFAULT FALSE,

    LEFT JOIN clases cl ON c.clase_id = cl.id

    WHERE NOT EXISTS (    read_at TIMESTAMP,    response_text TEXT,

        SELECT 1 FROM reactivation_campaigns rc

        WHERE rc.member_id = m.id    response_received BOOLEAN DEFAULT FALSE,    whatsapp_message_id VARCHAR(255)

        AND rc.status IN ('active', 'detected')

    )    response_text TEXT,);

    GROUP BY m.id

    HAVING     whatsapp_message_id VARCHAR(255),

        EXTRACT(DAY FROM NOW() - MAX(c.fecha)) BETWEEN 10 AND 14

        AND COUNT(c.id) >= 3    created_at TIMESTAMP DEFAULT NOW()CREATE INDEX idx_reactivation_campaigns_member ON reactivation_campaigns(member_id);

    ORDER BY days_inactive DESC;

END;);CREATE INDEX idx_reactivation_campaigns_status ON reactivation_campaigns(status);

$$ LANGUAGE plpgsql;

CREATE INDEX idx_reactivation_messages_campaign ON reactivation_messages(campaign_id);

-- Función: Crear campaña de reactivación

CREATE OR REPLACE FUNCTION create_reactivation_campaign(CREATE INDEX idx_reactivation_campaigns_member ON reactivation_campaigns(member_id);

    p_member_id UUID,CREATE INDEX idx_reactivation_campaigns_status ON reactivation_campaigns(status);

    p_days_inactive INTEGER,CREATE INDEX idx_reactivation_campaigns_inactive ON reactivation_campaigns(days_inactive);

    p_last_checkin DATE,CREATE INDEX idx_reactivation_messages_campaign ON reactivation_messages(campaign_id);

    p_favorite_class VARCHAR(100)

) RETURNS UUID AS $$-- Function: Detect inactive members (10-14 days)

DECLARECREATE OR REPLACE FUNCTION detect_inactive_members()

    v_campaign_id UUID;RETURNS TABLE (

BEGIN    member_id UUID,

    INSERT INTO reactivation_campaigns (    member_name VARCHAR,

        member_id,    member_phone VARCHAR,

        days_inactive,    days_inactive INTEGER,

        last_checkin_date,    last_checkin DATE,

        favorite_class_type,    favorite_class VARCHAR,

        status,    total_checkins INTEGER

        current_message_seq) AS $$

    ) VALUES (BEGIN

        p_member_id,    RETURN QUERY

        p_days_inactive,    WITH member_activity AS (

        p_last_checkin,        SELECT 

        p_favorite_class,            m.id,

        'detected',            m.nombre,

        0            m.telefono,

    ) RETURNING id INTO v_campaign_id;            MAX(ch.fecha)::DATE AS last_checkin,

                CURRENT_DATE - MAX(ch.fecha)::DATE AS days_since_last,

    RETURN v_campaign_id;            COUNT(DISTINCT ch.id) AS total_checkins,

END;            MODE() WITHIN GROUP (ORDER BY cl.tipo) AS favorite_class_type

$$ LANGUAGE plpgsql;        FROM members m

        LEFT JOIN checkins ch ON m.id = ch.member_id

COMMENT ON TABLE reactivation_campaigns IS 'Campañas de reactivación para miembros inactivos (10-14 días)';        LEFT JOIN clases cl ON ch.clase_id = cl.id

COMMENT ON TABLE reactivation_messages IS 'Mensajes enviados en secuencia de 3 pasos';        WHERE m.activo = TRUE

COMMENT ON FUNCTION detect_inactive_members() IS 'Detecta miembros con 10-14 días de inactividad y ≥3 check-ins previos';        AND m.consentimiento_whatsapp = TRUE

COMMENT ON FUNCTION create_reactivation_campaign IS 'Crea campaña de reactivación con 3 mensajes programados';        GROUP BY m.id, m.nombre, m.telefono

        HAVING COUNT(DISTINCT ch.id) >= 3
        AND MAX(ch.fecha)::DATE BETWEEN CURRENT_DATE - 14 AND CURRENT_DATE - 10
    )
    SELECT 
        ma.id,
        ma.nombre,
        ma.telefono,
        ma.days_since_last::INTEGER,
        ma.last_checkin,
        ma.favorite_class_type,
        ma.total_checkins::INTEGER
    FROM member_activity ma
    WHERE NOT EXISTS (
        SELECT 1 FROM reactivation_campaigns rc
        WHERE rc.member_id = ma.id
        AND rc.status IN ('active', 'detected')
    )
    ORDER BY ma.days_since_last DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Create reactivation campaign
CREATE OR REPLACE FUNCTION create_reactivation_campaign(
    p_member_id UUID,
    p_days_inactive INTEGER,
    p_last_checkin DATE,
    p_favorite_class VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_campaign_id UUID;
BEGIN
    INSERT INTO reactivation_campaigns (
        member_id,
        days_inactive,
        last_checkin_date,
        favorite_class_type,
        status,
        current_message_seq
    ) VALUES (
        p_member_id,
        p_days_inactive,
        p_last_checkin,
        p_favorite_class,
        'active',
        0
    )
    RETURNING id INTO v_campaign_id;
    
    RETURN v_campaign_id;
END;
$$ LANGUAGE plpgsql;
