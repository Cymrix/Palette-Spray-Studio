import os

with open('index.html', 'r') as f:
    html = f.read()

target = """    if (activeSaveLocation === 'cloud') {
      if (locInd) { locInd.textContent = '☁️'; locInd.title = 'Cloud File'; }
      const cloudOn = document.getElementById('cloudBackupsCheckbox')?.checked;"""

replacement = """    if (activeSaveLocation === 'cloud') {
      if (locInd) { locInd.textContent = '☁️'; locInd.title = 'Cloud File'; }
      const menuSave = document.getElementById('saveProjectBtn');
      if (menuSave) menuSave.innerHTML = '☁️ Save to Cloud';
      const cloudOn = document.getElementById('cloudBackupsCheckbox')?.checked;"""

target2 = """    } else {
      if (locInd) { locInd.textContent = '💻'; locInd.title = 'Local File'; }
      const localOn = !!backupDirHandle;"""

replacement2 = """    } else {
      if (locInd) { locInd.textContent = '💻'; locInd.title = 'Local File'; }
      const menuSave = document.getElementById('saveProjectBtn');
      if (menuSave) menuSave.innerHTML = '💾 Save Project';
      const localOn = !!backupDirHandle;"""

if target in html and target2 in html:
    html = html.replace(target, replacement)
    html = html.replace(target2, replacement2)
    print('Menu indicator patched')

with open('index.html', 'w') as f:
    f.write(html)
