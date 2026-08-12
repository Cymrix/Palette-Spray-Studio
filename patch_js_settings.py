import os

with open('index.html', 'r') as f:
    html = f.read()

target = """  function openAppSettings() {
    closeFileMenu();
    tooltipDelaySlider.value = appSettings.tooltipDelay;
    tooltipDelayVal.textContent = appSettings.tooltipDelay.toFixed(1) + 's';
    const rect = appSettingsModal.getBoundingClientRect();
    if (appSettingsModal.style.display === 'none' || !appSettingsModal.style.left) {
      appSettingsModal.style.left = Math.max(10, (window.innerWidth / 2) - 140) + 'px';
      appSettingsModal.style.top = Math.max(10, (window.innerHeight / 2) - 100) + 'px';
    }
    appSettingsModal.style.display = 'block';
  }
  
  function closeAppSettings() {
    appSettingsModal.style.display = 'none';
  }
  
  document.getElementById('appSettingsBtn').addEventListener('click', openAppSettings);
  document.getElementById('appSettingsCloseBtn').addEventListener('click', closeAppSettings);
  document.getElementById('appSettingsOkBtn').addEventListener('click', closeAppSettings);"""

replacement = """  function openAppSettings() {
    closeFileMenu();
    themeSnapshotBeforeOpening = JSON.parse(JSON.stringify(activeThemeState));
    
    tooltipDelaySlider.value = appSettings.tooltipDelay;
    tooltipDelayVal.textContent = appSettings.tooltipDelay.toFixed(1) + 's';
    const rect = appSettingsModal.getBoundingClientRect();
    if (appSettingsModal.style.display === 'none' || !appSettingsModal.style.left) {
      appSettingsModal.style.left = Math.max(10, (window.innerWidth / 2) - 140) + 'px';
      appSettingsModal.style.top = Math.max(10, (window.innerHeight / 2) - 100) + 'px';
    }
    appSettingsModal.style.display = 'block';
  }
  
  function closeAppSettings() {
    appSettingsModal.style.display = 'none';
    if (typeof closeHslColorPicker === 'function') closeHslColorPicker();
  }

  function cancelAppSettingsChanges() {
    if (themeSnapshotBeforeOpening) {
      if (themeSnapshotBeforeOpening.type === 'preset' && themeSnapshotBeforeOpening.key) {
        applyTheme(themeSnapshotBeforeOpening.key);
      } else if (themeSnapshotBeforeOpening.type === 'custom_saved' && themeSnapshotBeforeOpening.id) {
        applyTheme('custom_' + themeSnapshotBeforeOpening.id);
      } else if (themeSnapshotBeforeOpening.type === 'custom_live' && themeSnapshotBeforeOpening.data) {
        applyTheme(themeSnapshotBeforeOpening.data, true);
      }
    }
    closeAppSettings();
  }
  
  document.getElementById('appSettingsBtn').addEventListener('click', openAppSettings);
  document.getElementById('appSettingsCloseBtn').addEventListener('click', cancelAppSettingsChanges);
  document.getElementById('appSettingsOkBtn').addEventListener('click', closeAppSettings);"""

if target in html:
    html = html.replace(target, replacement)
    print("Patched settings JS bindings")
else:
    print("Could not find JS bindings to patch")

target_okbtn = """    <div class="color-edit-actions" style="margin-top:16px;">
      <button class="btn small primary" id="appSettingsOkBtn">Done</button>
    </div>"""
replace_okbtn = """    <div class="color-edit-actions" style="margin-top:16px;">
      <button class="btn small primary" id="appSettingsOkBtn">Done</button>
      <button class="btn small" id="appSettingsCancelBtn">Cancel</button>
    </div>"""

if target_okbtn in html:
    html = html.replace(target_okbtn, replace_okbtn)
    print("Patched appSettingsOkBtn")

target_broken = """  document.getElementById('openThemeModalBtn').addEventListener('click', openThemeModal);
  document.getElementById('themeModalCloseBtn').addEventListener('click', cancelThemeChanges);
  document.getElementById('themeModalOkBtn').addEventListener('click', closeThemeModal);
  document.getElementById('themeModalCancelBtn').addEventListener('click', cancelThemeChanges);
  makePopupDraggable(document.getElementById('themeModal'), document.getElementById('themeModalDragHandle'));"""

replace_broken = """  const appSettingsCancelBtn = document.getElementById('appSettingsCancelBtn');
  if (appSettingsCancelBtn) {
    appSettingsCancelBtn.addEventListener('click', cancelAppSettingsChanges);
  }"""

if target_broken in html:
    html = html.replace(target_broken, replace_broken)
    print("Removed broken bindings")

with open('index.html', 'w') as f:
    f.write(html)
