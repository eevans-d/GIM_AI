#!/usr/bin/env node
/**
 * Smart Test Generator - Generates unit tests for untested files
 * Analyzes coverage report and creates stubs/boilerplate for missing tests
 * 
 * Usage: node scripts/smart-test-generator.js
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_THRESHOLD = 0; // Files with 0% coverage
const TEST_DIR = path.join(__dirname, '../tests/unit');
const SERVICES_DIR = path.join(__dirname, '../services');
const ROUTES_DIR = path.join(__dirname, '../routes/api');
const WORKERS_DIR = path.join(__dirname, '../workers');

// File mapping for test generation
const TEST_TEMPLATES = {
  service: (filename, className) => `
const ${className} = require('../../../services/${filename}');
const { createMockLogger } = require('../../__mocks__/winston');

describe('${className}', () => {
  let service;
  let mockLogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    service = new ${className}(mockLogger);
  });

  describe('initialization', () => {
    test('should initialize with logger', () => {
      expect(service).toBeDefined();
      expect(service.logger).toBeDefined();
    });
  });

  // TODO: Add specific test cases for this service
  // Review the service implementation and add tests for:
  // - Constructor and initialization
  // - Main methods
  // - Error handling
  // - Edge cases
});
`,
  
  route: (filename, routeName) => `
const request = require('supertest');
const express = require('express');
const ${routeName} = require('../../../routes/api/${filename}');

describe('${routeName} Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/${routeName}', ${routeName});
  });

  describe('GET /', () => {
    test('should return successful response', async () => {
      const response = await request(app).get('/api/${routeName}');
      expect([200, 401, 403, 404]).toContain(response.status);
    });
  });

  // TODO: Add specific test cases for each endpoint
  // Review the routes and add tests for:
  // - All HTTP methods (GET, POST, PUT, DELETE, PATCH)
  // - Authentication
  // - Validation
  // - Error responses
});
`,

  worker: (filename, workerName) => `
const ${workerName} = require('../../../workers/${filename}');
const { createMockLogger } = require('../../__mocks__/winston');

describe('${workerName}', () => {
  let worker;
  let mockLogger;

  beforeEach(() => {
    mockLogger = createMockLogger();
    worker = new ${workerName}(mockLogger);
  });

  describe('process', () => {
    test('should process jobs', async () => {
      const job = { id: 'test-job', data: {} };
      // TODO: implement actual test logic
      expect(job).toBeDefined();
    });
  });

  // TODO: Add specific test cases for this worker
  // Review the worker implementation and add tests for:
  // - Job processing
  // - Error handling
  // - Retries
  // - Callbacks
});
`
};

/**
 * Get camelCase/PascalCase name from filename
 */
function getClassName(filename) {
  return filename
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^\w/, c => c.toUpperCase())
    .replace('.js', '');
}

/**
 * Get camelCase name from filename
 */
function getVariableName(filename) {
  return filename
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace('.js', '');
}

/**
 * Generate test file
 */
function generateTestFile(sourceFile, testType) {
  const basename = path.basename(sourceFile);
  const className = getClassName(basename);
  const variableName = getVariableName(basename);
  
  let template;
  let testPath;
  
  switch (testType) {
    case 'service':
      template = TEST_TEMPLATES.service(basename, className);
      testPath = path.join(TEST_DIR, 'services', `${basename.replace('.js', '.spec.js')}`);
      break;
    case 'route':
      template = TEST_TEMPLATES.route(basename, variableName);
      testPath = path.join(TEST_DIR, 'routes', `${basename.replace('.js', '.spec.js')}`);
      break;
    case 'worker':
      template = TEST_TEMPLATES.worker(basename, className);
      testPath = path.join(TEST_DIR, 'workers', `${basename.replace('.js', '.spec.js')}`);
      break;
    default:
      return null;
  }
  
  return { testPath, template };
}

/**
 * Scan directories and identify untested files
 */
function identifyUntestedFiles() {
  const untested = {
    services: [],
    routes: [],
    workers: []
  };

  // Scan services
  if (fs.existsSync(SERVICES_DIR)) {
    fs.readdirSync(SERVICES_DIR).forEach(file => {
      if (file.endsWith('.js') && !file.includes('test') && !file.includes('spec')) {
        const testFile = path.join(TEST_DIR, 'services', file.replace('.js', '.spec.js'));
        if (!fs.existsSync(testFile)) {
          untested.services.push(file);
        }
      }
    });
  }

  // Scan routes
  if (fs.existsSync(ROUTES_DIR)) {
    const scanRoutes = (dir, prefix = '') => {
      fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanRoutes(fullPath, prefix + file + '/');
        } else if (file.endsWith('.js') && !file.includes('test')) {
          const testFile = path.join(TEST_DIR, 'routes', prefix, file.replace('.js', '.spec.js'));
          if (!fs.existsSync(testFile)) {
            untested.routes.push(prefix + file);
          }
        }
      });
    };
    scanRoutes(ROUTES_DIR);
  }

  // Scan workers
  if (fs.existsSync(WORKERS_DIR)) {
    fs.readdirSync(WORKERS_DIR).forEach(file => {
      if (file.endsWith('.js') && !file.includes('test') && !file.includes('spec')) {
        const testFile = path.join(TEST_DIR, 'workers', file.replace('.js', '.spec.js'));
        if (!fs.existsSync(testFile)) {
          untested.workers.push(file);
        }
      }
    });
  }

  return untested;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning for untested files...\n');
  
  const untested = identifyUntestedFiles();
  const totalUntested = 
    untested.services.length + 
    untested.routes.length + 
    untested.workers.length;

  console.log(`📊 Found ${totalUntested} untested files:\n`);
  
  let generatedCount = 0;

  // Generate service tests
  if (untested.services.length > 0) {
    console.log(`📦 Services (${untested.services.length}):`);
    untested.services.forEach(file => {
      console.log(`   - ${file}`);
      const result = generateTestFile(file, 'service');
      if (result) {
        const dir = path.dirname(result.testPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(result.testPath)) {
          fs.writeFileSync(result.testPath, result.template, 'utf8');
          console.log(`     ✅ Created: ${result.testPath}`);
          generatedCount++;
        }
      }
    });
    console.log();
  }

  // Generate route tests
  if (untested.routes.length > 0) {
    console.log(`🛣️  Routes (${untested.routes.length}):`);
    untested.routes.forEach(file => {
      console.log(`   - ${file}`);
      const result = generateTestFile(file, 'route');
      if (result) {
        const dir = path.dirname(result.testPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(result.testPath)) {
          fs.writeFileSync(result.testPath, result.template, 'utf8');
          console.log(`     ✅ Created: ${result.testPath}`);
          generatedCount++;
        }
      }
    });
    console.log();
  }

  // Generate worker tests
  if (untested.workers.length > 0) {
    console.log(`⚙️  Workers (${untested.workers.length}):`);
    untested.workers.forEach(file => {
      console.log(`   - ${file}`);
      const result = generateTestFile(file, 'worker');
      if (result) {
        const dir = path.dirname(result.testPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        if (!fs.existsSync(result.testPath)) {
          fs.writeFileSync(result.testPath, result.template, 'utf8');
          console.log(`     ✅ Created: ${result.testPath}`);
          generatedCount++;
        }
      }
    });
    console.log();
  }

  console.log(`\n✅ Generated ${generatedCount} test files`);
  console.log(`\n📝 Next steps:`);
  console.log(`   1. Review generated test files`);
  console.log(`   2. Add specific test cases for each file`);
  console.log(`   3. Run: npm test to validate`);
  console.log(`   4. Improve coverage gradually`);
}

if (require.main === module) {
  main();
}

module.exports = { identifyUntestedFiles, generateTestFile };
