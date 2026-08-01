const fs = require('fs');
const path = require('path');

const rootDir = 'E:\\projcts\\lyzer';
const outputFile = 'E:\\projcts\\lyzer\\.agents\\explorer_m2_3\\scan_results.json';
const ignoreDirs = new Set(['node_modules', 'dist', '_archive', '.git', '.opencode', 'coverage', 'build']);

const networkPatterns = [
  { name: 'fetch', regex: /\bfetch\s*\(/g },
  { name: 'axios_import', regex: /require\(['"`]axios['"`]\)|from\s+['"`]axios['"`]/g },
  { name: 'axios_call', regex: /\baxios\s*[\(\.]/g },
  { name: 'http_import', regex: /require\(['"`]http['"`]\)|from\s+['"`]http['"`]/g },
  { name: 'https_import', regex: /require\(['"`]https['"`]\)|from\s+['"`]https['"`]/g },
  { name: 'http_get_request', regex: /\b(http|https)\.(get|request)\s*\(/g },
  { name: 'websocket_import', regex: /require\(['"`]ws['"`]\)|from\s+['"`]ws['"`]/g },
  { name: 'websocket_instantiation', regex: /new\s+(WebSocket|ws)\s*\(/g },
  { name: 'net_socket', regex: /\bnet\.(connect|createConnection)\s*\(/g },
  { name: 'got_import', regex: /require\(['"`]got['"`]\)|from\s+['"`]got['"`]/g },
  { name: 'request_lib', regex: /require\(['"`]request['"`]\)|from\s+['"`]request['"`]/g },
  { name: 'node_fetch', regex: /require\(['"`]node-fetch['"`]\)|from\s+['"`]node-fetch['"`]/g },
  { name: 'url_literal_http', regex: /https?:\/\/[^\s'"`]+/g },
  { name: 'ws_literal', regex: /wss?:\/\/[^\s'"`]+/g },
  { name: 'child_process_curl', regex: /\b(curl|wget)\b/g },
  { name: 'python_requests', regex: /\brequests\.(get|post|put|delete|patch|head|options|request)\s*\(/g },
  { name: 'python_urllib', regex: /\burllib\.request\b/g },
  { name: 'rust_reqwest', regex: /\breqwest\b/g }
];

const results = [];

function walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name) || (dir === rootDir && entry.name === '.agents')) {
        continue;
      }
      walk(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.py', '.rs', '.pine', '.sh', '.ps1', '.json', '.env', '.env.example'].includes(ext) || entry.name.startsWith('.env')) {
        scanFile(fullPath);
      }
    }
  }
}

function scanFile(filePath) {
  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return;
  }
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    for (const pat of networkPatterns) {
      pat.regex.lastIndex = 0;
      if (pat.regex.test(line)) {
        if (filePath.endsWith('package-lock.json') || filePath.includes('scan_network_calls.js') || filePath.includes('scan_results.json')) continue;
        results.push({
          file: path.relative(rootDir, filePath),
          lineNumber: idx + 1,
          pattern: pat.name,
          line: line.trim()
        });
        break;
      }
    }
  });
}

console.log('Starting scan...');
walk(rootDir);
fs.writeFileSync(outputFile, JSON.stringify(results, null, 2), 'utf8');
console.log(`Scan completed. Found ${results.length} matches written to ${outputFile}`);
