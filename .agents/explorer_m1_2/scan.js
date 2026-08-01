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
      if (file !== 'node_modules' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.json')) {
      results.push(fullPath);
    }
  });
  return results;
}

const targetDirs = [
  'E:\\projcts\\lyzer\\packages',
  'E:\\projcts\\lyzer\\lyzer edge'
];

console.log('=== SEARCHING FOR JSON.parse, Object.assign, SPREAD AND MERGE ===');

targetDirs.forEach(dir => {
  const files = walk(dir);
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        if (line.includes('JSON.parse')) {
          console.log(`[JSON.parse] ${filePath}:${lineNum}:${line.trim()}`);
        }
        if (line.includes('Object.assign')) {
          console.log(`[Object.assign] ${filePath}:${lineNum}:${line.trim()}`);
        }
        if (line.includes('__proto__') || line.includes('constructor.prototype')) {
          console.log(`[PROTO_POLLUTION_KW] ${filePath}:${lineNum}:${line.trim()}`);
        }
      });
    } catch (e) {
      // ignore
    }
  });
});
