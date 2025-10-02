// PROMPT 21: n8n & WHATSAPP OPTIMIZATION - WORKFLOW OPTIMIZER
// n8n workflow analysis and optimization utilities

const logger = require('../../utils/logger').createLogger('workflow-optimizer');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// WORKFLOW PERFORMANCE ANALYZER
// ============================================

class WorkflowOptimizer {
  constructor() {
    this.metrics = {
      analyzed: 0,
      optimized: 0,
      issues: []
    };
  }
  
  // ============================================
  // ANALYZE WORKFLOW
  // ============================================
  
  async analyzeWorkflow(workflowPath) {
    try {
      const content = await fs.readFile(workflowPath, 'utf8');
      const workflow = JSON.parse(content);
      
      this.metrics.analyzed++;
      
      const analysis = {
        name: workflow.name || path.basename(workflowPath),
        path: workflowPath,
        nodeCount: workflow.nodes ? workflow.nodes.length : 0,
        issues: [],
        recommendations: [],
        score: 100
      };
      
      // Check for common performance issues
      this.checkNodeCount(workflow, analysis);
      this.checkWaitNodes(workflow, analysis);
      this.checkParallelExecution(workflow, analysis);
      this.checkErrorHandling(workflow, analysis);
      this.checkWebhookConfiguration(workflow, analysis);
      this.checkDataTransformation(workflow, analysis);
      
      logger.info('Workflow analyzed', {
        name: analysis.name,
        nodeCount: analysis.nodeCount,
        issuesFound: analysis.issues.length,
        score: analysis.score
      });
      
      return analysis;
    } catch (error) {
      logger.error('Failed to analyze workflow', {
        path: workflowPath,
        error: error.message
      });
      throw error;
    }
  }
  
  // ============================================
  // PERFORMANCE CHECKS
  // ============================================
  
  checkNodeCount(workflow, analysis) {
    if (analysis.nodeCount > 20) {
      analysis.issues.push({
        severity: 'warning',
        type: 'node_count',
        message: `High node count (${analysis.nodeCount}). Consider splitting into sub-workflows.`
      });
      analysis.recommendations.push('Split complex workflows into smaller, reusable sub-workflows');
      analysis.score -= 10;
    }
  }
  
  checkWaitNodes(workflow, analysis) {
    if (!workflow.nodes) return;
    
    const waitNodes = workflow.nodes.filter(node => 
      node.type === 'n8n-nodes-base.wait' || node.type === 'n8n-nodes-base.schedule'
    );
    
    if (waitNodes.length > 3) {
      analysis.issues.push({
        severity: 'warning',
        type: 'excessive_waits',
        message: `${waitNodes.length} wait/schedule nodes. May cause workflow delays.`
      });
      analysis.recommendations.push('Minimize wait nodes or use cron-triggered workflows');
      analysis.score -= 5;
    }
  }
  
  checkParallelExecution(workflow, analysis) {
    if (!workflow.nodes) return;
    
    const hasParallelExecution = workflow.nodes.some(node => 
      node.parameters && node.parameters.mode === 'parallel'
    );
    
    if (!hasParallelExecution && analysis.nodeCount > 5) {
      analysis.recommendations.push('Consider parallel execution for independent operations');
    }
  }
  
  checkErrorHandling(workflow, analysis) {
    if (!workflow.nodes) return;
    
    const errorHandlers = workflow.nodes.filter(node => 
      node.name && node.name.toLowerCase().includes('error')
    );
    
    if (errorHandlers.length === 0) {
      analysis.issues.push({
        severity: 'high',
        type: 'no_error_handling',
        message: 'No error handling nodes detected. Workflow may fail silently.'
      });
      analysis.recommendations.push('Add error handling nodes with notification/logging');
      analysis.score -= 20;
    }
  }
  
  checkWebhookConfiguration(workflow, analysis) {
    if (!workflow.nodes) return;
    
    const webhookNodes = workflow.nodes.filter(node => 
      node.type === 'n8n-nodes-base.webhook'
    );
    
    webhookNodes.forEach(webhook => {
      if (!webhook.parameters || !webhook.parameters.authentication) {
        analysis.issues.push({
          severity: 'critical',
          type: 'insecure_webhook',
          message: `Webhook "${webhook.name}" has no authentication configured.`
        });
        analysis.score -= 30;
      }
      
      if (!webhook.parameters || webhook.parameters.responseMode !== 'responseNode') {
        analysis.recommendations.push(`Webhook "${webhook.name}": Use responseNode for better control`);
      }
    });
  }
  
  checkDataTransformation(workflow, analysis) {
    if (!workflow.nodes) return;
    
    const functionNodes = workflow.nodes.filter(node => 
      node.type === 'n8n-nodes-base.function' || node.type === 'n8n-nodes-base.code'
    );
    
    functionNodes.forEach(fn => {
      const code = fn.parameters?.functionCode || '';
      
      // Check for synchronous loops (performance killer)
      if (code.includes('for') || code.includes('while')) {
        analysis.issues.push({
          severity: 'warning',
          type: 'sync_loop',
          message: `Function node "${fn.name}" contains loops. May slow workflow.`
        });
        analysis.recommendations.push(`Node "${fn.name}": Use batch operations instead of loops`);
        analysis.score -= 10;
      }
      
      // Check for console.log (debugging left in)
      if (code.includes('console.log')) {
        analysis.issues.push({
          severity: 'info',
          type: 'debug_code',
          message: `Function node "${fn.name}" contains console.log statements.`
        });
      }
    });
  }
  
  // ============================================
  // OPTIMIZE WORKFLOW
  // ============================================
  
  async optimizeWorkflow(workflowPath, analysis) {
    try {
      const content = await fs.readFile(workflowPath, 'utf8');
      const workflow = JSON.parse(content);
      
      let optimized = false;
      
      // Apply automatic optimizations
      if (workflow.settings) {
        // Enable execution order optimization
        if (!workflow.settings.executionOrder) {
          workflow.settings.executionOrder = 'v1';
          optimized = true;
        }
        
        // Enable timeout
        if (!workflow.settings.executionTimeout) {
          workflow.settings.executionTimeout = 300; // 5 minutes
          optimized = true;
        }
      } else {
        workflow.settings = {
          executionOrder: 'v1',
          executionTimeout: 300
        };
        optimized = true;
      }
      
      if (optimized) {
        // Backup original
        const backupPath = workflowPath.replace('.json', '.backup.json');
        await fs.writeFile(backupPath, content);
        
        // Write optimized version
        await fs.writeFile(workflowPath, JSON.stringify(workflow, null, 2));
        
        this.metrics.optimized++;
        
        logger.info('Workflow optimized', {
          name: workflow.name,
          path: workflowPath,
          backupPath
        });
        
        return { success: true, optimized: true, backupPath };
      } else {
        logger.info('Workflow already optimized', {
          name: workflow.name
        });
        
        return { success: true, optimized: false };
      }
    } catch (error) {
      logger.error('Failed to optimize workflow', {
        path: workflowPath,
        error: error.message
      });
      throw error;
    }
  }
  
  // ============================================
  // BATCH ANALYSIS
  // ============================================
  
  async analyzeAllWorkflows(directory) {
    try {
      const files = await fs.readdir(directory);
      const workflowFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.backup.json'));
      
      const results = [];
      
      for (const file of workflowFiles) {
        const filePath = path.join(directory, file);
        const analysis = await this.analyzeWorkflow(filePath);
        results.push(analysis);
      }
      
      // Generate summary report
      const summary = this.generateSummaryReport(results);
      
      logger.info('Batch workflow analysis complete', {
        totalWorkflows: results.length,
        avgScore: summary.avgScore,
        criticalIssues: summary.criticalIssues
      });
      
      return { results, summary };
    } catch (error) {
      logger.error('Batch analysis failed', {
        directory,
        error: error.message
      });
      throw error;
    }
  }
  
  // ============================================
  // REPORTING
  // ============================================
  
  generateSummaryReport(analyses) {
    const summary = {
      totalWorkflows: analyses.length,
      avgScore: 0,
      criticalIssues: 0,
      warningIssues: 0,
      infoIssues: 0,
      topRecommendations: {},
      worstPerformers: []
    };
    
    let totalScore = 0;
    
    analyses.forEach(analysis => {
      totalScore += analysis.score;
      
      analysis.issues.forEach(issue => {
        if (issue.severity === 'critical') summary.criticalIssues++;
        else if (issue.severity === 'high' || issue.severity === 'warning') summary.warningIssues++;
        else summary.infoIssues++;
      });
      
      analysis.recommendations.forEach(rec => {
        summary.topRecommendations[rec] = (summary.topRecommendations[rec] || 0) + 1;
      });
    });
    
    summary.avgScore = (totalScore / analyses.length).toFixed(2);
    
    summary.worstPerformers = analyses
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(a => ({ name: a.name, score: a.score, issues: a.issues.length }));
    
    summary.topRecommendations = Object.entries(summary.topRecommendations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([rec, count]) => ({ recommendation: rec, occurrences: count }));
    
    return summary;
  }
  
  getMetrics() {
    return this.metrics;
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  WorkflowOptimizer
};
