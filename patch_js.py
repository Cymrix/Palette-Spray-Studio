import os

with open('index.html', 'r') as f:
    html = f.read()

target_vars = """  let projectFileHandle = null; // File System Access handle, when supported — lets Save overwrite in place
  let backupDirHandle = null; // File System Access directory handle for the chosen backups folder, when enabled
  let backupIntervalTimer = null;"""

replacement_vars = """  let projectFileHandle = null; // File System Access handle, when supported — lets Save overwrite in place
  let backupDirHandle = null; // File System Access directory handle for the chosen backups folder, when enabled
  let backupIntervalTimer = null;
  let activeSaveLocation = 'local';
  let currentCloudFileId = null;
  let currentCloudProviderUsed = null;
  let currentCloudFileName = null;"""

if target_vars in html:
    html = html.replace(target_vars, replacement_vars)
    print('Variables patched')
else:
    print('Variables target not found')

target_toggle = """  function refreshBackupButtonStyle(){
    document.getElementById('backupToggleBtn').classList.toggle('primary', !!backupDirHandle);
  }
  async function toggleBackups(){
    if(backupDirHandle){
      backupDirHandle = null;
      clearInterval(backupIntervalTimer);
      backupIntervalTimer = null;
      document.getElementById('backupToggleBtn').textContent = 'Backups: Off';
      document.getElementById('backupIntervalLabel').style.display = 'none';
      document.getElementById('backupMaxLabel').style.display = 'none';
      refreshBackupButtonStyle();
      showToast('Backups turned off');
      return;
    }
    if(typeof window.showDirectoryPicker !== 'function'){
      alert('Automatic backups need a Chromium-based browser (Chrome, Edge, etc.) — this browser doesn\\'t support choosing a folder to write into. Save As still lets you make dated copies by hand.');
      return;
    }
    try {
      const dir = await window.showDirectoryPicker();
      const subfolderName = projectName() + ' backups';
      backupDirHandle = await dir.getDirectoryHandle(subfolderName, {create:true});
      saveBackupHandleToDB(dir); // remember this folder for future projects/sessions — best-effort
      document.getElementById('backupToggleBtn').textContent = 'Backups: On';
      document.getElementById('backupIntervalLabel').style.display = 'inline-flex';
      document.getElementById('backupMaxLabel').style.display = 'inline-flex';
      refreshBackupButtonStyle();
      startBackupIntervalTimer();
      showToast('Backups on — into "' + dir.name + '/' + subfolderName + '", every save plus every ' + document.getElementById('backupIntervalInput').value + ' min');
    } catch(err){
      if(err.name !== 'AbortError'){ console.error(err); alert('Could not access that folder for backups.'); }
    }
  }"""

replacement_toggle = """  function syncBackupUI() {
    const btn = document.getElementById('backupToggleBtn');
    const intervalLabel = document.getElementById('backupIntervalLabel');
    const maxLabel = document.getElementById('backupMaxLabel');
    const locInd = document.getElementById('saveLocationIndicator');
    
    if (activeSaveLocation === 'cloud') {
      if (locInd) { locInd.textContent = '☁️'; locInd.title = 'Cloud File'; }
      const cloudOn = document.getElementById('cloudBackupsCheckbox')?.checked;
      btn.textContent = cloudOn ? 'Backups: On (☁️)' : 'Backups: Off (☁️)';
      btn.classList.toggle('primary', cloudOn);
      if(intervalLabel) intervalLabel.style.display = cloudOn ? 'inline-flex' : 'none';
      if(maxLabel) maxLabel.style.display = 'none'; 
    } else {
      if (locInd) { locInd.textContent = '💻'; locInd.title = 'Local File'; }
      const localOn = !!backupDirHandle;
      btn.textContent = localOn ? 'Backups: On' : 'Backups: Off';
      btn.classList.toggle('primary', localOn);
      if(intervalLabel) intervalLabel.style.display = localOn ? 'inline-flex' : 'none';
      if(maxLabel) maxLabel.style.display = localOn ? 'inline-flex' : 'none';
    }
  }

  function refreshBackupButtonStyle(){
    syncBackupUI();
  }

  async function toggleBackups(){
    if (activeSaveLocation === 'cloud') {
      const cb = document.getElementById('cloudBackupsCheckbox');
      if (cb) {
        cb.checked = !cb.checked;
        cb.dispatchEvent(new Event('change')); // Triggers toast & localStorage
      }
      syncBackupUI();
      return;
    }

    if(backupDirHandle){
      backupDirHandle = null;
      clearInterval(backupIntervalTimer);
      backupIntervalTimer = null;
      syncBackupUI();
      showToast('Local backups turned off');
      return;
    }
    if(typeof window.showDirectoryPicker !== 'function'){
      alert('Automatic backups need a Chromium-based browser (Chrome, Edge, etc.) — this browser doesn\\'t support choosing a folder to write into. Save As still lets you make dated copies by hand.');
      return;
    }
    try {
      const dir = await window.showDirectoryPicker();
      const subfolderName = projectName() + ' backups';
      backupDirHandle = await dir.getDirectoryHandle(subfolderName, {create:true});
      saveBackupHandleToDB(dir);
      syncBackupUI();
      startBackupIntervalTimer();
      showToast('Backups on — into "' + dir.name + '/' + subfolderName + '", every save plus every ' + document.getElementById('backupIntervalInput').value + ' min');
    } catch(err){
      if(err.name !== 'AbortError'){ console.error(err); alert('Could not access that folder for backups.'); }
    }
  }"""

if target_toggle in html:
    html = html.replace(target_toggle, replacement_toggle)
    print('Toggle patched')
else:
    print('Toggle target not found')

with open('index.html', 'w') as f:
    f.write(html)
