const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootDir = 'E:\\projcts\\lyzer';
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', 'target', '_archive', '.agents', '.opencode', 'coverage']);

const fileHashMap = new Map();

function hashFile(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (e) {
        return null;
    }
}

function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (ignoreDirs.has(entry.name)) continue;
            scanDir(path.join(dir, entry.name));
        } else if (entry.isFile()) {
            const fullPath = path.join(dir, entry.name);
            const hash = hashFile(fullPath);
            if (hash) {
                if (!fileHashMap.has(hash)) {
                    fileHashMap.set(hash, []);
                }
                fileHashMap.get(hash).push(path.relative(rootDir, fullPath));
            }
        }
    }
}

scanDir(rootDir);

const duplicates = [];
for (const [hash, files] of fileHashMap.entries()) {
    if (files.length > 1) {
        duplicates.push({ hash, count: files.length, files });
    }
}

const outputPath = 'E:\\projcts\\lyzer\\.agents\\explorer_m4_1\\duplicate_scan.json';
fs.writeFileSync(outputPath, JSON.stringify(duplicates, null, 2));
console.log(`Found ${duplicates.length} duplicate hash groups. Saved to ${outputPath}`);
