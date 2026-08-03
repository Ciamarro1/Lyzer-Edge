import fs from 'fs';
import path from 'path';

const rawDataPath = 'e:/projcts/lyzer/.agents/explorer_1/analysis_raw.json';
const data = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

console.log(`Loaded ${data.length} records.`);

const dead = data.filter(r => r.category === 'Definitely Dead / Orphaned');
const ambiguous = data.filter(r => r.category === 'Ambiguous / Needs Verification');
const active = data.filter(r => r.category === 'Active Core');

console.log(`Dead: ${dead.length}`);
console.log(`Ambiguous: ${ambiguous.length}`);
console.log(`Active: ${active.length}`);

// Group by domain
function groupByDomain(list) {
  const map = {};
  list.forEach(item => {
    const domain = item.domain || 'Unknown';
    if (!map[domain]) map[domain] = [];
    map[domain].push(item);
  });
  return map;
}

console.log("\n--- DEAD FILES BY DOMAIN ---");
const deadByDomain = groupByDomain(dead);
for (const [dom, items] of Object.entries(deadByDomain)) {
  const totalLoc = items.reduce((a, b) => a + (b.loc || 0), 0);
  console.log(`Domain [${dom}]: ${items.length} files (${totalLoc} LOC)`);
}

console.log("\n--- AMBIGUOUS FILES BY DOMAIN ---");
const ambByDomain = groupByDomain(ambiguous);
for (const [dom, items] of Object.entries(ambByDomain)) {
  const totalLoc = items.reduce((a, b) => a + (b.loc || 0), 0);
  console.log(`Domain [${dom}]: ${items.length} files (${totalLoc} LOC)`);
}

// Check special file patterns:
// 1. Legacy experimental files (e.g. EVAlphaResearchEngineV3.js, EVAlphaResearchEngineV3_3.js, CounterfactualWorldSimulator.js)
// 2. Teatral Rust files (lyzer-risk-gateway, lyzer-oms)
// 3. Obsolete scientific validation scripts
// 4. Standalone widgets / frontend engines never imported in router or main app

console.log("\n--- RUST SERVICE FILES ---");
const rustFiles = data.filter(r => r.domain === 'Rust Service' || r.relPath.startsWith('src-rust'));
console.log(`Rust files count: ${rustFiles.length}`);
rustFiles.forEach(rf => {
  console.log(` - ${rf.relPath} | Status: ${rf.passportStatus} | Cat: ${rf.category} | Reason: ${rf.reason}`);
});

console.log("\n--- SAMPLE DEAD FILES (Top 25 by LOC) ---");
dead.sort((a, b) => b.loc - a.loc).slice(0, 25).forEach(d => {
  console.log(` - [${d.domain}] ${d.relPath} (${d.loc} LOC) | Reason: ${d.reason}`);
});

console.log("\n--- SAMPLE AMBIGUOUS FILES (Top 20 by LOC) ---");
ambiguous.sort((a, b) => b.loc - a.loc).slice(0, 20).forEach(a => {
  console.log(` - [${a.domain}] ${a.relPath} (${a.loc} LOC) | Reason: ${a.reason}`);
});
