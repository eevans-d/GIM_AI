#!/usr/bin/env node
/**
 * GIM_AI - Performance Benchmark
 * Ejecuta pruebas de performance y genera baselines
 * 
 * Usage: node scripts/qa/performance-benchmark.js [--endpoint=url]
 * Output: qa-reports/performance-benchmark.json
 */

const fs = require('fs').promises;
const path = require('path');
const http = require('http');
const { performance } = require('perf_hooks');

const CONFIG = {
  projectRoot: path.join(__dirname, '../..'),
  outputDir: path.join(__dirname, '../../qa-reports'),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  iterations: 100,
  concurrency: 10,
  thresholds: {
    excellent: 100,
    good: 200,
    acceptable: 500
  }
};

// Utilidades
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Realiza una petición HTTP y mide el tiempo
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    
    const req = http.request(url, options, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          duration,
          size: data.length,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (error) => {
      const endTime = performance.now();
      reject({
        error: error.message,
        duration: endTime - startTime
      });
    });

    req.end();
  });
}

/**
 * Ejecuta múltiples requests y calcula estadísticas
 */
async function benchmarkEndpoint(name, url, options = {}) {
  console.log(`\n📊 Benchmarking ${name}...`);
  
  const results = [];
  const errors = [];
  
  // Warm-up
  try {
    await makeRequest(url, options);
  } catch (e) {
    console.log(`⚠️  Warm-up falló para ${name}`);
  }

  // Ejecutar benchmark
  const startTime = Date.now();
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    try {
      const result = await makeRequest(url, options);
      results.push(result);
      
      if (!result.success) {
        errors.push({ iteration: i, statusCode: result.statusCode });
      }
    } catch (error) {
      errors.push({ iteration: i, error: error.error || error.message });
    }
    
    // Mostrar progreso cada 20 iteraciones
    if ((i + 1) % 20 === 0) {
      process.stdout.write(`  Progress: ${i + 1}/${CONFIG.iterations}\r`);
    }
  }
  
  const totalTime = Date.now() - startTime;
  
  // Calcular estadísticas
  const durations = results.map(r => r.duration);
  durations.sort((a, b) => a - b);
  
  const stats = {
    name,
    url,
    iterations: CONFIG.iterations,
    successful: results.length,
    failed: errors.length,
    errorRate: (errors.length / CONFIG.iterations * 100).toFixed(2) + '%',
    totalTime: totalTime,
    avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
    minDuration: durations[0] || 0,
    maxDuration: durations[durations.length - 1] || 0,
    p50: durations[Math.floor(durations.length * 0.5)] || 0,
    p95: durations[Math.floor(durations.length * 0.95)] || 0,
    p99: durations[Math.floor(durations.length * 0.99)] || 0,
    throughput: (results.length / (totalTime / 1000)).toFixed(2) + ' req/s',
    errors: errors.slice(0, 5) // Primeros 5 errores
  };

  // Evaluar contra thresholds
  if (stats.p95 <= CONFIG.thresholds.excellent) {
    stats.grade = '🏆 EXCELENTE';
  } else if (stats.p95 <= CONFIG.thresholds.good) {
    stats.grade = '✅ BUENO';
  } else if (stats.p95 <= CONFIG.thresholds.acceptable) {
    stats.grade = '⚠️ ACEPTABLE';
  } else {
    stats.grade = '❌ NECESITA MEJORA';
  }

  console.log(`\n  ✓ ${name}: P95=${stats.p95.toFixed(0)}ms ${stats.grade}`);
  
  return stats;
}

/**
 * Simula carga concurrente
 */
async function loadTest(name, url, concurrency = 10, duration = 5000) {
  console.log(`\n🔥 Load test ${name} (${concurrency} concurrent users, ${duration}ms)...`);
  
  const results = [];
  const startTime = Date.now();
  let completed = 0;
  
  const makeRequests = async () => {
    while (Date.now() - startTime < duration) {
      try {
        const result = await makeRequest(url);
        results.push(result);
        completed++;
      } catch (error) {
        results.push({ error: true, duration: 0 });
      }
    }
  };

  // Lanzar workers concurrentes
  const workers = Array(concurrency).fill(0).map(() => makeRequests());
  await Promise.all(workers);
  
  const totalTime = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  const stats = {
    name,
    concurrency,
    duration: totalTime,
    totalRequests: results.length,
    successful,
    failed,
    errorRate: (failed / results.length * 100).toFixed(2) + '%',
    throughput: (results.length / (totalTime / 1000)).toFixed(2) + ' req/s',
    avgResponseTime: results.reduce((sum, r) => sum + (r.duration || 0), 0) / results.length
  };

  console.log(`  ✓ Throughput: ${stats.throughput}, Error rate: ${stats.errorRate}`);
  
  return stats;
}

/**
 * Genera reporte de performance
 */
async function generateReport(benchmarks, loadTests) {
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      baseUrl: CONFIG.baseUrl,
      iterations: CONFIG.iterations,
      concurrency: CONFIG.concurrency,
      thresholds: CONFIG.thresholds
    },
    benchmarks,
    loadTests,
    summary: {
      totalEndpoints: benchmarks.length,
      avgP95: benchmarks.reduce((sum, b) => sum + b.p95, 0) / benchmarks.length,
      excellentCount: benchmarks.filter(b => b.grade.includes('EXCELENTE')).length,
      needsImprovementCount: benchmarks.filter(b => b.grade.includes('NECESITA MEJORA')).length
    }
  };

  // Guardar JSON
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  const jsonPath = path.join(CONFIG.outputDir, 'performance-benchmark.json');
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Reporte guardado: ${jsonPath}`);

  // Generar Markdown
  const mdPath = path.join(CONFIG.outputDir, 'performance-report.md');
  const markdown = generateMarkdown(report);
  await fs.writeFile(mdPath, markdown);
  console.log(`✅ Markdown guardado: ${mdPath}`);

  return report;
}

/**
 * Genera reporte en Markdown
 */
function generateMarkdown(report) {
  const lines = [];
  
  lines.push('# ⚡ Reporte de Performance - GIM_AI\n');
  lines.push(`**Fecha**: ${new Date(report.timestamp).toLocaleString('es-ES')}\n`);
  lines.push(`**Base URL**: ${report.config.baseUrl}\n`);
  lines.push(`**Iteraciones**: ${report.config.iterations}\n`);
  lines.push('---\n\n');

  // Benchmarks
  lines.push('## 📊 Benchmarks por Endpoint\n\n');
  lines.push('| Endpoint | P50 | P95 | P99 | Throughput | Grade |\n');
  lines.push('|----------|-----|-----|-----|------------|-------|\n');
  
  report.benchmarks.forEach(b => {
    lines.push(`| ${b.name} | ${b.p50.toFixed(0)}ms | ${b.p95.toFixed(0)}ms | ${b.p99.toFixed(0)}ms | ${b.throughput} | ${b.grade} |\n`);
  });
  lines.push('\n');

  // Load tests
  if (report.loadTests.length > 0) {
    lines.push('## 🔥 Load Tests\n\n');
    lines.push('| Test | Concurrency | Throughput | Error Rate | Avg Response |\n');
    lines.push('|------|-------------|------------|------------|---------------|\n');
    
    report.loadTests.forEach(lt => {
      lines.push(`| ${lt.name} | ${lt.concurrency} | ${lt.throughput} | ${lt.errorRate} | ${lt.avgResponseTime.toFixed(0)}ms |\n`);
    });
    lines.push('\n');
  }

  // Summary
  lines.push('## 📋 Resumen\n\n');
  lines.push(`- Total endpoints: ${report.summary.totalEndpoints}\n`);
  lines.push(`- P95 promedio: ${report.summary.avgP95.toFixed(0)}ms\n`);
  lines.push(`- Excelentes: ${report.summary.excellentCount}\n`);
  lines.push(`- Necesitan mejora: ${report.summary.needsImprovementCount}\n`);

  return lines.join('');
}

/**
 * Main
 */
async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                                                  ║');
  console.log('║     ⚡ PERFORMANCE BENCHMARK - GIM_AI ⚡         ║');
  console.log('║                                                  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Iteraciones: ${CONFIG.iterations}`);
  console.log(`Concurrency: ${CONFIG.concurrency}\n`);

  try {
    const benchmarks = [];
    const loadTests = [];

    // Endpoints a testear (ajustar según tu API)
    const endpoints = [
      { name: 'Health Check', url: `${CONFIG.baseUrl}/health` },
      { name: 'API Root', url: `${CONFIG.baseUrl}/api` }
    ];

    // Ejecutar benchmarks
    console.log('═'.repeat(60));
    console.log(' BENCHMARKS SECUENCIALES');
    console.log('═'.repeat(60));

    for (const endpoint of endpoints) {
      try {
        const result = await benchmarkEndpoint(endpoint.name, endpoint.url);
        benchmarks.push(result);
        await sleep(500); // Pausa entre tests
      } catch (error) {
        console.log(`  ❌ Error en ${endpoint.name}: ${error.message}`);
      }
    }

    // Load tests (opcional - solo si el servidor está corriendo)
    if (benchmarks.length > 0 && benchmarks[0].successful > 0) {
      console.log('\n' + '═'.repeat(60));
      console.log(' LOAD TESTS');
      console.log('═'.repeat(60));

      const loadTestResult = await loadTest('Health Check Load', `${CONFIG.baseUrl}/health`, 5, 3000);
      loadTests.push(loadTestResult);
    }

    // Generar reporte
    const report = await generateReport(benchmarks, loadTests);

    // Mostrar resumen
    console.log('\n' + '═'.repeat(60));
    console.log(' RESUMEN');
    console.log('═'.repeat(60));
    console.log(`\n  P95 Promedio: ${report.summary.avgP95.toFixed(0)}ms`);
    console.log(`  Excelentes: ${report.summary.excellentCount}/${report.summary.totalEndpoints}`);
    console.log(`  Necesitan mejora: ${report.summary.needsImprovementCount}/${report.summary.totalEndpoints}\n`);

    console.log('✨ Benchmark completado!\n');
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { benchmarkEndpoint, loadTest, generateReport };
