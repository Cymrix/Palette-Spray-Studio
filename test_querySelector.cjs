const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/document\.querySelector\(['"]([^'"]+)['"]\)\??\.addEventListener/);
    if (match) {
        console.log(`line ${i+1}: ${line.trim()}`);
    }
}
