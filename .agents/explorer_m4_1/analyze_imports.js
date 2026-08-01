const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\projcts\\lyzer';
const duplicateScan = JSON.parse(fs.readFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\duplicate_scan.json', 'utf8'));

// Filter duplicates between packages/ and lyzer edge/ or root src/
const packageEdgeDuplicates = [];
const docAuditDuplicates = [];
const otherDuplicates = [];

for (const group of duplicateScan) {
    const hasPackage = group.files.some(f => f.startsWith('packages\\'));
    const hasEdge = group.files.some(f => f.startsWith('lyzer edge\\'));
    
    if (hasPackage && hasEdge) {
        packageEdgeDuplicates.push(group);
    } else if (group.files.some(f => f.includes('engineering-audit') || f.includes('HANDOFF.md'))) {
        docAuditDuplicates.push(group);
    } else {
        otherDuplicates.push(group);
    }
}

console.log(`Package vs Edge Duplicates: ${packageEdgeDuplicates.length}`);
console.log(`Doc / Audit Duplicates: ${docAuditDuplicates.length}`);
console.log(`Other Duplicates: ${otherDuplicates.length}`);

// Collect all file paths of duplicates in lyzer edge/ that have a counterpart in packages/
const edgeFilesToRemove = new Set();
const fileMapping = {}; // lyzer edge relative path -> packages canonical relative path

for (const group of packageEdgeDuplicates) {
    const pkgFile = group.files.find(f => f.startsWith('packages\\'));
    const edgeFile = group.files.find(f => f.startsWith('lyzer edge\\'));
    if (pkgFile && edgeFile) {
        edgeFilesToRemove.add(edgeFile);
        fileMapping[edgeFile] = pkgFile;
    }
}

// Now search for import/require statements across the entire repository referencing these edge files or package files
const allJsTsFiles = [];
function findJsTsFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(rootDir, fullPath);
        if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'build', 'target', '_archive', '.agents', '.opencode'].includes(entry.name)) continue;
            findJsTsFiles(fullPath);
        } else if (entry.isFile() && /\.(js|jsx|ts|tsx|json|mjs|cjs)$/.test(entry.name)) {
            allJsTsFiles.push(relPath);
        }
    }
}

findJsTsFiles(rootDir);

const importReferences = [];

// Regular expression to match require('...') and import ... from '...' or import('...')
const importRegex = /(?:require\(['"]([^'"]+)['"]\)|from\s+['"]([^'"]+)['"]|import\(['"]([^'"]+)['"]\))/g;

for (const file of allJsTsFiles) {
    const fullPath = path.join(rootDir, file);
    try {
        const content = fs.readFileSync(fullPath, 'utf8');
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1] || match[2] || match[3];
            // Check if importPath references any duplicate file
            importReferences.push({
                sourceFile: file,
                importPath: importPath,
                line: content.substring(0, match.index).split('\n').length
            });
        }
    } catch (e) {
        // ignore read errors
    }
}

const analysisResult = {
    summary: {
        totalDuplicates: duplicateScan.length,
        packageVsEdgeDuplicatesCount: packageEdgeDuplicates.length,
        docAuditDuplicatesCount: docAuditDuplicates.length,
        otherDuplicatesCount: otherDuplicates.length,
        totalJsTsFilesScanned: allJsTsFiles.length,
        totalImportStatementsFound: importReferences.length
    },
    packageVsEdgeDuplicates: packageEdgeDuplicates,
    docAuditDuplicates: docAuditDuplicates,
    otherDuplicates: otherDuplicates,
    importReferences: importReferences
};

fs.writeFileSync('E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_analysis.json', JSON.stringify(analysisResult, null, 2));
console.log('Analysis saved to E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\import_analysis.json');
