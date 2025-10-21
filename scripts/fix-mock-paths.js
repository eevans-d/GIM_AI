#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('\n🔧 FIXING RELATIVE PATHS IN TEST FILES...\n');

const testDirs = [
  'tests/integration/**/*.spec.js',
  'tests/unit/routes/**/*.spec.js',
  'tests/unit/workers/**/*.spec.js'
];

let fixed = 0;

testDirs.forEach(pattern => {
  glob.sync(pattern).forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    const original = content;
    
    // For integration tests (depth: tests/integration/FILE.js)
    if (file.startsWith('tests/integration/')) {
      // jest.mock('../../../X') -> jest.mock('../../X')
      content = content.replace(/jest\.mock\(['"]\.\.\/\.\.\/\.\.\/(\w+\/.*)/g, "jest.mock('../../$1");
      // jest.mock('../../../../X') -> jest.mock('../../X')
      content = content.replace(/jest\.mock\(['"]\.\.\/\.\.\/\.\.\/\.\.\/(\w+\/.*)/g, "jest.mock('../../$1");
      // jest.mock('../../../utils/X') -> jest.mock('../../utils/X')
      content = content.replace(/jest\.mock\(['"]\.\.\/\.\.\/\.\.\/utils\/(.*)/g, "jest.mock('../../utils/$1");
    }
    
    // For routes tests (depth: tests/unit/routes/FILE.js)
    if (file.startsWith('tests/unit/routes/')) {
      // jest.mock('../../../utils/X') -> jest.mock('../../utils/X')
      content = content.replace(/jest\.mock\(['"]\.\.\/\.\.\/\.\.\/utils\/(.*)/g, "jest.mock('../../utils/$1");
      // jest.mock('../../../../X') -> jest.mock('../../../X')
      content = content.replace(/jest\.mock\(['"]\.\.\/\.\.\/\.\.\/\.\.\/(\w+\/.*)/g, "jest.mock('../../../$1");
    }
    
    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`✅ Fixed: ${file}`);
      fixed++;
    }
  });
});

console.log(`\n✅ Fixed ${fixed} test files\n`);
console.log('Run: npm test\n');
