#!/bin/bash

# =============================================
# PROMPT 10 VALIDATION SCRIPT
# Valida implementación del Panel de Instructor "Mi Clase Ahora"
# =============================================

echo "=========================================================================================="
echo "========================  🔍 VALIDATING PROMPT 10: INSTRUCTOR PANEL                   =="
echo "=========================================================================================="

PASSED=0
FAILED=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check file existence
check_file() {
    TOTAL=$((TOTAL + 1))
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $1 NOT FOUND"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# Function to check string in file
check_string() {
    TOTAL=$((TOTAL + 1))
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Found '$2' in $1"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} NOT found '$2' in $1"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

# =============================================
# 1. DATABASE COMPONENTS
# =============================================
echo ""
echo "📁 1. DATABASE COMPONENTS"
echo "-------------------------"

check_file "database/schemas/instructor_panel_tables.sql"

# =============================================
# 2. DATABASE SCHEMA VALIDATION
# =============================================
echo ""
echo "📁 2. DATABASE SCHEMA VALIDATION"
echo "----------------------------------"

check_string "database/schemas/instructor_panel_tables.sql" "CREATE TABLE.*instructor_sessions"
check_string "database/schemas/instructor_panel_tables.sql" "CREATE TABLE.*attendance_alerts"
check_string "database/schemas/instructor_panel_tables.sql" "CREATE TABLE.*class_checklists"
check_string "database/schemas/instructor_panel_tables.sql" "CREATE TABLE.*checklist_completions"
check_string "database/schemas/instructor_panel_tables.sql" "CREATE TABLE.*quick_attendance"
check_string "database/schemas/instructor_panel_tables.sql" "session_status VARCHAR"
check_string "database/schemas/instructor_panel_tables.sql" "attendance_rate DECIMAL"
check_string "database/schemas/instructor_panel_tables.sql" "alert_type VARCHAR"
check_string "database/schemas/instructor_panel_tables.sql" "checklist_completed BOOLEAN"

# =============================================
# 3. DATABASE FUNCTIONS
# =============================================
echo ""
echo "📁 3. DATABASE FUNCTIONS"
echo "-----------------------"

check_string "database/schemas/instructor_panel_tables.sql" "start_instructor_session"
check_string "database/schemas/instructor_panel_tables.sql" "quick_checkin_student"
check_string "database/schemas/instructor_panel_tables.sql" "complete_checklist_item"
check_string "database/schemas/instructor_panel_tables.sql" "create_attendance_alert"
check_string "database/schemas/instructor_panel_tables.sql" "v_active_instructor_sessions"
check_string "database/schemas/instructor_panel_tables.sql" "v_instructor_dashboard"

# =============================================
# 4. WHATSAPP TEMPLATES
# =============================================
echo ""
echo "📁 4. WHATSAPP TEMPLATES"
echo "-----------------------"

check_file "whatsapp/templates/low_attendance_alert.json"
check_file "whatsapp/templates/class_started_confirmation.json"
check_file "whatsapp/templates/late_start_alert.json"
check_file "whatsapp/templates/checklist_reminder.json"

# =============================================
# 5. BACKEND SERVICES
# =============================================
echo ""
echo "📁 5. BACKEND SERVICES"
echo "---------------------"

check_file "services/instructor-panel-service.js"
check_string "services/instructor-panel-service.js" "startInstructorSession"
check_string "services/instructor-panel-service.js" "quickCheckinStudent"
check_string "services/instructor-panel-service.js" "completeChecklistItem"
check_string "services/instructor-panel-service.js" "createAlert"
check_string "services/instructor-panel-service.js" "getInstructorDashboard"
check_string "services/instructor-panel-service.js" "alertQueue"

# =============================================
# 6. API ROUTES
# =============================================
echo ""
echo "📁 6. API ROUTES"
echo "---------------"

check_file "routes/api/instructor-panel.js"
check_string "routes/api/instructor-panel.js" "router.post('/sessions/start'"
check_string "routes/api/instructor-panel.js" "router.get('/sessions/:sessionId'"
check_string "routes/api/instructor-panel.js" "router.post('/sessions/:sessionId/checkin'"
check_string "routes/api/instructor-panel.js" "router.get('/sessions/:sessionId/checklist'"
check_string "routes/api/instructor-panel.js" "router.put('/sessions/:sessionId/checklist/:itemId/complete'"
check_string "routes/api/instructor-panel.js" "router.get('/sessions/:sessionId/alerts'"
check_string "routes/api/instructor-panel.js" "router.post('/sessions/:sessionId/alerts'"
check_string "routes/api/instructor-panel.js" "router.get('/dashboard/:instructorId'"

# =============================================
# 7. QUEUE PROCESSOR
# =============================================
echo ""
echo "📁 7. QUEUE PROCESSOR"
echo "--------------------"

check_file "workers/instructor-alert-queue-processor.js"
check_string "workers/instructor-alert-queue-processor.js" "alertQueue.process('send-class-start-confirmation'"
check_string "workers/instructor-alert-queue-processor.js" "alertQueue.process('send-critical-alert'"
check_string "workers/instructor-alert-queue-processor.js" "alertQueue.process('send-low-attendance-alert'"
check_string "workers/instructor-alert-queue-processor.js" "alertQueue.process('send-checklist-reminder'"

# =============================================
# 8. FRONTEND MÓVIL
# =============================================
echo ""
echo "📁 8. FRONTEND MÓVIL"
echo "-------------------"

check_file "frontend/instructor-panel/index.html"
check_string "frontend/instructor-panel/index.html" "Mi Clase Ahora"
check_string "frontend/instructor-panel/index.html" "stats-grid"
check_string "frontend/instructor-panel/index.html" "checklist-section"
check_string "frontend/instructor-panel/index.html" "students-section"
check_string "frontend/instructor-panel/index.html" "quickCheckinStudent"
check_string "frontend/instructor-panel/index.html" "loadSessionData"
check_string "frontend/instructor-panel/index.html" "startAutoRefresh"

# =============================================
# 9. INDEX.JS INTEGRATION
# =============================================
echo ""
echo "📁 9. INDEX.JS INTEGRATION"
echo "-------------------------"

check_string "index.js" "const instructorPanelRoutes = require('./routes/api/instructor-panel')"
check_string "index.js" "app.use('/api/instructor-panel', instructorPanelRoutes)"
check_string "index.js" "require('./workers/instructor-alert-queue-processor')"

# =============================================
# 10. ENVIRONMENT CONFIGURATION
# =============================================
echo ""
echo "📁 10. ENVIRONMENT CONFIGURATION"
echo "-------------------------------"

check_file ".env.example"
check_string ".env.example" "INSTRUCTOR_SESSION_AUTO_END_HOURS"
check_string ".env.example" "INSTRUCTOR_SESSION_REFRESH_INTERVAL"
check_string ".env.example" "INSTRUCTOR_CHECKLIST_REMINDER_MINUTES"
check_string ".env.example" "INSTRUCTOR_LOW_ATTENDANCE_THRESHOLD"

# =============================================
# SUMMARY
# =============================================
echo ""
echo "=========================================================================================="
echo "📊 VALIDATION SUMMARY"
echo "=========================================================================================="

PERCENTAGE=$(awk "BEGIN {printf \"%.0f\", ($PASSED/$TOTAL)*100}")

echo -e "✓ Passed: ${GREEN}$PASSED${NC}/$TOTAL checks (${PERCENTAGE}%)"

if [ $FAILED -gt 0 ]; then
    echo -e "✗ Failed: ${RED}$FAILED${NC}/$TOTAL checks"
fi

echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ ALL VALIDATIONS PASSED!${NC}"
    echo ""
    echo "🎉 PROMPT 10 Implementation Complete!"
    echo ""
    echo "Next Steps:"
    echo "  1. Update .env with INSTRUCTOR_* variables"
    echo "  2. Run database migrations (instructor_panel_tables.sql)"
    echo "  3. Deploy WhatsApp templates to Meta Business Suite (4 templates)"
    echo "  4. Test frontend at /frontend/instructor-panel/index.html"
    echo "  5. Run integration tests: npm test tests/integration/instructor-panel.spec.js"
    echo "  6. Proceed to PROMPT 15: Executive Dashboard 'Command Center'"
    exit 0
else
    echo -e "${RED}❌ SOME VALIDATIONS FAILED${NC}"
    echo ""
    echo "Please fix the failed checks and run this script again."
    exit 1
fi
