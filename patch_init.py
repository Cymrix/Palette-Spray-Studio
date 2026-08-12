import os

with open('index.html', 'r') as f:
    html = f.read()

target = """  refreshGridPanel();
  drawGridOverlay();
  refreshMatrixTimeline();
  initPanelSectionManager();"""

replacement = """  refreshGridPanel();
  drawGridOverlay();
  refreshMatrixTimeline();
  initPanelSectionManager();
  syncBackupUI();"""

if target in html:
    html = html.replace(target, replacement)
    print('Init patched')

with open('index.html', 'w') as f:
    f.write(html)
