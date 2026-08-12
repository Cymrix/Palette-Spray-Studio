const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

const missing = [];
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/document\.getElementById\(['"]([^'"]+)['"]\)\??\.addEventListener/);
    if (match) {
        const id = match[1];
        if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
            missing.push({line: i + 1, id: id, text: line.trim()});
        }
    }
}
console.log(missing);
