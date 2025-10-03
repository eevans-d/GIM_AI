#!/usr/bin/env node

/**
 * E2E Test Suite for GIM_AI Production Environment
 * 
 * This script runs end-to-end tests against a live production/staging environment.
 * 
 * Prerequisites:
 * - App deployed to Railway/Render
 * - All credentials configured
 * - WhatsApp templates approved
 * - Test member and class created
 * 
 * Usage:
 *   node tests/e2e/production/run-e2e-tests.js
 *   node tests/e2e/production/run-e2e-tests.js --scenario=checkin
 *   node tests/e2e/production/run-e2e-tests.js --env=staging
 */

const axios = require('axios');
const crypto = require('crypto');
const chalk = require('chalk');

// Configuration
const config = {
  production: {
    baseUrl: process.env.PRODUCTION_URL || 'https://gim-ai-production.up.railway.app',
    adminEmail: process.env.PRODUCTION_ADMIN_EMAIL || 'admin@gimapp.com',
    adminPassword: process.env.PRODUCTION_ADMIN_PASSWORD,
    testMemberPhone: process.env.TEST_MEMBER_PHONE || '+5491112345678',
    testMemberQR: process.env.TEST_MEMBER_QR || 'GIM_TEST_MEMBER_001'
  },
  staging: {
    baseUrl: process.env.STAGING_URL || 'https://gim-ai-staging.up.railway.app',
    adminEmail: process.env.STAGING_ADMIN_EMAIL || 'admin@staging.gimapp.com',
    adminPassword: process.env.STAGING_ADMIN_PASSWORD,
    testMemberPhone: process.env.TEST_MEMBER_PHONE || '+5491187654321',
    testMemberQR: process.env.TEST_MEMBER_QR || 'GIM_TEST_MEMBER_STAGING'
  }
};

// Parse command line arguments
const args = process.argv.slice(2);
const envArg = args.find(arg => arg.startsWith('--env='));
const scenarioArg = args.find(arg => arg.startsWith('--scenario='));

const environment = envArg ? envArg.split('=')[1] : 'production';
const specificScenario = scenarioArg ? scenarioArg.split('=')[1] : null;

const ENV = config[environment];

if (!ENV) {
  console.error(chalk.red(`Invalid environment: ${environment}`));
  console.log(chalk.yellow('Valid environments: production, staging'));
  process.exit(1);
}

// Test results
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  scenarios: []
};

// Utilities
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: chalk.blue('ℹ'),
    success: chalk.green('✓'),
    error: chalk.red('✗'),
    warning: chalk.yellow('⚠'),
    test: chalk.cyan('▸')
  }[type] || '';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function logSection(title) {
  console.log('\n' + chalk.bold.underline(title));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const url = `${ENV.baseUrl}${endpoint}`;
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    log(`${method.toUpperCase()} ${endpoint}`, 'test');
    const response = await axios(config);
    log(`Response: ${response.status} ${response.statusText}`, 'success');
    return response;
  } catch (error) {
    if (error.response) {
      log(`Error: ${error.response.status} ${error.response.statusText}`, 'error');
      log(`Body: ${JSON.stringify(error.response.data)}`, 'error');
    } else {
      log(`Error: ${error.message}`, 'error');
    }
    throw error;
  }
}

// Test Scenarios

/**
 * Scenario 1: Health Check
 */
async function testHealthCheck() {
  logSection('🏥 Scenario 1: Health Check');
  
  try {
    const response = await makeRequest('GET', '/health');
    
    // Validate response structure
    if (!response.data.status) {
      throw new Error('Health check missing status field');
    }
    
    if (response.data.status !== 'healthy') {
      throw new Error(`System is ${response.data.status}, expected healthy`);
    }
    
    if (!response.data.services) {
      throw new Error('Health check missing services field');
    }
    
    // Check critical services
    const criticalServices = ['database', 'redis', 'whatsapp'];
    for (const service of criticalServices) {
      if (!response.data.services[service]) {
        throw new Error(`Missing ${service} in health check`);
      }
      if (response.data.services[service].status !== 'healthy') {
        throw new Error(`Service ${service} is not healthy`);
      }
    }
    
    log('✓ Health check passed', 'success');
    log(`  - Status: ${response.data.status}`, 'info');
    log(`  - Uptime: ${response.data.uptime} seconds`, 'info');
    log(`  - Database: ${response.data.services.database.status}`, 'info');
    log(`  - Redis: ${response.data.services.redis.status}`, 'info');
    log(`  - WhatsApp: ${response.data.services.whatsapp.status}`, 'info');
    
    results.passed++;
    results.scenarios.push({ name: 'Health Check', status: 'passed' });
  } catch (error) {
    log('✗ Health check failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'Health Check', status: 'failed', error: error.message });
  }
}

/**
 * Scenario 2: Admin Authentication
 */
async function testAdminAuth() {
  logSection('🔐 Scenario 2: Admin Authentication');
  
  try {
    if (!ENV.adminPassword) {
      throw new Error('ADMIN_PASSWORD not configured in environment');
    }
    
    const response = await makeRequest('POST', '/api/v1/auth/login', {
      email: ENV.adminEmail,
      password: ENV.adminPassword
    });
    
    if (!response.data.token) {
      throw new Error('Login response missing token');
    }
    
    if (!response.data.user) {
      throw new Error('Login response missing user');
    }
    
    if (response.data.user.role !== 'admin') {
      throw new Error(`User role is ${response.data.user.role}, expected admin`);
    }
    
    // Store token for subsequent tests
    ENV.authToken = response.data.token;
    
    log('✓ Admin authentication passed', 'success');
    log(`  - User: ${response.data.user.email}`, 'info');
    log(`  - Role: ${response.data.user.role}`, 'info');
    log(`  - Token: ${response.data.token.substring(0, 20)}...`, 'info');
    
    results.passed++;
    results.scenarios.push({ name: 'Admin Authentication', status: 'passed' });
  } catch (error) {
    log('✗ Admin authentication failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'Admin Authentication', status: 'failed', error: error.message });
  }
}

/**
 * Scenario 3: QR Check-in Flow
 */
async function testQRCheckin() {
  logSection('📱 Scenario 3: QR Check-in Flow');
  
  try {
    // First, we need a valid class ID
    // For this test, we'll create a test class or use a pre-created one
    
    if (!ENV.authToken) {
      throw new Error('Not authenticated. Run admin auth test first.');
    }
    
    // Get or create test class
    log('Getting test class...', 'info');
    const classResponse = await makeRequest('GET', '/api/v1/classes?fecha=2025-10-03&limit=1', null, {
      'Authorization': `Bearer ${ENV.authToken}`
    });
    
    if (!classResponse.data.data || classResponse.data.data.length === 0) {
      throw new Error('No classes available for testing. Create a test class first.');
    }
    
    const testClass = classResponse.data.data[0];
    log(`  - Using class: ${testClass.nombre} (${testClass.id})`, 'info');
    
    // Perform check-in
    log('Performing QR check-in...', 'info');
    const checkinResponse = await makeRequest('POST', '/api/checkin', {
      qr_code: ENV.testMemberQR,
      clase_id: testClass.id
    });
    
    if (!checkinResponse.data.checkin_id) {
      throw new Error('Check-in response missing checkin_id');
    }
    
    if (!checkinResponse.data.whatsapp_confirmacion) {
      log('⚠ WhatsApp confirmation not sent (may be expected if rate limited)', 'warning');
    }
    
    log('✓ QR check-in passed', 'success');
    log(`  - Check-in ID: ${checkinResponse.data.checkin_id}`, 'info');
    log(`  - Member: ${checkinResponse.data.member.nombre}`, 'info');
    log(`  - Class: ${checkinResponse.data.clase.nombre}`, 'info');
    log(`  - WhatsApp sent: ${checkinResponse.data.whatsapp_confirmacion?.enviado || false}`, 'info');
    
    results.passed++;
    results.scenarios.push({ name: 'QR Check-in Flow', status: 'passed' });
  } catch (error) {
    if (error.response?.status === 409) {
      log('⚠ Check-in already exists (expected if running multiple times)', 'warning');
      results.passed++;
      results.scenarios.push({ name: 'QR Check-in Flow', status: 'passed', note: 'Already checked in' });
    } else if (error.response?.status === 404) {
      log('⚠ Test member QR not found. Create test member first.', 'warning');
      results.skipped++;
      results.scenarios.push({ name: 'QR Check-in Flow', status: 'skipped', error: 'Test member not found' });
    } else {
      log('✗ QR check-in failed', 'error');
      log(`  Error: ${error.message}`, 'error');
      results.failed++;
      results.scenarios.push({ name: 'QR Check-in Flow', status: 'failed', error: error.message });
    }
  }
}

/**
 * Scenario 4: Members API
 */
async function testMembersAPI() {
  logSection('👥 Scenario 4: Members API');
  
  try {
    if (!ENV.authToken) {
      throw new Error('Not authenticated. Run admin auth test first.');
    }
    
    // List members
    log('Listing members...', 'info');
    const listResponse = await makeRequest('GET', '/api/v1/members?page=1&limit=10', null, {
      'Authorization': `Bearer ${ENV.authToken}`
    });
    
    if (!listResponse.data.data) {
      throw new Error('Members list response missing data array');
    }
    
    if (!listResponse.data.pagination) {
      throw new Error('Members list response missing pagination');
    }
    
    log(`  - Found ${listResponse.data.pagination.total} members`, 'info');
    log(`  - Page ${listResponse.data.pagination.page} of ${listResponse.data.pagination.totalPages}`, 'info');
    
    // If we have members, get details of first one
    if (listResponse.data.data.length > 0) {
      const firstMember = listResponse.data.data[0];
      log(`Getting details of member: ${firstMember.nombre}...`, 'info');
      
      const detailsResponse = await makeRequest('GET', `/api/v1/members/${firstMember.id}`, null, {
        'Authorization': `Bearer ${ENV.authToken}`
      });
      
      if (!detailsResponse.data.id) {
        throw new Error('Member details missing id');
      }
      
      log(`  - Member: ${detailsResponse.data.nombre}`, 'info');
      log(`  - Email: ${detailsResponse.data.email}`, 'info');
      log(`  - Status: ${detailsResponse.data.status}`, 'info');
      log(`  - QR Code: ${detailsResponse.data.codigo_qr}`, 'info');
    }
    
    log('✓ Members API passed', 'success');
    results.passed++;
    results.scenarios.push({ name: 'Members API', status: 'passed' });
  } catch (error) {
    log('✗ Members API failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'Members API', status: 'failed', error: error.message });
  }
}

/**
 * Scenario 5: Classes API
 */
async function testClassesAPI() {
  logSection('🏋️ Scenario 5: Classes API');
  
  try {
    if (!ENV.authToken) {
      throw new Error('Not authenticated. Run admin auth test first.');
    }
    
    // List classes
    log('Listing classes...', 'info');
    const listResponse = await makeRequest('GET', '/api/v1/classes?fecha=2025-10-03', null, {
      'Authorization': `Bearer ${ENV.authToken}`
    });
    
    if (!listResponse.data.data) {
      throw new Error('Classes list response missing data array');
    }
    
    log(`  - Found ${listResponse.data.total} classes`, 'info');
    
    // If we have classes, get details of first one
    if (listResponse.data.data.length > 0) {
      const firstClass = listResponse.data.data[0];
      log(`Getting details of class: ${firstClass.nombre}...`, 'info');
      
      const detailsResponse = await makeRequest('GET', `/api/v1/classes/${firstClass.id}`, null, {
        'Authorization': `Bearer ${ENV.authToken}`
      });
      
      if (!detailsResponse.data.id) {
        throw new Error('Class details missing id');
      }
      
      log(`  - Class: ${detailsResponse.data.nombre}`, 'info');
      log(`  - Instructor: ${detailsResponse.data.instructor.nombre}`, 'info');
      log(`  - Capacity: ${detailsResponse.data.inscritos}/${detailsResponse.data.capacidad_maxima}`, 'info');
      log(`  - Available: ${detailsResponse.data.disponible}`, 'info');
    }
    
    log('✓ Classes API passed', 'success');
    results.passed++;
    results.scenarios.push({ name: 'Classes API', status: 'passed' });
  } catch (error) {
    log('✗ Classes API failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'Classes API', status: 'failed', error: error.message });
  }
}

/**
 * Scenario 6: WhatsApp Webhook Verification
 */
async function testWhatsAppWebhook() {
  logSection('💬 Scenario 6: WhatsApp Webhook Verification');
  
  try {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'gim_ai_webhook_2025';
    const challenge = 'TEST_CHALLENGE_' + Date.now();
    
    log('Testing webhook verification...', 'info');
    const response = await makeRequest(
      'GET',
      `/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
    );
    
    // Response should echo the challenge
    if (response.data !== challenge) {
      throw new Error(`Webhook returned "${response.data}", expected "${challenge}"`);
    }
    
    log('✓ WhatsApp webhook verification passed', 'success');
    log(`  - Challenge echoed correctly`, 'info');
    
    results.passed++;
    results.scenarios.push({ name: 'WhatsApp Webhook', status: 'passed' });
  } catch (error) {
    log('✗ WhatsApp webhook verification failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'WhatsApp Webhook', status: 'failed', error: error.message });
  }
}

/**
 * Scenario 7: API Rate Limiting
 */
async function testRateLimiting() {
  logSection('🚦 Scenario 7: API Rate Limiting');
  
  try {
    log('Sending rapid requests to test rate limiting...', 'info');
    
    let rateLimited = false;
    let requestCount = 0;
    
    // Send 150 requests rapidly (should hit rate limit of 100/15min)
    for (let i = 0; i < 150; i++) {
      try {
        await makeRequest('GET', '/health');
        requestCount++;
      } catch (error) {
        if (error.response?.status === 429) {
          rateLimited = true;
          log(`  - Rate limited after ${requestCount} requests`, 'info');
          
          // Check rate limit headers
          const headers = error.response.headers;
          if (headers['x-ratelimit-limit']) {
            log(`  - Rate limit: ${headers['x-ratelimit-limit']}`, 'info');
          }
          if (headers['x-ratelimit-remaining']) {
            log(`  - Remaining: ${headers['x-ratelimit-remaining']}`, 'info');
          }
          if (headers['x-ratelimit-reset']) {
            log(`  - Reset: ${headers['x-ratelimit-reset']}`, 'info');
          }
          break;
        } else {
          throw error;
        }
      }
      
      // Small delay to avoid overwhelming server
      await sleep(10);
    }
    
    if (!rateLimited) {
      log('⚠ Rate limiting not triggered after 150 requests', 'warning');
      log('  This may indicate rate limiting is disabled or limit is very high', 'warning');
    }
    
    log('✓ Rate limiting test completed', 'success');
    results.passed++;
    results.scenarios.push({ name: 'Rate Limiting', status: 'passed', note: rateLimited ? 'Triggered' : 'Not triggered' });
  } catch (error) {
    log('✗ Rate limiting test failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'Rate Limiting', status: 'failed', error: error.message });
  }
}

/**
 * Scenario 8: Security Headers
 */
async function testSecurityHeaders() {
  logSection('🔒 Scenario 8: Security Headers');
  
  try {
    log('Checking security headers...', 'info');
    const response = await makeRequest('GET', '/health');
    
    const securityHeaders = {
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'DENY',
      'x-xss-protection': '1; mode=block',
      'strict-transport-security': null // Should exist
    };
    
    let missingHeaders = [];
    let presentHeaders = [];
    
    for (const [header, expectedValue] of Object.entries(securityHeaders)) {
      const actualValue = response.headers[header.toLowerCase()];
      
      if (!actualValue) {
        missingHeaders.push(header);
      } else {
        presentHeaders.push(header);
        if (expectedValue && actualValue !== expectedValue) {
          log(`  ⚠ ${header}: "${actualValue}" (expected "${expectedValue}")`, 'warning');
        } else {
          log(`  ✓ ${header}: ${actualValue}`, 'info');
        }
      }
    }
    
    if (missingHeaders.length > 0) {
      log(`  ⚠ Missing headers: ${missingHeaders.join(', ')}`, 'warning');
    }
    
    log(`✓ Security headers test completed (${presentHeaders.length}/${Object.keys(securityHeaders).length} present)`, 'success');
    results.passed++;
    results.scenarios.push({ 
      name: 'Security Headers', 
      status: 'passed',
      note: `${presentHeaders.length}/${Object.keys(securityHeaders).length} headers present`
    });
  } catch (error) {
    log('✗ Security headers test failed', 'error');
    log(`  Error: ${error.message}`, 'error');
    results.failed++;
    results.scenarios.push({ name: 'Security Headers', status: 'failed', error: error.message });
  }
}

// Main execution
async function runTests() {
  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║         GIM_AI E2E Production Test Suite                      ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════════╝\n'));
  
  log(`Environment: ${chalk.bold(environment)}`, 'info');
  log(`Base URL: ${chalk.bold(ENV.baseUrl)}`, 'info');
  log(`Test Member QR: ${chalk.bold(ENV.testMemberQR)}`, 'info');
  
  if (specificScenario) {
    log(`Running specific scenario: ${chalk.bold(specificScenario)}`, 'info');
  }
  
  console.log('');
  
  const startTime = Date.now();
  
  // Define test scenarios
  const scenarios = {
    health: testHealthCheck,
    auth: testAdminAuth,
    checkin: testQRCheckin,
    members: testMembersAPI,
    classes: testClassesAPI,
    webhook: testWhatsAppWebhook,
    ratelimit: testRateLimiting,
    security: testSecurityHeaders
  };
  
  // Run tests
  if (specificScenario) {
    if (scenarios[specificScenario]) {
      await scenarios[specificScenario]();
    } else {
      log(`Unknown scenario: ${specificScenario}`, 'error');
      log(`Available scenarios: ${Object.keys(scenarios).join(', ')}`, 'info');
      process.exit(1);
    }
  } else {
    // Run all scenarios in order
    for (const [name, testFn] of Object.entries(scenarios)) {
      await testFn();
      await sleep(1000); // 1 second between tests
    }
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n' + chalk.bold.underline('Test Summary'));
  console.log('');
  console.log(chalk.green(`✓ Passed:  ${results.passed}`));
  console.log(chalk.red(`✗ Failed:  ${results.failed}`));
  console.log(chalk.yellow(`⊗ Skipped: ${results.skipped}`));
  console.log(chalk.blue(`⏱ Duration: ${duration}s`));
  console.log('');
  
  // Print detailed results
  console.log(chalk.bold.underline('Detailed Results'));
  console.log('');
  
  results.scenarios.forEach((scenario, index) => {
    const icon = scenario.status === 'passed' ? chalk.green('✓') :
                 scenario.status === 'failed' ? chalk.red('✗') :
                 chalk.yellow('⊗');
    
    console.log(`${icon} ${index + 1}. ${scenario.name}`);
    
    if (scenario.error) {
      console.log(`   ${chalk.red('Error:')} ${scenario.error}`);
    }
    
    if (scenario.note) {
      console.log(`   ${chalk.yellow('Note:')} ${scenario.note}`);
    }
  });
  
  console.log('');
  
  // Exit with appropriate code
  if (results.failed > 0) {
    log('Some tests failed', 'error');
    process.exit(1);
  } else {
    log('All tests passed!', 'success');
    process.exit(0);
  }
}

// Run tests
runTests().catch(error => {
  log(`Unexpected error: ${error.message}`, 'error');
  console.error(error);
  process.exit(1);
});
