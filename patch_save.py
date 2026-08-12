import os

with open('index.html', 'r') as f:
    html = f.read()

target = """  async function saveProject(forceNewLocation){
    if(!supportsFSAccess){
      downloadProjectFallback();"""

replacement = """  async function saveProject(forceNewLocation){
    if (activeSaveLocation === 'cloud' && !forceNewLocation && currentCloudFileId) {
      showToast('Saving to cloud...');
      const projectDataStr = JSON.stringify(buildProjectData());
      try {
        if (currentCloudProviderUsed === 'gdrive') {
          if (!gdriveToken) { alert('Please sign in to Google Drive first.'); return; }
          const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${currentCloudFileId}?uploadType=media`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${gdriveToken}`, 'Content-Type': 'application/json' },
            body: projectDataStr
          });
          if (!res.ok) throw new Error('Upload failed');
          showToast(`Saved "${currentCloudFileName}" to Google Drive`);
        } else {
          if (!onedriveToken) { alert('Please sign in to OneDrive first.'); return; }
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${currentCloudFileId}/content`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${onedriveToken}`, 'Content-Type': 'application/json' },
            body: projectDataStr
          });
          if (!res.ok) throw new Error('Upload failed');
          showToast(`Saved "${currentCloudFileName}" to OneDrive`);
        }
        await writeBackupCopy();
      } catch (err) {
        console.error('Cloud save failed:', err);
        alert('Could not save to cloud.');
      }
      return;
    }

    if(!supportsFSAccess){"""

if target in html:
    html = html.replace(target, replacement)
    print('saveProject patched')

target_cloud_save = """        try {
          const folderId = await getOrCreateGoogleDriveFolder(folderName);
          const metadata = { name: fileName, mimeType: 'application/json', parents: [folderId] };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', new Blob([projectDataStr], { type: 'application/json' }));

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gdriveToken}` },
            body: form
          });
          if (!res.ok) throw new Error('Upload failed');
          showToast(`Saved "${fileName}" to Google Drive`);
          loadCloudFileList();"""

replacement_cloud_save = """        try {
          const folderId = await getOrCreateGoogleDriveFolder(folderName);
          const metadata = { name: fileName, mimeType: 'application/json', parents: [folderId] };
          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', new Blob([projectDataStr], { type: 'application/json' }));

          const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${gdriveToken}` },
            body: form
          });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          showToast(`Saved "${fileName}" to Google Drive`);
          
          activeSaveLocation = 'cloud';
          currentCloudFileId = data.id;
          currentCloudProviderUsed = 'gdrive';
          currentCloudFileName = fileName;
          syncBackupUI();

          loadCloudFileList();"""

if target_cloud_save in html:
    html = html.replace(target_cloud_save, replacement_cloud_save)
    print('cloudSaveSubmitBtn GDrive patched')

target_cloud_save_od = """        try {
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}:/content`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${onedriveToken}`, 'Content-Type': 'application/json' },
            body: projectDataStr
          });
          if (!res.ok) throw new Error('Upload failed');
          showToast(`Saved "${fileName}" to OneDrive`);
          loadCloudFileList();"""

replacement_cloud_save_od = """        try {
          const res = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}:/content`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${onedriveToken}`, 'Content-Type': 'application/json' },
            body: projectDataStr
          });
          if (!res.ok) throw new Error('Upload failed');
          const data = await res.json();
          showToast(`Saved "${fileName}" to OneDrive`);
          
          activeSaveLocation = 'cloud';
          currentCloudFileId = data.id;
          currentCloudProviderUsed = 'onedrive';
          currentCloudFileName = fileName;
          syncBackupUI();

          loadCloudFileList();"""

if target_cloud_save_od in html:
    html = html.replace(target_cloud_save_od, replacement_cloud_save_od)
    print('cloudSaveSubmitBtn OneDrive patched')

with open('index.html', 'w') as f:
    f.write(html)
