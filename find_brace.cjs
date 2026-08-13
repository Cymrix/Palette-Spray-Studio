const fs = require('fs');
const code = fs.readFileSync('temp.js', 'utf8');
let depth = 0;
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  let oldDepth = depth;
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '{') depth++;
    if (line[j] === '}') depth--;
  }
  if (depth === 1 && oldDepth === 0) {
    console.log("Became 1 at line:", i + 1, line.trim());
  }
}
console.log("Final depth:", depth);
