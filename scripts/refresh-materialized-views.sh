#!/bin/bash

# PROMPT 20: DATABASE OPTIMIZATION - REFRESH MATERIALIZED VIEWS
# Automated script to refresh all materialized views

echo "==================================================="
echo "GIM_AI - Refreshing Materialized Views"
echo "==================================================="
echo ""

# Database connection parameters
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# SQL execution helper
run_sql() {
  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1"
}

# ============================================
# REFRESH FUNCTIONS
# ============================================

refresh_view() {
  local view_name=$1
  echo -n "Refreshing $view_name... "
  
  START=$(date +%s)
  run_sql "REFRESH MATERIALIZED VIEW CONCURRENTLY $view_name;" 2>/dev/null
  
  if [ $? -eq 0 ]; then
    END=$(date +%s)
    DURATION=$((END - START))
    echo -e "${GREEN}✅ Done (${DURATION}s)${NC}"
    return 0
  else
    echo -e "${RED}❌ Failed${NC}"
    return 1
  fi
}

# ============================================
# MAIN EXECUTION
# ============================================

echo "Starting materialized view refresh at $(date)"
echo ""

TOTAL_VIEWS=0
SUCCESS_COUNT=0
FAIL_COUNT=0

# List of materialized views to refresh
VIEWS=(
  "v_daily_kpis"
  "v_member_engagement_scores"
  "v_class_performance_metrics"
  "v_instructor_stats"
)

for view in "${VIEWS[@]}"; do
  TOTAL_VIEWS=$((TOTAL_VIEWS + 1))
  
  if refresh_view "$view"; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo ""
echo "==================================================="
echo "REFRESH SUMMARY"
echo "---------------------------------------------------"
echo "Total Views:    $TOTAL_VIEWS"
echo "Successful:     $SUCCESS_COUNT"
echo "Failed:         $FAIL_COUNT"
echo "==================================================="

# Exit with error if any refresh failed
if [ $FAIL_COUNT -gt 0 ]; then
  exit 1
else
  exit 0
fi
