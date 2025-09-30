-- ===================================
-- GIM_AI Database Indexes
-- Optimización para queries frecuentes
-- ===================================

-- ===================================
-- MEMBERS INDEXES
-- ===================================
CREATE INDEX idx_members_phone ON members(phone);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_qr_code ON members(qr_code);
CREATE INDEX idx_members_membership_status ON members(membership_status) WHERE is_active = true;
CREATE INDEX idx_members_active ON members(is_active);
CREATE INDEX idx_members_created_at ON members(created_at DESC);

-- ===================================
-- INSTRUCTORS INDEXES
-- ===================================
CREATE INDEX idx_instructors_phone ON instructors(phone);
CREATE INDEX idx_instructors_email ON instructors(email);
CREATE INDEX idx_instructors_active ON instructors(is_active);
CREATE INDEX idx_instructors_can_replace ON instructors(can_replace) WHERE is_active = true;

-- ===================================
-- CLASSES INDEXES
-- ===================================
CREATE INDEX idx_classes_scheduled_date ON classes(scheduled_date);
CREATE INDEX idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX idx_classes_status ON classes(status);
CREATE INDEX idx_classes_date_time ON classes(scheduled_date, start_time);
CREATE INDEX idx_classes_type ON classes(class_type);
-- Composite index for finding classes by date range and status
CREATE INDEX idx_classes_schedule_status ON classes(scheduled_date, status) 
    WHERE status IN ('scheduled', 'completed');

-- ===================================
-- RESERVATIONS INDEXES
-- ===================================
CREATE INDEX idx_reservations_member_id ON reservations(member_id);
CREATE INDEX idx_reservations_class_id ON reservations(class_id);
CREATE INDEX idx_reservations_status ON reservations(status);
-- Find waitlist for a class
CREATE INDEX idx_reservations_waitlist ON reservations(class_id, position_in_waitlist) 
    WHERE reservation_type = 'waitlist' AND status = 'confirmed';
-- Recent reservations for a member
CREATE INDEX idx_reservations_member_recent ON reservations(member_id, reserved_at DESC);

-- ===================================
-- CHECKINS INDEXES
-- ===================================
CREATE INDEX idx_checkins_member_id ON checkins(member_id);
CREATE INDEX idx_checkins_class_id ON checkins(class_id);
CREATE INDEX idx_checkins_time ON checkins(checkin_time DESC);
CREATE INDEX idx_checkins_source ON checkins(source);
-- Find check-ins by date for daily reports
CREATE INDEX idx_checkins_date ON checkins(CAST(checkin_time AS DATE));
-- Find debtors who checked in
CREATE INDEX idx_checkins_with_debt ON checkins(member_id, checkin_time) WHERE has_debt = true;

-- ===================================
-- PAYMENTS INDEXES
-- ===================================
CREATE INDEX idx_payments_member_id ON payments(member_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_due_date ON payments(due_date);
CREATE INDEX idx_payments_payment_date ON payments(payment_date);
-- Find overdue payments
CREATE INDEX idx_payments_overdue ON payments(member_id, days_overdue DESC) 
    WHERE status = 'pending' AND due_date < CURRENT_DATE;
-- Payments by period for reporting
CREATE INDEX idx_payments_period ON payments(period_start, period_end);

-- ===================================
-- FEEDBACK INDEXES
-- ===================================
CREATE INDEX idx_feedback_member_id ON feedback(member_id);
CREATE INDEX idx_feedback_class_id ON feedback(class_id);
CREATE INDEX idx_feedback_instructor_id ON feedback(instructor_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
CREATE INDEX idx_feedback_submitted_at ON feedback(submitted_at DESC);
-- Find feedback requiring attention
CREATE INDEX idx_feedback_attention ON feedback(submitted_at DESC) WHERE requires_attention = true;
-- Sentiment analysis queries
CREATE INDEX idx_feedback_sentiment ON feedback(sentiment, submitted_at DESC);

-- ===================================
-- INCIDENTS INDEXES
-- ===================================
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_category ON incidents(category);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_created_at ON incidents(created_at DESC);
-- Open incidents by priority
CREATE INDEX idx_incidents_open ON incidents(priority DESC, created_at) 
    WHERE status IN ('open', 'in_progress');
-- Incidents by class
CREATE INDEX idx_incidents_class_id ON incidents(related_class_id) WHERE related_class_id IS NOT NULL;

-- ===================================
-- INSTRUCTOR_SKILLS INDEXES
-- ===================================
CREATE INDEX idx_instructor_skills_instructor_id ON instructor_skills(instructor_id);
CREATE INDEX idx_instructor_skills_type ON instructor_skills(skill_type);
CREATE INDEX idx_instructor_skills_verified ON instructor_skills(verified);
-- Find expired certifications
CREATE INDEX idx_instructor_skills_expiry ON instructor_skills(expiry_date) 
    WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE + INTERVAL '30 days';

-- ===================================
-- REPLACEMENTS_LOG INDEXES
-- ===================================
CREATE INDEX idx_replacements_class_id ON replacements_log(class_id);
CREATE INDEX idx_replacements_original_instructor ON replacements_log(original_instructor_id);
CREATE INDEX idx_replacements_replacement_instructor ON replacements_log(replacement_instructor_id);
CREATE INDEX idx_replacements_status ON replacements_log(status);
CREATE INDEX idx_replacements_requested_at ON replacements_log(requested_at DESC);
-- Find pending replacements
CREATE INDEX idx_replacements_pending ON replacements_log(requested_at DESC) 
    WHERE status = 'pending';

-- ===================================
-- WHATSAPP_MESSAGES INDEXES
-- ===================================
CREATE INDEX idx_whatsapp_messages_member_id ON whatsapp_messages(member_id);
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at DESC);
-- Rate limiting queries
CREATE INDEX idx_whatsapp_messages_daily_count ON whatsapp_messages(member_id, created_at) 
    WHERE direction = 'outbound' AND created_at >= CURRENT_DATE;
-- Failed messages for retry
CREATE INDEX idx_whatsapp_messages_failed ON whatsapp_messages(created_at DESC) 
    WHERE status = 'failed';

-- ===================================
-- COMPOSITE INDEXES FOR COMMON QUERIES
-- ===================================

-- Dashboard: Today's activity
CREATE INDEX idx_dashboard_today_checkins ON checkins(checkin_time) 
    WHERE CAST(checkin_time AS DATE) = CURRENT_DATE;

-- Dashboard: Active members with debt
CREATE INDEX idx_dashboard_debtors ON payments(member_id, days_overdue DESC) 
    WHERE status = 'pending' AND due_date < CURRENT_DATE;

-- Class occupancy analysis
CREATE INDEX idx_class_occupancy ON classes(scheduled_date, class_type, current_reservations);

-- Member activity tracking
CREATE INDEX idx_member_activity ON checkins(member_id, checkin_time DESC);

-- Instructor performance
CREATE INDEX idx_instructor_performance ON classes(instructor_id, status) 
    WHERE status = 'completed';

-- ===================================
-- GIN INDEXES FOR ARRAY COLUMNS
-- ===================================
CREATE INDEX idx_instructors_specialties ON instructors USING GIN(specialties);
CREATE INDEX idx_classes_required_certifications ON classes USING GIN(required_certifications);
CREATE INDEX idx_feedback_categories ON feedback USING GIN(categories);
CREATE INDEX idx_feedback_keywords ON feedback USING GIN(keywords);
CREATE INDEX idx_incidents_tags ON incidents USING GIN(tags);

-- ===================================
-- PARTIAL INDEXES FOR BETTER PERFORMANCE
-- ===================================

-- Only index active members
CREATE INDEX idx_active_members_phone ON members(phone) WHERE is_active = true;

-- Only index future classes
CREATE INDEX idx_future_classes ON classes(scheduled_date, start_time) 
    WHERE scheduled_date >= CURRENT_DATE AND status = 'scheduled';

-- Only index unprocessed feedback
CREATE INDEX idx_unprocessed_feedback ON feedback(submitted_at) WHERE processed_at IS NULL;

-- Only index open incidents
CREATE INDEX idx_open_incidents_severity ON incidents(severity, created_at DESC) 
    WHERE status IN ('open', 'in_progress');
