import fs from 'fs';
import sqlite3 from 'sqlite3';

async function main() {
  // Let's check trade_reconstruction.csv
  const csv = fs.readFileSync('../knowledge/runtime_audit/trade_reconstruction.csv', 'utf8');
  const lines = csv.trim().split('\n');
  console.log('trade_reconstruction.csv lines:', lines.length);

  // Let's check research_dataset.csv
  const rcsv = fs.readFileSync('../knowledge/research/datasets/research_dataset.csv', 'utf8');
  const rlines = rcsv.trim().split('\n');
  console.log('research_dataset.csv lines:', rlines.length);

  // Let's check if there's any file in the whole repo with exactly 64 trades or records
  // Also check candles in historical_causal_memory.db: 43000 candles
}

main().catch(console.error);
