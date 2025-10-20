# 🚀 Performance Optimization Guide - GIM_AI

**Date**: October 18, 2025  
**Objective**: Achieve <500ms P95, <2s P99, <1% error rate  
**Current Status**: Baseline established, optimizations pending

---

## 📊 Performance Testing Overview

### Testing Framework
- **Tool**: Artillery 2.0+ with custom processor
- **Scenarios**: 5 phases (warm-up, ramp-up, sustained, spike, cool-down)
- **Test Flows**: 4 critical paths (rate limiting, QR check-in, surveys, auth)
- **Load Profile**: 1-50 req/sec, 600s duration

### Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **P95 Latency** | < 500ms | > 1000ms |
| **P99 Latency** | < 2000ms | > 3000ms |
| **Error Rate** | < 1% | > 5% |
| **Throughput** | > 50 req/s | < 20 req/s |
| **Availability** | > 99.9% | < 99% |

---

## 🎯 Optimization Strategies

### 1. Database Performance (CRITICAL)

#### A. Connection Pooling
**Current State**: Basic Supabase client without pooling  
**Issue**: Connection overhead on every request  
**Solution**: Implement pg-pool with connection reuse

```javascript
// config/database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  max: 20,                    // Maximum pool size
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if no connection available
});

// Middleware to attach pool to requests
app.use((req, res, next) => {
  req.db = pool;
  next();
});
```

**Expected Impact**: -30% latency on database operations

#### B. Query Optimization
**Current State**: N+1 queries in some endpoints  
**Issue**: Multiple round-trips to database  
**Solution**: Batch queries and use joins

```sql
-- BEFORE: N+1 queries
SELECT * FROM classes WHERE fecha = '2025-10-18';
-- Then for each class:
SELECT COUNT(*) FROM checkins WHERE clase_id = ?;

-- AFTER: Single query with join
SELECT 
  c.*,
  COUNT(ch.id) as checkin_count
FROM classes c
LEFT JOIN checkins ch ON c.id = ch.clase_id
WHERE c.fecha = '2025-10-18'
GROUP BY c.id;
```

**Expected Impact**: -50% database queries, -40% latency

#### C. Materialized View Refresh Strategy
**Current State**: Auto-refresh every 5 minutes  
**Issue**: Blocks reads during refresh  
**Solution**: Use CONCURRENTLY and off-peak refresh

```sql
-- Update database/schemas/dashboard_tables.sql
CREATE FUNCTION refresh_dashboard_views() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_financial_kpis_today;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_operational_kpis_today;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_satisfaction_kpis_recent;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_retention_kpis_month;
  REFRESH MATERIALIZED VIEW CONCURRENTLY v_executive_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule during low-traffic periods (2AM, 8AM, 2PM, 8PM)
-- Update workers/dashboard-cron-processor.js
cron.schedule('0 2,8,14,20 * * *', async () => {
  await supabase.rpc('refresh_dashboard_views');
});
```

**Expected Impact**: -90% blocking time, improved user experience

#### D. Index Optimization
**Current State**: Basic indexes on primary keys  
**Issue**: Sequential scans on filtered queries  
**Solution**: Add covering indexes

```sql
-- Add to database/migrations/
-- Indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_checkins_member_date 
  ON checkins(member_id, fecha_checkin);

CREATE INDEX CONCURRENTLY idx_checkins_class_date 
  ON checkins(clase_id, fecha_checkin) 
  INCLUDE (member_id, hora_checkin);

CREATE INDEX CONCURRENTLY idx_members_active_phone 
  ON members(telefono) 
  WHERE estado = 'active';

CREATE INDEX CONCURRENTLY idx_payments_overdue 
  ON payments(member_id, fecha_vencimiento) 
  WHERE estado = 'pendiente' AND fecha_vencimiento < CURRENT_DATE;

-- Analyze query performance
-- Run before deploying: EXPLAIN ANALYZE <your query>
```

**Expected Impact**: -60% query time on filtered searches

---

### 2. Redis Caching (HIGH PRIORITY)

#### A. Application-Level Cache
**Current State**: No caching layer  
**Issue**: Repeated database queries for same data  
**Solution**: Redis cache with TTL

```javascript
// utils/cache.js
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 1, // Use DB 1 for cache (DB 0 for Bull queues)
  retryStrategy: (times) => Math.min(times * 50, 2000)
});

class CacheService {
  /**
   * Cache with auto-invalidation
   */
  async remember(key, ttl, callback) {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    const fresh = await callback();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    return fresh;
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidate(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

module.exports = new CacheService();

// Example usage in routes/api/dashboard.js
const cache = require('../../utils/cache');

router.get('/kpis/realtime', async (req, res) => {
  const kpis = await cache.remember(
    'dashboard:kpis:realtime',
    60, // 60 second TTL
    async () => {
      return await dashboardService.getRealtimeKPIs();
    }
  );
  res.json(kpis);
});

// Invalidate on data change
router.post('/checkin', async (req, res) => {
  await checkinService.create(req.body);
  await cache.invalidate('dashboard:kpis:*');
  res.json({ success: true });
});
```

**Expected Impact**: -80% database load, -70% latency on cached endpoints

#### B. Cache Warming
**Current State**: Cold cache on startup  
**Issue**: First requests are slow  
**Solution**: Pre-populate cache on startup

```javascript
// index.js - Add after server start
async function warmCache() {
  const cache = require('./utils/cache');
  const log = logger.createLogger('cache-warmer');

  log.info('Warming cache...');

  try {
    // Pre-load frequently accessed data
    await cache.remember('classes:today', 300, async () => {
      return await supabase.from('classes')
        .select('*')
        .eq('fecha', new Date().toISOString().split('T')[0]);
    });

    await cache.remember('members:active', 300, async () => {
      return await supabase.from('members')
        .select('id, nombre, telefono')
        .eq('estado', 'active');
    });

    await cache.remember('dashboard:kpis:realtime', 60, async () => {
      return await dashboardService.getRealtimeKPIs();
    });

    log.info('Cache warming complete');
  } catch (error) {
    log.error('Cache warming failed', { error: error.message });
  }
}

// Execute after server starts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  warmCache(); // Non-blocking
});
```

**Expected Impact**: -90% latency on first requests after deployment

---

### 3. API Optimizations (MEDIUM PRIORITY)

#### A. Response Compression
**Current State**: Uncompressed JSON responses  
**Issue**: Large payloads increase transfer time  
**Solution**: Enable gzip compression

```javascript
// index.js
const compression = require('compression');

// Add after body-parser middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between speed and compression ratio
  threshold: 1024 // Only compress responses > 1KB
}));
```

**Expected Impact**: -60% payload size, -30% transfer time

#### B. Pagination
**Current State**: Returning all results without limit  
**Issue**: Large datasets cause memory issues  
**Solution**: Implement cursor-based pagination

```javascript
// routes/api/checkin.js
router.get('/history/:memberId', async (req, res) => {
  const { memberId } = req.params;
  const { limit = 50, cursor } = req.query;

  const query = supabase
    .from('checkins')
    .select('*')
    .eq('member_id', memberId)
    .order('fecha_checkin', { ascending: false })
    .limit(parseInt(limit));

  if (cursor) {
    query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  const nextCursor = data.length > 0 
    ? data[data.length - 1].created_at 
    : null;

  res.json({
    data,
    pagination: {
      limit: parseInt(limit),
      cursor: nextCursor,
      hasMore: data.length === parseInt(limit)
    }
  });
});
```

**Expected Impact**: -70% memory usage, -50% response time for large datasets

#### C. Async Operations
**Current State**: Synchronous processing blocks responses  
**Issue**: User waits for background tasks  
**Solution**: Offload to Bull queue

```javascript
// routes/api/checkin.js
router.post('/', async (req, res) => {
  const { qr_code, member_id } = req.body;

  // 1. Validate and create check-in (fast, <100ms)
  const checkin = await checkinService.create({ qr_code, member_id });

  // 2. Return response immediately
  res.json({ success: true, checkin });

  // 3. Queue background tasks (non-blocking)
  await whatsappQueue.add('send-confirmation', {
    memberId: member_id,
    checkinId: checkin.id
  }, { delay: 1000 });

  await collectionQueue.add('schedule-collection', {
    memberId: member_id,
    checkinId: checkin.id
  }, { delay: 90 * 60 * 1000 }); // 90 min delay
});
```

**Expected Impact**: -80% response time, improved UX

---

### 4. Node.js Optimization (LOW PRIORITY)

#### A. Cluster Mode
**Current State**: Single process  
**Issue**: Not utilizing all CPU cores  
**Solution**: pm2 cluster mode

```bash
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'gim-ai',
    script: './index.js',
    instances: 'max', // Use all available CPUs
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};

# Start with pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Expected Impact**: +300% throughput on multi-core systems

#### B. Memory Management
**Current State**: No memory limits  
**Issue**: Memory leaks can crash server  
**Solution**: Monitoring and limits

```javascript
// utils/memory-monitor.js
const log = require('./logger').createLogger('memory-monitor');

function monitorMemory() {
  const usage = process.memoryUsage();
  const thresholdMB = 400;

  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);

  if (heapUsedMB > thresholdMB) {
    log.warn('High memory usage detected', {
      heapUsed: `${heapUsedMB}MB`,
      threshold: `${thresholdMB}MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`
    });

    // Trigger garbage collection if available
    if (global.gc) {
      log.info('Forcing garbage collection');
      global.gc();
    }
  }
}

// Check every 30 seconds
setInterval(monitorMemory, 30000);

module.exports = { monitorMemory };
```

**Expected Impact**: Prevent memory-related crashes

---

## 📈 Implementation Roadmap

### Phase 1: Quick Wins (1-2 days)
- [ ] Enable response compression
- [ ] Implement Redis cache for dashboard KPIs
- [ ] Add pagination to large result sets
- [ ] Offload WhatsApp messages to queue (already done)

### Phase 2: Database Optimization (3-5 days)
- [ ] Implement connection pooling
- [ ] Add covering indexes for common queries
- [ ] Optimize N+1 queries with joins
- [ ] Update materialized view refresh strategy

### Phase 3: Scalability (1 week)
- [ ] Deploy pm2 cluster mode
- [ ] Implement comprehensive caching strategy
- [ ] Add cache warming on deployment
- [ ] Set up memory monitoring

### Phase 4: Validation (2 days)
- [ ] Run Artillery load tests
- [ ] Analyze results with `performance/analyze-results.js`
- [ ] Verify targets met (P95 < 500ms, P99 < 2s)
- [ ] Document baseline vs optimized metrics

---

## 🔍 Monitoring & Validation

### Before/After Comparison

Run performance tests before and after each optimization phase:

```bash
# Baseline test
npm run perf:test
node performance/analyze-results.js performance/artillery-report.json

# Implement optimizations...

# Validation test
npm run perf:test
node performance/analyze-results.js performance/artillery-report.json
```

### Key Metrics to Track

| Metric | Baseline | Target | Actual | Status |
|--------|----------|--------|--------|--------|
| P95 Latency | TBD | <500ms | - | ⏳ |
| P99 Latency | TBD | <2s | - | ⏳ |
| Error Rate | TBD | <1% | - | ⏳ |
| Throughput | TBD | >50 req/s | - | ⏳ |
| Cache Hit Rate | 0% | >80% | - | ⏳ |

### Continuous Monitoring

Use Artillery in CI/CD pipeline to detect performance regressions:

```yaml
# .github/workflows/testing-pipeline.yml
performance-tests:
  runs-on: ubuntu-latest
  steps:
    - name: Run Performance Tests
      run: npm run perf:test
    
    - name: Analyze Results
      run: |
        node performance/analyze-results.js performance/artillery-report.json
        
    - name: Check Thresholds
      run: |
        # Fail if score < 80
        SCORE=$(grep "Score:" performance/analysis-*.md | awk '{print $2}' | cut -d'/' -f1)
        if [ "$SCORE" -lt 80 ]; then
          echo "Performance score $SCORE is below threshold (80)"
          exit 1
        fi
```

---

## 📚 Additional Resources

- [Artillery Documentation](https://www.artillery.io/docs)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Caching Strategies](https://redis.io/docs/manual/patterns/)
- [Express.js Production Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

## 🎯 Success Criteria

✅ **Performance Tests Pass**
- P95 latency < 500ms
- P99 latency < 2s
- Error rate < 1%
- Throughput > 50 req/s

✅ **User Experience Improved**
- Dashboard loads in < 1s
- Check-in completes in < 2s
- No timeout errors under load

✅ **System Stability**
- 99.9% uptime over 30 days
- No memory leaks
- Graceful degradation under spike load

---

**Status**: 📋 Optimization roadmap defined, ready for implementation  
**Next**: Execute Phase 1 quick wins and measure impact
