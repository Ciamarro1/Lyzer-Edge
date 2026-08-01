const fs = require('fs');

const breakdown = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_breakdown_categorized.json', 'utf8'));

console.log('=== RELATIVE IMPORTS IN LYZER EDGE / SRC ===');
breakdown.relativeImportsInEdgeSrc.forEach((i, idx) => {
    console.log(`${idx+1}. ${i.sourceFile}:${i.line} imports "${i.importPath}" -> Target: ${i.resolvedTarget} (Canonical: ${i.canonicalPackageFile})`);
});

console.log('\n=== RELATIVE IMPORTS IN LYZER EDGE / BACKEND ===');
breakdown.relativeImportsInEdgeBackend.forEach((i, idx) => {
    console.log(`${idx+1}. ${i.sourceFile}:${i.line} imports "${i.importPath}" -> Target: ${i.resolvedTarget} (Canonical: ${i.canonicalPackageFile})`);
});

console.log('\n=== RELATIVE IMPORTS IN LYZER EDGE / TESTS ===');
breakdown.relativeImportsInEdgeTests.forEach((i, idx) => {
    console.log(`${idx+1}. ${i.sourceFile}:${i.line} imports "${i.importPath}" -> Target: ${i.resolvedTarget} (Canonical: ${i.canonicalPackageFile})`);
});
