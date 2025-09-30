-- ===================================
-- GIM_AI Database Schema
-- Complete database structure for gym management system
-- ===================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===================================
-- TABLE: members (socios)
-- Información de socios del gimnasio
-- ===================================
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    document_type VARCHAR(10),
    document_number VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(10),
    
    -- Membership info
    membership_type VARCHAR(50) DEFAULT 'basic', -- basic, plus, pro
    membership_status VARCHAR(20) DEFAULT 'active', -- active, paused, cancelled
    membership_start_date DATE DEFAULT CURRENT_DATE,
    membership_end_date DATE,
    
    -- Payment info
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    payment_day INTEGER DEFAULT 1,
    last_payment_date DATE,
    
    -- Contact preferences
    whatsapp_opted_in BOOLEAN DEFAULT true,
    communication_language VARCHAR(5) DEFAULT 'es',
    
    -- QR code
    qr_code VARCHAR(255) UNIQUE,
    
    -- Metadata
    source VARCHAR(50), -- qr, manual, web, referral
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: instructors (profesores)
-- Información de profesores
-- ===================================
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    
    -- Auth
    pin_hash VARCHAR(255), -- Para autenticación en panel profesor
    
    -- Professional info
    specialties TEXT[], -- spinning, yoga, crossfit, etc.
    certifications JSONB, -- {type, number, expiry_date}
    hire_date DATE DEFAULT CURRENT_DATE,
    
    -- Performance metrics
    average_satisfaction DECIMAL(3,2) DEFAULT 5.0,
    total_classes_given INTEGER DEFAULT 0,
    
    -- Availability
    is_active BOOLEAN DEFAULT true,
    can_replace BOOLEAN DEFAULT true,
    max_classes_per_week INTEGER DEFAULT 20,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: classes (clases programadas)
-- Clases en el calendario
-- ===================================
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_name VARCHAR(100) NOT NULL,
    class_type VARCHAR(50) NOT NULL, -- spinning, yoga, crossfit, etc.
    
    -- Schedule
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- Instructor
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    backup_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    
    -- Capacity
    max_capacity INTEGER DEFAULT 25,
    current_reservations INTEGER DEFAULT 0,
    waitlist_count INTEGER DEFAULT 0,
    
    -- Requirements
    required_certifications TEXT[],
    required_plan VARCHAR(50), -- NULL (any), plus, pro
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, completed, cancelled
    
    -- Metrics
    actual_attendance INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    average_satisfaction DECIMAL(3,2),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- ===================================
-- TABLE: reservations (reservas)
-- Reservas de clases
-- ===================================
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Reservation details
    reservation_type VARCHAR(20) DEFAULT 'regular', -- regular, waitlist, walk-in
    position_in_waitlist INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, cancelled, no-show, attended
    
    -- Timestamps
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    source VARCHAR(50), -- qr, web, phone, walk-in
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(member_id, class_id)
);

-- ===================================
-- TABLE: checkins (registros entrada)
-- Registro de check-ins de socios
-- ===================================
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    
    -- Check-in details
    checkin_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source VARCHAR(50) NOT NULL, -- qr, manual, kiosk, professor
    location VARCHAR(100),
    
    -- Associated data
    had_reservation BOOLEAN DEFAULT false,
    was_on_waitlist BOOLEAN DEFAULT false,
    
    -- Payment warning
    has_debt BOOLEAN DEFAULT false,
    debt_amount DECIMAL(10,2) DEFAULT 0,
    debt_days INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: payments (pagos)
-- Gestión de pagos y cobranza
-- ===================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    
    -- Payment details
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- cash, card, transfer, mercadopago
    payment_date DATE,
    
    -- Period covered
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, overdue, forgiven
    due_date DATE NOT NULL,
    days_overdue INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN status = 'pending' AND due_date < CURRENT_DATE 
            THEN CURRENT_DATE - due_date 
            ELSE 0 
        END
    ) STORED,
    
    -- Collection tracking
    collection_attempts INTEGER DEFAULT 0,
    last_collection_attempt_at TIMESTAMP WITH TIME ZONE,
    collection_method VARCHAR(50), -- whatsapp, call, in-person
    
    -- Payment link
    payment_link VARCHAR(500),
    payment_link_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: feedback (satisfacción)
-- Feedback post-clase de socios
-- ===================================
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    
    -- Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    
    -- AI Analysis
    sentiment VARCHAR(20), -- positive, neutral, negative
    categories TEXT[], -- limpieza, equipo, instructor, musica, etc.
    keywords TEXT[],
    requires_attention BOOLEAN DEFAULT false,
    
    -- Metadata
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: incidents (incidencias)
-- Gestión de incidencias operativas
-- ===================================
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Incident details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- limpieza, equipo, instructor, sistema
    severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high, critical
    
    -- Source
    reported_by_member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    reported_by_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    related_class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
    
    -- Assignment
    assigned_to VARCHAR(100),
    priority INTEGER DEFAULT 3,
    
    -- Resolution
    resolution TEXT,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Compensation
    compensation_offered BOOLEAN DEFAULT false,
    compensation_type VARCHAR(50), -- free_class, discount, refund
    compensation_amount DECIMAL(10,2),
    
    -- Metadata
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: instructor_skills (habilidades)
-- Habilidades y certificaciones de profesores
-- ===================================
CREATE TABLE IF NOT EXISTS instructor_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    
    -- Skill details
    skill_type VARCHAR(50) NOT NULL, -- class_type like spinning, yoga, etc.
    certification_name VARCHAR(100),
    certification_number VARCHAR(100),
    
    -- Validity
    issued_date DATE,
    expiry_date DATE,
    is_expired BOOLEAN GENERATED ALWAYS AS (expiry_date < CURRENT_DATE) STORED,
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verification_document_url VARCHAR(500),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(instructor_id, skill_type, certification_name)
);

-- ===================================
-- TABLE: replacements_log (reemplazos)
-- Historial de reemplazos de profesores
-- ===================================
CREATE TABLE IF NOT EXISTS replacements_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    
    -- Original and replacement instructors
    original_instructor_id UUID NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
    replacement_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    
    -- Request details
    reason VARCHAR(200),
    urgency VARCHAR(20) DEFAULT 'normal', -- normal, urgent, emergency
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Resolution
    status VARCHAR(20) DEFAULT 'pending', -- pending, covered, not_covered
    covered_at TIMESTAMP WITH TIME ZONE,
    time_to_cover_minutes INTEGER,
    
    -- Offers tracking
    offers_sent INTEGER DEFAULT 0,
    offers_rejected INTEGER DEFAULT 0,
    
    -- Compensation
    bonus_amount DECIMAL(10,2),
    
    -- Impact
    members_notified INTEGER DEFAULT 0,
    compensation_given INTEGER DEFAULT 0,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- TABLE: whatsapp_messages (mensajes)
-- Log de mensajes WhatsApp enviados/recibidos
-- ===================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE SET NULL,
    
    -- Message details
    direction VARCHAR(10) NOT NULL, -- inbound, outbound
    phone_number VARCHAR(20) NOT NULL,
    message_type VARCHAR(50) NOT NULL, -- template, text, interactive
    template_name VARCHAR(100),
    
    -- Content
    content TEXT,
    media_url VARCHAR(500),
    
    -- Status
    status VARCHAR(20) DEFAULT 'queued', -- queued, sent, delivered, read, failed
    whatsapp_message_id VARCHAR(255),
    
    -- Rate limiting
    daily_count INTEGER DEFAULT 1,
    
    -- Metadata
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================
-- Create updated_at trigger function
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructors_updated_at BEFORE UPDATE ON instructors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_instructor_skills_updated_at BEFORE UPDATE ON instructor_skills
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_replacements_log_updated_at BEFORE UPDATE ON replacements_log
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_messages_updated_at BEFORE UPDATE ON whatsapp_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- Comments for documentation
-- ===================================
COMMENT ON TABLE members IS 'Información de socios del gimnasio';
COMMENT ON TABLE instructors IS 'Profesores y su información profesional';
COMMENT ON TABLE classes IS 'Clases programadas en el calendario';
COMMENT ON TABLE reservations IS 'Reservas de clases por socios';
COMMENT ON TABLE checkins IS 'Registros de entrada al gimnasio';
COMMENT ON TABLE payments IS 'Gestión de pagos y cobranza';
COMMENT ON TABLE feedback IS 'Feedback post-clase de socios';
COMMENT ON TABLE incidents IS 'Incidencias operativas del gimnasio';
COMMENT ON TABLE instructor_skills IS 'Certificaciones y habilidades de profesores';
COMMENT ON TABLE replacements_log IS 'Historial de reemplazos de profesores';
COMMENT ON TABLE whatsapp_messages IS 'Log de mensajes WhatsApp enviados/recibidos';
