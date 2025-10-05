#!/usr/bin/env node
/**
 * GIM_AI - Metrics Generator
 * Genera métricas cuantificables del proyecto
 * 
 * Usage: node scripts/qa/generate-metrics.js
 * Output: qa-reports/metrics.json + metrics-dashboard.md
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const CONFIG = {
  projectRoot: path.join(__dirname, '../..'),
  outputDir: path.join(__dirname, '../../qa-reports')
};

const exec = (cmd) => {
  try {
    return execSync(cmd, { cwd: CONFIG.projectRoot, encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    return '';
  }
};

async function collectMetrics() {
  console.log('\n📊 Recolectando métricas del proyecto...\n');
  
  const metrics = {
    timestamp: new Date().toISOString(),
    codebase: {},
    dependencies: {},
    testing: {},
    performance: {},
    security: {},
    documentation: {}
  };

  // CODEBASE METRICS
  console.log('📁 Analizando codebase...');
  
  const jsFiles = exec("find . -name '*.js' -not -path './node_modules/*' -not -path './coverage/*' | wc -l").trim();
  const totalLines = exec("find . -name '*.js' -not -path './node_modules/*' -not -path './coverage/*' -exec wc -l {} + | tail -1 | awk '{print $1}'").trim();
  const srcLines = exec("find ./routes ./services ./utils ./whatsapp ./workers ./security -name '*.js' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo '0'").trim();
  const testLines = exec("find ./tests -name '*.js' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo '0'").trim();
  
  metrics.codebase = {
    totalFiles: parseInt(jsFiles) || 0,
    totalLines: parseInt(totalLines) || 0,
    sourceLines: parseInt(srcLines) || 0,
    testLines: parseInt(testLines) || 0,
    testToSourceRatio: (parseInt(testLines) / parseInt(srcLines) * 100).toFixed(2) + '%'
  };

  // DEPENDENCIES
  console.log('📦 Analizando dependencias...');
  
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(CONFIG.projectRoot, 'package.json'), 'utf-8'));
    const deps = Object.keys(pkg.dependencies || {}).length;
    const devDeps = Object.keys(pkg.devDependencies || {}).length;
    
    metrics.dependencies = {
      production: deps,
      development: devDeps,
      total: deps + devDeps,
      outdated: exec('npm outdated --json 2>/dev/null || echo "{}"').trim()
    };
  } catch (e) {
    metrics.dependencies = { error: 'No se pudo leer package.json' };
  }

  // TESTING
  console.log('🧪 Recolectando métricas de testing...');
  
  const testFiles = exec("find tests -name '*.spec.js' -o -name '*.test.js' | wc -l").trim();
  const unitTests = exec("find tests/unit -name '*.spec.js' | wc -l").trim();
  const integrationTests = exec("find tests/integration -name '*.spec.js' | wc -l").trim();
  const e2eTests = exec("find tests/e2e -name '*.spec.js' | wc -l").trim();
  
  metrics.testing = {
    totalTestFiles: parseInt(testFiles) || 0,
    unitTests: parseInt(unitTests) || 0,
    integrationTests: parseInt(integrationTests) || 0,
    e2eTests: parseInt(e2eTests) || 0
  };

  // Intentar obtener coverage
  try {
    const coverageFile = path.join(CONFIG.projectRoot, 'coverage/coverage-summary.json');
    const coverageData = JSON.parse(await fs.readFile(coverageFile, 'utf-8'));
    metrics.testing.coverage = {
      lines: coverageData.total.lines.pct,
      statements: coverageData.total.statements.pct,
      functions: coverageData.total.functions.pct,
      branches: coverageData.total.branches.pct
    };
  } catch (e) {
    metrics.testing.coverage = { note: 'Ejecutar npm test -- --coverage para obtener datos' };
  }

  // SECURITY
  console.log('🔒 Analizando seguridad...');
  
  const auditOutput = exec('npm audit --json 2>/dev/null || echo "{}"');
  try {
    const auditData = JSON.parse(auditOutput || '{}');
    const vulns = auditData.vulnerabilities || {};
    
    metrics.security = {
      critical: Object.values(vulns).filter(v => v.severity === 'critical').length,
      high: Object.values(vulns).filter(v => v.severity === 'high').length,
      moderate: Object.values(vulns).filter(v => v.severity === 'moderate').length,
      low: Object.values(vulns).filter(v => v.severity === 'low').length,
      total: Object.keys(vulns).length
    };
  } catch (e) {
    metrics.security = { error: 'No se pudo ejecutar npm audit' };
  }

  // PERFORMANCE INDICATORS
  console.log('⚡ Indicadores de performance...');
  
  metrics.performance = {
    hasRedis: exec("grep -q 'redis' package.json && echo 'true' || echo 'false'").trim() === 'true',
    hasCaching: exec("grep -r 'cache' --include='*.js' --exclude-dir=node_modules . | wc -l").trim(),
    hasQueues: exec("grep -q 'bull' package.json && echo 'true' || echo 'false'").trim() === 'true',
    asyncOperations: exec("grep -r 'async' --include='*.js' --exclude-dir=node_modules --exclude-dir=coverage . | wc -l").trim()
  };

  // DOCUMENTATION
  console.log('📝 Métricas de documentación...');
  
  const mdFiles = exec("find . -name '*.md' -not -path './node_modules/*' | wc -l").trim();
  const docsFiles = exec("find docs -name '*.md' 2>/dev/null | wc -l").trim();
  const readmeSize = exec("wc -c README.md 2>/dev/null | awk '{print $1}' || echo '0'").trim();
  const comments = exec("grep -r '/\\*\\*' --include='*.js' --exclude-dir=node_modules --exclude-dir=coverage . | wc -l").trim();
  
  metrics.documentation = {
    markdownFiles: parseInt(mdFiles) || 0,
    docsFiles: parseInt(docsFiles) || 0,
    readmeSize: parseInt(readmeSize) || 0,
    jsdocBlocks: parseInt(comments) || 0
  };

  return metrics;
}

async function generateDashboard(metrics) {
  const lines = [];
  
  lines.push('# 📊 GIM_AI - Dashboard de Métricas\n');
  lines.push(`**Generado**: ${new Date(metrics.timestamp).toLocaleString('es-ES')}\n`);
  lines.push('---\n\n');

  // Codebase
  lines.push('## 📁 Codebase\n\n');
  lines.push('| Métrica | Valor |\n');
  lines.push('|---------|-------|\n');
  lines.push(`| Total archivos JS | ${metrics.codebase.totalFiles} |\n`);
  lines.push(`| Total líneas | ${metrics.codebase.totalLines.toLocaleString()} |\n`);
  lines.push(`| Líneas de código fuente | ${metrics.codebase.sourceLines.toLocaleString()} |\n`);
  lines.push(`| Líneas de tests | ${metrics.codebase.testLines.toLocaleString()} |\n`);
  lines.push(`| Ratio Test/Source | ${metrics.codebase.testToSourceRatio} |\n`);
  lines.push('\n');

  // Dependencies
  lines.push('## 📦 Dependencias\n\n');
  lines.push('| Tipo | Cantidad |\n');
  lines.push('|------|----------|\n');
  lines.push(`| Producción | ${metrics.dependencies.production} |\n`);
  lines.push(`| Desarrollo | ${metrics.dependencies.development} |\n`);
  lines.push(`| **Total** | **${metrics.dependencies.total}** |\n`);
  lines.push('\n');

  // Testing
  lines.push('## 🧪 Testing\n\n');
  lines.push('| Métrica | Valor |\n');
  lines.push('|---------|-------|\n');
  lines.push(`| Total archivos de test | ${metrics.testing.totalTestFiles} |\n`);
  lines.push(`| Tests unitarios | ${metrics.testing.unitTests} |\n`);
  lines.push(`| Tests de integración | ${metrics.testing.integrationTests} |\n`);
  lines.push(`| Tests E2E | ${metrics.testing.e2eTests} |\n`);
  
  if (metrics.testing.coverage && !metrics.testing.coverage.note) {
    lines.push('\n### Cobertura\n\n');
    lines.push('| Tipo | Porcentaje |\n');
    lines.push('|------|------------|\n');
    lines.push(`| Líneas | ${metrics.testing.coverage.lines}% |\n`);
    lines.push(`| Statements | ${metrics.testing.coverage.statements}% |\n`);
    lines.push(`| Funciones | ${metrics.testing.coverage.functions}% |\n`);
    lines.push(`| Branches | ${metrics.testing.coverage.branches}% |\n`);
  }
  lines.push('\n');

  // Security
  lines.push('## 🔒 Seguridad\n\n');
  if (!metrics.security.error) {
    lines.push('| Severidad | Cantidad |\n');
    lines.push('|-----------|----------|\n');
    lines.push(`| 🔴 Críticas | ${metrics.security.critical} |\n`);
    lines.push(`| 🟠 Altas | ${metrics.security.high} |\n`);
    lines.push(`| 🟡 Moderadas | ${metrics.security.moderate} |\n`);
    lines.push(`| 🟢 Bajas | ${metrics.security.low} |\n`);
    lines.push(`| **Total** | **${metrics.security.total}** |\n`);
  } else {
    lines.push(`⚠️ ${metrics.security.error}\n`);
  }
  lines.push('\n');

  // Performance
  lines.push('## ⚡ Performance\n\n');
  lines.push('| Característica | Estado |\n');
  lines.push('|----------------|--------|\n');
  lines.push(`| Redis | ${metrics.performance.hasRedis ? '✅' : '❌'} |\n`);
  lines.push(`| Caching refs | ${metrics.performance.hasCaching} |\n`);
  lines.push(`| Bull Queues | ${metrics.performance.hasQueues ? '✅' : '❌'} |\n`);
  lines.push(`| Async operations | ${metrics.performance.asyncOperations} |\n`);
  lines.push('\n');

  // Documentation
  lines.push('## 📝 Documentación\n\n');
  lines.push('| Métrica | Valor |\n');
  lines.push('|---------|-------|\n');
  lines.push(`| Archivos Markdown | ${metrics.documentation.markdownFiles} |\n`);
  lines.push(`| Docs en /docs | ${metrics.documentation.docsFiles} |\n`);
  lines.push(`| Tamaño README | ${(metrics.documentation.readmeSize / 1024).toFixed(1)} KB |\n`);
  lines.push(`| Bloques JSDoc | ${metrics.documentation.jsdocBlocks} |\n`);
  lines.push('\n');

  return lines.join('');
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║                                                  ║');
  console.log('║     📊 GENERADOR DE MÉTRICAS - GIM_AI 📊        ║');
  console.log('║                                                  ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  try {
    // Recolectar métricas
    const metrics = await collectMetrics();

    // Crear directorio de salida
    await fs.mkdir(CONFIG.outputDir, { recursive: true });

    // Guardar JSON
    const jsonPath = path.join(CONFIG.outputDir, 'metrics.json');
    await fs.writeFile(jsonPath, JSON.stringify(metrics, null, 2));
    console.log(`\n✅ JSON guardado: ${jsonPath}`);

    // Generar dashboard Markdown
    const dashboard = await generateDashboard(metrics);
    const mdPath = path.join(CONFIG.outputDir, 'metrics-dashboard.md');
    await fs.writeFile(mdPath, dashboard);
    console.log(`✅ Dashboard guardado: ${mdPath}`);

    console.log('\n✨ Métricas generadas exitosamente!\n');
    process.exit(0);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { collectMetrics, generateDashboard };
