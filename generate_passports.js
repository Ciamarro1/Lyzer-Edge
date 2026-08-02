import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, 'knowledge', 'passports');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const IGNORE_DIRS = [
  'node_modules',
  '.git',
  '.agents',
  'dist',
  'build',
  'target',
  '_archive',
  'tmp',
  '.cargo',
  '.github'
];

const IGNORE_FILES = [
  'package-lock.json',
  'Cargo.lock'
];

function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(ROOT_DIR, fullPath);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (IGNORE_DIRS.some(d => relPath.startsWith(d) || file === d)) continue;
      scanDirectory(fullPath, fileList);
    } else {
      if (IGNORE_FILES.includes(file)) continue;
      const ext = path.extname(file);
      if (['.js', '.ts', '.rs', '.proto', '.py'].includes(ext)) {
        fileList.push({
          name: file,
          relPath: relPath.replace(/\\/g, '/'),
          fullPath,
          ext,
          sizeBytes: stat.size
        });
      }
    }
  }
  return fileList;
}

function analyzeFile(fileInfo) {
  try {
    const content = fs.readFileSync(fileInfo.fullPath, 'utf8');
    const lines = content.split('\n');
    const loc = lines.length;

    // Extrapolate dependencies (imports/requires/extern crate/mod)
    const dependencies = [];
    const importRegex = /(?:import|require|from|use|mod|extern crate)\s+['"a-zA-Z0-9_\-\.\/@]+/g;
    
    lines.forEach(line => {
      const match = line.match(importRegex);
      if (match) {
        match.forEach(m => {
          const cleaned = m.replace(/(?:import|require|from|use|mod|extern\s+crate)\s+/, '').trim().replace(/['"';]/g, '');
          if (cleaned && !dependencies.includes(cleaned) && cleaned.length < 80) {
            dependencies.push(cleaned);
          }
        });
      }
    });

    // Inferred responsibility
    let responsibility = 'General quantitative / utility module.';
    const firstLines = lines.slice(0, 15).join(' ');
    
    if (fileInfo.relPath.includes('streamEngine')) {
      responsibility = 'Orchestrates data ingestion, signal evaluation, and ECA Court validation per candle.';
    } else if (fileInfo.relPath.includes('server.js')) {
      responsibility = 'Express 5 REST API and WebSocket Telemetry Server entrypoint.';
    } else if (fileInfo.relPath.includes('court.js')) {
      responsibility = 'ECA Constitutional Court enforcing C-CLIST and MOL rules.';
    } else if (fileInfo.relPath.includes('kernel.js')) {
      responsibility = 'TruthKernel evaluating DVF and LHDS threshold constraints.';
    } else if (fileInfo.relPath.includes('permission.js')) {
      responsibility = 'Cryptographic Permission Token generator and validator (HMAC-SHA256).';
    } else if (fileInfo.relPath.includes('MicrostructureDampener')) {
      responsibility = 'Dampens high-frequency entries via MHT and post-trade cooldown barriers.';
    } else if (fileInfo.relPath.includes('AgentHub')) {
      responsibility = 'Cognitive Multi-Agent lifecycle monitor and task delegator.';
    } else {
      // Look for comments on the first 5 lines
      const comments = lines.slice(0, 5)
        .map(l => l.trim())
        .filter(l => l.startsWith('//') || l.startsWith('/*') || l.startsWith('*') || l.startsWith('#'))
        .map(l => l.replace(/[\/*#]/g, '').trim())
        .filter(Boolean);
      if (comments.length > 0) {
        responsibility = comments.join(' ');
      }
    }

    // Determine domain
    let domain = 'Shared Module';
    if (fileInfo.relPath.startsWith('lyzer edge/backend')) domain = 'Backend Engine';
    else if (fileInfo.relPath.startsWith('lyzer edge/src')) domain = 'Frontend SPA';
    else if (fileInfo.relPath.startsWith('src-rust')) domain = 'Rust Service';
    else if (fileInfo.relPath.startsWith('packages/lyzer-constitution')) domain = 'ECA Constitution Package';
    else if (fileInfo.relPath.startsWith('packages/lyzer-shared')) domain = 'Shared Quant Package';

    // Status & Complexity
    const complexity = loc > 300 ? 'High' : loc > 100 ? 'Medium' : 'Low';
    
    // Check if the file is likely "teatro" or unused
    let status = 'ACTIVE';
    if (fileInfo.relPath.includes('src-rust/lyzer-risk-gateway') || fileInfo.relPath.includes('src-rust/lyzer-oms')) {
      status = 'TEATRO (Rust code present but currently unused by main application)';
    }

    return {
      loc,
      dependencies,
      responsibility,
      domain,
      complexity,
      status
    };
  } catch (err) {
    return {
      loc: 0,
      dependencies: [],
      responsibility: 'Error reading file metadata.',
      domain: 'Unknown',
      complexity: 'Low',
      status: 'ERROR'
    };
  }
}

function run() {
  console.log(`Scanning workspace: ${ROOT_DIR}...`);
  const files = scanDirectory(ROOT_DIR);
  console.log(`Found ${files.length} code files. Analysing...`);

  const indexEntries = [];

  for (const file of files) {
    const analysis = analyzeFile(file);
    const passportFilename = `${file.name.replace(/\./g, '_')}.md`;
    const passportPath = path.join(OUTPUT_DIR, passportFilename);

    const markdown = `# File Passport: ${file.name}

## 📊 File Metadata
*   **Path:** [${file.relPath}](file:///${ROOT_DIR.replace(/\\/g, '/')}/${file.relPath})
*   **Domain:** ${analysis.domain}
*   **Lines of Code:** ${analysis.loc}
*   **Status:** ${analysis.status}
*   **Complexity:** ${analysis.complexity}

## 🎯 Primary Responsibility
> ${analysis.responsibility}

## 🔌 Declared Dependencies
${analysis.dependencies.length > 0 
  ? analysis.dependencies.map(d => `*   \`${d}\``).join('\n')
  : '*   None detected.'
}

---
*Generated automatically by generate_passports.js on ${new Date().toISOString().split('T')[0]}.*
`;

    fs.writeFileSync(passportPath, markdown);
    
    indexEntries.push({
      name: file.name,
      relPath: file.relPath,
      passportFile: passportFilename,
      loc: analysis.loc,
      domain: analysis.domain,
      status: analysis.status
    });
  }

  // Generate PROJECT_INDEX.md
  const indexMarkdown = `# 🏛️ LYZER EDGE — CENTRAL PROJECT INDEX

> **Generated on:** ${new Date().toISOString().split('T')[0]}  
> **Total Files Indexed:** ${indexEntries.length}  

## 📦 Directory Structure & Domains

| Domain | Files Count | Cumulative Lines |
| :--- | :---: | :---: |
| **Backend Engine** | ${indexEntries.filter(e => e.domain === 'Backend Engine').length} | ${indexEntries.filter(e => e.domain === 'Backend Engine').reduce((acc, curr) => acc + curr.loc, 0)} |
| **Frontend SPA** | ${indexEntries.filter(e => e.domain === 'Frontend SPA').length} | ${indexEntries.filter(e => e.domain === 'Frontend SPA').reduce((acc, curr) => acc + curr.loc, 0)} |
| **Rust Service** | ${indexEntries.filter(e => e.domain === 'Rust Service').length} | ${indexEntries.filter(e => e.domain === 'Rust Service').reduce((acc, curr) => acc + curr.loc, 0)} |
| **ECA Constitution Package** | ${indexEntries.filter(e => e.domain === 'ECA Constitution Package').length} | ${indexEntries.filter(e => e.domain === 'ECA Constitution Package').reduce((acc, curr) => acc + curr.loc, 0)} |
| **Shared Quant Package** | ${indexEntries.filter(e => e.domain === 'Shared Quant Package').length} | ${indexEntries.filter(e => e.domain === 'Shared Quant Package').reduce((acc, curr) => acc + curr.loc, 0)} |

---

## 🗂️ File Inventory & Passports

| File Name | Domain | Lines of Code | Status | Passport |
| :--- | :--- | :---: | :--- | :---: |
${indexEntries.map(e => `| \`${e.name}\` | ${e.domain} | ${e.loc} | ${e.status} | [View Passport](./${e.passportFile}) |`).join('\n')}

---
*Created by generate_passports.js.*
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'PROJECT_INDEX.md'), indexMarkdown);
  console.log(`Index and ${indexEntries.length} passports generated successfully in knowledge/passports/.`);
}

run();
