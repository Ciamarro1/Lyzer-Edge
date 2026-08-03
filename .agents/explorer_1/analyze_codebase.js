import fs from 'fs';
import path from 'path';

const ROOT_DIR = 'e:/projcts/lyzer';
const PASSPORTS_DIR = path.join(ROOT_DIR, 'knowledge', 'passports');

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

function scanFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(ROOT_DIR, fullPath).replace(/\\/g, '/');
    if (IGNORE_DIRS.some(d => relPath === d || relPath.startsWith(d + '/'))) continue;

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanFiles(fullPath, fileList);
    } else {
      const ext = path.extname(file);
      if (['.js', '.ts', '.rs', '.proto', '.py', '.json', '.ps1', '.html', '.md'].includes(ext)) {
        fileList.push({
          name: file,
          relPath,
          fullPath,
          ext,
          sizeBytes: stat.size
        });
      }
    }
  }
  return fileList;
}

console.log("Scanning workspace files...");
const allFiles = scanFiles(ROOT_DIR);
console.log(`Total scanned workspace files: ${allFiles.length}`);

// Load file contents into memory
const fileContentsMap = new Map();
allFiles.forEach(f => {
  try {
    const content = fs.readFileSync(f.fullPath, 'utf8');
    fileContentsMap.set(f.relPath, content);
  } catch (e) {}
});

// Read passports
const passportFiles = fs.readdirSync(PASSPORTS_DIR).filter(f => f.endsWith('.md') && f !== 'PROJECT_INDEX.md');
console.log(`Passport files found: ${passportFiles.length}`);

const passportMap = new Map();
for (const pFile of passportFiles) {
  const pPath = path.join(PASSPORTS_DIR, pFile);
  const content = fs.readFileSync(pPath, 'utf8');
  
  const pathMatch = content.match(/\*\*Path:\*\*\s*\[([^\]]+)\]/);
  const domainMatch = content.match(/\*\*Domain:\*\*\s*(.*)/);
  const locMatch = content.match(/\*\*Lines of Code:\*\*\s*(\d+)/);
  const statusMatch = content.match(/\*\*Status:\*\*\s*(.*)/);
  const respMatch = content.match(/## 🎯 Primary Responsibility\r?\n>\s*(.*)/);

  const targetRelPath = pathMatch ? pathMatch[1].trim() : '';
  passportMap.set(targetRelPath, {
    passportFile: pFile,
    targetRelPath,
    domain: domainMatch ? domainMatch[1].trim() : 'Unknown',
    loc: locMatch ? parseInt(locMatch[1], 10) : 0,
    status: statusMatch ? statusMatch[1].trim() : 'ACTIVE',
    responsibility: respMatch ? respMatch[1].trim() : ''
  });
}

// Core Entrypoints
const CORE_ENTRYPOINTS = [
  'lyzer edge/backend/server.js',
  'lyzer edge/backend/streamEngine.js',
  'lyzer edge/backend/exchangeExecution.js',
  'lyzer edge/backend/db.js',
  'lyzer edge/backend/migrations.js',
  'lyzer edge/src/main.js',
  'lyzer edge/src/app.js',
  'src-rust/lyzer-kernel/src/lib.rs',
  'src-rust/lyzer-risk-gateway/src/main.rs',
  'packages/lyzer-constitution/src/index.js',
  'packages/lyzer-constitution/src/court.js',
  'packages/lyzer-shared/src/index.js',
  'packages/lyzer-shared/src/kernel.js',
  'packages/lyzer-shared/src/providers/index.js',
  'deploy-experiments.ps1',
  'generate_passports.js',
  'scientific_validation.js',
  'red_team_audit.js'
];

const codeFiles = allFiles.filter(f => ['.js', '.ts', '.rs', '.proto', '.py'].includes(f.ext));

// Build inverted index for fast lookup
// Extract import targets from JS/TS/RS/PY/Proto files
const importMap = new Map(); // targetKey -> Array<{ sourceFile, type, line }>

const importRegex = /(?:import|require|from|use|mod|extern crate)\s+['"a-zA-Z0-9_\-\.\/@]+/g;

for (const [sourceRelPath, content] of fileContentsMap.entries()) {
  if (sourceRelPath.endsWith('.md')) continue;
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Look for string literals or identifiers in imports
    const match = line.match(/(?:import|require|from|use|mod|extern crate)\s+['"]?([^'"\s;]+)['"]?/);
    if (match) {
      const targetStr = match[1];
      const targetBase = path.basename(targetStr, path.extname(targetStr));
      
      if (!importMap.has(targetBase)) {
        importMap.set(targetBase, []);
      }
      importMap.get(targetBase).push({ source: sourceRelPath, line: idx + 1, raw: line.trim() });
    }
  });
}

// General text index (where does the file name/basename appear?)
const textOccurrences = new Map(); // baseName -> Array<{ source, count }>
for (const [sourceRelPath, content] of fileContentsMap.entries()) {
  // search
  for (const f of codeFiles) {
    const baseName = path.basename(f.relPath, f.ext);
    if (baseName.length <= 2) continue; // skip too short
    
    if (content.includes(baseName) && sourceRelPath !== f.relPath) {
      if (!textOccurrences.has(f.relPath)) {
        textOccurrences.set(f.relPath, []);
      }
      textOccurrences.get(f.relPath).push(sourceRelPath);
    }
  }
}

const analysisResults = codeFiles.map(file => {
  const relPath = file.relPath;
  const baseName = path.basename(relPath, file.ext);
  const passport = passportMap.get(relPath) || passportMap.get(relPath.replace(/\//g, '\\'));

  const imports = importMap.get(baseName) || [];
  const textRefs = textOccurrences.get(relPath) || [];

  // Filter imports to exclude self
  const validImports = imports.filter(i => i.source !== relPath);

  const importedByCore = validImports.some(i => CORE_ENTRYPOINTS.some(c => i.source.includes(c) || c.includes(i.source)));
  const importedByTest = validImports.some(i => i.source.includes('test') || i.source.includes('spec'));
  const importedByScript = validImports.some(i => i.source.startsWith('run_') || i.source.endsWith('.ps1'));

  let category = 'Ambiguous / Needs Verification';
  let reason = '';

  const isCoreModule = CORE_ENTRYPOINTS.includes(relPath) || relPath.startsWith('packages/lyzer-constitution') || relPath.startsWith('packages/lyzer-shared');

  if (isCoreModule || importedByCore) {
    category = 'Active Core';
    reason = 'Core entrypoint or directly imported by core engine/server/providers.';
  } else if (validImports.length === 0) {
    // Check if referenced in non-doc code files
    const codeTextRefs = textRefs.filter(r => !r.endsWith('.md') && !r.startsWith('knowledge/passports/'));
    if (codeTextRefs.length === 0) {
      category = 'Definitely Dead / Orphaned';
      reason = '0 code imports and 0 references in non-documentation codebase.';
    } else {
      const nonTestCodeTextRefs = codeTextRefs.filter(r => !r.includes('test') && !r.includes('spec'));
      if (nonTestCodeTextRefs.length === 0) {
        category = 'Definitely Dead / Orphaned';
        reason = `0 code imports; referenced only in test files (${codeTextRefs.join(', ')}).`;
      } else {
        category = 'Ambiguous / Needs Verification';
        reason = `0 code imports, but mentioned as string/identifier in: ${nonTestCodeTextRefs.join(', ')}`;
      }
    }
  } else {
    // validImports > 0
    const nonTestImports = validImports.filter(i => !i.source.includes('test') && !i.source.includes('spec'));
    if (nonTestImports.length === 0) {
      category = 'Ambiguous / Needs Verification';
      reason = `Imported exclusively in test files (${validImports.map(i => i.source).join(', ')}). Feature orphaned from main pipeline.`;
    } else {
      const activeImports = nonTestImports.filter(i => !i.source.startsWith('run_') && !i.source.endsWith('.ps1'));
      if (activeImports.length > 0) {
        category = 'Active Core';
        reason = `Imported by active application code: ${activeImports.map(i => i.source).slice(0, 3).join(', ')}`;
      } else {
        category = 'Ambiguous / Needs Verification';
        reason = `Imported only by standalone run/audit scripts: ${nonTestImports.map(i => i.source).join(', ')}`;
      }
    }
  }

  return {
    name: file.name,
    relPath,
    ext: file.ext,
    sizeBytes: file.sizeBytes,
    passportFile: passport ? passport.passportFile : null,
    domain: passport ? passport.domain : 'Unindexed',
    loc: passport ? passport.loc : 0,
    passportStatus: passport ? passport.status : 'N/A',
    responsibility: passport ? passport.responsibility : '',
    importsCount: validImports.length,
    importSources: validImports.map(i => `${i.source}:${i.line}`),
    textRefsCount: textRefs.length,
    textRefsSources: textRefs,
    category,
    reason
  };
});

const deadList = analysisResults.filter(r => r.category === 'Definitely Dead / Orphaned');
const activeList = analysisResults.filter(r => r.category === 'Active Core');
const ambiguousList = analysisResults.filter(r => r.category === 'Ambiguous / Needs Verification');

console.log("\n--- ANALYSIS SUMMARY ---");
console.log(`Total Code Files: ${analysisResults.length}`);
console.log(`Active Core: ${activeList.length}`);
console.log(`Ambiguous / Needs Verification: ${ambiguousList.length}`);
console.log(`Definitely Dead / Orphaned: ${deadList.length}`);

// Save JSON
fs.writeFileSync(
  path.join(ROOT_DIR, '.agents', 'explorer_1', 'analysis_raw.json'),
  JSON.stringify(analysisResults, null, 2)
);

console.log("Analysis saved to .agents/explorer_1/analysis_raw.json successfully.");
