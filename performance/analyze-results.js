#!/usr/bin/env node

/**
 * Performance Test Analyzer & Optimizer
 * Analiza resultados de Artillery y proporciona recomendaciones
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor(resultsPath = 'performance-reports/artillery-results.json') {
    this.resultsPath = resultsPath;
    this.results = this.loadResults();
    this.recommendations = [];
    this.optimizations = {};
  }

  loadResults() {
    if (!fs.existsSync(this.resultsPath)) {
      console.error(`❌ Results file not found: ${this.resultsPath}`);
      process.exit(1);
    }

    try {
      const data = fs.readFileSync(this.resultsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`❌ Failed to parse results: ${error.message}`);
      process.exit(1);
    }
  }

  analyze() {
    console.log('🔍 Analyzing performance results...\n');

    this.analyzeLatency();
    this.analyzeErrorRates();
    this.analyzeThroughput();
    this.analyzeEndpoints();
    this.generateRecommendations();
  }

  analyzeLatency() {
    console.log('⏱️  LATENCY ANALYSIS');
    console.log('─'.repeat(50));

    const scenarios = this.results.aggregate;

    if (scenarios.latency) {
      const latency = scenarios.latency;
      console.log(`Min:  ${latency.min}ms`);
      console.log(`Max:  ${latency.max}ms`);
      console.log(`Mean: ${latency.mean}ms`);
      console.log(`P50:  ${latency.p50}ms`);
      console.log(`P95:  ${latency.p95}ms`);
      console.log(`P99:  ${latency.p99}ms`);

      // Checks
      if (latency.p95 > 500) {
        this.recommendations.push({
          severity: 'HIGH',
          category: 'Latency',
          message: `P95 latency (${latency.p95}ms) exceeds target (500ms)`,
          solution: 'Implement caching, optimize database queries, or scale horizontally'
        });
      }

      if (latency.p99 > 2000) {
        this.recommendations.push({
          severity: 'CRITICAL',
          category: 'Latency',
          message: `P99 latency (${latency.p99}ms) exceeds target (2000ms)`,
          solution: 'Add database indexes, reduce N+1 queries, implement CDN'
        });
      }
    }

    console.log('\n');
  }

  analyzeErrorRates() {
    console.log('❌ ERROR RATE ANALYSIS');
    console.log('─'.repeat(50));

    const scenarios = this.results.aggregate;

    if (scenarios.codes) {
      const totalRequests = scenarios.codes.reduce((sum, [_, count]) => sum + count, 0);
      const errorRequests = scenarios.codes
        .filter(([code, _]) => code >= 400)
        .reduce((sum, [_, count]) => sum + count, 0);

      const errorRate = (errorRequests / totalRequests) * 100;

      console.log(`Total Requests: ${totalRequests}`);
      console.log(`Errors (4xx, 5xx): ${errorRequests}`);
      console.log(`Error Rate: ${errorRate.toFixed(2)}%`);

      // Response codes breakdown
      console.log('\nResponse Codes:');
      scenarios.codes.forEach(([code, count]) => {
        const percentage = ((count / totalRequests) * 100).toFixed(1);
        console.log(`  ${code}: ${count} (${percentage}%)`);
      });

      // Checks
      if (errorRate > 1) {
        this.recommendations.push({
          severity: 'HIGH',
          category: 'Errors',
          message: `Error rate (${errorRate.toFixed(2)}%) exceeds target (1%)`,
          solution: 'Review application logs, check database connectivity, validate request payloads'
        });
      }

      if (scenarios.codes.some(([code]) => code >= 500)) {
        this.recommendations.push({
          severity: 'CRITICAL',
          category: 'Errors',
          message: 'Server errors (5xx) detected during load test',
          solution: 'Investigate server errors, increase resource limits, or enable auto-scaling'
        });
      }
    }

    console.log('\n');
  }

  analyzeThroughput() {
    console.log('📊 THROUGHPUT ANALYSIS');
    console.log('─'.repeat(50));

    const scenarios = this.results.aggregate;

    if (scenarios.rps) {
      const rps = scenarios.rps;
      console.log(`Mean RPS: ${rps.mean.toFixed(2)}`);
      console.log(`Max RPS: ${rps.max.toFixed(2)}`);
      console.log(`Requested RPS: ${rps.count / (scenarios.time || 1)}`);

      if (rps.mean < 100) {
        this.recommendations.push({
          severity: 'MEDIUM',
          category: 'Throughput',
          message: `Mean RPS (${rps.mean.toFixed(2)}) is lower than expected`,
          solution: 'Verify network connectivity, check for connection timeouts, or scale load generators'
        });
      }
    }

    console.log('\n');
  }

  analyzeEndpoints() {
    console.log('🔗 ENDPOINT ANALYSIS');
    console.log('─'.repeat(50));

    if (this.results.scenarios) {
      this.results.scenarios.forEach(scenario => {
        console.log(`\n${scenario.name}:`);

        if (scenario.latency) {
          const lat = scenario.latency;
          console.log(`  Latency - P95: ${lat.p95}ms, P99: ${lat.p99}ms`);

          if (lat.p95 > 500) {
            this.recommendations.push({
              severity: 'HIGH',
              category: 'Endpoint Performance',
              message: `${scenario.name}: P95 latency (${lat.p95}ms) exceeds 500ms`,
              solution: `Optimize ${scenario.name} endpoint - check database queries, add caching`
            });
          }
        }

        if (scenario.codes) {
          const totalReqs = scenario.codes.reduce((sum, [_, count]) => sum + count, 0);
          const errors = scenario.codes
            .filter(([code]) => code >= 400)
            .reduce((sum, [_, count]) => sum + count, 0);

          if (totalReqs > 0) {
            const errorRate = (errors / totalReqs) * 100;
            console.log(`  Errors: ${errors}/${totalReqs} (${errorRate.toFixed(1)}%)`);
          }
        }
      });
    }

    console.log('\n');
  }

  generateRecommendations() {
    console.log('💡 OPTIMIZATION RECOMMENDATIONS');
    console.log('═'.repeat(50));

    if (this.recommendations.length === 0) {
      console.log('✅ No issues detected! Performance is optimal.');
      return;
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    this.recommendations.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    this.recommendations.forEach((rec, idx) => {
      const icons = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢' };
      console.log(`\n${idx + 1}. ${icons[rec.severity]} [${rec.severity}] ${rec.category}`);
      console.log(`   Problem: ${rec.message}`);
      console.log(`   Solution: ${rec.solution}`);
    });

    // Additional optimization tips
    this.generateOptimizationTips();
  }

  generateOptimizationTips() {
    console.log('\n\n🚀 GENERAL OPTIMIZATION TIPS');
    console.log('═'.repeat(50));

    const tips = [
      {
        title: 'Database Optimization',
        items: [
          'Add indexes on frequently queried columns (telefono, codigo_qr)',
          'Use connection pooling (Redis + Supabase)',
          'Implement query result caching',
          'Monitor slow queries with EXPLAIN ANALYZE'
        ]
      },
      {
        title: 'API Response Optimization',
        items: [
          'Implement pagination for list endpoints',
          'Use gzip compression for responses',
          'Reduce JSON payload size with field selection',
          'Add ETag support for caching'
        ]
      },
      {
        title: 'Caching Strategy',
        items: [
          'Cache dashboard KPIs (5-minute TTL)',
          'Cache member lookup results (10-minute TTL)',
          'Use Redis for session management',
          'Implement browser-side caching with Service Workers'
        ]
      },
      {
        title: 'Infrastructure Scaling',
        items: [
          'Enable horizontal scaling with load balancer',
          'Use CDN for static assets',
          'Implement auto-scaling based on CPU/memory',
          'Consider database replica for read-heavy queries'
        ]
      }
    ];

    tips.forEach(tip => {
      console.log(`\n${tip.title}:`);
      tip.items.forEach(item => console.log(`  • ${item}`));
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateSummary(),
      recommendations: this.recommendations,
      detailed: this.results
    };

    const reportPath = 'performance-reports/performance-analysis.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Report saved to: ${reportPath}`);
  }

  generateSummary() {
    const scenarios = this.results.aggregate;

    return {
      totalRequests: scenarios.codes?.reduce((sum, [_, count]) => sum + count, 0) || 0,
      successRate: `${(100 - ((scenarios.codes?.filter(([c]) => c >= 400).reduce((s, [_, cnt]) => s + cnt, 0) || 0) / (scenarios.codes?.reduce((s, [_, cnt]) => s + cnt, 0) || 1)) * 100).toFixed(2)}%`,
      p95Latency: `${scenarios.latency?.p95 || 0}ms`,
      p99Latency: `${scenarios.latency?.p99 || 0}ms`,
      meanLatency: `${scenarios.latency?.mean || 0}ms`,
      recommendationCount: this.recommendations.length,
      status: this.recommendations.length === 0 ? 'PASS' : (
        this.recommendations.some(r => r.severity === 'CRITICAL') ? 'FAIL' : 'WARN'
      )
    };
  }
}

// Main execution
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer(
    process.argv[2] || 'performance-reports/artillery-results.json'
  );

  analyzer.analyze();
  analyzer.generateReport();

  // Exit with error code if CRITICAL issues found
  if (analyzer.recommendations.some(r => r.severity === 'CRITICAL')) {
    process.exit(1);
  }
}

module.exports = PerformanceAnalyzer;
