import { readFileSync, existsSync } from 'fs';
import crypto from 'crypto';

const files = [
  'C:\\Users\\WDAGUtilityAccount\\Downloads\\logs.1788248583209.json',
  'C:\\Users\\WDAGUtilityAccount\\Downloads\\historical_causal_memory.db',
  'C:\\Users\\WDAGUtilityAccount\\Downloads\\historical_causal_memory.db-wal'
];

console.log('='.repeat(90));
console.log('🔒 COMPUTING SHA-256 HASHES FOR IMMUTABLE SOAK CERTIFICATE');
console.log('='.repeat(90));

for (const f of files) {
  if (existsSync(f)) {
    const buf = readFileSync(f);
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const sizeMB = (buf.length / (1024 * 1024)).toFixed(2);
    console.log(`File:    ${f}`);
    console.log(`Size:    ${sizeMB} MB (${buf.length.toLocaleString()} bytes)`);
    console.log(`SHA-256: ${hash}\n`);
  } else {
    console.log(`File missing: ${f}\n`);
  }
}
