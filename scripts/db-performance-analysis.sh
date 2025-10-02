#!/bin/bash

# PROMPT 20: DATABASE OPTIMIZATION - PERFORMANCE ANALYSIS SCRIPT
# Analyzes database performance metrics and identifies bottlenecks

echo "==================================================="
echo "GIM_AI - Database Performance Analysis"
echo "==================================================="
echo ""

# Database connection parameters
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_NAME="${SUPABASE_DB_NAME:-postgres}"
DB_USER="${SUPABASE_DB_USER:-postgres}"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# SQL execution helper
run_sql() {
  PGPASSWORD="$SUPABASE_DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1"
}

# ============================================
# DATABASE SIZE METRICS
# ============================================

echo "📊 DATABASE SIZE METRICS"
echo "---------------------------------------------------"

DB_SIZE=$(run_sql "SELECT pg_size_pretty(pg_database_size(current_database()));")
TABLES_SIZE=$(run_sql "SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))) FROM pg_tables WHERE schemaname = 'public';")
INDEXES_SIZE=$(run_sql "SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid))) FROM pg_stat_user_indexes WHERE schemaname = 'public';")

echo "Database Size:     $DB_SIZE"
echo "Tables Size:       $TABLES_SIZE"
echo "Indexes Size:      $INDEXES_SIZE"
echo ""

# ============================================
# TOP 10 LARGEST TABLES
# ============================================

echo "🗃️  TOP 10 LARGEST TABLES"
echo "---------------------------------------------------"

run_sql "
SELECT 
    tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;
" | awk -F'|' '{printf "%-30s %15s\n", $1, $2}'

echo ""

# ============================================
# INDEX USAGE STATISTICS
# ============================================

echo "📈 INDEX USAGE STATISTICS"
echo "---------------------------------------------------"

UNUSED_INDEXES=$(run_sql "
SELECT COUNT(*) 
FROM pg_stat_user_indexes 
WHERE schemaname = 'public' 
AND idx_scan = 0 
AND idx_tup_read = 0;
")

echo "Total Indexes: $(run_sql "SELECT COUNT(*) FROM pg_stat_user_indexes WHERE schemaname = 'public';")"
echo "Unused Indexes: $UNUSED_INDEXES"

if [ "$UNUSED_INDEXES" -gt 0 ]; then
  echo ""
  echo "${YELLOW}⚠️  UNUSED INDEXES (Consider dropping):${NC}"
  run_sql "
  SELECT 
      schemaname||'.'||tablename AS table,
      indexrelname AS index,
      pg_size_pretty(pg_relation_size(indexrelid)) AS size
  FROM pg_stat_user_indexes 
  WHERE schemaname = 'public' 
  AND idx_scan = 0 
  AND idx_tup_read = 0
  ORDER BY pg_relation_size(indexrelid) DESC
  LIMIT 5;
  " | awk -F'|' '{printf "%-40s %-40s %10s\n", $1, $2, $3}'
fi

echo ""

# ============================================
# TABLE BLOAT DETECTION
# ============================================

echo "💾 TABLE BLOAT DETECTION"
echo "---------------------------------------------------"

BLOATED_TABLES=$(run_sql "
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    ROUND(100 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename, 'main'))::NUMERIC / 
        NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0), 2) AS bloat_pct
FROM pg_tables 
WHERE schemaname = 'public'
AND (100 * (pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename, 'main'))::NUMERIC / 
    NULLIF(pg_total_relation_size(schemaname||'.'||tablename), 0)) > 15
ORDER BY bloat_pct DESC;
")

if [ -z "$BLOATED_TABLES" ]; then
  echo "${GREEN}✅ No bloated tables detected${NC}"
else
  echo "${YELLOW}⚠️  BLOATED TABLES (> 15%):${NC}"
  echo "$BLOATED_TABLES" | awk -F'|' '{printf "%-30s %15s %10s%%\n", $1, $2, $3}'
  echo ""
  echo "${YELLOW}Recommendation: Run VACUUM ANALYZE on bloated tables${NC}"
fi

echo ""

# ============================================
# CACHE HIT RATIO
# ============================================

echo "🎯 CACHE HIT RATIO"
echo "---------------------------------------------------"

CACHE_HIT_RATIO=$(run_sql "
SELECT 
    ROUND(100.0 * SUM(blks_hit) / NULLIF(SUM(blks_hit + blks_read), 0), 2) AS cache_hit_ratio
FROM pg_stat_database 
WHERE datname = current_database();
")

echo "Cache Hit Ratio: ${CACHE_HIT_RATIO}%"

if (( $(echo "$CACHE_HIT_RATIO < 90" | bc -l) )); then
  echo "${RED}⚠️  LOW cache hit ratio! Consider increasing shared_buffers${NC}"
elif (( $(echo "$CACHE_HIT_RATIO < 95" | bc -l) )); then
  echo "${YELLOW}⚠️  Moderate cache hit ratio${NC}"
else
  echo "${GREEN}✅ Good cache hit ratio${NC}"
fi

echo ""

# ============================================
# MOST ACCESSED TABLES
# ============================================

echo "🔥 MOST ACCESSED TABLES (Reads)"
echo "---------------------------------------------------"

run_sql "
SELECT 
    schemaname||'.'||relname AS table,
    seq_scan + idx_scan AS total_scans,
    seq_scan AS seq_scans,
    idx_scan AS index_scans,
    ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2) AS index_usage_pct
FROM pg_stat_user_tables 
WHERE schemaname = 'public'
ORDER BY seq_scan + idx_scan DESC 
LIMIT 10;
" | awk -F'|' '{printf "%-30s %12s %12s %12s %10s%%\n", $1, $2, $3, $4, $5}'

echo ""

# ============================================
# VACUUM & ANALYZE STATUS
# ============================================

echo "🔄 VACUUM & ANALYZE STATUS"
echo "---------------------------------------------------"

NEVER_VACUUMED=$(run_sql "
SELECT COUNT(*) 
FROM pg_stat_user_tables 
WHERE schemaname = 'public' 
AND (last_vacuum IS NULL AND last_autovacuum IS NULL);
")

echo "Tables never vacuumed: $NEVER_VACUUMED"

if [ "$NEVER_VACUUMED" -gt 0 ]; then
  echo "${YELLOW}⚠️  Some tables have never been vacuumed${NC}"
  run_sql "
  SELECT 
      schemaname||'.'||relname AS table,
      n_tup_ins AS inserts,
      n_tup_upd AS updates,
      n_tup_del AS deletes
  FROM pg_stat_user_tables 
  WHERE schemaname = 'public' 
  AND (last_vacuum IS NULL AND last_autovacuum IS NULL)
  LIMIT 5;
  " | awk -F'|' '{printf "%-30s %10s %10s %10s\n", $1, $2, $3, $4}'
fi

echo ""

# ============================================
# CONNECTION STATISTICS
# ============================================

echo "🔌 CONNECTION STATISTICS"
echo "---------------------------------------------------"

TOTAL_CONNECTIONS=$(run_sql "SELECT COUNT(*) FROM pg_stat_activity;")
ACTIVE_CONNECTIONS=$(run_sql "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")
IDLE_CONNECTIONS=$(run_sql "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'idle';")

echo "Total Connections:  $TOTAL_CONNECTIONS"
echo "Active Queries:     $ACTIVE_CONNECTIONS"
echo "Idle Connections:   $IDLE_CONNECTIONS"

echo ""

# ============================================
# LONG RUNNING QUERIES
# ============================================

echo "⏱️  LONG RUNNING QUERIES (> 30s)"
echo "---------------------------------------------------"

LONG_QUERIES=$(run_sql "
SELECT 
    pid,
    NOW() - query_start AS duration,
    LEFT(query, 50) AS query
FROM pg_stat_activity 
WHERE state = 'active' 
AND NOW() - query_start > INTERVAL '30 seconds'
ORDER BY duration DESC;
")

if [ -z "$LONG_QUERIES" ]; then
  echo "${GREEN}✅ No long-running queries detected${NC}"
else
  echo "${YELLOW}⚠️  LONG QUERIES DETECTED:${NC}"
  echo "$LONG_QUERIES"
fi

echo ""

# ============================================
# RECOMMENDATIONS
# ============================================

echo "💡 RECOMMENDATIONS"
echo "---------------------------------------------------"

# Check if pg_stat_statements is enabled
PG_STAT_STATEMENTS=$(run_sql "SELECT COUNT(*) FROM pg_extension WHERE extname = 'pg_stat_statements';")

if [ "$PG_STAT_STATEMENTS" -eq 0 ]; then
  echo "${YELLOW}⚠️  pg_stat_statements extension not enabled${NC}"
  echo "   Enable with: CREATE EXTENSION pg_stat_statements;"
fi

# Check materialized views
MV_COUNT=$(run_sql "SELECT COUNT(*) FROM pg_matviews WHERE schemaname = 'public';")
echo "Materialized Views: $MV_COUNT"

if [ "$MV_COUNT" -gt 0 ]; then
  echo "${GREEN}✅ Materialized views detected${NC}"
  echo "   Refresh with: SELECT refresh_all_materialized_views();"
fi

echo ""
echo "==================================================="
echo "Analysis complete at $(date)"
echo "==================================================="
