const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const target = `<div class="divider"></div>
      <button class="btn icon" id="topbarSaveBtn" title="Save Project">💾</button>
      <button class="btn small" id="backupToggleBtn" title="Choose a folder to keep timestamped backup copies in">Backups: Off</button>`;

const replacement = `<div class="divider"></div>
      <div style="display:flex; align-items:center; background:var(--panel-2); border:1px solid var(--line); border-radius:4px; padding:0 2px;">
        <span id="saveLocationIndicator" title="Local File" style="font-size:12px; margin-left:4px; margin-right:2px; cursor:default; user-select:none;">💻</span>
        <button class="btn icon" id="topbarSaveBtn" title="Save Project" style="background:transparent; border:none;">💾</button>
      </div>
      <button class="btn small" id="backupToggleBtn" title="Toggle Auto-Backups">Backups: Off</button>`;

if (html.includes(target)) {
  html = html.replace(target, replacement);
  fs.writeFileSync('index.html', html);
  console.log('Top bar HTML patched');
} else {
  console.log('Target not found');
}
