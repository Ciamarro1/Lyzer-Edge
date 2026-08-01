const fs = require('fs');
const content = fs.readFileSync('E:\\projcts\\lyzer\\lyzer edge\\backend\\server.js', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('fetch') || line.includes('telegram') || line.includes('webhook') || line.includes('url') || line.includes('http')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
