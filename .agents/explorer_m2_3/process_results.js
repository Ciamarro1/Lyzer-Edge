const fs = require('fs');
const path = require('path');

const resultsFile = 'E:\\projcts\\lyzer\\.agents\\explorer_m2_3\\scan_results.json';
const outputFile = 'E:\\projcts\\lyzer\\.agents\\explorer_m2_3\\summary_output.txt';

try {
  let content = fs.readFileSync(resultsFile, 'utf8');
  if (content.startsWith('\uFEFF')) {
    content = content.slice(1);
  }
  const data = JSON.parse(content);
  
  const fileGroups = {};
  data.forEach(item => {
    if (!fileGroups[item.file]) fileGroups[item.file] = [];
    fileGroups[item.file].push(item);
  });

  const summary = Object.keys(fileGroups).map(file => ({
    file,
    count: fileGroups[file].length,
    patterns: Array.from(new Set(fileGroups[file].map(i => i.pattern))),
    items: fileGroups[file]
  }));

  let out = `Total occurrences found: ${data.length}\n\n--- SUMMARY BY FILE ---\n`;
  summary.forEach(s => {
    out += `\n[${s.file}] (${s.count} matches) Patterns: ${s.patterns.join(', ')}\n`;
    s.items.forEach(item => {
      out += `  L${item.lineNumber} [${item.pattern}]: ${item.line.slice(0, 150)}\n`;
    });
  });

  fs.writeFileSync(outputFile, out, 'utf8');
  console.log(`Summary written to ${outputFile}`);

} catch (err) {
  console.error('Error reading/parsing results:', err);
}
