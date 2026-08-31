import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const dir = 'research/datasets';
const files = readdirSync(dir);

console.log('='.repeat(85));
console.log('📊 AUDITORIA FORENSE DE DATASETS EM ' + dir);
console.log('='.repeat(85));

for (const file of files) {
  const fullPath = join(dir, file);
  const stat = statSync(fullPath);
  if (stat.isDirectory()) continue;
  
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  
  if (file.endsWith('.json')) {
    try {
      const content = JSON.parse(readFileSync(fullPath, 'utf8'));
      if (Array.isArray(content)) {
        const count = content.length;
        const first = content[0] || {};
        const last = content[content.length - 1] || {};
        const keys = Object.keys(first);
        
        let startIso = 'N/A';
        let endIso = 'N/A';
        if (first.openTime) startIso = new Date(first.openTime).toISOString();
        else if (first.timestamp) startIso = new Date(first.timestamp).toISOString();
        else if (first.fundingTime) startIso = new Date(first.fundingTime).toISOString();
        
        if (last.openTime) endIso = new Date(last.openTime).toISOString();
        else if (last.timestamp) endIso = new Date(last.timestamp).toISOString();
        else if (last.fundingTime) endIso = new Date(last.fundingTime).toISOString();
        
        console.log(`File: ${file.padEnd(40)} | Size: ${(sizeMB + ' MB').padStart(8)} | Count: ${String(count).padStart(7)} | ${startIso.slice(0, 10)} -> ${endIso.slice(0, 10)}`);
        console.log(`      Keys: [${keys.join(', ')}]`);
      } else {
        console.log(`File: ${file.padEnd(40)} | Size: ${(sizeMB + ' MB').padStart(8)} | Non-array JSON`);
      }
    } catch (e) {
      console.log(`File: ${file.padEnd(40)} | Size: ${(sizeMB + ' MB').padStart(8)} | Error: ${e.message}`);
    }
  } else {
    console.log(`File: ${file.padEnd(40)} | Size: ${(sizeMB + ' MB').padStart(8)} | Script / Code file`);
  }
  console.log('-'.repeat(85));
}
