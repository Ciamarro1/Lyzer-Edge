const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\projcts\\lyzer';
const importData = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_analysis.json', 'utf8'));

// Build canonical map
// Edge file (relative to root, e.g. "lyzer edge\src\router.js") -> Package file (e.g. "packages\lyzer-shared\src\router.js")
const edgeToPackageMap = {};
const packageToEdgeMap = {};

for (const group of importData.packageVsEdgeDuplicates) {
    const pkg = group.files.find(f => f.startsWith('packages\\'));
    const edge = group.files.find(f => f.startsWith('lyzer edge\\'));
    if (pkg && edge) {
        edgeToPackageMap[edge] = pkg;
        packageToEdgeMap[pkg] = edge;
    }
}

// Find all imports in the codebase and check what they import
const mappedImports = [];

for (const item of importData.importReferences) {
    const srcFile = item.sourceFile;
    const impPath = item.importPath;

    // Check if import is relative or package-based
    let isPackageImport = impPath.startsWith('@lyzer/');
    let resolvedTarget = null;

    if (impPath.startsWith('.')) {
        // Relative import
        const srcDir = path.dirname(path.join(rootDir, srcFile));
        let absTarget = path.resolve(srcDir, impPath);
        
        // Try appending extensions if file doesn't exist
        const exts = ['', '.js', '.ts', '.jsx', '.tsx', '/index.js', '/index.ts'];
        for (const ext of exts) {
            if (fs.existsSync(absTarget + ext) && fs.statSync(absTarget + ext).isFile()) {
                resolvedTarget = path.relative(rootDir, absTarget + ext);
                break;
            }
        }
    }

    const targetsDuplicate = resolvedTarget && (edgeToPackageMap[resolvedTarget] || packageToEdgeMap[resolvedTarget]);

    if (targetsDuplicate || isPackageImport || impPath.includes('lyzer edge') || impPath.includes('packages')) {
        mappedImports.push({
            sourceFile: srcFile,
            line: item.line,
            importPath: impPath,
            resolvedTarget: resolvedTarget,
            canonicalPackageFile: resolvedTarget ? (edgeToPackageMap[resolvedTarget] || resolvedTarget) : null,
            belongsToDuplicate: !!targetsDuplicate
        });
    }
}

const detailedMapping = {
    canonicalDuplicates: edgeToPackageMap,
    mappedImportsCount: mappedImports.length,
    mappedImports: mappedImports
};

fs.writeFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\detailed_import_map.json', JSON.stringify(detailedMapping, null, 2));
console.log(`Detailed import mapping saved. Total mapped imports: ${mappedImports.length}`);
