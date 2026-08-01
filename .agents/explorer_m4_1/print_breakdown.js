const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_analysis.json', 'utf8'));

console.log('--- PACKAGE VS EDGE DUPLICATES (64) ---');
data.packageVsEdgeDuplicates.forEach((g, idx) => {
    const pkg = g.files.find(f => f.startsWith('packages\\'));
    const edge = g.files.find(f => f.startsWith('lyzer edge\\'));
    console.log(`${idx + 1}. Edge: "${edge}" <==> Package: "${pkg}"`);
});

console.log('\n--- DOC / AUDIT DUPLICATES (53) ---');
data.docAuditDuplicates.forEach((g, idx) => {
    console.log(`${idx + 1}. Files: ${g.files.join(' <==> ')}`);
});

console.log('\n--- OTHER DUPLICATES (3) ---');
data.otherDuplicates.forEach((g, idx) => {
    console.log(`${idx + 1}. Files: ${g.files.join(' <==> ')}`);
});
