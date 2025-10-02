// PROMPT 20: DATABASE OPTIMIZATION - REDIS CACHE SERVICE
// Cache layer con TTL strategies para reducir carga en PostgreSQL

const Redis = require('ioredis');
const logger = require('../utils/logger').createLogger('cache-service');
const { AppError, ErrorTypes } = require('../utils/error-handler');

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

// ============================================
// TTL STRATEGIES (Time-To-Live)
// ============================================

const TTL_STRATEGIES = {
  // Real-time data (1 minuto)
  REAL_TIME: 60,
  
  // Frequently accessed (5 minutos)
  HOT: 300,
  
  // Normal access (15 minutos)
  WARM: 900,
  
  // Rarely changes (1 hora)
  COLD: 3600,
  
  // Very stable (6 horas)
  FROZEN: 21600,
  
  // Daily data (24 horas)
  DAILY: 86400
};

// ============================================
// CACHE KEY PATTERNS
// ============================================

const CACHE_KEYS = {
  // Member data
  MEMBER_DASHBOARD: (memberId) => `member:dashboard:${memberId}`,
  MEMBER_TIER: (memberId) => `member:tier:${memberId}`,
  MEMBER_ENGAGEMENT: (memberId) => `member:engagement:${memberId}`,
  
  // Class data
  CLASS_AVAILABILITY: (date) => `class:availability:${date}`,
  CLASS_SCHEDULE: (week) => `class:schedule:${week}`,
  CLASS_PERFORMANCE: (classId) => `class:performance:${classId}`,
  
  // KPIs & Analytics
  DAILY_KPIS: (date) => `kpis:daily:${date}`,
  WEEKLY_KPIS: (week) => `kpis:weekly:${week}`,
  INSTRUCTOR_STATS: (instructor) => `instructor:stats:${instructor}`,
  
  // Recommendations
  CLASS_RECOMMENDATIONS: (memberId) => `recommendations:classes:${memberId}`,
  
  // Lists
  ACTIVE_MEMBERS: 'list:members:active',
  VALLEY_CLASSES: 'list:classes:valley',
  UPGRADE_CANDIDATES: 'list:members:upgrade-candidates'
};

// ============================================
// CORE CACHE FUNCTIONS
// ============================================

/**
 * Get cached data with JSON parsing
 */
async function get(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Cache GET error', { key, error: error.message });
    return null; // Fail silently, fetch from DB
  }
}

/**
 * Set cached data with TTL
 */
async function set(key, value, ttl = TTL_STRATEGIES.WARM) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
    logger.debug('Cache SET', { key, ttl });
    return true;
  } catch (error) {
    logger.error('Cache SET error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete cached data
 */
async function del(key) {
  try {
    await redis.del(key);
    logger.debug('Cache DEL', { key });
    return true;
  } catch (error) {
    logger.error('Cache DEL error', { key, error: error.message });
    return false;
  }
}

/**
 * Delete multiple keys by pattern
 */
async function delPattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Cache pattern deleted', { pattern, count: keys.length });
    }
    return keys.length;
  } catch (error) {
    logger.error('Cache DEL pattern error', { pattern, error: error.message });
    return 0;
  }
}

/**
 * Get or compute cached value
 */
async function getOrCompute(key, computeFn, ttl = TTL_STRATEGIES.WARM) {
  try {
    // Try cache first
    const cached = await get(key);
    if (cached !== null) {
      logger.debug('Cache HIT', { key });
      return cached;
    }
    
    // Cache miss - compute value
    logger.debug('Cache MISS', { key });
    const value = await computeFn();
    
    // Store in cache
    await set(key, value, ttl);
    
    return value;
  } catch (error) {
    logger.error('Cache getOrCompute error', { key, error: error.message });
    throw error;
  }
}

// ============================================
// DOMAIN-SPECIFIC CACHE FUNCTIONS
// ============================================

/**
 * Cache member dashboard data
 */
async function cacheMemberDashboard(memberId, supabase) {
  const key = CACHE_KEYS.MEMBER_DASHBOARD(memberId);
  
  return getOrCompute(key, async () => {
    const { data, error } = await supabase.rpc('get_member_dashboard', {
      p_member_id: memberId
    });
    
    if (error) throw error;
    return data;
  }, TTL_STRATEGIES.HOT); // 5 min (frequently accessed)
}

/**
 * Cache member tier with invalidation on upgrade/downgrade
 */
async function cacheMemberTier(memberId, supabase) {
  const key = CACHE_KEYS.MEMBER_TIER(memberId);
  
  return getOrCompute(key, async () => {
    const { data, error } = await supabase.rpc('get_member_current_tier', {
      p_member_id: memberId
    });
    
    if (error) throw error;
    return data;
  }, TTL_STRATEGIES.FROZEN); // 6 hours (rarely changes)
}

/**
 * Cache class availability for date
 */
async function cacheClassAvailability(date, supabase) {
  const key = CACHE_KEYS.CLASS_AVAILABILITY(date);
  
  return getOrCompute(key, async () => {
    const { data, error } = await supabase.rpc('get_classes_availability', {
      p_start_date: date,
      p_end_date: date
    });
    
    if (error) throw error;
    return data;
  }, TTL_STRATEGIES.REAL_TIME); // 1 min (real-time availability)
}

/**
 * Cache daily KPIs
 */
async function cacheDailyKPIs(date, supabase) {
  const key = CACHE_KEYS.DAILY_KPIS(date);
  
  return getOrCompute(key, async () => {
    const { data, error } = await supabase
      .from('v_daily_kpis')
      .select('*')
      .eq('date', date)
      .single();
    
    if (error) throw error;
    return data;
  }, TTL_STRATEGIES.COLD); // 1 hour (aggregated data)
}

/**
 * Cache class recommendations
 */
async function cacheClassRecommendations(memberId, supabase) {
  const key = CACHE_KEYS.CLASS_RECOMMENDATIONS(memberId);
  
  return getOrCompute(key, async () => {
    const { data, error } = await supabase.rpc('get_class_recommendations', {
      p_member_id: memberId,
      p_limit: 5
    });
    
    if (error) throw error;
    return data;
  }, TTL_STRATEGIES.WARM); // 15 min (personalized data)
}

// ============================================
// CACHE INVALIDATION STRATEGIES
// ============================================

/**
 * Invalidate member caches on updates
 */
async function invalidateMemberCaches(memberId) {
  await Promise.all([
    del(CACHE_KEYS.MEMBER_DASHBOARD(memberId)),
    del(CACHE_KEYS.MEMBER_TIER(memberId)),
    del(CACHE_KEYS.MEMBER_ENGAGEMENT(memberId)),
    del(CACHE_KEYS.CLASS_RECOMMENDATIONS(memberId))
  ]);
  
  logger.info('Member caches invalidated', { memberId });
}

/**
 * Invalidate class caches on updates
 */
async function invalidateClassCaches(classId = null) {
  if (classId) {
    await del(CACHE_KEYS.CLASS_PERFORMANCE(classId));
  }
  
  // Invalidate all availability caches
  await delPattern('class:availability:*');
  await delPattern('class:schedule:*');
  
  logger.info('Class caches invalidated', { classId });
}

/**
 * Invalidate KPI caches (called after check-ins, payments)
 */
async function invalidateKPICaches() {
  await Promise.all([
    delPattern('kpis:daily:*'),
    delPattern('kpis:weekly:*'),
    delPattern('instructor:stats:*')
  ]);
  
  logger.info('KPI caches invalidated');
}

// ============================================
// CACHE WARMING (Pre-populate hot data)
// ============================================

/**
 * Warm cache with today's data
 */
async function warmTodayCache(supabase) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    await Promise.all([
      cacheClassAvailability(today, supabase),
      cacheDailyKPIs(today, supabase)
    ]);
    
    logger.info('Cache warmed for today', { date: today });
  } catch (error) {
    logger.error('Cache warming failed', { error: error.message });
  }
}

// ============================================
// CACHE STATISTICS
// ============================================

/**
 * Get cache hit/miss statistics
 */
async function getCacheStats() {
  try {
    const info = await redis.info('stats');
    const lines = info.split('\r\n');
    
    const stats = {};
    lines.forEach(line => {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    });
    
    return {
      hits: parseInt(stats.keyspace_hits || 0),
      misses: parseInt(stats.keyspace_misses || 0),
      hit_rate: stats.keyspace_hits && stats.keyspace_misses
        ? ((parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses))) * 100).toFixed(2) + '%'
        : 'N/A'
    };
  } catch (error) {
    logger.error('Failed to get cache stats', { error: error.message });
    return null;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  redis,
  TTL_STRATEGIES,
  CACHE_KEYS,
  
  // Core functions
  get,
  set,
  del,
  delPattern,
  getOrCompute,
  
  // Domain functions
  cacheMemberDashboard,
  cacheMemberTier,
  cacheClassAvailability,
  cacheDailyKPIs,
  cacheClassRecommendations,
  
  // Invalidation
  invalidateMemberCaches,
  invalidateClassCaches,
  invalidateKPICaches,
  
  // Warming & Stats
  warmTodayCache,
  getCacheStats
};
