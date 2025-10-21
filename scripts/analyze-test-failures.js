#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n📊 ANALYZING TEST FAILURES...\n');

// Run tests with verbose output
try {
  const output = execSync('npm test -- --verbose 2>&1', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  
  // Parse failures
  const lines = output.split('\n');
  const failures = {};
  
  lines.forEach((line, idx) => {
    if (line.includes('● ')) {
      const match = line.match(/● (.*?) › (.*)/);
      if (match) {
        const [_, suite, test] = match;
        if (!failures[suite]) failures[suite] = [];
        failures[suite].push(test);
      }
    }
  });
  
  // Output summary
  const suites = Object.keys(failures).sort();
  console.log(`🔴 ${suites.length} test suites with failures:\n`);
  
  suites.slice(0, 20).forEach(suite => {
    console.log(`  ${suite}`);
    failures[suite].slice(0, 3).forEach(test => {
      console.log(`    ❌ ${test}`);
    });
    if (failures[suite].length > 3) {
      console.log(`    ... and ${failures[suite].length - 3} more`);
    }
  });
  
  if (suites.length > 20) {
    console.log(`\n  ... and ${suites.length - 20} more test suites`);
  }
  
  console.log('\n✅ PRIORITY: Fix integration tests first (35 suites failing)');
  console.log('✅ THEN: Fix routes tests (16 suites)');
  console.log('✅ FINALLY: Fix workers tests (11 suites)\n');
  
} catch (err) {
  console.error('Error running tests:', err.message);
}
