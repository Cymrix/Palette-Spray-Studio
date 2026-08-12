import os

with open('index.html', 'r') as f:
    html = f.read()

target = """      <div class="divider"></div>
      <button class="btn icon" id="topbarSaveBtn" title="Save Project">💾</button>
      <button class="btn small" id="backupToggleBtn" title="Choose a folder to keep timestamped backup copies in">Backups: Off</button>"""

replacement = """      <div class="divider"></div>
      <div style="display:flex; align-items:center; background:var(--panel-2); border:1px solid var(--line); border-radius:4px; padding:0 2px;">
        <span id="saveLocationIndicator" title="Local File" style="font-size:12px; margin-left:4px; margin-right:2px; cursor:default; user-select:none;">💻</span>
        <button class="btn icon" id="topbarSaveBtn" title="Save Project" style="background:transparent; border:none; box-shadow:none;">💾</button>
      </div>
      <button class="btn small" id="backupToggleBtn" title="Toggle Auto-Backups">Backups: Off</button>"""

if target in html:
    html = html.replace(target, replacement)
    with open('index.html', 'w') as f:
        f.write(html)
    print('Top bar HTML patched')
else:
    print('Target not found')
