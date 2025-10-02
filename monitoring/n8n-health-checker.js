// PROMPT 21: n8n & WHATSAPP OPTIMIZATION - N8N HEALTH CHECKER
// Comprehensive health monitoring for n8n workflows and API

const axios = require('axios');
const logger = require('../utils/logger').createLogger('n8n-health-checker');
const { n8nBreaker } = require('../whatsapp/client/circuit-breaker');

// ============================================
// CONFIGURATION
// ============================================

const N8N_CONFIG = {
  baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
  apiKey: process.env.N8N_API_KEY,
  healthCheckInterval: parseInt(process.env.N8N_HEALTH_CHECK_INTERVAL) || 60000, // 1 min
  timeout: 10000
};

// ============================================
// N8N HEALTH CHECKER CLASS
// ============================================

class N8nHealthChecker {
  constructor() {
    this.lastCheck = null;
    this.healthy = true;
    this.metrics = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      avgResponseTime: 0,
      uptime: 0,
      lastError: null
    };
    
    this.workflowStats = {
      total: 0,
      active: 0,
      inactive: 0,
      failing: []
    };
  }
  
  // ============================================
  // HEALTH CHECK
  // ============================================
  
  async check() {
    this.metrics.totalChecks++;
    const startTime = Date.now();
    
    try {
      // Test API connectivity
      const apiHealthy = await this.checkAPIHealth();
      
      // Get workflow stats
      if (apiHealthy) {
        await this.checkWorkflows();
      }
      
      const responseTime = Date.now() - startTime;
      this.updateMetrics(true, responseTime);
      
      this.healthy = true;
      this.lastCheck = new Date().toISOString();
      
      logger.info('n8n health check passed', {
        responseTimeMs: responseTime,
        workflowStats: this.workflowStats
      });
      
      return {
        healthy: true,
        responseTime,
        workflowStats: this.workflowStats,
        metrics: this.metrics
      };
      
    } catch (error) {
      this.updateMetrics(false, null);
      this.healthy = false;
      this.metrics.lastError = error.message;
      
      logger.error('n8n health check failed', {
        error: error.message,
        stack: error.stack
      });
      
      return {
        healthy: false,
        error: error.message,
        metrics: this.metrics
      };
    }
  }
  
  // ============================================
  // API HEALTH
  // ============================================
  
  async checkAPIHealth() {
    try {
      const response = await n8nBreaker.execute(async () => {
        return axios.get(`${N8N_CONFIG.baseUrl}/healthz`, {
          timeout: N8N_CONFIG.timeout,
          headers: N8N_CONFIG.apiKey ? {
            'X-N8N-API-KEY': N8N_CONFIG.apiKey
          } : {}
        });
      });
      
      return response.status === 200;
    } catch (error) {
      logger.error('n8n API health check failed', {
        error: error.message
      });
      return false;
    }
  }
  
  // ============================================
  // WORKFLOW STATS
  // ============================================
  
  async checkWorkflows() {
    try {
      const response = await n8nBreaker.execute(async () => {
        return axios.get(`${N8N_CONFIG.baseUrl}/api/v1/workflows`, {
          timeout: N8N_CONFIG.timeout,
          headers: {
            'X-N8N-API-KEY': N8N_CONFIG.apiKey
          }
        });
      });
      
      const workflows = response.data.data || [];
      
      this.workflowStats.total = workflows.length;
      this.workflowStats.active = workflows.filter(w => w.active).length;
      this.workflowStats.inactive = workflows.filter(w => !w.active).length;
      
      // Check for failing workflows (optional - requires execution history)
      await this.checkFailingWorkflows(workflows);
      
    } catch (error) {
      logger.error('Failed to fetch workflow stats', {
        error: error.message
      });
    }
  }
  
  async checkFailingWorkflows(workflows) {
    // This would require checking execution history via n8n API
    // For now, just reset the list
    this.workflowStats.failing = [];
    
    // In production, query execution history:
    // GET /api/v1/executions?workflowId=X&status=error&limit=10
  }
  
  // ============================================
  // WORKFLOW EXECUTION STATUS
  // ============================================
  
  async getWorkflowExecutionStatus(workflowId, limit = 10) {
    try {
      const response = await n8nBreaker.execute(async () => {
        return axios.get(`${N8N_CONFIG.baseUrl}/api/v1/executions`, {
          params: {
            workflowId,
            limit
          },
          timeout: N8N_CONFIG.timeout,
          headers: {
            'X-N8N-API-KEY': N8N_CONFIG.apiKey
          }
        });
      });
      
      const executions = response.data.data || [];
      
      const stats = {
        total: executions.length,
        success: executions.filter(e => e.finished && !e.stoppedAt).length,
        error: executions.filter(e => e.stoppedAt).length,
        running: executions.filter(e => !e.finished && !e.stoppedAt).length,
        recentErrors: executions
          .filter(e => e.stoppedAt)
          .slice(0, 3)
          .map(e => ({
            id: e.id,
            startedAt: e.startedAt,
            stoppedAt: e.stoppedAt,
            error: e.data?.resultData?.error?.message || 'Unknown error'
          }))
      };
      
      return stats;
      
    } catch (error) {
      logger.error('Failed to get workflow execution status', {
        workflowId,
        error: error.message
      });
      return null;
    }
  }
  
  // ============================================
  // TRIGGER WORKFLOW
  // ============================================
  
  async triggerWorkflow(workflowId, data = {}) {
    try {
      const response = await n8nBreaker.execute(async () => {
        return axios.post(
          `${N8N_CONFIG.baseUrl}/api/v1/workflows/${workflowId}/execute`,
          data,
          {
            timeout: N8N_CONFIG.timeout,
            headers: {
              'X-N8N-API-KEY': N8N_CONFIG.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
      });
      
      logger.info('Workflow triggered successfully', {
        workflowId,
        executionId: response.data.data?.executionId
      });
      
      return {
        success: true,
        executionId: response.data.data?.executionId,
        data: response.data.data
      };
      
    } catch (error) {
      logger.error('Failed to trigger workflow', {
        workflowId,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // ============================================
  // METRICS UPDATE
  // ============================================
  
  updateMetrics(success, responseTime) {
    if (success) {
      this.metrics.successfulChecks++;
      
      // Update average response time
      const totalSuccessful = this.metrics.successfulChecks;
      this.metrics.avgResponseTime = 
        ((this.metrics.avgResponseTime * (totalSuccessful - 1)) + responseTime) / totalSuccessful;
      
    } else {
      this.metrics.failedChecks++;
    }
    
    // Calculate uptime percentage
    this.metrics.uptime = 
      ((this.metrics.successfulChecks / this.metrics.totalChecks) * 100).toFixed(2);
  }
  
  // ============================================
  // STATUS REPORT
  // ============================================
  
  getStatus() {
    return {
      healthy: this.healthy,
      lastCheck: this.lastCheck,
      metrics: {
        ...this.metrics,
        avgResponseTimeMs: Math.round(this.metrics.avgResponseTime),
        uptimePercentage: this.metrics.uptime + '%'
      },
      workflowStats: this.workflowStats,
      config: {
        baseUrl: N8N_CONFIG.baseUrl,
        healthCheckInterval: N8N_CONFIG.healthCheckInterval
      }
    };
  }
  
  isHealthy() {
    return this.healthy;
  }
  
  // ============================================
  // START/STOP MONITORING
  // ============================================
  
  startMonitoring() {
    if (this.monitoringInterval) {
      logger.warn('Monitoring already started');
      return;
    }
    
    this.monitoringInterval = setInterval(() => {
      this.check().catch(error => {
        logger.error('Health check interval error', { error: error.message });
      });
    }, N8N_CONFIG.healthCheckInterval);
    
    logger.info('n8n health monitoring started', {
      intervalMs: N8N_CONFIG.healthCheckInterval
    });
    
    // Run initial check
    this.check();
  }
  
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      logger.info('n8n health monitoring stopped');
    }
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

const n8nHealthChecker = new N8nHealthChecker();

// ============================================
// EXPORTS
// ============================================

module.exports = {
  N8nHealthChecker,
  n8nHealthChecker
};
