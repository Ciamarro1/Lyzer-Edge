const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const targetDirs = [
  'E:\\projcts\\lyzer\\packages',
  'E:\\projcts\\lyzer\\lyzer edge\\backend'
];

console.log('=== DETAILED PATTERN ANALYSIS ===\n');

targetDirs.forEach(dir => {
  const files = walk(dir);
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      let parsedVarName = null;
      let parseLineNum = 0;

      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        // 1. Detect JSON.parse
        if (line.includes('JSON.parse')) {
          console.log(`[JSON_PARSE] ${filePath}:${lineNum}\n  Snippet: ${trimmed}`);

          // Extract variable receiving JSON.parse
          const match = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*JSON\.parse/);
          if (match) {
            parsedVarName = match[1];
            parseLineNum = lineNum;
          }
        }

        // 2. Check for object spread containing external / parsed data or spread in general
        if (line.includes('{ ...') || line.includes('{...') || line.includes('...')) {
          if (line.includes('{') && line.includes('...')) {
            console.log(`[SPREAD_OP] ${filePath}:${lineNum}\n  Snippet: ${trimmed}`);
          }
        }

        // 3. Check for Object.assign
        if (line.includes('Object.assign')) {
          console.log(`[OBJECT_ASSIGN] ${filePath}:${lineNum}\n  Snippet: ${trimmed}`);
        }

        // 4. Check for dynamic property assignment obj[key] = val
        if (line.match(/[a-zA-Z0-9_$]+\s*\[\s*[a-zA-Z0-9_$.]+\s*\]\s*=/)) {
          // Exclude simple array index assignment if key is numeric like i, idx, 0
          if (!line.match(/\[\s*(?:i|j|k|idx|index|0|1|2|3|4|5|6|7|8|9|10)\s*\]/)) {
            console.log(`[DYNAMIC_ASSIGN] ${filePath}:${lineNum}\n  Snippet: ${trimmed}`);
          }
        }

      });
    } catch (e) {
      // ignore
    }
  });
});
