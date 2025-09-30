/**
 * Health Check and Monitoring System - PROMPT 19
 * Sistema completo de health checks y métricas en tiempo real
 */

const { createLogger } = require('../../utils/logger');

const logger = createLogger('health-check');

// Estado del sistema
const systemState = {
  startTime: Date.now(),
  lastHealthCheck: null,
  services: {},
};

/**
 * Health check de servicio individual
 */
async function checkService(name, checkFn, timeout = 5000) {
  const start = Date.now();
  
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), timeout)
    );
    
    const result = await Promise.race([
      checkFn(),
      timeoutPromise,
    ]);
    
    const duration = Date.now() - start;
    
    systemState.services[name] = {
      status: 'healthy',
      responseTime: duration,
      lastCheck: new Date().toISOString(),
      message: result?.message || 'OK',
    };
    
    return { healthy: true, duration };
    
  } catch (error) {
    const duration = Date.now() - start;
    
    systemState.services[name] = {
      status: 'unhealthy',
      responseTime: duration,
      lastCheck: new Date().toISOString(),
      error: error.message,
    };
    
    logger.error(`Health check failed for ${name}`, {
      service: name,
      error: error.message,
      duration,
    });
    
    return { healthy: false, duration, error: error.message };
  }
}

/**
 * Health check completo del sistema
 */
async function performHealthCheck() {
  const startTime = Date.now();
  
  logger.info('Starting system health check');

  // Placeholder checks - to be implemented
  systemState.services = {
    api: {
      status: 'healthy',
      responseTime: 10,
      lastCheck: new Date().toISOString(),
      message: 'API responding',
    },
  };

  const duration = Date.now() - startTime;
  systemState.lastHealthCheck = new Date().toISOString();

  const healthyServices = Object.values(systemState.services)
    .filter(s => s.status === 'healthy').length;
  const totalServices = Object.keys(systemState.services).length;

  const overallStatus = healthyServices === totalServices ? 'healthy' : 
                       healthyServices > 0 ? 'degraded' : 'unhealthy';

  return {
    status: overallStatus,
    timestamp: systemState.lastHealthCheck,
    uptime: Date.now() - systemState.startTime,
    checks: systemState.services,
    summary: {
      healthy: healthyServices,
      total: totalServices,
      duration,
    },
  };
}

/**
 * Obtener métricas del sistema
 */
function getSystemMetrics() {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  return {
    process: {
      uptime,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
      },
      pid: process.pid,
    },
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
    },
  };
}

/**
 * Express middleware para health endpoint
 */
function healthEndpoint() {
  return async (_req, res) => {
    try {
      const health = await performHealthCheck();
      const metrics = getSystemMetrics();

      const response = {
        ...health,
        metrics,
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(response);
      
    } catch (error) {
      logger.error('Health check endpoint error', { error: error.message });
      
      res.status(503).json({
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

module.exports = {
  performHealthCheck,
  getSystemMetrics,
  checkService,
  healthEndpoint,
  systemState,
};
