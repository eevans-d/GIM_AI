#!/usr/bin/env node
/**
 * Script to generate comprehensive API documentation
 * Scans all routes/api files and extracts endpoint information
 * 
 * Usage: node scripts/generate-api-docs.js
 * Output: docs/qa-analysis/API_DOCUMENTATION_COMPLETE.md
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../routes/api');
const OUTPUT_FILE = path.join(__dirname, '../docs/qa-analysis/API_DOCUMENTATION_COMPLETE.md');

/**
 * Extract endpoints from a route file
 */
function extractEndpoints(filePath, fileContent) {
  const endpoints = [];
  const relativePath = path.relative(ROUTES_DIR, filePath);
  
  // Regex to match router.METHOD('path', ...) patterns
  const endpointRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = endpointRegex.exec(fileContent)) !== null) {
    const [, method, routePath] = match;
    
    // Extract the line content for context
    const lines = fileContent.split('\n');
    const lineIndex = fileContent.substring(0, match.index).split('\n').length - 1;
    const lineContent = lines[lineIndex];
    
    // Check for authentication middleware
    const hasAuth = lineContent.includes('authenticate');
    const hasRateLimiting = lineContent.includes('rateLimit') || lineContent.includes('limiter');
    
    // Try to extract JSDoc comment above
    let description = '';
    for (let i = lineIndex - 1; i >= Math.max(0, lineIndex - 5); i--) {
      const line = lines[i].trim();
      if (line.startsWith('*') || line.startsWith('/**') || line.startsWith('//')) {
        description = line.replace(/^[\/*\s]+/, '').replace(/\*\/$/, '') + ' ' + description;
      } else if (line && !line.startsWith('*')) {
        break;
      }
    }
    
    endpoints.push({
      method: method.toUpperCase(),
      path: routePath,
      file: relativePath,
      authenticated: hasAuth,
      rateLimited: hasRateLimiting,
      description: description.trim() || 'No description available',
      lineNumber: lineIndex + 1
    });
  }
  
  return endpoints;
}

/**
 * Recursively scan directory for route files
 */
function scanRoutes(dir) {
  const allEndpoints = [];
  
  function scan(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        scan(filePath);
      } else if (file.endsWith('.js')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const endpoints = extractEndpoints(filePath, content);
        allEndpoints.push(...endpoints);
      }
    }
  }
  
  scan(dir);
  return allEndpoints;
}

/**
 * Generate markdown documentation
 */
function generateMarkdown(endpoints) {
  const grouped = {};
  
  // Group by file
  endpoints.forEach(endpoint => {
    if (!grouped[endpoint.file]) {
      grouped[endpoint.file] = [];
    }
    grouped[endpoint.file].push(endpoint);
  });
  
  let markdown = `# 📚 API Documentation - Complete Reference

**Generated**: ${new Date().toISOString()}  
**Total Endpoints**: ${endpoints.length}  
**Status**: Auto-generated from code

---

## 📋 Table of Contents

`;
  
  // Generate TOC
  Object.keys(grouped).sort().forEach(file => {
    const cleanName = file.replace(/\//g, ' › ').replace('.js', '');
    markdown += `- [${cleanName}](#${file.replace(/[^a-z0-9]/gi, '-').toLowerCase()})\n`;
  });
  
  markdown += `\n---\n\n## 📊 Summary Statistics\n\n`;
  markdown += `| Metric | Count |\n`;
  markdown += `|--------|-------|\n`;
  markdown += `| **Total Endpoints** | ${endpoints.length} |\n`;
  markdown += `| **Authenticated** | ${endpoints.filter(e => e.authenticated).length} |\n`;
  markdown += `| **Rate Limited** | ${endpoints.filter(e => e.rateLimited).length} |\n`;
  markdown += `| **GET requests** | ${endpoints.filter(e => e.method === 'GET').length} |\n`;
  markdown += `| **POST requests** | ${endpoints.filter(e => e.method === 'POST').length} |\n`;
  markdown += `| **PUT requests** | ${endpoints.filter(e => e.method === 'PUT').length} |\n`;
  markdown += `| **DELETE requests** | ${endpoints.filter(e => e.method === 'DELETE').length} |\n`;
  markdown += `| **PATCH requests** | ${endpoints.filter(e => e.method === 'PATCH').length} |\n`;
  
  markdown += `\n---\n\n## 📖 Endpoint Reference\n\n`;
  
  // Generate detailed docs
  Object.keys(grouped).sort().forEach(file => {
    const cleanName = file.replace(/\//g, ' › ').replace('.js', '');
    markdown += `### ${cleanName}\n\n`;
    markdown += `**File**: \`routes/api/${file}\`\n\n`;
    
    grouped[file].forEach(endpoint => {
      const badge = endpoint.authenticated ? '🔒' : '🔓';
      const rateBadge = endpoint.rateLimited ? '⏱️' : '';
      
      markdown += `#### \`${endpoint.method}\` ${endpoint.path} ${badge} ${rateBadge}\n\n`;
      markdown += `**Description**: ${endpoint.description}\n\n`;
      markdown += `**Authentication**: ${endpoint.authenticated ? 'Required' : 'Not required'}\n\n`;
      markdown += `**Rate Limiting**: ${endpoint.rateLimited ? 'Enabled' : 'Not enabled'}\n\n`;
      markdown += `**Location**: Line ${endpoint.lineNumber}\n\n`;
      markdown += `**Example Request**:\n\`\`\`bash\ncurl -X ${endpoint.method} \\\\\n`;
      markdown += `  http://localhost:3000/api${endpoint.path} \\\\\n`;
      if (endpoint.authenticated) {
        markdown += `  -H "Authorization: Bearer YOUR_TOKEN" \\\\\n`;
      }
      markdown += `  -H "Content-Type: application/json"\n`;
      if (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') {
        markdown += `  -d '{"key": "value"}'\n`;
      }
      markdown += `\`\`\`\n\n`;
      markdown += `---\n\n`;
    });
  });
  
  markdown += `\n## 🔍 Missing Documentation\n\n`;
  markdown += `The following endpoints need additional documentation:\n\n`;
  
  const missingDocs = endpoints.filter(e => e.description === 'No description available');
  markdown += `**Total**: ${missingDocs.length} endpoints (${((missingDocs.length / endpoints.length) * 100).toFixed(1)}%)\n\n`;
  
  if (missingDocs.length > 0) {
    markdown += `| Method | Path | File |\n`;
    markdown += `|--------|------|------|\n`;
    missingDocs.forEach(endpoint => {
      markdown += `| \`${endpoint.method}\` | ${endpoint.path} | ${endpoint.file} |\n`;
    });
  } else {
    markdown += `✅ All endpoints have documentation!\n`;
  }
  
  markdown += `\n---\n\n`;
  markdown += `## 📝 Next Steps\n\n`;
  markdown += `1. Add JSDoc comments to endpoints without descriptions\n`;
  markdown += `2. Document request/response schemas using Joi or JSON Schema\n`;
  markdown += `3. Add error response examples\n`;
  markdown += `4. Document query parameters and path parameters\n`;
  markdown += `5. Add authentication scopes for each endpoint\n`;
  markdown += `6. Consider using OpenAPI/Swagger for interactive docs\n\n`;
  
  markdown += `---\n\n`;
  markdown += `**Generated by**: \`scripts/generate-api-docs.js\`  \n`;
  markdown += `**Last updated**: ${new Date().toISOString()}\n`;
  
  return markdown;
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 Scanning routes directory...');
  const endpoints = scanRoutes(ROUTES_DIR);
  
  console.log(`✅ Found ${endpoints.length} endpoints`);
  console.log('📝 Generating markdown documentation...');
  
  const markdown = generateMarkdown(endpoints);
  
  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_FILE, markdown, 'utf8');
  
  console.log(`✅ Documentation generated: ${OUTPUT_FILE}`);
  console.log(`📊 Statistics:`);
  console.log(`   - Total endpoints: ${endpoints.length}`);
  console.log(`   - Authenticated: ${endpoints.filter(e => e.authenticated).length}`);
  console.log(`   - Rate limited: ${endpoints.filter(e => e.rateLimited).length}`);
  console.log(`   - Missing descriptions: ${endpoints.filter(e => e.description === 'No description available').length}`);
  
  const completeness = ((endpoints.length - endpoints.filter(e => e.description === 'No description available').length) / endpoints.length * 100).toFixed(1);
  console.log(`   - Documentation completeness: ${completeness}%`);
}

if (require.main === module) {
  main();
}

module.exports = { extractEndpoints, scanRoutes, generateMarkdown };
