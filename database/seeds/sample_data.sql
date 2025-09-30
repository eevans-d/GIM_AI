-- ===================================
-- GIM_AI Sample Data
-- Datos de prueba para desarrollo y testing
-- ===================================

-- ===================================
-- SAMPLE MEMBERS
-- ===================================
INSERT INTO members (id, phone, email, first_name, last_name, membership_type, membership_status, monthly_fee, qr_code, source) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '+5491112345001', 'juan.perez@email.com', 'Juan', 'Pérez', 'pro', 'active', 15000, 'QR001', 'qr'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '+5491112345002', 'maria.garcia@email.com', 'María', 'García', 'plus', 'active', 12000, 'QR002', 'web'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', '+5491112345003', 'carlos.rodriguez@email.com', 'Carlos', 'Rodríguez', 'basic', 'active', 10000, 'QR003', 'qr'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', '+5491112345004', 'ana.martinez@email.com', 'Ana', 'Martínez', 'pro', 'active', 15000, 'QR004', 'referral'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', '+5491112345005', 'roberto.lopez@email.com', 'Roberto', 'López', 'basic', 'paused', 10000, 'QR005', 'manual'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', '+5491112345006', 'laura.sanchez@email.com', 'Laura', 'Sánchez', 'plus', 'active', 12000, 'QR006', 'qr'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', '+5491112345007', 'diego.fernandez@email.com', 'Diego', 'Fernández', 'pro', 'active', 15000, 'QR007', 'web'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', '+5491112345008', 'sofia.gomez@email.com', 'Sofía', 'Gómez', 'basic', 'active', 10000, 'QR008', 'qr'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', '+5491112345009', 'martin.diaz@email.com', 'Martín', 'Díaz', 'plus', 'active', 12000, 'QR009', 'referral'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', '+5491112345010', 'valentina.ruiz@email.com', 'Valentina', 'Ruiz', 'basic', 'active', 10000, 'QR010', 'manual');

-- ===================================
-- SAMPLE INSTRUCTORS
-- ===================================
INSERT INTO instructors (id, phone, email, first_name, last_name, specialties, hire_date, pin_hash) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', '+5491112340001', 'instructor1@gym.com', 'Pablo', 'Torres', ARRAY['spinning', 'crossfit'], CURRENT_DATE - INTERVAL '2 years', '$2a$10$abcdefghijklmnopqrstuv'),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', '+5491112340002', 'instructor2@gym.com', 'Gabriela', 'Romero', ARRAY['yoga', 'pilates'], CURRENT_DATE - INTERVAL '3 years', '$2a$10$abcdefghijklmnopqrstuv'),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', '+5491112340003', 'instructor3@gym.com', 'Maximiliano', 'Castro', ARRAY['crossfit', 'funcional'], CURRENT_DATE - INTERVAL '1 year', '$2a$10$abcdefghijklmnopqrstuv'),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', '+5491112340004', 'instructor4@gym.com', 'Carolina', 'Morales', ARRAY['spinning', 'zumba'], CURRENT_DATE - INTERVAL '18 months', '$2a$10$abcdefghijklmnopqrstuv'),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', '+5491112340005', 'instructor5@gym.com', 'Federico', 'Silva', ARRAY['yoga', 'stretching'], CURRENT_DATE - INTERVAL '6 months', '$2a$10$abcdefghijklmnopqrstuv');

-- ===================================
-- SAMPLE INSTRUCTOR SKILLS
-- ===================================
INSERT INTO instructor_skills (instructor_id, skill_type, certification_name, issued_date, expiry_date, verified) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'spinning', 'Spinning Master Certification', '2022-01-15', '2025-01-15', true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'crossfit', 'CrossFit Level 1 Trainer', '2021-06-20', '2024-06-20', true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'yoga', 'Yoga Alliance RYT-200', '2020-03-10', '2026-03-10', true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'pilates', 'Pilates Method Alliance Certified', '2020-09-15', '2025-09-15', true),
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'crossfit', 'CrossFit Level 2 Trainer', '2022-11-01', '2025-11-01', true);

-- ===================================
-- SAMPLE CLASSES
-- ===================================
-- Today's classes
INSERT INTO classes (id, class_name, class_type, scheduled_date, start_time, end_time, instructor_id, max_capacity, current_reservations) VALUES
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Spinning Mañana', 'spinning', CURRENT_DATE, '08:00', '09:00', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 25, 22),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Yoga Suave', 'yoga', CURRENT_DATE, '09:30', '10:30', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 20, 12),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'CrossFit Valle', 'crossfit', CURRENT_DATE, '14:00', '15:00', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 15, 6),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Spinning Tarde', 'spinning', CURRENT_DATE, '18:00', '19:00', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 30, 28),
('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'Yoga Relax', 'yoga', CURRENT_DATE, '19:30', '20:30', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 20, 15);

-- Tomorrow's classes
INSERT INTO classes (class_name, class_type, scheduled_date, start_time, end_time, instructor_id, max_capacity, current_reservations) VALUES
('Spinning Mañana', 'spinning', CURRENT_DATE + INTERVAL '1 day', '08:00', '09:00', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 25, 18),
('CrossFit Intenso', 'crossfit', CURRENT_DATE + INTERVAL '1 day', '10:00', '11:00', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 15, 14),
('Yoga Flow', 'yoga', CURRENT_DATE + INTERVAL '1 day', '11:30', '12:30', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 20, 10),
('Spinning Tarde', 'spinning', CURRENT_DATE + INTERVAL '1 day', '18:00', '19:00', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 30, 25),
('Zumba Party', 'zumba', CURRENT_DATE + INTERVAL '1 day', '19:30', '20:30', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 35, 20);

-- ===================================
-- SAMPLE RESERVATIONS
-- ===================================
INSERT INTO reservations (member_id, class_id, status, source) VALUES
-- Today's class reservations
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'confirmed', 'web'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'confirmed', 'qr'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'confirmed', 'web'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'confirmed', 'web'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'confirmed', 'qr'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'confirmed', 'web');

-- ===================================
-- SAMPLE CHECKINS
-- ===================================
INSERT INTO checkins (member_id, class_id, source, has_debt, debt_amount) VALUES
-- Today's check-ins
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qr', false, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'qr', false, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'manual', true, 10000),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'qr', false, 0),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', NULL, 'kiosk', false, 0);

-- ===================================
-- SAMPLE PAYMENTS
-- ===================================
INSERT INTO payments (member_id, amount, payment_method, period_start, period_end, due_date, status) VALUES
-- Current month - paid
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 15000, 'card', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', CURRENT_DATE - INTERVAL '5 days', 'paid'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 12000, 'transfer', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '27 days', CURRENT_DATE - INTERVAL '3 days', 'paid'),

-- Current month - pending/overdue
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 10000, NULL, CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', CURRENT_DATE - INTERVAL '5 days', 'pending'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 12000, NULL, CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '20 days', CURRENT_DATE - INTERVAL '10 days', 'pending'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 10000, NULL, CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE + INTERVAL '23 days', CURRENT_DATE - INTERVAL '7 days', 'pending');

-- ===================================
-- SAMPLE FEEDBACK
-- ===================================
INSERT INTO feedback (member_id, class_id, instructor_id, rating, comment, sentiment) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, 'Excelente clase! Muy motivadora.', 'positive'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 4, 'Buena clase, pero la música podría mejorar.', 'positive'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 5, 'Muy relajante, perfecta para desestresarse.', 'positive'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 'El equipo de la bici 5 no funcionaba bien.', 'neutral');

-- ===================================
-- SAMPLE INCIDENTS
-- ===================================
INSERT INTO incidents (title, description, category, severity, status, reported_by_member_id) VALUES
('Aire acondicionado sala spinning', 'El aire acondicionado no enfría lo suficiente', 'equipo', 'medium', 'open', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'),
('Falta papel en vestuarios', 'Se acabó el papel higiénico en vestuario mujeres', 'limpieza', 'low', 'in_progress', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'),
('Mancuerna rota', 'Mancuerna de 15kg tiene el recubrimiento suelto', 'equipo', 'medium', 'open', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- ===================================
-- Update statistics
-- ===================================

-- Update class attendance
UPDATE classes SET 
    actual_attendance = current_reservations,
    no_shows = 0,
    average_satisfaction = 4.5,
    status = 'completed'
WHERE scheduled_date < CURRENT_DATE;

-- Update instructor stats
UPDATE instructors SET 
    total_classes_given = (SELECT COUNT(*) FROM classes WHERE instructor_id = instructors.id AND status = 'completed'),
    average_satisfaction = (SELECT AVG(rating) FROM feedback WHERE instructor_id = instructors.id);

-- ===================================
-- Verification queries
-- ===================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Sample Data Loaded Successfully!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Members: %', (SELECT COUNT(*) FROM members);
    RAISE NOTICE 'Instructors: %', (SELECT COUNT(*) FROM instructors);
    RAISE NOTICE 'Classes: %', (SELECT COUNT(*) FROM classes);
    RAISE NOTICE 'Reservations: %', (SELECT COUNT(*) FROM reservations);
    RAISE NOTICE 'Check-ins: %', (SELECT COUNT(*) FROM checkins);
    RAISE NOTICE 'Payments: %', (SELECT COUNT(*) FROM payments);
    RAISE NOTICE 'Feedback: %', (SELECT COUNT(*) FROM feedback);
    RAISE NOTICE 'Incidents: %', (SELECT COUNT(*) FROM incidents);
    RAISE NOTICE '============================================';
END $$;
