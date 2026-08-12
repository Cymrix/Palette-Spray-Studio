const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

const regex = /^.*\.addEventListener.*$/gm;
let match;
while ((match = regex.exec(html)) !== null) {
    const line = match[0].trim();
    if (line.includes('?.addEventListener')) continue;
    if (line.includes('window.addEventListener')) continue;
    if (line.includes('document.addEventListener')) continue;
    console.log(line);
}
