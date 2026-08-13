const fs = require('fs');
const code = fs.readFileSync('temp.js', 'utf8');
let depth = 0;
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') depth++;
    if (line[j] === '}') depth--;
  }
  if (depth === 0 && line.includes('function') && !line.includes('(')) {
     // this is tricky, just print depth at interesting points
  }
}
console.log("Final depth:", depth);
