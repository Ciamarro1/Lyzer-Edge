import fs from 'fs';
import path from 'path';

function search(dir, regex) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath, regex);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (regex.test(content)) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (regex.test(line)) console.log(`${i+1}: ${line.trim()}`);
        });
      }
    }
  }
}

search('c:/Users/WDAGUtilityAccount/Documents/lyzer edge/src', /TruthKernel|Intermediate Representation|IR|Priority/i);
