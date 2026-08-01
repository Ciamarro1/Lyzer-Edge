const fs = require('fs');

const map = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\detailed_import_map.json', 'utf8'));

// Filter imports by type
const relativeImportsInEdgeSrc = [];
const relativeImportsInEdgeBackend = [];
const relativeImportsInEdgeTests = [];
const importsInPackages = [];
const importsInRoot = [];
const packageAliasImports = [];

map.mappedImports.forEach(imp => {
    if (imp.importPath.startsWith('@lyzer/')) {
        packageAliasImports.push(imp);
    } else if (imp.sourceFile.startsWith('lyzer edge\\src\\')) {
        relativeImportsInEdgeSrc.push(imp);
    } else if (imp.sourceFile.startsWith('lyzer edge\\backend\\')) {
        relativeImportsInEdgeBackend.push(imp);
    } else if (imp.sourceFile.startsWith('lyzer edge\\tests\\')) {
        relativeImportsInEdgeTests.push(imp);
    } else if (imp.sourceFile.startsWith('packages\\')) {
        importsInPackages.push(imp);
    } else {
        importsInRoot.push(imp);
    }
});

console.log(`Summary of 202 mapped import references:`);
console.log(`- Relative imports within lyzer edge/src/: ${relativeImportsInEdgeSrc.length}`);
console.log(`- Relative imports within lyzer edge/backend/: ${relativeImportsInEdgeBackend.length}`);
console.log(`- Relative imports within lyzer edge/tests/: ${relativeImportsInEdgeTests.length}`);
console.log(`- Imports within packages/: ${importsInPackages.length}`);
console.log(`- Imports in root / other: ${importsInRoot.length}`);
console.log(`- Package alias (@lyzer/*) imports already present: ${packageAliasImports.length}`);

// Save detailed breakdown to JSON file
const breakdown = {
    relativeImportsInEdgeSrc,
    relativeImportsInEdgeBackend,
    relativeImportsInEdgeTests,
    importsInPackages,
    importsInRoot,
    packageAliasImports
};

fs.writeFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_breakdown_categorized.json', JSON.stringify(breakdown, null, 2));
