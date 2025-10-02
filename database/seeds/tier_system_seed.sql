-- PROMPT 14: TIER SYSTEM - SEED DATA
-- Planes de membresía y catálogo de beneficios

-- Insertar planes de tier
INSERT INTO tier_plans (tier_name, monthly_price, display_name, description, max_classes_per_month, coaching_sessions_per_month, priority_reservations, adaptive_training_plan) VALUES
('standard', 1500.00, 'Standard', 'Plan básico con clases ilimitadas', NULL, 0, FALSE, FALSE),
('plus', 2500.00, 'Plus ⭐', 'Todo Standard + planes adaptativos + prioridad en reservas', NULL, 0, TRUE, TRUE),
('pro', 4500.00, 'Pro 💎', 'Todo Plus + 4 sesiones coaching 1:1 mensuales + análisis biomecánico', NULL, 4, TRUE, TRUE);

-- Catálogo de beneficios por tier
INSERT INTO tier_benefits_catalog (tier_name, benefit_name, benefit_description, icon, display_order) VALUES
-- Standard
('standard', 'Clases Ilimitadas', 'Acceso a todas las clases grupales sin límite', '✅', 1),
('standard', 'App Móvil', 'Reserva y check-in desde tu smartphone', '📱', 2),
('standard', 'Comunidad', 'Acceso a grupos de WhatsApp y eventos', '👥', 3),

-- Plus
('plus', 'Clases Ilimitadas', 'Acceso a todas las clases grupales sin límite', '✅', 1),
('plus', 'Prioridad en Reservas', 'Reserva con 48h de anticipación (vs 24h Standard)', '⭐', 2),
('plus', 'Plan Adaptativo', 'Rutina personalizada según tus objetivos y progreso', '📊', 3),
('plus', 'Tips Nutricionales Premium', 'Consejos avanzados con macros y recetas exclusivas', '🥗', 4),
('plus', 'Análisis de Progreso', 'Reporte mensual de métricas y mejoras', '📈', 5),
('plus', 'App Móvil Plus', 'Funciones avanzadas de tracking y estadísticas', '📱', 6),

-- Pro
('pro', 'Todo lo de Plus', 'Todos los beneficios del tier Plus incluidos', '⭐', 1),
('pro', '4 Sesiones Coaching 1:1', 'Sesiones privadas mensuales con coach certificado', '👤', 2),
('pro', 'Análisis Biomecánico', 'Evaluación profesional de técnica y postura', '🔬', 3),
('pro', 'Plan Nutricional Personalizado', 'Diseñado por nutriólogo según tus objetivos', '🍎', 4),
('pro', 'Prioridad Máxima', 'Primera prioridad en reservas y lista de espera', '💎', 5),
('pro', 'Acceso VIP', 'Horarios exclusivos y clases privadas mensuales', '🌟', 6),
('pro', 'Suplementación Guiada', 'Recomendaciones personalizadas de suplementos', '💊', 7),
('pro', 'WhatsApp Directo Coach', 'Línea directa con tu coach asignado', '💬', 8);

COMMENT ON TABLE tier_plans IS 'Seed inicial: 3 planes (Standard $1,500, Plus $2,500, Pro $4,500)';
COMMENT ON TABLE tier_benefits_catalog IS 'Seed inicial: 17 beneficios diferenciados (3 Standard, 6 Plus, 8 Pro)';
