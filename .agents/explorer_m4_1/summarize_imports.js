const fs = require('fs');

const map = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\detailed_import_map.json', 'utf8'));

console.log(`Total mapped imports: ${map.mappedImportsCount}`);

const importsBySourceGroup = {};

map.mappedImports.forEach(imp => {
    const srcGroup = imp.sourceFile.split('\\')[0];
    if (!importsBySourceGroup[srcGroup]) importsBySourceGroup[srcGroup] = [];
    importsBySourceGroup[srcGroup].push(imp);
});

for (const [group, items] of Object.entries(importsBySourceGroup)) {
    console.log(`\nGroup [${group}]: ${items.length} imports`);
    items.slice(0, 10).forEach(i => {
        console.log(`  ${i.sourceFile}:${i.line} -> "${i.importPath}" (Target: ${i.resolvedTarget})`);
    });
}
