-- ============================================================================
-- GIM_AI - PRODUCTION DATABASE DEPLOYMENT SCRIPT
-- ============================================================================
-- Este script consolida todos los schemas necesarios para deployment
-- Ejecutar en Supabase SQL Editor en el siguiente orden
-- ============================================================================

-- ============================================================================
-- PASO 1: EXTENSIONES Y FUNCIONES BASE
-- ============================================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar extensión para búsqueda full-text
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- PASO 2: TABLAS PRINCIPALES
-- ============================================================================

-- Tabla: members (Miembros del gimnasio)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    fecha_registro DATE DEFAULT CURRENT_DATE,
    tipo_membresia VARCHAR(50) DEFAULT 'basic',
    estado VARCHAR(20) DEFAULT 'active',
    codigo_qr VARCHAR(100) UNIQUE,
    deuda_actual DECIMAL(10,2) DEFAULT 0.00,
    fecha_ultimo_pago DATE,
    dias_sin_asistir INTEGER DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    nps_score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para members
CREATE INDEX idx_members_telefono ON members(telefono);
CREATE INDEX idx_members_codigo_qr ON members(codigo_qr);
CREATE INDEX idx_members_estado ON members(estado);
CREATE INDEX idx_members_tipo_membresia ON members(tipo_membresia);
CREATE INDEX idx_members_deuda ON members(deuda_actual) WHERE deuda_actual > 0;

-- Tabla: instructors (Instructores)
CREATE TABLE IF NOT EXISTS instructors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    especialidades TEXT[],
    pin_hash VARCHAR(255),
    estado VARCHAR(20) DEFAULT 'active',
    total_clases_impartidas INTEGER DEFAULT 0,
    nps_promedio DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para instructors
CREATE INDEX idx_instructors_telefono ON instructors(telefono);
CREATE INDEX idx_instructors_estado ON instructors(estado);

-- Tabla: classes (Clases programadas)
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    tipo_clase VARCHAR(50) NOT NULL,
    instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    capacidad_maxima INTEGER NOT NULL DEFAULT 20,
    estado VARCHAR(20) DEFAULT 'scheduled',
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para classes
CREATE INDEX idx_classes_fecha ON classes(fecha DESC);
CREATE INDEX idx_classes_instructor ON classes(instructor_id);
CREATE INDEX idx_classes_estado ON classes(estado);
CREATE INDEX idx_classes_fecha_hora ON classes(fecha, hora_inicio);

-- Tabla: checkins (Asistencias QR)
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    metodo VARCHAR(20) DEFAULT 'qr',
    validado BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para checkins
CREATE INDEX idx_checkins_member ON checkins(member_id);
CREATE INDEX idx_checkins_class ON checkins(class_id);
CREATE INDEX idx_checkins_fecha ON checkins(fecha_hora DESC);

-- Tabla: payments (Pagos)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    monto DECIMAL(10,2) NOT NULL,
    fecha_pago DATE DEFAULT CURRENT_DATE,
    metodo_pago VARCHAR(50),
    concepto VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para payments
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_fecha ON payments(fecha_pago DESC);
CREATE INDEX idx_payments_estado ON payments(estado);

-- Tabla: reminders (Recordatorios)
CREATE TABLE IF NOT EXISTS reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL,
    mensaje TEXT NOT NULL,
    programado_para TIMESTAMPTZ NOT NULL,
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMPTZ,
    estado VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para reminders
CREATE INDEX idx_reminders_member ON reminders(member_id);
CREATE INDEX idx_reminders_programado ON reminders(programado_para);
CREATE INDEX idx_reminders_estado ON reminders(estado);

-- Tabla: surveys (Encuestas post-clase)
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
    comentario TEXT,
    fecha_respuesta TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para surveys
CREATE INDEX idx_surveys_member ON surveys(member_id);
CREATE INDEX idx_surveys_class ON surveys(class_id);
CREATE INDEX idx_surveys_nps ON surveys(nps_score);

-- ============================================================================
-- PASO 3: TABLAS AVANZADAS (Dashboard, Contextual Collection, etc)
-- ============================================================================

-- Tabla: contextual_collection (Cobros contextuales)
CREATE TABLE IF NOT EXISTS contextual_collection (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    deuda_monto DECIMAL(10,2) NOT NULL,
    trigger_event VARCHAR(50) NOT NULL,
    trigger_timestamp TIMESTAMPTZ NOT NULL,
    mensaje_enviado TEXT,
    respuesta_recibida TEXT,
    estado VARCHAR(20) DEFAULT 'pending',
    fecha_resolucion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para contextual_collection
CREATE INDEX idx_contextual_member ON contextual_collection(member_id);
CREATE INDEX idx_contextual_estado ON contextual_collection(estado);

-- Tabla: dashboard_snapshots (KPIs diarios)
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    snapshot_date DATE NOT NULL UNIQUE,
    snapshot_timestamp TIMESTAMPTZ DEFAULT NOW(),
    revenue_total DECIMAL(12,2) DEFAULT 0,
    total_checkins INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    total_debt DECIMAL(12,2) DEFAULT 0,
    nps_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para dashboard_snapshots
CREATE INDEX idx_dashboard_date ON dashboard_snapshots(snapshot_date DESC);

-- Tabla: priority_decisions (Decisiones IA)
CREATE TABLE IF NOT EXISTS priority_decisions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    decision_date DATE NOT NULL,
    priority_rank INTEGER NOT NULL,
    decision_category VARCHAR(50) NOT NULL,
    decision_title VARCHAR(200) NOT NULL,
    decision_description TEXT NOT NULL,
    recommended_action TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    generated_by_ai BOOLEAN DEFAULT true,
    ai_confidence DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para priority_decisions
CREATE INDEX idx_decisions_date ON priority_decisions(decision_date DESC);

-- Tabla: replacement_offers (Ofertas reemplazo instructores)
CREATE TABLE IF NOT EXISTS replacement_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    original_instructor_id UUID REFERENCES instructors(id),
    offered_instructor_id UUID REFERENCES instructors(id),
    match_score DECIMAL(5,2),
    bonus_amount DECIMAL(10,2),
    estado VARCHAR(20) DEFAULT 'pending',
    fecha_oferta TIMESTAMPTZ DEFAULT NOW(),
    fecha_respuesta TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para replacement_offers
CREATE INDEX idx_replacement_class ON replacement_offers(class_id);
CREATE INDEX idx_replacement_estado ON replacement_offers(estado);

-- ============================================================================
-- PASO 4: FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para members
DROP TRIGGER IF EXISTS update_members_updated_at ON members;
CREATE TRIGGER update_members_updated_at
    BEFORE UPDATE ON members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para instructors
DROP TRIGGER IF EXISTS update_instructors_updated_at ON instructors;
CREATE TRIGGER update_instructors_updated_at
    BEFORE UPDATE ON instructors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para classes
DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PASO 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (el backend usa service_role key que bypasea RLS)
-- Estas políticas son para acceso frontend futuro

-- Política: Lectura pública de clases
CREATE POLICY "Classes are viewable by everyone"
    ON classes FOR SELECT
    USING (true);

-- ============================================================================
-- PASO 6: DATOS DE PRUEBA (OPCIONAL - Solo para testing)
-- ============================================================================

-- Insertar instructor de ejemplo
INSERT INTO instructors (nombre, apellido, telefono, email, especialidades, estado)
VALUES 
    ('Juan', 'Pérez', '+525512345678', 'juan@gym.com', ARRAY['spinning', 'yoga'], 'active')
ON CONFLICT (telefono) DO NOTHING;

-- Insertar miembro de ejemplo
INSERT INTO members (nombre, apellido, telefono, email, tipo_membresia, codigo_qr, estado)
VALUES 
    ('María', 'González', '+525587654321', 'maria@example.com', 'basic', 'QR001', 'active')
ON CONFLICT (telefono) DO NOTHING;

-- ============================================================================
-- VALIDACIÓN FINAL
-- ============================================================================

-- Contar tablas creadas
SELECT 
    schemaname,
    tablename
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verificar extensiones
SELECT * FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm');

-- ============================================================================
-- DEPLOYMENT COMPLETADO
-- ============================================================================
-- Total de tablas: 11 principales
-- Total de índices: 30+
-- Total de funciones: 1
-- Total de triggers: 3
-- RLS: Habilitado en 7 tablas
-- ============================================================================
