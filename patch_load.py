import os

with open('index.html', 'r') as f:
    html = f.read()

target_local_fs = """        try { proj = JSON.parse(text); }
        catch(err){ alert('Could not read that project file.'); return; }
        projectFileHandle = handle; // future Saves overwrite this same file
        loadProjectData(proj);
        return;"""

replacement_local_fs = """        try { proj = JSON.parse(text); }
        catch(err){ alert('Could not read that project file.'); return; }
        projectFileHandle = handle; // future Saves overwrite this same file
        activeSaveLocation = 'local';
        currentCloudFileId = null;
        syncBackupUI();
        loadProjectData(proj);
        return;"""

if target_local_fs in html:
    html = html.replace(target_local_fs, replacement_local_fs)
    print('Local FS patched')

target_local_fallback = """      let proj;
      try { proj = JSON.parse(reader.result); }
      catch(err){ alert('Could not read that project file.'); return; }
      loadProjectData(proj);
    };"""

replacement_local_fallback = """      let proj;
      try { proj = JSON.parse(reader.result); }
      catch(err){ alert('Could not read that project file.'); return; }
      activeSaveLocation = 'local';
      currentCloudFileId = null;
      syncBackupUI();
      loadProjectData(proj);
    };"""

if target_local_fallback in html:
    html = html.replace(target_local_fallback, replacement_local_fallback)
    print('Local fallback patched')

target_cloud_load = """      let proj;
      try { proj = JSON.parse(jsonText); }
      catch (e) { alert('Failed to parse project file from cloud.'); return; }

      loadProjectData(proj);
      closeCloudStorageModal();
      showToast(`Loaded "${fileName}" from Cloud`);"""

replacement_cloud_load = """      let proj;
      try { proj = JSON.parse(jsonText); }
      catch (e) { alert('Failed to parse project file from cloud.'); return; }

      loadProjectData(proj);
      activeSaveLocation = 'cloud';
      currentCloudFileId = fileId;
      currentCloudProviderUsed = provider;
      currentCloudFileName = fileName;
      syncBackupUI();
      closeCloudStorageModal();
      showToast(`Loaded "${fileName}" from Cloud`);"""

if target_cloud_load in html:
    html = html.replace(target_cloud_load, replacement_cloud_load)
    print('Cloud load patched')

with open('index.html', 'w') as f:
    f.write(html)
