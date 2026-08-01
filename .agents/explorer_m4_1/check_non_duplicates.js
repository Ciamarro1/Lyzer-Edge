const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\projcts\\lyzer';
const duplicateScan = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\duplicate_scan.json', 'utf8'));

const duplicateEdgeFiles = new Set();
duplicateScan.forEach(g => {
    g.files.forEach(f => {
        if (f.startsWith('lyzer edge\\src\\')) {
            duplicateEdgeFiles.add(f);
        }
    });
});

const allEdgeSrcFiles = [];
function scanEdgeSrc(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(rootDir, fullPath);
        if (entry.isDirectory()) {
            scanEdgeSrc(fullPath);
        } else if (entry.isFile()) {
            allEdgeSrcFiles.push(relPath);
        }
    }
}

scanEdgeSrc('E:\\projcts\\lyzer\\lyzer edge\\src');

const nonDuplicateEdgeSrcFiles = allEdgeSrcFiles.filter(f => !duplicateEdgeFiles.has(f));

console.log(`Total files in lyzer edge/src/: ${allEdgeSrcFiles.length}`);
console.log(`Duplicate files in lyzer edge/src/: ${duplicateEdgeFiles.size}`);
console.log(`Non-duplicate files in lyzer edge/src/: ${nonDuplicateEdgeSrcFiles.length}`);
console.log(`\nNon-duplicate files in lyzer edge/src/:`);
nonDuplicateEdgeSrcFiles.forEach(f => console.log(`  - ${f}`));
